import Stripe from 'stripe'
import { prisma } from './db'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

// Pre-created Stripe Payment Links
// Andrew: Create these in Stripe Dashboard → Payment Links
// Then paste the URLs here or add to env vars
const PAYMENT_LINKS = {
  SITE_BUILD: process.env.STRIPE_LINK_SITE_BUILD || '', // $149 one-time
  HOSTING_MONTHLY: process.env.STRIPE_LINK_HOSTING_39 || '', // $39/month
  HOSTING_ANNUAL: process.env.STRIPE_LINK_HOSTING_ANNUAL || '', // $399/year
  GBP_SETUP: process.env.STRIPE_LINK_GBP || '', // $49 one-time
  REVIEW_WIDGET: process.env.STRIPE_LINK_REVIEW_WIDGET || '', // $29/month
  SEO_MONTHLY: process.env.STRIPE_LINK_SEO || '', // $59/month
  SOCIAL_MONTHLY: process.env.STRIPE_LINK_SOCIAL || '', // $99/month
}

export function getPaymentLink(product: keyof typeof PAYMENT_LINKS, metadata?: { leadId?: string, clientId?: string }): string {
  const baseUrl = PAYMENT_LINKS[product]
  if (!baseUrl) return ''
  // Append client reference as URL param for tracking
  const url = new URL(baseUrl)
  if (metadata?.leadId) url.searchParams.set('client_reference_id', metadata.leadId)
  if (metadata?.clientId) url.searchParams.set('client_reference_id', metadata.clientId)
  return url.toString()
}

export { PAYMENT_LINKS }

export async function createCustomer(options: {
  email?: string
  name: string
  phone?: string
  metadata?: Record<string, string>
}) {
  const customer = await stripe.customers.create({
    email: options.email,
    name: options.name,
    phone: options.phone,
    metadata: options.metadata || {},
  })

  return customer
}

export async function createSubscription(options: {
  customerId: string
  priceId: string
  metadata?: Record<string, string>
}) {
  const subscription = await stripe.subscriptions.create({
    customer: options.customerId,
    items: [{ price: options.priceId }],
    metadata: options.metadata || {},
  })

  return subscription
}

export async function createPaymentLink(options: {
  amount: number // in dollars
  description: string
  metadata?: Record<string, string>
}) {
  // For one-time payments (site build)
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: options.description,
          },
          unit_amount: Math.round(options.amount * 100), // Convert to cents
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${process.env.BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.BASE_URL}/cancel`,
    metadata: options.metadata || {},
  })

  return session.url
}

export async function handleWebhook(body: string, signature: string) {
  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )

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

    return { received: true }
  } catch (err) {
    console.error('Webhook error:', err)
    throw err
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  // Site build payment completed
  const clientId = session.metadata?.clientId

  if (clientId) {
    await prisma.revenue.create({
      data: {
        clientId,
        type: 'SITE_BUILD',
        amount: (session.amount_total || 0) / 100,
        status: 'PAID',
        stripePaymentId: session.payment_intent as string,
      },
    })

    // Create notification
    await prisma.notification.create({
      data: {
        type: 'PAYMENT_RECEIVED',
        title: 'Payment Received',
        message: `Site build payment received: $${(session.amount_total || 0) / 100}`,
        metadata: { clientId },
      },
    })
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  // Recurring payment succeeded
  const customerId = invoice.customer as string

  const client = await prisma.client.findUnique({
    where: { stripeCustomerId: customerId },
  })

  if (client) {
    await prisma.revenue.create({
      data: {
        clientId: client.id,
        type: 'HOSTING_MONTHLY',
        amount: (invoice.amount_paid || 0) / 100,
        recurring: true,
        status: 'PAID',
        stripePaymentId: invoice.payment_intent as string,
      },
    })
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string

  const client = await prisma.client.findUnique({
    where: { stripeCustomerId: customerId },
  })

  if (client) {
    // Update hosting status
    await prisma.client.update({
      where: { id: client.id },
      data: { hostingStatus: 'FAILED_PAYMENT' },
    })

    // Create notification
    await prisma.notification.create({
      data: {
        type: 'PAYMENT_FAILED',
        title: 'Payment Failed',
        message: `Hosting payment failed for ${client.companyName}`,
        metadata: { clientId: client.id },
      },
    })
  }
}

async function handleSubscriptionCancelled(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string

  const client = await prisma.client.findUnique({
    where: { stripeCustomerId: customerId },
  })

  if (client) {
    await prisma.client.update({
      where: { id: client.id },
      data: { hostingStatus: 'CANCELLED' },
    })
  }
}

export default stripe
