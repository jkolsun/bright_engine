import { prisma } from './db'

export interface PricingConfig {
  coreProductId: string
  name: string
  month1Price: number
  recurringPrice: number
  annualPrice: number | null
  stripeLink: string
  stripeLinkAnnual: string | null
  pitchOneLiner: string
  previewBannerText: string
  repCloseScript: string
  // Computed
  siteBuildFee: number      // month1Price - recurringPrice
  monthlyHosting: number    // recurringPrice
  firstMonthTotal: number   // month1Price
}

const DEFAULT_PRICING: PricingConfig = {
  coreProductId: '',
  name: 'Website + Hosting',
  month1Price: 188,
  recurringPrice: 39,
  annualPrice: null,
  stripeLink: '',
  stripeLinkAnnual: null,
  pitchOneLiner: '$188 to go live, $39/mo after that',
  previewBannerText: '$188 to get started',
  repCloseScript: "It's $188 for the first month \u2014 that covers the full site build plus your first month of hosting. After that it's just $39/month to keep everything running.",
  siteBuildFee: 149,
  monthlyHosting: 39,
  firstMonthTotal: 188,
}

let cachedConfig: PricingConfig | null = null
let cacheTime = 0
const CACHE_TTL = 60_000 // 1 minute

/**
 * Get current pricing by reading the core product (isCore=true) from the Products table.
 * Caches for 60 seconds. Falls back to defaults if no core product exists.
 */
export async function getPricingConfig(): Promise<PricingConfig> {
  const now = Date.now()
  if (cachedConfig && (now - cacheTime) < CACHE_TTL) return cachedConfig

  try {
    const coreProduct = await prisma.upsellProduct.findFirst({
      where: { isCore: true, active: true },
      orderBy: { sortOrder: 'asc' },
    })

    if (coreProduct && coreProduct.month1Price && coreProduct.recurringPrice) {
      cachedConfig = {
        coreProductId: coreProduct.id,
        name: coreProduct.name,
        month1Price: coreProduct.month1Price,
        recurringPrice: coreProduct.recurringPrice,
        annualPrice: coreProduct.annualPrice,
        stripeLink: coreProduct.stripeLink || '',
        stripeLinkAnnual: coreProduct.stripeLinkAnnual || '',
        pitchOneLiner: coreProduct.pitchOneLiner || `$${coreProduct.month1Price} to go live, $${coreProduct.recurringPrice}/mo after that`,
        previewBannerText: coreProduct.previewBannerText || `$${coreProduct.month1Price} to get started`,
        repCloseScript: coreProduct.repCloseScript || `It's $${coreProduct.month1Price} for the first month — covers the build plus first month hosting. $${coreProduct.recurringPrice}/month after that.`,
        siteBuildFee: coreProduct.month1Price - coreProduct.recurringPrice,
        monthlyHosting: coreProduct.recurringPrice,
        firstMonthTotal: coreProduct.month1Price,
      }
      cacheTime = now
      return cachedConfig
    }
  } catch (e) {
    console.warn('[Pricing] DB lookup failed, using defaults:', e)
  }

  return DEFAULT_PRICING
}

/**
 * Bust the cache. Call after updating core product via API.
 */
export function bustPricingCache() {
  cachedConfig = null
  cacheTime = 0
}

/**
 * Pricing context block for AI system prompts (Close Engine + Post-Client AI).
 */
export async function buildPricingContextForAI(): Promise<string> {
  const config = await getPricingConfig()

  let context = '## Pricing Information\n\n'
  context += `### Core Product: ${config.name}\n`
  context += `- First month: $${config.month1Price} (includes site build + first month hosting)\n`
  context += `- Month 2+: $${config.recurringPrice}/mo (hosting & maintenance)\n`
  if (config.annualPrice) {
    context += `- Annual option: $${config.annualPrice}/yr (save $${(config.recurringPrice * 12) - config.annualPrice})\n`
  }
  context += `- Pitch: "${config.pitchOneLiner}"\n`
  context += `- Payment link: ${config.stripeLink || '(not configured)'}\n`
  if (config.stripeLinkAnnual) context += `- Annual payment link: ${config.stripeLinkAnnual}\n`
  context += '\n'
  context += 'IMPORTANT: When discussing pricing, present it as the first month covers everything including the build. '
  context += `Do NOT split it into "$${config.siteBuildFee} build" and "$${config.monthlyHosting}/mo hosting" separately. `
  context += `Say: "${config.pitchOneLiner}"\n`

  return context
}
