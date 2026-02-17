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
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
  })

  if (!lead) {
    throw new Error('Lead not found')
  }

  try {
    // Build search query
    const query = `${lead.companyName} ${lead.city} ${lead.state}`

    // Call SerpAPI Google Maps endpoint
    const response = await fetch(
      `https://serpapi.com/search.json?` +
        new URLSearchParams({
          api_key: SERPAPI_KEY,
          engine: 'google_maps',
          q: query,
          type: 'search',
        })
    )

    if (!response.ok) {
      throw new Error(`SerpAPI error: ${response.statusText}`)
    }

    const data = await response.json()

    // Parse first result
    const result = data.local_results?.[0]

    if (!result) {
      console.log('No SerpAPI results found for:', query)
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

    // Log cost
    await prisma.apiCost.create({
      data: {
        service: 'serpapi',
        operation: 'enrichment',
        cost: 0.002, // ~$0.002 per request
      },
    })

    return enrichment
  } catch (error) {
    console.error('SerpAPI enrichment failed:', error)
    throw error
  }
}

export default { enrichLead }
