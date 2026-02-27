/**
 * Edit Request Handler
 *
 * Three-tier edit flow:
 * - Simple: AI auto-applies immediately (no admin review, no build queue noise)
 * - Medium: AI applies edit, awaits admin approval before pushing
 * - Complex: Alerts admin to edit manually in site editor (AI still attempts)
 *
 * Both `status` (UI) and `editFlowState` (backend) are kept in sync.
 */

import { prisma } from './db'
import { applyAiEdit } from './ai-site-editor'
import { sendSMSViaProvider } from './sms-provider'
import { notifyAdmin } from './notifications'

/**
 * Sanitize edit instructions before they reach the AI.
 * Strips HTML/script tags, truncates, and flags dangerous patterns.
 */
function sanitizeInstruction(raw: string): { instruction: string; flagged: boolean; reason?: string } {
  // Strip HTML tags that might be injection attempts
  let cleaned = raw.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  cleaned = cleaned.replace(/<[^>]+>/g, '')
  // Strip potential prompt injection markers
  cleaned = cleaned.replace(/```[\s\S]*?```/g, '')
  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim()
  // Truncate to 500 chars — anything longer is likely not a real edit request
  if (cleaned.length > 500) {
    cleaned = cleaned.substring(0, 500)
  }

  // Flag dangerous patterns
  const dangerousPatterns = [
    /delete\s*(everything|all|the\s*site|the\s*whole)/i,
    /remove\s*(everything|all\s*content|the\s*entire)/i,
    /add\s*a?\s*script/i,
    /inject|injection|eval\s*\(/i,
    /javascript:/i,
    /on(click|load|error|mouseover)\s*=/i,
    /iframe|embed|object\s+data/i,
  ]

  for (const pattern of dangerousPatterns) {
    if (pattern.test(cleaned)) {
      return { instruction: cleaned, flagged: true, reason: `Matched pattern: ${pattern.source}` }
    }
  }

  return { instruction: cleaned, flagged: false }
}

export async function handleEditRequest(params: {
  clientId: string
  editRequestId: string
  instruction: string
  complexity: 'simple' | 'medium' | 'complex'
}): Promise<void> {
  const { clientId, editRequestId, complexity } = params

  // ── Sanitize instruction before any processing ──
  const sanitized = sanitizeInstruction(params.instruction)
  const instruction = sanitized.instruction

  if (sanitized.flagged) {
    console.warn(`[EditHandler] Flagged instruction from client ${clientId}: ${sanitized.reason}`)
    // Still process but escalate to complex (admin review) regardless of Haiku classification
    await prisma.notification.create({
      data: {
        type: 'CLIENT_TEXT',
        title: 'Flagged Edit Instruction',
        message: `Edit instruction flagged: "${instruction.substring(0, 120)}". Reason: ${sanitized.reason}`,
        metadata: { clientId, editRequestId, reason: sanitized.reason },
      },
    })
  }

  // Load client with lead (include siteEditVersion for optimistic locking — BUG B.1)
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { lead: { select: { id: true, phone: true, siteHtml: true, companyName: true, firstName: true, siteEditVersion: true } } },
  })
  if (!client || !client.lead) {
    console.error(`[EditHandler] Client ${clientId} not found or has no lead`)
    return
  }

  const lead = client.lead

  // ── Rate limiting: prevent API cost spiral from rapid-fire edits ──
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)

  const [editsLastHour, editsLast10Min] = await Promise.all([
    prisma.editRequest.count({ where: { clientId, createdAt: { gte: oneHourAgo } } }),
    prisma.editRequest.count({ where: { clientId, createdAt: { gte: tenMinutesAgo } } }),
  ])

  // Rapid fire: 3+ edits in 10 minutes → hold, don't process
  if (editsLast10Min >= 3) {
    console.warn(`[EditHandler] Rate limited ${client.companyName}: ${editsLast10Min} edits in 10 min`)
    await prisma.editRequest.update({
      where: { id: editRequestId },
      data: { status: 'pending', editFlowState: 'pending' },
    })
    // Only send the hold message once (on the 3rd edit, not 4th, 5th, etc.)
    if (editsLast10Min === 3) {
      await sendSMSViaProvider({
        to: lead.phone,
        message: `I've got all your requests! Let me work through them and I'll update you when they're done`,
        clientId: client.id,
        trigger: 'edit_rate_limited',
        aiGenerated: true,
        conversationType: 'post_client',
        sender: 'clawdbot',
      })
    }
    await notifyAdmin(
      'edit_request',
      'Edit Rate Limited',
      `${client.companyName}: ${editsLast10Min} edits in 10 min. Held for batching.`,
    )
    return
  }

  // Hourly cap: 5+ edits/hour → hold, notify admin
  if (editsLastHour >= 5) {
    console.warn(`[EditHandler] Hourly cap for ${client.companyName}: ${editsLastHour} edits/hour`)
    await prisma.editRequest.update({
      where: { id: editRequestId },
      data: { status: 'pending', editFlowState: 'pending' },
    })
    await notifyAdmin(
      'edit_request',
      'Edit Hourly Cap',
      `${client.companyName}: ${editsLastHour} edits in 1 hour. Holding to prevent cost spiral.`,
    )
    return
  }

  // ── High-maintenance check (weekly, informational) ──
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const recentEditCount = await prisma.editRequest.count({
    where: {
      clientId,
      createdAt: { gte: sevenDaysAgo },
    },
  })

  if (recentEditCount >= 3) {
    await notifyAdmin(
      'edit_request',
      'High-Maintenance Client',
      `${client.companyName} has sent ${recentEditCount} edit requests in the last 7 days.`,
    )
    await prisma.notification.create({
      data: {
        type: 'CLIENT_TEXT',
        title: 'High-Maintenance Client Alert',
        message: `${client.companyName} has ${recentEditCount} edit requests in 7 days. May need direct outreach.`,
        metadata: { clientId, editCount: recentEditCount },
      },
    })
  }

  // ── Route based on complexity (flagged instructions always go to complex) ──
  const effectiveComplexity = sanitized.flagged ? 'complex' : complexity
  if (effectiveComplexity === 'simple') {
    await handleSimpleEdit(client, lead, editRequestId, instruction)
  } else if (effectiveComplexity === 'medium') {
    await handleMediumEdit(client, lead, editRequestId, instruction)
  } else {
    await handleComplexEdit(client, lead, editRequestId, instruction)
  }
}

/**
 * Shared helper: apply AI edit to the site HTML.
 * Used by simple and medium tiers. Returns the result or null if failed.
 */
async function applyEdit(
  client: { id: string; companyName: string },
  lead: { id: string; phone: string; siteHtml?: string | null; companyName: string; siteEditVersion?: number },
  editRequestId: string,
  instruction: string,
): Promise<{ html: string; summary: string; baseVersion: number } | null> {
  if (!lead.siteHtml) {
    console.error(`[EditHandler] No siteHtml for lead ${lead.id} — cannot auto-edit`)
    await escalateAsFailed(client, lead, editRequestId, 'No site HTML available for auto-editing')
    return null
  }

  // Capture the version we're editing against for optimistic locking (BUG B.1 fix)
  const baseVersion = lead.siteEditVersion ?? 0

  // Mark as AI editing (both status fields synced)
  await prisma.editRequest.update({
    where: { id: editRequestId },
    data: {
      editFlowState: 'ai_editing',
      status: 'ai_processing',
      preEditHtml: lead.siteHtml,
    },
  })

  const result = await applyAiEdit({
    html: lead.siteHtml,
    instruction,
    companyName: lead.companyName,
  })

  if ('error' in result) {
    console.error(`[EditHandler] AI edit failed for ${client.companyName}: ${result.error}`)
    await escalateAsFailed(client, lead, editRequestId, result.error)
    return null
  }

  return { ...result, baseVersion }
}

// ─── Simple Edit: AI auto-applies + auto-pushes ──────────────────

async function handleSimpleEdit(
  client: { id: string; companyName: string; stagingUrl?: string | null },
  lead: { id: string; phone: string; siteHtml?: string | null; companyName: string; firstName: string; siteEditVersion?: number },
  editRequestId: string,
  instruction: string,
): Promise<void> {
  const result = await applyEdit(client, lead, editRequestId, instruction)
  if (!result) return

  // Atomic optimistic lock: only update if version hasn't changed during AI processing
  // Simple edits do NOT change buildStep — /site/[clientId] serves siteHtml directly,
  // so the change is live immediately. No need to add to admin QA queue (prevents
  // queue noise at scale with 50+ clients).
  const updated = await prisma.lead.updateMany({
    where: { id: lead.id, siteEditVersion: result.baseVersion },
    data: { siteHtml: result.html, siteEditVersion: result.baseVersion + 1 },
  })
  if (updated.count === 0) {
    console.warn(`[EditHandler] Version conflict for ${client.companyName}: expected v${result.baseVersion}. Re-queuing.`)
    await escalateAsFailed(client, lead, editRequestId, 'Concurrent edit detected — please retry')
    return
  }

  // Mark as approved + auto-applied (no admin review needed)
  await prisma.editRequest.update({
    where: { id: editRequestId },
    data: {
      editFlowState: 'confirmed',
      status: 'approved',
      postEditHtml: result.html,
      editSummary: result.summary,
      approvedBy: 'ai_auto',
      approvedAt: new Date(),
    },
  })

  // Notify client
  await sendSMSViaProvider({
    to: lead.phone,
    message: `Done! I made that change — it's been applied to your preview!`,
    clientId: client.id,
    trigger: 'edit_simple_auto_applied',
    aiGenerated: true,
    conversationType: 'post_client',
    sender: 'clawdbot',
  })

  // Dashboard notification (info only — no admin action needed)
  await prisma.notification.create({
    data: {
      type: 'CLIENT_TEXT',
      title: `Simple Edit Auto-Applied — ${client.companyName}`,
      message: `AI applied: "${result.summary}". Change is live immediately.`,
      metadata: { clientId: client.id, editRequestId },
    },
  })

  console.log(`[EditHandler] Simple edit auto-applied for ${client.companyName}: ${result.summary}`)
}

// ─── Medium Edit: AI applies, awaits admin approval ──────────────

async function handleMediumEdit(
  client: { id: string; companyName: string; stagingUrl?: string | null },
  lead: { id: string; phone: string; siteHtml?: string | null; companyName: string; firstName: string; siteEditVersion?: number },
  editRequestId: string,
  instruction: string,
): Promise<void> {
  const result = await applyEdit(client, lead, editRequestId, instruction)
  if (!result) return

  // Atomic optimistic lock: only update if version hasn't changed during AI processing
  const updated = await prisma.lead.updateMany({
    where: { id: lead.id, siteEditVersion: result.baseVersion },
    data: { siteHtml: result.html, siteEditVersion: result.baseVersion + 1 },
  })
  if (updated.count === 0) {
    console.warn(`[EditHandler] Version conflict for ${client.companyName}: expected v${result.baseVersion}. Re-queuing.`)
    await escalateAsFailed(client, lead, editRequestId, 'Concurrent edit detected — please retry')
    return
  }

  // Save AI edit but DON'T push — wait for admin approval
  await prisma.editRequest.update({
    where: { id: editRequestId },
    data: {
      editFlowState: 'awaiting_approval',
      status: 'ready_for_review',
      postEditHtml: result.html,
      editSummary: result.summary,
    },
  })

  // Notify admin
  await notifyAdmin(
    'edit_request',
    'Medium Edit Ready for Review',
    `${client.companyName}: AI applied "${result.summary}". Needs approval.`,
  )
  await prisma.notification.create({
    data: {
      type: 'CLIENT_TEXT',
      title: `Edit Ready for Review — ${client.companyName}`,
      message: `AI applied: "${result.summary}". Review and approve to push live.`,
      metadata: { clientId: client.id, editRequestId, editSummary: result.summary },
    },
  })

  // Text client that we're working on it
  await sendSMSViaProvider({
    to: lead.phone,
    message: `Got it! Our team is reviewing that change now and will have it live for you shortly`,
    clientId: client.id,
    trigger: 'edit_medium_awaiting_approval',
    aiGenerated: true,
    conversationType: 'post_client',
    sender: 'clawdbot',
  })

  console.log(`[EditHandler] Medium edit applied, awaiting approval for ${client.companyName}: ${result.summary}`)
}

// ─── Complex Edit: Alert admin, AI still attempts ────────────────

async function handleComplexEdit(
  client: { id: string; companyName: string; stagingUrl?: string | null },
  lead: { id: string; phone: string; siteHtml?: string | null; companyName: string; firstName: string; siteEditVersion?: number },
  editRequestId: string,
  instruction: string,
): Promise<void> {
  // Mark as escalated for admin
  await prisma.editRequest.update({
    where: { id: editRequestId },
    data: {
      editFlowState: 'escalated',
      status: 'ready_for_review',
    },
  })

  // Create approval for admin
  await prisma.approval.create({
    data: {
      gate: 'SITE_EDIT',
      title: `Complex Edit — ${client.companyName}`,
      description: `Client requested: "${instruction}" (complex — manual review recommended)`,
      draftContent: instruction,
      clientId: client.id,
      leadId: lead.id,
      requestedBy: 'system',
      status: 'PENDING',
      priority: 'HIGH',
      metadata: { clientId: client.id, editRequestId, instruction, complexity: 'complex', phone: lead.phone },
    },
  })

  // SMS alert + dashboard notification
  await notifyAdmin(
    'edit_request',
    'Complex Edit — Manual Review',
    `${client.companyName}: "${instruction.substring(0, 80)}"`,
  )
  await prisma.notification.create({
    data: {
      type: 'CLIENT_TEXT',
      title: `Complex Edit — ${client.companyName}`,
      message: `"${instruction.substring(0, 120)}". Open in site editor to handle.`,
      metadata: { clientId: client.id, editRequestId, complexity: 'complex' },
    },
  })

  // AI still attempts the edit in background (admin can use or discard)
  if (lead.siteHtml) {
    try {
      await prisma.editRequest.update({
        where: { id: editRequestId },
        data: { preEditHtml: lead.siteHtml },
      })

      const result = await applyAiEdit({
        html: lead.siteHtml,
        instruction,
        companyName: lead.companyName,
      })

      if (!('error' in result)) {
        await prisma.editRequest.update({
          where: { id: editRequestId },
          data: {
            postEditHtml: result.html,
            editSummary: `[AI attempt] ${result.summary}`,
          },
        })
        console.log(`[EditHandler] Complex edit: AI attempt succeeded for ${client.companyName}: ${result.summary}`)
      }
    } catch (err) {
      console.error(`[EditHandler] Complex edit: AI attempt failed for ${client.companyName}:`, err)
    }
  }

  console.log(`[EditHandler] Complex edit escalated for ${client.companyName}: ${instruction.substring(0, 60)}`)
}

// ─── Fallback: escalate when AI edit fails ────────────────────────

async function escalateAsFailed(
  client: { id: string; companyName: string },
  lead: { id: string; phone: string },
  editRequestId: string,
  errorReason: string,
): Promise<void> {
  await prisma.editRequest.update({
    where: { id: editRequestId },
    data: {
      editFlowState: 'failed',
      status: 'ready_for_review', // Admin needs to handle manually
    },
  })

  // Send fallback message to client
  await sendSMSViaProvider({
    to: lead.phone,
    message: `I'll pass that to the team, they'll get that updated for you shortly!`,
    clientId: client.id,
    trigger: 'edit_auto_failed_fallback',
    aiGenerated: true,
    conversationType: 'post_client',
    sender: 'clawdbot',
  })

  // Create notification for admin
  await prisma.notification.create({
    data: {
      type: 'CLIENT_TEXT',
      title: `AI Edit Failed — ${client.companyName}`,
      message: `Auto-edit failed: ${errorReason.substring(0, 120)}. Manual intervention needed.`,
      metadata: { clientId: client.id, editRequestId, error: errorReason },
    },
  })

  // Also SMS admin
  await notifyAdmin(
    'edit_request',
    'AI Edit Failed',
    `${client.companyName}: auto-edit failed. Manual edit needed.`,
  )
}

// ─── Public helper: push confirmed edit to build queue ────────────

export async function pushEditToBuildQueue(editRequestId: string): Promise<void> {
  const editRequest = await prisma.editRequest.findUnique({
    where: { id: editRequestId },
    include: { client: { include: { lead: true } } },
  })
  if (!editRequest || !editRequest.leadId) return

  // Update site HTML if we have post-edit HTML
  if (editRequest.postEditHtml) {
    await prisma.lead.update({
      where: { id: editRequest.leadId },
      data: { siteHtml: editRequest.postEditHtml, buildStep: 'QA_REVIEW', siteEditVersion: { increment: 1 } },
    })
  } else {
    await prisma.lead.update({
      where: { id: editRequest.leadId },
      data: { buildStep: 'QA_REVIEW' },
    })
  }

  // Mark edit as pushed
  await prisma.editRequest.update({
    where: { id: editRequestId },
    data: {
      editFlowState: 'confirmed',
      status: 'live',
      pushedLiveAt: new Date(),
    },
  })

  // Notify client
  if (editRequest.client?.lead?.phone) {
    await sendSMSViaProvider({
      to: editRequest.client.lead.phone,
      message: `Your changes have been made and applied to your preview!`,
      clientId: editRequest.clientId,
      trigger: 'edit_approved_pushed',
      aiGenerated: true,
      conversationType: 'post_client',
      sender: 'clawdbot',
    })
  }

  // Dashboard notification
  await prisma.notification.create({
    data: {
      type: 'CLIENT_TEXT',
      title: `Edit Pushed Live — ${editRequest.client?.companyName || 'Client'}`,
      message: `Edit "${(editRequest.editSummary || editRequest.requestText).substring(0, 100)}" pushed to build queue.`,
      metadata: { clientId: editRequest.clientId, editRequestId },
    },
  })

  console.log(`[EditHandler] Edit pushed to build queue: ${editRequestId}`)
}
