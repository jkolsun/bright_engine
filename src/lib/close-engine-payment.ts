/**
 * Close Engine Payment Link Generation + Sending
 *
 * Creates dynamic Stripe Checkout Sessions per lead and handles
 * sending payment links via SMS with autonomy checks.
 */

import { getStripe } from './stripe'
import { prisma } from './db'
import { getPricingConfig } from './pricing-config'
import {
  transitionStage,
  getConversationContext,
  CONVERSATION_STAGES,
} from './close-engine'

// ============================================
// generatePaymentLink()
// ============================================

export async function generatePaymentLink(leadId: string): Promise<string> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } })
  if (!lead) throw new Error(`Lead ${leadId} not found`)

  const conversation = await prisma.closeEngineConversation.findUnique({
    where: { leadId },
  })

  const pricingConfig = await getPricingConfig({ forceRefresh: true })

  const stripe = getStripe()
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: `Website for ${lead.companyName}`,
          description: 'Professional website build + monthly hosting',
        },
        unit_amount: Math.round(pricingConfig.firstMonthTotal * 100),
      },
      quantity: 1,
    }],
    mode: 'payment',
    client_reference_id: lead.id, // CRITICAL — Stripe webhook uses this
    success_url: `${process.env.BASE_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: lead.previewId
      ? `${process.env.BASE_URL}/preview/${lead.previewId}`
      : `${process.env.BASE_URL}`,
    customer_email: lead.email || undefined,
    metadata: {
      leadId: lead.id,
      repId: conversation?.repId || '',
      source: 'close_engine',
    },
  })

  // Save to conversation
  if (conversation) {
    await prisma.closeEngineConversation.update({
      where: { id: conversation.id },
      data: {
        paymentLinkUrl: session.url,
        paymentLinkSentAt: new Date(),
      },
    })
  }

  return session.url!
}

// ============================================
// sendPaymentLink()
// ============================================

export async function sendPaymentLink(conversationId: string): Promise<{ success: boolean }> {
  const context = await getConversationContext(conversationId)
  const lead = context.lead
  const config = await getPricingConfig()

  // Look up the core product's Stripe payment link from Products table
  const coreProduct = await prisma.upsellProduct.findFirst({
    where: { isCore: true, active: true },
    select: { stripeLink: true },
  })
  const rawPaymentUrl = coreProduct?.stripeLink || ''

  // Append client_reference_id so the Stripe webhook can match payment to this lead
  let paymentUrl = rawPaymentUrl
  if (rawPaymentUrl && lead.id) {
    try {
      const urlObj = new URL(rawPaymentUrl)
      urlObj.searchParams.set('client_reference_id', lead.id)
      paymentUrl = urlObj.toString()
    } catch {
      // If URL parsing fails, append manually
      const separator = rawPaymentUrl.includes('?') ? '&' : '?'
      paymentUrl = `${rawPaymentUrl}${separator}client_reference_id=${lead.id}`
    }
  }

  // Use system message template for draft content (respects admin edits in Settings)
  let draftContent: string
  try {
    const { getSystemMessage } = await import('./system-messages')
    const { text } = await getSystemMessage('payment_link', {
      firstName: lead.firstName || '',
      companyName: lead.companyName || 'your business',
      paymentLink: paymentUrl || '[no link configured]',
      firstMonthTotal: `$${config.firstMonthTotal}`,
      monthlyHosting: `$${config.monthlyHosting}`,
    })
    draftContent = text
  } catch {
    draftContent = `Here's your payment link to go live: ${paymentUrl || '[no link configured]'}\n\n$${config.firstMonthTotal} gets your site built and launched, plus monthly hosting at $${config.monthlyHosting}/month. You can cancel anytime.\n\nOnce you pay, we'll have your site live within 48 hours!`
  }

  // Dedup guard: skip if a pending PAYMENT_LINK approval already exists for this lead
  const existingApproval = await prisma.approval.findFirst({
    where: { leadId: lead.id, gate: 'PAYMENT_LINK', status: 'PENDING' },
  })
  if (existingApproval) {
    console.log(`[CloseEngine] PAYMENT_LINK approval already exists for ${lead.companyName} (${existingApproval.id}) — skipping duplicate`)
    return { success: true }
  }

  // Create a PAYMENT_LINK approval with the Stripe link visible for admin review.
  await prisma.approval.create({
    data: {
      gate: 'PAYMENT_LINK',
      title: `Payment Link — ${lead.companyName}`,
      description: `${lead.firstName} at ${lead.companyName} is ready to buy. Review the Stripe link below, then approve to send via SMS.`,
      draftContent,
      leadId: lead.id,
      requestedBy: 'system',
      status: 'PENDING',
      priority: 'HIGH',
      metadata: {
        conversationId,
        phone: lead.phone,
        email: lead.email || null,
        paymentUrl,
        pricing: {
          firstMonthTotal: config.firstMonthTotal,
          monthlyHosting: config.monthlyHosting,
        },
      },
    },
  })
  await prisma.notification.create({
    data: {
      type: 'CLOSE_ENGINE',
      title: 'Payment Link — Approve to Send',
      message: `${lead.firstName} at ${lead.companyName} wants to go live. Approve to generate Stripe link and send.`,
      metadata: { conversationId, leadId: lead.id },
    },
  })

  // SMS alert to admin phone
  try {
    const { notifyAdmin } = await import('./notifications')
    await notifyAdmin('approval', 'Payment Link Ready', `${lead.companyName} approved their site. Review & approve payment link.`)
  } catch {}

  // Transition conversation to PENDING_APPROVAL while waiting for Andrew
  await transitionStage(conversationId, CONVERSATION_STAGES.PENDING_APPROVAL)

  console.log(`[CloseEngine] PAYMENT_LINK approval created for ${lead.companyName} (${lead.id})`)
  return { success: true }
}

// ============================================
// getPaymentFollowUpMessage()
// Reads from Settings > Scheduled Messages > Pre-Client Messages
// ============================================

export async function getPaymentFollowUpMessage(
  hoursSinceSent: number,
  firstName: string
): Promise<{ message: string; threshold: string } | null> {
  const { getAutomatedMessages, fillTemplate } = await import('./automated-messages')
  const msgs = await getAutomatedMessages()

  // Ordered longest delay → shortest — first match wins
  const followUps = [
    { key: 'payment_followup_72h' as const, tag: '72h', fallbackDelay: 72 },
    { key: 'payment_followup_48h' as const, tag: '48h', fallbackDelay: 48 },
    { key: 'payment_followup_24h' as const, tag: '24h', fallbackDelay: 24 },
    { key: 'payment_followup_4h' as const, tag: '4h', fallbackDelay: 4 },
  ]

  for (const { key, tag, fallbackDelay } of followUps) {
    const config = msgs[key]
    if (!config.enabled) continue
    const delay = config.delayHours ?? fallbackDelay
    if (hoursSinceSent >= delay) {
      const text = fillTemplate(config.text, { firstName: firstName || '' })
      return { message: text, threshold: tag }
    }
  }

  return null
}
