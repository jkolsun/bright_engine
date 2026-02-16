import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY not set — cannot initialize Stripe')
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    })
  }
  return _stripe
}

// Keep backward-compatible export (lazy proxy)
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getStripe() as any)[prop]
  }
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
  const customer = await getStripe().customers.create({
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
  const subscription = await getStripe().subscriptions.create({
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
  const session = await getStripe().checkout.sessions.create({
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

export default getStripe()
