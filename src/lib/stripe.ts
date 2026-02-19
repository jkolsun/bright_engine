import Stripe from 'stripe'
import { prisma } from './db'

let _stripe: Stripe | null = null

function validateStripeKey(key: string): void {
  if (key === 'build-placeholder-do-not-use-in-production') {
    throw new Error('STRIPE_SECRET_KEY not set — cannot initialize Stripe at runtime')
  }
}

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY || 'build-placeholder-do-not-use-in-production'
    validateStripeKey(key)
    _stripe = new Stripe(key, {
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
  HOSTING_ANNUAL: process.env.STRIPE_LINK_HOSTING_ANNUAL || '', // $349/year (save $119)
  GBP_SETUP: process.env.STRIPE_LINK_GBP || '', // $49 one-time
  REVIEW_WIDGET: process.env.STRIPE_LINK_REVIEW_WIDGET || '', // $69/month
  SEO_MONTHLY: process.env.STRIPE_LINK_SEO || '', // $149/month
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

/**
 * Get a payment link — checks DB first, falls back to env vars.
 * This is the NEW single source of truth. Use this instead of getPaymentLink().
 */
export async function getPaymentLinkDynamic(
  productId: string,
  metadata?: { leadId?: string; clientId?: string }
): Promise<string> {
  // 1. Check DB first
  try {
    const setting = await prisma.settings.findUnique({
      where: { key: 'payment_links' }
    })
    if (setting?.value && Array.isArray(setting.value)) {
      const links = setting.value as any[]
      const match = links.find(
        (l: any) => l.id === productId && l.active && l.url
      )
      if (match?.url) {
        return appendMetadata(match.url, metadata)
      }
    }
  } catch (e) {
    console.warn('[Stripe] DB lookup failed, falling back to env:', e)
  }

  // 2. Fall back to env vars
  const envMap: Record<string, string | undefined> = {
    site_build: process.env.STRIPE_LINK_SITE_BUILD,
    hosting_monthly: process.env.STRIPE_LINK_HOSTING_39,
    hosting_annual: process.env.STRIPE_LINK_HOSTING_ANNUAL,
    gbp_setup: process.env.STRIPE_LINK_GBP,
    review_widget: process.env.STRIPE_LINK_REVIEW_WIDGET,
    seo_monthly: process.env.STRIPE_LINK_SEO,
    social_monthly: process.env.STRIPE_LINK_SOCIAL,
  }

  const envUrl = envMap[productId]
  if (envUrl) return appendMetadata(envUrl, metadata)

  // 3. Fall back to legacy PAYMENT_LINKS keys
  const legacyMap: Record<string, keyof typeof PAYMENT_LINKS> = {
    site_build: 'SITE_BUILD',
    hosting_monthly: 'HOSTING_MONTHLY',
    hosting_annual: 'HOSTING_ANNUAL',
    gbp_setup: 'GBP_SETUP',
    review_widget: 'REVIEW_WIDGET',
    seo_monthly: 'SEO_MONTHLY',
    social_monthly: 'SOCIAL_MONTHLY',
  }
  const legacyKey = legacyMap[productId]
  if (legacyKey && PAYMENT_LINKS[legacyKey]) {
    return appendMetadata(PAYMENT_LINKS[legacyKey], metadata)
  }

  return ''
}

function appendMetadata(
  baseUrl: string,
  metadata?: { leadId?: string; clientId?: string }
): string {
  if (!metadata) return baseUrl
  try {
    const url = new URL(baseUrl)
    if (metadata.leadId) url.searchParams.set('client_reference_id', metadata.leadId)
    if (metadata.clientId) url.searchParams.set('client_reference_id', metadata.clientId)
    return url.toString()
  } catch {
    return baseUrl
  }
}

/**
 * Get ALL active payment links (for AI context, UI displays, etc.)
 */
export async function getAllPaymentLinks(): Promise<Array<{
  id: string; label: string; url: string; price: number; recurring: boolean
}>> {
  try {
    const setting = await prisma.settings.findUnique({
      where: { key: 'payment_links' }
    })
    if (setting?.value && Array.isArray(setting.value)) {
      return (setting.value as any[]).filter((l: any) => l.active && l.url)
    }
  } catch (e) {
    console.warn('[Stripe] Failed to fetch payment links from DB:', e)
  }

  // Fallback: build from env vars
  return Object.entries(PAYMENT_LINKS)
    .filter(([_, url]) => !!url)
    .map(([key, url]) => ({
      id: key.toLowerCase(),
      label: key.replace(/_/g, ' '),
      url,
      price: 0,
      recurring: false,
    }))
}

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
