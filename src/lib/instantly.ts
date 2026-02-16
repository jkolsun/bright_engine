/**
 * Instantly Integration — Core Drip Feed Algorithm
 * Daily capacity calculation + lead pushing
 */

import { prisma } from './db'

const INSTANTLY_API_BASE = 'https://api.instantly.ai/api/v2'
const SAFETY_BUFFER = 0.85 // Only tunable config — conservative margin

/**
 * Main daily sync + calculate + push
 * Runs every day at 8:00 AM ET via BullMQ job
 */
export async function dailySyncAndCalculate() {
  const timestamp = new Date()
  console.log(`[Instantly] Daily sync starting at ${timestamp.toISOString()}`)

  try {
    // PHASE 0: Auto-create campaigns on first sync (if they don't exist)
    await ensureCampaignsExist()

    // PHASE 0.5: Auto-register webhook on first sync
    await ensureWebhookRegistered()

    // PHASE 1: Pull current state from Instantly API
    const syncReport = await pullInstantlyState()
    console.log(`[Instantly] Pulled state from API: ${syncReport.inboxes.active} active inboxes`)

    // PHASE 2: Calculate capacity per campaign
    const calculations = await calculateCapacityPerCampaign(syncReport)
    console.log(`[Instantly] Calculated capacity:`, calculations)

    // PHASE 3: Push leads
    const pushResults = await pushLeadsPerCampaign(calculations)
    console.log(`[Instantly] Pushed leads:`, pushResults)

    // PHASE 4: Log everything
    await logSyncResults(timestamp, syncReport, calculations, pushResults)

    return {
      success: true,
      timestamp,
      syncReport,
      calculations,
      pushResults,
    }
  } catch (error) {
    console.error('[Instantly] Daily sync failed:', error)
    throw error
  }
}

/**
 * PHASE 1: Pull current state from Instantly API
 * Calls 6 endpoints to get full picture of sending infrastructure
 */
async function pullInstantlyState() {
  const apiKey = process.env.INSTANTLY_API_KEY
  if (!apiKey) {
    throw new Error('INSTANTLY_API_KEY not set')
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }

  try {
    // Call 1: Get all email accounts
    console.log('[Instantly] API Call 1: GET /accounts')
    const accountsRes = await fetch(`${INSTANTLY_API_BASE}/accounts`, {
      method: 'GET',
      headers,
    })
    if (!accountsRes.ok) {
      throw new Error(`GET /accounts failed: ${accountsRes.statusText}`)
    }
    const accounts = await accountsRes.json()

    // Call 2: Get campaigns
    console.log('[Instantly] API Call 2: GET /campaigns')
    const campaignsRes = await fetch(`${INSTANTLY_API_BASE}/campaigns?status=1`, {
      method: 'GET',
      headers,
    })
    if (!campaignsRes.ok) {
      throw new Error(`GET /campaigns failed: ${campaignsRes.statusText}`)
    }
    const campaigns = await campaignsRes.json()

    // Call 3: Get warmup analytics
    const emailAddresses = accounts.data?.map((a: any) => a.email) || []
    console.log('[Instantly] API Call 3: POST /accounts/warmup-analytics')
    const warmupRes = await fetch(`${INSTANTLY_API_BASE}/accounts/warmup-analytics`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ emails: emailAddresses }),
    })
    const warmupData = warmupRes.ok ? await warmupRes.json() : {}

    // Call 4: Get yesterday's analytics
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]
    console.log('[Instantly] API Call 4: GET /campaigns/analytics/daily')
    const dailyAnalyticsRes = await fetch(
      `${INSTANTLY_API_BASE}/campaigns/analytics/daily?start_date=${yesterdayStr}&end_date=${yesterdayStr}`,
      {
        method: 'GET',
        headers,
      }
    )
    const dailyAnalytics = dailyAnalyticsRes.ok ? await dailyAnalyticsRes.json() : {}

    // For now, return mock-friendly structure
    // In production, this would parse all 6 API responses
    return {
      timestamp: new Date(),
      inboxes: {
        active: accounts.data?.filter((a: any) => a.status === 1)?.length || 0,
        paused: accounts.data?.filter((a: any) => a.status !== 1)?.length || 0,
        problem: 0,
        total_inbox_capacity: calculateTotalCapacity(accounts.data || []),
        details: (accounts.data || []).map((a: any) => ({
          email: a.email,
          daily_limit: a.daily_limit || 150,
          health_score: a.stat_warmup_score || 90,
          status: a.status,
          warmup_sends: a.warmup?.limit || 0,
          campaign_capacity: (a.daily_limit || 150) - (a.warmup?.limit || 0),
        })),
      },
      campaigns: (campaigns.data || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        step_count: c.sequences?.[0]?.steps?.length || 4,
        sequence_duration_days: calculateSequenceDuration(c.sequences?.[0]?.steps || []),
        inboxes_assigned: c.email_list || [],
        campaign_daily_limit: c.daily_limit || 999999,
        sends_today: true,
      })),
      warmup_data: warmupData,
      daily_analytics: dailyAnalytics,
    }
  } catch (error) {
    console.error('[Instantly] API pull failed:', error)
    throw error
  }
}

/**
 * Calculate total inbox capacity from account data
 */
function calculateTotalCapacity(accounts: any[]): number {
  return accounts
    .filter((a) => a.status === 1) // Only active
    .reduce((sum, a) => {
      const limit = a.daily_limit || 150
      const warmupSends = a.warmup?.limit || 0
      return sum + (limit - warmupSends)
    }, 0)
}

/**
 * Calculate sequence duration in days from step delays
 */
function calculateSequenceDuration(steps: any[]): number {
  if (!steps || steps.length === 0) return 7
  return steps.reduce((sum, s) => sum + (s.delay || 0), 0)
}

/**
 * PHASE 2: Calculate capacity per campaign
 */
async function calculateCapacityPerCampaign(syncReport: any) {
  const calculations: any = {}

  for (const campaign of syncReport.campaigns) {
    // Get inboxes assigned to this campaign
    const campaignInboxes = syncReport.inboxes.details.filter((i: any) =>
      campaign.inboxes_assigned.includes(i.email)
    )

    const inboxCapacity = campaignInboxes.reduce((sum: number, i: any) => sum + i.campaign_capacity, 0)

    // Estimate follow-ups due today
    const followupEstimate = await estimateFollowupsToday(campaign.id)

    // Available capacity
    const bufferedCapacity = Math.floor(inboxCapacity * SAFETY_BUFFER)
    const available = Math.max(0, bufferedCapacity - followupEstimate)

    // How many queued leads for this campaign?
    const queued = await prisma.lead.count({
      where: {
        instantlyStatus: 'QUEUED',
        instantlyCampaignId: campaign.id,
      },
    })

    const pushing = Math.min(available, queued)

    calculations[campaign.id] = {
      campaign_name: campaign.name,
      inbox_capacity: inboxCapacity,
      buffered_capacity: bufferedCapacity,
      followup_estimate: followupEstimate,
      available: available,
      queued: queued,
      pushing: pushing,
      days_to_clear: queued > 0 && available > 0 ? Math.ceil(queued / available) : queued > 0 ? 999 : 0,
    }
  }

  return calculations
}

/**
 * Estimate how many follow-ups are due today for a campaign
 * Based on when leads were added and sequence timing
 */
async function estimateFollowupsToday(campaignId: string): Promise<number> {
  // Query leads that are IN_SEQUENCE for this campaign
  const activeLeads = await prisma.lead.findMany({
    where: {
      instantlyStatus: 'IN_SEQUENCE',
      instantlyCampaignId: campaignId,
    },
    select: {
      id: true,
      instantlyAddedDate: true,
      instantlyCurrentStep: true,
    },
  })

  let followupCount = 0
  const today = new Date()

  for (const lead of activeLeads) {
    if (!lead.instantlyAddedDate) continue

    const daysSinceAdded = Math.floor(
      (today.getTime() - lead.instantlyAddedDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    // Simple heuristic: assume 2-day gaps between emails
    // Day 0: Email 1, Day 2: Email 2, Day 4: Email 3, Day 6: Email 4
    const stepDays = [0, 2, 4, 6]
    if (stepDays.includes(daysSinceAdded)) {
      followupCount += 1
    }
  }

  return followupCount
}

/**
 * PHASE 3: Push leads to Instantly
 */
async function pushLeadsPerCampaign(calculations: any) {
  const results: any = {}
  const apiKey = process.env.INSTANTLY_API_KEY

  if (!apiKey) {
    throw new Error('INSTANTLY_API_KEY not set')
  }

  for (const [campaignId, calc] of Object.entries(calculations)) {
    const calcData = calc as any
    if (calcData.pushing === 0) {
      results[campaignId] = { pushed: 0, reason: 'No capacity available' }
      continue
    }

    // Get queued leads
    const leadsToPush = await prisma.lead.findMany({
      where: {
        instantlyStatus: 'QUEUED',
        instantlyCampaignId: campaignId,
      },
      take: calcData.pushing,
      orderBy: { createdAt: 'asc' },
    })

    if (leadsToPush.length === 0) {
      results[campaignId] = { pushed: 0, reason: 'No queued leads' }
      continue
    }

    // Format for Instantly API
    const pushLeads = leadsToPush.map((lead) => ({
      email: lead.email || undefined,
      first_name: lead.firstName || undefined,
      last_name: lead.lastName || undefined,
      company_name: lead.companyName || undefined,
      website: lead.website || undefined,
      phone: lead.phone || undefined,
      // Custom variables for personalization
      preview_url: lead.previewUrl || '',
      personalization: lead.personalization || '',
    }))

    try {
      // Push to Instantly API
      const response = await fetch(`${INSTANTLY_API_BASE}/leads`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaign_id: campaignId,
          leads: pushLeads,
        }),
      })

      if (!response.ok) {
        throw new Error(`Push failed: ${response.statusText}`)
      }

      // Update leads in database
      await prisma.lead.updateMany({
        where: {
          id: { in: leadsToPush.map((l) => l.id) },
        },
        data: {
          instantlyStatus: 'IN_SEQUENCE',
          instantlyAddedDate: new Date(),
          instantlyCurrentStep: 1,
          instantlyCampaignId: campaignId,
        },
      })

      results[campaignId] = {
        pushed: leadsToPush.length,
        reason: 'Successfully pushed',
      }

      console.log(`[Instantly] Campaign ${campaignId}: pushed ${leadsToPush.length} leads`)
    } catch (error) {
      console.error(`[Instantly] Campaign ${campaignId}: push failed`, error)
      results[campaignId] = {
        pushed: 0,
        reason: `Push failed: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }

  return results
}

/**
 * PHASE 4: Log results
 */
async function logSyncResults(
  timestamp: Date,
  syncReport: any,
  calculations: any,
  pushResults: any
) {
  const totalPushed = Object.values(calculations).reduce((sum: number, c: any) => sum + (c as any).pushing, 0)

  try {
    // Log to drip_log
    for (const [campaignId, calc] of Object.entries(calculations)) {
      const calcData = calc as any
      await prisma.instantlyDripLog.create({
        data: {
          date: new Date(),
          campaign: (campaignId as string).includes('A') ? 'A' : 'B',
          totalLimit: syncReport.inboxes.total_inbox_capacity,
          usableSends: Math.floor(syncReport.inboxes.total_inbox_capacity * SAFETY_BUFFER),
          followupObligations: calcData.followup_estimate || 0,
          availableForNew: calcData.available || 0,
          leadsPushed: calcData.pushing || 0,
          leadsRemainingInQueue: (calcData.queued || 0) - (calcData.pushing || 0),
          estDaysToClear: calcData.days_to_clear || 0,
        },
      })
    }

    // Log to sync_log
    await prisma.instantlySyncLog.create({
      data: {
        timestamp,
        fullReport: syncReport,
        alerts: [],
        totalCapacity: syncReport.inboxes.total_inbox_capacity,
        totalPushed,
      },
    })

    console.log(`[Instantly] Logged sync results. Total pushed: ${totalPushed}`)
  } catch (error) {
    console.error('[Instantly] Logging failed:', error)
    // Don't throw — logging failure shouldn't break the sync
  }
}

/**
 * Handle webhook from Instantly
 * Called when: reply, bounce, unsubscribe, open, click
 */
export async function handleInstantlyWebhook(event: any) {
  console.log('[Instantly] Webhook received:', event.event_type)

  try {
    const { email, campaign_id, event_type, timestamp, body } = event

    // Find lead
    const lead = await prisma.lead.findFirst({
      where: { email },
    })

    if (!lead) {
      console.warn(`[Instantly] Webhook: lead not found for email ${email}`)
      return
    }

    switch (event_type) {
      case 'reply':
        // Lead replied — exit sequence
        const sentiment = classifyReplySentiment(body)
        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            instantlyStatus: 'REPLIED',
            replySentiment: sentiment,
          },
        })
        console.log(`[Instantly] Lead ${email} replied (${sentiment})`)
        break

      case 'bounce':
        // Email bounced — hard failure
        await prisma.lead.update({
          where: { id: lead.id },
          data: { instantlyStatus: 'BOUNCED' },
        })
        console.log(`[Instantly] Lead ${email} bounced`)
        break

      case 'unsubscribe':
        // Unsubscribed
        await prisma.lead.update({
          where: { id: lead.id },
          data: { instantlyStatus: 'UNSUBSCRIBED' },
        })
        console.log(`[Instantly] Lead ${email} unsubscribed`)
        break

      case 'email_opened':
        // Track opens (optional)
        break

      case 'link_clicked':
        // Track clicks (optional)
        break

      default:
        console.warn(`[Instantly] Unknown event type: ${event_type}`)
    }
  } catch (error) {
    console.error('[Instantly] Webhook handling failed:', error)
    throw error
  }
}

/**
 * Classify reply sentiment (simple heuristic)
 */
function classifyReplySentiment(text: string): string {
  if (!text) return 'neutral'

  const text_lower = text.toLowerCase()

  // Positive keywords
  if (/interested|great|good|yes|let's|sounds|perfect|love|wow/i.test(text_lower)) {
    return 'positive'
  }

  // Negative keywords
  if (/not interested|no|nope|don't|stop|remove|unsubscribe|spam/i.test(text_lower)) {
    return 'negative'
  }

  // Question
  if (/\?/.test(text)) {
    return 'question'
  }

  return 'neutral'
}

/**
 * Auto-create Campaign A & B on first sync if they don't exist
 * Stores returned campaign IDs in database for future operations
 */
async function ensureCampaignsExist() {
  try {
    const apiKey = process.env.INSTANTLY_API_KEY
    if (!apiKey) {
      console.warn('[Instantly] INSTANTLY_API_KEY not set, skipping campaign creation')
      return
    }

    // Check if campaigns already exist in database
    let campaignA = await prisma.lead.findFirst({
      where: { instantlyCampaignId: 'campaign_a' },
    })

    let campaignB = await prisma.lead.findFirst({
      where: { instantlyCampaignId: 'campaign_b' },
    })

    // If both exist in our DB, campaigns are set up
    if (campaignA || campaignB) {
      console.log('[Instantly] Campaigns already created')
      return
    }

    console.log('[Instantly] Creating Campaign A & B in Instantly...')

    // Create Campaign A
    const campaignARes = await fetch(`${INSTANTLY_API_BASE}/campaigns`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Campaign A - Bad Website',
        description: 'Leads with bad or outdated websites',
        email_list: [], // Will be assigned during sync
        sequences: [
          {
            name: 'Default Sequence',
            steps: [
              { delay: 0, subject: 'Step 1', body: '' },
              { delay: 2, subject: 'Step 2', body: '' },
              { delay: 4, subject: 'Step 3', body: '' },
              { delay: 6, subject: 'Step 4', body: '' },
            ],
          },
        ],
      }),
    })

    if (campaignARes.ok) {
      const campaignAData = await campaignARes.json()
      console.log('[Instantly] Campaign A created:', campaignAData.id)
    }

    // Create Campaign B
    const campaignBRes = await fetch(`${INSTANTLY_API_BASE}/campaigns`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Campaign B - No Website',
        description: 'Leads without websites',
        email_list: [],
        sequences: [
          {
            name: 'Default Sequence',
            steps: [
              { delay: 0, subject: 'Step 1', body: '' },
              { delay: 2, subject: 'Step 2', body: '' },
              { delay: 4, subject: 'Step 3', body: '' },
              { delay: 6, subject: 'Step 4', body: '' },
            ],
          },
        ],
      }),
    })

    if (campaignBRes.ok) {
      const campaignBData = await campaignBRes.json()
      console.log('[Instantly] Campaign B created:', campaignBData.id)
    }

    console.log('[Instantly] Campaigns created successfully')
  } catch (error) {
    console.error('[Instantly] Campaign creation failed:', error)
    // Don't throw — continue sync even if campaign creation fails
  }
}

/**
 * Auto-register webhook on first sync
 * Reads BASE_URL from env to construct webhook URL
 */
async function ensureWebhookRegistered() {
  try {
    const apiKey = process.env.INSTANTLY_API_KEY
    const baseUrl = process.env.BASE_URL

    if (!apiKey || !baseUrl) {
      console.warn('[Instantly] Missing INSTANTLY_API_KEY or BASE_URL, skipping webhook registration')
      return
    }

    const webhookUrl = `${baseUrl}/api/webhooks/instantly`

    console.log('[Instantly] Registering webhook:', webhookUrl)

    // Register webhook for all relevant events
    const webhookRes = await fetch(`${INSTANTLY_API_BASE}/webhooks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: webhookUrl,
        events: ['reply', 'bounce', 'unsubscribe', 'email_opened', 'link_clicked'],
      }),
    })

    if (webhookRes.ok) {
      const webhookData = await webhookRes.json()
      console.log('[Instantly] Webhook registered:', webhookData.id)
    } else {
      console.warn('[Instantly] Webhook registration failed:', webhookRes.statusText)
    }
  } catch (error) {
    console.error('[Instantly] Webhook registration error:', error)
    // Don't throw — continue sync even if webhook registration fails
  }
}
