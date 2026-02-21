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
    if (!isValid && process.env.NODE_ENV === 'production') {
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
        }).catch(() => {})
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
