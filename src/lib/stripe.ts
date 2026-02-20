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

// LEGACY FALLBACK — primary source is now Products table via getPaymentLinkDynamic()
const PAYMENT_LINKS = {
  SITE_BUILD: process.env.STRIPE_LINK_SITE_BUILD || '', // $188 first month (build + hosting)
  HOSTING_MONTHLY: process.env.STRIPE_LINK_HOSTING_39 || '', // $39/month
  HOSTING_ANNUAL: process.env.STRIPE_LINK_HOSTING_ANNUAL || '', // $349/year (save $119)
  GBP_SETUP: process.env.STRIPE_LINK_GBP || '', // $49 one-time
  REVIEW_WIDGET: process.env.STRIPE_LINK_REVIEW_WIDGET || '', // $69/month
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

/**
 * DB-first payment link lookup. Checks Products table → env vars → legacy constants.
 */
export async function getPaymentLinkDynamic(
  productName: string,
  metadata?: { leadId?: string; clientId?: string }
): Promise<string> {
  // 1. Check Products table
  try {
    const product = await prisma.upsellProduct.findFirst({
      where: {
        active: true,
        deletedAt: null,
        OR: [
          { name: { contains: productName, mode: 'insensitive' } },
          { id: productName },
        ]
      }
    })
    if (product?.stripeLink) return appendMetadata(product.stripeLink, metadata)
  } catch (e) {
    console.warn('[Stripe] DB lookup failed:', e)
  }

  // 2. Env vars fallback
  const envMap: Record<string, string | undefined> = {
    site_build: process.env.STRIPE_LINK_SITE_BUILD,
    hosting_monthly: process.env.STRIPE_LINK_HOSTING_39,
    hosting_annual: process.env.STRIPE_LINK_HOSTING_ANNUAL,
    gbp: process.env.STRIPE_LINK_GBP,
    review_widget: process.env.STRIPE_LINK_REVIEW_WIDGET,
    seo: process.env.STRIPE_LINK_SEO,
    social: process.env.STRIPE_LINK_SOCIAL,
  }
  const key = productName.toLowerCase().replace(/[^a-z0-9]/g, '_')
  const envUrl = envMap[key]
  if (envUrl) return appendMetadata(envUrl, metadata)

  // 3. Legacy constant fallback
  const legacyKey = key.toUpperCase() as keyof typeof PAYMENT_LINKS
  if (PAYMENT_LINKS[legacyKey]) return appendMetadata(PAYMENT_LINKS[legacyKey], metadata)

  return ''
}

function appendMetadata(baseUrl: string, metadata?: { leadId?: string; clientId?: string }): string {
  if (!metadata) return baseUrl
  try {
    const url = new URL(baseUrl)
    if (metadata.leadId) url.searchParams.set('client_reference_id', metadata.leadId)
    if (metadata.clientId) url.searchParams.set('client_reference_id', metadata.clientId)
    return url.toString()
  } catch { return baseUrl }
}

/**
 * Get ALL active products with Stripe links (for AI context and UI).
 */
export async function getAllPaymentLinks(): Promise<Array<{
  id: string; name: string; url: string; price: number; recurring: boolean; isCore: boolean
}>> {
  try {
    const products = await prisma.upsellProduct.findMany({
      where: { active: true, deletedAt: null, stripeLink: { not: null } },
      orderBy: [{ isCore: 'desc' }, { sortOrder: 'asc' }],
    })
    return products
      .filter(p => p.stripeLink)
      .map(p => ({
        id: p.id, name: p.name, url: p.stripeLink!, price: p.price,
        recurring: p.recurring, isCore: p.isCore,
      }))
  } catch (e) {
    console.warn('[Stripe] Failed to fetch products:', e)
    return []
  }
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
