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
  POSITIVE_REPLY: 'POSITIVE_REPLY',
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
  bookingLink: string
}

// ============================================
// triggerCloseEngine()
// ============================================

export async function triggerCloseEngine(options: {
  leadId: string
  entryPoint: string
  repId?: string
  reEngagement?: boolean
  skipFirstMessage?: boolean
}): Promise<{ success: boolean; conversationId?: string; error?: string }> {
  const { leadId, entryPoint, repId, reEngagement, skipFirstMessage } = options

  // TEARDOWN: CTA trigger disabled — will route to Cal.com in next spec.
  if (entryPoint === 'PREVIEW_CTA') {
    console.log('[CLOSE_ENGINE] CTA trigger disabled — teardown. CTA will route to Cal.com in next spec.');
    return { success: false, error: 'CTA trigger disabled — teardown' };
  }

  try {
    // 0. Atomic dedup: only one entry point can win the race
    // For re-engagement (CLOSED_LOST), reset the flag atomically within a transaction
    // to prevent the window where two rapid messages both reset and both win.
    if (reEngagement) {
      // Atomic re-engagement: reset dedup flag + re-acquire in one transaction
      const reEngagementResult = await prisma.$transaction(async (tx) => {
        // Reset the flag
        await tx.lead.update({
          where: { id: leadId },
          data: { closeEngineTriggeredAt: null },
        })
        // Immediately re-acquire the dedup lock
        const dedup = await tx.lead.updateMany({
          where: { id: leadId, closeEngineTriggeredAt: null },
          data: { closeEngineTriggeredAt: new Date() },
        })
        return dedup.count
      })

      if (reEngagementResult === 0) {
        console.log(`[CloseEngine] Dedup: re-engagement race lost for lead ${leadId}, skipping`)
        return { success: true, conversationId: undefined }
      }
    } else {
      // Normal dedup: updateMany with WHERE null is atomic — prevents double-fire
      const dedup = await prisma.lead.updateMany({
        where: { id: leadId, closeEngineTriggeredAt: null },
        data: { closeEngineTriggeredAt: new Date() },
      })
      if (dedup.count === 0) {
        // Already triggered — return the existing conversation so it shows in inbox
        const existingConv = await prisma.closeEngineConversation.findUnique({ where: { leadId } })
        console.log(`[CloseEngine] Dedup: already triggered for lead ${leadId}, returning existing conv ${existingConv?.id}`)
        return { success: true, conversationId: existingConv?.id }
      }
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
        status: 'QUALIFIED',
        closeEntryPoint: entryPoint,
        formUrl: `${baseUrl}/onboard/${leadId}`,
      },
    })

    // Recalculate engagement score (persists score + derives priority)
    try {
      const { calculateEngagementScore } = await import('./engagement-scoring')
      await calculateEngagementScore(leadId)
    } catch (e) { console.warn('[CloseEngine] Score calc failed:', e) }

    // 4. Create CloseEngineConversation atomically (delete old terminal + create new in transaction)
    // This prevents the TOCTOU gap where two callers both see the old conversation,
    // both delete it, and both try to create — the unique constraint on leadId catches this,
    // but we handle it gracefully instead of crashing.
    let conversation
    try {
      conversation = await prisma.$transaction(async (tx) => {
        if (existing && TERMINAL_STAGES.includes(existing.stage)) {
          await tx.closeEngineConversation.delete({
            where: { id: existing.id },
          }).catch(() => { /* already deleted by a concurrent caller */ })
        }

        return tx.closeEngineConversation.create({
          data: {
            leadId,
            entryPoint,
            repId: repId || null,
            autonomyLevel: lead.autonomyLevel || AUTONOMY_LEVELS.FULL_AUTO,
          },
        })
      })
    } catch (createErr: any) {
      // Unique constraint violation — another caller already created the conversation
      if (createErr?.code === 'P2002') {
        const existingConv = await prisma.closeEngineConversation.findUnique({ where: { leadId } })
        console.log(`[CloseEngine] Dedup: conversation race resolved — using existing ${existingConv?.id}`)
        return { success: true, conversationId: existingConv?.id }
      }
      throw createErr
    }

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
    // Skip automated message if rep is already on the phone (CTA click during active call)
    if (!skipFirstMessage) {
      const { processCloseEngineFirstMessage } = await import('./close-engine-processor')
      await processCloseEngineFirstMessage(conversation.id)
    } else {
      console.log(`[CloseEngine] Skipping first message for ${conversation.id} (rep on active call)`)
    }

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
  QUALIFYING: ['COLLECTING_INFO', 'COMPLETED', 'STALLED'],
  COLLECTING_INFO: ['QUALIFYING', 'COMPLETED', 'STALLED'],
  BUILDING: ['STALLED'],
  PREVIEW_SENT: ['STALLED'],
  EDIT_LOOP: ['STALLED'],
  PENDING_APPROVAL: ['STALLED'],
  PAYMENT_SENT: ['STALLED'],
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

  let bookingLink = ''
  try {
    const { getBookingLink } = await import('./booking-service')
    bookingLink = await getBookingLink(lead)
  } catch (err) {
    console.warn('[CloseEngine] Failed to get booking link:', err)
  }

  return {
    conversation,
    lead,
    messages,
    collectedData: conversation.collectedData as Record<string, unknown> | null,
    questionsAsked: conversation.questionsAsked as string[] | null,
    previewUrl: lead.previewUrl,
    bookingLink,
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
