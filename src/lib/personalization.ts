import { prisma } from './db'
import { Anthropic } from '@anthropic-ai/sdk'
import { logActivity } from './logging'
import type { Artifact, SerperResearchData } from './serper'
import type { WebsiteCopy } from '@/components/preview/config/template-types'

/**
 * AI Personalization Service
 * Generates high-quality personalized first lines AND website copy
 * using artifact hierarchy and enrichment data
 */

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface PersonalizationResult {
  firstLine: string
  hook: string
  angle: string
  tier: 'S' | 'A' | 'B'
  tokensCost: number
  websiteCopy?: WebsiteCopy
}

// ============================================
// BANNED WORDS & VALIDATION CONSTANTS
// ============================================

const BANNED_TIMING_WORDS = [
  'recently', 'just', 'rolled out', 'implemented', 'launched', 'new', 'latest',
  'upcoming', 'soon', 'now', 'this year', 'this month', 'this week',
  'today', 'yesterday', 'last week', 'last month', 'last year',
]

const BANNED_HYPE_ADJECTIVES = [
  'impressive', 'amazing', 'innovative', 'best', 'leading', 'incredible',
  'outstanding', 'excellent', 'fantastic', 'wonderful', 'great', 'awesome',
  'revolutionary', 'game-changing', 'cutting-edge', 'world-class',
  'industry-leading', 'best-in-class', 'unparalleled', 'exceptional',
  'top-notch', 'premier', 'remarkable', 'stunning', 'superb', 'terrific',
  'tremendous',
]

const GENERIC_LINE_PHRASES = [
  'came across', 'found your', 'noticed your company', 'saw your website',
  'looking at your', 'checked out your', 'stumbled upon', 'discovered your',
]

const MIN_LINE_WORDS = 8
const MAX_LINE_WORDS = 18

// Artifact selection priority (stop at first valid)
const ARTIFACT_PRIORITY: Array<Artifact['type']> = [
  'CLIENT_OR_PROJECT', 'TOOL_PLATFORM', 'EXACT_PHRASE',
  'COMPETITOR', 'SERVICE_PROGRAM', 'HIRING_SIGNAL',
  'LOCATION', 'COMPANY_DESCRIPTION', 'FALLBACK',
]

// ============================================
// ARTIFACT TEXT QUALITY CHECK
// ============================================

function isArtifactTextUsable(text: string): boolean {
  if (!text || text.length < 5) return false

  const words = text.trim().split(/\s+/)

  // Too short to be meaningful
  if (words.length < 2) return false

  // Ends with article/preposition (truncated)
  const lastWord = words[words.length - 1].toLowerCase().replace(/[.,!?"']+$/, '')
  const truncationEnds = ['a', 'an', 'the', 'to', 'of', 'in', 'for', 'with', 'and', 'or', 'but', 'from', 'by', 'on', 'at', 'is', 'are', 'was']
  if (truncationEnds.includes(lastWord)) return false

  // Starts with lowercase article (probably a fragment)
  if (/^(the|a|an)\s/i.test(text) && words.length < 4) return false

  // Contains obvious truncation patterns
  if (text.endsWith('...') || text.endsWith('…')) return false

  // Has unmatched quotes
  const dq = (text.match(/"/g) || []).length
  if (dq % 2 !== 0) return false

  // Only generic/meaningless words
  const genericOnly = words.every(w =>
    ['best', 'of', 'the', 'and', 'in', 'a', 'an', 'for', 'to', 'is', 'are', 'our', 'your', 'we'].includes(w.toLowerCase().replace(/[^a-z]/g, ''))
  )
  if (genericOnly) return false

  return true
}

// ============================================
// SYSTEM PROMPT
// ============================================

const SYSTEM_PROMPT = `You write one cold email opening line. This line appears FIRST in the email — before any pitch. It must feel like the sender did their homework.

You're writing TO the business owner. Use "you/your."

TIER PRIORITY — always use the HIGHEST tier data available:
S-TIER (USE FIRST — the perfect hook):
  - Client/project names: "Your work on the Hilton renovation..."
  - Certifications: "GAF Master Elite with 200 reviews..."
  - Awards: "Angi Super Service three years running..."
  - Specific tools: "Your team runs ServiceTitan..."
  - Founding year + longevity: "22 years in the Dallas market..."
  - Star ratings + review counts: "4.9 stars across 300 reviews..." (use as LAST RESORT among S-tier — prefer certs/awards/projects/tools)
A-TIER (use only if NO S-tier data):
  - Service programs: "Your 24/7 emergency response..."
  - Warranties/guarantees: "Your 10-year workmanship warranty..."
  - Hiring signals: "Scaling your crew..."
  - Community involvement: "Sponsoring Habitat for Humanity..."
  - Team details: "15 certified technicians on staff..."
B-TIER (LAST RESORT — avoid if possible):
  - Location only, generic services

IMPORTANT: If you have BOTH review data AND deeper data (certifications, awards, tools, named projects), ALWAYS prefer the deeper data. Reviews alone are generic — every company has reviews. What makes a great opener is something SPECIFIC that only THEY can claim.

EXAMPLES OF S-TIER OPENERS (this is the quality bar):
- "Your 4.9 stars across 200+ reviews — that's rare for HVAC in Dallas."
- "GAF Master Elite certified and still holding a 4.8 — your crew doesn't cut corners."
- "Your Hilton Plaza project shows the caliber of commercial work you take on."
- "ServiceTitan, Angi Super Service, and 150 reviews — you're not messing around."
- "BBB A+ rated with same-day service — you're running a tight ship."

EXAMPLES OF BAD OPENERS (never write like this):
- "Building your reputation in X takes time, you've clearly earned it." ← generic, says nothing specific
- "This stood out on your site: [random fragment]." ← lazy, often broken
- "Your focus on X really sets you apart from the generalists." ← vague, could apply to anyone
- "Your services in Dallas show your dedication to the community." ← empty, could be anyone

TONE — OBSERVATION STYLE:
- Write as someone who OBSERVED something interesting about the business.
- Start with "Saw your...", "Noticed your...", "Your..." or "Came across your...".
- NEVER start with the company name as the subject.
- NEVER start with "Your team provides..." or "Your company offers..." or "Your business delivers...".
- The line should feel like a genuine personal observation, not a description.

RULES:
1. ALWAYS use the highest-tier artifact provided. S > A > B. Never use B-tier data when S-tier is available.
2. Open with a SPECIFIC detail — a number, a service, a credential, an award. Something only THEY have.
3. 8-18 words. Punchy. Conversational.
4. Use "you/your" in the first 6 words.
5. NEVER use: recently, just, new, latest, launched, impressive, amazing, innovative, incredible, outstanding, excellent, fantastic, great, awesome, cutting-edge, world-class, best-in-class, leading, premier, remarkable
6. NEVER start with "This stood out" or "Building your reputation" — find a better angle.
7. ONE data point. Don't cram multiple facts.
8. Do NOT start with the company name as subject.
9. If you reference a quote or award, make sure it reads as a COMPLETE thought — never a fragment.

CRITICAL FORMAT RULES:
- NEVER use em-dashes (—), en-dashes (–), or hyphens (-) as separators.
- NEVER use semicolons, colons, or bullet points.
- Write ONE complete sentence with a period at the end.
- The sentence must flow naturally as the first line of a cold email body.
- Write like you're texting a business owner, not writing a report.
- No quotation marks in your output.

OUTPUT FORMAT:
LINE: [your opener]
TIER: [S/A/B — must match the tier of the data you referenced]
TYPE: [artifact type used]
ARTIFACT: [exact data referenced]

If no usable data: LINE: NO_DATA_FOUND`

// ============================================
// ARTIFACT SELECTION
// ============================================

function selectBestArtifact(artifacts: Artifact[]): Artifact | null {
  if (!artifacts || artifacts.length === 0) return null

  // Filter out artifacts with unusable text FIRST
  const usable = artifacts.filter(a => a.type === 'FALLBACK' || isArtifactTextUsable(a.text))

  // Sort by priority order, then by score within same type
  const sorted = [...usable].sort((a, b) => {
    const aPriority = ARTIFACT_PRIORITY.indexOf(a.type)
    const bPriority = ARTIFACT_PRIORITY.indexOf(b.type)
    const aIdx = aPriority === -1 ? ARTIFACT_PRIORITY.length : aPriority
    const bIdx = bPriority === -1 ? ARTIFACT_PRIORITY.length : bPriority
    if (aIdx !== bIdx) return aIdx - bIdx
    return b.score - a.score
  })

  return sorted[0] || null
}

// ============================================
// QUALITY VALIDATION
// ============================================

interface ValidationResult {
  isValid: boolean
  issues: string[]
  action: 'accept' | 'retry' | 'fallback'
}

function validateLine(line: string, companyName: string): ValidationResult {
  const issues: string[] = []
  const lineLower = line.toLowerCase()
  const words = line.split(/\s+/)
  const wordCount = words.length

  // Critical: empty/too short
  if (!line || line.length < 10) {
    return { isValid: false, issues: ['Empty or too short'], action: 'fallback' }
  }

  // Word count bounds
  if (wordCount < MIN_LINE_WORDS) {
    return { isValid: false, issues: [`Too short: ${wordCount} words (min ${MIN_LINE_WORDS})`], action: 'retry' }
  }
  if (wordCount > MAX_LINE_WORDS) {
    return { isValid: false, issues: [`Too long: ${wordCount} words (max ${MAX_LINE_WORDS})`], action: 'retry' }
  }

  // Truncation: ends with article/preposition
  const lastWord = words[words.length - 1].toLowerCase().replace(/[.,!?]+$/, '')
  const truncationWords = [
    'a', 'an', 'the', 'to', 'of', 'in', 'for', 'with', 'and', 'or', 'but',
    'that', 'this', 'your', 'their', 'its', 'from', 'by', 'on', 'at',
    'is', 'are', 'was', 'were', 'be', 'has', 'have', 'had',
  ]
  if (truncationWords.includes(lastWord)) {
    return { isValid: false, issues: [`Truncated: ends with '${lastWord}'`], action: 'retry' }
  }

  // Unclosed quotes
  const doubleQuotes = (line.match(/"/g) || []).length
  const singleQuotes = (line.match(/'/g) || []).length
  if (doubleQuotes % 2 !== 0) {
    return { isValid: false, issues: ['Unclosed double quotes'], action: 'retry' }
  }

  // Banned timing words
  for (const word of BANNED_TIMING_WORDS) {
    if (lineLower.includes(word)) {
      return { isValid: false, issues: [`Banned timing word: '${word}'`], action: 'retry' }
    }
  }

  // Banned hype adjectives (word boundary check)
  for (const word of BANNED_HYPE_ADJECTIVES) {
    const regex = new RegExp(`\\b${word.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i')
    if (regex.test(line)) {
      return { isValid: false, issues: [`Banned hype word: '${word}'`], action: 'retry' }
    }
  }

  // Generic phrases
  for (const phrase of GENERIC_LINE_PHRASES) {
    if (lineLower.includes(phrase)) {
      return { isValid: false, issues: [`Generic phrase: '${phrase}'`], action: 'retry' }
    }
  }

  // Check for separator dashes
  if (/\s[-–—]\s/.test(line)) {
    issues.push('Contains dash separator — rewrite as flowing sentence')
  }

  // Statement style check — should be observation style, not description
  const statementPatterns = [
    /^your (team|company|business|firm) (provides|offers|delivers|specializes|has been|is)/i,
    /^(the |)[A-Z][\w\s&'-]+ (provides|offers|is a|has been|delivers|specializes)/i,
  ]
  for (const pattern of statementPatterns) {
    if (pattern.test(line)) {
      issues.push('Statement style — rewrite as observation (use "Saw your..." or "Noticed your...")')
    }
  }

  // Company name as grammatical subject (bad pattern)
  const companyLower = companyName.toLowerCase()
  const companySubjectPatterns = [
    new RegExp(`^${companyLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'s\\s+\\w+\\s+(is|are|was|has|have)\\b`, 'i'),
    new RegExp(`^${companyLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+(is|are|was|has|have|offers|provides)\\b`, 'i'),
  ]
  for (const pattern of companySubjectPatterns) {
    if (pattern.test(line)) {
      issues.push('Company name used as subject — should address recipient directly')
    }
  }

  // Experiential claims (fabricated first-person experiences)
  const experientialPatterns = [
    /\bi saw .* at (?:the|your)\b/i,
    /\bi met\b/i, /\bi attended\b/i, /\bi was at\b/i,
    /\bi visited\b/i, /\bi stopped by\b/i,
    /\byour booth\b/i,
    /\bspoke with .* from\b/i,
  ]
  for (const pattern of experientialPatterns) {
    if (pattern.test(line)) {
      issues.push('Contains fabricated experiential claim')
    }
  }

  // you/your check — must appear in first 8 words
  const first8 = words.slice(0, 8).join(' ').toLowerCase()
  if (!first8.includes('your') && !first8.includes('you ') && !first8.includes('you\'')) {
    issues.push('Missing you/your in opener')
  }

  // Repeated words
  for (let i = 0; i < words.length - 1; i++) {
    if (words[i].toLowerCase() === words[i + 1].toLowerCase() && words[i].length > 2) {
      issues.push(`Repeated word: '${words[i]}'`)
    }
  }

  // Missing end punctuation
  if (line && !'.!?'.includes(line[line.length - 1])) {
    issues.push('Missing end punctuation')
  }

  if (issues.length > 0) {
    return { isValid: false, issues, action: issues.length >= 3 ? 'fallback' : 'retry' }
  }

  return { isValid: true, issues: [], action: 'accept' }
}

// ============================================
// PROMPT BUILDER
// ============================================

function buildPrompt(companyName: string, artifact: Artifact | null, research: SerperResearchData | null, lead: any): string {
  const parts: string[] = []

  parts.push(`COMPANY: ${companyName}`)

  // Industry hint
  const industry = (lead.industry || '').toLowerCase().replace(/_/g, ' ')
  if (industry) parts.push(`INDUSTRY: ${industry}`)

  // Group artifacts by tier for Claude
  const sTier: string[] = []
  const aTier: string[] = []
  const bTier: string[] = []

  // Rating/Reviews — S-tier if strong
  if (lead.enrichedRating) {
    const ratingText = lead.enrichedReviews
      ? `${lead.enrichedRating} stars across ${lead.enrichedReviews} Google reviews`
      : `${lead.enrichedRating}-star Google rating`
    if (lead.enrichedRating >= 4.0) {
      sTier.push(`REVIEWS: ${ratingText}`)
    } else {
      aTier.push(`REVIEWS: ${ratingText}`)
    }
  }

  // Organize research artifacts by tier
  if (research) {
    for (const a of research.artifacts.filter(a => a.type !== 'FALLBACK' && isArtifactTextUsable(a.text))) {
      const label = `${a.type}: ${a.text}`
      if (a.tier === 'S') sTier.push(label)
      else if (a.tier === 'A') aTier.push(label)
      else bTier.push(label)
    }
  }

  // Present data grouped by tier — S first, clearly labeled
  if (sTier.length > 0) {
    parts.push(`\n=== S-TIER DATA (USE THIS — highest priority) ===`)
    for (const s of sTier.slice(0, 5)) {
      parts.push(`  ★ ${s}`)
    }
  }

  if (aTier.length > 0) {
    parts.push(`\n--- A-TIER DATA (use only if no S-tier is usable) ---`)
    for (const a of aTier.slice(0, 3)) {
      parts.push(`  ${a}`)
    }
  }

  if (bTier.length > 0) {
    parts.push(`\n--- B-TIER DATA (last resort) ---`)
    for (const b of bTier.slice(0, 2)) {
      parts.push(`  ${b}`)
    }
  }

  const services = Array.isArray(lead.enrichedServices) ? (lead.enrichedServices as string[]) : []
  if (services.length > 0) {
    parts.push(`\nSERVICES: ${services.slice(0, 5).join(', ')}`)
  }

  if (lead.city && lead.state) {
    parts.push(`LOCATION: ${lead.city}, ${lead.state}`)
  }

  // Research snippets for context
  if (research && research.snippets.length > 0) {
    parts.push(`\nWEB SNIPPETS:`)
    for (const snippet of research.snippets.slice(0, 4)) {
      parts.push(`  - ${snippet.substring(0, 200)}`)
    }
  }

  // Website content — rich source for unique angles
  if (research && research.websiteContent) {
    const excerpt = research.websiteContent.substring(0, 1500)
    parts.push(`\n=== COMPANY WEBSITE CONTENT (from ${research.websiteUrl || 'their site'}) ===`)
    parts.push(excerpt)
    parts.push(`\nThe above is from their actual website. Mine it for unique angles: their story, specific claims, certifications, named projects, team details, warranties, founding year, anything that makes them DIFFERENT.`)
  }

  // Explicit instruction based on available data
  if (sTier.length > 0) {
    const hasNonReviewSTier = sTier.some(s => !s.startsWith('REVIEWS:') && !s.includes('stars across'))
    if (hasNonReviewSTier) {
      parts.push(`\nYou MUST use a NON-REVIEW S-TIER data point if available (certification, award, project, tool). Reviews are a fallback. Write a punchy 8-18 word opener.`)
    } else {
      parts.push(`\nUse the S-TIER review data, but try to pair it with another detail from the website content or research if possible. Write a punchy 8-18 word opener.`)
    }
  } else if (aTier.length > 0) {
    parts.push(`\nNo S-tier data available. Use the best A-TIER data point above for your opener.`)
  } else {
    parts.push(`\nOnly B-tier data available. Write the best opener you can with what's here.`)
  }
  parts.push(`Do NOT write "This stood out" or "Building your reputation" — be more creative.`)

  return parts.join('\n')
}

// ============================================
// SMART FALLBACKS
// ============================================

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateSmartFallback(companyName: string, lead: any, artifact: Artifact | null): PersonalizationResult {
  const city = lead.city || ''
  const state = lead.state || ''
  const location = city || state
  const services = Array.isArray(lead.enrichedServices) ? (lead.enrichedServices as string[]) : []
  const rating = lead.enrichedRating as number | null
  const reviews = lead.enrichedReviews as number | null
  const industry = (lead.industry || '').toLowerCase().replace(/_/g, ' ')

  // --- Priority 1: Rating + Reviews (S-tier) ---
  if (rating && rating >= 4.0 && reviews && reviews > 5) {
    const line = pick([
      `Your ${rating} stars across ${reviews}+ reviews — that's not easy to maintain in ${industry || 'this space'}.`,
      `${reviews} reviews and still holding ${rating} stars, your customers clearly trust you.`,
      `${rating}-star average with ${reviews} reviews — you're doing something your competitors aren't.`,
    ])
    return { firstLine: line, hook: `${rating} stars / ${reviews} reviews`, angle: 'social-proof', tier: 'S', tokensCost: 0 }
  }

  if (rating && rating >= 4.0) {
    const line = pick([
      `Your ${rating}-star rating caught my attention — that's well above average for ${industry || 'your industry'}.`,
      `Holding a ${rating}-star rating in ${industry || 'this business'} says a lot about how you operate.`,
    ])
    return { firstLine: line, hook: `${rating} stars`, angle: 'social-proof', tier: 'S', tokensCost: 0 }
  }

  // --- Priority 2: Artifact-based (tier from artifact) ---
  if (artifact && artifact.type !== 'FALLBACK' && isArtifactTextUsable(artifact.text)) {
    const text = artifact.text
    const artifactTier = artifact.tier
    switch (artifact.type) {
      case 'TOOL_PLATFORM':
        return { firstLine: pick([
          `Your team runs on ${text} — that's a sign you take operations seriously.`,
          `Saw you're using ${text}, that puts you ahead of most ${industry} companies.`,
        ]), hook: text, angle: 'tool-platform', tier: artifactTier, tokensCost: 0 }
      case 'CLIENT_OR_PROJECT':
        return { firstLine: pick([
          `Your work on ${text} caught my eye — that's a solid portfolio piece.`,
          `The ${text} project on your profile shows the caliber of work you do.`,
        ]), hook: text, angle: 'client-project', tier: artifactTier, tokensCost: 0 }
      case 'EXACT_PHRASE':
        return { firstLine: `${text} — that's a credential most ${industry} companies can't claim.`, hook: text, angle: 'exact-phrase', tier: artifactTier, tokensCost: 0 }
      case 'SERVICE_PROGRAM':
        return { firstLine: pick([
          `Your ${text} is the kind of thing that wins repeat customers.`,
          `Offering ${text} — that's a smart move most of your competitors skip.`,
        ]), hook: text, angle: 'service-program', tier: artifactTier, tokensCost: 0 }
      case 'HIRING_SIGNAL':
        return { firstLine: `Scaling up with ${text} — looks like business is moving in the right direction.`, hook: text, angle: 'hiring-signal', tier: artifactTier, tokensCost: 0 }
      case 'COMPANY_DESCRIPTION':
        return { firstLine: `${text} — that kind of focus is rare in ${industry || 'this market'}.`, hook: text, angle: 'description', tier: artifactTier, tokensCost: 0 }
    }
  }

  // --- Priority 3: Services + Location combo (B-tier) ---
  if (services.length > 0 && services[0].length > 5 && location) {
    const svc = services[0]
    const line = pick([
      `Running ${svc.toLowerCase()} in ${location} is competitive — your reviews suggest you're winning.`,
      `Your ${svc.toLowerCase()} work in ${location} keeps coming up in searches, that's a good sign.`,
      `Handling ${svc.toLowerCase()} in the ${location} market — you clearly know the area.`,
    ])
    return { firstLine: line, hook: `${svc} / ${location}`, angle: 'service-location', tier: 'B', tokensCost: 0 }
  }

  // --- Priority 4: Services only (B-tier) ---
  if (services.length >= 2) {
    const line = pick([
      `Covering both ${services[0].toLowerCase()} and ${services[1].toLowerCase()} — that range gives your customers one less call to make.`,
      `Your ${services[0].toLowerCase()} and ${services[1].toLowerCase()} work shows you're not a one-trick operation.`,
    ])
    return { firstLine: line, hook: services.slice(0, 2).join(', '), angle: 'specialization', tier: 'B', tokensCost: 0 }
  }

  if (services.length > 0 && services[0].length > 5) {
    const svc = services[0]
    return { firstLine: `Your ${svc.toLowerCase()} work keeps showing up in my research — clearly doing something right.`, hook: svc, angle: 'specialization', tier: 'B', tokensCost: 0 }
  }

  // --- Priority 5: Location only (B-tier) ---
  if (location) {
    const line = pick([
      `Running a ${industry || 'service'} business in ${location} means competing with a lot of noise — and you're standing out.`,
      `${location} has no shortage of ${industry || 'service'} companies, but your name keeps coming up.`,
      `Your presence in the ${location} ${industry || 'service'} market is hard to miss.`,
    ])
    return { firstLine: line, hook: location, angle: 'location', tier: 'B', tokensCost: 0 }
  }

  // --- Last resort (B-tier) ---
  return {
    firstLine: `Your online presence stood out while I was researching ${industry || 'local service'} companies — wanted to reach out.`,
    hook: companyName,
    angle: 'general',
    tier: 'B',
    tokensCost: 0,
  }
}

// ============================================
// POST-PROCESSOR: Clean personalization lines
// ============================================

function cleanPersonalizationLine(line: string): string {
  // Remove surrounding quotes
  line = line.replace(/^["']|["']$/g, '').trim()
  // Remove leading dashes/bullets
  line = line.replace(/^[-–—•*]\s*/, '')
  // Replace em-dashes/en-dashes with commas
  line = line.replace(/\s*[—–]\s*/g, ', ')
  // Replace standalone hyphens used as separators (not in compound words)
  line = line.replace(/\s+-\s+/g, ', ')
  // Remove double spaces
  line = line.replace(/\s{2,}/g, ' ')
  // Ensure ends with period
  if (line && !'.!?'.includes(line[line.length - 1])) {
    line += '.'
  }
  return line.trim()
}

// ============================================
// PARSE CLAUDE RESPONSE
// ============================================

function parseClaudeResponse(raw: string): { line: string; tier: string; type: string; artifact: string } {
  const result = { line: '', tier: 'B', type: 'FALLBACK', artifact: '' }

  const lineMatch = raw.match(/LINE:\s*([\s\S]+?)(?=\n\s*(?:TIER:|TYPE:|ARTIFACT:)|$)/i)
  if (lineMatch) {
    result.line = lineMatch[1].trim().replace(/\s+/g, ' ')
  }

  const tierMatch = raw.match(/TIER:\s*([SAB])/i)
  if (tierMatch) result.tier = tierMatch[1].toUpperCase()

  const typeMatch = raw.match(/TYPE:\s*(\w+(?:[_\s]\w+)?)/i)
  if (typeMatch) result.type = typeMatch[1].trim().toUpperCase().replace(/\s/g, '_')

  const artifactMatch = raw.match(/ARTIFACT:\s*([\s\S]+?)(?=\n\s*(?:TIER:|TYPE:|LINE:)|$)/i)
  if (artifactMatch) result.artifact = artifactMatch[1].trim()

  // Clean quotes and run post-processor
  let line = cleanPersonalizationLine(result.line)

  // Capitalize first letter
  if (line && line[0] >= 'a' && line[0] <= 'z') {
    line = line[0].toUpperCase() + line.slice(1)
  }

  result.line = line
  return result
}

// ============================================
// MAIN EXPORT: generatePersonalization
// ============================================

export async function generatePersonalization(
  leadId: string
): Promise<PersonalizationResult | null> {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    })

    if (!lead) {
      console.error(`Lead not found: ${leadId}`)
      return null
    }

    if (!lead.previewUrl) {
      console.error(`Lead ${leadId} has no preview URL — cannot personalize`)
      return null
    }

    // Read research data from serper.ts (stored in lead.personalization)
    let research: SerperResearchData | null = null
    if (lead.personalization) {
      try {
        const parsed = JSON.parse(lead.personalization)
        if (parsed._research === true) {
          research = parsed as SerperResearchData
        }
      } catch {
        // Not JSON or not research data — that's fine
      }
    }

    // Select best artifact from research
    const bestArtifact = research ? selectBestArtifact(research.artifacts) : null

    // Check if we have any useful data to send to Claude
    const hasUsefulData = bestArtifact && bestArtifact.type !== 'FALLBACK' && bestArtifact.text.length > 3

    if (!hasUsefulData && !lead.enrichedRating && !lead.city) {
      // No data at all — go straight to fallback, save API cost
      const fallback = generateSmartFallback(lead.companyName, lead, bestArtifact)
      // Still try to generate website copy with whatever data we have
      const { copy: websiteCopy, cost: copyCost } = await generateWebsiteCopy(lead, research, research?.artifacts || [])
      fallback.websiteCopy = websiteCopy || undefined
      fallback.tokensCost += copyCost
      await storeResult(leadId, lead.companyName, fallback)
      return fallback
    }

    // Build prompt with artifact context
    const prompt = buildPrompt(lead.companyName, bestArtifact, research, lead)

    // Retry loop with quality validation (up to 3 attempts)
    const maxAttempts = 3
    let lastIssues: string[] = []

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        let userPrompt = prompt
        if (attempt > 0 && lastIssues.length > 0) {
          userPrompt += `\n\nYour previous attempt failed validation: ${lastIssues.join(', ')}. Please write a NEW line that avoids these issues.`
        }

        const response = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 300,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userPrompt }],
        })

        const responseText = response.content[0].type === 'text' ? response.content[0].text : ''
        const parsed = parseClaudeResponse(responseText)

        // Check NO_DATA_FOUND
        if (parsed.line.toUpperCase().includes('NO_DATA_FOUND') || parsed.type === 'NO_DATA') {
          break // Fall through to smart fallback
        }

        // Validate quality
        const validation = validateLine(parsed.line, lead.companyName)

        if (validation.isValid) {
          const tokensCost = (response.usage.input_tokens + response.usage.output_tokens) * 0.0000008

          // Generate website copy in parallel with storing the first line
          const { copy: websiteCopy, cost: copyCost } = await generateWebsiteCopy(
            lead, research, research?.artifacts || []
          )

          const result: PersonalizationResult = {
            firstLine: parsed.line,
            hook: parsed.artifact || (bestArtifact?.text ?? ''),
            angle: parsed.type.toLowerCase().replace(/_/g, '-'),
            tier: (parsed.tier as 'S' | 'A' | 'B') || bestArtifact?.tier || 'B',
            tokensCost: tokensCost + copyCost,
            websiteCopy: websiteCopy || undefined,
          }

          await storeResult(leadId, lead.companyName, result)

          // Log API cost
          await prisma.apiCost.create({
            data: {
              service: 'anthropic',
              operation: 'personalization',
              cost: result.tokensCost,
            },
          }).catch(err => console.error('[Personalization] API cost write failed:', err))

          return result
        }

        // Failed validation
        lastIssues = validation.issues
        console.warn(`[PERSONALIZATION] Attempt ${attempt + 1} failed for ${lead.companyName}: ${validation.issues.join(', ')}`)

        if (validation.action === 'fallback') {
          break // Don't retry, go to fallback
        }
      } catch (error) {
        console.error(`[PERSONALIZATION] Claude error attempt ${attempt + 1}:`, error)
        lastIssues = [error instanceof Error ? error.message : 'API error']
      }
    }

    // All attempts failed — use smart fallback
    console.warn(`[PERSONALIZATION] Using fallback for ${lead.companyName}`)
    const fallback = generateSmartFallback(lead.companyName, lead, bestArtifact)
    // Still try website copy generation — it uses a different prompt
    const { copy: websiteCopy, cost: copyCost } = await generateWebsiteCopy(lead, research, research?.artifacts || [])
    fallback.websiteCopy = websiteCopy || undefined
    fallback.tokensCost += copyCost
    await storeResult(leadId, lead.companyName, fallback)
    return fallback
  } catch (error) {
    console.error('Personalization error:', error)
    return null
  }
}

// ============================================
// WEBSITE COPY GENERATION
// ============================================

const WEBSITE_COPY_SYSTEM = `You are an elite conversion copywriter who writes landing pages that look like they cost $15,000. Your copy makes local service businesses sound like the dominant force in their market — confident, established, and worth every penny.

You write for the CUSTOMER visiting the page. Use "you/your" language. Every line should make the visitor feel: "These people clearly know what they're doing."

TONE: Think Apple meets local contractor. Clean, confident, outcome-focused. The copy should feel like a premium brand wrote it — not a template engine.

COPY PHILOSOPHY:
- Lead with OUTCOMES, not features. "Your roof protects your family for the next 30 years" beats "We install quality roofing."
- Paint a PICTURE of the result. Help the visitor imagine the finished project, the relief, the pride.
- Use REAL data aggressively — specific numbers hit harder than adjectives. "4.9 stars across 127 reviews" or "Serving Dallas since 2008."
- Short sentences punch. Long sentences flow. Mix them intentionally. One-word sentences work.
- The hero headline should stop scrolling. Make it bold enough to put on a billboard.
- Value props should answer "Why THIS company?" with proof, not claims.

BANNED WORDS (these scream template):
- impressive, amazing, innovative, best, leading, incredible, outstanding, excellent, exceptional, cutting-edge, world-class, premier, top-notch, superb, remarkable, fantastic, unparalleled, unmatched
- "we believe", "we strive", "we are committed", "our mission is", "we take pride", "look no further", "one-stop shop", "second to none"

BANNED PATTERNS:
- Starting any section with "At [Company Name], we..." — this is the #1 template tell
- Generic value props like "Quality Workmanship" or "Customer Satisfaction" without proof
- Placeholder-sounding phrases: "your trusted partner", "serving the community"
- Ending with "Contact us today!" — too desperate

OUTPUT FORMAT: PLAIN TEXT ONLY. Do NOT use markdown formatting — no **bold**, no *italic*, no # headers, no bullet lists. Just the label (e.g. HERO_HEADLINE:) followed by the plain text content. The text goes directly into a rendered website template.

INSTEAD:
- Start the about section mid-story: "Fifteen years ago, a single truck and a handshake..." or "Most contractors cut corners on prep work. We spend twice as long on it."
- Value props with teeth: "4.9-Star Google Rating" (with the actual number) beats "Highly Rated"
- CTAs that assume the sale: "Get your free estimate" beats "Contact us today"
- Write like you actually visited their job site and talked to their customers.`

function buildWebsiteCopyPrompt(lead: any, research: SerperResearchData | null, artifacts: Artifact[]): string {
  const parts: string[] = []
  const industry = (lead.industry || '').toLowerCase().replace(/_/g, ' ')
  const location = [lead.city, lead.state].filter(Boolean).join(', ')
  const services = Array.isArray(lead.enrichedServices) ? (lead.enrichedServices as string[]) : []
  const rating = lead.enrichedRating as number | null
  const reviews = lead.enrichedReviews as number | null

  parts.push(`COMPANY: ${lead.companyName}`)
  parts.push(`INDUSTRY: ${industry}`)
  if (location) parts.push(`LOCATION: ${location}`)
  if (rating) parts.push(`RATING: ${rating} stars${reviews ? ` (${reviews} reviews)` : ''}`)
  if (services.length > 0) parts.push(`SERVICES: ${services.slice(0, 8).join(', ')}`)

  // Inject conversation-collected data (highest priority for site copy quality)
  const qd = lead.qualificationData as Record<string, unknown> | null
  if (qd && typeof qd === 'object') {
    const ownerData: string[] = []
    if (qd.aboutStory) ownerData.push(`OWNER'S OWN WORDS (about their business): "${qd.aboutStory}"`)
    if (qd.differentiator) ownerData.push(`WHAT MAKES THEM DIFFERENT (owner said): "${qd.differentiator}"`)
    if (qd.yearsInBusiness) ownerData.push(`YEARS IN BUSINESS: ${qd.yearsInBusiness}`)
    if (qd.serviceArea) {
      const area = Array.isArray(qd.serviceArea) ? (qd.serviceArea as string[]).join(', ') : qd.serviceArea
      ownerData.push(`SERVICE AREA: ${area}`)
    }
    if (qd.testimonial) ownerData.push(`REAL CUSTOMER QUOTE (feature this on the site): "${qd.testimonial}"`)
    if (qd.certifications) {
      const certs = Array.isArray(qd.certifications) ? (qd.certifications as string[]).join(', ') : qd.certifications
      ownerData.push(`CERTIFICATIONS/AWARDS: ${certs}`)
    }

    if (ownerData.length > 0) {
      parts.push(`\n=== OWNER-PROVIDED DATA (HIGHEST PRIORITY — use over web scraping) ===`)
      for (const d of ownerData) {
        parts.push(`  >>> ${d}`)
      }
      parts.push(`CRITICAL: The owner's words above are MORE ACCURATE and AUTHENTIC than web research. Use them as the primary source for About sections, value props, and hero copy. Weave their actual language in naturally.`)
    }
  }

  // Add research artifacts for context
  const usableArtifacts = artifacts.filter(a => a.type !== 'FALLBACK' && a.text.length > 3)
  if (usableArtifacts.length > 0) {
    parts.push(`\nRESEARCH FINDINGS:`)
    for (const a of usableArtifacts.slice(0, 5)) {
      parts.push(`  [${a.type}] ${a.text}`)
    }
  }

  if (research && research.snippets.length > 0) {
    parts.push(`\nWEB SNIPPETS:`)
    for (const s of research.snippets.slice(0, 3)) {
      parts.push(`  - ${s.substring(0, 200)}`)
    }
  }

  // Include website content for richer, more authentic copy
  if (research && research.websiteContent) {
    const excerpt = research.websiteContent.substring(0, 2000)
    parts.push(`\nCOMPANY'S OWN WEBSITE CONTENT (from ${research.websiteUrl || 'their site'}):`)
    parts.push(excerpt)
    parts.push(`Use their actual website language and claims to make the landing page feel authentic. Reference real details they mention about themselves.`)
  }

  parts.push(`\nWrite landing page copy for ${lead.companyName} that makes them look like the #1 choice in ${location || 'their market'}. Use every data point above.\n`)
  parts.push(`FORMAT — output EXACTLY these labels, one per line, with PLAIN TEXT (no markdown, no **bold**, no bullets):`)
  parts.push(`HERO_HEADLINE: [5-10 words. Billboard-worthy. Outcome-focused or confidence-driven. BAD: "Professional Roofing Services You Can Trust". GOOD: "The Last Roofer You'll Ever Call." or "Zero Callbacks. Zero Leaks. Guaranteed." Reference a real strength if powerful enough.]`)
  parts.push(`HERO_SUBHEADLINE: [12-22 words. Expand on the headline's promise. Ground it with a specific — their location, rating, specialty, or years. Make the visitor think "okay, these people are legit."]`)
  parts.push(`ABOUT_P1: [2-3 sentences. Start mid-story or with a strong specific — NOT "At Company, we..." Open with what makes them different: their origin, their approach, a defining moment. Weave in real numbers (years, reviews, team size) naturally, not as a list.]`)
  parts.push(`ABOUT_P2: [2-3 sentences. How they work or what the customer experience feels like. Paint the picture: same-day quotes, crews that show up on time, job sites left cleaner than they found them. End with something concrete and memorable.]`)
  parts.push(`VP1_TITLE: [2-4 words — backed by real data. e.g. "4.9-Star Rated" not "Quality Work"]`)
  parts.push(`VP1_DESC: [8-15 words. Cite the actual proof: "${rating ? `Rated ${rating} stars across ${reviews || 'dozens of'} Google reviews` : 'Proven track record with consistently high customer ratings'}"]`)
  parts.push(`VP2_TITLE: [2-4 words — a real differentiator, not a generic claim]`)
  parts.push(`VP2_DESC: [8-15 words. Make it specific to THIS company — their license, their response time, their guarantee.]`)
  parts.push(`VP3_TITLE: [2-4 words — another concrete trust signal]`)
  parts.push(`VP3_DESC: [8-15 words. Reference something verifiable: location served, certifications held, years active.]`)
  parts.push(`CLOSING_HEADLINE: [5-10 words. Confident close. Think: "Your neighbors already know." or "The estimate is free. The peace of mind isn't." NOT "Ready to Get Started?"]`)
  parts.push(`CLOSING_BODY: [15-25 words. Outcome-focused CTA. Reference their services or location. Make the next step feel easy and obvious.]`)
  parts.push(`TESTIMONIAL_QUOTE: [If a real customer quote was provided, clean it up for display. If not, write a hyper-realistic one that: (1) mentions a specific service they offer, (2) references ${location || 'their area'}, (3) sounds like a real person — slightly informal, with a detail only a real customer would mention. 1-2 sentences. BAD: "Great company, highly recommend!" GOOD: "They replaced our entire deck in three days and the crew cleaned up every single nail. Our neighbors have already asked for their number."]`)
  parts.push(`TESTIMONIAL_AUTHOR: [If real quote: "Verified Customer · ${location || 'Local'}". If generated: realistic name-like role — "Sarah M., Homeowner" or "Property Manager" · ${location || 'Local'}]`)
  parts.push(`YEARS_BADGE: [If years in business known: "Serving ${location || 'the area'} since [year]" (calculate from current year). If unknown: NONE]`)
  parts.push(`SERVICE_AREA_TEXT: [If service area known: one sentence about where they serve. If unknown: NONE]`)

  // Service descriptions
  if (services.length > 0) {
    parts.push(`\nFor each service below, write a RICH description (2-3 sentences, 30-50 words) that focuses on the OUTCOME or BENEFIT to the customer. Include what the process looks like and a trust signal. BAD: "Professional installation of residential roofing systems." GOOD: "Complete tear-off and install with premium materials — most jobs wrapped in a single day. Every project backed by a 10-year workmanship warranty and full cleanup."`)
    for (const svc of services.slice(0, 8)) {
      parts.push(`SVC_${svc.toUpperCase().replace(/[^A-Z0-9]/g, '_')}: [30-50 word rich description for "${svc}" — outcome + process + trust signal]`)
    }
  }

  // New rich content labels
  parts.push(`\n--- ADDITIONAL RICH CONTENT (generate ALL of these) ---`)
  parts.push(`PROCESS_STEP_1_TITLE: [2-4 words, e.g. "Free Consultation"]`)
  parts.push(`PROCESS_STEP_1_DESC: [8-15 words describing this step]`)
  parts.push(`PROCESS_STEP_2_TITLE: [2-4 words, e.g. "Custom Plan"]`)
  parts.push(`PROCESS_STEP_2_DESC: [8-15 words describing this step]`)
  parts.push(`PROCESS_STEP_3_TITLE: [2-4 words, e.g. "Expert Execution"]`)
  parts.push(`PROCESS_STEP_3_DESC: [8-15 words describing this step]`)
  parts.push(`PROCESS_STEP_4_TITLE: [2-4 words, e.g. "Final Walkthrough"]`)
  parts.push(`PROCESS_STEP_4_DESC: [8-15 words describing this step]`)
  parts.push(`WHY_1_TITLE: [2-5 words — a real differentiator]`)
  parts.push(`WHY_1_DESC: [10-20 words explaining why this matters to the customer]`)
  parts.push(`WHY_2_TITLE: [2-5 words — another differentiator]`)
  parts.push(`WHY_2_DESC: [10-20 words explaining why this matters]`)
  parts.push(`WHY_3_TITLE: [2-5 words — a third differentiator]`)
  parts.push(`WHY_3_DESC: [10-20 words explaining why this matters]`)
  parts.push(`BRAND_1: [well-known brand/material name in ${industry || 'their industry'}, e.g. "GAF", "Carrier", "Kohler"]`)
  parts.push(`BRAND_2: [another brand name]`)
  parts.push(`BRAND_3: [another brand name]`)
  parts.push(`BRAND_4: [another brand name]`)
  parts.push(`BRAND_5: [another brand name]`)
  parts.push(`TESTIMONIAL_2_QUOTE: [Realistic 1-2 sentence customer review mentioning a specific service. Different from TESTIMONIAL_QUOTE above.]`)
  parts.push(`TESTIMONIAL_2_AUTHOR: [Realistic name, e.g. "Mike R., Homeowner"]`)
  parts.push(`TESTIMONIAL_3_QUOTE: [Another realistic review, different angle/service]`)
  parts.push(`TESTIMONIAL_3_AUTHOR: [Realistic name]`)
  parts.push(`TESTIMONIAL_4_QUOTE: [Another realistic review]`)
  parts.push(`TESTIMONIAL_4_AUTHOR: [Realistic name]`)

  return parts.join('\n')
}

function truncateWords(text: string, maxWords: number): string {
  const words = text.split(/\s+/)
  if (words.length <= maxWords) return text
  return words.slice(0, maxWords).join(' ')
}

/** Strip markdown formatting artifacts from AI-generated text */
function cleanMarkdown(text: string): string {
  return text
    .replace(/\*\*/g, '')                         // Strip bold markers
    .replace(/(?<!\w)\*(?!\*)/g, '')              // Strip italic markers (not inside words)
    .replace(/^#+\s*/gm, '')                       // Strip markdown headers
    .replace(/^[-*•]\s+/gm, '')                    // Strip list markers at line start
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')       // Strip links, keep display text
    .replace(/`/g, '')                             // Strip code markers
    .replace(/---+/g, '')                          // Strip horizontal rules
    .replace(/\n{3,}/g, '\n\n')                    // Collapse excessive newlines
    .trim()
}

function parseWebsiteCopyResponse(raw: string, services: string[]): WebsiteCopy | null {
  try {
    // Pre-process: normalize markdown-formatted labels so the parser can split on them
    // Handles: **LABEL:** → LABEL:  |  **LABEL**: → LABEL:  |  ## LABEL: → LABEL:
    let normalized = raw
      .replace(/\*\*([A-Z][A-Z_0-9]+):\*\*/g, '$1:')   // **HERO_HEADLINE:** → HERO_HEADLINE:
      .replace(/\*\*([A-Z][A-Z_0-9]+)\*\*\s*:/g, '$1:') // **HERO_HEADLINE**: → HERO_HEADLINE:
      .replace(/^#+\s*([A-Z][A-Z_0-9]+):/gm, '$1:')     // ## HERO_HEADLINE: → HERO_HEADLINE:
      .replace(/^\*\*\s*$/gm, '')                          // Stray ** on its own line
      // Ensure ALL known labels start on their own line (fixes inline label bleed)
      .replace(/(?<!\n)((?:HERO_HEADLINE|HERO_SUBHEADLINE|ABOUT_P[12]|VP[0-9]_(?:TITLE|DESC)|CLOSING_(?:HEADLINE|BODY)|TESTIMONIAL_(?:QUOTE|AUTHOR|[0-9]_QUOTE|[0-9]_AUTHOR)|YEARS_BADGE|SERVICE_AREA_TEXT|SVC_[A-Z_0-9]+|PROCESS_STEP_[0-9]_(?:TITLE|DESC)|WHY_[0-9]_(?:TITLE|DESC)|BRAND_[0-9])):/g, '\n$1:')

    const get = (label: string): string => {
      const regex = new RegExp(`${label}:\\s*(.+?)(?=\\n[A-Z][A-Z_0-9]+:|$)`, 's')
      const match = normalized.match(regex)
      if (!match) return ''
      // Clean markdown artifacts from the extracted value
      return cleanMarkdown(match[1].trim().replace(/^\[|\]$/g, '').replace(/^["']|["']$/g, ''))
    }

    const heroHeadline = get('HERO_HEADLINE')
    const heroSubheadline = get('HERO_SUBHEADLINE')
    const aboutParagraph1 = get('ABOUT_P1')
    const aboutParagraph2 = get('ABOUT_P2')
    const vp1Title = get('VP1_TITLE')
    const vp1Desc = get('VP1_DESC')
    const vp2Title = get('VP2_TITLE')
    const vp2Desc = get('VP2_DESC')
    const vp3Title = get('VP3_TITLE')
    const vp3Desc = get('VP3_DESC')
    const closingHeadline = get('CLOSING_HEADLINE')
    const closingBody = get('CLOSING_BODY')
    const testimonialQuote = get('TESTIMONIAL_QUOTE')
    const testimonialAuthor = get('TESTIMONIAL_AUTHOR')
    const yearsBadgeRaw = get('YEARS_BADGE')
    const serviceAreaTextRaw = get('SERVICE_AREA_TEXT')
    const yearsBadge = yearsBadgeRaw && yearsBadgeRaw.toUpperCase() !== 'NONE' ? yearsBadgeRaw : undefined
    const serviceAreaText = serviceAreaTextRaw && serviceAreaTextRaw.toUpperCase() !== 'NONE' ? serviceAreaTextRaw : undefined

    // Validate we got the critical fields
    if (!heroHeadline || !heroSubheadline || !aboutParagraph1) {
      console.warn('[WEBSITE_COPY] Missing critical fields in response')
      return null
    }

    // Parse service descriptions
    const serviceDescriptions: Record<string, string> = {}
    for (const svc of services.slice(0, 8)) {
      const svcKey = svc.toUpperCase().replace(/[^A-Z0-9]/g, '_')
      const desc = get(`SVC_${svcKey}`)
      if (desc && desc.length > 10) {
        serviceDescriptions[svc] = desc
      }
    }

    // Parse process steps
    const processSteps: Array<{ title: string; description: string }> = []
    for (let i = 1; i <= 4; i++) {
      const title = get(`PROCESS_STEP_${i}_TITLE`)
      const desc = get(`PROCESS_STEP_${i}_DESC`)
      if (title && title.length > 2) {
        processSteps.push({ title: truncateWords(title, 5), description: truncateWords(desc || '', 18) })
      }
    }

    // Parse why choose us
    const whyChooseUs: Array<{ title: string; description: string }> = []
    for (let i = 1; i <= 3; i++) {
      const title = get(`WHY_${i}_TITLE`)
      const desc = get(`WHY_${i}_DESC`)
      if (title && title.length > 2) {
        whyChooseUs.push({ title: truncateWords(title, 6), description: truncateWords(desc || '', 25) })
      }
    }

    // Parse brand names
    const brandNames: string[] = []
    for (let i = 1; i <= 5; i++) {
      const brand = get(`BRAND_${i}`)
      if (brand && brand.length > 1 && brand.toUpperCase() !== 'NONE') {
        brandNames.push(truncateWords(brand, 4))
      }
    }

    // Parse additional testimonials
    const additionalTestimonials: Array<{ quote: string; author: string }> = []
    for (let i = 2; i <= 4; i++) {
      const quote = get(`TESTIMONIAL_${i}_QUOTE`)
      const author = get(`TESTIMONIAL_${i}_AUTHOR`)
      if (quote && quote.length > 15) {
        additionalTestimonials.push({
          quote: truncateWords(quote, 50),
          author: author || 'Verified Customer',
        })
      }
    }

    // Enforce word limits to prevent layout blowout (50 words for rich descriptions)
    const trimmedServiceDescriptions: Record<string, string> = {}
    for (const [key, val] of Object.entries(serviceDescriptions)) {
      trimmedServiceDescriptions[key] = truncateWords(val, 50)
    }

    return {
      heroHeadline: truncateWords(heroHeadline, 12),
      heroSubheadline: truncateWords(heroSubheadline, 25),
      aboutParagraph1: truncateWords(aboutParagraph1, 60),
      aboutParagraph2: truncateWords(aboutParagraph2 || aboutParagraph1, 60),
      testimonialQuote: testimonialQuote ? truncateWords(testimonialQuote, 50) : undefined,
      testimonialAuthor: testimonialAuthor || undefined,
      yearsBadge,
      serviceAreaText,
      valueProps: [
        { title: truncateWords(vp1Title || 'Verified & Trusted', 5), description: truncateWords(vp1Desc || '', 18) },
        { title: truncateWords(vp2Title || 'Proven Results', 5), description: truncateWords(vp2Desc || '', 18) },
        { title: truncateWords(vp3Title || 'Local Expertise', 5), description: truncateWords(vp3Desc || '', 18) },
      ],
      closingHeadline: truncateWords(closingHeadline || 'Let\'s Talk About Your Project', 12),
      closingBody: truncateWords(closingBody || '', 30),
      serviceDescriptions: trimmedServiceDescriptions,
      processSteps: processSteps.length > 0 ? processSteps : undefined,
      whyChooseUs: whyChooseUs.length > 0 ? whyChooseUs : undefined,
      brandNames: brandNames.length > 0 ? brandNames : undefined,
      additionalTestimonials: additionalTestimonials.length > 0 ? additionalTestimonials : undefined,
    }
  } catch (error) {
    console.error('[WEBSITE_COPY] Parse error:', error)
    return null
  }
}

async function generateWebsiteCopy(
  lead: any,
  research: SerperResearchData | null,
  artifacts: Artifact[]
): Promise<{ copy: WebsiteCopy | null; cost: number }> {
  const services = Array.isArray(lead.enrichedServices) ? (lead.enrichedServices as string[]) : []

  try {
    const prompt = buildWebsiteCopyPrompt(lead, research, artifacts)

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      system: WEBSITE_COPY_SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    })

    const responseText = response.content[0].type === 'text' ? response.content[0].text : ''
    let cost = (response.usage.input_tokens + response.usage.output_tokens) * 0.0000008
    let copy = parseWebsiteCopyResponse(responseText, services)

    // Retry once if parsing failed (AI used markdown or unexpected format)
    if (!copy) {
      console.warn('[WEBSITE_COPY] Parse failed, retrying with explicit plain-text instruction...')
      const retryResponse = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1200,
        system: WEBSITE_COPY_SYSTEM,
        messages: [{ role: 'user', content: prompt + '\n\nCRITICAL: Output PLAIN TEXT only. Each line must start with the LABEL: followed by plain text. NO markdown formatting — no **, no *, no #, no bullets. Just LABEL: text content.' }],
      })
      const retryText = retryResponse.content[0].type === 'text' ? retryResponse.content[0].text : ''
      cost += (retryResponse.usage.input_tokens + retryResponse.usage.output_tokens) * 0.0000008
      copy = parseWebsiteCopyResponse(retryText, services)
    }

    if (copy) {
      // Quick quality check — reject if hero headline contains banned words
      const heroLower = copy.heroHeadline.toLowerCase()
      const hasBanned = BANNED_HYPE_ADJECTIVES.some(w => heroLower.includes(w))
      if (hasBanned) {
        console.warn('[WEBSITE_COPY] Hero headline contains banned words, retrying...')
        // One retry
        const retryResponse = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1200,
          system: WEBSITE_COPY_SYSTEM,
          messages: [{ role: 'user', content: prompt + '\n\nIMPORTANT: Do NOT use hype adjectives. Be specific and factual.' }],
        })
        const retryText = retryResponse.content[0].type === 'text' ? retryResponse.content[0].text : ''
        const retryCost = (retryResponse.usage.input_tokens + retryResponse.usage.output_tokens) * 0.0000008
        const retryCopy = parseWebsiteCopyResponse(retryText, services)
        return { copy: retryCopy || copy, cost: cost + retryCost }
      }
    }

    return { copy, cost }
  } catch (error) {
    console.error('[WEBSITE_COPY] Generation error:', error)
    return { copy: null, cost: 0 }
  }
}

// ============================================
// STORE RESULT
// ============================================

async function storeResult(leadId: string, companyName: string, result: PersonalizationResult) {
  // Run post-processor on firstLine before storing
  result.firstLine = cleanPersonalizationLine(result.firstLine)

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      personalization: JSON.stringify({
        firstLine: result.firstLine,
        hook: result.hook,
        angle: result.angle,
        tier: result.tier,
        ...(result.websiteCopy ? { websiteCopy: result.websiteCopy } : {}),
      }),
    },
  })

  await logActivity(
    'PERSONALIZATION',
    `[${result.tier}] Personalized ${companyName}: "${result.firstLine}"`,
    {
      leadId,
      tokenCost: result.tokensCost,
      metadata: {
        hook: result.hook,
        angle: result.angle,
        tier: result.tier,
      },
    }
  )
}

// ============================================
// BATCH PERSONALIZATION
// ============================================

export async function personalizeLeadsBatch(leadIds: string[]) {
  const results = await Promise.allSettled(
    leadIds.map((id) => generatePersonalization(id))
  )

  const successful = results
    .map((r, i) => ({
      leadId: leadIds[i],
      result: r,
    }))
    .filter((item) => item.result.status === 'fulfilled' && item.result.value)
    .map((item) => ({
      leadId: item.leadId,
      ...(item.result as PromiseFulfilledResult<any>).value,
    }))

  const failed = results
    .map((r, i) => ({
      leadId: leadIds[i],
      result: r,
    }))
    .filter((item) => item.result.status === 'rejected')

  const totalTokenCost = successful.reduce(
    (sum, item) => sum + (item.tokensCost || 0),
    0
  )

  return {
    successful,
    failed: failed.length,
    total: leadIds.length,
    totalTokenCost,
  }
}
