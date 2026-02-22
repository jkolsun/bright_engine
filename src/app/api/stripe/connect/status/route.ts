import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * GET /api/stripe/connect/status?userId=xxx
 * Polls current Stripe Connect account status for a user.
 * Falls back to session.userId if no query param.
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = request.nextUrl.searchParams.get('userId') || session.userId

    // Rep can only check own status, admin can check any
    if (session.role !== 'ADMIN' && session.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user?.stripeConnectId) {
      return NextResponse.json({
        status: 'not_started',
        detailsSubmitted: false,
        payoutsEnabled: false,
        requirements: [],
      })
    }

    const { getStripe } = await import('@/lib/stripe')
    const stripe = getStripe()
    const account = await stripe.accounts.retrieve(user.stripeConnectId)

    // Determine our status
    let status = 'pending'
    if (account.details_submitted && account.payouts_enabled) {
      status = 'active'
    } else if ((account.requirements?.errors?.length ?? 0) > 0) {
      status = 'restricted'
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
      detailsSubmitted: account.details_submitted ?? false,
      payoutsEnabled: account.payouts_enabled ?? false,
      requirements: account.requirements?.currently_due || [],
    })
  } catch (error) {
    console.error('Stripe Connect status error:', error)
    return NextResponse.json(
      { error: 'Failed to check Stripe Connect status' },
      { status: 500 }
    )
  }
}
