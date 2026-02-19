/**
 * Close Engine Message Processor
 *
 * Main message processing pipeline for the AI Close Engine.
 * Calls Claude API, parses responses, applies humanizing delays,
 * checks autonomy, and sends replies via SMS.
 */

import Anthropic from '@anthropic-ai/sdk'
import type { Prisma } from '@prisma/client'
import { prisma } from './db'
import { sendSMSViaProvider } from './sms-provider'
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

  const firstMessage = getFirstMessageTemplate(context.conversation.entryPoint, lead)

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
        type: 'CLIENT_TEXT',
        title: 'Draft Message Ready',
        message: `AI drafted first message for ${lead.companyName} — review and send`,
        metadata: { conversationId, leadId: lead.id },
      },
    })
    return
  }

  // Calculate humanizing delay (120-180s for first message)
  const delay = calculateDelay(firstMessage.length, 'first_message')

  // Schedule delayed send
  setTimeout(async () => {
    try {
      await sendSMSViaProvider({
        to: lead.phone,
        message: firstMessage,
        leadId: lead.id,
        trigger: 'close_engine_first_message',
        aiGenerated: true,
        aiDelaySeconds: delay,
        conversationType: 'pre_client',
        sender: 'clawdbot',
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
  _mediaUrls?: string[]
): Promise<void> {
  const context = await getConversationContext(conversationId)
  const lead = context.lead

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
  const systemPrompt = buildPreClientSystemPrompt(context)

  let claudeResponse: ClaudeCloseResponse
  try {
    const client = getAnthropicClient()
    const apiResponse = await client.messages.create({
      model: MODELS.PRE_CLIENT,
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: inboundMessage }],
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
    await prisma.lead.update({
      where: { id: lead.id },
      data: { qualificationData: merged },
    })
  }

  // 4. Handle stage transition
  if (claudeResponse.nextStage) {
    await transitionStage(conversationId, claudeResponse.nextStage)
  }

  // 5. Handle readyToBuild
  if (claudeResponse.readyToBuild) {
    await transitionStage(conversationId, CONVERSATION_STAGES.BUILDING)
    await prisma.notification.create({
      data: {
        type: 'DAILY_AUDIT',
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

  const delay = calculateDelay(
    claudeResponse.replyText.length,
    claudeResponse.readyToBuild ? 'detailed' : 'standard'
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
        type: 'CLIENT_TEXT',
        title: 'Approval Required',
        message: `AI drafted response for ${lead.companyName} — review in Messages`,
        metadata: { conversationId, leadId: lead.id },
      },
    })
    return
  }

  // 8. Send with humanizing delay
  setTimeout(async () => {
    try {
      await sendSMSViaProvider({
        to: lead.phone,
        message: claudeResponse.replyText,
        leadId: lead.id,
        trigger: `close_engine_${context.conversation.stage.toLowerCase()}`,
        aiGenerated: true,
        aiDelaySeconds: delay,
        conversationType: 'pre_client',
        sender: 'clawdbot',
      })
    } catch (err) {
      console.error('[CloseEngine] Failed to send reply:', err)
    }
  }, delay * 1000)

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
// calculateDelay()
// ============================================

export function calculateDelay(messageLength: number, messageType: string): number {
  const base =
    messageType === 'first_message' ? 120
    : messageType === 'payment_link' ? 90
    : messageType === 'acknowledgment' ? 30
    : messageType === 'detailed' ? 60
    : 45 // standard

  const lengthFactor = Math.min(messageLength / 150, 1) * 60
  const jitter = Math.random() * 30 - 15

  return Math.max(30, Math.round(base + lengthFactor + jitter))
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
