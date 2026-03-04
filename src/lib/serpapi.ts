import { prisma } from './db'

const SERPAPI_KEY = process.env.SERPAPI_KEY!

export interface EnrichmentResult {
  address?: string
  phone?: string
  hours?: Record<string, string>
  services?: string[]
  rating?: number
  reviews?: number
  photos?: string[]
  competitors?: Array<{
    name: string
    rating: number
    reviews: number
    hasWebsite: boolean
  }>
}

export async function enrichLead(leadId: string): Promise<EnrichmentResult> {
  // Check daily SerpAPI budget before making any calls
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const todayUsage = await prisma.apiCost.count({
    where: {
      service: 'serpapi',
      createdAt: { gte: todayStart },
    },
  })

  // Safety cap to prevent runaway API costs
  // NOTE: This counts raw API calls, not leads (each lead makes 3-5 queries)
  // Default 0 = disabled (SerpAPI account has its own billing limits)
  // Set SERPAPI_DAILY_LIMIT env var to a number to enable
  const DAILY_SERPAPI_LIMIT = parseInt(process.env.SERPAPI_DAILY_LIMIT || '0', 10)

  if (DAILY_SERPAPI_LIMIT > 0 && todayUsage >= DAILY_SERPAPI_LIMIT) {
    console.log(`[ENRICHMENT] Daily SerpAPI limit reached (${todayUsage}/${DAILY_SERPAPI_LIMIT}). Skipping enrichment for lead ${leadId}.`)
    throw new Error('SERPAPI_DAILY_LIMIT_REACHED')
  }

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
  })

  if (!lead) {
    throw new Error('Lead not found')
  }

  // Skip if already enriched
  if (lead.enrichedRating != null || lead.enrichedAddress) {
    console.log(`[ENRICHMENT] Lead ${leadId} already enriched. Skipping.`)
    return {
      address: lead.enrichedAddress || undefined,
      rating: lead.enrichedRating ? Number(lead.enrichedRating) : undefined,
      reviews: lead.enrichedReviews ? Number(lead.enrichedReviews) : undefined,
    }
  }

  try {
    // Build fallback queries — most specific to least specific (max 2 to conserve credits)
    const queries: string[] = []

    // Query 1: Full match (company + city + state) — highest hit rate
    if (lead.city && lead.state) {
      queries.push(`${lead.companyName} ${lead.city} ${lead.state}`)
    }

    // Query 2: Company + state only (catches city name mismatches like "Ft Worth" vs "Fort Worth")
    if (lead.state) {
      queries.push(`${lead.companyName} ${lead.state}`)
    }

    // Fallback: company name only if no location data at all
    if (queries.length === 0) {
      queries.push(lead.companyName)
    }

    // Deduplicate queries
    const uniqueQueries = [...new Set(queries)]

    let result: any = null
    let data: any = null

    for (const query of uniqueQueries) {
      console.log(`[ENRICHMENT] Trying query: "${query}" for lead ${leadId}`)

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 30_000)
      const response = await fetch(
        `https://serpapi.com/search.json?` +
          new URLSearchParams({
            api_key: SERPAPI_KEY,
            engine: 'google_maps',
            q: query,
            type: 'search',
          }),
        { signal: controller.signal }
      )
      clearTimeout(timeout)

      // Log cost for each API call
      await prisma.apiCost.create({
        data: { service: 'serpapi', operation: 'enrichment', cost: 0.002 },
      })

      if (!response.ok) {
        console.warn(`[ENRICHMENT] SerpAPI error for query "${query}": ${response.statusText}`)
        continue
      }

      data = await response.json()
      result = data.local_results?.[0]

      if (result) {
        console.log(`[ENRICHMENT] Found result on query: "${query}"`)
        break
      }

      console.log(`[ENRICHMENT] No results for query: "${query}", trying next...`)
    }

    if (!result) {
      console.log(`[ENRICHMENT] No results found for lead ${leadId} after ${uniqueQueries.length} queries`)
      return {}
    }

    // Extract data with defensive handling for varying SerpAPI response formats
    let services: string[] = []
    try {
      if (Array.isArray(result.service_options)) {
        services = result.service_options
          .map((s: any) => typeof s === 'string' ? s : s.name || s.offered_service || '')
          .filter(Boolean)
      }
    } catch { /* non-fatal */ }

    let photos: string[] = []
    try {
      if (Array.isArray(result.photos)) {
        photos = result.photos
          .slice(0, 10)
          .map((p: any) => typeof p === 'string' ? p : p.thumbnail || p.url || '')
          .filter(Boolean)
      }
    } catch { /* non-fatal */ }

    let hours: Record<string, string> | undefined
    if (result.hours && typeof result.hours === 'object' && !Array.isArray(result.hours)) {
      hours = result.hours
    }

    const enrichment: EnrichmentResult = {
      address: result.address,
      phone: result.phone,
      hours,
      services,
      rating: typeof result.rating === 'number' ? result.rating : undefined,
      reviews: typeof result.reviews === 'number' ? result.reviews : undefined,
      photos,
    }

    // Get top 3 competitors
    const competitors = data.local_results
      ?.slice(1, 4)
      .map((c: any) => ({
        name: c.title,
        rating: c.rating || 0,
        reviews: c.reviews || 0,
        hasWebsite: !!c.website,
      }))

    enrichment.competitors = competitors || []

    // Update lead in database
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        enrichedAddress: enrichment.address,
        enrichedHours: enrichment.hours,
        enrichedServices: enrichment.services,
        enrichedRating: enrichment.rating,
        enrichedReviews: enrichment.reviews,
        enrichedPhotos: enrichment.photos,
      },
    })

    return enrichment
  } catch (error) {
    console.error('SerpAPI enrichment failed:', error)
    throw error
  }
}

export default { enrichLead }
