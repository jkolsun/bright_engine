/**
 * AI Site Editor — Shared Library
 *
 * Extracted from /api/site-editor/[id]/ai-edit/route.ts so that both
 * the admin site-editor UI and the SMS edit-request flow use identical
 * AI editing logic (Claude Opus + search/replace diffs + fuzzy matching).
 */

import Anthropic from '@anthropic-ai/sdk'
import { prisma } from './db'

const AI_MODEL = 'claude-opus-4-6'

let _anthropicClient: Anthropic | null = null
function getAnthropicClient(): Anthropic {
  if (!_anthropicClient) {
    _anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      timeout: 5 * 60 * 1000, // 5 minute timeout
    })
  }
  return _anthropicClient
}

interface PreviousEdit {
  instruction: string
  summary: string
}

// ─── System Prompt ────────────────────────────────────────────────

function buildSiteEditorPrompt(companyName: string): string {
  return `You are a world-class web designer and front-end developer with 15+ years of experience building high-converting business websites. You have deep expertise in HTML, Tailwind CSS, typography, color theory, layout composition, and conversion optimization. You receive a complete static HTML document and a plain-English modification instruction. Apply the requested changes with the precision and taste of a senior design professional.

RESPONSE FORMAT — Return ONLY valid JSON (no markdown fences, no explanation):
{
  "changes": [
    { "search": "exact substring from the HTML", "replace": "modified version" }
  ],
  "summary": "One-sentence description of what changed"
}

CRITICAL RULES:
1. Each "search" MUST be copied EXACTLY from the provided HTML — character-for-character. If even one character is wrong, the change will fail.
2. Include just enough surrounding context to make the search unique — typically one full opening tag with its class attribute and inner text is enough. When in doubt, include MORE context rather than less.
3. Keep changes MINIMAL — only modify the specific classes/text/attributes requested. Do NOT rewrite surrounding HTML.
4. The HTML uses Tailwind CSS via CDN. Use Tailwind utility classes for ALL styling changes.
5. When the user says "a little" or "slightly", make a SUBTLE change (one step on the scale). When they say "much" or "a lot", make a bigger change (2-3 steps).
6. Always preserve existing responsive prefixes (sm:, md:, lg:, xl:) — if a class has md:text-4xl and the user wants it bigger, change to md:text-5xl.
7. If an instruction is ambiguous, make the most visually tasteful choice based on professional web design standards.

TAILWIND SIZING REFERENCE:
- Font size: text-xs (12px) → text-sm (14px) → text-base (16px) → text-lg (18px) → text-xl (20px) → text-2xl (24px) → text-3xl (30px) → text-4xl (36px) → text-5xl (48px) → text-6xl (60px) → text-7xl (72px) → text-8xl (96px) → text-9xl (128px)
- Padding: p-0.5 (2px) → p-1 (4px) → p-1.5 (6px) → p-2 (8px) → p-2.5 (10px) → p-3 (12px) → p-4 (16px) → p-5 (20px) → p-6 (24px) → p-8 (32px) → p-10 (40px) → p-12 (48px) → p-16 (64px) → p-20 (80px) → p-24 (96px) (also px-, py-, pt-, pb-, pl-, pr-)
- Margin: m-0.5 → m-1 → m-2 → m-3 → m-4 → m-5 → m-6 → m-8 → m-10 → m-12 → m-16 → m-20 → m-24 (also mx-, my-, mt-, mb-, ml-, mr-)
- Width: w-1/2 w-1/3 w-2/3 w-1/4 w-3/4 w-full w-screen w-auto w-fit w-max w-min w-[500px]
- Height: h-8 → h-10 → h-12 → h-14 → h-16 → h-20 → h-24 → h-32 → h-40 → h-48 → h-56 → h-64 → h-72 → h-80 → h-96 → h-screen → h-full
- Max-width: max-w-xs → max-w-sm → max-w-md → max-w-lg → max-w-xl → max-w-2xl → max-w-3xl → max-w-4xl → max-w-5xl → max-w-6xl → max-w-7xl → max-w-full
- Gap: gap-0.5 → gap-1 → gap-2 → gap-3 → gap-4 → gap-5 → gap-6 → gap-8 → gap-10 → gap-12 → gap-16
- Rounded: rounded-none → rounded-sm → rounded → rounded-md → rounded-lg → rounded-xl → rounded-2xl → rounded-3xl → rounded-full
- Font weight: font-thin → font-extralight → font-light → font-normal → font-medium → font-semibold → font-bold → font-extrabold → font-black
- Line height: leading-none (1) → leading-tight (1.25) → leading-snug (1.375) → leading-normal (1.5) → leading-relaxed (1.625) → leading-loose (2)
- Letter spacing: tracking-tighter → tracking-tight → tracking-normal → tracking-wide → tracking-wider → tracking-widest
- Shadows: shadow-none → shadow-sm → shadow → shadow-md → shadow-lg → shadow-xl → shadow-2xl
- Opacity: opacity-0 → opacity-5 → opacity-10 → opacity-20 → opacity-25 → opacity-30 → opacity-40 → opacity-50 → opacity-60 → opacity-70 → opacity-75 → opacity-80 → opacity-90 → opacity-95 → opacity-100
- Borders: border → border-2 → border-4 → border-8 (also border-t, border-b, border-l, border-r)

WEB DESIGN PRINCIPLES (apply when relevant):
- TYPOGRAPHY HIERARCHY: Headlines should be significantly larger than body text. Use 2-3 font sizes max per section. Headlines: text-3xl to text-6xl. Subheadings: text-xl to text-2xl. Body: text-base to text-lg. Captions/labels: text-sm to text-xs.
- SPACING RHYTHM: Use consistent spacing multiples (4, 8, 12, 16, 24, 32, 48, 64, 96). Sections should have py-16 to py-24. Cards should have p-6 to p-8. Buttons should have px-6 py-3 minimum for good click targets.
- COLOR HARMONY: Gradients look best with adjacent hues (blue→indigo, teal→emerald, orange→amber). Dark backgrounds: use gray-900/950 with lighter text. Light backgrounds: use white/gray-50 with dark text. Always ensure sufficient contrast (WCAG AA minimum).
- BUTTONS: Primary CTAs should be prominent — larger padding (px-8 py-4), bold font weight, slight shadow, rounded-lg or rounded-xl. Secondary buttons use outline or ghost styles. Hover states: darken bg by one shade or add shadow-lg.
- IMAGES: Use object-cover for consistent sizing. Add rounded corners (rounded-lg to rounded-2xl). Consider subtle shadow-lg for depth. Aspect ratios: hero images 16:9 or 3:2, profile photos 1:1 rounded-full, service cards 4:3 or 3:2.
- CARDS: Consistent padding (p-6 to p-8), subtle border or shadow, rounded corners (rounded-xl to rounded-2xl). Cards in a grid should all be the same height — use h-full on the card.
- HOVER EFFECTS: Use transition-all duration-300 for smooth animations. Scale up slightly: hover:scale-105. Add shadow: hover:shadow-xl. Darken/lighten: hover:bg-blue-700.
- RESPONSIVE: The HTML may have responsive prefixes. Preserve ALL responsive breakpoint classes. If adding new sizing, consider adding responsive variants (e.g., text-2xl md:text-4xl lg:text-5xl).
- WHITESPACE: When in doubt, add more space between sections, not less. Generous whitespace looks professional. Cramped layouts look amateur.
- NAVBAR: Should have balanced horizontal padding (px-6 to px-8), vertical padding (py-3 to py-5), and consistent spacing between nav items (gap-6 to gap-8).
- HERO SECTIONS: Should be visually dominant — large headline, clear subtext, prominent CTA, sufficient height (min-h-[500px] to min-h-screen).
- FOOTER: Should have adequate padding (py-12 to py-16), clear hierarchy, and lighter/darker treatment than the body.

EXAMPLES:

Instruction: "Make the navbar a little taller"
→ Find the nav/header container, increase py- by ONE step (py-2→py-3, py-3→py-4). Also consider increasing logo/text size proportionally.

Instruction: "Make the title font smaller"
→ Find the h1/h2 element, decrease text-Xxl by one step. Check responsive variants too (md:text-5xl → md:text-4xl).

Instruction: "Change the hero background to dark blue"
→ Find the hero section, change bg-/gradient classes to blue variants (bg-blue-900, from-blue-900 to-blue-800). Ensure text contrast.

Instruction: "Swap the first two service images"
→ Two changes: swap just the src="..." values between the two <img> tags.

Instruction: "Make CTA buttons bigger and bolder"
→ Find button/a elements acting as CTAs, increase px-/py- padding one step, change font weight to font-bold, optionally increase text size.

Instruction: "Add more spacing between sections"
→ Find <section> or major container divs, increase py- values by 1-2 steps. Increase gap- if sections are in a flex/grid.

Instruction: "Make the footer darker"
→ Find the footer element, change bg class to a darker shade (gray-800→gray-900, gray-900→gray-950, or black).

Instruction: "Center the text in the hero"
→ Add text-center to the hero text container, add mx-auto if needed for width-constrained elements.

Instruction: "Make the service cards have rounded corners"
→ Find service card containers, add/increase rounded- class (rounded-lg → rounded-xl → rounded-2xl).

Instruction: "Make the phone number clickable"
→ Wrap the phone number text in an <a href="tel:+1XXXXXXXXXX"> tag.

The site belongs to: ${companyName}`
}

// ─── Fuzzy Matching Strategies ────────────────────────────────────

/**
 * Strategy 2: Flexible whitespace matching.
 * Builds a regex where all whitespace in the search becomes \s+
 */
function fuzzyReplace(html: string, search: string, replace: string): string | null {
  const parts = search.split(/(\s+)/)
  const escaped = parts
    .map((part, i) => {
      if (i % 2 === 1) return '\\s+' // whitespace → flexible
      return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    })
    .join('')

  try {
    const regex = new RegExp(escaped)
    if (regex.test(html)) {
      return html.replace(regex, replace)
    }
  } catch {
    // Regex too complex
  }
  return null
}

/**
 * Strategy 3: Normalize both strings by collapsing whitespace + trimming,
 * then find the matching region in the original HTML.
 */
function trimmedLineReplace(html: string, search: string, replace: string): string | null {
  const normalizedSearch = search.replace(/\s+/g, ' ').trim()
  if (normalizedSearch.length < 10) return null // too short to safely match

  // Build character-position map: normalizedHtml[i] came from html[posMap[i]]
  const posMap: number[] = []
  let normalizedHtml = ''
  let inWhitespace = false
  for (let i = 0; i < html.length; i++) {
    const c = html[i]
    if (/\s/.test(c)) {
      if (!inWhitespace) {
        normalizedHtml += ' '
        posMap.push(i)
        inWhitespace = true
      }
    } else {
      normalizedHtml += c
      posMap.push(i)
      inWhitespace = false
    }
  }

  const idx = normalizedHtml.indexOf(normalizedSearch)
  if (idx === -1) return null

  const startPos = posMap[idx]
  const endIdx = idx + normalizedSearch.length - 1
  const endPos = posMap[endIdx]
  if (startPos === undefined || endPos === undefined) return null

  // Find the actual end: include remaining characters of the last matched token
  let actualEnd = endPos + 1
  if (!/\s/.test(normalizedSearch[normalizedSearch.length - 1])) {
    while (actualEnd < html.length && !/\s/.test(html[actualEnd])) {
      actualEnd++
    }
  }

  const originalSubstring = html.slice(startPos, actualEnd)
  // Verify it normalizes to our search
  if (originalSubstring.replace(/\s+/g, ' ').trim() === normalizedSearch) {
    return html.slice(0, startPos) + replace + html.slice(actualEnd)
  }

  // Fallback: simpler slice
  const simpleEnd = posMap[endIdx + 1] ?? endPos + 1
  const simpleSubstring = html.slice(startPos, simpleEnd)
  if (simpleSubstring.replace(/\s+/g, ' ').trim() === normalizedSearch) {
    return html.slice(0, startPos) + replace + html.slice(simpleEnd)
  }

  return null
}

// ─── Core Edit Function ───────────────────────────────────────────

/**
 * Apply an AI-powered edit to HTML using Claude Opus.
 * Returns { html, summary } on success or { error } on failure.
 */
export async function applyAiEdit(params: {
  html: string
  instruction: string
  companyName: string
  previousEdits?: PreviousEdit[]
}): Promise<{ html: string; summary: string } | { error: string }> {
  const { html, instruction, companyName, previousEdits } = params

  if (!html || !instruction?.trim()) {
    return { error: 'HTML and instruction required' }
  }

  const systemPrompt = buildSiteEditorPrompt(companyName)
  const anthropic = getAnthropicClient()

  // Build multi-turn conversation for context
  const messages: Anthropic.MessageParam[] = []

  // Add previous edits as conversation history (last 10 max)
  const history: PreviousEdit[] = Array.isArray(previousEdits) ? previousEdits.slice(-10) : []
  for (const edit of history) {
    messages.push({ role: 'user', content: `INSTRUCTION: ${edit.instruction}` })
    messages.push({ role: 'assistant', content: JSON.stringify({ changes: [], summary: edit.summary }) })
  }

  // Add current instruction with the HTML
  messages.push({ role: 'user', content: `Here is the current HTML:\n\n${html}\n\nINSTRUCTION: ${instruction}` })

  try {
    // Use streaming to avoid Anthropic timeout
    const stream = anthropic.messages.stream({
      model: AI_MODEL,
      max_tokens: 16000,
      system: systemPrompt,
      messages,
    })

    const response = await stream.finalMessage()

    const rawText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('')

    // Check for truncation
    if (response.stop_reason === 'max_tokens') {
      console.error('[AI Edit] Response truncated (max_tokens)')
      return { error: 'AI response was too long and got cut off. Try a simpler instruction.' }
    }

    // Try to parse as JSON diff
    let modifiedHtml = html
    let summary = 'Changes applied'

    // Clean up potential markdown fences around JSON
    let jsonText = rawText.trim()
    jsonText = jsonText.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()

    try {
      const parsed = JSON.parse(jsonText)

      if (parsed.changes && Array.isArray(parsed.changes)) {
        let appliedCount = 0
        const failedSearches: string[] = []

        for (const change of parsed.changes) {
          if (!change.search || typeof change.search !== 'string') continue
          const replacement = change.replace ?? ''

          // Strategy 1: Exact match
          if (modifiedHtml.includes(change.search)) {
            modifiedHtml = modifiedHtml.replace(change.search, replacement)
            appliedCount++
            continue
          }

          // Strategy 2: Fuzzy whitespace match
          const fuzzyResult = fuzzyReplace(modifiedHtml, change.search, replacement)
          if (fuzzyResult) {
            modifiedHtml = fuzzyResult
            appliedCount++
            continue
          }

          // Strategy 3: Trimmed line match
          const trimmedResult = trimmedLineReplace(modifiedHtml, change.search, replacement)
          if (trimmedResult) {
            modifiedHtml = trimmedResult
            appliedCount++
            continue
          }

          // Strategy 4: Class attribute match
          const classMatch = change.search.match(/class="([^"]+)"/)
          if (classMatch) {
            const oldClasses = classMatch[1]
            const newClassMatch = replacement.match(/class="([^"]+)"/)
            if (newClassMatch && modifiedHtml.includes(`class="${oldClasses}"`)) {
              modifiedHtml = modifiedHtml.replace(
                `class="${oldClasses}"`,
                `class="${newClassMatch[1]}"`,
              )
              appliedCount++
              continue
            }
          }

          failedSearches.push(change.search.slice(0, 100))
        }

        if (appliedCount === 0 && parsed.changes.length > 0) {
          console.error('[AI Edit] No changes could be applied. Failed searches:', failedSearches)
          return { error: `Could not apply changes — the AI's search strings didn't match the HTML. Try rephrasing: "${instruction}"` }
        }

        summary = parsed.summary || `Applied ${appliedCount} change${appliedCount !== 1 ? 's' : ''}`
        if (failedSearches.length > 0) {
          console.warn(`[AI Edit] ${failedSearches.length} changes failed to apply:`, failedSearches)
          if (appliedCount > 0) {
            summary += ` (${failedSearches.length} skipped)`
          }
        }
      } else {
        return { error: 'AI returned an unexpected response format. Try again.' }
      }
    } catch {
      // JSON parse failed — check if Claude returned full HTML instead
      console.warn('[AI Edit] JSON parse failed, checking for full HTML response')

      if (rawText.includes('<html') || rawText.includes('<!DOCTYPE')) {
        let fullHtml = rawText
          .replace(/^```html\s*/i, '')
          .replace(/```\s*$/, '')
          .trim()

        const summaryMatch = fullHtml.match(/<!-- AI_SUMMARY: (.+?) -->/)
        summary = summaryMatch ? summaryMatch[1] : 'Changes applied'

        if (fullHtml.includes('<html') || fullHtml.includes('<!DOCTYPE')) {
          modifiedHtml = fullHtml
        } else {
          return { error: 'AI returned invalid response. Try rephrasing your instruction.' }
        }
      } else {
        console.error('[AI Edit] Could not parse response:', rawText.slice(0, 500))
        return { error: 'AI returned an unexpected format. Try a simpler instruction.' }
      }
    }

    // Log API cost
    await prisma.apiCost.create({
      data: {
        service: 'anthropic',
        operation: 'site_editor_ai_edit',
        cost: 0.03,
      },
    }).catch(err => console.error('[AISiteEditor] API cost write failed:', err))

    return { html: modifiedHtml, summary }
  } catch (error) {
    console.error('[AI Edit] Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'

    if (message.includes('timeout') || message.includes('TIMEOUT')) {
      return { error: 'The AI took too long to respond. Try a simpler edit instruction.' }
    }
    if (message.includes('rate_limit') || message.includes('429')) {
      return { error: 'AI rate limit reached. Please wait a moment and try again.' }
    }
    if (message.includes('invalid_api_key') || message.includes('authentication')) {
      return { error: 'AI service authentication error. Contact admin.' }
    }

    return { error: `AI edit failed: ${message}` }
  }
}
