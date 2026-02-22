import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'
import { getStripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

/**
 * POST /api/stripe/connect/refresh
 * Generates a new Account Link for an existing Connect account (if old link expired).
 */
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { userId } = await request.json()

    // Rep can only refresh for self, admin can refresh for any
    if (session.role !== 'ADMIN' && session.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!user.stripeConnectId) {
      return NextResponse.json(
        { error: 'No Stripe Connect account found. Use /create first.' },
        { status: 400 }
      )
    }

    const stripe = getStripe()
    const basePath = user.portalType === 'PART_TIME' ? '/part-time' : '/reps'
    const baseUrl = process.env.BASE_URL || 'https://app.brightautomations.net'

    const accountLink = await stripe.accountLinks.create({
      account: user.stripeConnectId,
      refresh_url: `${baseUrl}${basePath}/stripe-return?refresh=true`,
      return_url: `${baseUrl}${basePath}/stripe-return?success=true`,
      type: 'account_onboarding',
    })

    return NextResponse.json({ url: accountLink.url })
  } catch (error) {
    console.error('Stripe Connect refresh error:', error)
    return NextResponse.json(
      { error: 'Failed to refresh Stripe Connect link' },
      { status: 500 }
    )
  }
}
