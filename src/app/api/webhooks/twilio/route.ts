import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSMSProvider, logInboundSMSViaProvider } from '@/lib/sms-provider'

export const dynamic = 'force-dynamic'

// POST /api/webhooks/twilio - Handle inbound SMS
export async function POST(request: NextRequest) {
  try {
    const provider = getSMSProvider()

    // Validate Twilio signature (PRODUCTION SECURITY)
    // request.url is the internal Railway URL — reconstruct public URL from proxy headers
    const proto = request.headers.get('x-forwarded-proto') || 'https'
    const host = request.headers.get('host') || ''
    const publicUrl = `${proto}://${host}/api/webhooks/twilio`
    const isValid = await provider.validateWebhookSignature(request, publicUrl)
    if (!isValid && process.env.SKIP_TWILIO_VERIFY !== 'true') {
      console.error('Invalid Twilio signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 403 }
      )
    }

    // Parse inbound message via provider
    const formData = await request.formData()
    const { from, body, sid, mediaUrls, mediaTypes } = await provider.parseInboundWebhook(formData)

    // Normalize phone number for flexible matching
    // Handles: E.164 (+15551234567), digits (5551234567), US formatted ((555) 123-4567, 555-123-4567)
    const digits = from.replace(/\D/g, '')
    const withPlus = digits.startsWith('1') ? `+${digits}` : `+1${digits}`
    const withoutPlus = digits.startsWith('1') ? digits : `1${digits}`
    const justNumber = digits.startsWith('1') ? digits.slice(1) : digits

    // Build formatted US variants to match common DB storage formats
    const phoneVariants: string[] = [from, withPlus, withoutPlus, justNumber, digits]
    const tenDigits = digits.length >= 10
      ? (digits.startsWith('1') ? digits.slice(1) : digits).slice(0, 10)
      : ''
    if (tenDigits.length === 10) {
      phoneVariants.push(
        `(${tenDigits.slice(0, 3)}) ${tenDigits.slice(3, 6)}-${tenDigits.slice(6)}`, // (555) 123-4567
        `${tenDigits.slice(0, 3)}-${tenDigits.slice(3, 6)}-${tenDigits.slice(6)}`,   // 555-123-4567
      )
    }

    // Find lead by phone — prefer the one with an active Close Engine conversation
    // Also match on secondaryPhone
    const phoneFilter = {
      OR: [
        ...phoneVariants.map(p => ({ phone: p })),
        ...phoneVariants.map(p => ({ secondaryPhone: p })),
      ]
    }

    // First: try to find a lead that has an active Close Engine conversation
    let lead = await prisma.lead.findFirst({
      where: {
        ...phoneFilter,
        closeConversation: {
          stage: { notIn: ['COMPLETED', 'CLOSED_LOST'] },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Fallback: any lead with this phone (most recent first)
    if (!lead) {
      lead = await prisma.lead.findFirst({
        where: phoneFilter,
        orderBy: { createdAt: 'desc' },
      })
    }

    let client = await prisma.client.findFirst({
      where: { lead: phoneFilter },
      include: { lead: true }
    })

    // If no match on primary phone, check LeadContact table for alternate contacts
    if (!lead && !client) {
      try {
        const alternateContact = await prisma.leadContact.findFirst({
          where: {
            type: 'PHONE',
            value: { in: phoneVariants },
          },
          select: { leadId: true },
        })

        if (alternateContact) {
          lead = await prisma.lead.findUnique({
            where: { id: alternateContact.leadId },
          })
          if (lead) {
            console.log(`[Twilio] Matched inbound from ${from} via alternate contact to lead ${lead.id}`)

            // Also check if this lead has become a client
            client = await prisma.client.findFirst({
              where: { leadId: lead.id },
              include: { lead: true },
            })
          }
        }
      } catch (err) {
        console.error('[Twilio] LeadContact lookup failed:', err)
      }
    }

    // If still no match, trigger AI auto-identification for unknown inbound
    if (!lead && !client) {
      console.log(`[Twilio] Unknown inbound from ${from}: "${body.substring(0, 50)}"`)

      // Log the message with no lead/client for admin visibility
      await logInboundSMSViaProvider({
        from,
        body,
        sid,
        mediaUrls,
        mediaTypes,
      })

      // Send AI identification response
      try {
        const { sendSMSViaProvider } = await import('@/lib/sms-provider')
        await sendSMSViaProvider({
          to: from,
          message: "Hey! Thanks for reaching out to Bright Automations. I want to make sure I connect you with the right person — what's your name and business name?",
          sender: 'clawdbot',
          trigger: 'unknown_inbound_identification',
          aiGenerated: true,
        })
      } catch (err) {
        console.error('[Twilio] Unknown inbound auto-reply failed:', err)
      }

      // Create admin notification
      await prisma.notification.create({
        data: {
          type: 'CLIENT_TEXT',
          title: 'Unknown Inbound Message',
          message: `Unknown number ${from}: "${body.substring(0, 100)}"`,
          metadata: { from, body, sid },
        },
      })

      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    // ── iMessage Reaction Detection ──
    const reaction = parseReaction(body)

    if (reaction.isReaction && reaction.isRemoval) {
      // Reaction removal — silently ignore, return empty TwiML
      console.log(`[Twilio] Ignoring reaction removal from ${from}`)
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    if (reaction.isReaction && reaction.reactionType) {
      // It's a reaction — log it, attach to original message, then route to AI with context
      console.log(`[Twilio] iMessage reaction: ${reaction.reactionType} from ${from}`)

      const targetLeadId = lead?.id || client?.leadId || undefined
      const targetClientId = client?.id

      // Find the original message being reacted to (match by content snippet)
      let originalMessageId: string | undefined
      if (reaction.originalText && targetLeadId) {
        const originalMsg = await prisma.message.findFirst({
          where: {
            leadId: targetLeadId,
            content: { contains: reaction.originalText.substring(0, 50) },
          },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        })
        originalMessageId = originalMsg?.id
      }

      // Log the reaction as a message with reaction metadata
      await logInboundSMSViaProvider({
        from,
        body,
        sid,
        leadId: targetLeadId,
        clientId: targetClientId,
        mediaUrls,
        mediaTypes,
      })

      // Update the logged message with reaction fields
      if (sid) {
        await prisma.message.update({
          where: { twilioSid: sid },
          data: {
            reactionType: reaction.reactionType,
            reactionToId: originalMessageId || null,
            reactionEmoji: reaction.reactionEmoji,
          },
        }).catch(err => console.error('[TwilioWebhook] Reaction update failed:', err))
      }

      // Route reaction to AI with translated context
      const reactionContext = translateReactionForAI(reaction, body)

      if (reactionContext.shouldRoute && lead) {
        const { processCloseEngineInbound } = await import('@/lib/close-engine')
        const activeConversation = await prisma.closeEngineConversation.findUnique({
          where: { leadId: lead.id },
        })
        if (activeConversation && !['COMPLETED', 'CLOSED_LOST'].includes(activeConversation.stage)) {
          try {
            await processCloseEngineInbound(activeConversation.id, reactionContext.aiMessage)
          } catch (err) {
            console.error('[Twilio] Close Engine reaction processing failed:', err)
          }
        }
      }

      if (reactionContext.shouldRoute && client) {
        try {
          const { processPostClientInbound } = await import('@/lib/post-client-engine')
          await processPostClientInbound(client.id, reactionContext.aiMessage)
        } catch (err) {
          console.error('[Twilio] Post-client reaction processing failed:', err)
        }
      }

      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    // ── Normal message flow (non-reaction) ──

    // ── MMS: Download from Twilio → Upload to Cloudinary → Get public URLs ──
    let publicMediaUrls = mediaUrls
    const targetLeadForMedia = lead?.id || client?.leadId
    if (targetLeadForMedia && mediaUrls && mediaUrls.length > 0) {
      try {
        const { processMediaFromTwilio } = await import('@/lib/media-processor')
        const cloudinaryUrls: string[] = []
        for (let i = 0; i < mediaUrls.length; i++) {
          const contentType = mediaTypes?.[i] || 'image/jpeg'
          const publicUrl = await processMediaFromTwilio(mediaUrls[i], contentType, targetLeadForMedia)
          if (publicUrl) {
            cloudinaryUrls.push(publicUrl)
          }
        }
        if (cloudinaryUrls.length > 0) {
          publicMediaUrls = cloudinaryUrls
          console.log(`[Twilio] Processed ${cloudinaryUrls.length} MMS images via Cloudinary`)
        }
      } catch (err) {
        console.error('[Twilio] Media processing failed, using original URLs:', err)
      }
    }

    // Log inbound message (with Cloudinary URLs if processed)
    await logInboundSMSViaProvider({
      from,
      body,
      sid,
      leadId: lead?.id || client?.leadId || undefined,
      clientId: client?.id,
      mediaUrls: publicMediaUrls,
      mediaTypes,
    })

    // Auto-DNC on STOP keywords
    const stopKeywords = ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'QUIT', 'OPTOUT', 'OPT OUT']
    if (stopKeywords.includes(body.trim().toUpperCase())) {
      if (lead) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: { dncAt: new Date(), status: 'DO_NOT_CONTACT', dncReason: 'STOP keyword received', dncAddedBy: 'system' },
        })
        await prisma.notification.create({
          data: {
            type: 'CLIENT_TEXT',
            title: 'Auto-DNC — STOP Received',
            message: `${lead.firstName} ${lead.lastName} (${lead.companyName}) texted "${body.trim()}" — auto-marked DNC`,
            metadata: { leadId: lead.id, keyword: body.trim() },
          },
        })
        console.log(`[Twilio] Auto-DNC: Lead ${lead.id} sent STOP keyword`)
      }
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    // Check for escalation triggers
    const shouldEscalate = await checkForEscalation(body)

    if (shouldEscalate) {
      await prisma.message.updateMany({
        where: { twilioSid: sid },
        data: {
          escalated: true,
          escalationReason: 'Detected escalation trigger in message'
        }
      })

      // Create notification
      const escalationMsg = `From: ${lead?.firstName || client?.lead?.firstName} - ${body.substring(0, 50)}...`
      await prisma.notification.create({
        data: {
          type: 'CLIENT_TEXT',
          title: 'Message Needs Attention',
          message: escalationMsg,
          metadata: { leadId: lead?.id, clientId: client?.id, from, body }
        }
      })

      // SMS alert to admin phone
      try {
        const { notifyAdmin } = await import('@/lib/notifications')
        const name = lead?.firstName || client?.lead?.firstName || 'Unknown'
        await notifyAdmin('escalation', 'Escalation', `${name} triggered escalation: ${body.substring(0, 80)}`)
      } catch (err) {
        console.error('[Twilio] Admin SMS notification failed:', err)
      }
    }

    // ── AI VISION: classify MMS images ──
    if (lead && publicMediaUrls && publicMediaUrls.length > 0) {
      try {
        const { processInboundImages } = await import('@/lib/ai-vision')
        // Find the message we just logged to get its ID
        const recentMsg = sid ? await prisma.message.findUnique({ where: { twilioSid: sid }, select: { id: true } }) : null
        await processInboundImages(lead.id, recentMsg?.id, publicMediaUrls)
      } catch (err) {
        console.error('[Twilio] AI Vision processing failed:', err)
      }
    }

    // Bug 2: DNC check — if lead is DNC, log message but DON'T trigger AI/Close Engine
    const isDNCLead = lead?.dncAt || lead?.status === 'DO_NOT_CONTACT'
    if (isDNCLead && lead) {
      console.log(`[Twilio] DNC lead ${lead.id} sent inbound SMS — logged but skipping AI processing`)
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    // ── CLOSE ENGINE HANDLER (with SmartChat message batching) ──
    if (lead) {
      const { processCloseEngineInbound, triggerCloseEngine } = await import('@/lib/close-engine')
      const { addToBatch } = await import('@/lib/message-batcher')

      // Check if lead has an active close conversation
      const activeConversation = await prisma.closeEngineConversation.findUnique({
        where: { leadId: lead.id },
      })

      if (activeConversation && !['COMPLETED', 'CLOSED_LOST'].includes(activeConversation.stage)) {
        // Route to Close Engine — use message batching to handle rapid-fire texts
        console.log(`[Twilio] Routing inbound to Close Engine conversation ${activeConversation.id}`)
        try {
          const batched = await addToBatch(
            activeConversation.id,
            lead.id,
            body,
            publicMediaUrls || [],
            processCloseEngineInbound,
          )
          if (!batched) {
            // Batching disabled or not applicable — process immediately
            await processCloseEngineInbound(activeConversation.id, body, publicMediaUrls)
          }
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
        await processPostClientInbound(client.id, body, publicMediaUrls)
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

// ── iMessage Reaction Detection ──

interface ParsedReaction {
  isReaction: boolean
  isRemoval: boolean
  reactionType: 'like' | 'love' | 'laugh' | 'emphasize' | 'dislike' | 'question' | null
  reactionEmoji: string | null
  originalText: string | null
}

function parseReaction(body: string): ParsedReaction {
  const noReaction: ParsedReaction = { isReaction: false, isRemoval: false, reactionType: null, reactionEmoji: null, originalText: null }

  // Removal patterns — silently ignore
  const removalPatterns = [
    /^Removed a (?:like|heart|laugh|exclamation|dislike|question mark) from "(.+)"$/i,
    /^Removed an? .+ from "(.+)"$/i,
  ]
  for (const pattern of removalPatterns) {
    if (pattern.test(body)) {
      return { isReaction: true, isRemoval: true, reactionType: null, reactionEmoji: null, originalText: null }
    }
  }

  // Reaction patterns
  const reactionMap: Array<{ pattern: RegExp; type: ParsedReaction['reactionType']; emoji: string }> = [
    { pattern: /^Liked "(.+)"$/i, type: 'like', emoji: '\uD83D\uDC4D' },
    { pattern: /^Loved "(.+)"$/i, type: 'love', emoji: '\u2764\uFE0F' },
    { pattern: /^Laughed at "(.+)"$/i, type: 'laugh', emoji: '\uD83D\uDE02' },
    { pattern: /^Emphasized "(.+)"$/i, type: 'emphasize', emoji: '\u203C\uFE0F' },
    { pattern: /^Disliked "(.+)"$/i, type: 'dislike', emoji: '\uD83D\uDC4E' },
    { pattern: /^Questioned "(.+)"$/i, type: 'question', emoji: '\u2753' },
  ]

  for (const { pattern, type, emoji } of reactionMap) {
    const match = body.match(pattern)
    if (match) {
      return { isReaction: true, isRemoval: false, reactionType: type, reactionEmoji: emoji, originalText: match[1] }
    }
  }

  return noReaction
}

/**
 * Translates an iMessage reaction into AI-understandable context.
 * Like/Love on a yes/no question → "Yes"
 * Dislike → empathy trigger
 * Simple Like on a statement → no response needed
 */
function translateReactionForAI(
  reaction: ParsedReaction,
  _rawBody: string
): { shouldRoute: boolean; aiMessage: string } {
  const original = reaction.originalText || ''

  // Dislike always routes — trigger empathy
  if (reaction.reactionType === 'dislike') {
    return {
      shouldRoute: true,
      aiMessage: `[REACTION: The lead reacted with a thumbs-down to your message: "${original}". They seem unhappy or disagree. Respond with empathy and ask what's wrong or what they'd prefer instead. Keep it short.]`,
    }
  }

  // Question mark always routes — they're confused
  if (reaction.reactionType === 'question') {
    return {
      shouldRoute: true,
      aiMessage: `[REACTION: The lead put a question mark on your message: "${original}". They seem confused. Clarify what you meant in simple terms.]`,
    }
  }

  // Like/Love on a question → treat as "Yes"
  const isQuestion = original.includes('?')
  if ((reaction.reactionType === 'like' || reaction.reactionType === 'love') && isQuestion) {
    return {
      shouldRoute: true,
      aiMessage: `[REACTION: The lead liked/loved your question: "${original}". This means YES — they agree. Move forward accordingly. Don't ask "was that a yes?" — just proceed.]`,
    }
  }

  // Love on a statement → positive signal, brief acknowledgment
  if (reaction.reactionType === 'love') {
    return {
      shouldRoute: true,
      aiMessage: `[REACTION: The lead loved your message: "${original}". They're excited. A brief positive acknowledgment is fine but keep it to one short sentence. Don't over-respond.]`,
    }
  }

  // Laugh → positive, no response needed usually
  if (reaction.reactionType === 'laugh') {
    return { shouldRoute: false, aiMessage: '' }
  }

  // Emphasize → acknowledgment, they're highlighting importance
  if (reaction.reactionType === 'emphasize') {
    return {
      shouldRoute: true,
      aiMessage: `[REACTION: The lead emphasized your message: "${original}". They're highlighting this as important. A brief acknowledgment that you hear them is fine.]`,
    }
  }

  // Simple Like on a statement → no response needed
  if (reaction.reactionType === 'like') {
    return { shouldRoute: false, aiMessage: '' }
  }

  return { shouldRoute: false, aiMessage: '' }
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

// Keyword map for each configurable escalation trigger ID
const ESCALATION_KEYWORDS: Record<string, string[]> = {
  negative_sentiment: ['angry', 'furious', 'worst', 'terrible', 'horrible', 'disgusting', 'unacceptable', 'disappointed', 'pissed', 'fed up', 'hate'],
  custom_package: ['custom package', 'bigger package', 'enterprise', 'custom plan', 'more features', 'upgrade'],
  cancel_request: ['cancel', 'cancellation', 'end my', 'stop my', 'terminate'],
  refund_request: ['refund', 'money back', 'charge back', 'chargeback', 'get my money'],
  competitor_mention: ['wix', 'squarespace', 'godaddy', 'wordpress', 'shopify', 'webflow', 'another company', 'someone else'],
  human_request: ['speak to a person', 'talk to someone', 'real person', 'human', 'manager', 'supervisor', 'speak to a human', 'talk to a manager'],
  legal_threat: ['lawyer', 'attorney', 'sue', 'lawsuit', 'legal action', 'court', 'bbb', 'better business bureau', 'scam', 'fraud', 'report you'],
  unparseable: [], // Handled by AI, not keyword matching
  back_and_forth: [], // Handled by message count logic, not keywords
  billing_dispute: ['billing', 'charged', 'overcharged', 'invoice', 'payment issue', 'didn\'t authorize', 'unauthorized charge', 'dispute'],
  out_of_scope: [], // Handled by AI, not keyword matching
  message_flood: [], // Handled by message count logic, not keywords
}

async function checkForEscalation(message: string): Promise<boolean> {
  const lowerMessage = message.toLowerCase()

  try {
    // Read escalation triggers from ai_handler settings
    const aiHandlerSetting = await prisma.settings.findUnique({
      where: { key: 'ai_handler' },
    })

    const aiHandler = aiHandlerSetting?.value as Record<string, any> | null
    const triggers = aiHandler?.escalationTriggers as Array<{ id: string; enabled: boolean }> | undefined

    if (!triggers || triggers.length === 0) {
      // Fallback to basic keyword check if settings not configured
      const fallbackTriggers = ['refund', 'cancel', 'lawyer', 'attorney', 'sue', 'scam', 'fraud', 'bbb', 'angry']
      return fallbackTriggers.some(t => lowerMessage.includes(t))
    }

    // Check only enabled triggers
    for (const trigger of triggers) {
      if (!trigger.enabled) continue
      const keywords = ESCALATION_KEYWORDS[trigger.id]
      if (!keywords || keywords.length === 0) continue
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        return true
      }
    }

    return false
  } catch (err) {
    console.error('[Twilio Webhook] Failed to load escalation triggers from settings:', err)
    // Fallback to basic check on error
    const fallbackTriggers = ['refund', 'cancel', 'lawyer', 'attorney', 'sue', 'scam', 'fraud', 'bbb', 'angry']
    return fallbackTriggers.some(t => lowerMessage.includes(t))
  }
}
