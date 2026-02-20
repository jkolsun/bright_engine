/**
 * Instantly Campaign Stats — Preview & Personalization Performance
 * Correlates Instantly email campaigns with preview engagement data
 * This is how we measure: Email Sent → Opened → Preview Clicked → Replied → Converted
 */

import { prisma } from './db'

export interface CampaignFunnelStats {
  campaign_id: string
  campaign_name: string
  total_leads: number
  queued: number
  in_sequence: number
  emails_opened: number
  previews_clicked: number
  replied: number
  replied_positive: number
  replied_negative: number
  replied_question: number
  bounced: number
  unsubscribed: number
  completed: number
  converted_to_paid: number
  // Rates
  open_rate: number
  preview_click_rate: number
  reply_rate: number
  positive_reply_rate: number
  conversion_rate: number
  // Targets from knowledge base
  targets: {
    open_rate: { target: number; red_flag: number }
    reply_rate: { target: number; red_flag: number }
    preview_click_rate: { target: number; red_flag: number }
    positive_reply_rate: { target: number; red_flag: number }
  }
}

export interface PreviewEngagementStats {
  total_previews_generated: number
  total_previews_viewed: number
  total_cta_clicks: number
  total_call_clicks: number
  total_return_visits: number
  avg_time_on_preview: number | null
  view_rate: number
  cta_click_rate: number
  hot_leads_from_previews: number
  // By source
  from_instantly: number
  from_cold_call: number
  from_meta_ad: number
  from_other: number
}

export interface PersonalizationStats {
  total_personalized: number
  total_with_preview_url: number
  total_missing_personalization: number
  total_missing_preview: number
  personalization_coverage: number
  preview_coverage: number
  // Quality breakdown
  quality_breakdown: {
    high: number
    medium: number
    low: number
    fallback: number
  }
}

/**
 * Get full funnel stats for each Instantly campaign
 * Optimized: uses groupBy to batch counts into 1-2 queries instead of 14 per campaign
 */
export async function getCampaignFunnelStats(): Promise<CampaignFunnelStats[]> {
  // Get campaign IDs from settings
  const campaignSettings = await prisma.settings.findUnique({
    where: { key: 'instantly_campaigns' },
  })

  const campaigns = campaignSettings?.value as Record<string, string> | null
  const campaignIds: { id: string; name: string }[] = []

  // Load ALL campaigns from settings (not just campaign_a/campaign_b)
  if (campaigns && typeof campaigns === 'object') {
    for (const [key, id] of Object.entries(campaigns)) {
      if (id && typeof id === 'string') {
        const name = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        campaignIds.push({ id, name })
      }
    }
  }

  // If no campaigns stored, try to find any leads with campaign IDs
  if (campaignIds.length === 0) {
    const uniqueCampaigns = await prisma.lead.findMany({
      where: { instantlyCampaignId: { not: null } },
      select: { instantlyCampaignId: true },
      distinct: ['instantlyCampaignId'],
    })
    for (const c of uniqueCampaigns) {
      if (c.instantlyCampaignId) {
        campaignIds.push({
          id: c.instantlyCampaignId,
          name: `Campaign (${c.instantlyCampaignId.slice(0, 8)})`,
        })
      }
    }
  }

  if (campaignIds.length === 0) return []

  const allCampaignIds = campaignIds.map(c => c.id)

  // Batch: get all status counts across all campaigns in ONE groupBy query (4 queries instead of 14+ per campaign)
  const [statusCounts, sentimentCounts, eventCounts, paidCounts] = await Promise.all([
    prisma.lead.groupBy({
      by: ['instantlyCampaignId', 'instantlyStatus'],
      where: { instantlyCampaignId: { in: allCampaignIds } },
      _count: { _all: true },
    }),
    prisma.lead.groupBy({
      by: ['instantlyCampaignId', 'replySentiment'],
      where: { instantlyCampaignId: { in: allCampaignIds }, instantlyStatus: 'REPLIED' },
      _count: { _all: true },
    }),
    prisma.leadEvent.groupBy({
      by: ['eventType'],
      where: {
        eventType: { in: ['EMAIL_OPENED' as const, 'PREVIEW_VIEWED' as const] },
        lead: { instantlyCampaignId: { in: allCampaignIds } },
      },
      _count: { _all: true },
    }),
    prisma.lead.groupBy({
      by: ['instantlyCampaignId'],
      where: { instantlyCampaignId: { in: allCampaignIds }, status: 'PAID' },
      _count: { _all: true },
    }),
  ])

  // Build lookup maps
  const getStatusCount = (campaignId: string, status: string) =>
    statusCounts.find(s => s.instantlyCampaignId === campaignId && s.instantlyStatus === status)?._count._all ?? 0

  const getSentimentCount = (campaignId: string, sentiment: string) =>
    sentimentCounts.find(s => s.instantlyCampaignId === campaignId && s.replySentiment === sentiment)?._count._all ?? 0

  const emailsOpenedTotal = eventCounts.find(e => e.eventType === 'EMAIL_OPENED')?._count._all ?? 0
  const previewsClickedTotal = eventCounts.find(e => e.eventType === 'PREVIEW_VIEWED')?._count._all ?? 0

  const results: CampaignFunnelStats[] = []

  for (const campaign of campaignIds) {
    const cid = campaign.id
    const total = statusCounts
      .filter(s => s.instantlyCampaignId === cid)
      .reduce((sum, s) => sum + s._count._all, 0)
    const queued = getStatusCount(cid, 'QUEUED')
    const inSequence = getStatusCount(cid, 'IN_SEQUENCE')
    const replied = getStatusCount(cid, 'REPLIED')
    const bounced = getStatusCount(cid, 'BOUNCED')
    const unsubscribed = getStatusCount(cid, 'UNSUBSCRIBED')
    const completed = getStatusCount(cid, 'COMPLETED')
    const repliedPositive = getSentimentCount(cid, 'positive')
    const repliedNegative = getSentimentCount(cid, 'negative')
    const repliedQuestion = getSentimentCount(cid, 'question')
    const convertedToPaid = paidCounts.find(p => p.instantlyCampaignId === cid)?._count._all ?? 0

    // Distribute event counts proportionally if multiple campaigns
    const totalAllCampaigns = statusCounts.reduce((s, x) => s + x._count._all, 0)
    const campaignShare = total > 0 && totalAllCampaigns > 0 ? total / totalAllCampaigns : 0
    const emailsOpened = campaignIds.length === 1 ? emailsOpenedTotal : Math.round(emailsOpenedTotal * campaignShare)
    const previewsClicked = campaignIds.length === 1 ? previewsClickedTotal : Math.round(previewsClickedTotal * campaignShare)

    const sentLeads = total - queued
    const openRate = sentLeads > 0 ? emailsOpened / sentLeads : 0
    const previewClickRate = emailsOpened > 0 ? previewsClicked / emailsOpened : 0
    const replyRate = sentLeads > 0 ? replied / sentLeads : 0
    const positiveReplyRate = sentLeads > 0 ? repliedPositive / sentLeads : 0
    const conversionRate = replied > 0 ? convertedToPaid / replied : 0

    results.push({
      campaign_id: cid,
      campaign_name: campaign.name,
      total_leads: total,
      queued,
      in_sequence: inSequence,
      emails_opened: emailsOpened,
      previews_clicked: previewsClicked,
      replied,
      replied_positive: repliedPositive,
      replied_negative: repliedNegative,
      replied_question: repliedQuestion,
      bounced,
      unsubscribed,
      completed,
      converted_to_paid: convertedToPaid,
      open_rate: openRate,
      preview_click_rate: previewClickRate,
      reply_rate: replyRate,
      positive_reply_rate: positiveReplyRate,
      conversion_rate: conversionRate,
      targets: {
        open_rate: { target: 0.45, red_flag: 0.30 },
        reply_rate: { target: 0.035, red_flag: 0.01 },
        preview_click_rate: { target: 0.20, red_flag: 0.10 },
        positive_reply_rate: { target: 0.015, red_flag: 0.005 },
      },
    })
  }

  return results
}

/**
 * Get preview engagement stats across all leads
 * Optimized: uses groupBy to batch event counts into 1 query
 */
export async function getPreviewEngagementStats(): Promise<PreviewEngagementStats> {
  const previewEventTypes = [
    'PREVIEW_VIEWED' as const,
    'PREVIEW_CTA_CLICKED' as const,
    'PREVIEW_CALL_CLICKED' as const,
    'PREVIEW_RETURN_VISIT' as const,
  ]

  // 2 queries instead of 7
  const [totalGenerated, eventCounts] = await Promise.all([
    prisma.lead.count({ where: { previewUrl: { not: null } } }),
    prisma.leadEvent.groupBy({
      by: ['eventType'],
      where: { eventType: { in: previewEventTypes } },
      _count: { _all: true },
    }),
  ])

  const getCount = (type: string) => eventCounts.find(e => e.eventType === type)?._count?._all ?? 0
  const totalViewed = getCount('PREVIEW_VIEWED')
  const totalCtaClicks = getCount('PREVIEW_CTA_CLICKED')
  const totalCallClicks = getCount('PREVIEW_CALL_CLICKED')
  const totalReturnVisits = getCount('PREVIEW_RETURN_VISIT')

  return {
    total_previews_generated: totalGenerated,
    total_previews_viewed: totalViewed,
    total_cta_clicks: totalCtaClicks,
    total_call_clicks: totalCallClicks,
    total_return_visits: totalReturnVisits,
    avg_time_on_preview: null,
    view_rate: totalGenerated > 0 ? totalViewed / totalGenerated : 0,
    cta_click_rate: totalViewed > 0 ? totalCtaClicks / totalViewed : 0,
    hot_leads_from_previews: 0,
    from_instantly: 0,
    from_cold_call: totalViewed,
    from_meta_ad: 0,
    from_other: 0,
  }
}

/**
 * Get personalization quality stats
 * Optimized: 2 queries instead of 5 (total + personalized, total + preview are derivable)
 */
export async function getPersonalizationStats(): Promise<PersonalizationStats> {
  const [totalLeads, totalPersonalized, totalWithPreview] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { personalization: { not: null } } }),
    prisma.lead.count({ where: { previewUrl: { not: null } } }),
  ])

  const totalMissingPersonalization = totalLeads - totalPersonalized
  const totalMissingPreview = totalLeads - totalWithPreview

  return {
    total_personalized: totalPersonalized,
    total_with_preview_url: totalWithPreview,
    total_missing_personalization: totalMissingPersonalization,
    total_missing_preview: totalMissingPreview,
    personalization_coverage: totalLeads > 0 ? totalPersonalized / totalLeads : 0,
    preview_coverage: totalLeads > 0 ? totalWithPreview / totalLeads : 0,
    quality_breakdown: {
      high: 0,
      medium: 0,
      low: 0,
      fallback: 0,
    },
  }
}

/**
 * Get combined stats for the dashboard — single call for everything
 */
export async function getInstantlyDashboardStats() {
  // Wrap each section so one failing table doesn't break the whole page
  const [funnel, preview, personalization] = await Promise.all([
    getCampaignFunnelStats().catch(() => [] as CampaignFunnelStats[]),
    getPreviewEngagementStats().catch(() => ({
      total_previews_generated: 0, total_previews_viewed: 0, total_cta_clicks: 0,
      total_call_clicks: 0, total_return_visits: 0, avg_time_on_preview: null,
      view_rate: 0, cta_click_rate: 0, hot_leads_from_previews: 0,
      from_instantly: 0, from_cold_call: 0, from_meta_ad: 0, from_other: 0,
    } as PreviewEngagementStats)),
    getPersonalizationStats().catch(() => ({
      total_personalized: 0, total_with_preview_url: 0,
      total_missing_personalization: 0, total_missing_preview: 0,
      personalization_coverage: 0, preview_coverage: 0,
      quality_breakdown: { high: 0, medium: 0, low: 0, fallback: 0 },
    } as PersonalizationStats)),
  ])

  // Check if API key is configured (for readiness indicator)
  const apiKeyConfigured = !!process.env.INSTANTLY_API_KEY

  // Check if campaigns are stored in settings (means API was successfully contacted)
  let campaignsStored = false
  try {
    const campaignSettings = await prisma.settings.findUnique({
      where: { key: 'instantly_campaigns' },
    })
    campaignsStored = !!campaignSettings
  } catch { /* settings table may not exist */ }

  // These tables may not exist yet — gracefully handle
  let recentDrips: any[] = []
  let recentSync: any = null
  try {
    recentDrips = await prisma.instantlyDripLog.findMany({
      orderBy: { date: 'desc' },
      take: 14,
    })
  } catch { /* table may not exist */ }
  try {
    recentSync = await prisma.instantlySyncLog.findFirst({
      orderBy: { timestamp: 'desc' },
    })
  } catch { /* table may not exist */ }

  // Calculate totals across campaigns
  const totalSent = funnel.reduce((sum, c) => sum + (c.total_leads - c.queued), 0)
  const totalReplied = funnel.reduce((sum, c) => sum + c.replied, 0)
  const totalPositive = funnel.reduce((sum, c) => sum + c.replied_positive, 0)
  const totalBounced = funnel.reduce((sum, c) => sum + c.bounced, 0)
  const totalConverted = funnel.reduce((sum, c) => sum + c.converted_to_paid, 0)
  const totalQueued = funnel.reduce((sum, c) => sum + c.queued, 0)

  return {
    // Top-level summary
    summary: {
      total_leads_in_instantly: funnel.reduce((sum, c) => sum + c.total_leads, 0),
      total_sent: totalSent,
      total_queued: totalQueued,
      total_replied: totalReplied,
      total_positive_replies: totalPositive,
      total_bounced: totalBounced,
      total_converted: totalConverted,
      overall_reply_rate: totalSent > 0 ? totalReplied / totalSent : 0,
      overall_positive_rate: totalSent > 0 ? totalPositive / totalSent : 0,
      overall_conversion_rate: totalReplied > 0 ? totalConverted / totalReplied : 0,
    },
    // Per-campaign funnel
    campaigns: funnel,
    // Preview engagement
    preview_engagement: preview,
    // Personalization quality
    personalization: personalization,
    // Recent capacity/drip data
    capacity_history: recentDrips.map((d) => ({
      date: d.date,
      campaign: d.campaign,
      capacity: d.totalLimit,
      usable: d.usableSends,
      followups: d.followupObligations,
      available: d.availableForNew,
      pushed: d.leadsPushed,
      remaining: d.leadsRemainingInQueue,
    })),
    // Last sync info
    last_sync: recentSync ? {
      timestamp: recentSync.timestamp,
      total_capacity: recentSync.totalCapacity,
      total_pushed: recentSync.totalPushed,
    } : null,
    // API connection status (for readiness check — doesn't require a sync to have run)
    api_connected: apiKeyConfigured && campaignsStored,
    api_key_configured: apiKeyConfigured,
  }
}