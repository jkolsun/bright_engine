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
  bestTier?: 'S' | 'A' | 'B'
}

// Known tools in home services
const KNOWN_TOOLS = [
  'ServiceTitan', 'HousecallPro', 'Housecall Pro', 'Jobber', 'Xactimate',
  'QuickBooks', 'Square', 'Angi', 'HomeAdvisor', 'Nextdoor', 'Thumbtack',
  'BuildZoom', 'Houzz', 'Podium', 'Birdeye', 'ServiceMax', 'FieldEdge',
  'Kickserv', 'mHelpDesk', 'WorkWave', 'Leap', 'AccuLynx', 'JobNimbus',
  'CompanyCam', 'SalesRabbit', 'EagleView', 'GAF', 'Owens Corning',
  'CertainTeed', 'Daikin', 'Carrier', 'Trane', 'Lennox', 'Rheem',
  // Additional platforms & manufacturers
  'Salesforce', 'HubSpot', 'Zoho', 'SuccessWare', 'ServiceFusion',
  'Service Fusion', 'Payzerware', 'Payzer', 'SmartService', 'Smart Service',
  'Simpro', 'simPRO', 'Fergus', 'GorillaDesk', 'Gorilla Desk',
  'FieldPulse', 'Field Pulse', 'ServiceBridge', 'Synchroteam',
  // Brands/certifications that signal quality
  'Mitsubishi Electric', 'Goodman', 'York', 'Ruud', 'Amana', 'Heil',
  'Armstrong', 'Bryant', 'Maytag', 'Bosch', 'Navien', 'Rinnai',
  'Generac', 'Kohler', 'James Hardie', 'LP SmartSide', 'Pella',
  'Andersen', 'Marvin', 'Milgard',
]

// Known certifications (S-tier signals)
const KNOWN_CERTIFICATIONS = [
  'GAF Master Elite', 'GAF Certified', 'Owens Corning Preferred',
  'Owens Corning Platinum', 'CertainTeed SELECT ShingleMaster',
  'CertainTeed Master Shingle Applicator', 'NATE Certified', 'NATE-Certified',
  'EPA Certified', 'EPA 608', 'LEED Certified', 'LEED',
  'BBB A+', 'BBB Accredited', 'Better Business Bureau',
  'Angi Super Service', 'Angi Top Pro', 'HomeAdvisor Elite',
  'HomeAdvisor Top Rated', 'Carrier Factory Authorized',
  'Trane Comfort Specialist', 'Lennox Premier Dealer',
  'Rheem Pro Partner', 'Daikin Comfort Pro', 'Mitsubishi Diamond Contractor',
  'ACCA Member', 'PHCC Member', 'NARI Member', 'NAHB Member',
  'Energy Star Partner', 'BPI Certified', 'IICRC Certified',
  'Master Plumber', 'Master Electrician', 'Journeyman',
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

function buildQueries(companyName: string, city?: string, state?: string, website?: string): Array<{ q: string; type: string; num?: number }> {
  const location = [city, state].filter(Boolean).join(', ')

  const queries: Array<{ q: string; type: string; num?: number }> = [
    // Query 1: Main company search (quoted name, more results)
    { q: `"${companyName}" ${location}`.trim(), type: 'main', num: 8 },
    // Query 2: Reviews and ratings
    { q: `"${companyName}" reviews OR "google reviews" OR stars ${location}`.trim(), type: 'reviews' },
    // Query 3: Awards, certifications, credentials
    { q: `"${companyName}" award OR certified OR "best of" OR accredited OR "master elite" OR "top pro" ${location}`.trim(), type: 'awards' },
    // Query 4: Projects, clients, portfolio work (S-tier hunting)
    { q: `"${companyName}" project OR portfolio OR "worked on" OR client OR completed ${location}`.trim(), type: 'projects' },
    // Query 5: News, press, community involvement
    { q: `"${companyName}" news OR press OR featured OR sponsor OR community OR charity ${location}`.trim(), type: 'news' },
  ]

  // Query 6: Site-specific search for tools/certifications (if website known)
  if (website) {
    const domain = website.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
    queries.push({ q: `site:${domain} certified OR warranty OR guarantee OR partner OR award`, type: 'site', num: 5 })
  }

  return queries
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

    // --- TIER S: Certifications ---
    if (mentionsCompany) {
      for (const cert of KNOWN_CERTIFICATIONS) {
        if (combinedLower.includes(cert.toLowerCase())) {
          artifacts.push({ type: 'EXACT_PHRASE', text: cert, source: 'serper', url: link, score: 9, tier: 'S' })
        }
      }
    }

    // --- TIER S: Client/Project names ---
    if (mentionsCompany) {
      const clientPatterns = [
        // Named buildings/landmarks
        /(?:worked with|project for|partnered with|completed.*?for|built.*?for|served|renovated|installed.*?at|restored)\s+(?:the\s+)?([A-Z][a-zA-Z\s'&-]+?(?:Hotel|School|Center|Hospital|Church|Building|Tower|Mall|Plaza|University|College|Restaurant|Club|Inn|Resort|Office|Facility|Complex|Park|Stadium|Arena|Museum|Library|Theater|Theatre))/gi,
        // "worked on the [Project Name]" or "completed the [Project Name]"
        /(?:worked on|completed|finished|delivered)\s+(?:the\s+)?([A-Z][a-zA-Z\s'&-]{3,35})\s+(?:project|renovation|installation|remodel|restoration|build|construction)/gi,
        // "[Company] served [Client]" pattern
        /(?:provided|delivered|performed)\s+(?:\w+\s+){0,3}(?:for|to)\s+(?:the\s+)?([A-Z][a-zA-Z\s'&-]{5,40})/gi,
        // "featured project: [Name]" or "portfolio: [Name]"
        /(?:featured project|portfolio|case study|showcase)[:\s]+([A-Z][a-zA-Z\s'&-]{5,40})/gi,
      ]
      for (const pattern of clientPatterns) {
        pattern.lastIndex = 0
        for (const match of combined.matchAll(pattern)) {
          const text = (match[1] || '').trim()
          if (text.length >= 4 && text.length <= 40 && !GENERIC_PHRASES.some(g => text.toLowerCase().includes(g))) {
            artifacts.push({ type: 'CLIENT_OR_PROJECT', text, source: 'serper', url: link, score: 9, tier: 'S' })
          }
        }
      }
    }

    // --- TIER S: Awards/Recognition ---
    if (/(?:award|best of|top \d+|winner|recognized|featured in|as seen on|named|certified|accredited)/i.test(combined) && mentionsCompany) {
      const awardPatterns = [
        /(Best of (?:Yelp|Houzz|Angi|HomeAdvisor|Google|BBB|\w+)(?:\s+\d{4})?)/i,
        /(BBB\s+A\+?\s*(?:rated|rating|accredited)?)/i,
        /(Angi\s+(?:Super Service|Top Pro)(?:\s+Award)?(?:\s+\d{4})?)/i,
        /(?:won|received|awarded|named|voted|earned)\s+["']?(.{5,50}?)["']?(?:\.|,|$)/i,
        // "Top 10/50/100" lists
        /(Top\s+\d+\s+(?:\w+\s+){0,3}(?:in|of)\s+\w+(?:\s+\d{4})?)/i,
        // "Featured in [Publication]"
        /(?:featured in|as seen (?:on|in)|profiled (?:by|in))\s+(?:the\s+)?([A-Z][a-zA-Z\s&]{3,30})/i,
        // "#1 rated" or "highest rated"
        /(#1\s+(?:rated|ranked)?\s*\w+(?:\s+\w+){0,3})/i,
        /(highest[- ]rated\s+\w+(?:\s+\w+){0,3}(?:\s+in\s+\w+)?)/i,
      ]
      for (const pattern of awardPatterns) {
        const match = combined.match(pattern)
        if (match && match[1] && match[1].trim().length >= 5 && match[1].trim().length <= 50) {
          artifacts.push({ type: 'EXACT_PHRASE', text: match[1].trim(), source: 'serper', url: link, score: 8, tier: 'S' })
        }
      }
    }

    // --- TIER A: Community Involvement / Sponsorship ---
    if (/(?:sponsor|donat|volunteer|community|habitat|charity|give back|non-?profit)/i.test(combined) && mentionsCompany) {
      const communityPatterns = [
        /(?:sponsor(?:s|ed|ing)?|support(?:s|ed|ing)?|partner(?:s|ed|ing)?\s+with)\s+(?:the\s+)?([A-Z][a-zA-Z\s'&-]{5,40})/gi,
        /(Habitat for Humanity)/i,
        /(?:donated|raised|contributed)\s+(?:\$[\d,]+\s+(?:to|for)\s+)?([A-Z][a-zA-Z\s'&-]{5,40})/gi,
      ]
      for (const pattern of communityPatterns) {
        pattern.lastIndex = 0
        const match = combined.match(pattern)
        if (match && match[1] && match[1].trim().length >= 5) {
          artifacts.push({ type: 'SERVICE_PROGRAM', text: `sponsors ${match[1].trim()}`, source: 'serper', url: link, score: 7, tier: 'A' })
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
    const queries = buildQueries(lead.companyName, lead.city || undefined, lead.state || undefined, lead.website || undefined)

    // Run all queries in parallel
    const allResults: any[] = []
    const allSnippets: string[] = []
    let queriesRun = 0

    const searchResults = await Promise.allSettled(
      queries.map(q => runSerperSearch(q.q, q.num || 5))
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

    // Determine best tier found
    const bestTier = rankedArtifacts.length > 0 ? rankedArtifacts[0].tier : 'B'

    // Store research data for personalization.ts to consume
    const researchData: SerperResearchData = {
      _research: true,
      artifacts: rankedArtifacts.slice(0, 15),
      snippets: allSnippets.slice(0, 8),
      queriesRun,
      bestTier,
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
