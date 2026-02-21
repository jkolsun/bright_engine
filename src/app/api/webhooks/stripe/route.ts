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
  console.log('Processing checkout.session.completed:', session.id)

  const clientReferenceId = session.client_reference_id
  const amountTotal = session.amount_total || 0
  
  let clientId: string | undefined

  // If client_reference_id is a leadId, convert lead to client
  if (clientReferenceId) {
    const lead = await prisma.lead.findUnique({
      where: { id: clientReferenceId },
    })

    if (lead) {
      // Create client from lead
      const webhookConfig = await getPricingConfig()
      const client = await prisma.client.create({
        data: {
          companyName: lead.companyName,
          industry: lead.industry,
          siteUrl: '', // Will be set when site goes live
          hostingStatus: 'ACTIVE',
          monthlyRevenue: webhookConfig.monthlyHosting,
          stripeCustomerId: session.customer as string,
          leadId: lead.id,
        },
      })

      clientId = client.id

      // Update lead status
      await prisma.lead.update({
        where: { id: lead.id },
        data: { status: 'PAID' },
      })

      // Create notification
      await prisma.notification.create({
        data: {
          type: 'PAYMENT_RECEIVED',
          title: 'New Client Payment',
          message: `${lead.companyName} paid $${amountTotal / 100} - convert to client`,
          metadata: { 
            leadId: lead.id,
            clientId: client.id,
            amount: amountTotal / 100,
          },
        },
      })

      // 🚀 Dispatch webhook for immediate payment processing
      await dispatchWebhook(WebhookEvents.PAYMENT_RECEIVED(
        lead.id,
        client.id,
        amountTotal / 100,
        'stripe'
      ))

      // Queue onboarding email sequence
      try {
        await triggerOnboardingSequence(client.id)
      } catch (err) {
        console.error('Onboarding email sequence failed to queue:', err)
      }

      // ── CLOSE ENGINE: Post-Payment Processing ──
      try {
        const conversation = await prisma.closeEngineConversation.findUnique({
          where: { leadId: lead.id },
        })

        if (conversation && ['PAYMENT_SENT', 'PENDING_APPROVAL'].includes(conversation.stage)) {
          // 1. Complete the conversation
          await prisma.closeEngineConversation.update({
            where: { id: conversation.id },
            data: {
              stage: 'COMPLETED',
              completedAt: new Date(),
            },
          })

          // 1b. Log CLOSE_ENGINE_COMPLETED event
          await prisma.leadEvent.create({
            data: {
              leadId: lead.id,
              eventType: 'CLOSE_ENGINE_COMPLETED',
              metadata: {
                conversationId: conversation.id,
                entryPoint: conversation.entryPoint,
                amount: amountTotal / 100,
              },
            },
          })

          // 2. Copy autonomy level to client
          if (clientId) {
            await prisma.client.update({
              where: { id: clientId },
              data: { autonomyLevel: conversation.autonomyLevel },
            })
          }

          // 3. Send welcome message via SMS (~2.5 min delay after payment)
          const { getSystemMessage } = await import('@/lib/system-messages')
          const { text: welcomeMessage, enabled: welcomeEnabled } = await getSystemMessage('welcome_after_payment', { firstName: lead.firstName || 'there' })

          if (welcomeEnabled) {
            const { sendSMSViaProvider } = await import('@/lib/sms-provider')

            setTimeout(async () => {
              try {
                await sendSMSViaProvider({
                  to: lead.phone,
                  message: welcomeMessage,
                  leadId: lead.id,
                  clientId: clientId,
                  trigger: 'close_engine_welcome',
                  aiGenerated: true,
                  aiDelaySeconds: 150,
                  conversationType: 'post_client',
                  sender: 'clawdbot',
                })
              } catch (smsErr) {
                console.error('[Stripe Webhook] Welcome SMS failed:', smsErr)
              }
            }, 150 * 1000)
          }

          // 4. Enhanced notification
          await prisma.notification.create({
            data: {
              type: 'PAYMENT_RECEIVED',
              title: '🎉 AI Close Engine — New Client!',
              message: `${lead.companyName} paid $${amountTotal / 100} via Close Engine (${conversation.entryPoint})`,
              metadata: {
                leadId: lead.id,
                clientId,
                conversationId: conversation.id,
                entryPoint: conversation.entryPoint,
                amount: amountTotal / 100,
              },
            },
          })

          console.log(`[CloseEngine] Payment complete: ${lead.companyName}, conversation ${conversation.id} → COMPLETED`)
        }
      } catch (closeEngineErr) {
        console.error('[Stripe Webhook] Close Engine post-payment processing failed:', closeEngineErr)
        // Don't fail the webhook if Close Engine processing fails
      }
    }
  }

  // Create revenue record (only if we have a client)
  if (clientId) {
    const config = await getPricingConfig()
    const amountDollars = amountTotal / 100

    let revenue
    if (amountDollars >= config.firstMonthTotal * 0.9) {
      // First month combined — split into build + hosting revenue
      await prisma.revenue.create({
        data: { clientId, type: 'SITE_BUILD', amount: config.siteBuildFee, status: 'PAID', recurring: false, product: 'Website Setup' }
      })
      revenue = await prisma.revenue.create({
        data: { clientId, type: 'HOSTING_MONTHLY', amount: config.monthlyHosting, status: 'PAID', recurring: true, product: 'Monthly Hosting' }
      })
    } else {
      revenue = await prisma.revenue.create({
        data: { clientId, type: 'HOSTING_MONTHLY', amount: amountDollars, status: 'PAID', recurring: true, product: 'Monthly Hosting' }
      })
    }

    // Process commission automatically
    try {
      await processRevenueCommission(revenue.id)
    } catch (err) {
      console.error('Commission processing failed:', err)
      // Don't fail the webhook if commission fails
    }
  }

  // Generic payment notification
  await prisma.notification.create({
    data: {
      type: 'PAYMENT_RECEIVED',
      title: 'Payment Received',
      message: `Stripe payment: $${amountTotal / 100}`,
      metadata: { 
        sessionId: session.id,
        amount: amountTotal / 100,
      },
    },
  })

  console.log(`Payment processed: $${amountTotal / 100}`)
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