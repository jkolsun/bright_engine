/**
 * Close Engine Message Processor
 *
 * Main message processing pipeline for the AI Close Engine.
 * Calls Claude API, parses responses, applies humanizing delays,
 * checks autonomy, and sends replies via SMS with email fallback.
 */

import Anthropic from '@anthropic-ai/sdk'
import type { Prisma } from '@prisma/client'
import { prisma } from './db'
import { sendSMSViaProvider } from './sms-provider'
import { sendEmail } from './resend'
import {
  getConversationContext,
  transitionStage,
  checkAutonomy,
  CONVERSATION_STAGES,
} from './close-engine'
import {
  buildPreClientSystemPrompt,
  getFirstMessageTemplate,
  checkEscalation,
  MODELS,
} from './close-engine-prompts'

// ============================================
// Anthropic Client (lazy singleton)
// ============================================

let anthropicClient: Anthropic | null = null
function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return anthropicClient
}

// ============================================
// sendCloseEngineMessage() — SMS with email fallback
// ============================================

interface CloseEngineMessageOptions {
  to: string
  toEmail?: string
  message: string
  leadId: string
  trigger: string
  aiGenerated?: boolean
  aiDelaySeconds?: number
  conversationType?: string
  sender?: string
  aiDecisionLog?: Record<string, unknown>
  emailSubject?: string
}

interface CloseEngineMessageResult {
  success: boolean
  channel: 'SMS' | 'EMAIL' | 'NONE'
  fallbackUsed: boolean
  error?: string
}

/**
 * Sends a Close Engine message via SMS first, falling back to email via Resend
 * if SMS fails (e.g. A2P 10DLC block). Logs fallback events.
 */
export async function sendCloseEngineMessage(options: CloseEngineMessageOptions): Promise<CloseEngineMessageResult> {
  const {
    to, toEmail, message, leadId, trigger, aiGenerated = true,
    aiDelaySeconds, conversationType = 'pre_client', sender = 'clawdbot',
    aiDecisionLog, emailSubject,
  } = options

  // 1. Try SMS first
  const smsResult = await sendSMSViaProvider({
    to,
    message,
    leadId,
    trigger,
    aiGenerated,
    aiDelaySeconds,
    conversationType,
    sender,
    aiDecisionLog,
  })

  if (smsResult.success) {
    return { success: true, channel: 'SMS', fallbackUsed: false }
  }

  // 2. SMS failed — try email fallback
  console.warn(`[CloseEngine] SMS failed for ${to} (${smsResult.error}), attempting email fallback...`)

  // Look up email if not provided
  let emailAddress = toEmail
  if (!emailAddress && leadId) {
    const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { email: true } })
    emailAddress = lead?.email || undefined
  }

  if (!emailAddress) {
    console.error(`[CloseEngine] No email address for fallback. Message delivery failed.`)
    return { success: false, channel: 'NONE', fallbackUsed: false, error: `SMS failed (${smsResult.error}), no email for fallback` }
  }

  // 3. Send via Resend email
  const emailResult = await sendEmail({
    to: emailAddress,
    subject: emailSubject || 'Message from Bright Automations',
    html: message.replace(/\n/g, '<br>'),
    leadId,
    sender,
    trigger: `${trigger}_email_fallback`,
    aiGenerated,
    aiDelaySeconds,
    aiDecisionLog,
  })

  if (emailResult.success) {
    console.log(`[CloseEngine] Email fallback succeeded for ${emailAddress}`)

    // Log fallback event
    await prisma.leadEvent.create({
      data: {
        leadId,
        eventType: 'SMS_FALLBACK_EMAIL',
        actor: 'system',
        metadata: {
          smsError: smsResult.error,
          emailTo: emailAddress,
          resendId: emailResult.resendId,
          trigger,
        },
      },
    }).catch(() => {}) // Non-critical
  }

  return {
    success: emailResult.success,
    channel: 'EMAIL',
    fallbackUsed: true,
    error: emailResult.success ? undefined : emailResult.error,
  }
}

// ============================================
// Types
// ============================================

interface ClaudeCloseResponse {
  replyText: string
  extractedData: Record<string, unknown> | null
  nextStage: string | null
  questionAsked: string | null
  readyToBuild: boolean
  escalate: boolean
  escalateReason: string | null
}

// ============================================
// processCloseEngineFirstMessage()
// ============================================

export async function processCloseEngineFirstMessage(conversationId: string): Promise<void> {
  const context = await getConversationContext(conversationId)
  const lead = context.lead

  const template = await getFirstMessageTemplate(context.conversation.entryPoint, lead)

  // Route first message through AI — template is used as a guideline
  let firstMessage = template
  try {
    const aiSettingsRaw = await prisma.settings.findUnique({ where: { key: 'ai_handler' } })
    const aiSettings = (aiSettingsRaw?.value as any) || {}
    const globalPrompt = aiSettings.humanizingPrompt || ''

    const entryLabel = context.conversation.entryPoint.replace(/_/g, ' ').toLowerCase()

    const client = getAnthropicClient()
    const aiResponse = await client.messages.create({
      model: MODELS.PRE_CLIENT,
      max_tokens: 300,
      system: `You write first-contact text messages for a web design agency. Be casual, friendly, and human. 1-2 sentences max. Never use emojis excessively. ${globalPrompt}`,
      messages: [{
        role: 'user',
        content: `SCENARIO: ${entryLabel}
Use this template as your approach (adapt naturally, don't copy word-for-word):
"${template}"

Lead: ${lead.firstName} from ${lead.companyName} (${lead.industry || 'service business'})
${lead.previewUrl ? `Preview URL: ${lead.previewUrl}` : 'No preview yet.'}

Write ONE text message. 1-2 sentences max. Casual and human. Do not include quotes around the message.`,
      }],
    })

    const aiText = aiResponse.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('')
      .trim()

    if (aiText && aiText.length > 10 && aiText.length < 500) {
      firstMessage = aiText
    }

    await prisma.apiCost.create({
      data: { service: 'anthropic', operation: 'close_engine_first_message', cost: 0.01 },
    }).catch(() => {})
  } catch (aiError) {
    console.warn('[CloseEngine] AI first message generation failed, using template:', aiError)
    // Fall back to template — already set above
  }

  // Check autonomy
  const autonomy = await checkAutonomy(conversationId, 'SEND_MESSAGE')

  if (autonomy.requiresApproval) {
    // MANUAL mode — create pending action for review
    await prisma.pendingAction.create({
      data: {
        conversationId,
        leadId: lead.id,
        type: 'SEND_MESSAGE',
        draftMessage: firstMessage,
        status: 'PENDING',
      },
    })
    await prisma.notification.create({
      data: {
        type: 'CLOSE_ENGINE',
        title: 'Draft Message Ready',
        message: `AI drafted first message for ${lead.companyName} — review and send`,
        metadata: { conversationId, leadId: lead.id },
      },
    })
    return
  }

  // Calculate humanizing delay — CTA clicks get faster response
  const isCta = context.conversation.entryPoint === 'PREVIEW_CTA'
  const delay = calculateDelay(firstMessage.length, isCta ? 'first_message_cta' : 'first_message')

  // Schedule delayed send with email fallback
  setTimeout(async () => {
    try {
      await sendCloseEngineMessage({
        to: lead.phone,
        toEmail: lead.email || undefined,
        message: firstMessage,
        leadId: lead.id,
        trigger: 'close_engine_first_message',
        aiDelaySeconds: delay,
        conversationType: 'pre_client',
        emailSubject: `${lead.companyName} — your new website`,
        aiDecisionLog: {
          trigger: context.conversation.entryPoint,
          messageType: isCta ? 'first_message_cta' : 'first_message',
          templateUsed: template !== firstMessage ? 'ai_adapted' : 'template_fallback',
          delaySeconds: delay,
          leadStatus: lead.status,
          leadPriority: lead.priority,
        },
      })

      // Transition to QUALIFYING
      await transitionStage(conversationId, CONVERSATION_STAGES.QUALIFYING)
    } catch (err) {
      console.error('[CloseEngine] Failed to send first message:', err)
    }
  }, delay * 1000)
}

// ============================================
// processCloseEngineInbound()
// ============================================

export async function processCloseEngineInbound(
  conversationId: string,
  inboundMessage: string,
  mediaUrls?: string[]
): Promise<void> {
  const context = await getConversationContext(conversationId)
  const lead = context.lead

  // 0. If MMS images present, enrich the inbound message with AI vision context
  let enrichedMessage = inboundMessage
  if (mediaUrls && mediaUrls.length > 0) {
    try {
      const { classifyImage } = await import('./ai-vision')
      const classifications = await Promise.all(mediaUrls.map(url => classifyImage(url)))
      const imageContext = classifications
        .map(c => `[Image: ${c.type} — ${c.description}]`)
        .join(' ')
      enrichedMessage = `${inboundMessage} ${imageContext}`.trim()
    } catch (err) {
      console.error('[CloseEngine] AI Vision failed:', err)
    }
  }

  // 0.5 AI conversation awareness — should we respond at all?
  const isReactionContext = enrichedMessage.startsWith('[REACTION:')
  if (!isReactionContext) {
    // Get last outbound message for this lead
    const lastOutbound = await prisma.message.findFirst({
      where: { leadId: lead.id, direction: 'OUTBOUND' },
      orderBy: { createdAt: 'desc' },
      select: { content: true },
    })

    if (!shouldAIRespond(enrichedMessage, lastOutbound?.content || null)) {
      console.log(`[CloseEngine] Skipping response — conversation awareness: "${inboundMessage.substring(0, 40)}"`)
      return // Stay silent
    }
  }

  // 1. Check for escalation keywords
  const escalation = checkEscalation(inboundMessage)
  if (escalation.shouldEscalate) {
    const lastMessage = await prisma.message.findFirst({
      where: { leadId: lead.id, direction: 'INBOUND' },
      orderBy: { createdAt: 'desc' },
    })
    if (lastMessage) {
      await prisma.message.update({
        where: { id: lastMessage.id },
        data: { escalated: true, escalationReason: `Keyword detected: ${escalation.keyword}` },
      })
    }
    await prisma.notification.create({
      data: {
        type: 'CLIENT_TEXT',
        title: 'Escalation — Close Engine',
        message: `${lead.firstName} at ${lead.companyName} said "${inboundMessage.substring(0, 80)}..." — keyword: ${escalation.keyword}`,
        metadata: { conversationId, leadId: lead.id, keyword: escalation.keyword },
      },
    })
  }

  // 2. Build system prompt and call Claude
  const systemPrompt = await buildPreClientSystemPrompt(context)

  let claudeResponse: ClaudeCloseResponse
  try {
    const client = getAnthropicClient()
    const apiResponse = await client.messages.create({
      model: MODELS.PRE_CLIENT,
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: enrichedMessage }],
    })

    const rawText = apiResponse.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('')

    claudeResponse = parseClaudeResponse(rawText)

    // Log API cost
    await prisma.apiCost.create({
      data: {
        service: 'anthropic',
        operation: `close_engine_${context.conversation.stage.toLowerCase()}`,
        cost: 0.03,
      },
    }).catch(() => {}) // Non-critical
  } catch (apiError) {
    console.error('[CloseEngine] Anthropic API failed:', apiError)
    await prisma.notification.create({
      data: {
        type: 'DAILY_AUDIT',
        title: 'AI Error — Close Engine',
        message: `Claude API failed for ${lead.companyName}. Manual intervention needed.`,
        metadata: { conversationId, leadId: lead.id, error: String(apiError) },
      },
    })
    return // Don't send a broken message
  }

  // 3. Process extracted data
  if (claudeResponse.extractedData) {
    const existing = (context.conversation.collectedData as Record<string, unknown>) || {}
    const merged = { ...existing, ...claudeResponse.extractedData } as Prisma.InputJsonValue
    await prisma.closeEngineConversation.update({
      where: { id: conversationId },
      data: { collectedData: merged },
    })

    // Sync extracted fields to lead record so they're available for site building
    const leadUpdate: Record<string, unknown> = { qualificationData: merged }
    const extracted = claudeResponse.extractedData as Record<string, unknown>
    if (extracted.services) leadUpdate.enrichedServices = extracted.services
    if (extracted.hours) leadUpdate.enrichedHours = extracted.hours

    await prisma.lead.update({
      where: { id: lead.id },
      data: leadUpdate,
    })
  }

  // 4. Handle stage transition (skip PAYMENT_SENT — sendPaymentLink handles that)
  if (claudeResponse.nextStage && claudeResponse.nextStage !== CONVERSATION_STAGES.PAYMENT_SENT) {
    await transitionStage(conversationId, claudeResponse.nextStage)
  }

  // 5. Handle readyToBuild
  if (claudeResponse.readyToBuild) {
    await transitionStage(conversationId, CONVERSATION_STAGES.BUILDING)
    await prisma.notification.create({
      data: {
        type: 'CLOSE_ENGINE',
        title: 'Site Build Ready',
        message: `${lead.companyName} qualification complete. Ready to build site.`,
        metadata: { conversationId, leadId: lead.id } as Prisma.InputJsonValue,
      },
    })
    await prisma.lead.update({
      where: { id: lead.id },
      data: { status: 'BUILDING' },
    })
  }

  // 6. Handle escalation from Claude
  if (claudeResponse.escalate) {
    await prisma.notification.create({
      data: {
        type: 'CLIENT_TEXT',
        title: 'AI Escalation',
        message: `Claude escalated ${lead.companyName}: ${claudeResponse.escalateReason}`,
        metadata: { conversationId, leadId: lead.id, reason: claudeResponse.escalateReason },
      },
    })
  }

  // 7. Check autonomy before sending
  const actionType = claudeResponse.nextStage === CONVERSATION_STAGES.PAYMENT_SENT
    ? 'SEND_PAYMENT_LINK' as const
    : 'SEND_MESSAGE' as const
  const autonomy = await checkAutonomy(conversationId, actionType)

  // Count recent messages for smart delay (active chat = faster responses)
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000)
  const recentCount = await prisma.message.count({
    where: { leadId: lead.id, createdAt: { gte: fiveMinAgo } },
  })

  const delay = calculateDelay(
    claudeResponse.replyText.length,
    claudeResponse.readyToBuild ? 'detailed' : 'standard',
    recentCount
  )

  if (autonomy.requiresApproval) {
    // Create pending action for review
    await prisma.pendingAction.create({
      data: {
        conversationId,
        leadId: lead.id,
        type: actionType,
        draftMessage: claudeResponse.replyText,
        status: 'PENDING',
      },
    })
    await prisma.notification.create({
      data: {
        type: 'CLOSE_ENGINE',
        title: 'Approval Required',
        message: `AI drafted response for ${lead.companyName} — review in Messages`,
        metadata: { conversationId, leadId: lead.id },
      },
    })
    return
  }

  // 8. Build decision log
  const aiDecisionLog = {
    trigger: context.conversation.entryPoint,
    leadStatus: lead.status,
    leadPriority: lead.priority,
    stage: context.conversation.stage,
    delaySeconds: delay,
    extractedData: !!claudeResponse.extractedData,
    nextStage: claudeResponse.nextStage,
    readyToBuild: claudeResponse.readyToBuild,
    escalate: claudeResponse.escalate,
    promptSnippet: systemPrompt.slice(0, 200) + '...',
  }

  // 9. Send reply (or payment link) with email fallback
  if (actionType === 'SEND_PAYMENT_LINK') {
    // Send Claude's conversational reply first, then trigger payment link flow
    setTimeout(async () => {
      try {
        await sendCloseEngineMessage({
          to: lead.phone,
          toEmail: lead.email || undefined,
          message: claudeResponse.replyText,
          leadId: lead.id,
          trigger: `close_engine_${context.conversation.stage.toLowerCase()}`,
          aiDelaySeconds: delay,
          conversationType: 'pre_client',
          emailSubject: `${lead.companyName} — next steps`,
          aiDecisionLog,
        })
        // Generate Stripe checkout link and send it
        const { sendPaymentLink } = await import('./close-engine-payment')
        await sendPaymentLink(conversationId)
      } catch (err) {
        console.error('[CloseEngine] Failed to send payment link:', err)
      }
    }, delay * 1000)
  } else {
    setTimeout(async () => {
      try {
        await sendCloseEngineMessage({
          to: lead.phone,
          toEmail: lead.email || undefined,
          message: claudeResponse.replyText,
          leadId: lead.id,
          trigger: `close_engine_${context.conversation.stage.toLowerCase()}`,
          aiDelaySeconds: delay,
          conversationType: 'pre_client',
          emailSubject: `${lead.companyName} — your new website`,
          aiDecisionLog,
        })
      } catch (err) {
        console.error('[CloseEngine] Failed to send reply:', err)
      }
    }, delay * 1000)
  }

  // 9. Track question asked
  if (claudeResponse.questionAsked) {
    const asked = (context.conversation.questionsAsked as string[]) || []
    asked.push(claudeResponse.questionAsked)
    await prisma.closeEngineConversation.update({
      where: { id: conversationId },
      data: { questionsAsked: asked },
    })
  }
}

// ============================================
// shouldAIRespond() — Conversation awareness
// ============================================

/**
 * Determines if the AI should respond to a message or stay silent.
 * Prevents annoying infinite acknowledgment loops:
 *   client: "sounds good" → AI: "Great!" → client: "thanks" → AI: "You're welcome!" → forever
 *
 * Returns false (skip response) when:
 * 1. Inbound is a conversation closer AND our last message was also a closer/wrapup
 * 2. Inbound is a bare acknowledgment with no question or request
 */
export function shouldAIRespond(
  inboundMessage: string,
  lastOutboundContent: string | null,
): boolean {
  const inbound = inboundMessage.toLowerCase().trim()

  // Conversation closers / bare acknowledgments
  const closers = [
    'ok', 'okay', 'k', 'kk',
    'thanks', 'thank you', 'thx', 'ty',
    'sounds good', 'sounds great',
    'cool', 'nice', 'sweet', 'awesome', 'perfect', 'great', 'got it',
    'will do', 'for sure', 'bet', 'word', 'alright', 'aight',
    'good to know', 'appreciate it', 'much appreciated',
    'noted', 'understood',
  ]

  // Single emoji acknowledgments
  const emojiAcks = [
    '\uD83D\uDC4D', '\uD83D\uDC4D\uD83C\uDFFB', '\uD83D\uDC4D\uD83C\uDFFC', '\uD83D\uDC4D\uD83C\uDFFD', '\uD83D\uDC4D\uD83C\uDFFE', '\uD83D\uDC4D\uD83C\uDFFF', // thumbs up variants
    '\uD83D\uDE4F', // folded hands / thank you
    '\u2705', // check mark
    '\uD83D\uDC4C', // ok hand
    '\uD83D\uDE0A', '\uD83D\uDE42', '\uD83D\uDE04', // smiles
    '\u2764\uFE0F', '\u2764', // hearts
    '\uD83D\uDD25', // fire
  ]

  // Check if inbound is a bare closer
  const isCloser = closers.some(c => inbound === c || inbound === c + '!' || inbound === c + '.')
  const isEmojiAck = emojiAcks.includes(inbound.trim())

  if (!isCloser && !isEmojiAck) {
    // Not a conversation closer — always respond
    return true
  }

  // It IS a closer/ack — now check if our last message was a wrapup
  if (!lastOutboundContent) {
    // No previous outbound — this might be a reply to initial outreach, respond
    return true
  }

  const lastOut = lastOutboundContent.toLowerCase().trim()

  // AI closing patterns — if our last message looks like a wrapup, don't respond to an ack
  const aiClosingPatterns = [
    'let me know', 'reach out', 'here if you need',
    'happy to help', 'glad to help', 'help anytime',
    'don\'t hesitate', 'feel free',
    'have a great', 'have a good', 'talk soon', 'take care',
    'you\'re all set', 'all set', 'good to go',
    'we\'ll get', 'working on it', 'on it',
    'sounds like a plan', 'we\'re on it',
  ]

  const lastMessageWasClosing = aiClosingPatterns.some(p => lastOut.includes(p))

  // If our last message was a closing statement AND inbound is just an ack → stay silent
  if (lastMessageWasClosing) {
    return false
  }

  // If the inbound contains a question mark, always respond
  if (inbound.includes('?')) {
    return true
  }

  // If the closer is "thanks" / "thank you" and our last message wasn't a closer,
  // a brief "you're welcome" is ok — but if it's just "ok" / "cool" / emoji, skip
  const isThanks = ['thanks', 'thank you', 'thx', 'ty', 'appreciate it', 'much appreciated'].some(t => inbound === t || inbound === t + '!')
  if (isThanks) {
    // Respond to thanks only if our last message was substantive (contained useful info)
    // If our last message was also short (< 40 chars), it was probably a closer itself
    return lastOutboundContent.length > 40
  }

  // Plain "ok", "cool", "got it", emoji → don't respond
  return false
}

// ============================================
// calculateDelay()
// ============================================

/**
 * Smart AI delay — adapts based on conversation tempo.
 * Active back-and-forth: 4-12s (feels like a real person typing)
 * First messages / cold leads: 30-60s (doesn't feel robotic)
 * Payment links: 15-45s (fast but not instant)
 *
 * @param messageLength - Length of the AI response
 * @param messageType - Type of message being sent
 * @param recentMessageCount - Number of messages in last 5 minutes (measures active chat)
 */
export function calculateDelay(messageLength: number, messageType: string, recentMessageCount?: number): number {
  // Active back-and-forth detection: if 3+ messages in last 5 min, use fast delays
  const isActiveChat = (recentMessageCount ?? 0) >= 3

  if (isActiveChat) {
    // Active conversation: 4-12 seconds — feels like typing
    const typingTime = Math.min(messageLength / 30, 8) // ~30 chars/sec typing speed
    const jitter = Math.random() * 4 - 2
    return Math.max(4, Math.round(4 + typingTime + jitter))
  }

  // Standard delays for non-active conversations
  const base =
    messageType === 'first_message_cta' ? 15  // CTA click = high intent
    : messageType === 'first_message' ? 45    // First contact — not too eager
    : messageType === 'payment_link' ? 20     // Payment = business, be prompt
    : messageType === 'acknowledgment' ? 8    // Quick ack
    : messageType === 'detailed' ? 25         // Thoughtful response
    : 15                                      // Default

  const lengthFactor = Math.min(messageLength / 200, 1) * 15
  const jitter = Math.random() * 10 - 5

  return Math.max(4, Math.round(base + lengthFactor + jitter))
}

// ============================================
// parseClaudeResponse()
// ============================================

export function parseClaudeResponse(raw: string): ClaudeCloseResponse {
  try {
    // Strip markdown code fences if present
    const cleaned = raw.replace(/```json\s?/g, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(cleaned)
    return {
      replyText: parsed.replyText || raw,
      extractedData: parsed.extractedData || null,
      nextStage: parsed.nextStage || null,
      questionAsked: parsed.questionAsked || null,
      readyToBuild: parsed.readyToBuild || false,
      escalate: parsed.escalate || false,
      escalateReason: parsed.escalateReason || null,
    }
  } catch {
    // If JSON parse fails, treat raw text as the reply
    console.warn('[CloseEngine] Failed to parse Claude JSON, using raw text')
    return {
      replyText: raw.substring(0, 300),
      extractedData: null,
      nextStage: null,
      questionAsked: null,
      readyToBuild: false,
      escalate: false,
      escalateReason: null,
    }
  }
}
