/**
 * Close Engine Core Service
 *
 * Central orchestration for the AI Close Engine. Manages conversation lifecycle,
 * stage transitions, autonomy checks, and context loading. Claude API calls
 * are handled separately in the message processor (Task 11).
 */

import { prisma } from './db'
import type { Lead, CloseEngineConversation, Message } from '@prisma/client'

// ============================================
// Constants
// ============================================

export const CONVERSATION_STAGES = {
  INITIATED: 'INITIATED',
  QUALIFYING: 'QUALIFYING',
  COLLECTING_INFO: 'COLLECTING_INFO',
  BUILDING: 'BUILDING',
  PREVIEW_SENT: 'PREVIEW_SENT',
  EDIT_LOOP: 'EDIT_LOOP',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  PAYMENT_SENT: 'PAYMENT_SENT',
  COMPLETED: 'COMPLETED',
  STALLED: 'STALLED',
  CLOSED_LOST: 'CLOSED_LOST',
} as const

export const ENTRY_POINTS = {
  INSTANTLY_REPLY: 'INSTANTLY_REPLY',
  SMS_REPLY: 'SMS_REPLY',
  REP_CLOSE: 'REP_CLOSE',
  PREVIEW_CTA: 'PREVIEW_CTA',
} as const

export const AUTONOMY_LEVELS = {
  FULL_AUTO: 'FULL_AUTO',
  SEMI_AUTO: 'SEMI_AUTO',
  MANUAL: 'MANUAL',
} as const

// Terminal stages — conversation is finished
const TERMINAL_STAGES: string[] = [CONVERSATION_STAGES.COMPLETED, CONVERSATION_STAGES.CLOSED_LOST]

// ============================================
// Types
// ============================================

export interface ConversationContext {
  conversation: CloseEngineConversation
  lead: Lead
  messages: Message[]
  collectedData: Record<string, unknown> | null
  questionsAsked: string[] | null
  previewUrl: string | null
}

// ============================================
// triggerCloseEngine()
// ============================================

export async function triggerCloseEngine(options: {
  leadId: string
  entryPoint: string
  repId?: string
}): Promise<{ success: boolean; conversationId?: string; error?: string }> {
  const { leadId, entryPoint, repId } = options

  try {
    // 0. Atomic dedup: only one entry point can win the race
    // updateMany with WHERE null is atomic — prevents double-fire
    const dedup = await prisma.lead.updateMany({
      where: { id: leadId, closeEngineTriggeredAt: null },
      data: { closeEngineTriggeredAt: new Date() },
    })
    if (dedup.count === 0) {
      console.log(`[CloseEngine] Dedup: already triggered for lead ${leadId}, skipping`)
      return { success: true, conversationId: undefined }
    }

    // 1. Check for existing active conversation
    const existing = await prisma.closeEngineConversation.findUnique({
      where: { leadId },
    })

    if (existing && !TERMINAL_STAGES.includes(existing.stage)) {
      console.log(`[CloseEngine] Dedup: active conversation ${existing.id} already exists for lead ${leadId} (stage: ${existing.stage})`)
      return { success: true, conversationId: existing.id }
    }

    // 2. Load lead and verify it exists with a phone number
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    })

    if (!lead) {
      return { success: false, error: 'Lead not found' }
    }

    if (!lead.phone) {
      return { success: false, error: 'Lead has no phone number' }
    }

    // 3. Update lead status + set form URL (use settings-based base URL for white-label)
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://preview.brightautomations.org'
    try {
      const { getSmartChatSettings } = require('./message-batcher')
      const smartChatSettings = await getSmartChatSettings()
      if (smartChatSettings.formBaseUrl) baseUrl = smartChatSettings.formBaseUrl
    } catch { /* non-critical */ }
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: lead.status === 'HOT_LEAD' ? 'HOT_LEAD' : 'QUALIFIED',
        priority: 'HOT',
        closeEntryPoint: entryPoint,
        formUrl: `${baseUrl}/onboard/${leadId}`,
      },
    })

    // 4. Create CloseEngineConversation (delete old terminal one if exists)
    if (existing && TERMINAL_STAGES.includes(existing.stage)) {
      await prisma.closeEngineConversation.delete({
        where: { id: existing.id },
      })
    }

    const conversation = await prisma.closeEngineConversation.create({
      data: {
        leadId,
        entryPoint,
        repId: repId || null,
        autonomyLevel: lead.autonomyLevel || AUTONOMY_LEVELS.FULL_AUTO,
      },
    })

    // 5. Create notification
    await prisma.notification.create({
      data: {
        type: 'CLOSE_ENGINE',
        title: 'New Close Engine Conversation',
        message: `New close conversation: ${lead.companyName} via ${entryPoint}`,
        metadata: { leadId, conversationId: conversation.id, entryPoint },
      },
    })

    // 6. Create LeadEvent
    await prisma.leadEvent.create({
      data: {
        leadId,
        eventType: 'CLOSE_ENGINE_TRIGGERED',
        metadata: { entryPoint, conversationId: conversation.id },
      },
    })

    // 7. Kick off first message (dynamic import to avoid circular dep)
    const { processCloseEngineFirstMessage } = await import('./close-engine-processor')
    await processCloseEngineFirstMessage(conversation.id)

    return { success: true, conversationId: conversation.id }
  } catch (error) {
    console.error('[CloseEngine] triggerCloseEngine failed:', error)
    return { success: false, error: (error as Error).message }
  }
}

// ============================================
// transitionStage()
// ============================================

// Valid stage transitions — reject anything not in this map
const VALID_TRANSITIONS: Record<string, string[]> = {
  INITIATED: ['QUALIFYING'],
  QUALIFYING: ['COLLECTING_INFO', 'BUILDING', 'STALLED'],
  COLLECTING_INFO: ['BUILDING', 'STALLED'],
  BUILDING: ['PREVIEW_SENT', 'STALLED'],
  PREVIEW_SENT: ['EDIT_LOOP', 'PENDING_APPROVAL', 'PAYMENT_SENT', 'STALLED'],
  EDIT_LOOP: ['PREVIEW_SENT', 'PENDING_APPROVAL', 'PAYMENT_SENT', 'STALLED'],
  PENDING_APPROVAL: ['PAYMENT_SENT', 'STALLED'],
  PAYMENT_SENT: ['COMPLETED', 'STALLED'],
  STALLED: ['QUALIFYING', 'CLOSED_LOST'],
}

export async function transitionStage(
  conversationId: string,
  newStage: string
): Promise<void> {
  const conversation = await prisma.closeEngineConversation.findUnique({
    where: { id: conversationId },
  })

  if (!conversation) {
    throw new Error(`Conversation ${conversationId} not found`)
  }

  const oldStage = conversation.stage

  // Validate transition
  const allowed = VALID_TRANSITIONS[oldStage]
  if (allowed && !allowed.includes(newStage)) {
    console.error(`[CloseEngine] Invalid stage transition: ${oldStage} → ${newStage} (conversation ${conversationId}). Allowed: [${allowed.join(', ')}]`)
    return // Skip invalid transition
  }

  // Build timestamp updates
  const timestamps: Record<string, Date> = {}
  if (newStage === CONVERSATION_STAGES.STALLED) timestamps.stalledAt = new Date()
  if (newStage === CONVERSATION_STAGES.COMPLETED) timestamps.completedAt = new Date()
  if (newStage === CONVERSATION_STAGES.CLOSED_LOST) timestamps.closedLostAt = new Date()

  await prisma.closeEngineConversation.update({
    where: { id: conversationId },
    data: {
      stage: newStage,
      ...timestamps,
    },
  })

  // Log stage change event
  await prisma.leadEvent.create({
    data: {
      leadId: conversation.leadId,
      eventType: 'CLOSE_ENGINE_STAGE_CHANGE',
      fromStage: oldStage,
      toStage: newStage,
      metadata: { conversationId },
    },
  })
}

// ============================================
// getConversationContext()
// ============================================

export async function getConversationContext(conversationId: string): Promise<ConversationContext> {
  const conversation = await prisma.closeEngineConversation.findUnique({
    where: { id: conversationId },
  })

  if (!conversation) {
    throw new Error(`Conversation ${conversationId} not found`)
  }

  const lead = await prisma.lead.findUnique({
    where: { id: conversation.leadId },
    include: {
      dialerCalls: {
        select: { dispositionResult: true, notes: true, connectedAt: true, duration: true, startedAt: true },
        orderBy: { startedAt: 'desc' },
        take: 5,
      },
      upsellTags: {
        where: { removedAt: null },
        select: { productName: true, productPrice: true },
      },
    },
  })

  if (!lead) {
    throw new Error(`Lead ${conversation.leadId} not found for conversation ${conversationId}`)
  }

  // Get last 20 messages for this lead, ordered chronologically
  const messages = await prisma.message.findMany({
    where: { leadId: conversation.leadId },
    orderBy: { createdAt: 'asc' },
    take: 20,
  })

  return {
    conversation,
    lead,
    messages,
    collectedData: conversation.collectedData as Record<string, unknown> | null,
    questionsAsked: conversation.questionsAsked as string[] | null,
    previewUrl: lead.previewUrl,
  }
}

// ============================================
// checkAutonomy()
// ============================================

export async function checkAutonomy(
  conversationId: string,
  actionType: 'SEND_MESSAGE' | 'SEND_PAYMENT_LINK' | 'SEND_PREVIEW'
): Promise<{ allowed: boolean; requiresApproval: boolean }> {
  const conversation = await prisma.closeEngineConversation.findUnique({
    where: { id: conversationId },
  })

  if (!conversation) {
    throw new Error(`Conversation ${conversationId} not found`)
  }

  const level = conversation.autonomyLevel

  if (level === AUTONOMY_LEVELS.FULL_AUTO) {
    // Payment links ALWAYS require approval — too high-stakes for full auto
    if (actionType === 'SEND_PAYMENT_LINK') {
      return { allowed: false, requiresApproval: true }
    }
    return { allowed: true, requiresApproval: false }
  }

  if (level === AUTONOMY_LEVELS.SEMI_AUTO) {
    if (actionType === 'SEND_MESSAGE' || actionType === 'SEND_PREVIEW') {
      return { allowed: true, requiresApproval: false }
    }
    // SEND_PAYMENT_LINK requires approval in semi-auto
    return { allowed: false, requiresApproval: true }
  }

  // MANUAL — everything requires approval
  return { allowed: false, requiresApproval: true }
}

// ============================================
// Re-export from processor (implemented in Task 11)
// ============================================

export { processCloseEngineFirstMessage, processCloseEngineInbound } from './close-engine-processor'
