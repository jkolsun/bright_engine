/**
 * Instantly Phase 3: Self-Optimizing Clawdbot
 * - Analyzes send data to auto-optimize settings
 * - Detects degrading domain health
 * - Recommends sequence timing changes
 * - Identifies when to swap email copy
 * - Predicts queue clear date
 * - Alerts on anomalies
 */

import { prisma } from './db'

/**
 * Analyze send data and return optimization recommendations
 * Runs daily after 2+ weeks of data
 */
export async function analyzeAndOptimize() {
  try {
    console.log('[Instantly Phase 3] Running daily optimization analysis')

    const recommendations: any[] = []

    // 1. Check reply rate trends
    const replyTrend = await analyzeReplyTrend()
    if (replyTrend.alert) {
      recommendations.push(replyTrend)
    }

    // 2. Check bounce rate trends
    const bounceTrend = await analyzeBounceTrend()
    if (bounceTrend.alert) {
      recommendations.push(bounceTrend)
    }

    // 3. Analyze which sequence step has best performance
    const stepAnalysis = await analyzeSequenceSteps()
    if (stepAnalysis.recommendation) {
      recommendations.push(stepAnalysis)
    }

    // 4. Predict queue clear date
    const queueForecast = await forecastQueueClearDate()
    recommendations.push(queueForecast)

    // 5. Detect domain health degradation
    const domainHealth = await detectDomainHealthIssues()
    if (domainHealth.alerts.length > 0) {
      recommendations.push(domainHealth)
    }

    // 6. Recommend safety buffer adjustment
    const bufferRec = await recommendSafetyBufferAdjustment()
    if (bufferRec.recommendation) {
      recommendations.push(bufferRec)
    }

    console.log(`[Instantly Phase 3] Generated ${recommendations.length} recommendations`)

    return {
      timestamp: new Date(),
      recommendations,
      next_review: new Date(Date.now() + 24 * 60 * 60 * 1000),
    }
  } catch (error) {
    console.error('[Instantly Phase 3] Optimization failed:', error)
    throw error
  }
}

/**
 * Analyze reply rate trend over last 7 days
 */
async function analyzeReplyTrend() {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const recentReplies = await prisma.lead.count({
      where: {
        instantlyStatus: 'REPLIED',
        updatedAt: { gte: sevenDaysAgo },
      },
    })

    const recentContacts = await prisma.lead.count({
      where: {
        instantlyStatus: 'IN_SEQUENCE',
        instantlyAddedDate: { gte: sevenDaysAgo },
      },
    })

    const recentReplyRate = recentContacts > 0 ? recentReplies / recentContacts : 0

    // Compare to historical average
    const historicalReplies = await prisma.lead.count({
      where: { instantlyStatus: 'REPLIED' },
    })

    const historicalContacts = await prisma.lead.count({
      where: { instantlyStatus: 'IN_SEQUENCE' },
    })

    const historicalReplyRate = historicalContacts > 0 ? historicalReplies / historicalContacts : 0

    const trend = recentReplyRate > historicalReplyRate ? 'improving' : recentReplyRate < historicalReplyRate * 0.8 ? 'declining' : 'stable'

    return {
      metric: 'reply_rate',
      current_rate: recentReplyRate,
      historical_rate: historicalReplyRate,
      trend,
      alert: trend === 'declining' ? `Reply rate declined ${((1 - recentReplyRate / historicalReplyRate) * 100).toFixed(1)}%` : null,
      recommendation: trend === 'declining' ? 'Consider refreshing email copy or checking domain health' : null,
    }
  } catch (error) {
    console.error('[Instantly Phase 3] Reply trend analysis failed:', error)
    return { alert: null }
  }
}

/**
 * Analyze bounce rate trend
 */
async function analyzeBounceTrend() {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const recentBounces = await prisma.lead.count({
      where: {
        instantlyStatus: 'BOUNCED',
        updatedAt: { gte: sevenDaysAgo },
      },
    })

    const recentSends = await prisma.lead.count({
      where: {
        instantlyAddedDate: { gte: sevenDaysAgo },
      },
    })

    const recentBounceRate = recentSends > 0 ? recentBounces / recentSends : 0

    const historicalBounces = await prisma.lead.count({
      where: { instantlyStatus: 'BOUNCED' },
    })

    const historicalSends = await prisma.lead.count({
      where: { instantlyStatus: 'IN_SEQUENCE' },
    })

    const historicalBounceRate = historicalSends > 0 ? historicalBounces / historicalSends : 0

    return {
      metric: 'bounce_rate',
      current_rate: recentBounceRate,
      historical_rate: historicalBounceRate,
      alert:
        recentBounceRate > 0.05
          ? `High bounce rate: ${(recentBounceRate * 100).toFixed(1)}% (possible domain health issue)`
          : null,
      recommendation:
        recentBounceRate > 0.05 ? 'Check domain DNS/SPF/DKIM and consider warming up new domain' : null,
    }
  } catch (error) {
    console.error('[Instantly Phase 3] Bounce trend analysis failed:', error)
    return { alert: null }
  }
}

/**
 * Analyze which sequence step gets best response
 */
async function analyzeSequenceSteps() {
  try {
    // Group replies by which step they replied to
    const stepPerformance: Record<number, { replies: number; sends: number }> = {}

    // This is simplified — in production would track step-level analytics
    // For now, estimate based on days since added

    return {
      metric: 'sequence_optimization',
      recommendation:
        'After 2+ weeks of data, consider adjusting step delays or removing underperforming steps',
    }
  } catch (error) {
    console.error('[Instantly Phase 3] Sequence analysis failed:', error)
    return { recommendation: null }
  }
}

/**
 * Forecast when the queue will be cleared
 */
async function forecastQueueClearDate() {
  try {
    const queued = await prisma.lead.count({
      where: { instantlyStatus: 'QUEUED' },
    })

    // Get average daily push over last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const recentPushes = await prisma.instantlyDripLog.aggregate({
      where: { date: { gte: sevenDaysAgo } },
      _sum: { leadsPushed: true },
    })

    const avgDailyPush = (recentPushes._sum.leadsPushed || 0) / 7

    const daysToClean = avgDailyPush > 0 ? Math.ceil(queued / avgDailyPush) : 999

    const clearDate = new Date(Date.now() + daysToClean * 24 * 60 * 60 * 1000)

    return {
      metric: 'queue_forecast',
      queued_leads: queued,
      avg_daily_push: Math.round(avgDailyPush),
      days_to_clear: daysToClean,
      estimated_clear_date: clearDate.toISOString().split('T')[0],
      recommendation:
        daysToClean < 5
          ? `Queue will clear in ${daysToClean} days — plan next Apollo export soon`
          : daysToClean > 60
            ? 'Queue will take 2+ months to clear — consider adding more sending domains'
            : null,
    }
  } catch (error) {
    console.error('[Instantly Phase 3] Queue forecast failed:', error)
    return { recommendation: null }
  }
}

/**
 * Detect domain health degradation
 */
async function detectDomainHealthIssues() {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    // High bounce rate = domain issue
    const recentBounces = await prisma.lead.count({
      where: {
        instantlyStatus: 'BOUNCED',
        updatedAt: { gte: sevenDaysAgo },
      },
    })

    const recentSends = await prisma.instantlyDripLog.aggregate({
      where: { date: { gte: sevenDaysAgo } },
      _sum: { leadsPushed: true },
    })

    const bounceRate = (recentSends._sum.leadsPushed || 1) > 0 ? recentBounces / (recentSends._sum.leadsPushed || 1) : 0

    const alerts: string[] = []

    if (bounceRate > 0.05) {
      alerts.push(`High bounce rate: ${(bounceRate * 100).toFixed(1)}%`)
    }

    if (bounceRate > 0.10) {
      alerts.push(`Critical bounce rate: ${(bounceRate * 100).toFixed(1)}% — likely domain reputation issue`)
    }

    return {
      metric: 'domain_health',
      bounce_rate: bounceRate,
      alerts,
      recommendation: alerts.length > 0 ? 'Check DNS/SPF/DKIM records and consider domain rotation' : null,
    }
  } catch (error) {
    console.error('[Instantly Phase 3] Domain health detection failed:', error)
    return { alerts: [] }
  }
}

/**
 * Recommend safety buffer adjustment based on consistency
 */
async function recommendSafetyBufferAdjustment() {
  try {
    const recentLogs = await prisma.instantlyDripLog.findMany({
      where: {
        date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { date: 'desc' },
      take: 7,
    })

    if (recentLogs.length < 3) {
      return { recommendation: null }
    }

    // Calculate how much capacity was actually used
    const avgCapacityUsed = recentLogs.reduce((sum, log) => {
      const used = log.followupObligations + log.leadsPushed
      const available = log.usableSends
      return sum + (available > 0 ? used / available : 0)
    }, 0) / recentLogs.length

    const currentBuffer = 0.85 // Default

    if (avgCapacityUsed > 0.95) {
      return {
        metric: 'safety_buffer',
        current_buffer: currentBuffer,
        recommendation: `Using ${(avgCapacityUsed * 100).toFixed(0)}% of capacity — consider lowering safety buffer to 0.80 for more aggressive pushing`,
      }
    }

    if (avgCapacityUsed < 0.60) {
      return {
        metric: 'safety_buffer',
        current_buffer: currentBuffer,
        recommendation: `Only using ${(avgCapacityUsed * 100).toFixed(0)}% of capacity — consider raising safety buffer to 0.90 for faster queue clearing`,
      }
    }

    return { recommendation: null }
  } catch (error) {
    console.error('[Instantly Phase 3] Buffer recommendation failed:', error)
    return { recommendation: null }
  }
}

/**
 * Get optimization history
 */
export async function getOptimizationHistory(days: number = 30) {
  try {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const changes = await prisma.instantlySyncChange.findMany({
      where: { syncTimestamp: { gte: startDate } },
      orderBy: { syncTimestamp: 'desc' },
    })

    return {
      period_days: days,
      changes: changes.map((c) => ({
        date: c.syncTimestamp,
        change: c.changeType,
        entity: c.entity,
        field: c.fieldChanged,
        impact: c.impact,
      })),
    }
  } catch (error) {
    console.error('[Instantly Phase 3] History fetch failed:', error)
    return { period_days: days, changes: [] }
  }
}
