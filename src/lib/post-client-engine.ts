/**
 * Post-Client Engine (Haiku-powered)
 *
 * Handles inbound client messages and generates personalized
 * touchpoint messages for the sequence worker. Uses Claude Haiku
 * for cost-optimized retention, upsell, and support conversations.
 */

import Anthropic from '@anthropic-ai/sdk'
import { prisma } from './db'
import { sendSMSViaProvider } from './sms-provider'
import { buildPostClientSystemPrompt } from './close-engine-prompts'
import { calculateDelay } from './close-engine-processor'
import { getPricingConfig } from './pricing-config'

const POST_CLIENT_MODEL = 'claude-haiku-4-5-20251001'

let _anthropicClient: Anthropic | null = null
function getAnthropicClient(): Anthropic {
  if (!_anthropicClient) {
    _anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return _anthropicClient
}

// ============================================
// processPostClientInbound()
// ============================================

export async function processPostClientInbound(
  clientId: string,
  message: string,
  mediaUrls?: string[]
): Promise<void> {
  // Load client with lead and analytics
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { lead: true, analytics: true, revenue: true },
  })
  if (!client || !client.lead) return

  // Load last 20 messages for this client
  const messages = await prisma.message.findMany({
    where: { clientId },
    orderBy: { createdAt: 'asc' },
    take: 20,
  })

  const daysSinceLaunch = client.siteLiveDate
    ? Math.floor((Date.now() - client.siteLiveDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0

  // Build prompt
  const upsells = client.upsells
    ? (Array.isArray(client.upsells) ? client.upsells as string[] : [])
    : []

  const systemPrompt = buildPostClientSystemPrompt({
    companyName: client.companyName,
    plan: client.plan || 'Standard',
    monthlyRevenue: client.monthlyRevenue,
    siteUrl: client.siteUrl || undefined,
    healthScore: client.healthScore,
    daysSinceLaunch,
    upsells,
    messages: messages.map(m => ({ direction: m.direction, content: m.content })),
  })

  try {
    const anthropic = getAnthropicClient()
    const apiResponse = await anthropic.messages.create({
      model: POST_CLIENT_MODEL,
      max_tokens: 400,
      system: systemPrompt,
      messages: [{ role: 'user', content: message }],
    })

    const rawText = apiResponse.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('')

    // Parse response
    let parsed: any
    try {
      const cleaned = rawText.replace(/```json\s?/g, '').replace(/```/g, '').trim()
      parsed = JSON.parse(cleaned)
    } catch {
      parsed = { replyText: rawText.substring(0, 300), intent: 'GENERAL', escalate: false }
    }

    // ── Handle intents ──

    // Edit request → create EditRequest record
    if (parsed.intent === 'EDIT_REQUEST' && parsed.editRequest) {
      await prisma.editRequest.create({
        data: {
          clientId,
          requestText: message,
          requestChannel: 'SMS',
          aiInterpretation: parsed.editRequest.description,
          complexityTier: parsed.editRequest.complexity || 'medium',
          status: 'new',
        },
      })
    }

    // Cancel signal or escalation → notify immediately
    if (parsed.intent === 'CANCEL_SIGNAL' || parsed.escalate) {
      await prisma.notification.create({
        data: {
          type: 'CLIENT_TEXT',
          title: parsed.intent === 'CANCEL_SIGNAL'
            ? 'Churn Risk — Client Wants to Cancel'
            : 'Client Escalation',
          message: `${client.companyName}: "${message.substring(0, 100)}"`,
          metadata: { clientId, intent: parsed.intent, reason: parsed.escalateReason || null },
        },
      })
    }

    // Positive feedback → log for referral timing
    if (parsed.intent === 'POSITIVE_FEEDBACK') {
      await prisma.leadEvent.create({
        data: {
          leadId: client.leadId || '',
          eventType: 'POSITIVE_FEEDBACK',
          metadata: { clientId, message: message.substring(0, 200) },
        },
      })
    }

    // ── Check autonomy and send ──
    if (client.autonomyLevel === 'MANUAL') {
      // Notify admin with draft instead of sending
      await prisma.notification.create({
        data: {
          type: 'CLIENT_TEXT',
          title: 'Post-Client Draft — Manual Approval',
          message: `Draft for ${client.companyName}: "${parsed.replyText.substring(0, 150)}"`,
          metadata: { clientId, draftMessage: parsed.replyText, intent: parsed.intent },
        },
      })
      return
    }

    const delay = calculateDelay(parsed.replyText.length, 'standard')

    setTimeout(async () => {
      try {
        await sendSMSViaProvider({
          to: client.lead!.phone,
          message: parsed.replyText,
          clientId,
          trigger: `post_client_${parsed.intent?.toLowerCase() || 'general'}`,
          aiGenerated: true,
          aiDelaySeconds: delay,
          conversationType: 'post_client',
          sender: 'clawdbot',
        })
      } catch (err) {
        console.error('[PostClient] Send failed:', err)
      }
    }, delay * 1000)

    // Log API cost (Haiku is ~10x cheaper than Sonnet)
    await prisma.apiCost.create({
      data: {
        service: 'anthropic',
        operation: 'post_client_chat',
        cost: 0.003,
      },
    }).catch(() => {})
  } catch (apiError) {
    console.error('[PostClient] Haiku API failed:', apiError)
    await prisma.notification.create({
      data: {
        type: 'DAILY_AUDIT',
        title: 'Post-Client AI Error',
        message: `Haiku failed for ${client.companyName}. Manual response needed.`,
        metadata: { clientId, error: String(apiError) },
      },
    })
  }
}

// ============================================
// generateTouchpointMessage()
// ============================================

export async function generateTouchpointMessage(
  clientId: string,
  touchpointType: string
): Promise<string | null> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { lead: true, analytics: true },
  })
  if (!client || !client.lead) return null

  // Build a focused prompt for the touchpoint
  const config = await getPricingConfig()
  const annualMonthly = Math.round(config.monthlyHosting * 0.85)
  const annualTotal = annualMonthly * 12

  const touchpointPrompts: Record<string, string> = {
    'post_launch_day_3': `Generate a helpful Day 3 tip for ${client.lead.firstName} at ${client.companyName}. Focus on Google Business Profile optimization. Keep under 250 chars. SMS tone.`,
    'post_launch_day_7': `Generate a Week 1 stats update for ${client.lead.firstName} at ${client.companyName}. Mention their site is live and performing. Keep under 250 chars. SMS tone. Be encouraging.`,
    'post_launch_day_14': `Generate a 2-week check-in for ${client.lead.firstName}. Ask how the site is working for them and if they need any changes. Keep under 200 chars. SMS tone.`,
    'post_launch_day_21': `Generate a subtle upsell seed for ${client.lead.firstName} at ${client.companyName} (industry: ${client.lead.industry}). Mention ONE feature that could help their business without being pushy. Under 250 chars. SMS.`,
    'post_launch_day_28': `Generate a 1-month review for ${client.lead.firstName}. Congratulate them, mention the site has been live for a month. Subtly pitch a value-add. Under 250 chars. SMS.`,
    'referral_day_45': `Generate a referral ask for ${client.lead.firstName}. Offer: "Know a business owner who needs a site? You both get a free month." Keep casual and under 200 chars. SMS.`,
    'referral_day_90': `Generate a second referral ask for ${client.lead.firstName}. Different angle than first ask. Mention how many businesses you've helped. Under 200 chars. SMS.`,
    'referral_day_180': `Generate a final referral ask for ${client.lead.firstName}. Brief and appreciative. Under 160 chars. SMS.`,
    'annual_hosting_month_3': `Generate a pitch to ${client.lead.firstName} for annual billing. Save 15% by switching. Current: $${config.monthlyHosting}/month. Annual: ~$${annualMonthly}/month ($${annualTotal}/year). Under 250 chars. SMS.`,
  }

  const prompt = touchpointPrompts[touchpointType]
  if (!prompt) return null

  try {
    const anthropic = getAnthropicClient()
    const response = await anthropic.messages.create({
      model: POST_CLIENT_MODEL,
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('')
      .trim()

    // Log cost
    await prisma.apiCost.create({
      data: {
        service: 'anthropic',
        operation: `post_client_touchpoint_${touchpointType}`,
        cost: 0.002,
      },
    }).catch(() => {})

    return text
  } catch (err) {
    console.error(`[PostClient] Touchpoint generation failed for ${touchpointType}:`, err)
    return null // Caller should fall back to static template
  }
}
