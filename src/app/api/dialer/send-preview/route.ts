import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'
import { sendSMSViaProvider } from '@/lib/sms-provider'
import { sendEmail, wrapPreviewHtml } from '@/lib/resend'

export const dynamic = 'force-dynamic'

/**
 * POST /api/dialer/send-preview
 * Sends the preview link to a lead via SMS and/or email from the dialer.
 */
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { leadId, channel } = await request.json()

    if (!leadId || !channel) {
      return NextResponse.json({ error: 'leadId and channel required' }, { status: 400 })
    }

    if (!['sms', 'email', 'both'].includes(channel)) {
      return NextResponse.json({ error: 'channel must be "sms", "email", or "both"' }, { status: 400 })
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        firstName: true,
        companyName: true,
        phone: true,
        email: true,
        previewUrl: true,
      },
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    if (!lead.previewUrl) {
      return NextResponse.json({ error: 'No preview URL available for this lead' }, { status: 400 })
    }

    const repId = (session as any).id || (session as any).userId
    const repName = session.name || 'Rep'
    const firstName = lead.firstName || 'there'
    const message = `Hey ${firstName}, here's the preview for ${lead.companyName}: ${lead.previewUrl}`
    const results: { sms?: boolean; email?: boolean } = {}

    // Send SMS
    if (channel === 'sms' || channel === 'both') {
      if (lead.phone) {
        const smsResult = await sendSMSViaProvider({
          to: lead.phone,
          message,
          leadId: lead.id,
          sender: repName,
          trigger: 'dialer_preview_send',
        })
        results.sms = smsResult.success

        await prisma.leadEvent.create({
          data: {
            leadId: lead.id,
            eventType: 'PREVIEW_SENT_SMS',
            actor: `rep:${repId}`,
            metadata: { repId, repName, phone: lead.phone, previewUrl: lead.previewUrl, timestamp: new Date().toISOString() },
          },
        })
      }
    }

    // Send Email
    if (channel === 'email' || channel === 'both') {
      if (lead.email) {
        const emailResult = await sendEmail({
          to: lead.email,
          subject: `Your website preview — ${lead.companyName}`,
          html: wrapPreviewHtml({
            recipientName: firstName,
            companyName: lead.companyName,
            previewUrl: lead.previewUrl,
          }),
          text: message,
          leadId: lead.id,
          sender: repName,
          trigger: 'dialer_preview_send_email',
        })
        results.email = emailResult.success

        await prisma.leadEvent.create({
          data: {
            leadId: lead.id,
            eventType: 'PREVIEW_SENT_EMAIL',
            actor: `rep:${repId}`,
            metadata: { repId, repName, email: lead.email, previewUrl: lead.previewUrl, timestamp: new Date().toISOString() },
          },
        })
      } else {
        results.email = false
      }
    }

    return NextResponse.json({ success: true, results })
  } catch (error) {
    console.error('Send preview error:', error)
    return NextResponse.json(
      { error: 'Failed to send preview', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
