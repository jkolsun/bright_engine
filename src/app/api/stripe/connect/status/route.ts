import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

// Lazy stripe initialization (avoid loading Stripe SDK at build time)
let _stripeInstance: any = null
function initStripe() {
  if (!_stripeInstance) {
    const { default: StripeSdk } = require('stripe')
    const key = process.env.STRIPE_SECRET_KEY || 'build-placeholder'
    if (key === 'build-placeholder') {
      throw new Error('STRIPE_SECRET_KEY not configured')
    }
    _stripeInstance = new StripeSdk(key, { apiVersion: '2023-10-16' })
  }
  return _stripeInstance
}

/**
 * GET /api/stripe/connect/status — Check Stripe Connect account status
 * Auth: session required
 * Query param: userId (defaults to session.userId)
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = request.nextUrl.searchParams.get('userId') || session.userId

    // Authorization: reps can only check their own status
    if (session.role !== 'ADMIN' && session.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        stripeConnectId: true,
        stripeConnectStatus: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // If no Stripe Connect account, return not_started
    if (!user.stripeConnectId) {
      return NextResponse.json({
        status: 'not_started',
        detailsSubmitted: false,
        payoutsEnabled: false,
      })
    }

    const stripe = initStripe()
    const account = await stripe.accounts.retrieve(user.stripeConnectId)

    // Map account state to status
    let status: string
    if (account.details_submitted && account.payouts_enabled) {
      status = 'active'
    } else if (account.requirements?.errors?.length > 0) {
      status = 'restricted'
    } else {
      status = 'pending'
    }

    // Update DB if status changed
    if (status !== user.stripeConnectStatus) {
      await prisma.user.update({
        where: { id: userId },
        data: { stripeConnectStatus: status },
      })
    }

    return NextResponse.json({
      status,
      detailsSubmitted: account.details_submitted,
      payoutsEnabled: account.payouts_enabled,
      requirements: account.requirements?.currently_due || [],
    })
  } catch (error) {
    console.error('Error checking Stripe Connect status:', error)
    return NextResponse.json(
      { error: 'Failed to check Stripe Connect status' },
      { status: 500 }
    )
  }
}
