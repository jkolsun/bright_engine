import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSMSProvider, logInboundSMSViaProvider } from '@/lib/sms-provider'

export const dynamic = 'force-dynamic'

// POST /api/webhooks/twilio - Handle inbound SMS
export async function POST(request: NextRequest) {
  try {
    const provider = getSMSProvider()

    // Validate Twilio signature (PRODUCTION SECURITY)
    const isValid = await provider.validateWebhookSignature(request, request.url)
    if (!isValid && process.env.NODE_ENV === 'production') {
      console.error('Invalid Twilio signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 403 }
      )
    }

    // Parse inbound message via provider
    const formData = await request.formData()
    const { from, body, sid, mediaUrls } = await provider.parseInboundWebhook(formData)

    // Normalize phone number for flexible matching
    const digits = from.replace(/\D/g, '')
    const withPlus = digits.startsWith('1') ? `+${digits}` : `+1${digits}`
    const withoutPlus = digits.startsWith('1') ? digits : `1${digits}`
    const justNumber = digits.startsWith('1') ? digits.slice(1) : digits

    // Find lead or client by phone (try multiple formats)
    const lead = await prisma.lead.findFirst({
      where: {
        OR: [
          { phone: from },
          { phone: withPlus },
          { phone: withoutPlus },
          { phone: justNumber },
          { phone: digits },
        ]
      }
    })

    const client = await prisma.client.findFirst({
      where: {
        lead: {
          OR: [
            { phone: from },
            { phone: withPlus },
            { phone: withoutPlus },
            { phone: justNumber },
            { phone: digits },
          ]
        }
      },
      include: { lead: true }
    })

    // Log inbound message
    await logInboundSMSViaProvider({
      from,
      body,
      sid,
      leadId: lead?.id || client?.leadId || undefined,
      clientId: client?.id,
      mediaUrls,
    })

    // Check for escalation triggers
    const shouldEscalate = checkForEscalation(body)

    if (shouldEscalate) {
      await prisma.message.updateMany({
        where: { twilioSid: sid },
        data: {
          escalated: true,
          escalationReason: 'Detected escalation trigger in message'
        }
      })

      // Create notification
      await prisma.notification.create({
        data: {
          type: 'CLIENT_TEXT',
          title: 'Message Needs Attention',
          message: `From: ${lead?.firstName || client?.lead?.firstName} - ${body.substring(0, 50)}...`,
          metadata: { leadId: lead?.id, clientId: client?.id, from, body }
        }
      })
    }

    // ── CLOSE ENGINE HANDLER ──
    if (lead) {
      const { processCloseEngineInbound, triggerCloseEngine } = await import('@/lib/close-engine')

      // Check if lead has an active close conversation
      const activeConversation = await prisma.closeEngineConversation.findUnique({
        where: { leadId: lead.id },
      })

      if (activeConversation && !['COMPLETED', 'CLOSED_LOST'].includes(activeConversation.stage)) {
        // Route to existing Close Engine conversation
        console.log(`[Twilio] Routing inbound to Close Engine conversation ${activeConversation.id}`)
        try {
          await processCloseEngineInbound(activeConversation.id, body, mediaUrls)
        } catch (err) {
          console.error('[Twilio] Close Engine processing failed:', err)
          // Don't fail the webhook
        }
      } else if (!activeConversation) {
        // No active conversation — check if this is an interested reply
        const isInterested = checkInterestSignal(body)
        if (isInterested) {
          console.log(`[Twilio] Interest detected from ${from}, triggering Close Engine`)
          try {
            await triggerCloseEngine({
              leadId: lead.id,
              entryPoint: 'SMS_REPLY',
            })
          } catch (err) {
            console.error('[Twilio] Close Engine trigger failed:', err)
          }
        }
      }
    }

    // ── POST-CLIENT HANDLER ──
    if (client) {
      try {
        const { processPostClientInbound } = await import('@/lib/post-client-engine')
        await processPostClientInbound(client.id, body, mediaUrls)
      } catch (err) {
        console.error('[Twilio] Post-client processing failed:', err)
      }
    }

    // Respond with empty TwiML (no auto-reply)
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        headers: { 'Content-Type': 'text/xml' }
      }
    )
  } catch (error) {
    console.error('Twilio webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

function checkInterestSignal(message: string): boolean {
  const lowerMessage = message.toLowerCase().trim()

  const positiveKeywords = [
    'yes', 'yeah', 'yep', 'yup', 'sure',
    'interested', 'tell me more', 'sounds good',
    'let\'s do it', 'lets do it', 'i\'m in', 'im in',
    'ready', 'sign me up', 'how much',
    'let\'s go', 'lets go', 'i want', 'i\'d like',
    'sounds great', 'love it', 'looks good',
    'get started', 'how do i', 'what\'s next',
    'send me', 'set it up',
  ]

  return positiveKeywords.some(keyword => lowerMessage.includes(keyword))
}

function checkForEscalation(message: string): boolean {
  const triggers = [
    'refund',
    'cancel',
    'lawyer',
    'attorney',
    'sue',
    'scam',
    'fraud',
    'worst',
    'unacceptable',
    'bbb',
    'complaint',
    'angry',
    'disappointed'
  ]

  const lowerMessage = message.toLowerCase()
  return triggers.some(trigger => lowerMessage.includes(trigger))
}
