/**
 * Edit Request Handler
 *
 * Orchestrates the flow when a post-payment client requests a site edit via SMS.
 * - Simple edits (font, color, text): AI auto-applies, asks client for confirmation
 * - Complex edits (layout, new pages): Escalates to admin via approval + SMS
 * - High-maintenance detection: Alerts admin if 3+ requests in 7 days
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
  } else {
    await handleComplexEdit(client, lead, editRequestId, instruction, complexity)
  }
}

// ─── Simple Edit: AI auto-applies ─────────────────────────────────

async function handleSimpleEdit(
  client: { id: string; companyName: string; stagingUrl?: string | null },
  lead: { id: string; phone: string; siteHtml?: string | null; companyName: string; firstName: string },
  editRequestId: string,
  instruction: string,
): Promise<void> {
  if (!lead.siteHtml) {
    console.error(`[EditHandler] No siteHtml for lead ${lead.id} — cannot auto-edit`)
    await escalateAsFailed(client, lead, editRequestId, 'No site HTML available for auto-editing')
    return
  }

  // Mark as AI editing
  await prisma.editRequest.update({
    where: { id: editRequestId },
    data: {
      editFlowState: 'ai_editing',
      preEditHtml: lead.siteHtml,
    },
  })

  // Apply AI edit
  const result = await applyAiEdit({
    html: lead.siteHtml,
    instruction,
    companyName: lead.companyName,
  })

  if ('error' in result) {
    console.error(`[EditHandler] AI edit failed for ${client.companyName}: ${result.error}`)
    await escalateAsFailed(client, lead, editRequestId, result.error)
    return
  }

  // Save the edited HTML
  await prisma.editRequest.update({
    where: { id: editRequestId },
    data: {
      editFlowState: 'awaiting_confirmation',
      postEditHtml: result.html,
      editSummary: result.summary,
    },
  })

  // Update the lead's siteHtml so the staging preview reflects the change
  await prisma.lead.update({
    where: { id: lead.id },
    data: { siteHtml: result.html },
  })

  // Text the client asking for confirmation
  const stagingUrl = client.stagingUrl || `https://preview.brightautomations.org/preview/${lead.id}`
  await sendSMSViaProvider({
    to: lead.phone,
    message: `I made that change for you! Check it out here ${stagingUrl} and let me know if you want anything else tweaked before I push it live`,
    clientId: client.id,
    trigger: 'edit_auto_applied',
    aiGenerated: true,
    conversationType: 'post_client',
    sender: 'clawdbot',
  })

  console.log(`[EditHandler] Simple edit applied for ${client.companyName}: ${result.summary}`)
}

// ─── Complex Edit: Escalate to admin ──────────────────────────────

async function handleComplexEdit(
  client: { id: string; companyName: string },
  lead: { id: string; phone: string; firstName: string },
  editRequestId: string,
  instruction: string,
  complexity: string,
): Promise<void> {
  // Update flow state
  await prisma.editRequest.update({
    where: { id: editRequestId },
    data: { editFlowState: 'escalated' },
  })

  // Create approval for admin
  await prisma.approval.create({
    data: {
      gate: 'SITE_EDIT',
      title: `Site Edit — ${client.companyName}`,
      description: `Client requested: "${instruction}" (${complexity} complexity)`,
      draftContent: instruction,
      clientId: client.id,
      leadId: lead.id,
      requestedBy: 'system',
      status: 'PENDING',
      priority: complexity === 'complex' ? 'HIGH' : 'MEDIUM',
      metadata: { clientId: client.id, editRequestId, instruction, complexity, phone: lead.phone },
    },
  })

  // SMS alert to admin
  await notifyAdmin(
    'edit_request',
    `${complexity === 'complex' ? 'Complex' : 'Medium'} Edit Request`,
    `${client.companyName}: "${instruction.substring(0, 80)}"`,
  )

  // Notify in admin dashboard
  await prisma.notification.create({
    data: {
      type: 'CLIENT_TEXT',
      title: `Edit Request — ${client.companyName}`,
      message: `${complexity} edit: "${instruction.substring(0, 120)}"`,
      metadata: { clientId: client.id, editRequestId, complexity },
    },
  })

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
    data: { editFlowState: 'failed' },
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
