import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

const EDIT_MODEL = 'claude-sonnet-4-6'

let _anthropicClient: Anthropic | null = null
function getAnthropicClient(): Anthropic {
  if (!_anthropicClient) {
    _anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return _anthropicClient
}

/**
 * POST /api/build-queue/[id]/edit
 * Jared types plain English instructions, Claude applies changes to site content.
 * Body: { instructions: "Change the headline to ..." }
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
    const { instructions } = await request.json()

    if (!instructions?.trim()) {
      return NextResponse.json({ error: 'Instructions required' }, { status: 400 })
    }

    const lead = await prisma.lead.findUnique({
      where: { id },
      select: {
        id: true,
        companyName: true,
        industry: true,
        enrichedServices: true,
        enrichedPhotos: true,
        photos: true,
        logo: true,
        personalization: true,
        services: true,
        buildStep: true,
      },
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Parse current personalization / websiteCopy
    let personalization: Record<string, unknown> = {}
    try {
      if (typeof lead.personalization === 'string') {
        personalization = JSON.parse(lead.personalization)
      }
    } catch { /* empty */ }

    const websiteCopy = (personalization.websiteCopy || {}) as Record<string, unknown>
    const services = Array.isArray(lead.enrichedServices) ? lead.enrichedServices : (Array.isArray(lead.services) ? lead.services : [])
    const photos = Array.isArray(lead.enrichedPhotos) ? lead.enrichedPhotos : (Array.isArray(lead.photos) ? lead.photos : [])

    // Build the edit prompt for Claude
    const systemPrompt = `You are a website content editor. You receive the current website content as JSON and plain English instructions for what to change. Apply the changes precisely and return ONLY valid JSON.

Rules:
- Only change what the instructions ask for. Leave everything else exactly as-is.
- If the instruction asks to remove a service, set _removeServices with the names.
- If the instruction asks to reorder photos, set _reorderPhotos with the new index order.
- If the instruction asks to set a hero photo, set _setHeroPhoto with the index.
- Return a JSON object with ONLY the changed fields from websiteCopy, plus any special commands.
- Include a _summary array of human-readable strings describing each change made.

Current content structure:
- heroHeadline: string
- heroSubheadline: string
- aboutParagraph1: string
- aboutParagraph2: string
- valueProps: [{title, description}, ...]
- closingHeadline: string
- closingBody: string
- serviceDescriptions: {serviceName: description, ...}

Special commands (include only if needed):
- _removeServices: string[] — services to remove
- _addServices: string[] — services to add
- _reorderPhotos: number[] — new photo order by index
- _setHeroPhoto: number — index of photo to use as hero`

    const userMessage = `CURRENT WEBSITE COPY:
${JSON.stringify(websiteCopy, null, 2)}

CURRENT SERVICES: ${JSON.stringify(services)}

CURRENT PHOTOS (${photos.length} total): ${photos.map((p: unknown, i: number) => `[${i}] ${String(p)}`).join(', ')}

INSTRUCTIONS: ${instructions}

Return ONLY the JSON with changed fields and _summary.`

    const anthropic = getAnthropicClient()
    const response = await anthropic.messages.create({
      model: EDIT_MODEL,
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    const rawText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('')

    // Parse Claude's response
    let changes: Record<string, unknown>
    try {
      const cleaned = rawText.replace(/```json\s?/g, '').replace(/```/g, '').trim()
      changes = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: 'AI returned invalid JSON', raw: rawText }, { status: 500 })
    }

    const summary = (changes._summary as string[]) || ['Changes applied']
    delete changes._summary

    // Handle special commands
    let updatedServices = [...services] as string[]
    let updatedPhotos = [...photos] as string[]

    if (Array.isArray(changes._removeServices)) {
      const toRemove = new Set((changes._removeServices as string[]).map(s => s.toLowerCase()))
      updatedServices = updatedServices.filter(s => !toRemove.has(String(s).toLowerCase()))
      delete changes._removeServices
    }

    if (Array.isArray(changes._addServices)) {
      updatedServices.push(...(changes._addServices as string[]))
      delete changes._addServices
    }

    if (Array.isArray(changes._reorderPhotos)) {
      const order = changes._reorderPhotos as number[]
      updatedPhotos = order.map(i => photos[i] || photos[0]) as string[]
      delete changes._reorderPhotos
    }

    if (typeof changes._setHeroPhoto === 'number') {
      const heroIdx = changes._setHeroPhoto as number
      if (heroIdx >= 0 && heroIdx < updatedPhotos.length) {
        const hero = updatedPhotos.splice(heroIdx, 1)[0]
        updatedPhotos.unshift(hero)
      }
      delete changes._setHeroPhoto
    }

    // Merge websiteCopy changes
    const updatedWebsiteCopy = { ...websiteCopy, ...changes }
    const updatedPersonalization = { ...personalization, websiteCopy: updatedWebsiteCopy }

    // Save to database
    await prisma.lead.update({
      where: { id },
      data: {
        personalization: JSON.stringify(updatedPersonalization),
        enrichedServices: updatedServices,
        enrichedPhotos: updatedPhotos,
        buildStep: lead.buildStep === 'QA_REVIEW' ? 'EDITING' : lead.buildStep,
      },
    })

    // Log API cost
    await prisma.apiCost.create({
      data: {
        service: 'anthropic',
        operation: 'build_queue_edit',
        cost: 0.02,
      },
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      summary,
      changes: Object.keys(changes),
      servicesChanged: updatedServices.length !== services.length,
      photosChanged: updatedPhotos.length !== photos.length || JSON.stringify(updatedPhotos) !== JSON.stringify(photos),
    })
  } catch (error) {
    console.error('Error applying edit:', error)
    return NextResponse.json({ error: 'Failed to apply edit' }, { status: 500 })
  }
}
