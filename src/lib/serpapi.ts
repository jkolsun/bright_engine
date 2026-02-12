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

    // Extract data
    const enrichment: EnrichmentResult = {
      address: result.address,
      phone: result.phone,
      hours: result.hours,
      services: result.service_options?.map((s: any) => s.name) || [],
      rating: result.rating,
      reviews: result.reviews,
      photos: result.photos?.slice(0, 10).map((p: any) => p.thumbnail) || [],
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
        enrichedHours: enrichment.hours as any,
        enrichedServices: enrichment.services as any,
        enrichedRating: enrichment.rating,
        enrichedReviews: enrichment.reviews,
        enrichedPhotos: enrichment.photos as any,
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
