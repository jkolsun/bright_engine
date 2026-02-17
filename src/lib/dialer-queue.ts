import { prisma } from './db'

// ============================================
// SMART LEAD PRIORITY QUEUE
// Serves leads in optimal order for power dialing
// ============================================

export interface QueuedLead {
  id: string
  firstName: string
  lastName: string | null
  email: string | null
  phone: string
  companyName: string
  industry: string
  city: string | null
  state: string | null
  website: string | null
  status: string
  priority: string
  previewUrl: string | null
  previewId: string | null
  callScript: string | null
  enrichedRating: number | null
  enrichedReviews: number | null
  enrichedServices: any
  enrichedAddress: string | null
  personalization: string | null
  notes: string | null
  // Queue metadata
  queuePriority: number
  queueCategory: string
  queueReason: string
  engagementScore: number
  lastCallAt: Date | null
  callAttempts: number
  callbackDate: Date | null
}

export interface QueueSummary {
  overdueCallbacks: number
  hotLeads: number
  warmLeads: number
  scheduledCallbacks: number
  freshLeads: number
  retries: number
  reEngage: number
  total: number
}

/**
 * Build prioritized lead queue for a rep
 * Priority order per spec:
 * 1. Overdue callbacks
 * 2. Hot leads (preview engaged last 2 hours)
 * 3. Warm leads (email opened, preview clicked >2 hrs ago)
 * 4. Scheduled callbacks (due today, not overdue)
 * 5. Fresh leads (never contacted by phone)
 * 6. Retries (previous no-answer)
 * 7. Re-engage (warm revisit leads hitting their date)
 */
export async function buildRepQueue(repId: string): Promise<{ leads: QueuedLead[], summary: QueueSummary }> {
  const now = new Date()
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(now)
  todayEnd.setHours(23, 59, 59, 999)

  // Get all assigned leads that are dialable (not closed/paid/dnc)
  const assignedLeads = await prisma.lead.findMany({
    where: {
      assignedToId: repId,
      status: { in: ['NEW', 'HOT_LEAD', 'QUALIFIED', 'INFO_COLLECTED'] },
    },
    include: {
      events: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
      activities: {
        where: { activityType: 'CALL' },
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
      calls: {
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
      outboundEvents: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  })

  // Get DNC list to filter out
  const dncPhones = await prisma.doNotCall.findMany({
    select: { phone: true },
  })
  const dncSet = new Set(dncPhones.map(d => d.phone))

  // Categorize and score each lead
  const categorized: QueuedLead[] = []

  for (const lead of assignedLeads) {
    if (dncSet.has(lead.phone)) continue

    const lastCall = lead.calls[0] || lead.activities[0]
    const lastCallAt = lastCall?.createdAt || null
    const callAttempts = lead.calls.length + lead.activities.filter(a => a.activityType === 'CALL').length

    // Check for callbacks
    const callbackCall = lead.calls.find(c => c.outcome === 'callback' && c.callbackDate)
    const callbackActivity = lead.activities.find(a => a.callDisposition === 'CALLBACK' && a.callbackDate)
    const callbackDate = callbackCall?.callbackDate || callbackActivity?.callbackDate || null

    // Calculate engagement score
    const engagementScore = calculateQuickEngagement(lead.events, lead.outboundEvents)

    // Categorize
    const { priority, category, reason } = categorizeLead(
      lead,
      callbackDate,
      lastCallAt,
      callAttempts,
      engagementScore,
      now,
      twoHoursAgo,
      todayStart,
      todayEnd
    )

    categorized.push({
      id: lead.id,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      companyName: lead.companyName,
      industry: lead.industry,
      city: lead.city,
      state: lead.state,
      website: lead.website,
      status: lead.status,
      priority: lead.priority,
      previewUrl: lead.previewUrl,
      previewId: lead.previewId,
      callScript: lead.callScript,
      enrichedRating: lead.enrichedRating,
      enrichedReviews: lead.enrichedReviews,
      enrichedServices: lead.enrichedServices,
      enrichedAddress: lead.enrichedAddress,
      personalization: lead.personalization,
      notes: lead.notes,
      queuePriority: priority,
      queueCategory: category,
      queueReason: reason,
      engagementScore,
      lastCallAt,
      callAttempts,
      callbackDate,
    })
  }

  // Sort by priority (lower = higher priority), then by engagement score within same priority
  categorized.sort((a, b) => {
    if (a.queuePriority !== b.queuePriority) return a.queuePriority - b.queuePriority
    return b.engagementScore - a.engagementScore
  })

  // Build summary
  const summary: QueueSummary = {
    overdueCallbacks: categorized.filter(l => l.queueCategory === 'overdue_callback').length,
    hotLeads: categorized.filter(l => l.queueCategory === 'hot').length,
    warmLeads: categorized.filter(l => l.queueCategory === 'warm').length,
    scheduledCallbacks: categorized.filter(l => l.queueCategory === 'scheduled_callback').length,
    freshLeads: categorized.filter(l => l.queueCategory === 'fresh').length,
    retries: categorized.filter(l => l.queueCategory === 'retry').length,
    reEngage: categorized.filter(l => l.queueCategory === 're_engage').length,
    total: categorized.length,
  }

  return { leads: categorized, summary }
}

function categorizeLead(
  lead: any,
  callbackDate: Date | null,
  lastCallAt: Date | null,
  callAttempts: number,
  engagementScore: number,
  now: Date,
  twoHoursAgo: Date,
  todayStart: Date,
  todayEnd: Date,
): { priority: number, category: string, reason: string } {

  // Priority 1: Overdue callbacks
  if (callbackDate && callbackDate < now) {
    return {
      priority: 1,
      category: 'overdue_callback',
      reason: `Callback overdue since ${callbackDate.toLocaleDateString()}`,
    }
  }

  // Priority 2: Hot leads (preview engaged in last 2 hours)
  const recentPreviewEvents = lead.events?.filter((e: any) =>
    ['PREVIEW_VIEWED', 'PREVIEW_CTA_CLICKED', 'PREVIEW_CALL_CLICKED'].includes(e.eventType) &&
    new Date(e.createdAt) > twoHoursAgo
  )
  if (recentPreviewEvents?.length > 0 || (engagementScore >= 16 && lead.status === 'HOT_LEAD')) {
    return {
      priority: 2,
      category: 'hot',
      reason: recentPreviewEvents?.length > 0
        ? 'Preview engaged in last 2 hours'
        : `Hot lead — engagement score ${engagementScore}`,
    }
  }

  // Priority 3: Warm leads (email opened, preview clicked >2 hrs ago)
  const warmEvents = lead.events?.filter((e: any) =>
    ['EMAIL_OPENED', 'PREVIEW_VIEWED', 'PREVIEW_CTA_CLICKED'].includes(e.eventType)
  )
  const emailOpens = lead.outboundEvents?.filter((e: any) =>
    e.status === 'OPENED' || e.openedAt
  )
  if ((warmEvents?.length > 0 || emailOpens?.length > 0) && engagementScore >= 6) {
    return {
      priority: 3,
      category: 'warm',
      reason: `Warm — ${warmEvents?.length || 0} engagement events`,
    }
  }

  // Priority 4: Scheduled callbacks (due today, not overdue)
  if (callbackDate && callbackDate >= now && callbackDate <= todayEnd) {
    return {
      priority: 4,
      category: 'scheduled_callback',
      reason: `Callback at ${callbackDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    }
  }

  // Priority 5: Fresh leads (never contacted)
  if (callAttempts === 0) {
    return {
      priority: 5,
      category: 'fresh',
      reason: 'Never contacted — first call attempt',
    }
  }

  // Priority 6: Retries (previous no-answer, within retry window)
  const lastOutcome = lead.calls?.[0]?.outcome || lead.activities?.[0]?.callDisposition
  if (['no_answer', 'NO_ANSWER', 'voicemail_skipped', 'VOICEMAIL'].includes(lastOutcome)) {
    // Check retry timing: attempt 2 next day, attempt 3 two days later
    if (lastCallAt) {
      const daysSinceLast = (now.getTime() - new Date(lastCallAt).getTime()) / (1000 * 60 * 60 * 24)
      if (
        (callAttempts === 1 && daysSinceLast >= 1) ||
        (callAttempts === 2 && daysSinceLast >= 2) ||
        (callAttempts >= 3 && daysSinceLast >= 3)
      ) {
        return {
          priority: 6,
          category: 'retry',
          reason: `Retry attempt ${callAttempts + 1} — last tried ${Math.floor(daysSinceLast)}d ago`,
        }
      }
    }
    // Not ready for retry yet — push to bottom
    return {
      priority: 8,
      category: 'retry_pending',
      reason: `Retry not due yet — attempt ${callAttempts}`,
    }
  }

  // Priority 7: Re-engage (warm leads revisit after 30 days)
  if (lastCallAt) {
    const daysSinceLast = (now.getTime() - new Date(lastCallAt).getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceLast >= 30) {
      return {
        priority: 7,
        category: 're_engage',
        reason: `Re-engage — last contact ${Math.floor(daysSinceLast)} days ago`,
      }
    }
  }

  // Default: lower priority
  return {
    priority: 8,
    category: 'other',
    reason: 'Standard queue position',
  }
}

/**
 * Quick engagement calculation without full DB lookup
 */
function calculateQuickEngagement(events: any[], outboundEvents: any[]): number {
  let score = 0

  if (!events) return 0

  for (const event of events) {
    switch (event.eventType) {
      case 'PREVIEW_VIEWED': score += 5; break
      case 'PREVIEW_CTA_CLICKED': score += 8; break
      case 'PREVIEW_CALL_CLICKED': score += 10; break
      case 'PREVIEW_RETURN_VISIT': score += 7; break
      case 'EMAIL_OPENED': score += 3; break
      case 'EMAIL_REPLIED': score += 10; break
      case 'TEXT_RECEIVED': score += 8; break
    }
  }

  // Cap at 100
  return Math.min(100, score)
}

/**
 * Get queue summary without full lead data (faster for dashboard)
 */
export async function getQueueSummary(repId: string): Promise<QueueSummary> {
  const result = await buildRepQueue(repId)
  return result.summary
}

/**
 * Generate AI tip for a specific lead based on their engagement data
 */
export function generateAITip(lead: QueuedLead): string {
  const tips: string[] = []

  // Based on engagement
  if (lead.engagementScore >= 16) {
    tips.push('High engagement — they\'re interested. Be direct and ask for the close.')
  }

  // Based on preview engagement
  if (lead.queueCategory === 'hot') {
    tips.push('Just viewed the preview. Reference it: "I saw you checked out the preview..."')
  }

  // Based on callback
  if (lead.queueCategory === 'overdue_callback') {
    tips.push('This is an overdue callback — they asked you to call back. Remind them.')
  }

  // Based on website status
  if (!lead.website) {
    tips.push('No website on file — great angle: "I searched for you online and couldn\'t find a site..."')
  } else {
    tips.push('Has a website — lead with: "I checked out your current site..."')
  }

  // Based on enriched data
  if (lead.enrichedRating && lead.enrichedRating >= 4.5) {
    tips.push(`Great reviews (${lead.enrichedRating}/5). Compliment them: "I see your customers love you..."`)
  }

  // Based on call attempts
  if (lead.callAttempts === 0) {
    tips.push('First contact — be friendly and establish rapport. Ask permission to continue.')
  } else if (lead.callAttempts >= 2) {
    tips.push(`Attempt ${lead.callAttempts + 1} — try a different angle or time of day.`)
  }

  return tips[0] || 'Follow the script and listen for buying signals.'
}

/**
 * Get contact history for a lead (for the call screen)
 */
export async function getLeadHistory(leadId: string) {
  const [activities, events, calls, messages] = await Promise.all([
    prisma.activity.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
      take: 15,
      include: { rep: { select: { name: true } } },
    }),
    prisma.leadEvent.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
      take: 15,
    }),
    prisma.call.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.message.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ])

  // Merge into unified timeline
  type TimelineItem = {
    type: string
    description: string
    timestamp: Date
    details?: string
  }

  const timeline: TimelineItem[] = []

  for (const activity of activities) {
    timeline.push({
      type: activity.activityType === 'CALL' ? 'call' : activity.activityType === 'PREVIEW_SENT' ? 'preview' : 'activity',
      description: `${activity.activityType} — ${activity.callDisposition || 'logged'}`,
      timestamp: activity.createdAt,
      details: activity.notes || undefined,
    })
  }

  for (const event of events) {
    const descriptions: Record<string, string> = {
      EMAIL_SENT: 'Email sent',
      EMAIL_OPENED: 'Email opened',
      EMAIL_REPLIED: 'Email replied',
      PREVIEW_VIEWED: 'Preview viewed',
      PREVIEW_CTA_CLICKED: 'Preview CTA clicked',
      PREVIEW_CALL_CLICKED: 'Preview call button clicked',
      PREVIEW_RETURN_VISIT: 'Preview return visit',
      TEXT_SENT: 'Text sent',
      TEXT_RECEIVED: 'Text received',
    }
    timeline.push({
      type: event.eventType.toLowerCase().includes('email') ? 'email' :
            event.eventType.toLowerCase().includes('preview') ? 'preview' :
            event.eventType.toLowerCase().includes('text') ? 'text' : 'event',
      description: descriptions[event.eventType] || event.eventType,
      timestamp: event.createdAt,
    })
  }

  for (const msg of messages) {
    timeline.push({
      type: msg.channel === 'SMS' ? 'text' : 'email',
      description: `${msg.direction === 'OUTBOUND' ? 'Sent' : 'Received'} ${msg.channel}`,
      timestamp: msg.createdAt,
      details: msg.content.slice(0, 100),
    })
  }

  // Sort by timestamp descending
  timeline.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

  return timeline.slice(0, 20)
}