/**
 * SMS Campaign Service — Core Business Logic
 *
 * Handles cold-text campaigns, drip sequences, phone lookups,
 * opt-in tracking, and send-window enforcement.
 *
 * All SMS sending goes through sendSMSViaProvider (which handles DNC
 * checks and database logging). Phone type lookups use the Twilio
 * Lookup V2 API via getTwilioClient().
 */

import { prisma } from '@/lib/db'
import { sendSMSViaProvider } from '@/lib/sms-provider'
import { getTwilioClient } from '@/lib/twilio'
import type {
  SmsCampaign,
  SmsCampaignLead,
  Lead,
  SmsMessageType,
} from '@prisma/client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SmsCampaignLeadWithLead = SmsCampaignLead & { lead: Lead }

interface SendColdTextResult {
  success?: boolean
  skipped?: boolean
  reason?: string
  sid?: string
  error?: string
}

interface DripStepResult {
  success?: boolean
  delayed?: boolean
  delayMs?: number
  skipped?: boolean
  reason?: string
}

interface DripTemplate {
  step: number
  dayOffset: number
  template: string
}

interface SendWindow {
  startHour: number
  endHour: number
  days: string[]
}

// ---------------------------------------------------------------------------
// 1. createCampaign
// ---------------------------------------------------------------------------

export async function createCampaign(params: {
  name: string
  templateBody: string
  fromNumber?: string
  leadIds: string[]
}): Promise<SmsCampaign> {
  // Deduplicate to prevent @@unique constraint violations
  const uniqueLeadIds = [...new Set(params.leadIds)]
  let fromNumber = params.fromNumber

  // Resolve fromNumber from Settings or env if not provided
  if (!fromNumber) {
    const setting = await prisma.settings.findUnique({ where: { key: 'sms_from_number' } })
    fromNumber = (setting?.value as string) || process.env.SMS_FROM_NUMBER || ''
  }

  const campaign = await prisma.smsCampaign.create({
    data: {
      name: params.name,
      templateBody: params.templateBody,
      fromNumber,
      status: 'DRAFT',
      totalLeads: uniqueLeadIds.length,
    },
  })

  // Create SmsCampaignLead records and update leads in a transaction
  await prisma.$transaction(
    uniqueLeadIds.map((leadId) =>
      prisma.smsCampaignLead.create({
        data: {
          campaignId: campaign.id,
          leadId,
          funnelStage: 'QUEUED',
        },
      })
    )
  )

  await prisma.$transaction(
    uniqueLeadIds.map((leadId) =>
      prisma.lead.update({
        where: { id: leadId },
        data: {
          lastSmsCampaignId: campaign.id,
          smsFunnelStage: 'QUEUED',
        },
      })
    )
  )

  return campaign
}

// ---------------------------------------------------------------------------
// 2. startCampaign
// ---------------------------------------------------------------------------

export async function startCampaign(campaignId: string): Promise<SmsCampaign> {
  const campaign = await prisma.smsCampaign.update({
    where: { id: campaignId },
    data: {
      status: 'SENDING',
      sendStartedAt: new Date(),
    },
  })

  const { addSmsCampaignJob } = await import('@/worker/queue')
  await addSmsCampaignJob('send-cold-texts', { campaignId })

  return campaign
}

// ---------------------------------------------------------------------------
// 3. pauseCampaign
// ---------------------------------------------------------------------------

export async function pauseCampaign(campaignId: string): Promise<SmsCampaign> {
  return prisma.smsCampaign.update({
    where: { id: campaignId },
    data: { status: 'PAUSED' },
  })
}

// ---------------------------------------------------------------------------
// 4. lookupPhoneType
// ---------------------------------------------------------------------------

export async function lookupPhoneType(phone: string, leadId: string): Promise<string> {
  try {
    const client = getTwilioClient()
    const result = await client.lookups.v2.phoneNumbers(phone).fetch({
      fields: 'line_type_intelligence',
    })

    const rawType: string | undefined = (result as any).lineTypeIntelligence?.type

    // Normalize to our simplified set
    let normalized: string
    switch (rawType) {
      case 'mobile':
        normalized = 'mobile'
        break
      case 'landline':
        normalized = 'landline'
        break
      case 'fixedVoip':
      case 'nonFixedVoip':
        normalized = 'voip'
        break
      default:
        normalized = 'unknown'
    }

    // Persist to Lead
    await prisma.lead.update({
      where: { id: leadId },
      data: { phoneType: normalized },
    })

    return normalized
  } catch (err) {
    console.warn(`[SMS-CAMPAIGN] Phone type lookup failed for ${phone}:`, (err as Error).message)
    return 'unknown'
  }
}

// ---------------------------------------------------------------------------
// 5. sendColdTextToLead
// ---------------------------------------------------------------------------

export async function sendColdTextToLead(
  campaignLead: SmsCampaignLeadWithLead,
  campaign: SmsCampaign
): Promise<SendColdTextResult> {
  const { lead } = campaignLead

  // Phone type lookup if unknown — skip landlines
  if (!lead.phoneType) {
    const phoneType = await lookupPhoneType(lead.phone, lead.id)
    if (phoneType === 'landline') {
      await prisma.smsCampaignLead.update({
        where: { id: campaignLead.id },
        data: {
          funnelStage: 'ARCHIVED',
          archiveReason: 'landline',
          archivedAt: new Date(),
        },
      })
      return { skipped: true, reason: 'landline' }
    }
  }

  // Compliance: skip leads who opted out or are on DNC
  if (lead.smsOptedOutAt) {
    await prisma.smsCampaignLead.update({
      where: { id: campaignLead.id },
      data: { funnelStage: 'ARCHIVED', archiveReason: 'opted_out', archivedAt: new Date() },
    })
    return { skipped: true, reason: 'opted_out' }
  }
  if (lead.dncAt) {
    await prisma.smsCampaignLead.update({
      where: { id: campaignLead.id },
      data: { funnelStage: 'ARCHIVED', archiveReason: 'dnc', archivedAt: new Date() },
    })
    return { skipped: true, reason: 'dnc' }
  }

  // Personalize message
  const content = personalizeTemplate(campaign.templateBody, lead)

  // Build status callback URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.BASE_URL
  const statusCallback = baseUrl
    ? `${baseUrl}/api/webhooks/twilio-sms-status`
    : undefined

  // Send
  const result = await sendSMSViaProvider({
    to: lead.phone,
    fromNumber: campaign.fromNumber,
    message: content,
    leadId: lead.id,
    sender: 'campaign',
    trigger: 'sms_campaign_cold_text',
    statusCallback,
  })

  // Create campaign message record
  await prisma.smsCampaignMessage.create({
    data: {
      campaignId: campaign.id,
      campaignLeadId: campaignLead.id,
      leadId: lead.id,
      messageType: 'COLD_TEXT',
      content,
      twilioSid: result.sid || null,
      twilioStatus: result.success ? 'sent' : 'failed',
      sentAt: new Date(),
      ...(result.success ? {} : { failedAt: new Date() }),
    },
  })

  // Handle send failure — increment failedCount, set coldTextFailedAt, do NOT mark TEXTED
  if (!result.success) {
    await prisma.smsCampaignLead.update({
      where: { id: campaignLead.id },
      data: { coldTextFailedAt: new Date() },
    })
    await prisma.smsCampaign.update({
      where: { id: campaign.id },
      data: { failedCount: { increment: 1 } },
    })
    await prisma.leadEvent.create({
      data: {
        leadId: lead.id,
        eventType: 'SMS_FAILED',
        metadata: { campaignId: campaign.id, error: result.error },
      },
    })
    return { success: false, error: result.error }
  }

  // Update campaign lead stage
  await prisma.smsCampaignLead.update({
    where: { id: campaignLead.id },
    data: {
      funnelStage: 'TEXTED',
      coldTextSentAt: new Date(),
    },
  })

  // Update lead's SMS funnel stage
  await prisma.lead.update({
    where: { id: lead.id },
    data: { smsFunnelStage: 'TEXTED' },
  })

  // Increment sent count
  await prisma.smsCampaign.update({
    where: { id: campaign.id },
    data: { sentCount: { increment: 1 } },
  })

  // Create lead event
  await prisma.leadEvent.create({
    data: {
      leadId: lead.id,
      eventType: 'SMS_COLD_SENT',
      metadata: { campaignId: campaign.id },
    },
  })

  return { success: true, sid: result.sid }
}

// ---------------------------------------------------------------------------
// 6. personalizeTemplate
// ---------------------------------------------------------------------------

export function personalizeTemplate(template: string, lead: Lead): string {
  const humanizedIndustry = lead.industry
    ? lead.industry
        .replace(/_/g, ' ')
        .replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    : ''

  return template
    .replace(/\{companyName\}/g, lead.companyName || '')
    .replace(/\{firstName\}/g, lead.firstName || '')
    .replace(/\{city\}/g, lead.city || '')
    .replace(/\{state\}/g, lead.state || '')
    .replace(/\{industry\}/g, humanizedIndustry)
    .replace(/\{previewUrl\}/g, lead.previewUrl || '')
}

// ---------------------------------------------------------------------------
// 7. isInSendWindow
// ---------------------------------------------------------------------------

export async function isInSendWindow(timezone?: string): Promise<boolean> {
  const tz = timezone || 'America/New_York'
  const window = await getSendWindow()

  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    hour12: false,
    weekday: 'short',
  })

  const parts = formatter.formatToParts(now)
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10)
  const dayName = (parts.find((p) => p.type === 'weekday')?.value || '').toLowerCase()

  // Map short day names to 3-letter lowercase: Mon->mon, Tue->tue, etc.
  const dayAbbr = dayName.slice(0, 3)

  const dayAllowed = window.days.some((d) => d.toLowerCase() === dayAbbr)
  const hourAllowed = hour >= window.startHour && hour < window.endHour

  return dayAllowed && hourAllowed
}

// ---------------------------------------------------------------------------
// 8. getNextSendWindow
// ---------------------------------------------------------------------------

export async function getNextSendWindow(timezone?: string): Promise<number> {
  const tz = timezone || 'America/New_York'
  const window = await getSendWindow()

  const now = new Date()

  // Iterate forward up to 7 days to find the next valid send slot
  for (let offsetDays = 0; offsetDays <= 7; offsetDays++) {
    const candidate = new Date(now.getTime() + offsetDays * 24 * 60 * 60 * 1000)

    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      weekday: 'short',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    })
    const parts = formatter.formatToParts(candidate)
    const dayAbbr = (parts.find((p) => p.type === 'weekday')?.value || '').toLowerCase().slice(0, 3)
    const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10)
    const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10)

    const dayAllowed = window.days.some((d) => d.toLowerCase() === dayAbbr)

    if (dayAllowed) {
      if (offsetDays === 0 && hour < window.endHour) {
        // Today is a valid day
        if (hour >= window.startHour) {
          // We are currently in the window
          return 0
        }
        // Window hasn't started yet today — calculate ms until startHour
        const msUntilStart = ((window.startHour - hour) * 60 - minute) * 60 * 1000
        return msUntilStart
      } else if (offsetDays > 0) {
        // Future valid day — calculate ms until startHour on that day
        // Approximate: offsetDays of full days, adjusted for current time to startHour
        const msUntilMidnight = ((24 - hour) * 60 - minute) * 60 * 1000
        const msFullDays = (offsetDays - 1) * 24 * 60 * 60 * 1000
        const msStartHour = window.startHour * 60 * 60 * 1000
        return msUntilMidnight + msFullDays + msStartHour
      }
    }
  }

  // Fallback: try again in 1 hour (should never reach here with 7-day scan)
  return 60 * 60 * 1000
}

// ---------------------------------------------------------------------------
// 9. processDripStep
// ---------------------------------------------------------------------------

export async function processDripStep(
  campaignLeadId: string,
  step: number
): Promise<DripStepResult> {
  const campaignLead = await prisma.smsCampaignLead.findUnique({
    where: { id: campaignLeadId },
    include: { campaign: true, lead: true },
  })

  if (!campaignLead) {
    return { skipped: true, reason: 'campaign_lead_not_found' }
  }

  // Only send drips to opted-in / drip-active leads
  if (campaignLead.funnelStage !== 'OPTED_IN' && campaignLead.funnelStage !== 'DRIP_ACTIVE') {
    return { skipped: true, reason: `wrong_stage_${campaignLead.funnelStage}` }
  }

  // Check send window
  const inWindow = await isInSendWindow(campaignLead.lead.timezone || undefined)
  if (!inWindow) {
    const delayMs = await getNextSendWindow(campaignLead.lead.timezone || undefined)
    return { delayed: true, delayMs }
  }

  // Check Close Engine collision — don't stomp on active rep conversation
  const recentOutbound = await prisma.message.findFirst({
    where: {
      leadId: campaignLead.leadId,
      direction: 'OUTBOUND',
      createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
    },
    orderBy: { createdAt: 'desc' },
  })
  if (recentOutbound) {
    return { delayed: true, delayMs: 3600000 }
  }

  // Load drip templates from Settings
  const dripSetting = await prisma.settings.findUnique({ where: { key: 'sms_drip_templates' } })
  const dripTemplates = (dripSetting?.value as DripTemplate[] | undefined) || []
  const template = dripTemplates.find((t) => t.step === step)

  if (!template) {
    return { skipped: true, reason: `no_template_for_step_${step}` }
  }

  // Personalize and send
  const content = personalizeTemplate(template.template, campaignLead.lead)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.BASE_URL
  const statusCallback = baseUrl
    ? `${baseUrl}/api/webhooks/twilio-sms-status`
    : undefined

  const result = await sendSMSViaProvider({
    to: campaignLead.lead.phone,
    fromNumber: campaignLead.campaign.fromNumber,
    message: content,
    leadId: campaignLead.leadId,
    sender: 'campaign',
    trigger: `sms_campaign_drip_${step}`,
    statusCallback,
  })

  // Map step number to SmsMessageType enum value
  const messageTypeMap: Record<number, SmsMessageType> = {
    1: 'DRIP_1',
    2: 'DRIP_2',
    3: 'DRIP_3',
    4: 'DRIP_4',
    5: 'DRIP_5',
  }
  const messageType = messageTypeMap[step] || 'DRIP_1'

  await prisma.smsCampaignMessage.create({
    data: {
      campaignId: campaignLead.campaignId,
      campaignLeadId: campaignLead.id,
      leadId: campaignLead.leadId,
      messageType,
      content,
      twilioSid: result.sid || null,
      twilioStatus: result.success ? 'sent' : 'failed',
      sentAt: new Date(),
    },
  })

  // Update campaign lead drip state
  const updateData: Record<string, unknown> = {
    dripCurrentStep: step,
    funnelStage: 'DRIP_ACTIVE' as const,
  }
  if (step === 1) {
    updateData.dripStartedAt = new Date()
  }
  await prisma.smsCampaignLead.update({
    where: { id: campaignLeadId },
    data: updateData as any,
  })

  // Sync Lead.smsFunnelStage to DRIP_ACTIVE
  await prisma.lead.update({
    where: { id: campaignLead.leadId },
    data: { smsFunnelStage: 'DRIP_ACTIVE' },
  })

  // Create lead event
  await prisma.leadEvent.create({
    data: {
      leadId: campaignLead.leadId,
      eventType: 'SMS_DRIP_SENT',
      metadata: {
        campaignId: campaignLead.campaignId,
        step,
      },
    },
  })

  // Queue next drip step if more steps remain
  if (step < 5) {
    const nextTemplate = dripTemplates.find((t) => t.step === step + 1)
    if (nextTemplate) {
      const currentDayOffset = template.dayOffset
      const nextDayOffset = nextTemplate.dayOffset
      const delayDays = nextDayOffset - currentDayOffset
      const delayMs = Math.max(delayDays, 1) * 24 * 60 * 60 * 1000

      const { addSmsCampaignJob } = await import('@/worker/queue')
      await addSmsCampaignJob(
        'drip-step',
        { campaignLeadId, step: step + 1 },
        { delay: delayMs }
      )
    }
  }

  return { success: true }
}

// ---------------------------------------------------------------------------
// 10. markOptedIn
// ---------------------------------------------------------------------------

export async function markOptedIn(campaignLeadId: string, method: string): Promise<void> {
  const campaignLead = await prisma.smsCampaignLead.findUnique({
    where: { id: campaignLeadId },
    select: { campaignId: true, leadId: true },
  })

  if (!campaignLead) {
    console.warn(`[SMS-CAMPAIGN] markOptedIn: campaignLead ${campaignLeadId} not found`)
    return
  }

  // Update SmsCampaignLead
  await prisma.smsCampaignLead.update({
    where: { id: campaignLeadId },
    data: {
      funnelStage: 'OPTED_IN',
      optedInAt: new Date(),
      optedInMethod: method,
    },
  })

  // Update Lead
  await prisma.lead.update({
    where: { id: campaignLead.leadId },
    data: { smsFunnelStage: 'OPTED_IN' },
  })

  // Increment campaign opt-in count
  await prisma.smsCampaign.update({
    where: { id: campaignLead.campaignId },
    data: { optInCount: { increment: 1 } },
  })

  // Create lead event
  await prisma.leadEvent.create({
    data: {
      leadId: campaignLead.leadId,
      eventType: 'SMS_OPT_IN',
      metadata: {
        campaignId: campaignLead.campaignId,
        method,
      },
    },
  })

  // Queue first drip step
  const { addSmsCampaignJob } = await import('@/worker/queue')
  await addSmsCampaignJob('drip-step', { campaignLeadId, step: 1 })
}

// ---------------------------------------------------------------------------
// 11. getCampaignMetrics
// ---------------------------------------------------------------------------

export async function getCampaignMetrics(campaignId: string) {
  const campaign = await prisma.smsCampaign.findUnique({
    where: { id: campaignId },
  })

  if (!campaign) {
    throw new Error(`Campaign ${campaignId} not found`)
  }

  const safeDiv = (numerator: number, denominator: number) =>
    denominator > 0 ? Math.round((numerator / denominator) * 10000) / 100 : 0

  return {
    id: campaign.id,
    name: campaign.name,
    status: campaign.status,
    totalLeads: campaign.totalLeads,
    sentCount: campaign.sentCount,
    deliveredCount: campaign.deliveredCount,
    failedCount: campaign.failedCount,
    clickCount: campaign.clickCount,
    optOutCount: campaign.optOutCount,
    optInCount: campaign.optInCount,
    closeCount: campaign.closeCount,
    deliveryRate: safeDiv(campaign.deliveredCount, campaign.sentCount),
    clickRate: safeDiv(campaign.clickCount, campaign.deliveredCount),
    optOutRate: safeDiv(campaign.optOutCount, campaign.sentCount),
    optInRate: safeDiv(campaign.optInCount, campaign.sentCount),
    closeRate: safeDiv(campaign.closeCount, campaign.sentCount),
    sendStartedAt: campaign.sendStartedAt,
    sendCompletedAt: campaign.sendCompletedAt,
    createdAt: campaign.createdAt,
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function getSendWindow(): Promise<SendWindow> {
  const setting = await prisma.settings.findUnique({ where: { key: 'sms_send_window' } })

  const defaults: SendWindow = {
    startHour: 9,
    endHour: 11,
    days: ['tue', 'wed', 'thu'],
  }

  if (!setting?.value) return defaults

  const val = setting.value as Record<string, unknown>
  return {
    startHour: typeof val.startHour === 'number' ? val.startHour : defaults.startHour,
    endHour: typeof val.endHour === 'number' ? val.endHour : defaults.endHour,
    days: Array.isArray(val.days) ? val.days : defaults.days,
  }
}
