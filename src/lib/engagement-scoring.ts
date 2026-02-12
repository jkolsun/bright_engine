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
  }
  temperature: string // COLD (0-30), WARM (31-70), HOT (71-100)
  lastEngagement?: Date
  trend: 'up' | 'down' | 'flat'
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
      },
      temperature: 'COLD',
      trend: 'flat',
    }
  }

  // Already a client = HOT (or conversion happened)
  if (lead.client) {
    return {
      leadId,
      score: 100,
      level: 'HOT',
      components: {
        previewEngagement: 25,
        emailEngagement: 25,
        outboundRecency: 25,
        conversionSignals: 25,
      },
      temperature: 'HOT',
      trend: 'flat',
    }
  }

  // Score 1: Preview Engagement (max 25 points)
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
    previewEngagementScore = Math.min(25, previewEvents.length * 5)
  }

  // Score 2: Email/Outbound Response (max 25 points)
  let emailEngagementScore = 0
  const emailResponseEvents = lead.events.filter((e) =>
    ['EMAIL_OPENED', 'EMAIL_REPLIED', 'TEXT_RECEIVED'].includes(e.eventType)
  )

  if (emailResponseEvents.length > 0) {
    emailEngagementScore = Math.min(25, emailResponseEvents.length * 8) // Emails are weighted higher
  }

  // Score 3: Outbound Recency (max 25 points)
  let recencyScore = 0
  const now = new Date()
  const outboundEvents = lead.outboundEvents || []

  if (outboundEvents.length > 0) {
    const lastOutbound = new Date(
      Math.max(...outboundEvents.map((e) => new Date(e.sentAt).getTime()))
    )
    const daysSince = (now.getTime() - lastOutbound.getTime()) / (1000 * 60 * 60 * 24)

    // Fresh outbound = 25 points, decays over time
    if (daysSince <= 1) recencyScore = 25
    else if (daysSince <= 3) recencyScore = 20
    else if (daysSince <= 7) recencyScore = 15
    else if (daysSince <= 14) recencyScore = 10
    else if (daysSince <= 30) recencyScore = 5
    else recencyScore = 0
  }

  // Score 4: Conversion Signals (max 25 points)
  let conversionSignalScore = 0
  const conversionEvents = lead.events.filter((e) =>
    ['PAYMENT_RECEIVED', 'SITE_LIVE'].includes(e.eventType)
  )

  if (conversionEvents.length > 0) {
    conversionSignalScore = 25 // Strong signal
  }

  // Also check: did they reply to emails? That's +10
  const replyEvents = lead.events.filter((e) => e.eventType === 'EMAIL_REPLIED')
  if (replyEvents.length > 0 && conversionSignalScore < 25) {
    conversionSignalScore = Math.min(25, conversionSignalScore + 10)
  }

  // Total score (0-100)
  const totalScore =
    previewEngagementScore +
    emailEngagementScore +
    recencyScore +
    conversionSignalScore

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

  return {
    leadId,
    score: Math.min(100, totalScore),
    level,
    components: {
      previewEngagement: previewEngagementScore,
      emailEngagement: emailEngagementScore,
      outboundRecency: recencyScore,
      conversionSignals: conversionSignalScore,
    },
    temperature,
    lastEngagement,
    trend,
  }
}

/**
 * Batch calculate engagement scores for all leads
 */
export async function recalculateAllEngagementScores() {
  const leads = await prisma.lead.findMany({
    select: { id: true },
  })

  const scores = await Promise.all(
    leads.map((lead) => calculateEngagementScore(lead.id))
  )

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
