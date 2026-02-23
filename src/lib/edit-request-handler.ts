/**
 * Edit Request Handler
 *
 * Three-tier edit flow:
 * - Simple: AI auto-applies + auto-pushes to build queue (no admin review)
 * - Medium: AI applies edit, awaits admin approval before pushing
 * - Complex: Alerts admin to edit manually in site editor (AI still attempts)
 *
 * Both `status` (UI) and `editFlowState` (backend) are kept in sync.
 */

import { prisma } from './db'
import { applyAiEdit } from './ai-site-editor'
import { sendSMSViaProvider } from './sms-provider'
import { notifyAdmin } from './notifications'

export async function handleEditRequest(params: {
  clientId: string
  editRequestId: string
  instruction: string
  complexity: 'simple' | 'medium' | 'complex'
}): Promise<void> {
  const { clientId, editRequestId, instruction, complexity } = params

  // Load client with lead
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { lead: true },
  })
  if (!client || !client.lead) {
    console.error(`[EditHandler] Client ${clientId} not found or has no lead`)
    return
  }

  const lead = client.lead

  // ── High-maintenance check (runs for ALL edits) ──
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

  // ── Route based on complexity ──
  if (complexity === 'simple') {
    await handleSimpleEdit(client, lead, editRequestId, instruction)
  } else if (complexity === 'medium') {
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
  lead: { id: string; phone: string; siteHtml?: string | null; companyName: string },
  editRequestId: string,
  instruction: string,
): Promise<{ html: string; summary: string } | null> {
  if (!lead.siteHtml) {
    console.error(`[EditHandler] No siteHtml for lead ${lead.id} — cannot auto-edit`)
    await escalateAsFailed(client, lead, editRequestId, 'No site HTML available for auto-editing')
    return null
  }

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

  return result
}

// ─── Simple Edit: AI auto-applies + auto-pushes ──────────────────

async function handleSimpleEdit(
  client: { id: string; companyName: string; stagingUrl?: string | null },
  lead: { id: string; phone: string; siteHtml?: string | null; companyName: string; firstName: string },
  editRequestId: string,
  instruction: string,
): Promise<void> {
  const result = await applyEdit(client, lead, editRequestId, instruction)
  if (!result) return

  // Auto-push: update site HTML + mark as approved + push to build queue
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

  // Update lead's siteHtml
  await prisma.lead.update({
    where: { id: lead.id },
    data: { siteHtml: result.html, buildStep: 'QA_REVIEW' },
  })

  // Notify client
  await sendSMSViaProvider({
    to: lead.phone,
    message: `Done! I made that change — it's been applied to your preview!`,
    clientId: client.id,
    trigger: 'edit_simple_auto_pushed',
    aiGenerated: true,
    conversationType: 'post_client',
    sender: 'clawdbot',
  })

  // Dashboard notification
  await prisma.notification.create({
    data: {
      type: 'CLIENT_TEXT',
      title: `Simple Edit Auto-Applied — ${client.companyName}`,
      message: `AI applied: "${result.summary}". Auto-pushed to build queue.`,
      metadata: { clientId: client.id, editRequestId },
    },
  })

  console.log(`[EditHandler] Simple edit auto-pushed for ${client.companyName}: ${result.summary}`)
}

// ─── Medium Edit: AI applies, awaits admin approval ──────────────

async function handleMediumEdit(
  client: { id: string; companyName: string; stagingUrl?: string | null },
  lead: { id: string; phone: string; siteHtml?: string | null; companyName: string; firstName: string },
  editRequestId: string,
  instruction: string,
): Promise<void> {
  const result = await applyEdit(client, lead, editRequestId, instruction)
  if (!result) return

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

  // Update lead's siteHtml so staging preview shows the change
  await prisma.lead.update({
    where: { id: lead.id },
    data: { siteHtml: result.html },
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
  lead: { id: string; phone: string; siteHtml?: string | null; companyName: string; firstName: string },
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
      data: { siteHtml: editRequest.postEditHtml, buildStep: 'QA_REVIEW' },
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
