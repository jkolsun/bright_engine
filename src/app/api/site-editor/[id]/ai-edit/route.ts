import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'
import { applyAiEdit } from '@/lib/ai-site-editor'

export const dynamic = 'force-dynamic'
// Allow up to 5 minutes for AI processing
export const maxDuration = 300

/**
 * POST /api/site-editor/[id]/ai-edit
 * Uses a diff-based approach: Claude returns search/replace operations
 * instead of the entire HTML doc, making edits fast and reliable.
 *
 * Core AI logic lives in @/lib/ai-site-editor (shared with SMS edit flow).
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
    const { html, instruction, previousEdits } = await request.json()

    if (!html || !instruction?.trim()) {
      return NextResponse.json({ error: 'HTML and instruction required' }, { status: 400 })
    }

    const lead = await prisma.lead.findUnique({
      where: { id },
      select: { id: true, companyName: true, siteEditVersion: true },
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    const result = await applyAiEdit({
      html,
      instruction,
      companyName: lead.companyName,
      previousEdits,
    })

    if ('error' in result) {
      // Map error messages to appropriate HTTP status codes
      const msg = result.error
      let status = 500
      if (msg.includes('too long')) status = 504
      if (msg.includes('rate limit')) status = 429
      return NextResponse.json({ error: msg }, { status })
    }

    return NextResponse.json({ html: result.html, summary: result.summary, version: lead.siteEditVersion ?? 0 })
  } catch (error) {
    console.error('[AI Edit] Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `AI edit failed: ${message}` }, { status: 500 })
  }
}
