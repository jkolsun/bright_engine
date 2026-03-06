export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { verifyTwilioSignature } from '@/lib/twilio-verify'
import { prisma } from '@/lib/db'

const getPublicUrl = () =>
  process.env.NEXT_PUBLIC_APP_URL || process.env.BASE_URL || 'https://preview.brightautomations.org'

export async function POST(request: NextRequest) {
  const publicUrl = getPublicUrl()
  const webhookUrl = `${publicUrl}/api/webhooks/twilio-sms-status`

  const isValid = await verifyTwilioSignature(request.clone(), webhookUrl)
  if (!isValid) {
    console.warn('[TwilioSmsStatus] Invalid signature — rejecting request')
    return new Response('Forbidden', { status: 403 })
  }

  try {
    const formData = await request.formData()
    const messageSid = formData.get('MessageSid') as string | null
    const messageStatus = formData.get('MessageStatus') as string | null

    if (!messageSid || !messageStatus) {
      return new Response('OK', { status: 200 })
    }

    // Update the Message record
    const message = await prisma.message.findFirst({
      where: { twilioSid: messageSid },
      select: { id: true, leadId: true },
    })

    if (message) {
      await prisma.message.update({
        where: { id: message.id },
        data: { twilioStatus: messageStatus },
      })
    }

    // Update SmsCampaignMessage if this is a campaign message
    const campaignMessage = await prisma.smsCampaignMessage.findFirst({
      where: { twilioSid: messageSid },
      select: { id: true, campaignId: true, campaignLeadId: true, leadId: true, twilioStatus: true },
    })

    if (campaignMessage) {
      const now = new Date()
      const isDelivered = messageStatus === 'delivered'
      const isFailed = messageStatus === 'failed' || messageStatus === 'undelivered'
      const prevStatus = campaignMessage.twilioStatus

      // Update SmsCampaignMessage timestamps
      await prisma.smsCampaignMessage.update({
        where: { id: campaignMessage.id },
        data: {
          twilioStatus: messageStatus,
          ...(isDelivered ? { deliveredAt: now } : {}),
          ...(isFailed ? { failedAt: now } : {}),
        },
      })

      // Update SmsCampaignLead timestamps
      if (isDelivered || isFailed) {
        await prisma.smsCampaignLead.updateMany({
          where: { campaignId: campaignMessage.campaignId, leadId: campaignMessage.leadId },
          data: {
            ...(isDelivered ? { coldTextDeliveredAt: now } : {}),
            ...(isFailed ? { coldTextFailedAt: now } : {}),
          },
        })
      }

      // Idempotent counter updates — only increment if the status actually changed
      // Prevents double-counting from Twilio retries or duplicate callbacks
      const alreadyCounted = prevStatus === 'delivered' || prevStatus === 'failed' || prevStatus === 'undelivered'
      if (!alreadyCounted) {
        if (isDelivered) {
          await prisma.smsCampaign.update({
            where: { id: campaignMessage.campaignId },
            data: { deliveredCount: { increment: 1 } },
          })
        } else if (isFailed) {
          await prisma.smsCampaign.update({
            where: { id: campaignMessage.campaignId },
            data: { failedCount: { increment: 1 } },
          })
        }
      }

      // Create LeadEvent (also idempotent — only on first terminal status)
      if (!alreadyCounted && campaignMessage.leadId && (isDelivered || isFailed)) {
        await prisma.leadEvent.create({
          data: {
            leadId: campaignMessage.leadId,
            eventType: isDelivered ? 'SMS_DELIVERED' : 'SMS_FAILED',
            metadata: { campaignId: campaignMessage.campaignId, twilioSid: messageSid, status: messageStatus },
            actor: 'system',
          },
        })
      }
    }

    return new Response('OK', { status: 200 })
  } catch (error) {
    console.error('[TwilioSmsStatus] Error processing status callback:', error)
    return new Response('OK', { status: 200 })
  }
}
