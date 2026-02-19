/**
 * Close Engine Payment Link Generation + Sending
 *
 * Creates dynamic Stripe Checkout Sessions per lead and handles
 * sending payment links via SMS with autonomy checks.
 */

import { getStripe } from './stripe'
import { prisma } from './db'
import { sendSMSViaProvider } from './sms-provider'
import {
  checkAutonomy,
  transitionStage,
  getConversationContext,
  CONVERSATION_STAGES,
} from './close-engine'
import { calculateDelay } from './close-engine-processor'

// ============================================
// generatePaymentLink()
// ============================================

export async function generatePaymentLink(leadId: string): Promise<string> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } })
  if (!lead) throw new Error(`Lead ${leadId} not found`)

  const conversation = await prisma.closeEngineConversation.findUnique({
    where: { leadId },
  })

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
        unit_amount: 14900, // $149.00
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

  // Check autonomy
  const autonomy = await checkAutonomy(conversationId, 'SEND_PAYMENT_LINK')

  // Generate the link
  const paymentUrl = await generatePaymentLink(lead.id)

  const message = `Looks great! Here's your payment link to go live: ${paymentUrl}\n\n$149 gets your site built and launched, plus monthly hosting at $39/month. You can cancel anytime.\n\nOnce you pay, we'll have your site live within 48 hours!`

  if (autonomy.requiresApproval) {
    await prisma.pendingAction.create({
      data: {
        conversationId,
        leadId: lead.id,
        type: 'SEND_PAYMENT_LINK',
        draftMessage: message,
        metadata: { paymentUrl },
        status: 'PENDING',
      },
    })
    await prisma.notification.create({
      data: {
        type: 'CLOSE_ENGINE',
        title: 'Payment Link Ready — Approve?',
        message: `Payment link ready for ${lead.companyName}. Approve to send.`,
        metadata: { conversationId, leadId: lead.id, paymentUrl },
      },
    })
    return { success: true }
  }

  const delay = calculateDelay(message.length, 'payment_link')

  setTimeout(async () => {
    try {
      await sendSMSViaProvider({
        to: lead.phone,
        message,
        leadId: lead.id,
        trigger: 'close_engine_payment_link',
        aiGenerated: true,
        aiDelaySeconds: delay,
        conversationType: 'pre_client',
        sender: 'clawdbot',
      })
      await transitionStage(conversationId, CONVERSATION_STAGES.PAYMENT_SENT)
    } catch (err) {
      console.error('[CloseEngine] Payment link send failed:', err)
    }
  }, delay * 1000)

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
