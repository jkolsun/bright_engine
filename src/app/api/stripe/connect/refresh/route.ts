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
 * POST /api/stripe/connect/refresh — Generate a new Stripe Connect account link
 * Auth: session required
 * Used when the original onboarding link expires or user needs to return
 */
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // Rep can only refresh for self, admin for any
    if (session.role !== 'ADMIN' && session.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        stripeConnectId: true,
        portalType: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!user.stripeConnectId) {
      return NextResponse.json(
        { error: 'No Stripe Connect account found. Create one first.' },
        { status: 400 }
      )
    }

    const stripe = initStripe()
    const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || ''
    const basePath = user.portalType === 'PART_TIME' ? '/part-time' : '/reps'

    const accountLink = await stripe.accountLinks.create({
      account: user.stripeConnectId,
      refresh_url: BASE_URL + basePath + '/stripe-return?refresh=true',
      return_url: BASE_URL + basePath + '/stripe-return?success=true',
      type: 'account_onboarding',
    })

    return NextResponse.json({ url: accountLink.url })
  } catch (error) {
    console.error('Error refreshing Stripe Connect link:', error)
    return NextResponse.json(
      { error: 'Failed to refresh Stripe Connect link' },
      { status: 500 }
    )
  }
}
