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
  month1Price: 100,
  recurringPrice: 100,
  annualPrice: null,
  stripeLink: '',
  stripeLinkAnnual: null,
  pitchOneLiner: 'Free install, $100/mo hosting',
  previewBannerText: '$100/mo — free install',
  repCloseScript: "The install is free \u2014 we build your site, get it on your own domain, everything. It's just $100/month for hosting, security updates, and support. No contracts, cancel anytime.",
  siteBuildFee: 0,
  monthlyHosting: 100,
  firstMonthTotal: 100,
}

let cachedConfig: PricingConfig | null = null
let cacheTime = 0
const CACHE_TTL = 60_000 // 1 minute

/**
 * Get current pricing by reading the core product (isCore=true) from the Products table.
 * Caches for 60 seconds. Falls back to defaults if no core product exists.
 */
export async function getPricingConfig(options?: { forceRefresh?: boolean }): Promise<PricingConfig> {
  const now = Date.now()
  if (!options?.forceRefresh && cachedConfig && (now - cacheTime) < CACHE_TTL) return cachedConfig

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
  context += `- Install: FREE (site build included at no cost)\n`
  context += `- Monthly: $${config.recurringPrice}/mo (hosting, security & maintenance)\n`
  if (config.annualPrice) {
    context += `- Annual option: $${config.annualPrice}/yr (save $${(config.recurringPrice * 12) - config.annualPrice})\n`
  }
  context += `- Pitch: "${config.pitchOneLiner}"\n`
  context += `- Payment link: ${config.stripeLink || '(not configured)'}\n`
  if (config.stripeLinkAnnual) context += `- Annual payment link: ${config.stripeLinkAnnual}\n`
  context += '\n'
  context += 'IMPORTANT: When discussing pricing, lead with FREE install then the monthly cost. '
  context += `Do NOT mention any setup fee or build fee — the install is free. Just say: $${config.monthlyHosting}/mo, no contracts. `
  context += `Say: "${config.pitchOneLiner}"\n`

  return context
}
