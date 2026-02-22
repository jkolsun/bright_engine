import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'
import { sendSMSViaProvider } from '@/lib/sms-provider'

export const dynamic = 'force-dynamic'

/**
 * POST /api/dialer/send-upsell
 * Sends an upsell payment link via SMS and creates an approval request.
 */
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { leadId, upsellProductId } = await request.json()

    if (!leadId || !upsellProductId) {
      return NextResponse.json({ error: 'leadId and upsellProductId required' }, { status: 400 })
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

    const product = await prisma.upsellProduct.findUnique({
      where: { id: upsellProductId },
      select: { id: true, name: true, price: true, stripeLink: true, active: true },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    if (!product.active) {
      return NextResponse.json({ error: 'This product is no longer available' }, { status: 400 })
    }

    if (!product.stripeLink) {
      return NextResponse.json({ error: 'No payment link configured for this product' }, { status: 400 })
    }

    const repId = (session as any).id || (session as any).userId
    const repName = session.name || 'Rep'
    const firstName = lead.firstName || 'there'

    // Append client reference ID
    const separator = product.stripeLink.includes('?') ? '&' : '?'
    const fullLink = `${product.stripeLink}${separator}client_reference_id=${leadId}`

    const message = `Hey ${firstName}, here's the link for ${product.name}: ${fullLink}`

    const smsResult = await sendSMSViaProvider({
      to: lead.phone,
      message,
      leadId: lead.id,
      sender: repName,
      trigger: 'dialer_upsell_send',
    })

    // Create LeadEvent
    await prisma.leadEvent.create({
      data: {
        leadId: lead.id,
        eventType: 'UPSELL_LINK_SENT',
        actor: `rep:${repId}`,
        metadata: {
          repId,
          repName,
          productId: product.id,
          productName: product.name,
          price: product.price,
          phone: lead.phone,
          timestamp: new Date().toISOString(),
        },
      },
    })

    // Create approval request for admin visibility
    await prisma.approval.create({
      data: {
        gate: 'UPSELL',
        title: `Upsell: ${product.name} for ${lead.companyName}`,
        description: `Rep ${repName} sent ${product.name} ($${product.price}) upsell link to ${lead.companyName} (${lead.firstName}).`,
        leadId: lead.id,
        requestedBy: `rep:${repId}`,
        priority: 'NORMAL',
        metadata: {
          repId,
          repName,
          upsellProductId: product.id,
          productName: product.name,
          price: product.price,
          stripeLink: fullLink,
          phone: lead.phone,
        } as any,
      },
    })

    return NextResponse.json({ success: smsResult.success, productName: product.name })
  } catch (error) {
    console.error('Send upsell error:', error)
    return NextResponse.json(
      { error: 'Failed to send upsell link', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
