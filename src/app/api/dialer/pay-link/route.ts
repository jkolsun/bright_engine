import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

// GET /api/dialer/pay-link?leadId=xxx&product=SITE_BUILD
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const leadId = request.nextUrl.searchParams.get('leadId') || ''
    const product = (request.nextUrl.searchParams.get('product') || 'SITE_BUILD') as any

    // Dynamic import to avoid stripe.ts module-scope initialization at build time
    const { getPaymentLink } = await import('@/lib/stripe')
    const url = getPaymentLink(product, { leadId })

    return NextResponse.json({ url })
  } catch (error) {
    console.error('Pay link error:', error)
    return NextResponse.json({ url: '' })
  }
}
