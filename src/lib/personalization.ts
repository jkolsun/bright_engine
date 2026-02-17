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
// SYSTEM PROMPT (from reference algorithm)
// ============================================

const SYSTEM_PROMPT = `Write a cold email opener that sounds personal and conversational.

You're writing TO the person, not ABOUT their company. Use "you/your" language.

WRONG (sounds like a news article):
- "The McGuire Firm has secured over $29M in verdicts."
- "Smith Law boasts a 4.9 star rating."

RIGHT (sounds like a personal email):
- "Securing $29M in verdicts for your clients, that kind of track record speaks for itself."
- "Your 4.9 stars across 200+ reviews caught my eye, that's rare in this space."
- "30 years building your practice in Dallas, you've clearly figured something out."

RULES:
1. Use "you/your" to address them directly
2. Use EXACT data from the research (don't invent numbers)
3. Sound like a human who did their homework, not a robot reading stats
4. 8-18 words, conversational tone
5. NEVER use these timing words: recently, just, new, latest, launched, upcoming, soon, now
6. NEVER use these hype words: impressive, amazing, innovative, incredible, outstanding, excellent, fantastic, great, awesome, cutting-edge, world-class, best-in-class, leading, premier
7. ONE data point per line — do NOT stack multiple facts
8. Do NOT start with the company name as the subject (e.g. "Acme Corp has...")

OUTPUT FORMAT:
LINE: [personal opener using "you/your"]
TIER: [S/A/B]
TYPE: [artifact type used]
ARTIFACT: [exact data from research]

If no usable data: LINE: NO_DATA_FOUND`

// ============================================
// ARTIFACT SELECTION
// ============================================

function selectBestArtifact(artifacts: Artifact[]): Artifact | null {
  if (!artifacts || artifacts.length === 0) return null

  // Sort by priority order, then by score within same type
  const sorted = [...artifacts].sort((a, b) => {
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
  if (industry) {
    parts.push(`INDUSTRY: ${industry}`)
  }

  // Best artifact
  if (artifact && artifact.type !== 'FALLBACK') {
    parts.push(`\nBEST ARTIFACT [${artifact.tier}]:`)
    parts.push(`  Type: ${artifact.type}`)
    parts.push(`  Data: ${artifact.text}`)
    if (artifact.url) parts.push(`  Source: ${artifact.url}`)
  }

  // Other research snippets for context
  if (research && research.snippets.length > 0) {
    parts.push(`\nRESEARCH CONTEXT:`)
    for (const snippet of research.snippets.slice(0, 3)) {
      parts.push(`  - ${snippet.substring(0, 200)}`)
    }
  }

  // Enriched data from SerpAPI
  if (lead.enrichedRating) {
    const ratingText = lead.enrichedReviews
      ? `${lead.enrichedRating} stars across ${lead.enrichedReviews} Google reviews`
      : `${lead.enrichedRating}-star Google rating`
    parts.push(`  - ${ratingText}`)
  }

  const services = Array.isArray(lead.enrichedServices) ? (lead.enrichedServices as string[]) : []
  if (services.length > 0) {
    parts.push(`  - Services: ${services.slice(0, 5).join(', ')}`)
  }

  if (lead.city && lead.state) {
    parts.push(`  - Location: ${lead.city}, ${lead.state}`)
  }

  parts.push(`\nWrite a personal cold email opener (8-18 words) using the BEST ARTIFACT data above.`)
  parts.push(`Use "you/your" language. Use the exact data provided. ONE data point only.`)

  return parts.join('\n')
}

// ============================================
// SMART FALLBACKS
// ============================================

function generateSmartFallback(companyName: string, lead: any, artifact: Artifact | null): PersonalizationResult {
  const city = lead.city || ''
  const services = Array.isArray(lead.enrichedServices) ? (lead.enrichedServices as string[]) : []
  const rating = lead.enrichedRating as number | null

  // Try artifact-based fallback first
  if (artifact && artifact.type !== 'FALLBACK' && artifact.text) {
    const text = artifact.text
    switch (artifact.type) {
      case 'EXACT_PHRASE':
        return { firstLine: `This stood out on your site: "${text}."`, hook: text, angle: 'exact-phrase', tokensCost: 0 }
      case 'TOOL_PLATFORM':
        return { firstLine: `Noticed your team uses ${text}, that tells me you take operations seriously.`, hook: text, angle: 'tool-platform', tokensCost: 0 }
      case 'CLIENT_OR_PROJECT':
        return { firstLine: `Your work on the ${text} project caught my eye.`, hook: text, angle: 'client-project', tokensCost: 0 }
      case 'SERVICE_PROGRAM':
        return { firstLine: `Your ${text} offering stood out to me while researching.`, hook: text, angle: 'service-program', tokensCost: 0 }
      case 'HIRING_SIGNAL':
        return { firstLine: `Saw you're scaling the team with ${text}, that's a solid growth signal.`, hook: text, angle: 'hiring-signal', tokensCost: 0 }
      case 'LOCATION':
        return { firstLine: `Building your reputation in ${text} takes time, you've clearly earned it.`, hook: text, angle: 'location', tokensCost: 0 }
      case 'COMPANY_DESCRIPTION':
        return { firstLine: `This stood out about your team: ${text}.`, hook: text, angle: 'description', tokensCost: 0 }
    }
  }

  // Data-based fallbacks
  if (rating && rating >= 4.0 && lead.enrichedReviews) {
    return {
      firstLine: `Your ${rating} stars across ${lead.enrichedReviews} reviews says a lot about how you run things.`,
      hook: `${rating} stars`,
      angle: 'social-proof',
      tokensCost: 0,
    }
  }

  if (services.length > 0 && services[0].length > 5) {
    const svc = services[0]
    return {
      firstLine: `Your focus on ${svc} really sets you apart from the generalists.`,
      hook: svc,
      angle: 'specialization',
      tokensCost: 0,
    }
  }

  if (city && city.length > 2) {
    return {
      firstLine: `Building a strong reputation in ${city} takes years of solid work, you've clearly put in the time.`,
      hook: city,
      angle: 'location',
      tokensCost: 0,
    }
  }

  // Last resort
  return {
    firstLine: `Came across your team while researching and wanted to reach out.`,
    hook: companyName,
    angle: 'general',
    tokensCost: 0,
  }
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

  // Clean quotes
  let line = result.line
  if ((line.startsWith('"') && line.endsWith('"')) || (line.startsWith("'") && line.endsWith("'"))) {
    line = line.slice(1, -1)
  }

  // Ensure punctuation
  if (line && !'.!?'.includes(line[line.length - 1])) {
    line += '.'
  }

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
          model: 'claude-3-5-haiku-20241022',
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
          }).catch(() => {}) // non-fatal

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

const WEBSITE_COPY_SYSTEM = `You are a senior conversion copywriter. You write landing page copy for local service businesses that sounds like it was RESEARCHED and WRITTEN specifically for that company — not pulled from a template.

Your copy speaks to the CUSTOMER visiting the page. Use "you/your" language.

RULES:
- Use REAL data provided (ratings, review counts, years, services, location). Never invent numbers.
- NEVER use: impressive, amazing, innovative, best, leading, incredible, outstanding, excellent, exceptional, cutting-edge, world-class, premier, top-notch, superb, remarkable, fantastic
- NEVER use: "we believe", "we strive", "we are committed", "our mission is", "we take pride" — these are dead phrases
- Vary sentence length and structure across sections. Mix short punchy lines with longer ones.
- Be SPECIFIC. "127 five-star reviews" beats "many happy customers". "Serving Plano since 2008" beats "years of experience".
- Sound confident and direct, not salesy or desperate.
- Each value prop should reference ACTUAL company data, not generic claims.`

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

  parts.push(`\nGenerate landing page copy for ${lead.companyName}. Use the real data above. Be specific, not generic.\n`)
  parts.push(`FORMAT (output EXACTLY these labels):`)
  parts.push(`HERO_HEADLINE: [6-12 words. Punchy, specific. Reference their actual strength — rating, years, specialty, location. NOT generic like "Professional Services You Can Trust"]`)
  parts.push(`HERO_SUBHEADLINE: [12-22 words. Supports headline. Mention a specific detail — location, specialty, or differentiator.]`)
  parts.push(`ABOUT_P1: [2-3 sentences. What makes THIS specific company stand out. Use real data — years in business, review count, service area, team size. Written as if you researched them.]`)
  parts.push(`ABOUT_P2: [2-3 sentences. Their approach to work. Reference their actual services or specialties. End with something concrete, not a platitude.]`)
  parts.push(`VP1_TITLE: [2-4 words — first trust/value item]`)
  parts.push(`VP1_DESC: [8-15 words. Grounded in their actual data — real rating, real credentials, etc.]`)
  parts.push(`VP2_TITLE: [2-4 words — second trust/value item]`)
  parts.push(`VP2_DESC: [8-15 words. Specific to this company.]`)
  parts.push(`VP3_TITLE: [2-4 words — third trust/value item]`)
  parts.push(`VP3_DESC: [8-15 words. Specific to this company.]`)
  parts.push(`CLOSING_HEADLINE: [5-10 words. Compelling, not "Ready to Get Started?"]`)
  parts.push(`CLOSING_BODY: [15-25 words. Specific CTA referencing their services or location.]`)

  // Service descriptions
  if (services.length > 0) {
    parts.push(`\nFor each service below, write a one-line description (10-18 words) that sounds specific to this company, not a template. Reference the company's strengths or location where natural.`)
    for (const svc of services.slice(0, 6)) {
      parts.push(`SVC_${svc.toUpperCase().replace(/[^A-Z0-9]/g, '_')}: [10-18 word description for "${svc}"]`)
    }
  }

  return parts.join('\n')
}

function parseWebsiteCopyResponse(raw: string, services: string[]): WebsiteCopy | null {
  try {
    const get = (label: string): string => {
      const regex = new RegExp(`${label}:\\s*(.+?)(?=\\n[A-Z_]+:|$)`, 's')
      const match = raw.match(regex)
      return match ? match[1].trim().replace(/^\[|\]$/g, '').replace(/^["']|["']$/g, '') : ''
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

    // Validate we got the critical fields
    if (!heroHeadline || !heroSubheadline || !aboutParagraph1) {
      console.warn('[WEBSITE_COPY] Missing critical fields in response')
      return null
    }

    // Parse service descriptions
    const serviceDescriptions: Record<string, string> = {}
    for (const svc of services.slice(0, 6)) {
      const svcKey = svc.toUpperCase().replace(/[^A-Z0-9]/g, '_')
      const desc = get(`SVC_${svcKey}`)
      if (desc && desc.length > 10) {
        serviceDescriptions[svc] = desc
      }
    }

    return {
      heroHeadline,
      heroSubheadline,
      aboutParagraph1,
      aboutParagraph2: aboutParagraph2 || aboutParagraph1,
      valueProps: [
        { title: vp1Title || 'Verified & Trusted', description: vp1Desc || '' },
        { title: vp2Title || 'Proven Results', description: vp2Desc || '' },
        { title: vp3Title || 'Local Expertise', description: vp3Desc || '' },
      ],
      closingHeadline: closingHeadline || 'Let\'s Talk About Your Project',
      closingBody: closingBody || '',
      serviceDescriptions,
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
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 800,
      system: WEBSITE_COPY_SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    })

    const responseText = response.content[0].type === 'text' ? response.content[0].text : ''
    const cost = (response.usage.input_tokens + response.usage.output_tokens) * 0.0000008
    const copy = parseWebsiteCopyResponse(responseText, services)

    if (copy) {
      // Quick quality check — reject if hero headline contains banned words
      const heroLower = copy.heroHeadline.toLowerCase()
      const hasBanned = BANNED_HYPE_ADJECTIVES.some(w => heroLower.includes(w))
      if (hasBanned) {
        console.warn('[WEBSITE_COPY] Hero headline contains banned words, retrying...')
        // One retry
        const retryResponse = await anthropic.messages.create({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 800,
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
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      personalization: JSON.stringify({
        firstLine: result.firstLine,
        hook: result.hook,
        angle: result.angle,
        ...(result.websiteCopy ? { websiteCopy: result.websiteCopy } : {}),
      }),
    },
  })

  await logActivity(
    'PERSONALIZATION',
    `Personalized ${companyName}: "${result.firstLine}"`,
    {
      leadId,
      tokenCost: result.tokensCost,
      metadata: {
        hook: result.hook,
        angle: result.angle,
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
