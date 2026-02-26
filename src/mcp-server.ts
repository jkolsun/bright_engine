/**
 * Bright Engine MCP Server
 *
 * Connects Claude Code (desktop + mobile) to the site database.
 * Replaces Melato for site editing — review AI edits, apply changes,
 * and manage client edit requests from Claude Code.
 *
 * Run: npx tsx src/mcp-server.ts
 */

// Load .env before any imports that read process.env
import 'dotenv/config'

// Redirect console.log → stderr (stdout is reserved for MCP JSON-RPC protocol)
const _origLog = console.log
console.log = (...args: unknown[]) => console.error(...args)

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { prisma } from './lib/db'
import { applyAiEdit } from './lib/ai-site-editor'
import { pushEditToBuildQueue } from './lib/edit-request-handler'

// ─── Server Setup ────────────────────────────────────────────────

const server = new McpServer({
  name: 'bright-engine',
  version: '1.0.0',
})

// ─── Tool 1: search_sites ────────────────────────────────────────

server.tool(
  'search_sites',
  'Find client sites by name, status, or category. Returns lightweight list (no HTML).',
  {
    query: z.string().optional().describe('Search company name (fuzzy match)'),
    filter: z.enum(['build_queue', 'pending_edits', 'live', 'all']).optional().default('all')
      .describe('build_queue=sites in QA/editing pipeline, pending_edits=have unresolved edit requests, live=launched sites'),
    limit: z.number().optional().default(20).describe('Max results'),
  },
  async ({ query, filter, limit }) => {
    try {
      const where: any = {}

      if (filter === 'build_queue') {
        where.buildStep = { in: ['QA_REVIEW', 'EDITING', 'QA_APPROVED', 'CLIENT_REVIEW', 'LAUNCHING'] }
      } else if (filter === 'live') {
        where.buildStep = 'LIVE'
      } else if (filter === 'pending_edits') {
        where.editRequests = { some: { status: { in: ['new', 'ai_processing', 'ready_for_review'] } } }
      }

      if (query) {
        where.companyName = { contains: query, mode: 'insensitive' }
      }

      const leads = await prisma.lead.findMany({
        where,
        select: {
          id: true, companyName: true, buildStep: true,
          industry: true, city: true, state: true,
          siteEditVersion: true, previewUrl: true, updatedAt: true,
          client: { select: { id: true, siteUrl: true, customDomain: true, hostingStatus: true } },
          _count: { select: { editRequests: { where: { status: { in: ['new', 'ai_processing', 'ready_for_review'] } } } } },
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
      })

      const results = leads.map(l => ({
        leadId: l.id,
        companyName: l.companyName,
        buildStep: l.buildStep,
        industry: l.industry,
        location: [l.city, l.state].filter(Boolean).join(', '),
        siteEditVersion: l.siteEditVersion,
        previewUrl: l.previewUrl,
        siteUrl: l.client?.siteUrl || null,
        customDomain: l.client?.customDomain || null,
        hostingStatus: l.client?.hostingStatus || null,
        pendingEdits: l._count.editRequests,
        lastUpdated: l.updatedAt?.toISOString(),
      }))

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }],
      }
    } catch (err) {
      return { content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true }
    }
  },
)

// ─── Tool 2: get_site ────────────────────────────────────────────

server.tool(
  'get_site',
  'Get full context and HTML for a site. Returns enrichment data, personalization, edit history, and optionally the full HTML.',
  {
    leadId: z.string().describe('Lead ID for the site'),
    includeHtml: z.boolean().optional().default(true).describe('Include full HTML (can be 50-100KB)'),
  },
  async ({ leadId, includeHtml }) => {
    try {
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        select: {
          id: true, companyName: true, firstName: true, lastName: true,
          phone: true, email: true, city: true, state: true,
          industry: true, buildStep: true, siteEditVersion: true,
          previewUrl: true, previewId: true,
          ...(includeHtml ? { siteHtml: true } : {}),
          personalization: true, colorPrefs: true,
          enrichedServices: true, enrichedRating: true,
          enrichedReviews: true, enrichedPhotos: true, enrichedAddress: true,
          qualificationData: true, buildReadinessScore: true, buildNotes: true,
          client: {
            select: {
              id: true, companyName: true, siteUrl: true, customDomain: true,
              stagingUrl: true, hostingStatus: true, plan: true,
              monthlyRevenue: true, onboardingStep: true, siteLiveDate: true, notes: true,
            },
          },
          editRequests: {
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
              id: true, requestText: true, aiInterpretation: true,
              complexityTier: true, editFlowState: true, status: true,
              editSummary: true, createdAt: true,
            },
          },
        },
      })

      if (!lead) {
        return { content: [{ type: 'text' as const, text: `Error: Lead ${leadId} not found` }], isError: true }
      }

      // Parse personalization for cleaner display
      let websiteCopy = null
      try {
        const p = typeof lead.personalization === 'string' ? JSON.parse(lead.personalization) : lead.personalization
        if (p?.websiteCopy) websiteCopy = p.websiteCopy
      } catch { /* ignore parse errors */ }

      const result: any = {
        leadId: lead.id,
        companyName: lead.companyName,
        contact: { firstName: lead.firstName, lastName: lead.lastName, phone: lead.phone, email: lead.email },
        location: { city: lead.city, state: lead.state, address: lead.enrichedAddress },
        industry: lead.industry,
        buildStep: lead.buildStep,
        siteEditVersion: lead.siteEditVersion,
        previewUrl: lead.previewUrl,
        buildReadinessScore: lead.buildReadinessScore,
        buildNotes: lead.buildNotes,
        enrichment: {
          rating: lead.enrichedRating,
          reviews: lead.enrichedReviews,
          services: lead.enrichedServices,
          photos: lead.enrichedPhotos,
        },
        colorPrefs: lead.colorPrefs,
        qualificationData: lead.qualificationData,
        websiteCopy,
        client: lead.client,
        recentEditRequests: lead.editRequests,
      }

      if (includeHtml) {
        result.siteHtml = (lead as any).siteHtml || null
        result.htmlSize = result.siteHtml ? `${(result.siteHtml.length / 1024).toFixed(1)}KB` : '0KB'
      }

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      }
    } catch (err) {
      return { content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true }
    }
  },
)

// ─── Tool 3: update_site ─────────────────────────────────────────

server.tool(
  'update_site',
  'Push edited HTML back to the database with optimistic locking. Requires the siteEditVersion you read from get_site.',
  {
    leadId: z.string().describe('Lead ID for the site'),
    html: z.string().describe('Complete updated HTML to save'),
    expectedVersion: z.number().describe('The siteEditVersion from get_site (for optimistic locking)'),
  },
  async ({ leadId, html, expectedVersion }) => {
    try {
      if (!html || html.length < 10) {
        return { content: [{ type: 'text' as const, text: 'Error: HTML is empty or too short' }], isError: true }
      }
      if (html.length > 2 * 1024 * 1024) {
        return { content: [{ type: 'text' as const, text: 'Error: HTML exceeds 2MB limit' }], isError: true }
      }

      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        select: { id: true, siteEditVersion: true, buildStep: true },
      })

      if (!lead) {
        return { content: [{ type: 'text' as const, text: `Error: Lead ${leadId} not found` }], isError: true }
      }

      // Optimistic lock check
      if (lead.siteEditVersion !== expectedVersion) {
        return {
          content: [{
            type: 'text' as const,
            text: `Version conflict: you read version ${expectedVersion} but current is ${lead.siteEditVersion}. Re-read the site with get_site and try again.`,
          }],
          isError: true,
        }
      }

      // Auto-advance buildStep (matches existing /api/site-editor/[id]/save pattern)
      let nextBuildStep = lead.buildStep
      if (lead.buildStep === 'QA_REVIEW') nextBuildStep = 'EDITING'
      else if (lead.buildStep === 'BUILDING' && html.length > 500) nextBuildStep = 'QA_REVIEW'

      const newVersion = expectedVersion + 1
      await prisma.lead.update({
        where: { id: leadId },
        data: { siteHtml: html, siteEditVersion: newVersion, buildStep: nextBuildStep },
      })

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            newVersion,
            savedAt: new Date().toISOString(),
            htmlSize: `${(html.length / 1024).toFixed(1)}KB`,
            buildStep: nextBuildStep,
          }, null, 2),
        }],
      }
    } catch (err) {
      return { content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true }
    }
  },
)

// ─── Tool 4: ai_edit ─────────────────────────────────────────────

server.tool(
  'ai_edit',
  'Apply an AI edit instruction to a site using Claude Opus. Returns modified HTML and summary. Use autoSave=true to save directly, or false to review first.',
  {
    leadId: z.string().describe('Lead ID for the site'),
    instruction: z.string().describe("Plain-English edit instruction (e.g. 'Make the header blue and add a star rating badge')"),
    autoSave: z.boolean().optional().default(false).describe('If true, save result to DB. If false, return HTML for review.'),
  },
  async ({ leadId, instruction, autoSave }) => {
    try {
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        select: { id: true, companyName: true, siteHtml: true, siteEditVersion: true, buildStep: true },
      })

      if (!lead) {
        return { content: [{ type: 'text' as const, text: `Error: Lead ${leadId} not found` }], isError: true }
      }
      if (!lead.siteHtml) {
        return { content: [{ type: 'text' as const, text: 'Error: No site HTML exists for this lead. Generate a snapshot first.' }], isError: true }
      }

      const result = await applyAiEdit({
        html: lead.siteHtml,
        instruction,
        companyName: lead.companyName || 'Client',
      })

      if ('error' in result) {
        return { content: [{ type: 'text' as const, text: `AI edit failed: ${result.error}` }], isError: true }
      }

      if (autoSave) {
        // Re-check version for optimistic lock
        const currentLead = await prisma.lead.findUnique({
          where: { id: leadId },
          select: { siteEditVersion: true },
        })
        if (currentLead && currentLead.siteEditVersion !== lead.siteEditVersion) {
          return {
            content: [{
              type: 'text' as const,
              text: `Version conflict during save. Someone else edited the site. Use get_site to reload and try again.\n\nAI edit summary: ${result.summary}`,
            }],
            isError: true,
          }
        }

        let nextBuildStep = lead.buildStep
        if (lead.buildStep === 'QA_REVIEW') nextBuildStep = 'EDITING'

        const newVersion = (lead.siteEditVersion ?? 0) + 1
        await prisma.lead.update({
          where: { id: leadId },
          data: { siteHtml: result.html, siteEditVersion: newVersion, buildStep: nextBuildStep },
        })

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              summary: result.summary,
              saved: true,
              newVersion,
              htmlSize: `${(result.html.length / 1024).toFixed(1)}KB`,
            }, null, 2),
          }],
        }
      }

      // Return HTML for review (not saved yet)
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            summary: result.summary,
            saved: false,
            currentVersion: lead.siteEditVersion,
            htmlSize: `${(result.html.length / 1024).toFixed(1)}KB`,
            html: result.html,
          }, null, 2),
        }],
      }
    } catch (err) {
      return { content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true }
    }
  },
)

// ─── Tool 5: list_edits ──────────────────────────────────────────

server.tool(
  'list_edits',
  'List pending edit requests across all clients. Shows what clients have asked for and what AI has done.',
  {
    status: z.enum(['pending', 'ready_for_review', 'all']).optional().default('all')
      .describe('Filter: pending=new requests, ready_for_review=AI applied awaiting approval, all=everything'),
    limit: z.number().optional().default(50).describe('Max results'),
  },
  async ({ status, limit }) => {
    try {
      const where: any = {}
      if (status === 'pending') {
        where.status = 'new'
        where.editFlowState = 'pending'
      } else if (status === 'ready_for_review') {
        where.status = 'ready_for_review'
      }

      const edits = await prisma.editRequest.findMany({
        where,
        include: {
          client: { select: { id: true, companyName: true, leadId: true } },
          lead: { select: { id: true, previewId: true, buildStep: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      })

      const results = edits.map(e => ({
        id: e.id,
        clientId: e.clientId,
        clientName: e.client?.companyName || 'Unknown',
        leadId: e.leadId || e.client?.leadId,
        requestText: e.requestText,
        aiInterpretation: e.aiInterpretation,
        complexityTier: e.complexityTier,
        editFlowState: e.editFlowState,
        status: e.status,
        editSummary: e.editSummary,
        hasPreEditHtml: !!e.preEditHtml,
        hasPostEditHtml: !!e.postEditHtml,
        createdAt: e.createdAt?.toISOString(),
        approvedAt: e.approvedAt?.toISOString() || null,
        pushedLiveAt: e.pushedLiveAt?.toISOString() || null,
      }))

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ total: results.length, edits: results }, null, 2),
        }],
      }
    } catch (err) {
      return { content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true }
    }
  },
)

// ─── Tool 6: review_edit ─────────────────────────────────────────

server.tool(
  'review_edit',
  'Get full details of a specific edit request, including before/after HTML for review.',
  {
    editRequestId: z.string().describe('Edit request ID'),
    includeHtml: z.boolean().optional().default(true).describe('Include pre/post edit HTML'),
  },
  async ({ editRequestId, includeHtml }) => {
    try {
      const edit = await prisma.editRequest.findUnique({
        where: { id: editRequestId },
        include: {
          client: { select: { id: true, companyName: true, siteUrl: true, stagingUrl: true, leadId: true } },
          lead: { select: { id: true, previewId: true, buildStep: true, companyName: true, siteEditVersion: true } },
        },
      })

      if (!edit) {
        return { content: [{ type: 'text' as const, text: `Error: Edit request ${editRequestId} not found` }], isError: true }
      }

      const result: any = {
        id: edit.id,
        clientName: edit.client?.companyName || 'Unknown',
        clientId: edit.clientId,
        leadId: edit.leadId,
        requestText: edit.requestText,
        requestChannel: edit.requestChannel,
        aiInterpretation: edit.aiInterpretation,
        complexityTier: edit.complexityTier,
        editFlowState: edit.editFlowState,
        status: edit.status,
        editSummary: edit.editSummary,
        approvedBy: edit.approvedBy,
        approvedAt: edit.approvedAt?.toISOString() || null,
        pushedLiveAt: edit.pushedLiveAt?.toISOString() || null,
        createdAt: edit.createdAt?.toISOString(),
        previewUrl: edit.lead?.previewId ? `/preview/${edit.lead.previewId}` : null,
        siteUrl: edit.client?.siteUrl || null,
      }

      if (includeHtml) {
        result.preEditHtml = edit.preEditHtml || null
        result.postEditHtml = edit.postEditHtml || null
        result.preEditSize = edit.preEditHtml ? `${(edit.preEditHtml.length / 1024).toFixed(1)}KB` : '0KB'
        result.postEditSize = edit.postEditHtml ? `${(edit.postEditHtml.length / 1024).toFixed(1)}KB` : '0KB'
      }

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      }
    } catch (err) {
      return { content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true }
    }
  },
)

// ─── Tool 7: approve_edit ────────────────────────────────────────

server.tool(
  'approve_edit',
  'Approve a pending AI edit and push it to the build queue. Sends SMS to client confirming the change.',
  {
    editRequestId: z.string().describe('Edit request ID to approve'),
  },
  async ({ editRequestId }) => {
    try {
      const edit = await prisma.editRequest.findUnique({
        where: { id: editRequestId },
        select: { id: true, status: true, editFlowState: true, editSummary: true, clientId: true },
      })

      if (!edit) {
        return { content: [{ type: 'text' as const, text: `Error: Edit request ${editRequestId} not found` }], isError: true }
      }

      if (edit.status === 'approved' || edit.status === 'live' || edit.editFlowState === 'confirmed') {
        return { content: [{ type: 'text' as const, text: `Already approved/confirmed. Current status: ${edit.status}, flow: ${edit.editFlowState}` }] }
      }

      // Update edit request status
      await prisma.editRequest.update({
        where: { id: editRequestId },
        data: {
          status: 'approved',
          editFlowState: 'confirmed',
          approvedBy: 'mcp_admin',
          approvedAt: new Date(),
        },
      })

      // Push to build queue (handles siteHtml update, buildStep, SMS, notification)
      await pushEditToBuildQueue(editRequestId)

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            message: `Edit approved and pushed to build queue. Client notified via SMS.`,
            editSummary: edit.editSummary,
          }, null, 2),
        }],
      }
    } catch (err) {
      return { content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true }
    }
  },
)

// ─── Tool 8: reject_edit ─────────────────────────────────────────

server.tool(
  'reject_edit',
  'Reject an AI edit and revert the site HTML to its pre-edit state.',
  {
    editRequestId: z.string().describe('Edit request ID to reject'),
    reason: z.string().optional().describe('Reason for rejection (for audit trail)'),
  },
  async ({ editRequestId, reason }) => {
    try {
      const edit = await prisma.editRequest.findUnique({
        where: { id: editRequestId },
        select: { id: true, status: true, preEditHtml: true, leadId: true, editSummary: true },
      })

      if (!edit) {
        return { content: [{ type: 'text' as const, text: `Error: Edit request ${editRequestId} not found` }], isError: true }
      }

      if (edit.status === 'rejected') {
        return { content: [{ type: 'text' as const, text: 'Already rejected.' }] }
      }

      // Revert HTML if we have pre-edit backup
      let reverted = false
      if (edit.preEditHtml && edit.leadId) {
        await prisma.lead.update({
          where: { id: edit.leadId },
          data: { siteHtml: edit.preEditHtml },
        })
        reverted = true
      }

      // Update edit request
      await prisma.editRequest.update({
        where: { id: editRequestId },
        data: {
          status: 'rejected',
          editFlowState: 'failed',
          editSummary: reason ? `Rejected: ${reason}` : edit.editSummary,
        },
      })

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            reverted,
            message: reverted
              ? 'Edit rejected and site reverted to pre-edit state.'
              : 'Edit rejected (no pre-edit HTML was available to revert).',
            reason: reason || null,
          }, null, 2),
        }],
      }
    } catch (err) {
      return { content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true }
    }
  },
)

// ─── Connect ─────────────────────────────────────────────────────

const transport = new StdioServerTransport()
await server.connect(transport)
console.log('[MCP] Bright Engine MCP server connected')
