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
 */
export async function getCampaignFunnelStats(): Promise<CampaignFunnelStats[]> {
  // Get campaign IDs from settings
  const campaignSettings = await prisma.settings.findUnique({
    where: { key: 'instantly_campaigns' },
  })

  const campaigns = campaignSettings?.value as any
  const campaignIds: { id: string; name: string }[] = []

  if (campaigns?.campaign_a) {
    campaignIds.push({ id: campaigns.campaign_a, name: 'Campaign A - Bad Website' })
  }
  if (campaigns?.campaign_b) {
    campaignIds.push({ id: campaigns.campaign_b, name: 'Campaign B - No Website' })
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
          name: c.instantlyCampaignId.includes('A') ? 'Campaign A' : 'Campaign B',
        })
      }
    }
  }

  const results: CampaignFunnelStats[] = []

  for (const campaign of campaignIds) {
    const where = { instantlyCampaignId: campaign.id }

    const [
      total,
      queued,
      inSequence,
      replied,
      repliedPositive,
      repliedNegative,
      repliedQuestion,
      bounced,
      unsubscribed,
      completed,
      paused,
    ] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.count({ where: { ...where, instantlyStatus: 'QUEUED' } }),
      prisma.lead.count({ where: { ...where, instantlyStatus: 'IN_SEQUENCE' } }),
      prisma.lead.count({ where: { ...where, instantlyStatus: 'REPLIED' } }),
      prisma.lead.count({ where: { ...where, instantlyStatus: 'REPLIED', replySentiment: 'positive' } }),
      prisma.lead.count({ where: { ...where, instantlyStatus: 'REPLIED', replySentiment: 'negative' } }),
      prisma.lead.count({ where: { ...where, instantlyStatus: 'REPLIED', replySentiment: 'question' } }),
      prisma.lead.count({ where: { ...where, instantlyStatus: 'BOUNCED' } }),
      prisma.lead.count({ where: { ...where, instantlyStatus: 'UNSUBSCRIBED' } }),
      prisma.lead.count({ where: { ...where, instantlyStatus: 'COMPLETED' } }),
      prisma.lead.count({ where: { ...where, instantlyStatus: 'PAUSED' } }),
    ])

    // Count email opens from LeadEvent table
    const emailsOpened = await prisma.leadEvent.count({
      where: {
        eventType: 'EMAIL_OPENED',
        lead: { instantlyCampaignId: campaign.id },
      },
    })

    // Count preview clicks from LeadEvent table (clicks from Instantly emails)
    const previewsClicked = await prisma.leadEvent.count({
      where: {
        eventType: 'PREVIEW_VIEWED',
        lead: { instantlyCampaignId: campaign.id },
      },
    })

    // Count converted (leads that became PAID)
    const convertedToPaid = await prisma.lead.count({
      where: {
        instantlyCampaignId: campaign.id,
        status: 'PAID',
      },
    })

    const sentLeads = total - queued // Leads actually sent (not just queued)
    const openRate = sentLeads > 0 ? emailsOpened / sentLeads : 0
    const previewClickRate = sentLeads > 0 ? previewsClicked / sentLeads : 0
    const replyRate = sentLeads > 0 ? replied / sentLeads : 0
    const positiveReplyRate = sentLeads > 0 ? repliedPositive / sentLeads : 0
    const conversionRate = replied > 0 ? convertedToPaid / replied : 0

    results.push({
      campaign_id: campaign.id,
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
      // KPI targets from the knowledge base
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
 */
export async function getPreviewEngagementStats(): Promise<PreviewEngagementStats> {
  const [
    totalGenerated,
    totalViewed,
    totalCtaClicks,
    totalCallClicks,
    totalReturnVisits,
  ] = await Promise.all([
    prisma.lead.count({ where: { previewUrl: { not: null } } }),
    prisma.leadEvent.count({ where: { eventType: 'PREVIEW_VIEWED' } }),
    prisma.leadEvent.count({ where: { eventType: 'PREVIEW_CTA_CLICKED' } }),
    prisma.leadEvent.count({ where: { eventType: 'PREVIEW_CALL_CLICKED' } }),
    prisma.leadEvent.count({ where: { eventType: 'PREVIEW_RETURN_VISIT' } }),
  ])

  // Count by source
  const fromInstantly = await prisma.leadEvent.count({
    where: {
      eventType: 'PREVIEW_VIEWED',
      metadata: { path: ['source'], equals: 'instantly' },
    },
  })

  // Hot leads generated from preview engagement
  const hotLeadsFromPreviews = await prisma.notification.count({
    where: {
      type: 'HOT_LEAD',
      metadata: { path: ['source'], equals: 'instantly_click' },
    },
  })

  return {
    total_previews_generated: totalGenerated,
    total_previews_viewed: totalViewed,
    total_cta_clicks: totalCtaClicks,
    total_call_clicks: totalCallClicks,
    total_return_visits: totalReturnVisits,
    avg_time_on_preview: null, // Tracked client-side, aggregated separately
    view_rate: totalGenerated > 0 ? totalViewed / totalGenerated : 0,
    cta_click_rate: totalViewed > 0 ? totalCtaClicks / totalViewed : 0,
    hot_leads_from_previews: hotLeadsFromPreviews,
    from_instantly: fromInstantly,
    from_cold_call: totalViewed - fromInstantly, // Approximate
    from_meta_ad: 0,
    from_other: 0,
  }
}

/**
 * Get personalization quality stats
 */
export async function getPersonalizationStats(): Promise<PersonalizationStats> {
  const [
    totalLeads,
    totalPersonalized,
    totalWithPreview,
    totalMissingPersonalization,
    totalMissingPreview,
  ] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { personalization: { not: null } } }),
    prisma.lead.count({ where: { previewUrl: { not: null } } }),
    prisma.lead.count({ where: { personalization: null } }),
    prisma.lead.count({ where: { previewUrl: null } }),
  ])

  return {
    total_personalized: totalPersonalized,
    total_with_preview_url: totalWithPreview,
    total_missing_personalization: totalMissingPersonalization,
    total_missing_preview: totalMissingPreview,
    personalization_coverage: totalLeads > 0 ? totalPersonalized / totalLeads : 0,
    preview_coverage: totalLeads > 0 ? totalWithPreview / totalLeads : 0,
    quality_breakdown: {
      high: 0,   // Would require parsing personalization metadata
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
  const [funnel, preview, personalization, recentDrips, recentSync] = await Promise.all([
    getCampaignFunnelStats(),
    getPreviewEngagementStats(),
    getPersonalizationStats(),
    prisma.instantlyDripLog.findMany({
      orderBy: { date: 'desc' },
      take: 14, // Last 2 weeks
    }),
    prisma.instantlySyncLog.findFirst({
      orderBy: { timestamp: 'desc' },
    }),
  ])

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
  }
}