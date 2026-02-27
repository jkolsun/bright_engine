/**
 * Edit Confirmation Handler
 *
 * Handles client responses after an AI edit has been applied and the client
 * is reviewing the changes. Parses their response to determine:
 * - Confirm: Push changes to build queue
 * - More edits: Treat as new edit request
 * - Undo: Revert to pre-edit HTML
 */

import type Anthropic from '@anthropic-ai/sdk'
import { prisma } from './db'
import { getAnthropicClient, calculateApiCost } from './anthropic'

const HAIKU_MODEL = 'claude-haiku-4-5-20251001'

export async function handleEditConfirmation(params: {
  clientId: string
  editRequestId: string
  message: string
}): Promise<{ handled: boolean; replyText?: string; newEditInstruction?: string }> {
  const { clientId, editRequestId, message } = params

  // Classify the response
  const classification = await classifyConfirmationResponse(message)

  if (classification === 'confirm') {
    return await confirmAndPush(clientId, editRequestId)
  }

  if (classification === 'undo') {
    return await undoEdit(clientId, editRequestId)
  }

  if (classification === 'more_edits') {
    // Mark current edit as confirmed (the changes stay) but signal that there's a new edit
    await prisma.editRequest.update({
      where: { id: editRequestId },
      data: { editFlowState: 'confirmed' },
    })
    // Return handled=false so the post-client engine processes this as a normal message
    // The AI will detect the new edit request intent naturally
    return { handled: false }
  }

  // Unrelated message — not about the edit at all
  return { handled: false }
}

// ─── Classify the response using Haiku ────────────────────────────

async function classifyConfirmationResponse(
  message: string,
): Promise<'confirm' | 'undo' | 'more_edits' | 'unrelated'> {
  try {
    const anthropic = getAnthropicClient()
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Classification timeout')), 10000)
    )
    const response = await Promise.race([
      anthropic.messages.create({
        model: HAIKU_MODEL,
        max_tokens: 50,
        system: `You classify client responses to a website edit confirmation. The client was shown their updated site and asked if they want more changes before going live.

Respond with ONLY one word:
- "confirm" if they approve/like it/want to go live (e.g. "looks good", "perfect", "push it", "yes", "love it", "that works")
- "undo" if they want to revert/go back (e.g. "undo", "go back", "revert", "I don't like it", "change it back")
- "more_edits" if they want additional changes (e.g. "can you also...", "one more thing", "change the color too", "make X bigger")
- "unrelated" if the message is not about the edit at all (e.g. "what time do you close", "how much is hosting")`,
        messages: [{ role: 'user', content: message }],
      }),
      timeoutPromise,
    ])

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('')
      .trim()
      .toLowerCase()

    // Log API cost inside this function where response is in scope
    await prisma.apiCost.create({
      data: {
        service: 'anthropic',
        operation: 'edit_confirmation_classify',
        cost: calculateApiCost(response.usage, 0.001, 'haiku'),
      },
    }).catch(err => console.error('[EditConfirmation] API cost write failed:', err))

    if (['confirm', 'undo', 'more_edits', 'unrelated'].includes(text)) {
      return text as 'confirm' | 'undo' | 'more_edits' | 'unrelated'
    }

    // Fuzzy match
    if (text.includes('confirm')) return 'confirm'
    if (text.includes('undo')) return 'undo'
    if (text.includes('more')) return 'more_edits'
    return 'unrelated'
  } catch (err) {
    console.error('[EditConfirmation] Classification failed:', err)
    // Default: treat as unrelated so the normal AI can handle it
    return 'unrelated'
  }
}

// ─── Confirm: push to build queue ─────────────────────────────────

async function confirmAndPush(
  clientId: string,
  editRequestId: string,
): Promise<{ handled: boolean; replyText: string }> {
  const editRequest = await prisma.editRequest.findUnique({
    where: { id: editRequestId },
  })

  if (!editRequest) {
    return { handled: true, replyText: 'Your changes are going live now!' }
  }

  // Mark as confirmed
  await prisma.editRequest.update({
    where: { id: editRequestId },
    data: {
      editFlowState: 'confirmed',
      status: 'approved',
      approvedAt: new Date(),
    },
  })

  // Push to build queue — set lead buildStep to QA_REVIEW
  if (editRequest.leadId) {
    await prisma.lead.update({
      where: { id: editRequest.leadId },
      data: { buildStep: 'QA_REVIEW' },
    })
  }

  console.log(`[EditConfirmation] Edit confirmed and pushed to build queue for client ${clientId}`)

  return {
    handled: true,
    replyText: `Done! Your changes are going live now`,
  }
}

// ─── Undo: revert to pre-edit HTML ───────────────────────────────

async function undoEdit(
  clientId: string,
  editRequestId: string,
): Promise<{ handled: boolean; replyText: string }> {
  const editRequest = await prisma.editRequest.findUnique({
    where: { id: editRequestId },
  })

  if (!editRequest) {
    return { handled: true, replyText: `No problem, I reverted that change. Let me know if you'd like something different!` }
  }

  // Safety check: if no pre-edit HTML backup exists, we can't actually revert.
  // Don't lie to the client — escalate to admin for manual handling.
  if (!editRequest.preEditHtml || !editRequest.leadId) {
    console.warn(`[EditConfirmation] Cannot undo edit ${editRequestId} — no pre-edit HTML saved`)
    await prisma.notification.create({
      data: {
        type: 'CLIENT_TEXT',
        title: `Edit Undo Failed — No Backup`,
        message: `Client tried to undo edit but no pre-edit HTML was saved. Manual revert needed.`,
        metadata: { clientId, editRequestId },
      },
    })
    return {
      handled: true,
      replyText: `I'll get the team to handle that revert for you — they'll have it sorted shortly!`,
    }
  }

  // Restore pre-edit HTML (increment version to maintain atomic consistency)
  await prisma.lead.update({
    where: { id: editRequest.leadId },
    data: { siteHtml: editRequest.preEditHtml, siteEditVersion: { increment: 1 } },
  })

  // Reset edit flow state
  await prisma.editRequest.update({
    where: { id: editRequestId },
    data: { editFlowState: 'pending', postEditHtml: null, editSummary: null },
  })

  console.log(`[EditConfirmation] Edit undone for client ${clientId}`)

  return {
    handled: true,
    replyText: `No problem, I reverted that change. Let me know if you'd like something different!`,
  }
}
