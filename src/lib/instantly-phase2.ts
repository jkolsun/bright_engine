/**
 * Instantly Phase 2: Multi-Channel Integration + Campaign Optimization
 * - Pause Instantly sequences when rep gets positive response on call
 * - Cross-campaign capacity balancing
 * - Queue prioritization by engagement metrics
 * - Campaign performance tracking
 */

import { prisma } from './db'

const REPLY_RATE_THRESHOLD = 0.05 // 5% reply rate alert
const BOUNCE_RATE_THRESHOLD = 0.03 // 3% bounce rate alert

/**
 * Called when rep records a positive call/response for a lead
 * Pauses the lead's Instantly sequence to avoid conflicting outreach
 */
export async function pauseInstantlySequenceOnPositiveResponse(leadId: string) {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } })

    if (!lead) {
      console.warn(`[Instantly Phase 2] Lead ${leadId} not found`)
      return
    }

    if (lead.instantlyStatus !== 'IN_SEQUENCE') {
      console.log(`[Instantly Phase 2] Lead ${leadId} not in sequence, nothing to pause`)
      return
    }

    // Update lead status to PAUSED
    await prisma.lead.update({
      where: { id: leadId },
      data: { instantlyStatus: 'PAUSED' },
    })

    console.log(`[Instantly Phase 2] Paused Instantly sequence for lead ${leadId} (rep positive response)`)

    // Log the action
    await prisma.leadEvent.create({
      data: {
        leadId,
        eventType: 'STAGE_CHANGE',
        toStage: 'PAUSED',
        actor: 'system',
        metadata: { reason: 'positive_response_on_call' },
      },
    })

    // Signal to drip feed that a slot was freed
    // The next sync cycle will detect this and add more new leads
    return true
  } catch (error) {
    console.error('[Instantly Phase 2] Failed to pause sequence:', error)
    throw error
  }
}

/**
 * Resume a paused sequence if the lead didn't convert
 */
export async function resumeInstantlySequence(leadId: string) {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } })

    if (!lead || lead.instantlyStatus !== 'PAUSED') {
      return
    }

    // Resume at current step
    await prisma.lead.update({
      where: { id: leadId },
      data: { instantlyStatus: 'IN_SEQUENCE' },
    })

    console.log(`[Instantly Phase 2] Resumed Instantly sequence for lead ${leadId}`)
  } catch (error) {
    console.error('[Instantly Phase 2] Failed to resume sequence:', error)
  }
}

/**
 * Get campaign performance metrics
 * Used for deciding which campaign gets priority in capacity allocation
 */
export async function getCampaignPerformance(campaignId: string) {
  try {
    // Get all leads in this campaign
    const total = await prisma.lead.count({
      where: { instantlyCampaignId: campaignId },
    })

    const replied = await prisma.lead.count({
      where: { instantlyCampaignId: campaignId, instantlyStatus: 'REPLIED' },
    })

    const bounced = await prisma.lead.count({
      where: { instantlyCampaignId: campaignId, instantlyStatus: 'BOUNCED' },
    })

    const inSequence = await prisma.lead.count({
      where: { instantlyCampaignId: campaignId, instantlyStatus: 'IN_SEQUENCE' },
    })

    const completed = await prisma.lead.count({
      where: { instantlyCampaignId: campaignId, instantlyStatus: 'COMPLETED' },
    })

    const replyRate = total > 0 ? replied / total : 0
    const bounceRate = total > 0 ? bounced / total : 0
    const completionRate = total > 0 ? completed / total : 0

    return {
      campaign_id: campaignId,
      total_contacts: total,
      replied: replied,
      bounced: bounced,
      in_sequence: inSequence,
      completed: completed,
      reply_rate: replyRate,
      bounce_rate: bounceRate,
      completion_rate: completionRate,
      health: {
        status: determineHealthStatus(replyRate, bounceRate),
        alerts: generateAlerts(replyRate, bounceRate),
      },
    }
  } catch (error) {
    console.error('[Instantly Phase 2] Failed to get campaign performance:', error)
    throw error
  }
}

/**
 * Determine campaign health status
 */
function determineHealthStatus(replyRate: number, bounceRate: number): string {
  if (bounceRate > BOUNCE_RATE_THRESHOLD) return 'at_risk'
  if (replyRate < 0.02) return 'underperforming'
  if (replyRate > 0.08) return 'excellent'
  return 'healthy'
}

/**
 * Generate performance alerts
 */
function generateAlerts(replyRate: number, bounceRate: number): string[] {
  const alerts: string[] = []

  if (bounceRate > BOUNCE_RATE_THRESHOLD) {
    alerts.push(`High bounce rate: ${(bounceRate * 100).toFixed(1)}%`)
  }

  if (replyRate < 0.02) {
    alerts.push(`Low reply rate: ${(replyRate * 100).toFixed(1)}% (below 2%)`)
  }

  if (bounceRate > 0.05) {
    alerts.push(`Critical bounce rate: ${(bounceRate * 100).toFixed(1)}% (list quality issue)`)
  }

  return alerts
}

/**
 * Rebalance capacity between campaigns based on performance
 * Called by daily sync after performance analysis
 * Returns adjusted new_leads_per_day for each campaign
 */
export async function rebalanceCampaignCapacity(
  campaignCapacities: Record<string, number>,
  performanceMetrics: Record<string, any>
) {
  try {
    const rebalanced: Record<string, number> = {}
    const totalCapacity = Object.values(campaignCapacities).reduce((sum, c) => sum + c, 0)

    // Get all campaigns
    const campaigns = Object.keys(campaignCapacities)

    // Calculate performance scores
    const performanceScores: Record<string, number> = {}
    for (const campaignId of campaigns) {
      const perf = performanceMetrics[campaignId]
      if (!perf) {
        performanceScores[campaignId] = 1.0 // Default to neutral
        continue
      }

      // Score = base (reply_rate / avg) adjusted by bounce rate
      const baseScore = perf.reply_rate / 0.05 // Assume 5% is baseline
      const bounceAdjustment = 1 - perf.bounce_rate * 2 // Higher bounce = lower score
      const finalScore = Math.max(0.5, Math.min(2.0, baseScore * bounceAdjustment)) // Clamp 0.5-2.0

      performanceScores[campaignId] = finalScore
    }

    // Allocate capacity proportionally to performance scores
    const totalScore = Object.values(performanceScores).reduce((sum, s) => sum + s, 0)

    for (const campaignId of campaigns) {
      const proportion = performanceScores[campaignId] / totalScore
      rebalanced[campaignId] = Math.floor(totalCapacity * proportion)
    }

    console.log('[Instantly Phase 2] Rebalanced capacity:', rebalanced)

    return rebalanced
  } catch (error) {
    console.error('[Instantly Phase 2] Failed to rebalance capacity:', error)
    // Return original capacities on error
    return campaignCapacities
  }
}

/**
 * Get queue statistics
 * Useful for understanding queue burn-down rate and clearing timeline
 */
export async function getQueueStats() {
  try {
    const queued = await prisma.lead.count({
      where: { instantlyStatus: 'QUEUED' },
    })

    const byIndustry = await prisma.lead.groupBy({
      by: ['industry'],
      where: { instantlyStatus: 'QUEUED' },
      _count: true,
    })

    const bySource = await prisma.lead.groupBy({
      by: ['source'],
      where: { instantlyStatus: 'QUEUED' },
      _count: true,
    })

    return {
      total_queued: queued,
      by_industry: byIndustry.map((b) => ({
        industry: b.industry,
        count: b._count,
      })),
      by_source: bySource.map((b) => ({
        source: b.source,
        count: b._count,
      })),
    }
  } catch (error) {
    console.error('[Instantly Phase 2] Failed to get queue stats:', error)
    throw error
  }
}

/**
 * Prioritize queue by industry or engagement score
 * Optionally reorder which leads get pushed first
 */
export async function prioritizeQueueBy(criteria: 'industry' | 'engagement' | 'age') {
  try {
    const queued = await prisma.lead.findMany({
      where: { instantlyStatus: 'QUEUED' },
      orderBy:
        criteria === 'industry'
          ? { industry: 'asc' } // Group by industry
          : criteria === 'engagement'
            ? { churnRiskScore: 'asc' } // Low risk first
            : { createdAt: 'asc' }, // Oldest first
    })

    console.log(`[Instantly Phase 2] Queue prioritized by ${criteria}: ${queued.length} leads`)

    return queued.map((l) => ({
      id: l.id,
      email: l.email,
      company: l.companyName,
      industry: l.industry,
      priority: criteria === 'industry' ? l.industry : criteria === 'engagement' ? l.churnRiskScore : 'age',
    }))
  } catch (error) {
    console.error('[Instantly Phase 2] Failed to prioritize queue:', error)
    throw error
  }
}

/**
 * Track campaign performance over time
 * Useful for dashboards and historical analysis
 */
export async function recordCampaignSnapshot(campaignId: string) {
  try {
    const perf = await getCampaignPerformance(campaignId)

    // Store as drip_log entry with performance metadata
    // Look up stored campaign IDs to determine A vs B
    const campaignSettings = await prisma.settings.findUnique({
      where: { key: 'instantly_campaigns' },
    })
    const storedCampaigns = campaignSettings?.value as any
    const campaignLabel = storedCampaigns?.campaign_a === campaignId ? 'A' : 'B'

    await prisma.instantlyDripLog.create({
      data: {
        date: new Date(),
        campaign: campaignLabel,
        totalLimit: 0, // Placeholder — would be filled by sync job
        usableSends: 0,
        followupObligations: 0,
        availableForNew: 0,
        leadsPushed: 0,
        leadsRemainingInQueue: perf.total_contacts - perf.replied - perf.bounced,
        estDaysToClear: perf.in_sequence > 0 ? Math.ceil(perf.total_contacts / perf.in_sequence) : 0,
      },
    })

    console.log(`[Instantly Phase 2] Recorded performance snapshot for campaign ${campaignId}`)

    return perf
  } catch (error) {
    console.error('[Instantly Phase 2] Failed to record snapshot:', error)
  }
}
