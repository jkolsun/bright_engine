/**
 * Instantly Integration — Core Drip Feed Algorithm
 * Daily capacity calculation + lead pushing + full email sequences
 */

import { prisma } from './db'

const INSTANTLY_API_BASE = 'https://api.instantly.ai/api/v2'
const SAFETY_BUFFER = 0.85 // Only tunable config — conservative margin

// ============================================
// EMAIL SEQUENCES — From Operating Manual
// Campaign A: Bad Website | Campaign B: No Website
// Variables: {{first_name}}, {{company_name}}, {{preview_url}}, {{industry}}, {{location}}
// ============================================

const SEQUENCE_A_BAD_WEBSITE = [
  {
    delay: 0,
    subject: "{{company_name}}'s website",
    body: `Hey {{first_name}},

I came across {{company_name}} and pulled up your site. Looks like it could use a refresh — not loading great on mobile and the design is dated.

That matters because 70% of people searching for {{industry}} services are on their phone. If your site doesn't look right, they're calling your competitor.

I actually already mocked up what a new site would look like for {{company_name}}: {{preview_url}}

$149 to make it live. No contracts, no hassle.

Andrew
Bright Automations`,
  },
  {
    delay: 2,
    subject: "Re: {{company_name}}'s website",
    body: `Hey {{first_name}},

Quick follow-up — did you get a chance to look at the preview I built for you? {{preview_url}}

The businesses we've built sites for are seeing more calls and form fills within the first week.

$149, live by {{delivery_date}}. Takes 10 minutes of your time.

Andrew`,
  },
  {
    delay: 2,
    subject: "Re: {{company_name}}'s website",
    body: `{{first_name}},

Just wrapped a site for a {{industry}} company in {{location}}. They got 3 new leads in the first week.

Your preview is still live: {{preview_url}} — but it expires in a few days.

$149 to make it permanent. I handle everything.

Andrew`,
  },
  {
    delay: 2,
    subject: "Re: {{company_name}}'s website",
    body: `Hey {{first_name}},

Your preview site expires tomorrow. If a $149 professional website isn't on your radar right now, no worries at all.

But if it ever is, just reply to this email and we'll rebuild it in 48 hours.

Good luck with {{company_name}}.

Andrew`,
  },
]

const SEQUENCE_B_NO_WEBSITE = [
  {
    delay: 0,
    subject: "Found {{company_name}} on Google but no website",
    body: `Hey {{first_name}},

I searched for {{industry}} in {{location}} and found {{company_name}} on Google Maps — but no website. Most people won't call a business with no site.

I put together a preview of what a site could look like for you: {{preview_url}}

$149 to go live with your own domain. You'd have a real site showing up on Google by this weekend.

Andrew
Bright Automations`,
  },
  {
    delay: 2,
    subject: "Re: Found {{company_name}} on Google but no website",
    body: `{{first_name}},

97% of people search online before hiring a local service company. Without a website, you're invisible to almost all of them.

Your preview is still live: {{preview_url}}

$149. We handle everything. No maintenance headaches.

Andrew`,
  },
  {
    delay: 2,
    subject: "Re: Found {{company_name}} on Google but no website",
    body: `{{first_name}},

I searched '{{industry}} in {{location}}' and the top 5 results all have sites with reviews and click-to-call. They're getting calls that should go to you.

Your preview expires in 2 days: {{preview_url}}

Reply 'yes' and I'll get started today. $149.

Andrew`,
  },
  {
    delay: 2,
    subject: "Re: Found {{company_name}} on Google but no website",
    body: `Hey {{first_name}},

Last note. Your preview expires today. If you ever want a website for {{company_name}}, just reply.

$149, 48 hours, we handle everything.

Good luck.

Andrew`,
  },
]

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
    // Extract step delays from campaign config
    const campaignStepDelays = campaign.step_delays?.map((s: any) => s.delay_days) || undefined
    const followupEstimate = await estimateFollowupsToday(campaign.id, campaignStepDelays)

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
async function estimateFollowupsToday(campaignId: string, stepDelays?: number[]): Promise<number> {
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

    // Build cumulative day schedule from actual delays
    // Default: [0, 2, 4, 6] for a 4-step sequence with 2-day gaps
    const delays = stepDelays || [0, 2, 2, 2]
    const cumulativeDays: number[] = []
    let cumulative = 0
    for (const d of delays) {
      cumulative += d
      cumulativeDays.push(cumulative)
    }
    // cumulativeDays = [0, 2, 4, 6] for delays [0, 2, 2, 2]
    if (cumulativeDays.includes(daysSinceAdded)) {
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

    // Push leads to Instantly V2 bulk add endpoint (Bearer auth, batch)
    let totalPushed = 0

    try {
      const pushableLeads = leadsToPush.filter(lead => lead.email)

      // Format leads for V2 bulk add
      const formattedLeads = pushableLeads.map((lead) => {
        const deliveryDate = new Date()
        deliveryDate.setDate(deliveryDate.getDate() + 3)
        const deliveryStr = deliveryDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

        let personalizationLine = ''
        try {
          const p = typeof lead.personalization === 'string' ? JSON.parse(lead.personalization) : lead.personalization
          personalizationLine = p?.firstLine || ''
        } catch { personalizationLine = lead.personalization || '' }

        return {
          email: lead.email,
          first_name: lead.firstName || '',
          last_name: lead.lastName || '',
          company_name: lead.companyName || '',
          website: lead.website || '',
          phone: lead.phone || '',
          personalization: personalizationLine,
          custom_variables: {
            preview_url: lead.previewUrl || '',
            industry: formatIndustry(lead.industry) || 'home service',
            location: [lead.city, lead.state].filter(Boolean).join(', ') || '',
            delivery_date: deliveryStr,
          },
        }
      })

      // Push in batches of 1000 (V2 bulk limit)
      const BATCH_LIMIT = 1000
      const successIds: string[] = []

      for (let i = 0; i < formattedLeads.length; i += BATCH_LIMIT) {
        const batch = formattedLeads.slice(i, i + BATCH_LIMIT)
        const batchLeadIds = pushableLeads.slice(i, i + BATCH_LIMIT).map(l => l.id)

        const response = await fetch('https://api.instantly.ai/api/v2/leads/add', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            campaign_id: campaignId,
            skip_if_in_workspace: false,
            skip_if_in_campaign: false,
            leads: batch,
          }),
        })

        if (!response.ok) {
          const errBody = await response.text()
          console.error(`[Instantly] Campaign ${campaignId} batch push failed: ${response.status} — ${errBody.substring(0, 300)}`)
          continue
        }

        const result = await response.json()
        console.log(`[Instantly] Campaign ${campaignId} batch result:`, JSON.stringify(result))

        totalPushed += batch.length
        successIds.push(...batchLeadIds)
      }

      // Update successful leads in database
      if (successIds.length > 0) {
        await prisma.lead.updateMany({
          where: { id: { in: successIds } },
          data: {
            instantlyStatus: 'IN_SEQUENCE',
            instantlyAddedDate: new Date(),
            instantlyCurrentStep: 1,
            instantlyCampaignId: campaignId,
          },
        })
      }

      results[campaignId] = {
        pushed: totalPushed,
        reason: totalPushed > 0 ? 'Successfully pushed' : 'All leads failed to push',
      }

      console.log(`[Instantly] Campaign ${campaignId}: pushed ${totalPushed}/${leadsToPush.length} leads`)
    } catch (error) {
      console.error(`[Instantly] Campaign ${campaignId}: push failed`, error)
      results[campaignId] = {
        pushed: totalPushed,
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

  // Look up stored campaign IDs to determine A vs B
  const campaignSettings = await prisma.settings.findUnique({
    where: { key: 'instantly_campaigns' },
  })
  const storedCampaigns = campaignSettings?.value as any

  try {
    // Log to drip_log
    for (const [campaignId, calc] of Object.entries(calculations)) {
      const calcData = calc as any
      const campaignLabel = storedCampaigns?.campaign_a === campaignId ? 'A' : 'B'
      await prisma.instantlyDripLog.create({
        data: {
          date: new Date(),
          campaign: campaignLabel,
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

        // ── CLOSE ENGINE TRIGGER ──
        if (sentiment === 'positive' || sentiment === 'question') {
          if (lead.phone) {
            try {
              const { triggerCloseEngine } = await import('./close-engine')
              const result = await triggerCloseEngine({
                leadId: lead.id,
                entryPoint: 'INSTANTLY_REPLY',
              })

              if (result.success) {
                console.log(`[Instantly] Close Engine triggered for ${email} (${sentiment}), conversation: ${result.conversationId}`)

                await prisma.leadEvent.create({
                  data: {
                    leadId: lead.id,
                    eventType: 'CLOSE_ENGINE_TRIGGERED',
                    metadata: {
                      entryPoint: 'INSTANTLY_REPLY',
                      sentiment,
                      emailBody: body?.substring(0, 200),
                    },
                  },
                })
              }
            } catch (err) {
              console.error('[Instantly] Close Engine trigger failed:', err)
              // Don't fail the webhook if Close Engine fails
            }
          } else {
            console.warn(`[Instantly] Lead ${email} replied positively but has no phone number`)
            await prisma.notification.create({
              data: {
                type: 'HOT_LEAD',
                title: 'Positive Reply — No Phone Number',
                message: `${lead.firstName} at ${lead.companyName} replied to email but has no phone. Manual follow-up needed.`,
                metadata: { leadId: lead.id, email, sentiment, source: 'instantly_reply' },
              },
            })
          }
        }
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
        // Track email opens
        await prisma.leadEvent.create({
          data: {
            leadId: lead.id,
            eventType: 'EMAIL_OPENED',
            actor: 'system',
            metadata: { source: 'instantly', campaign_id },
          },
        })
        // Update outbound event if exists
        await prisma.outboundEvent.updateMany({
          where: { leadId: lead.id, channel: 'INSTANTLY', openedAt: null },
          data: { status: 'OPENED', openedAt: new Date() },
        })
        console.log(`[Instantly] Lead ${email} opened email`)
        break

      case 'link_clicked':
        // Track link clicks — likely preview URL click
        await prisma.leadEvent.create({
          data: {
            leadId: lead.id,
            eventType: 'PREVIEW_VIEWED',
            actor: 'system',
            metadata: { source: 'instantly', campaign_id, click_url: body },
          },
        })
        // Update outbound event
        await prisma.outboundEvent.updateMany({
          where: { leadId: lead.id, channel: 'INSTANTLY', clickedAt: null },
          data: { status: 'CLICKED', clickedAt: new Date() },
        })
        // Check for hot lead promotion (clicked preview = high engagement)
        if (lead.status === 'NEW' || lead.status === 'BUILDING') {
          await prisma.lead.update({
            where: { id: lead.id },
            data: { status: 'HOT_LEAD', priority: 'HOT' },
          })
          // Create hot lead notification
          await prisma.notification.create({
            data: {
              type: 'HOT_LEAD',
              title: `Preview Clicked: ${lead.companyName}`,
              message: `${lead.firstName} at ${lead.companyName} clicked their preview link from Instantly campaign. Follow up ASAP.`,
              metadata: { leadId: lead.id, source: 'instantly_click' },
            },
          })
        }
        console.log(`[Instantly] Lead ${email} clicked link (likely preview)`)
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
 * Format industry slug into human-readable text for email merge tags
 */
function formatIndustry(industry: string): string {
  const map: Record<string, string> = {
    RESTORATION: 'restoration',
    WATER_DAMAGE: 'water damage restoration',
    ROOFING: 'roofing',
    PLUMBING: 'plumbing',
    HVAC: 'HVAC',
    PAINTING: 'painting',
    LANDSCAPING: 'landscaping',
    ELECTRICAL: 'electrical',
    GENERAL_CONTRACTING: 'general contracting',
    CLEANING: 'cleaning',
    PEST_CONTROL: 'pest control',
    CONSTRUCTION: 'construction',
  }
  return map[industry] || industry.toLowerCase().replace(/_/g, ' ')
}

/**
 * Classify reply sentiment (simple heuristic)
 */
function classifyReplySentiment(text: string): string {
  if (!text) return 'neutral'

  const text_lower = text.toLowerCase()

  // Negative keywords — check first since "not interested" contains "interested"
  // Use word boundaries to avoid false positives ("no" matching "know", "notice", etc.)
  if (/\bnot interested\b|\bno thanks\b|\bno thank you\b|\bnot right now\b|\bremove me\b|\bunsubscribe\b|\bstop\b|\bspam\b|\bnope\b|\bdon't\b|\bno\b/i.test(text_lower)) {
    return 'negative'
  }

  // Positive keywords
  if (/\binterested\b|\bgreat\b|\byes\b|\blet's\b|\bsounds good\b|\bperfect\b|\blove\b|\btell me more\b|\bsign me up\b/i.test(text_lower)) {
    return 'positive'
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

    // Check if campaigns already exist in Settings table
    const existing = await prisma.settings.findUnique({
      where: { key: 'instantly_campaigns' },
    })

    if (existing) {
      console.log('[Instantly] Campaigns already created:', existing.value)
      return
    }

    console.log('[Instantly] Creating Campaign A & B in Instantly...')

    // Create Campaign A — Bad Website sequence (4 emails, 2 days apart)
    const campaignARes = await fetch(`${INSTANTLY_API_BASE}/campaigns`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Campaign A - Bad Website',
        description: 'Leads with bad or outdated websites — 4-email sequence with preview links',
        email_list: [],
        // KB settings: 8-11 AM local time, weekdays only, open tracking ON, link tracking OFF
        daily_limit: 150,
        send_window: { start: '08:00', end: '11:00' },
        timezone_mode: 'recipient', // Send in recipient's local timezone
        days_of_week: [1, 2, 3, 4, 5], // Mon-Fri only
        open_tracking: true,
        link_tracking: false,
        prioritize_new_leads: false,
        sequences: [
          {
            name: 'Bad Website Sequence',
            steps: SEQUENCE_A_BAD_WEBSITE.map((step) => ({
              delay: step.delay,
              subject: step.subject,
              body: step.body,
            })),
          },
        ],
      }),
    })

    let campaignAId: string | null = null
    let campaignBId: string | null = null

    if (campaignARes.ok) {
      const campaignAData = await campaignARes.json()
      campaignAId = campaignAData.id
      console.log('[Instantly] Campaign A created:', campaignAId)
    }

    // Create Campaign B — No Website sequence (4 emails, 2 days apart)
    const campaignBRes = await fetch(`${INSTANTLY_API_BASE}/campaigns`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Campaign B - No Website',
        description: 'Leads without websites — 4-email sequence with preview links',
        email_list: [],
        // KB settings: 8-11 AM local time, weekdays only, open tracking ON, link tracking OFF
        daily_limit: 150,
        send_window: { start: '08:00', end: '11:00' },
        timezone_mode: 'recipient',
        days_of_week: [1, 2, 3, 4, 5],
        open_tracking: true,
        link_tracking: false,
        prioritize_new_leads: false,
        sequences: [
          {
            name: 'No Website Sequence',
            steps: SEQUENCE_B_NO_WEBSITE.map((step) => ({
              delay: step.delay,
              subject: step.subject,
              body: step.body,
            })),
          },
        ],
      }),
    })

    if (campaignBRes.ok) {
      const campaignBData = await campaignBRes.json()
      campaignBId = campaignBData.id
      console.log('[Instantly] Campaign B created:', campaignBId)
    }

    // Store campaign IDs in Settings for future reference
    if (campaignAId || campaignBId) {
      await prisma.settings.upsert({
        where: { key: 'instantly_campaigns' },
        create: {
          key: 'instantly_campaigns',
          value: { campaign_a: campaignAId, campaign_b: campaignBId },
        },
        update: {
          value: { campaign_a: campaignAId, campaign_b: campaignBId },
        },
      })
    }
    
    console.log('[Instantly] Campaigns created and IDs stored:', { campaignAId, campaignBId })
  } catch (error) {
    console.error('[Instantly] Campaign creation failed:', error)
    // Don't throw — continue sync even if campaign creation fails
  }
}

/**
 * Auto-register webhook on first sync
 * Checks Settings table first to avoid duplicate registrations
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

    // Check if webhook already registered
    const existing = await prisma.settings.findUnique({
      where: { key: 'instantly_webhook' },
    })

    if (existing) {
      console.log('[Instantly] Webhook already registered:', (existing.value as any)?.webhook_id)
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
      // Store webhook ID so we don't re-register on every sync
      await prisma.settings.upsert({
        where: { key: 'instantly_webhook' },
        create: {
          key: 'instantly_webhook',
          value: { webhook_id: webhookData.id, url: webhookUrl, registered_at: new Date().toISOString() },
        },
        update: {
          value: { webhook_id: webhookData.id, url: webhookUrl, registered_at: new Date().toISOString() },
        },
      })
      console.log('[Instantly] Webhook registered:', webhookData.id)
    } else {
      console.warn('[Instantly] Webhook registration failed:', webhookRes.statusText)
    }
  } catch (error) {
    console.error('[Instantly] Webhook registration error:', error)
    // Don't throw — continue sync even if webhook registration fails
  }
}
