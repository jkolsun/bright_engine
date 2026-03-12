/**
 * Pexels API client — fetches relevant stock photos based on industry + service.
 * Free tier: 200 requests/hour, no credit card required.
 * Sign up at https://www.pexels.com/api/
 */

const PEXELS_BASE = 'https://api.pexels.com/v1'

/** Industry-specific search term enhancers for better photo relevance */
const INDUSTRY_KEYWORDS: Record<string, string> = {
  PLUMBING: 'plumbing bathroom pipes water',
  PAINTING: 'house painting interior wall color',
  LANDSCAPING: 'landscaping garden yard lawn outdoor',
  CLEANING: 'cleaning service home spotless',
  HVAC: 'air conditioning heating ventilation',
  RESTORATION: 'restoration repair construction damage',
  ELECTRICAL: 'electrical wiring lighting modern',
  ROOFING: 'roofing house roof shingles',
  GENERAL_CONTRACTING: 'construction renovation remodel building',
  CONSTRUCTION: 'construction building site architecture',
  PEST_CONTROL: 'pest control clean home garden',
  LAW: 'law office legal professional',
  LAW_PRACTICE: 'law office legal professional',
  LEGAL: 'law office legal professional',
  LEGAL_SERVICES: 'law office legal professional',
  CONSULTING: 'consulting business meeting strategy',
  TECHNOLOGY: 'technology software computer modern',
  HEALTHCARE: 'healthcare medical doctor clinic',
  REAL_ESTATE: 'real estate house property home',
  AUTO_REPAIR: 'auto repair mechanic garage car',
  DENTAL: 'dental dentist clinic teeth',
  FITNESS: 'fitness gym workout training',
  SALON: 'salon beauty hair styling',
  RESTAURANT: 'restaurant food dining kitchen',
  PHOTOGRAPHY: 'photography camera studio creative',
  MOVING: 'moving company boxes truck relocation',
  FLOORING: 'flooring installation hardwood tile',
  PLUMBING_HVAC: 'plumbing hvac heating cooling',
  TREE_SERVICE: 'tree service trimming arborist',
  FENCING: 'fence installation yard outdoor',
  CONCRETE: 'concrete driveway foundation masonry',
  WINDOW: 'window installation glass home',
  GARAGE_DOOR: 'garage door installation repair',
  POOL: 'pool swimming installation maintenance',
  SOLAR: 'solar panels energy installation roof',
}

interface PexelsPhoto {
  id: number
  src: {
    original: string
    large2x: string
    large: string
    medium: string
    small: string
    landscape: string
  }
  alt: string
}

interface PexelsSearchResponse {
  photos: PexelsPhoto[]
  total_results: number
}

/**
 * Fetch stock photos from Pexels for a list of services in a given industry.
 * Returns a map of service name → array of photo URLs.
 */
export async function fetchServicePhotos(
  industry: string,
  services: string[],
  city?: string,
): Promise<{ servicePhotos: Record<string, string[]>; heroPhoto?: string }> {
  const apiKey = process.env.PEXELS_API_KEY
  if (!apiKey) {
    console.log('[Pexels] No PEXELS_API_KEY set — skipping stock photo fetch')
    return { servicePhotos: {} }
  }

  const industryKeywords = INDUSTRY_KEYWORDS[industry] || industry.toLowerCase().replace(/_/g, ' ')
  const servicePhotos: Record<string, string[]> = {}
  let heroPhoto: string | undefined

  // Fetch photos for each service (limit to first 8 to stay within rate limits)
  const servicesToFetch = services.slice(0, 8)

  for (let i = 0; i < servicesToFetch.length; i++) {
    const service = servicesToFetch[i]
    try {
      // Build search query: service name + industry context
      const query = `${service} ${industryKeywords}`.trim()
      const url = `${PEXELS_BASE}/search?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape`

      const res = await fetch(url, {
        headers: { Authorization: apiKey },
        signal: AbortSignal.timeout(8000),
      })

      if (!res.ok) {
        console.warn(`[Pexels] Search failed for "${query}": ${res.status}`)
        continue
      }

      const data: PexelsSearchResponse = await res.json()
      if (data.photos && data.photos.length > 0) {
        // Use 'large' size (940px wide) — good balance of quality and speed
        servicePhotos[service] = data.photos.map(p => p.src.large)

        // First service's first photo also serves as hero
        if (i === 0 && !heroPhoto) {
          heroPhoto = data.photos[0].src.large2x // Higher res for hero
        }
      }
    } catch (err) {
      console.warn(`[Pexels] Error fetching photos for "${service}":`, err)
    }

    // Small delay between requests to be respectful of rate limits
    if (i < servicesToFetch.length - 1) {
      await new Promise(r => setTimeout(r, 100))
    }
  }

  // If we still don't have a hero photo, fetch a general industry photo
  if (!heroPhoto) {
    try {
      const query = city
        ? `${industryKeywords} ${city}`
        : industryKeywords
      const url = `${PEXELS_BASE}/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`
      const res = await fetch(url, {
        headers: { Authorization: apiKey },
        signal: AbortSignal.timeout(8000),
      })
      if (res.ok) {
        const data: PexelsSearchResponse = await res.json()
        if (data.photos?.[0]) {
          heroPhoto = data.photos[0].src.large2x
        }
      }
    } catch {}
  }

  return { servicePhotos, heroPhoto }
}
