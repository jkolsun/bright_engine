import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'
import { getStripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

/**
 * POST /api/stripe/connect/create
 * Creates a Stripe Connect Express account for a rep + generates onboarding link.
 * If the rep already has a Connect account, just generates a new link.
 */
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { userId } = await request.json()

    // Rep can only create for self, admin can create for any
    if (session.role !== 'ADMIN' && session.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const stripe = getStripe()
    let accountId = user.stripeConnectId

    if (!accountId) {
      // Create new Express account
      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email,
        metadata: { userId: user.id, name: user.name },
        capabilities: {
          transfers: { requested: true },
        },
        business_type: 'individual',
      })
      accountId = account.id

      await prisma.user.update({
        where: { id: userId },
        data: {
          stripeConnectId: account.id,
          stripeConnectStatus: 'pending',
        },
      })
    }

    // Generate onboarding link
    const basePath = user.portalType === 'PART_TIME' ? '/part-time' : '/reps'
    const baseUrl = process.env.BASE_URL || 'https://app.brightautomations.net'

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}${basePath}/stripe-return?refresh=true`,
      return_url: `${baseUrl}${basePath}/stripe-return?success=true`,
      type: 'account_onboarding',
    })

    return NextResponse.json({ url: accountLink.url, accountId })
  } catch (error) {
    console.error('Stripe Connect create error:', error)
    return NextResponse.json(
      { error: 'Failed to create Stripe Connect account' },
      { status: 500 }
    )
  }
}
