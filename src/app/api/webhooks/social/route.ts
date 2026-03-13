import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// POST /api/webhooks/social
// Called by PhantomBuster or Expandi
export async function POST(request: NextRequest) {
  try {
    // Verify shared secret
    const authHeader = request.headers.get('x-webhook-secret')
    const settings = await prisma.settings.findUnique({ where: { key: 'social_outreach_settings' } })
    const config = (settings?.value as Record<string, any>) || {}

    if (!config.webhookSecret || authHeader !== config.webhookSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Normalize event from PhantomBuster or Expandi
    const event = normalizeWebhookEvent(body)
    if (!event) {
      return NextResponse.json({ ok: true, note: 'Unrecognized event shape, ignored' })
    }

    // Find the campaign message by externalId
    const message = await prisma.socialCampaignMessage.findFirst({
      where: { externalId: event.externalMessageId },
    })

    if (!message) {
      return NextResponse.json({ ok: true, note: 'Message not found by externalId' })
    }

    // Update message status
    if (event.status === 'DELIVERED') {
      // Guard: only process if message hasn't already been marked delivered
      if (message.status === 'DELIVERED') {
        return NextResponse.json({ ok: true, note: 'Already processed' })
      }

      await prisma.socialCampaignMessage.update({
        where: { id: message.id },
        data: { status: 'DELIVERED', deliveredAt: new Date() },
      })

      // Update campaign lead to SENT if still QUEUED — updateMany is idempotent (0 rows if not QUEUED)
      const updated = await prisma.socialCampaignLead.updateMany({
        where: {
          campaignId: message.campaignId,
          leadId: message.leadId,
          funnelStage: 'QUEUED',
        },
        data: { funnelStage: 'SENT', dm1SentAt: new Date() },
      })

      // Only increment sentCount if we actually transitioned a lead
      if (updated.count > 0) {
        await prisma.socialCampaign.update({
          where: { id: message.campaignId },
          data: { sentCount: { increment: 1 } },
        })
      }
    }

    if (event.status === 'REPLIED' && event.replyContent) {
      // Log inbound reply
      await prisma.socialCampaignMessage.create({
        data: {
          campaignId: message.campaignId,
          leadId: message.leadId,
          channel: message.channel,
          messageType: 'inbound_reply',
          direction: 'INBOUND',
          content: event.replyContent,
          status: 'DELIVERED',
          sentAt: new Date(),
        },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[Social webhook] Error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

function normalizeWebhookEvent(body: any) {
  // PhantomBuster format
  if (body?.messageId && body?.status) {
    return {
      externalMessageId: body.messageId,
      status: body.status === 'sent' ? 'DELIVERED' : body.status?.toUpperCase(),
      replyContent: body.replyText || null,
    }
  }
  // Expandi format
  if (body?.id && body?.event_type) {
    return {
      externalMessageId: String(body.id),
      status: body.event_type === 'message_sent' ? 'DELIVERED'
        : body.event_type === 'message_replied' ? 'REPLIED' : null,
      replyContent: body.reply_text || null,
    }
  }
  return null
}
