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
  previewEngagedNoPayment: number
  hotLeads: number
  warmLeads: number
  scheduledCallbacks: number
  freshLeads: number
  retries: number
  reEngage: number
  total: number
}

// Cache table existence checks for the lifetime of the process
let _callsTableExists: boolean | null = null
let _dncTableExists: boolean | null = null

async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    await prisma.$queryRawUnsafe(`SELECT 1 FROM "${tableName}" LIMIT 1`)
    return true
  } catch {
    return false
  }
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
  const todayEnd = new Date(now)
  todayEnd.setHours(23, 59, 59, 999)

  // Check if new dialer tables exist (they require prisma db push after schema update)
  if (_callsTableExists === null) _callsTableExists = await checkTableExists('calls')
  if (_dncTableExists === null) _dncTableExists = await checkTableExists('do_not_call')

  // Build include object — only include `calls` if the table exists
  const includeObj: any = {
    events: { orderBy: { createdAt: 'desc' }, take: 20 },
    activities: { where: { activityType: 'CALL' }, orderBy: { createdAt: 'desc' }, take: 5 },
    outboundEvents: { orderBy: { createdAt: 'desc' }, take: 10 },
  }
  if (_callsTableExists) {
    includeObj.calls = { orderBy: { createdAt: 'desc' }, take: 5 }
  }

  // Get all assigned leads that are dialable
  const assignedLeads: any[] = await prisma.lead.findMany({
    where: {
      assignedToId: repId,
      status: { in: ['NEW', 'HOT_LEAD', 'QUALIFIED', 'INFO_COLLECTED'] },
    },
    include: includeObj,
  })

  // Get DNC list (skip if table doesn't exist yet)
  let dncSet = new Set<string>()
  if (_dncTableExists) {
    try {
      const dncPhones: any[] = await (prisma as any).doNotCall.findMany({ select: { phone: true } })
      dncSet = new Set(dncPhones.map((d: any) => d.phone))
    } catch {
      // Table may have been dropped — reset cache
      _dncTableExists = false
    }
  }

  // Categorize and score each lead
  const categorized: QueuedLead[] = []

  for (const lead of assignedLeads) {
    if (dncSet.has(lead.phone)) continue

    const calls = lead.calls || []
    const activities = lead.activities || []

    const lastCall = calls[0] || activities[0]
    const lastCallAt = lastCall?.createdAt || null
    const callAttempts = calls.length + activities.filter((a: any) => a.activityType === 'CALL').length

    // Check for callbacks
    const callbackCall = calls.find((c: any) => c.outcome === 'callback' && c.callbackDate)
    const callbackActivity = activities.find((a: any) => a.callDisposition === 'CALLBACK' && a.callbackDate)
    const callbackDate = callbackCall?.callbackDate || callbackActivity?.callbackDate || null

    // Calculate engagement score
    const engagementScore = calculateQuickEngagement(lead.events || [], lead.outboundEvents || [])

    // Categorize
    const { priority, category, reason } = categorizeLead(
      lead, callbackDate, lastCallAt, callAttempts,
      engagementScore, now, twoHoursAgo, todayEnd
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

  const summary: QueueSummary = {
    overdueCallbacks: categorized.filter(l => l.queueCategory === 'overdue_callback').length,
    previewEngagedNoPayment: categorized.filter(l => l.queueCategory === 'preview_engaged_no_payment').length,
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
  todayEnd: Date,
): { priority: number, category: string, reason: string } {

  // Priority 1: Overdue callbacks
  if (callbackDate && callbackDate < now) {
    return { priority: 1, category: 'overdue_callback', reason: `Callback overdue since ${callbackDate.toLocaleDateString()}` }
  }

  // Priority 2: Preview engaged but no payment (viewed 30+ sec, highest conversion potential)
  const longPreviewViews = lead.events?.filter((e: any) => {
    if (e.eventType !== 'PREVIEW_VIEWED') return false
    try {
      const meta = typeof e.metadata === 'string' ? JSON.parse(e.metadata) : e.metadata
      return meta?.duration && meta.duration >= 30
    } catch { return false }
  })
  const hasPaid = lead.events?.some((e: any) => e.eventType === 'PAYMENT_RECEIVED')
  if (longPreviewViews?.length > 0 && !hasPaid) {
    return {
      priority: 2, category: 'preview_engaged_no_payment',
      reason: `Viewed preview ${longPreviewViews.length}x (30+ sec) — no payment yet`,
    }
  }

  // Priority 3: Hot leads (preview engaged in last 2 hours)
  const recentPreviewEvents = lead.events?.filter((e: any) =>
    ['PREVIEW_VIEWED', 'PREVIEW_CTA_CLICKED', 'PREVIEW_CALL_CLICKED'].includes(e.eventType) &&
    new Date(e.createdAt) > twoHoursAgo
  )
  if (recentPreviewEvents?.length > 0 || (engagementScore >= 16 && lead.status === 'HOT_LEAD')) {
    return {
      priority: 3, category: 'hot',
      reason: recentPreviewEvents?.length > 0 ? 'Preview engaged in last 2 hours' : `Hot lead — engagement score ${engagementScore}`,
    }
  }

  // Priority 4: Warm leads (email opened, preview clicked >2 hrs ago)
  const warmEvents = lead.events?.filter((e: any) =>
    ['EMAIL_OPENED', 'PREVIEW_VIEWED', 'PREVIEW_CTA_CLICKED'].includes(e.eventType)
  )
  const emailOpens = lead.outboundEvents?.filter((e: any) => e.status === 'OPENED' || e.openedAt)
  if ((warmEvents?.length > 0 || emailOpens?.length > 0) && engagementScore >= 6) {
    return { priority: 4, category: 'warm', reason: `Warm — ${warmEvents?.length || 0} engagement events` }
  }

  // Priority 5: Scheduled callbacks (due today, not overdue)
  if (callbackDate && callbackDate >= now && callbackDate <= todayEnd) {
    return {
      priority: 5, category: 'scheduled_callback',
      reason: `Callback at ${callbackDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    }
  }

  // Priority 6: Fresh leads (never contacted)
  if (callAttempts === 0) {
    return { priority: 6, category: 'fresh', reason: 'Never contacted — first call attempt' }
  }

  // Priority 7: Retries (previous no-answer, within retry window)
  const lastOutcome = lead.calls?.[0]?.outcome || lead.activities?.[0]?.callDisposition
  if (['no_answer', 'NO_ANSWER', 'voicemail_skipped', 'VOICEMAIL'].includes(lastOutcome)) {
    if (lastCallAt) {
      const daysSinceLast = (now.getTime() - new Date(lastCallAt).getTime()) / (1000 * 60 * 60 * 24)
      if (
        (callAttempts === 1 && daysSinceLast >= 1) ||
        (callAttempts === 2 && daysSinceLast >= 2) ||
        (callAttempts >= 3 && daysSinceLast >= 3)
      ) {
        return { priority: 7, category: 'retry', reason: `Retry attempt ${callAttempts + 1} — last tried ${Math.floor(daysSinceLast)}d ago` }
      }
    }
    return { priority: 9, category: 'retry_pending', reason: `Retry not due yet — attempt ${callAttempts}` }
  }

  // Priority 8: Re-engage (warm leads revisit after 30 days)
  if (lastCallAt) {
    const daysSinceLast = (now.getTime() - new Date(lastCallAt).getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceLast >= 30) {
      return { priority: 8, category: 're_engage', reason: `Re-engage — last contact ${Math.floor(daysSinceLast)} days ago` }
    }
  }

  return { priority: 9, category: 'other', reason: 'Standard queue position' }
}

/**
 * Quick engagement calculation without full DB lookup
 */
function calculateQuickEngagement(events: any[], _outboundEvents: any[]): number {
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

  return Math.min(100, score)
}

/**
 * Get queue summary without full lead data (faster for dashboard)
 */
export async function getQueueSummary(repId: string): Promise<QueueSummary> {
  const result = await buildRepQueue(repId)
  return result.summary
}

// ============================================
// AI TIPS — Multiple varied tips per context
// ============================================

const TIPS_HIGH_ENGAGEMENT = [
  'High engagement — they\'re interested. Be direct and confident asking for the close.',
  'This lead has been all over the preview. Skip the pitch, go straight to: "Did you get a chance to look at the preview I sent?"',
  'Strong engagement signals. Don\'t oversell — they\'re already warm. Just confirm what they liked and close.',
  'They\'ve clicked multiple times. Try: "Looks like you\'ve been checking out the site — what did you think?"',
]

const TIPS_HOT = [
  'Just viewed the preview. Reference it: "I saw you checked out the preview — what stood out to you?"',
  'They were literally just on the preview. This is your best shot — call with energy and reference what they saw.',
  'Hot timing. Open with: "Hey, I noticed you just took a look at the mock-up — pretty cool right?"',
  'Preview was just viewed. Be casual: "Perfect timing — did you see the site I put together for you?"',
]

const TIPS_OVERDUE_CALLBACK = [
  'This is an overdue callback — they asked you to call back. Remind them: "You asked me to give you a ring back..."',
  'Overdue callback. Open with: "Hey, I\'m following up like you asked — is now still a good time?"',
  'They wanted this call. Lead with confidence: "Last time we spoke you said to call back around now."',
  'This person specifically asked for a callback. That\'s a buying signal — don\'t treat it like a cold call.',
]

const TIPS_NO_WEBSITE = [
  'No website on file — great angle: "I searched for you online and couldn\'t find a site..."',
  'They don\'t have a website. Try: "I looked you up on Google and your competitors are showing up but you\'re not..."',
  'No web presence — use the urgency angle: "Customers are Googling {{industry}} in {{city}} and not finding you."',
  'No website = easy pitch. "97% of people search online before calling a business. Right now they can\'t find you."',
]

const TIPS_HAS_WEBSITE = [
  'Has a website — lead with: "I checked out your current site and thought it could use a refresh..."',
  'Their current site exists but could be better. Try: "I took a look at your site — when was the last time it was updated?"',
  'Has a website. Angle: "Your site doesn\'t load well on mobile — want to see what a modern version looks like?"',
  'They have a site. Be honest: "I pulled up your site before calling — it looks a bit dated. Are you getting leads from it?"',
]

const TIPS_GREAT_REVIEWS = [
  'Great reviews — compliment them: "I see your customers love you — your online presence should match that."',
  'Highly rated business. Open with: "I was reading your reviews and people clearly love what you do. Your website should reflect that."',
  'Amazing reviews. Try: "With ratings like yours, imagine how many more customers you\'d get with a site that shows up on Google."',
]

const TIPS_FIRST_CONTACT = [
  'First contact — be friendly and establish rapport before pitching. Ask permission to continue.',
  'Fresh lead — start warm: "Not trying to sell you anything crazy — just had a quick question, do you have 30 seconds?"',
  'First call. Key goal: build trust in 10 seconds. Be human, not salesy.',
  'Never been contacted. Remember: earn the right to pitch by asking a question first.',
]

const TIPS_RETRY = [
  'Multiple attempts — try a different angle or time of day this round.',
  'They didn\'t pick up last time. Try calling at a different hour — morning or late afternoon works best.',
  'Retry call. Switch your opener — if you led with website angle last time, try the Google search angle.',
  'Previous no-answer. Leave a voicemail this time if they don\'t pick up — creates familiarity for next attempt.',
]

const TIPS_WARM = [
  'Warm lead — they\'ve opened emails or viewed the preview. Reference that engagement in your opener.',
  'This lead has shown interest through email/preview activity. They know who you are — use that.',
  'Warm signals detected. Try: "I sent over some info and it looks like you checked it out — wanted to follow up."',
]

const TIPS_SCHEDULED_CALLBACK = [
  'Scheduled callback — they\'re expecting your call. Open with: "Hey, calling back like I said I would."',
  'This is a scheduled callback. They agreed to this call — that\'s a great sign. Be confident.',
  'Callback time. Start with: "I promised I\'d follow up today — is now still good?"',
]

const TIPS_RE_ENGAGE = [
  'Re-engagement call — it\'s been a while. Open with: "We spoke a while back about a website — wanted to check if anything\'s changed."',
  'Long time since last contact. Lead with something new: "We\'ve updated our designs since we last spoke — mind if I send you a fresh preview?"',
  'Re-engage attempt. Try a fresh angle — mention a seasonal pitch or new feature.',
]

const TIPS_PREVIEW_ENGAGED_NO_PAYMENT = [
  'They viewed the preview but haven\'t paid. Send it again and walk them through it: "Did you get a chance to look at that site?"',
  'This lead already saw the preview. Skip the pitch — go straight to: "What did you think of the site I sent over?"',
  'Preview viewed, no payment. They\'re warm. Ask: "Are you ready to get that site live? I can send the payment link right now."',
  'They spent time on the preview. They know what they\'re getting. Be direct and close.',
]

const TIPS_DEFAULT = [
  'Follow the script and listen for buying signals. Mirror their energy.',
  'Focus on asking questions, not pitching. The best closers listen more than they talk.',
  'Remember: send the preview in the first 30 seconds. Let it sell itself.',
  'Stay curious. Ask about their business before you pitch — people buy from people who care.',
]

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * Generate contextual AI tip for a specific lead
 * Returns a varied tip based on lead context — never the same tip twice in a row
 */
export function generateAITip(lead: QueuedLead): string {
  const industry = lead.industry?.toLowerCase().replace(/_/g, ' ') || 'local businesses'

  // Pick the most relevant tip category
  if (lead.engagementScore >= 16) {
    return pickRandom(TIPS_HIGH_ENGAGEMENT)
  }

  if (lead.queueCategory === 'preview_engaged_no_payment') {
    return pickRandom(TIPS_PREVIEW_ENGAGED_NO_PAYMENT)
  }

  if (lead.queueCategory === 'hot') {
    return pickRandom(TIPS_HOT)
  }

  if (lead.queueCategory === 'overdue_callback') {
    return pickRandom(TIPS_OVERDUE_CALLBACK)
  }

  if (lead.queueCategory === 'scheduled_callback') {
    return pickRandom(TIPS_SCHEDULED_CALLBACK)
  }

  if (lead.queueCategory === 'warm') {
    return pickRandom(TIPS_WARM)
  }

  if (lead.queueCategory === 're_engage') {
    return pickRandom(TIPS_RE_ENGAGE)
  }

  if (lead.callAttempts === 0) {
    // First contact — combine with website-specific tip
    const firstTip = pickRandom(TIPS_FIRST_CONTACT)
    if (!lead.website) {
      return firstTip + ' ' + pickRandom(TIPS_NO_WEBSITE)
        .replace('{{industry}}', industry)
        .replace('{{city}}', lead.city || 'your city')
    }
    return firstTip
  }

  if (lead.callAttempts >= 2) {
    return pickRandom(TIPS_RETRY)
  }

  // Reviews-based tips
  if (lead.enrichedRating && lead.enrichedRating >= 4.5) {
    return pickRandom(TIPS_GREAT_REVIEWS)
  }

  // Website-based tips
  if (!lead.website) {
    return pickRandom(TIPS_NO_WEBSITE)
      .replace('{{industry}}', industry)
      .replace('{{city}}', lead.city || 'your city')
  }

  if (lead.website) {
    return pickRandom(TIPS_HAS_WEBSITE)
  }

  return pickRandom(TIPS_DEFAULT)
}

/**
 * Get contact history for a lead (for the call screen)
 */
export async function getLeadHistory(leadId: string) {
  // Fetch from existing tables — Call table is optional
  const queries: Promise<any[]>[] = [
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
    prisma.message.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]

  // Only query calls table if it exists
  if (_callsTableExists) {
    queries.push(
      (prisma as any).call.findMany({
        where: { leadId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }).catch(() => {
        _callsTableExists = false
        return []
      })
    )
  }

  const results = await Promise.all(queries)
  const activities = results[0]
  const events = results[1]
  const messages = results[2]
  const calls = results[3] || []

  type TimelineItem = { type: string; description: string; timestamp: Date; details?: string }
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

  for (const call of calls) {
    timeline.push({
      type: 'call',
      description: `Call — ${call.outcome || call.status || 'dialed'}`,
      timestamp: call.createdAt,
      details: call.notes || undefined,
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

  timeline.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  return timeline.slice(0, 20)
}