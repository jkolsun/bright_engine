import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

const AI_MODEL = 'claude-sonnet-4-6'

let _anthropicClient: Anthropic | null = null
function getAnthropicClient(): Anthropic {
  if (!_anthropicClient) {
    _anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return _anthropicClient
}

/**
 * POST /api/site-editor/[id]/ai-edit
 * Sends current HTML + plain English instruction to Claude,
 * returns the complete modified HTML document.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const { id } = await context.params
    const { html, instruction } = await request.json()

    if (!html || !instruction?.trim()) {
      return NextResponse.json({ error: 'HTML and instruction required' }, { status: 400 })
    }

    const lead = await prisma.lead.findUnique({
      where: { id },
      select: { id: true, companyName: true },
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    const systemPrompt = `You are an expert HTML/CSS website editor. You receive a complete HTML document and a modification instruction. Apply the requested changes and return the COMPLETE modified HTML document.

Rules:
- Return ONLY the complete HTML document (from <!DOCTYPE html> or <html> to </html>)
- Do NOT include markdown code fences or any text before/after the HTML
- Preserve the overall structure and styling unless specifically asked to change it
- The HTML uses Tailwind CSS classes loaded via CDN — use Tailwind classes for any style changes
- If asked to rearrange sections, move the entire <section> or <div> block
- If asked to change colors, update the relevant Tailwind color classes
- If asked to change text content, update the text while preserving HTML structure
- Do NOT remove the Tailwind CDN script tag
- Do NOT remove Google Fonts link tags
- Keep all images, logos, and external resource URLs intact
- After the closing </html> tag, on a new line add: <!-- AI_SUMMARY: brief description of changes -->

The site belongs to: ${lead.companyName}`

    const anthropic = getAnthropicClient()
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 16000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Here is the current HTML:\n\n${html}\n\nINSTRUCTION: ${instruction}\n\nReturn the complete modified HTML.`,
        },
      ],
    })

    const rawText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('')

    // Clean up any markdown fences
    let modifiedHtml = rawText
      .replace(/^```html\s*/i, '')
      .replace(/```\s*$/, '')
      .trim()

    // Extract summary comment
    const summaryMatch = modifiedHtml.match(/<!-- AI_SUMMARY: (.+?) -->/)
    const summary = summaryMatch ? summaryMatch[1] : 'Changes applied'

    // Validate it looks like HTML
    if (!modifiedHtml.includes('<html') && !modifiedHtml.includes('<!DOCTYPE')) {
      return NextResponse.json(
        { error: 'AI returned invalid HTML' },
        { status: 500 }
      )
    }

    // Log API cost
    await prisma.apiCost.create({
      data: {
        service: 'anthropic',
        operation: 'site_editor_ai_edit',
        cost: 0.05,
      },
    }).catch(() => {})

    return NextResponse.json({ html: modifiedHtml, summary })
  } catch (error) {
    console.error('[AI Edit] Error:', error)
    return NextResponse.json({ error: 'AI edit failed' }, { status: 500 })
  }
}
