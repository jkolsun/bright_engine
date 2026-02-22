import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'
import { sendSMSViaProvider } from '@/lib/sms-provider'

export const dynamic = 'force-dynamic'

/**
 * POST /api/dialer/send-payment-link
 * Sends the core product Stripe payment link ($149 site build) via SMS.
 */
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { leadId } = await request.json()

    if (!leadId) {
      return NextResponse.json({ error: 'leadId required' }, { status: 400 })
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true, firstName: true, phone: true, companyName: true },
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    if (!lead.phone) {
      return NextResponse.json({ error: 'Lead has no phone number' }, { status: 400 })
    }

    // Get payment link from core product in UpsellProduct table, or fallback to env var
    let paymentLink = process.env.STRIPE_LINK_SITE_BUILD || ''
    try {
      const coreProduct = await prisma.upsellProduct.findFirst({
        where: { isCore: true, active: true },
        select: { stripeLink: true, price: true },
      })
      if (coreProduct?.stripeLink) {
        paymentLink = coreProduct.stripeLink
      }
    } catch {
      // Fallback to env var
    }

    if (!paymentLink) {
      return NextResponse.json({ error: 'No payment link configured' }, { status: 500 })
    }

    // Append client reference ID for tracking
    const separator = paymentLink.includes('?') ? '&' : '?'
    const fullLink = `${paymentLink}${separator}client_reference_id=${leadId}`

    const repId = (session as any).id || (session as any).userId
    const repName = session.name || 'Rep'
    const firstName = lead.firstName || 'there'
    const message = `Hey ${firstName}, here's the payment link to get your site live: ${fullLink}`

    const smsResult = await sendSMSViaProvider({
      to: lead.phone,
      message,
      leadId: lead.id,
      sender: repName,
      trigger: 'dialer_payment_link_send',
    })

    await prisma.leadEvent.create({
      data: {
        leadId: lead.id,
        eventType: 'PAYMENT_LINK_SENT_REP',
        actor: `rep:${repId}`,
        metadata: {
          repId,
          repName,
          phone: lead.phone,
          link: fullLink,
          timestamp: new Date().toISOString(),
        },
      },
    })

    return NextResponse.json({ success: smsResult.success, phone: lead.phone })
  } catch (error) {
    console.error('Send payment link error:', error)
    return NextResponse.json(
      { error: 'Failed to send payment link', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
