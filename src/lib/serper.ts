import { prisma } from './db'

const SERPER_API_KEY = process.env.SERPER_API_KEY!

// ============================================
// ARTIFACT TYPES & HIERARCHY
// ============================================

export type ArtifactType =
  | 'CLIENT_OR_PROJECT'
  | 'TOOL_PLATFORM'
  | 'EXACT_PHRASE'
  | 'COMPETITOR'
  | 'SERVICE_PROGRAM'
  | 'HIRING_SIGNAL'
  | 'LOCATION'
  | 'COMPANY_DESCRIPTION'
  | 'FALLBACK'

export interface Artifact {
  type: ArtifactType
  text: string
  source: string
  url?: string
  score: number
  tier: 'S' | 'A' | 'B'
}

export interface SerperResearchData {
  _research: true
  artifacts: Artifact[]
  snippets: string[]
  queriesRun: number
}

// Known tools in home services
const KNOWN_TOOLS = [
  'ServiceTitan', 'HousecallPro', 'Housecall Pro', 'Jobber', 'Xactimate',
  'QuickBooks', 'Square', 'Angi', 'HomeAdvisor', 'Nextdoor', 'Thumbtack',
  'BuildZoom', 'Houzz', 'Podium', 'Birdeye', 'ServiceMax', 'FieldEdge',
  'Kickserv', 'mHelpDesk', 'WorkWave', 'Leap', 'AccuLynx', 'JobNimbus',
  'CompanyCam', 'SalesRabbit', 'EagleView', 'GAF', 'Owens Corning',
  'CertainTeed', 'Daikin', 'Carrier', 'Trane', 'Lennox', 'Rheem',
]

// Generic phrases to reject as artifacts
const GENERIC_PHRASES = [
  'contact us', 'get in touch', 'reach out', 'learn more', 'get started',
  'welcome', 'call now', 'about us', 'services', 'products', 'solutions',
  'free quote', 'schedule', 'book now', 'sign up', 'subscribe', 'menu',
  'search', 'privacy policy', 'terms', 'copyright', 'follow us', 'newsletter',
  'careers', 'jobs', 'faq', 'help', 'support', 'blog', 'news',
]

// ============================================
// SERPER QUERY BUILDER
// ============================================

function buildQueries(companyName: string, city?: string, state?: string): Array<{ q: string; type: string }> {
  const location = [city, state].filter(Boolean).join(', ')

  return [
    // Query 1: Main company search (quoted name for exact match)
    { q: `"${companyName}" ${location}`.trim(), type: 'main' },
    // Query 2: Reviews and ratings
    { q: `"${companyName}" reviews OR "google reviews" OR stars ${location}`.trim(), type: 'reviews' },
    // Query 3: Awards, recognition, press
    { q: `"${companyName}" award OR "best of" OR featured OR recognized ${location}`.trim(), type: 'awards' },
  ]
}

// ============================================
// SINGLE SERPER SEARCH
// ============================================

async function runSerperSearch(query: string, num: number = 5): Promise<any[]> {
  const response = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'X-API-KEY': SERPER_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ q: query, num }),
  })

  if (!response.ok) {
    throw new Error(`Serper error: ${response.statusText}`)
  }

  const data = await response.json()
  const results: any[] = []

  if (data.organic) results.push(...data.organic)
  if (data.knowledgeGraph) {
    results.push({
      title: data.knowledgeGraph.title,
      snippet: data.knowledgeGraph.description,
      link: data.knowledgeGraph.website || '',
    })
  }

  return results
}

// ============================================
// ARTIFACT EXTRACTION
// ============================================

function extractArtifacts(results: any[], companyName: string, industry?: string): Artifact[] {
  const artifacts: Artifact[] = []
  const companyLower = companyName.toLowerCase()

  for (const result of results) {
    const title = result.title || ''
    const snippet = result.snippet || ''
    const link = result.link || ''
    const combined = `${title} ${snippet}`
    const combinedLower = combined.toLowerCase()

    // Only extract from results that mention the company (avoid competitor data pollution)
    const mentionsCompany = combinedLower.includes(companyLower) ||
      link.toLowerCase().includes(companyLower.replace(/[^a-z0-9]/g, ''))

    // --- TIER S: Known Tools ---
    for (const tool of KNOWN_TOOLS) {
      if (combinedLower.includes(tool.toLowerCase()) && mentionsCompany) {
        artifacts.push({ type: 'TOOL_PLATFORM', text: tool, source: 'serper', url: link, score: 8, tier: 'S' })
      }
    }

    // --- TIER S: Client/Project names ---
    if (mentionsCompany) {
      const clientPatterns = [
        /(?:worked with|project for|partnered with|completed.*?for|built.*?for|served|renovated|installed.*?at|restored)\s+(?:the\s+)?([A-Z][a-zA-Z\s'&-]+?(?:Hotel|School|Center|Hospital|Church|Building|Tower|Mall|Plaza|University|College|Restaurant|Club|Inn|Resort|Office|Facility|Complex|Park|Stadium|Arena|Museum|Library|Theater|Theatre))/gi,
      ]
      for (const pattern of clientPatterns) {
        pattern.lastIndex = 0
        for (const match of combined.matchAll(pattern)) {
          const text = (match[1] || '').trim()
          if (text.length >= 4 && text.length <= 40) {
            artifacts.push({ type: 'CLIENT_OR_PROJECT', text, source: 'serper', url: link, score: 9, tier: 'S' })
          }
        }
      }
    }

    // --- TIER S: Awards/Recognition ---
    if (/(?:award|best of|top \d+|winner|recognized|featured in|as seen on|named)/i.test(combined) && mentionsCompany) {
      const awardPatterns = [
        /(Best of (?:Yelp|Houzz|Angi|HomeAdvisor|Google|BBB|\w+)(?:\s+\d{4})?)/i,
        /(BBB\s+A\+?\s*(?:rated|rating|accredited)?)/i,
        /(Angi\s+(?:Super Service|Top Pro)(?:\s+Award)?(?:\s+\d{4})?)/i,
        /(?:won|received|awarded|named|voted)\s+["']?(.{5,50}?)["']?(?:\.|,|$)/i,
      ]
      for (const pattern of awardPatterns) {
        const match = combined.match(pattern)
        if (match && match[1] && match[1].trim().length >= 5 && match[1].trim().length <= 50) {
          artifacts.push({ type: 'EXACT_PHRASE', text: match[1].trim(), source: 'serper', url: link, score: 8, tier: 'S' })
        }
      }
    }

    // --- TIER S: Review data (star rating + count) ---
    const ratingMatch = combined.match(/(\d+(?:\.\d)?)\s*(?:star|★|out of 5)/i)
    const reviewCountMatch = combined.match(/(\d{2,})\s*(?:review|rating)/i)
    if (ratingMatch && parseFloat(ratingMatch[1]) >= 3.5 && mentionsCompany) {
      const ratingText = reviewCountMatch
        ? `${ratingMatch[1]} stars across ${reviewCountMatch[1]} reviews`
        : `${ratingMatch[1]}-star rated`
      artifacts.push({ type: 'EXACT_PHRASE', text: ratingText, source: 'serper', url: link, score: 7, tier: 'S' })
    }

    // --- TIER A: Service Programs ---
    if (mentionsCompany) {
      const servicePatterns = [
        /(24\/7\s+(?:Emergency|Service|Response|Support|Availability))/gi,
        /(\d+-(?:Year|Day|Hour|Minute)\s+(?:Guarantee|Warranty|Response\s+Time))/gi,
        /((?:Comfort|Service|Maintenance|Protection|Priority|VIP|Preferred)\s+(?:Club|Plan|Program|Membership|Agreement))/gi,
        /(same[- ]day\s+(?:service|response|repair|installation))/gi,
      ]
      for (const pattern of servicePatterns) {
        pattern.lastIndex = 0
        for (const match of combined.matchAll(pattern)) {
          const text = (match[1] || match[0]).trim()
          if (text.length >= 5) {
            artifacts.push({ type: 'SERVICE_PROGRAM', text, source: 'serper', url: link, score: 7, tier: 'A' })
          }
        }
      }
    }

    // --- TIER A: Hiring Signals ---
    if (/(?:hiring|now hiring|join our team|open position)/i.test(combined) && mentionsCompany) {
      const industryLower = (industry || '').toLowerCase().replace(/_/g, ' ')
      const jobKeywords = [industryLower, 'HVAC', 'Plumbing', 'Roofing', 'Electrical', 'Painting', 'Restoration', 'Cleaning', 'Landscaping'].filter(Boolean)
      const jobRegex = new RegExp(`((?:${jobKeywords.join('|')})\\s+(?:Technician|Installer|Specialist|Foreman|Manager|Lead|Helper|Apprentice))`, 'i')
      const jobMatch = combined.match(jobRegex)
      artifacts.push({
        type: 'HIRING_SIGNAL',
        text: jobMatch ? jobMatch[1] : 'growing their team',
        source: 'serper',
        url: link,
        score: 6,
        tier: 'A',
      })
    }

    // --- TIER B: Years in business ---
    const yearsMatch = combined.match(/(?:since|established|founded|serving.*?since)\s+(\d{4})/i)
    if (yearsMatch && mentionsCompany) {
      const year = parseInt(yearsMatch[1])
      const yearsInBiz = new Date().getFullYear() - year
      if (yearsInBiz > 2 && yearsInBiz < 100) {
        artifacts.push({
          type: 'COMPANY_DESCRIPTION',
          text: `serving since ${yearsMatch[1]} (${yearsInBiz}+ years)`,
          source: 'serper',
          url: link,
          score: 5,
          tier: 'B',
        })
      }
    }

    // --- TIER B: Team size ---
    const teamMatch = combined.match(/(\d+)\+?\s*(?:employee|technician|team member|staff)/i)
    if (teamMatch && parseInt(teamMatch[1]) >= 3 && mentionsCompany) {
      artifacts.push({
        type: 'COMPANY_DESCRIPTION',
        text: `${teamMatch[1]}+ team members`,
        source: 'serper',
        url: link,
        score: 4,
        tier: 'B',
      })
    }
  }

  return artifacts
}

// ============================================
// ARTIFACT RANKING & DEDUPLICATION
// ============================================

function rankArtifacts(artifacts: Artifact[]): Artifact[] {
  const seen = new Set<string>()
  const unique = artifacts.filter(a => {
    const key = a.text.toLowerCase().replace(/\s+/g, ' ').trim()
    if (seen.has(key) || key.length < 4) return false
    seen.add(key)
    return true
  })

  // Filter out generic phrases
  const filtered = unique.filter(a => {
    const lower = a.text.toLowerCase()
    return !GENERIC_PHRASES.some(g => lower === g || lower === g + 's')
  })

  // Sort: tier (S=0, A=1, B=2), then score descending
  const tierOrder: Record<string, number> = { S: 0, A: 1, B: 2 }
  return filtered.sort((a, b) => {
    const tierDiff = (tierOrder[a.tier] || 2) - (tierOrder[b.tier] || 2)
    if (tierDiff !== 0) return tierDiff
    return b.score - a.score
  })
}

// ============================================
// MAIN EXPORT: fetchSerperResearch
// ============================================

export async function fetchSerperResearch(leadId: string): Promise<string> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
  })

  if (!lead) {
    throw new Error('Lead not found')
  }

  try {
    const queries = buildQueries(lead.companyName, lead.city || undefined, lead.state || undefined)

    // Run all queries in parallel
    const allResults: any[] = []
    const allSnippets: string[] = []
    let queriesRun = 0

    const searchResults = await Promise.allSettled(
      queries.map(q => runSerperSearch(q.q, 5))
    )

    for (const result of searchResults) {
      if (result.status === 'fulfilled') {
        queriesRun++
        for (const r of result.value) {
          allResults.push(r)
          if (r.snippet) allSnippets.push(r.snippet)
        }
      }
    }

    // Extract and rank artifacts
    let artifacts = extractArtifacts(allResults, lead.companyName, lead.industry)

    // Add enriched data from SerpAPI as artifacts
    if (lead.enrichedRating && typeof lead.enrichedRating === 'number') {
      const reviewText = lead.enrichedReviews
        ? `${lead.enrichedRating} stars across ${lead.enrichedReviews} Google reviews`
        : `${lead.enrichedRating}-star Google rating`
      artifacts.push({ type: 'EXACT_PHRASE', text: reviewText, source: 'serpapi', score: 7, tier: 'S' })
    }

    const enrichedServices = Array.isArray(lead.enrichedServices) ? (lead.enrichedServices as string[]) : []
    if (enrichedServices.length > 0) {
      const bestService = [...enrichedServices].sort((a, b) => b.length - a.length)[0]
      if (bestService && bestService.length > 5) {
        artifacts.push({ type: 'SERVICE_PROGRAM', text: bestService, source: 'serpapi', score: 6, tier: 'A' })
      }
    }

    // Fallback artifacts
    if (lead.city && lead.state) {
      artifacts.push({ type: 'LOCATION', text: `${lead.city}, ${lead.state}`, source: 'csv', score: 3, tier: 'B' })
    }

    const rankedArtifacts = rankArtifacts(artifacts)

    // Store research data for personalization.ts to consume
    const researchData: SerperResearchData = {
      _research: true,
      artifacts: rankedArtifacts.slice(0, 10),
      snippets: allSnippets.slice(0, 5),
      queriesRun,
    }

    await prisma.lead.update({
      where: { id: leadId },
      data: { personalization: JSON.stringify(researchData) },
    })

    // Log cost
    await prisma.apiCost.create({
      data: {
        service: 'serper',
        operation: 'personalization',
        cost: queriesRun * 0.005,
      },
    })

    const best = rankedArtifacts[0]
    return best ? `[${best.tier}] ${best.type}: ${best.text}` : 'No artifacts found'
  } catch (error) {
    console.error('Serper research failed:', error)

    // Store fallback research data using enriched data
    const fallbackArtifacts: Artifact[] = []

    if (lead.enrichedRating && typeof lead.enrichedRating === 'number') {
      const reviewText = lead.enrichedReviews
        ? `${lead.enrichedRating} stars across ${lead.enrichedReviews} Google reviews`
        : `${lead.enrichedRating}-star Google rating`
      fallbackArtifacts.push({ type: 'EXACT_PHRASE', text: reviewText, source: 'serpapi', score: 7, tier: 'S' })
    }
    if (lead.city && lead.state) {
      fallbackArtifacts.push({ type: 'LOCATION', text: `${lead.city}, ${lead.state}`, source: 'csv', score: 3, tier: 'B' })
    }

    const fallbackData: SerperResearchData = {
      _research: true,
      artifacts: fallbackArtifacts,
      snippets: [],
      queriesRun: 0,
    }

    await prisma.lead.update({
      where: { id: leadId },
      data: { personalization: JSON.stringify(fallbackData) },
    })

    return 'Serper failed — using enriched data fallback'
  }
}

export default { fetchSerperResearch }
