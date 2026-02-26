import { prisma } from './db'
import { EventType } from '@prisma/client'

// ============================================
// ENGAGEMENT SCORING ENGINE
// ============================================

export type EngagementLevel = 'COLD' | 'WARM' | 'HOT'

export interface EngagementScore {
  leadId: string
  score: number // 0-100
  level: EngagementLevel
  components: {
    previewEngagement: number
    emailEngagement: number
    outboundRecency: number
    conversionSignals: number
    callEngagement: number
  }
  temperature: string // COLD (0-30), WARM (31-70), HOT (71-100)
  lastEngagement?: Date
  trend: 'up' | 'down' | 'flat'
  priorityChanged: boolean
  newPriority: 'HOT' | 'WARM' | 'COLD'
}

/**
 * Calculate engagement score for a lead based on all interactions
 * Weights different signal types and recency
 */
export async function calculateEngagementScore(
  leadId: string
): Promise<EngagementScore> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      events: true,
      outboundEvents: true,
      client: true,
      dialerCalls: {
        select: {
          connectedAt: true,
          dispositionResult: true,
          previewOpenedDuringCall: true,
          ctaClickedDuringCall: true,
        },
      },
      upsellTags: {
        where: { removedAt: null },
        select: { id: true },
      },
    },
  })

  if (!lead) {
    return {
      leadId,
      score: 0,
      level: 'COLD',
      components: {
        previewEngagement: 0,
        emailEngagement: 0,
        outboundRecency: 0,
        conversionSignals: 0,
        callEngagement: 0,
      },
      temperature: 'COLD',
      trend: 'flat',
      priorityChanged: false,
      newPriority: 'COLD',
    }
  }

  // Already a client = HOT (or conversion happened)
  if (lead.client) {
    const previousPriority = lead.priority
    // Persist score for clients too
    try {
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          engagementScore: 100,
          engagementLevel: 'HOT',
          engagementUpdatedAt: new Date(),
          priority: 'HOT',
        },
      })
    } catch (e) { console.warn('[Scoring] Persist failed for client lead:', e) }
    return {
      leadId,
      score: 100,
      level: 'HOT',
      components: {
        previewEngagement: 20,
        emailEngagement: 20,
        outboundRecency: 20,
        conversionSignals: 20,
        callEngagement: 20,
      },
      temperature: 'HOT',
      trend: 'flat',
      priorityChanged: previousPriority !== 'HOT',
      newPriority: 'HOT',
    }
  }

  // Score 1: Preview Engagement (max 20 points)
  let previewEngagementScore = 0
  const previewEvents = lead.events.filter((e) =>
    [
      'PREVIEW_VIEWED',
      'PREVIEW_CTA_CLICKED',
      'PREVIEW_CALL_CLICKED',
      'PREVIEW_RETURN_VISIT',
    ].includes(e.eventType)
  )

  if (previewEvents.length > 0) {
    previewEngagementScore = Math.min(20, previewEvents.length * 4)
  }

  // Score 2: Email/Outbound Response (max 20 points)
  let emailEngagementScore = 0
  const emailResponseEvents = lead.events.filter((e) =>
    ['EMAIL_OPENED', 'EMAIL_REPLIED', 'TEXT_RECEIVED'].includes(e.eventType)
  )

  if (emailResponseEvents.length > 0) {
    emailEngagementScore = Math.min(20, emailResponseEvents.length * 6)
  }

  // Score 3: Outbound Recency (max 20 points)
  let recencyScore = 0
  const now = new Date()
  const outboundEvents = lead.outboundEvents || []

  if (outboundEvents.length > 0) {
    const lastOutbound = new Date(
      Math.max(...outboundEvents.map((e) => new Date(e.sentAt).getTime()))
    )
    const daysSince = (now.getTime() - lastOutbound.getTime()) / (1000 * 60 * 60 * 24)

    if (daysSince <= 1) recencyScore = 20
    else if (daysSince <= 3) recencyScore = 16
    else if (daysSince <= 7) recencyScore = 12
    else if (daysSince <= 14) recencyScore = 8
    else if (daysSince <= 30) recencyScore = 4
    else recencyScore = 0
  }

  // Score 4: Conversion Signals (max 20 points)
  let conversionSignalScore = 0
  const conversionEvents = lead.events.filter((e) =>
    ['PAYMENT_RECEIVED', 'SITE_LIVE'].includes(e.eventType)
  )

  if (conversionEvents.length > 0) {
    conversionSignalScore = 20
  }

  const replyEvents = lead.events.filter((e) => e.eventType === 'EMAIL_REPLIED')
  if (replyEvents.length > 0 && conversionSignalScore < 20) {
    conversionSignalScore = Math.min(20, conversionSignalScore + 8)
  }

  // Score 5: Call Engagement (max 20 points) — NEW for dialer
  let callEngagementScore = 0
  const dialerCalls = (lead as any).dialerCalls || []
  const upsellTags = (lead as any).upsellTags || []

  // Connected calls: 0→0, 1→5, 2+→8
  const connectedCalls = dialerCalls.filter((c: any) => c.connectedAt).length
  if (connectedCalls >= 2) callEngagementScore += 8
  else if (connectedCalls >= 1) callEngagementScore += 5

  // Disposition-based scoring
  const dispositions = dialerCalls.map((c: any) => c.dispositionResult).filter(Boolean)
  if (dispositions.includes('WANTS_TO_MOVE_FORWARD')) callEngagementScore = Math.min(20, callEngagementScore + 12)
  else if (dispositions.includes('WANTS_CHANGES')) callEngagementScore = Math.min(20, callEngagementScore + 10)
  else if (dispositions.includes('CALLBACK')) callEngagementScore = Math.min(20, callEngagementScore + 8)
  else if (dispositions.includes('INTERESTED_VERBAL')) callEngagementScore = Math.min(20, callEngagementScore + 7)
  else if (dispositions.includes('WILL_LOOK_LATER')) callEngagementScore = Math.min(20, callEngagementScore + 5)
  else if (dispositions.includes('NOT_INTERESTED')) callEngagementScore = Math.max(0, callEngagementScore - 5)
  else if (dispositions.includes('DNC')) callEngagementScore = 0

  // Upsell tags bonus
  if (upsellTags.length > 0) callEngagementScore = Math.min(20, callEngagementScore + 5)

  // Preview opened/CTA clicked during call bonus
  if (dialerCalls.some((c: any) => c.previewOpenedDuringCall)) callEngagementScore = Math.min(20, callEngagementScore + 3)
  if (dialerCalls.some((c: any) => c.ctaClickedDuringCall)) callEngagementScore = Math.min(20, callEngagementScore + 5)

  callEngagementScore = Math.min(20, Math.max(0, callEngagementScore))

  // Total score (0-100)
  const totalScore =
    previewEngagementScore +
    emailEngagementScore +
    recencyScore +
    conversionSignalScore +
    callEngagementScore

  // Determine temperature/level
  let level: EngagementLevel
  let temperature: string

  if (totalScore >= 71) {
    level = 'HOT'
    temperature = 'HOT'
  } else if (totalScore >= 31) {
    level = 'WARM'
    temperature = 'WARM'
  } else {
    level = 'COLD'
    temperature = 'COLD'
  }

  // Determine trend (compare to last week)
  let trend: 'up' | 'down' | 'flat' = 'flat'
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const recentEvents = lead.events.filter((e) => new Date(e.createdAt) > weekAgo)
  
  if (recentEvents.length > 3) {
    trend = 'up'
  } else if (recentEvents.length === 0) {
    trend = 'down'
  }

  // Last engagement date
  let lastEngagement: Date | undefined
  const eventDates = lead.events.map((e) => new Date(e.createdAt).getTime())
  const outboundDates = outboundEvents.map((e) => new Date(e.sentAt).getTime())
  const allDates = [...eventDates, ...outboundDates]

  if (allDates.length > 0) {
    lastEngagement = new Date(Math.max(...allDates))
  }

  // Persist score + derive priority from score
  const finalScore = Math.min(100, totalScore)
  const newPriority: 'HOT' | 'WARM' | 'COLD' = finalScore >= 71 ? 'HOT' : finalScore >= 31 ? 'WARM' : 'COLD'
  const previousPriority = lead.priority
  const priorityChanged = previousPriority !== newPriority

  try {
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        engagementScore: finalScore,
        engagementLevel: level,
        engagementUpdatedAt: new Date(),
        priority: newPriority,
      },
    })
  } catch (e) { console.warn('[Scoring] Persist failed:', e) }

  // If priority just crossed to HOT, fire notification + SMS (dynamic import to avoid circular dep)
  if (priorityChanged && newPriority === 'HOT') {
    try {
      const { processHotLeadEvent } = await import('./hot-lead-notifications')
      await processHotLeadEvent({
        leadId,
        eventType: 'ENGAGEMENT_SCORE_HOT',
        metadata: { score: finalScore, previousPriority, components: { previewEngagement: previewEngagementScore, emailEngagement: emailEngagementScore, outboundRecency: recencyScore, conversionSignals: conversionSignalScore, callEngagement: callEngagementScore } },
      })
    } catch (e) { console.warn('[Scoring] Hot lead notification failed:', e) }
  }

  return {
    leadId,
    score: finalScore,
    level,
    components: {
      previewEngagement: previewEngagementScore,
      emailEngagement: emailEngagementScore,
      outboundRecency: recencyScore,
      conversionSignals: conversionSignalScore,
      callEngagement: callEngagementScore,
    },
    temperature,
    lastEngagement,
    trend,
    priorityChanged,
    newPriority,
  }
}

/**
 * Batch calculate engagement scores for all leads
 */
export async function recalculateAllEngagementScores() {
  const leads = await prisma.lead.findMany({
    where: { status: { notIn: ['CLOSED_LOST', 'DO_NOT_CONTACT', 'PAID'] } },
    select: { id: true },
  })

  const scores: EngagementScore[] = []
  // Process in chunks of 10 to avoid connection exhaustion
  for (let i = 0; i < leads.length; i += 10) {
    const chunk = leads.slice(i, i + 10)
    const chunkScores = await Promise.allSettled(
      chunk.map((lead) => calculateEngagementScore(lead.id))
    )
    for (const result of chunkScores) {
      if (result.status === 'fulfilled') scores.push(result.value)
    }
  }

  return scores
}

/**
 * Get engagement stats across all leads
 */
export async function getEngagementStats() {
  const leads = await prisma.lead.findMany({
    include: {
      events: true,
      outboundEvents: true,
    },
  })

  const scores = await Promise.all(
    leads.map((lead) => calculateEngagementScore(lead.id))
  )

  const stats = {
    totalLeads: scores.length,
    hot: scores.filter((s) => s.level === 'HOT').length,
    warm: scores.filter((s) => s.level === 'WARM').length,
    cold: scores.filter((s) => s.level === 'COLD').length,
    averageScore: scores.reduce((sum, s) => sum + s.score, 0) / scores.length,
    topEngaged: scores
      .sort((a, b) => b.score - a.score)
      .slice(0, 10),
    bottomEngaged: scores
      .sort((a, b) => a.score - b.score)
      .slice(0, 5),
  }

  return stats
}
