import { prisma } from '@/lib/db'

/**
 * Build a full context object for the AI (Close Engine) to use when
 * following up on a lead. Called after AI_HANDOFF or when an inbound
 * message arrives on a lead with aiFollowup: true.
 */
export async function getLeadContextForAI(leadId: string) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: {
      firstName: true,
      lastName: true,
      companyName: true,
      industry: true,
      phone: true,
      email: true,
      previewUrl: true,
      handoffContext: true,
      events: {
        orderBy: { createdAt: 'desc' },
        take: 100,
      },
    },
  })

  if (!lead) return null

  const events = lead.events || []

  // Parse metadata helper
  const parseMeta = (e: any): any => {
    if (!e.metadata) return {}
    if (typeof e.metadata === 'string') {
      try { return JSON.parse(e.metadata) } catch { return {} }
    }
    return e.metadata
  }

  // Recent call summaries
  const recentCallSummaries = events
    .filter(e => e.eventType === 'CALL_SUMMARY')
    .slice(0, 3)
    .map(e => parseMeta(e).summary || '')
    .filter(Boolean)

  // Structured tags as readable strings
  const structuredTags: string[] = []
  for (const e of events) {
    const meta = parseMeta(e)
    if (e.eventType === 'UPSELL_PITCHED') structuredTags.push(`Upsell pitched: ${meta.productName || 'Unknown'}`)
    if (e.eventType === 'WANTS_CHANGES') structuredTags.push(`Wants changes: ${meta.changesRequested || meta.text || ''}`)
    if (e.eventType === 'CALLBACK_SCHEDULED') structuredTags.push(`Callback: ${meta.callbackDate || ''} ${meta.callbackTime || ''}`)
    if (e.eventType === 'PAYMENT_LINK_SENT_REP') structuredTags.push('Payment link sent')
    if (e.eventType === 'AI_HANDOFF') structuredTags.push('AI handoff')
    if (e.eventType === 'CUSTOM_REQUEST') structuredTags.push(`Custom request: ${meta.requestText || meta.text || ''}`)
  }

  // Rep notes
  const repNotes = events
    .filter(e => e.eventType === 'REP_NOTE')
    .reverse() // chronological order
    .map(e => parseMeta(e).text || '')
    .filter(Boolean)

  // Most recent WANTS_CHANGES
  const wantsChangesEvent = events.find(e => e.eventType === 'WANTS_CHANGES')
  const wantsChanges = wantsChangesEvent ? (parseMeta(wantsChangesEvent).changesRequested || parseMeta(wantsChangesEvent).text || null) : null

  // Custom requests
  const customRequests = events
    .filter(e => e.eventType === 'CUSTOM_REQUEST')
    .map(e => parseMeta(e).requestText || parseMeta(e).text || '')
    .filter(Boolean)

  // Preview status
  const previewSent = events.some(e => e.eventType === 'PREVIEW_SENT_SMS' || e.eventType === 'PREVIEW_SENT_EMAIL')
  const previewOpened = events.find(e => e.eventType === 'PREVIEW_VIEWED')
  const previewMeta = previewOpened ? parseMeta(previewOpened) : {}

  // Handoff context
  const handoffContext = lead.handoffContext
    ? (typeof lead.handoffContext === 'string' ? (() => { try { return JSON.parse(lead.handoffContext as string) } catch { return null } })() : lead.handoffContext)
    : null

  return {
    leadInfo: {
      firstName: lead.firstName || '',
      lastName: lead.lastName || '',
      companyName: lead.companyName || '',
      industry: lead.industry || '',
      phone: lead.phone || '',
      email: lead.email || '',
      previewUrl: lead.previewUrl || '',
    },
    handoffContext,
    recentCallSummaries,
    structuredTags,
    repNotes,
    wantsChanges,
    customRequests,
    previewStatus: {
      sent: previewSent,
      opened: !!previewOpened,
      viewDuration: previewMeta.duration || previewMeta.viewDurationSeconds || 0,
      ctaClicked: !!previewMeta.ctaClicked,
    },
  }
}
