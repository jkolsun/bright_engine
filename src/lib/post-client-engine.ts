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
import { calculateDelay, shouldAIRespond, containsPaymentUrl, stripPaymentUrls } from './close-engine-processor'
import { getPricingConfig } from './pricing-config'
import { updateOnboarding, advanceOnboarding, createOnboardingApproval, getOnboardingFlowSettings } from './onboarding'
import { handleEditRequest } from './edit-request-handler'
import { handleEditConfirmation } from './edit-confirmation-handler'

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

  // ── Check for pending edit confirmation BEFORE normal AI processing ──
  const pendingEdit = await prisma.editRequest.findFirst({
    where: { clientId, editFlowState: 'awaiting_confirmation' },
    orderBy: { createdAt: 'desc' },
  })
  if (pendingEdit) {
    const confirmResult = await handleEditConfirmation({
      clientId,
      editRequestId: pendingEdit.id,
      message,
    })
    if (confirmResult.handled && confirmResult.replyText) {
      // Send the confirmation reply, skip normal AI processing
      const delay = calculateDelay(confirmResult.replyText.length, 'standard')
      setTimeout(async () => {
        try {
          await sendSMSViaProvider({
            to: client.lead!.phone,
            message: confirmResult.replyText!,
            clientId,
            trigger: 'edit_confirmation_response',
            aiGenerated: true,
            aiDelaySeconds: delay,
            conversationType: 'post_client',
            sender: 'clawdbot',
          })
        } catch (err) {
          console.error('[PostClient] Edit confirmation send failed:', err)
        }
      }, delay * 1000)
      return
    }
    // If not handled (e.g. unrelated message or more_edits), fall through to normal processing
  }

  // Load last 20 messages for this client
  const messages = await prisma.message.findMany({
    where: { clientId },
    orderBy: { createdAt: 'asc' },
    take: 20,
  })

  // AI conversation awareness — should we respond at all?
  const isReactionContext = message.startsWith('[REACTION:')
  if (!isReactionContext) {
    const lastOutbound = await prisma.message.findFirst({
      where: { clientId, direction: 'OUTBOUND' },
      orderBy: { createdAt: 'desc' },
      select: { content: true },
    })
    if (!await shouldAIRespond(message, lastOutbound?.content || null)) {
      console.log(`[PostClient] Skipping response — conversation awareness: "${message.substring(0, 40)}"`)
      return
    }
  }

  const daysSinceLaunch = client.siteLiveDate
    ? Math.floor((Date.now() - client.siteLiveDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0

  // Build prompt
  const upsells = client.upsells
    ? (Array.isArray(client.upsells) ? client.upsells as string[] : [])
    : []

  // Load admin's custom onboarding instructions from Settings > Post-AQ
  const flowSettings = client.onboardingStep > 0 && client.onboardingStep < 7
    ? await getOnboardingFlowSettings()
    : null

  const systemPrompt = buildPostClientSystemPrompt({
    companyName: client.companyName,
    plan: client.plan || 'Standard',
    monthlyRevenue: client.monthlyRevenue,
    siteUrl: client.siteUrl || undefined,
    healthScore: client.healthScore,
    daysSinceLaunch,
    upsells,
    messages: messages.map(m => ({ direction: m.direction, content: m.content })),
    onboardingStep: client.onboardingStep,
    onboardingData: {
      ...(client.onboardingData as Record<string, unknown> || {}),
      stagingUrl: client.stagingUrl,
    },
    onboardingStageTemplate: flowSettings?.stageTemplate || undefined,
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

    // ── Guard: intercept payment URLs — AI must NEVER send these directly ──
    if (parsed.replyText && containsPaymentUrl(parsed.replyText)) {
      console.warn(`[PostClient] BLOCKED: AI tried to send payment URL directly for ${client.companyName}`)
      // Strip URL, create approval for Andrew's queue instead
      const strippedReply = stripPaymentUrls(parsed.replyText)
      await prisma.approval.create({
        data: {
          gate: 'PAYMENT_LINK',
          title: `Payment Link — ${client.companyName}`,
          description: `AI attempted to send a payment URL directly to ${client.companyName}. Intercepted for manual review.`,
          draftContent: parsed.replyText,
          leadId: client.leadId || undefined,
          clientId,
          requestedBy: 'system',
          status: 'PENDING',
          priority: 'HIGH',
          metadata: { clientId, phone: client.lead!.phone },
        },
      })
      await prisma.notification.create({
        data: {
          type: 'CLOSE_ENGINE',
          title: 'Payment Link Intercepted',
          message: `AI tried to send payment URL to ${client.companyName}. Created approval for review.`,
          metadata: { clientId, leadId: client.leadId },
        },
      })
      // Send the cleaned message (without the URL) if there's still content
      if (strippedReply.length > 10) {
        parsed.replyText = strippedReply
      } else {
        // Nothing meaningful left after stripping — send a generic response
        parsed.replyText = `Our team will follow up with you on that shortly!`
      }
    }

    // ── Handle intents ──

    // Edit request → create EditRequest record and kick off handler
    if (parsed.intent === 'EDIT_REQUEST' && parsed.editRequest) {
      const editRequest = await prisma.editRequest.create({
        data: {
          clientId,
          leadId: client.leadId || undefined,
          requestText: message,
          requestChannel: 'SMS',
          aiInterpretation: parsed.editRequest.description,
          complexityTier: parsed.editRequest.complexity || 'medium',
          status: 'new',
        },
      })

      // Kick off the edit handler (async, doesn't block the initial reply)
      handleEditRequest({
        clientId,
        editRequestId: editRequest.id,
        instruction: parsed.editRequest.description || message,
        complexity: (parsed.editRequest.complexity || 'medium') as 'simple' | 'medium' | 'complex',
      }).catch(err => console.error('[PostClient] Edit handler failed:', err))
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

    // ── Onboarding intent handlers ──

    // Client says they OWN a domain → save domain, create DOMAIN_SETUP approval, advance to step 3
    if (parsed.intent === 'DOMAIN_OWN' && parsed.domainName && client.onboardingStep === 2) {
      const domain = parsed.domainName.toLowerCase().trim()
      await updateOnboarding(clientId, {
        domainPreference: domain,
        domainOwnership: 'owns_domain',
      })
      await createOnboardingApproval({
        gate: 'DOMAIN_SETUP',
        title: `Domain Setup — ${client.companyName}`,
        description: `Client owns ${domain}. Needs DNS instructions sent and domain added to Vercel.`,
        clientId,
        metadata: { domain, ownership: 'owns_domain', phone: client.lead!.phone },
      })
      await advanceOnboarding(clientId, 3)
      console.log(`[PostClient] Onboarding: ${client.companyName} owns domain ${domain} → step 3`)
    }

    // Client wants us to REGISTER a domain → save preference, create DOMAIN_REGISTRATION approval
    if (parsed.intent === 'DOMAIN_REGISTER' && parsed.domainName && client.onboardingStep === 2) {
      const domain = parsed.domainName.toLowerCase().trim()
      await updateOnboarding(clientId, {
        domainPreference: domain,
        domainOwnership: 'needs_new',
      })
      await createOnboardingApproval({
        gate: 'DOMAIN_REGISTRATION',
        title: `Domain Registration — ${client.companyName}`,
        description: `Client wants ${domain} registered. Purchase and configure.`,
        clientId,
        metadata: { domain, ownership: 'needs_new', phone: client.lead!.phone },
      })
      await advanceOnboarding(clientId, 3)
      console.log(`[PostClient] Onboarding: ${client.companyName} wants domain ${domain} registered → step 3`)
    }

    // Client approves their site content → advance to step 4 (domain setup)
    if (parsed.intent === 'CONTENT_APPROVED' && client.onboardingStep === 3) {
      await updateOnboarding(clientId, { contentReviewed: true, contentApprovedAt: new Date().toISOString() })
      await advanceOnboarding(clientId, 4)
      await prisma.notification.create({
        data: {
          type: 'CLIENT_TEXT',
          title: 'Content Approved',
          message: `${client.companyName} approved their site content. Ready for domain setup.`,
          metadata: { clientId },
        },
      })
      console.log(`[PostClient] Onboarding: ${client.companyName} approved content → step 4`)
    }

    // Client confirms go-live → advance to step 7 (complete, triggers post-launch sequences)
    if (parsed.intent === 'GO_LIVE_CONFIRM' && client.onboardingStep === 6) {
      await advanceOnboarding(clientId, 7)
      console.log(`[PostClient] Onboarding: ${client.companyName} confirmed go-live → step 7 (complete)`)
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
