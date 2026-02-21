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

  const pricingConfig = await getPricingConfig()

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

  // Always create a PAYMENT_LINK approval — Stripe link is generated when Andrew approves.
  // This ensures the approval is ALWAYS created even if Stripe is down.
  await prisma.approval.create({
    data: {
      gate: 'PAYMENT_LINK',
      title: `Payment Link — ${lead.companyName}`,
      description: `${lead.firstName} at ${lead.companyName} is ready to buy. Approve to generate Stripe link and send via SMS.`,
      draftContent: `Here's your payment link to go live: [generated on approval]\n\n$${config.firstMonthTotal} gets your site built and launched, plus monthly hosting at $${config.monthlyHosting}/month. You can cancel anytime.\n\nOnce you pay, we'll have your site live within 48 hours!`,
      leadId: lead.id,
      requestedBy: 'system',
      status: 'PENDING',
      priority: 'HIGH',
      metadata: {
        conversationId,
        phone: lead.phone,
        email: lead.email || null,
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

  // Transition conversation to PENDING_APPROVAL while waiting for Andrew
  await transitionStage(conversationId, CONVERSATION_STAGES.PENDING_APPROVAL)

  console.log(`[CloseEngine] PAYMENT_LINK approval created for ${lead.companyName} (${lead.id})`)
  return { success: true }
}

// ============================================
// getPaymentFollowUpMessage()
// ============================================

export function getPaymentFollowUpMessage(hoursSinceSent: number, firstName: string): string | null {
  if (hoursSinceSent >= 72) {
    return `Last check-in — want me to hold your spot or should I free it up for someone else, ${firstName}?`
  } else if (hoursSinceSent >= 48) {
    return `Hey ${firstName}, your preview is looking great. Payment link is ready when you are!`
  } else if (hoursSinceSent >= 24) {
    return `Hey ${firstName}, just wanted to make sure you got the payment link. Any questions about getting your site live?`
  } else if (hoursSinceSent >= 4) {
    return `Hey ${firstName}, just checking — any questions about getting your site live?`
  }
  return null // Too soon for follow-up
}
