import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

// POST /api/settings/payment-links/verify
// Tests if a Stripe payment link URL is reachable
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const { url } = await request.json()

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ valid: false, reason: 'No URL provided' })
    }

    const isStripeLink = url.startsWith('https://buy.stripe.com/') ||
                         url.startsWith('https://checkout.stripe.com/') ||
                         url.startsWith('https://invoice.stripe.com/')

    if (!isStripeLink) {
      return NextResponse.json({
        valid: false,
        reason: 'Not a recognized Stripe URL. Expected https://buy.stripe.com/...',
        url,
      })
    }

    // NOTE: Use GET not HEAD — Stripe payment links redirect and return 405 on HEAD
    try {
      const res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: AbortSignal.timeout(8000),
      })

      if (res.ok || res.status === 303 || res.status === 302) {
        return NextResponse.json({
          valid: true,
          reason: 'Link is live and reachable',
          status: res.status,
          url,
        })
      }

      return NextResponse.json({
        valid: false,
        reason: `Stripe returned HTTP ${res.status}. Link may be inactive or expired.`,
        status: res.status,
        url,
      })
    } catch (fetchErr) {
      return NextResponse.json({
        valid: false,
        reason: `Could not reach URL: ${(fetchErr as Error).message}`,
        url,
      })
    }
  } catch (error) {
    console.error('Error verifying payment link:', error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
