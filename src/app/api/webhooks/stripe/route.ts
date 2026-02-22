import { NextRequest, NextResponse } from 'next/server'
import { dispatchWebhook, WebhookEvents } from '@/lib/webhook-dispatcher'
import { getPricingConfig } from '@/lib/pricing-config'
import type Stripe from 'stripe'
import { prisma } from '@/lib/db'
import { processRevenueCommission } from '@/lib/commissions'
import { triggerOnboardingSequence, triggerWinBackSequence } from '@/lib/resend'

export const dynamic = 'force-dynamic'

// Lazy stripe initialization (avoid loading Stripe SDK at build time)
let _stripeInstance: any = null
function initStripe() {
  if (!_stripeInstance) {
    const { default: StripeSdk } = require('stripe')
    const key = process.env.STRIPE_SECRET_KEY || 'build-placeholder'
    if (key === 'build-placeholder') {
      throw new Error('STRIPE_SECRET_KEY not configured')
    }
    _stripeInstance = new StripeSdk(key, { apiVersion: '2023-10-16' })
  }
  return _stripeInstance
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    const stripe = initStripe()
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionCancelled(event.data.object as Stripe.Subscription)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const amountTotal = session.amount_total || 0
  const amountDollars = amountTotal / 100

  console.log(`[Stripe Webhook] checkout.session.completed — session=${session.id}, amount=$${amountDollars}, client_reference_id=${session.client_reference_id}, customer=${session.customer}, email=${session.customer_details?.email}`)

  // ── Step 1: Match to a Lead ──
  // Try client_reference_id first, then session metadata, then email fallback
  const leadId = session.client_reference_id
    || (session.metadata?.leadId as string | undefined)

  let lead = leadId
    ? await prisma.lead.findUnique({ where: { id: leadId } })
    : null

  // Email fallback: match by customer_details.email or customer_email
  if (!lead) {
    const email = session.customer_details?.email || session.customer_email
    if (email) {
      lead = await prisma.lead.findFirst({
        where: { email, status: { notIn: ['PAID', 'CLOSED_LOST', 'DO_NOT_CONTACT'] } },
        orderBy: { createdAt: 'desc' },
      })
      if (lead) {
        console.log(`[Stripe Webhook] Matched lead by email fallback: ${email} → ${lead.id} (${lead.companyName})`)
      }
    }
  }

  // Phone fallback: match by customer phone number
  if (!lead) {
    const phone = session.customer_details?.phone
    if (phone) {
      const digits = phone.replace(/\D/g, '').slice(-10)
      if (digits.length === 10) {
        lead = await prisma.lead.findFirst({
          where: {
            phone: { endsWith: digits },
            status: { notIn: ['PAID', 'CLOSED_LOST', 'DO_NOT_CONTACT'] },
          },
          orderBy: { createdAt: 'desc' },
        })
        if (lead) {
          console.log(`[Stripe Webhook] Matched lead by phone fallback: ${phone} → ${lead.id} (${lead.companyName})`)
        }
      }
    }
  }

  if (!lead) {
    console.warn(`[Stripe Webhook] No lead found for session ${session.id} — client_reference_id=${session.client_reference_id}, email=${session.customer_details?.email}`)
    // Still record the payment as a notification so it's not lost
    await prisma.notification.create({
      data: {
        type: 'PAYMENT_RECEIVED',
        title: 'Unmatched Payment Received',
        message: `Stripe payment of $${amountDollars} could not be matched to a lead. Session: ${session.id}, Email: ${session.customer_details?.email || 'unknown'}`,
        metadata: { sessionId: session.id, amount: amountDollars, email: session.customer_details?.email },
      },
    })
    return
  }

  console.log(`[Stripe Webhook] Matched lead: ${lead.id} (${lead.companyName})`)

  // ── Step 2: Check for duplicate — skip if lead already PAID ──
  if (lead.status === 'PAID') {
    console.log(`[Stripe Webhook] Lead ${lead.id} already PAID — skipping duplicate`)
    return
  }

  // ── Step 3: Create Client from Lead ──
  const webhookConfig = await getPricingConfig()
  const stripeCustomerId = session.customer ? String(session.customer) : null

  const client = await prisma.client.create({
    data: {
      companyName: lead.companyName,
      contactName: [lead.firstName, lead.lastName].filter(Boolean).join(' ') || null,
      phone: lead.phone,
      email: lead.email,
      industry: lead.industry,
      siteUrl: lead.previewUrl || '',
      hostingStatus: 'ACTIVE',
      monthlyRevenue: webhookConfig.monthlyHosting,
      stripeCustomerId,
      leadId: lead.id,
      repId: lead.assignedToId,
    },
  })

  console.log(`[Stripe Webhook] Client created: ${client.id} for ${lead.companyName}`)

  // ── Step 4: Update Lead status to PAID ──
  await prisma.lead.update({
    where: { id: lead.id },
    data: { status: 'PAID' },
  })

  // ── Step 5: Log PAYMENT_RECEIVED event ──
  await prisma.leadEvent.create({
    data: {
      leadId: lead.id,
      eventType: 'PAYMENT_RECEIVED',
      metadata: {
        sessionId: session.id,
        clientId: client.id,
        amount: amountDollars,
        stripeCustomerId,
      },
    },
  })

  // ── Step 6: Create Revenue records ──
  let revenue
  if (amountDollars >= webhookConfig.firstMonthTotal * 0.9) {
    // First month combined — split into site build + first hosting
    await prisma.revenue.create({
      data: { clientId: client.id, type: 'SITE_BUILD', amount: webhookConfig.siteBuildFee, status: 'PAID', recurring: false, product: 'Website Setup' },
    })
    revenue = await prisma.revenue.create({
      data: { clientId: client.id, type: 'HOSTING_MONTHLY', amount: webhookConfig.monthlyHosting, status: 'PAID', recurring: true, product: 'Monthly Hosting' },
    })
  } else {
    revenue = await prisma.revenue.create({
      data: { clientId: client.id, type: 'HOSTING_MONTHLY', amount: amountDollars, status: 'PAID', recurring: true, product: 'Monthly Hosting' },
    })
  }

  // ── Step 7: Process commission ──
  try {
    await processRevenueCommission(revenue.id)
  } catch (err) {
    console.error('[Stripe Webhook] Commission processing failed:', err)
  }

  // ── Step 8: Create notification ──
  await prisma.notification.create({
    data: {
      type: 'PAYMENT_RECEIVED',
      title: 'New Client Payment',
      message: `${lead.companyName} paid $${amountDollars} — client created`,
      metadata: {
        leadId: lead.id,
        clientId: client.id,
        amount: amountDollars,
      },
    },
  })

  // ── Step 9: Dispatch webhook to Clawdbot ──
  try {
    await dispatchWebhook(WebhookEvents.PAYMENT_RECEIVED(
      lead.id,
      client.id,
      amountDollars,
      'stripe'
    ))
  } catch (err) {
    console.error('[Stripe Webhook] Webhook dispatch failed:', err)
  }

  // ── Step 10: Queue onboarding email sequence ──
  try {
    await triggerOnboardingSequence(client.id)
  } catch (err) {
    console.error('[Stripe Webhook] Onboarding email sequence failed:', err)
  }

  // ── Step 11: Send confirmation SMS ──
  try {
    const { getSystemMessage } = await import('@/lib/system-messages')
    const { text: welcomeMessage, enabled: welcomeEnabled } = await getSystemMessage('welcome_after_payment', {
      firstName: lead.firstName || 'there',
    })

    if (welcomeEnabled && lead.phone) {
      const { sendSMSViaProvider } = await import('@/lib/sms-provider')
      await sendSMSViaProvider({
        to: lead.phone,
        message: welcomeMessage,
        leadId: lead.id,
        clientId: client.id,
        trigger: 'welcome_after_payment',
        aiGenerated: true,
        conversationType: 'post_client',
        sender: 'clawdbot',
      })
      console.log(`[Stripe Webhook] Welcome SMS sent to ${lead.phone}`)
    }
  } catch (smsErr) {
    console.error('[Stripe Webhook] Welcome SMS failed:', smsErr)
  }

  // ── Step 12: Close Engine post-payment processing ──
  try {
    const conversation = await prisma.closeEngineConversation.findUnique({
      where: { leadId: lead.id },
    })

    if (conversation && ['PAYMENT_SENT', 'PENDING_APPROVAL'].includes(conversation.stage)) {
      await prisma.closeEngineConversation.update({
        where: { id: conversation.id },
        data: { stage: 'COMPLETED', completedAt: new Date() },
      })

      await prisma.leadEvent.create({
        data: {
          leadId: lead.id,
          eventType: 'CLOSE_ENGINE_COMPLETED',
          metadata: {
            conversationId: conversation.id,
            entryPoint: conversation.entryPoint,
            amount: amountDollars,
          },
        },
      })

      // Copy autonomy level to client
      await prisma.client.update({
        where: { id: client.id },
        data: { autonomyLevel: conversation.autonomyLevel },
      })

      // Enhanced Close Engine notification
      await prisma.notification.create({
        data: {
          type: 'CLOSE_ENGINE',
          title: 'AI Close Engine — New Client!',
          message: `${lead.companyName} paid $${amountDollars} via Close Engine (${conversation.entryPoint})`,
          metadata: {
            leadId: lead.id,
            clientId: client.id,
            conversationId: conversation.id,
            entryPoint: conversation.entryPoint,
            amount: amountDollars,
          },
        },
      })

      console.log(`[Stripe Webhook] Close Engine completed: ${lead.companyName}, conversation ${conversation.id} → COMPLETED`)
    }
  } catch (closeEngineErr) {
    console.error('[Stripe Webhook] Close Engine post-payment processing failed:', closeEngineErr)
  }

  console.log(`[Stripe Webhook] Payment fully processed: ${lead.companyName} → $${amountDollars}`)
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('Processing invoice.payment_succeeded:', invoice.id)

  const customerId = invoice.customer as string
  const amount = (invoice.amount_paid || 0) / 100

  // Find client by Stripe customer ID
  const client = await prisma.client.findUnique({
    where: { stripeCustomerId: customerId },
  })

  if (client) {
    // Record monthly hosting payment
    const revenue = await prisma.revenue.create({
      data: {
        clientId: client.id,
        type: 'HOSTING_MONTHLY',
        amount,
        recurring: true,
        status: 'PAID',
      },
    })

    // Log PAYMENT_RECEIVED event on the lead
    if (client.leadId) {
      try {
        await prisma.leadEvent.create({
          data: {
            leadId: client.leadId,
            eventType: 'PAYMENT_RECEIVED',
            metadata: {
              invoiceId: invoice.id,
              clientId: client.id,
              amount,
              type: 'HOSTING_MONTHLY',
              stripeCustomerId: customerId,
            },
          },
        })
      } catch (err) {
        console.error('[Stripe Webhook] LeadEvent creation failed:', err)
      }
    }

    // Process commission automatically
    try {
      await processRevenueCommission(revenue.id)
    } catch (err) {
      console.error('Commission processing failed:', err)
    }

    // Ensure client stays active
    await prisma.client.update({
      where: { id: client.id },
      data: { hostingStatus: 'ACTIVE' },
    })
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Processing invoice.payment_failed:', invoice.id)

  const customerId = invoice.customer as string
  const client = await prisma.client.findUnique({
    where: { stripeCustomerId: customerId },
  })

  if (client) {
    await prisma.client.update({
      where: { id: client.id },
      data: { hostingStatus: 'FAILED_PAYMENT' },
    })

    await prisma.notification.create({
      data: {
        type: 'PAYMENT_FAILED',
        title: 'Payment Failed',
        message: `Hosting payment failed: ${client.companyName}`,
        metadata: { clientId: client.id },
      },
    })
  }
}

async function handleSubscriptionCancelled(subscription: Stripe.Subscription) {
  console.log('Processing customer.subscription.deleted:', subscription.id)

  const customerId = subscription.customer as string
  const client = await prisma.client.findUnique({
    where: { stripeCustomerId: customerId },
  })

  if (client) {
    await prisma.client.update({
      where: { id: client.id },
      data: { hostingStatus: 'CANCELLED' },
    })

    await prisma.notification.create({
      data: {
        type: 'PAYMENT_FAILED', // Use existing type for cancellations
        title: 'Subscription Cancelled',
        message: `${client.companyName} cancelled hosting`,
        metadata: { clientId: client.id },
      },
    })

    // Queue win-back email sequence
    try {
      await triggerWinBackSequence(client.id)
    } catch (err) {
      console.error('Win-back email sequence failed to queue:', err)
    }
  }
}