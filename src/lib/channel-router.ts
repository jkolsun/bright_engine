import { prisma } from './db'
import { sendSMS } from './twilio'
import { sendEmail, getEmailTemplate } from './resend'
import { canSendMessage } from './utils'
import Anthropic from '@anthropic-ai/sdk'

// ============================================
// TYPES
// ============================================

export interface RouteContext {
  clientId?: string
  leadId?: string
  trigger: string // 'post_launch_day_3', 'urgency_day_5', 'win_back', etc.
  messageContent: string
  messageSubject?: string // For email
  urgency?: 'low' | 'medium' | 'high' | 'critical'
}

export interface RouteDecision {
  channel: 'SMS' | 'EMAIL'
  reason: string
  ruleApplied?: string
  aiConfidence?: number
  signals?: Record<string, any>
}

interface ChannelSignals {
  hasPhone: boolean
  hasEmail: boolean
  channelPreference: string | null
  recentSmsCount: number
  recentEmailCount: number
  smsReplyRate: number
  emailOpenRate: number
  localHour: number
  timezone: string
  hostingStatus: string | null
  triggerType: string
  messageLength: number
}

// ============================================
// SIGNAL GATHERING
// ============================================

async function gatherSignals(context: RouteContext): Promise<ChannelSignals> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  // Load client or lead data
  let phone: string | null = null
  let email: string | null = null
  let channelPreference: string | null = null
  let timezone = 'America/New_York'
  let hostingStatus: string | null = null

  if (context.clientId) {
    const client = await prisma.client.findUnique({
      where: { id: context.clientId },
      include: { lead: true },
    })
    if (client) {
      phone = client.phone || client.lead?.phone || null
      email = client.email || client.lead?.email || null
      channelPreference = client.channelPreference || null
      timezone = client.lead?.timezone || 'America/New_York'
      hostingStatus = client.hostingStatus
    }
  } else if (context.leadId) {
    const lead = await prisma.lead.findUnique({
      where: { id: context.leadId },
    })
    if (lead) {
      phone = lead.phone
      email = lead.email || null
      timezone = lead.timezone || 'America/New_York'
    }
  }

  // Count recent messages by channel
  const where = context.clientId
    ? { clientId: context.clientId, createdAt: { gte: thirtyDaysAgo } }
    : context.leadId
    ? { leadId: context.leadId, createdAt: { gte: thirtyDaysAgo } }
    : { createdAt: { gte: thirtyDaysAgo } }

  const recentMessages = await prisma.message.findMany({
    where,
    select: { channel: true, direction: true, twilioStatus: true, resendStatus: true },
  })

  const smsSent = recentMessages.filter(m => m.channel === 'SMS' && m.direction === 'OUTBOUND')
  const smsReplies = recentMessages.filter(m => m.channel === 'SMS' && m.direction === 'INBOUND')
  const emailSent = recentMessages.filter(m => m.channel === 'EMAIL' && m.direction === 'OUTBOUND')
  const emailOpened = emailSent.filter(m => m.resendStatus === 'opened' || m.resendStatus === 'clicked')

  // Get local hour
  let localHour = 12
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    })
    localHour = parseInt(formatter.format(new Date()))
  } catch { /* fallback to 12 */ }

  return {
    hasPhone: !!phone,
    hasEmail: !!email,
    channelPreference,
    recentSmsCount: smsSent.length,
    recentEmailCount: emailSent.length,
    smsReplyRate: smsSent.length > 0 ? smsReplies.length / smsSent.length : 0,
    emailOpenRate: emailSent.length > 0 ? emailOpened.length / emailSent.length : 0,
    localHour,
    timezone,
    hostingStatus,
    triggerType: context.trigger,
    messageLength: context.messageContent.length,
  }
}

// ============================================
// HARD RULES (Skip AI — deterministic)
// ============================================

function checkHardRules(signals: ChannelSignals, context: RouteContext): RouteDecision | null {
  // Rule 1: No phone number → must email
  if (!signals.hasPhone && signals.hasEmail) {
    return { channel: 'EMAIL', reason: 'No phone number on file', ruleApplied: 'NO_PHONE' }
  }

  // Rule 2: No email → must SMS
  if (!signals.hasEmail && signals.hasPhone) {
    return { channel: 'SMS', reason: 'No email on file', ruleApplied: 'NO_EMAIL' }
  }

  // Rule 3: Explicit preference → SMS
  if (signals.channelPreference === 'SMS' && signals.hasPhone) {
    return { channel: 'SMS', reason: 'Client prefers SMS', ruleApplied: 'PREFERENCE_SMS' }
  }

  // Rule 4: Explicit preference → Email
  if (signals.channelPreference === 'EMAIL' && signals.hasEmail) {
    return { channel: 'EMAIL', reason: 'Client prefers email', ruleApplied: 'PREFERENCE_EMAIL' }
  }

  // Rule 5: Payment failed → SMS (urgent, needs immediate attention)
  if (signals.hostingStatus === 'FAILED_PAYMENT') {
    return { channel: 'SMS', reason: 'Payment failed — SMS for urgency', ruleApplied: 'PAYMENT_FAILED' }
  }

  // Rule 6: Escalation/critical triggers → SMS
  if (context.urgency === 'critical' || context.trigger.includes('escalation')) {
    return { channel: 'SMS', reason: 'Critical urgency — SMS for immediate attention', ruleApplied: 'ESCALATION' }
  }

  // Rule 7: Night hours (9pm-8am) → Email (don't buzz their phone)
  if (signals.localHour >= 21 || signals.localHour < 8) {
    return { channel: 'EMAIL', reason: 'Outside business hours — queuing email instead', ruleApplied: 'NIGHT_HOURS' }
  }

  // Rule 8: Long content (>300 chars) with report/stats → Email
  if (signals.messageLength > 300 && (context.trigger.includes('report') || context.trigger.includes('stat'))) {
    return { channel: 'EMAIL', reason: 'Long-form report content — better as email', ruleApplied: 'REPORT_CONTENT' }
  }

  return null // No hard rule matched — needs AI decision
}

// ============================================
// AI ROUTING (Claude Haiku)
// ============================================

async function callClaudeForRouting(signals: ChannelSignals, context: RouteContext): Promise<RouteDecision> {
  const anthropic = new Anthropic()

  const prompt = `You are a channel routing engine for a web design agency's automated messaging system.

Given these signals about a client/lead, decide whether to send this message via SMS or EMAIL.

SIGNALS:
- Has phone: ${signals.hasPhone}
- Has email: ${signals.hasEmail}
- Recent SMS sent (30d): ${signals.recentSmsCount}
- Recent emails sent (30d): ${signals.recentEmailCount}
- SMS reply rate: ${(signals.smsReplyRate * 100).toFixed(0)}%
- Email open rate: ${(signals.emailOpenRate * 100).toFixed(0)}%
- Local time: ${signals.localHour}:00
- Trigger: ${signals.triggerType}
- Message length: ${signals.messageLength} chars
- Hosting status: ${signals.hostingStatus || 'active'}

MESSAGE PREVIEW (first 200 chars):
"${context.messageContent.substring(0, 200)}"

RULES:
- SMS is better for: short urgent messages, check-ins, reminders, time-sensitive actions
- Email is better for: detailed reports, long content, non-urgent updates, links/attachments
- If SMS reply rate is high, lean SMS. If email open rate is high, lean email.
- Don't over-text — if lots of recent SMS, consider email for variety
- Morning/afternoon → SMS ok. Evening → lean email.

Respond with ONLY a JSON object (no markdown):
{"channel": "SMS" or "EMAIL", "confidence": 0.0-1.0, "reason": "brief explanation"}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const parsed = JSON.parse(text)

    return {
      channel: parsed.channel === 'EMAIL' ? 'EMAIL' : 'SMS',
      reason: `AI: ${parsed.reason}`,
      aiConfidence: parsed.confidence,
      signals: signals as any,
    }
  } catch (error) {
    console.error('[CHANNEL-ROUTER] AI routing failed:', error)
    return getFallbackDecision(signals)
  }
}

// ============================================
// FALLBACK (When AI fails)
// ============================================

function getFallbackDecision(signals: ChannelSignals): RouteDecision {
  // Default: SMS for short messages, email for long
  if (signals.messageLength > 300) {
    return { channel: 'EMAIL', reason: 'Fallback: long message → email', ruleApplied: 'FALLBACK_LENGTH' }
  }

  // If better email engagement, use email
  if (signals.emailOpenRate > 0.3 && signals.smsReplyRate < 0.05) {
    return { channel: 'EMAIL', reason: 'Fallback: better email engagement', ruleApplied: 'FALLBACK_ENGAGEMENT' }
  }

  // Default to SMS
  return { channel: 'SMS', reason: 'Fallback: default to SMS', ruleApplied: 'FALLBACK_DEFAULT' }
}

// ============================================
// MAIN ROUTER
// ============================================

export async function routeMessage(context: RouteContext): Promise<RouteDecision> {
  const start = Date.now()

  // Check if routing is enabled
  const settings = await prisma.settings.findFirst({ where: { key: 'channel_routing' } })
  const config = settings?.value
    ? (typeof settings.value === 'string' ? JSON.parse(settings.value as string) : settings.value) as any
    : null

  if (!config?.enabled) {
    // Routing disabled — default to SMS
    return { channel: 'SMS', reason: 'Channel routing disabled — default SMS', ruleApplied: 'ROUTING_DISABLED' }
  }

  const signals = await gatherSignals(context)

  // Step 1: Check hard rules
  const hardRule = checkHardRules(signals, context)
  if (hardRule) {
    await logDecision(context, hardRule, Date.now() - start)
    return hardRule
  }

  // Step 2: AI decision (with timeout)
  let decision: RouteDecision
  if (config?.useAi !== false) {
    try {
      const aiPromise = callClaudeForRouting(signals, context)
      const timeoutPromise = new Promise<RouteDecision>((_, reject) =>
        setTimeout(() => reject(new Error('AI timeout')), 3000)
      )
      decision = await Promise.race([aiPromise, timeoutPromise])
    } catch {
      decision = getFallbackDecision(signals)
    }
  } else {
    decision = getFallbackDecision(signals)
  }

  decision.signals = signals as any
  await logDecision(context, decision, Date.now() - start)
  return decision
}

// ============================================
// ROUTE AND SEND (Drop-in replacement)
// ============================================

export async function routeAndSend(context: RouteContext & {
  to?: string // Phone number for SMS
  toEmail?: string // Email address
  emailSubject?: string
  emailHtml?: string
  sender?: string
}): Promise<{ success: boolean; channel: string; error?: string }> {
  const decision = await routeMessage(context)

  if (decision.channel === 'SMS') {
    if (!context.to) {
      // Try to look up phone
      const phone = await getContactPhone(context.clientId, context.leadId)
      if (!phone) return { success: false, channel: 'SMS', error: 'No phone number' }
      context.to = phone
    }

    const result = await sendSMS({
      to: context.to,
      message: context.messageContent,
      clientId: context.clientId,
      leadId: context.leadId,
      sender: context.sender || 'system',
      trigger: context.trigger,
    })

    // Mark decision as sent
    await markDecisionSent(context, decision)
    return { success: result.success, channel: 'SMS', error: result.error }
  } else {
    // EMAIL
    if (!context.toEmail) {
      const email = await getContactEmail(context.clientId, context.leadId)
      if (!email) {
        // Fallback to SMS if no email but has phone
        if (context.to) {
          const result = await sendSMS({
            to: context.to,
            message: context.messageContent,
            clientId: context.clientId,
            leadId: context.leadId,
            sender: context.sender || 'system',
            trigger: context.trigger,
          })
          return { success: result.success, channel: 'SMS', error: result.error }
        }
        return { success: false, channel: 'EMAIL', error: 'No email address' }
      }
      context.toEmail = email
    }

    const html = context.emailHtml || wrapInEmailTemplate(context.messageContent)
    const subject = context.emailSubject || context.messageSubject || getSubjectFromTrigger(context.trigger)

    const result = await sendEmail({
      to: context.toEmail,
      subject,
      html,
      clientId: context.clientId,
      leadId: context.leadId,
      sender: context.sender || 'system',
      trigger: context.trigger,
    })

    await markDecisionSent(context, decision)
    return { success: result.success, channel: 'EMAIL', error: result.error }
  }
}

// ============================================
// HELPERS
// ============================================

async function getContactPhone(clientId?: string, leadId?: string): Promise<string | null> {
  if (clientId) {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: { lead: true },
    })
    return client?.phone || client?.lead?.phone || null
  }
  if (leadId) {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } })
    return lead?.phone || null
  }
  return null
}

async function getContactEmail(clientId?: string, leadId?: string): Promise<string | null> {
  if (clientId) {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: { lead: true },
    })
    return client?.email || client?.lead?.email || null
  }
  if (leadId) {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } })
    return lead?.email || null
  }
  return null
}

function getSubjectFromTrigger(trigger: string): string {
  const subjectMap: Record<string, string> = {
    'post_launch_day_3': 'Your site is live! Quick check-in',
    'post_launch_day_7': 'Week 1 update for your site',
    'post_launch_day_14': 'Your 2-week site performance',
    'post_launch_day_28': 'One month milestone!',
    'win_back_day_7': 'We miss you — your site is at risk',
    'win_back_day_14': 'Last chance to keep your site',
    'referral_day_45': 'Earn a free month of hosting',
    'urgency': 'Your preview is waiting',
  }

  // Check for partial trigger matches
  for (const [key, subject] of Object.entries(subjectMap)) {
    if (trigger.includes(key)) return subject
  }

  return 'Update from Bright Automations'
}

function wrapInEmailTemplate(content: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #f8fafc; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0;">
        <p style="color: #334155; font-size: 15px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${content}</p>
      </div>
      <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 16px;">
        Bright Automations — Building better websites for your business
      </p>
    </div>
  `
}

async function logDecision(context: RouteContext, decision: RouteDecision, latencyMs: number) {
  try {
    await prisma.channelDecision.create({
      data: {
        clientId: context.clientId || null,
        leadId: context.leadId || null,
        trigger: context.trigger,
        chosenChannel: decision.channel,
        reason: decision.reason,
        ruleApplied: decision.ruleApplied || null,
        aiConfidence: decision.aiConfidence || null,
        signals: decision.signals || undefined,
        latencyMs,
        messageSent: false,
      },
    })
  } catch (error) {
    console.error('[CHANNEL-ROUTER] Failed to log decision:', error)
  }
}

async function markDecisionSent(context: RouteContext, decision: RouteDecision) {
  try {
    // Find the most recent decision for this trigger
    const recent = await prisma.channelDecision.findFirst({
      where: {
        clientId: context.clientId || null,
        leadId: context.leadId || null,
        trigger: context.trigger,
        messageSent: false,
      },
      orderBy: { createdAt: 'desc' },
    })
    if (recent) {
      await prisma.channelDecision.update({
        where: { id: recent.id },
        data: { messageSent: true },
      })
    }
  } catch (error) {
    console.error('[CHANNEL-ROUTER] Failed to mark decision sent:', error)
  }
}

// ============================================
// AUTO-DETECT CHANNEL PREFERENCE
// ============================================

export async function detectAndSetChannelPreference(
  clientId: string,
  inboundChannel: 'SMS' | 'EMAIL'
) {
  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { channelPreference: true },
    })

    // Only set if not already set
    if (!client?.channelPreference) {
      await prisma.client.update({
        where: { id: clientId },
        data: { channelPreference: inboundChannel },
      })
      console.log(`[CHANNEL-ROUTER] Auto-set preference to ${inboundChannel} for client ${clientId}`)
    }
  } catch (error) {
    console.error('[CHANNEL-ROUTER] Failed to set preference:', error)
  }
}
