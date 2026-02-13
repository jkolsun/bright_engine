import { prisma } from './db'
import { logActivity } from './logging'

/**
 * Lead Enrichment Service
 * Uses SerpAPI to get company data
 */

export interface EnrichmentData {
  address?: string
  hours?: Record<string, string>
  services?: string[]
  rating?: number
  reviews?: number
  photos?: string[]
  website?: string
  phone?: string
}

/**
 * Enrich lead data using SerpAPI
 * Searches for company info by name, city, state
 */
export async function enrichLead(
  leadId: string,
  companyName: string,
  city?: string,
  state?: string
): Promise<EnrichmentData | null> {
  try {
    if (!process.env.SERPAPI_KEY) {
      console.warn('SERPAPI_KEY not configured')
      return null
    }

    const searchQuery = [companyName, city, state].filter(Boolean).join(', ')

    const response = await fetch(
      `https://serpapi.com/search?q=${encodeURIComponent(
        searchQuery
      )}&api_key=${process.env.SERPAPI_KEY}&type=search`
    )

    if (!response.ok) {
      console.error('SerpAPI error:', response.status)
      return null
    }

    const data = await response.json()

    // Extract relevant fields from SerpAPI response
    const enriched: EnrichmentData = {}

    // Get first knowledge graph result
    if (data.knowledge_graph) {
      const kg = data.knowledge_graph
      if (kg.address) enriched.address = kg.address
      if (kg.phone) enriched.phone = kg.phone
      if (kg.rating) enriched.rating = parseFloat(kg.rating)
      if (kg.review_count) enriched.reviews = parseInt(kg.review_count)
      if (kg.website) enriched.website = kg.website
    }

    // Store enrichment in database
    const lead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        enrichedAddress: enriched.address,
        enrichedRating: enriched.rating,
        enrichedReviews: enriched.reviews,
        website: enriched.website || undefined,
      },
    })

    // Log activity
    await logActivity(
      'ENRICHMENT',
      `Enriched lead: ${companyName}`,
      {
        leadId,
        metadata: enriched,
      }
    )

    return enriched
  } catch (error) {
    console.error('Enrichment error:', error)
    return null
  }
}

/**
 * Batch enrich multiple leads
 */
export async function enrichLeadsBatch(
  leads: Array<{
    id: string
    companyName: string
    city?: string
    state?: string
  }>
) {
  const results = await Promise.allSettled(
    leads.map((lead) =>
      enrichLead(lead.id, lead.companyName, lead.city, lead.state)
    )
  )

  const successful = results.filter(
    (r) => r.status === 'fulfilled' && r.value !== null
  ).length
  const failed = results.filter((r) => r.status === 'rejected').length

  return {
    successful,
    failed,
    total: leads.length,
  }
}
