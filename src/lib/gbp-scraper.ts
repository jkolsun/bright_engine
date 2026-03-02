import { prisma } from '@/lib/db'

// ============================================================
// Types
// ============================================================

export interface SearchTerm {
  term: string
  industry: string
}

export interface ScraperFilters {
  minReviews: number
  minRating: number
  targetLeads: number
  hasPhotos?: 'any' | 'yes' | 'no'
  hasHours?: 'any' | 'yes' | 'no'
  minCategories?: number
  maxDistance?: number
}

export interface ScrapedLead {
  companyName: string
  phone: string
  city: string
  state: string
  industry: string
  rating: number
  reviews: number
  hasPhotos: boolean
  hasHours: boolean
  address: string
  categories: string[]
  gpsCoordinates: { latitude: number; longitude: number } | null
  type: string
  qualityScore: number
  searchQuery: string
}

export interface ScraperProgress {
  status: 'running' | 'completed' | 'failed' | 'stopped'
  queriesUsed: number
  totalQueries: number
  leadsFound: number
  resultsScanned: number
  skipped: {
    website: number
    noPhone: number
    lowReviews: number
    lowRating: number
    noPhotos: number
    noHours: number
  }
  qualifiedLeads: ScrapedLead[]
  stopReason?: string
  error?: string
}

export interface ScraperConfig {
  searchTerms: SearchTerm[]
  cities: string[] // "City ST" format
  filters: ScraperFilters
}

// ============================================================
// Constants — Common search terms with industry defaults
// ============================================================

export const COMMON_SEARCH_TERMS: SearchTerm[] = [
  { term: 'roofer', industry: 'ROOFING' },
  { term: 'roofing company', industry: 'ROOFING' },
  { term: 'roof repair', industry: 'ROOFING' },
  { term: 'tree service', industry: 'LANDSCAPING' },
  { term: 'tree removal', industry: 'LANDSCAPING' },
  { term: 'painter', industry: 'PAINTING' },
  { term: 'painting company', industry: 'PAINTING' },
  { term: 'house painting', industry: 'PAINTING' },
  { term: 'hvac company', industry: 'HVAC' },
  { term: 'air conditioning repair', industry: 'HVAC' },
  { term: 'plumber', industry: 'PLUMBING' },
  { term: 'plumbing company', industry: 'PLUMBING' },
  { term: 'fence company', industry: 'GENERAL_CONTRACTING' },
  { term: 'concrete company', industry: 'GENERAL_CONTRACTING' },
  { term: 'pressure washing', industry: 'CLEANING' },
  { term: 'junk removal', industry: 'CLEANING' },
  { term: 'garage door repair', industry: 'GENERAL_CONTRACTING' },
  { term: 'landscaping company', industry: 'LANDSCAPING' },
  { term: 'handyman service', industry: 'GENERAL_CONTRACTING' },
  { term: 'pest control', industry: 'PEST_CONTROL' },
]

export const INDUSTRY_OPTIONS = [
  'ROOFING',
  'LANDSCAPING',
  'PAINTING',
  'HVAC',
  'PLUMBING',
  'CLEANING',
  'ELECTRICAL',
  'PEST_CONTROL',
  'GENERAL_CONTRACTING',
  'RESTORATION',
  'LAW',
  'REAL_ESTATE',
  'HEALTHCARE',
  'OTHER',
] as const

// ============================================================
// SerpAPI Google Maps search
// ============================================================

export async function searchGoogleMaps(query: string, apiKey: string): Promise<any> {
  const params = new URLSearchParams({
    api_key: apiKey,
    engine: 'google_maps',
    q: query,
    type: 'search',
  })

  const response = await fetch(`https://serpapi.com/search.json?${params.toString()}`, {
    signal: AbortSignal.timeout(30000),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`SerpAPI error ${response.status}: ${text}`)
  }

  return response.json()
}

// ============================================================
// Lead extraction + quality filtering
// ============================================================

export interface ExtractionStats {
  total: number
  qualified: number
  skippedWebsite: number
  skippedNoPhone: number
  skippedLowReviews: number
  skippedLowRating: number
  skippedNoPhotos: number
  skippedNoHours: number
  skippedLowCategories: number
}

export function extractLeads(
  data: any,
  query: string,
  industry: string,
  filters: ScraperFilters,
  cityFromQuery?: { city: string; state: string }
): { leads: ScrapedLead[]; stats: ExtractionStats } {
  const results = data.local_results || []
  const leads: ScrapedLead[] = []
  const stats: ExtractionStats = {
    total: results.length,
    qualified: 0,
    skippedWebsite: 0,
    skippedNoPhone: 0,
    skippedLowReviews: 0,
    skippedLowRating: 0,
    skippedNoPhotos: 0,
    skippedNoHours: 0,
    skippedLowCategories: 0,
  }

  for (const r of results) {
    // TEMP DIAGNOSTIC: Log first raw result to see actual SerpAPI field structure
    // Remove this after confirming the website filter works
    if (leads.length === 0 && stats.qualified === 0 && stats.skippedWebsite === 0) {
      console.log('[SCRAPER] Raw SerpAPI result sample:', JSON.stringify(r, null, 2))
    }

    // Filter 1: Must NOT have a website (core filter)
    // SerpAPI google_maps returns websites in multiple possible fields depending on result type
    const hasWebsite = !!(
      r.website ||
      r.links?.website ||
      r.place_results?.website
    )
    if (hasWebsite) {
      stats.skippedWebsite++
      continue
    }

    // Filter 2: Must have a phone number
    if (!r.phone) {
      stats.skippedNoPhone++
      continue
    }

    // Filter 3: Minimum reviews
    const reviews = typeof r.reviews === 'number' ? r.reviews : 0
    if (filters.minReviews > 0 && reviews < filters.minReviews) {
      stats.skippedLowReviews++
      continue
    }

    // Filter 4: Minimum rating
    const rating = typeof r.rating === 'number' ? r.rating : 0
    if (filters.minRating > 0 && rating < filters.minRating) {
      stats.skippedLowRating++
      continue
    }

    // Filter 5: Has photos
    if (filters.hasPhotos === 'yes' && !r.thumbnail) {
      stats.skippedNoPhotos++
      continue
    }
    if (filters.hasPhotos === 'no' && r.thumbnail) {
      stats.skippedNoPhotos++
      continue
    }

    // Filter 6: Has hours
    const hasHours = !!(r.hours || r.operating_hours)
    if (filters.hasHours === 'yes' && !hasHours) {
      stats.skippedNoHours++
      continue
    }
    if (filters.hasHours === 'no' && hasHours) {
      stats.skippedNoHours++
      continue
    }

    // Filter 7: Min categories
    const categories = Array.isArray(r.types) ? r.types : []
    if (filters.minCategories && filters.minCategories > 0 && categories.length < filters.minCategories) {
      stats.skippedLowCategories++
      continue
    }

    // Filter 8: Max distance from city center (Haversine)
    if (filters.maxDistance && filters.maxDistance > 0 && r.gps_coordinates && cityFromQuery) {
      // We'd need city center coordinates from us-cities.json for full implementation
      // For now, this is a placeholder — the city center lookup happens at the caller level
    }

    const companyName = (r.title || '').trim()
    if (!companyName) continue

    // Use city/state from search query (spec: from the search config, NOT from result.address)
    const city = cityFromQuery?.city || ''
    const state = cityFromQuery?.state || ''

    const gps = r.gps_coordinates
      ? { latitude: r.gps_coordinates.latitude, longitude: r.gps_coordinates.longitude }
      : null

    const lead: ScrapedLead = {
      companyName,
      phone: r.phone,
      city,
      state,
      industry,
      rating,
      reviews,
      hasPhotos: !!r.thumbnail,
      hasHours,
      address: r.address || '',
      categories,
      gpsCoordinates: gps,
      type: r.type || '',
      qualityScore: 0,
      searchQuery: query,
    }

    lead.qualityScore = calculateQualityScore(lead)
    leads.push(lead)
    stats.qualified++
  }

  return { leads, stats }
}

// ============================================================
// Quality score: 0-100
// ============================================================

export function calculateQualityScore(lead: ScrapedLead): number {
  const ratingScore = (lead.rating / 5) * 40
  const reviewScore = (Math.min(lead.reviews, 50) / 50) * 30
  const photoScore = lead.hasPhotos ? 15 : 0
  const hoursScore = lead.hasHours ? 15 : 0
  return Math.round(ratingScore + reviewScore + photoScore + hoursScore)
}

// ============================================================
// Deduplication by phone (last 10 digits)
// ============================================================

export function deduplicateLeads(leads: ScrapedLead[]): ScrapedLead[] {
  const seen = new Set<string>()
  return leads.filter(lead => {
    const normalizedPhone = lead.phone.replace(/\D/g, '').slice(-10)
    if (!normalizedPhone || seen.has(normalizedPhone)) return false
    seen.add(normalizedPhone)
    return true
  })
}

// ============================================================
// Address parsing (regex with fallback)
// ============================================================

export function parseAddress(address: string): { city: string; state: string } {
  if (!address) return { city: '', state: '' }

  // Pattern 1: "..., City, ST 12345" or with "United States" suffix
  const match = address.match(/,\s*([^,]+?),\s*([A-Z]{2})(?:\s+\d{5})?(?:,\s*United States)?$/)
  if (match) {
    return { city: match[1].trim(), state: match[2].trim() }
  }

  // Pattern 2: Fallback — just find state code at end
  const stateMatch = address.match(/,\s*([A-Z]{2})(?:\s+\d{5})?(?:,\s*United States)?$/)
  if (stateMatch) {
    const state = stateMatch[1]
    const before = address.substring(0, stateMatch.index)
    const parts = before.split(',')
    const city = parts.length > 0 ? parts[parts.length - 1].trim() : ''
    return { city, state }
  }

  return { city: '', state: '' }
}

// Parse "City ST" string → { city, state }
export function parseCityState(cityStr: string): { city: string; state: string } {
  const match = cityStr.match(/^(.+?)\s+([A-Z]{2})$/)
  if (match) return { city: match[1].trim(), state: match[2] }
  return { city: cityStr, state: '' }
}

// ============================================================
// Daily limit check (shared with enrichLead)
// ============================================================

export async function checkDailyLimit(): Promise<{ allowed: boolean; todayUsage: number; dailyLimit: number }> {
  const dailyLimit = parseInt(process.env.SERPAPI_DAILY_LIMIT || '0', 10)

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const todayUsage = await prisma.apiCost.count({
    where: {
      service: 'serpapi',
      createdAt: { gte: todayStart },
    },
  })

  if (dailyLimit <= 0) {
    return { allowed: true, todayUsage, dailyLimit: 0 }
  }

  return {
    allowed: todayUsage < dailyLimit,
    todayUsage,
    dailyLimit,
  }
}

// Log an API cost record (same counter as enrichLead)
export async function logApiCost(): Promise<void> {
  await prisma.apiCost.create({
    data: {
      service: 'serpapi',
      operation: 'scraper',
      cost: 0.002,
    },
  })
}

// ============================================================
// Shuffle array (Fisher-Yates)
// ============================================================

export function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// ============================================================
// Build query list from config
// ============================================================

export function buildQueryList(config: ScraperConfig): Array<{ search: string; industry: string; city: string; state: string }> {
  const queries: Array<{ search: string; industry: string; city: string; state: string }> = []

  for (const term of config.searchTerms) {
    for (const cityStr of config.cities) {
      const { city, state } = parseCityState(cityStr)
      queries.push({
        search: `${term.term} ${cityStr}`,
        industry: term.industry,
        city,
        state,
      })
    }
  }

  return shuffleArray(queries)
}
