import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Webhook } from 'svix'

export const dynamic = 'force-dynamic'

interface ResendWebhookEvent {
  type: string
  created_at: string
  data: {
    email_id: string
    from: string
    to: string[]
    subject: string
    created_at: string
    [key: string]: unknown
  }
}

/**
 * POST /api/webhooks/resend
 * Handles Resend delivery events (delivered, opened, clicked, bounced, complained).
 * Updates Message.resendStatus and OutboundEvent.status accordingly.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()

    // Verify webhook signature in production
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET
    if (webhookSecret && process.env.NODE_ENV === 'production') {
      const svixId = request.headers.get('svix-id')
      const svixTimestamp = request.headers.get('svix-timestamp')
      const svixSignature = request.headers.get('svix-signature')

      if (!svixId || !svixTimestamp || !svixSignature) {
        console.error('[RESEND-WEBHOOK] Missing svix headers')
        return NextResponse.json({ error: 'Missing signature headers' }, { status: 400 })
      }

      try {
        const wh = new Webhook(webhookSecret)
        wh.verify(body, {
          'svix-id': svixId,
          'svix-timestamp': svixTimestamp,
          'svix-signature': svixSignature,
        })
      } catch (err) {
        console.error('[RESEND-WEBHOOK] Invalid signature:', err)
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
      }
    }

    const event: ResendWebhookEvent = JSON.parse(body)
    const resendId = event.data.email_id

    if (!resendId) {
      return NextResponse.json({ error: 'No email_id in payload' }, { status: 400 })
    }

    // Map Resend event types to our statuses
    const statusMap: Record<string, { resendStatus: string; outboundStatus: string; extra?: string }> = {
      'email.delivered': { resendStatus: 'delivered', outboundStatus: 'DELIVERED' },
      'email.opened': { resendStatus: 'opened', outboundStatus: 'OPENED', extra: 'openedAt' },
      'email.clicked': { resendStatus: 'clicked', outboundStatus: 'CLICKED', extra: 'clickedAt' },
      'email.bounced': { resendStatus: 'bounced', outboundStatus: 'BOUNCED' },
      'email.complained': { resendStatus: 'complained', outboundStatus: 'BOUNCED' },
    }

    const mapping = statusMap[event.type]
    if (!mapping) {
      // Unhandled event type — acknowledge but skip
      return NextResponse.json({ received: true, skipped: event.type })
    }

    // Update Message record (resendId has @unique index)
    const message = await prisma.message.findUnique({
      where: { resendId },
    })

    if (!message) {
      console.warn(`[RESEND-WEBHOOK] No message found for resendId: ${resendId}`)
      await prisma.failedWebhook.create({
        data: {
          source: 'resend',
          payload: JSON.parse(JSON.stringify(event)),
          error: `No message found for resendId: ${resendId}`,
        },
      })
      return NextResponse.json({ received: true, warning: 'message not found' })
    }

    await prisma.message.update({
      where: { resendId },
      data: { resendStatus: mapping.resendStatus },
    })

    // Update OutboundEvent record
    const outboundEvent = await prisma.outboundEvent.findFirst({
      where: { messageId: resendId },
    })

    if (outboundEvent) {
      const updateData: Record<string, unknown> = {
        status: mapping.outboundStatus,
      }
      if (mapping.extra === 'openedAt') updateData.openedAt = new Date()
      if (mapping.extra === 'clickedAt') updateData.clickedAt = new Date()

      await prisma.outboundEvent.update({
        where: { id: outboundEvent.id },
        data: updateData,
      })
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[RESEND-WEBHOOK] Processing error:', error)

    // Log to FailedWebhook for retry
    try {
      const rawBody = await request.clone().text().catch(() => '{}')
      await prisma.failedWebhook.create({
        data: {
          source: 'resend',
          payload: JSON.parse(rawBody),
          error: error instanceof Error ? error.message : String(error),
        },
      })
    } catch {
      // If even logging fails, just return error
    }

    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
