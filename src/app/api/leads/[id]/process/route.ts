import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { enrichLead } from '@/lib/serpapi'
import { generatePreview } from '@/lib/preview-generator'
import { fetchSerperResearch } from '@/lib/serper'
import { generatePersonalization } from '@/lib/personalization'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * POST /api/leads/[id]/process
 * Process a single lead through selected pipeline steps
 * Body: { enrichment?: boolean, preview?: boolean, personalization?: boolean }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const { id } = await params
    const { enrichment = true, preview = true, personalization = true } = await request.json()

    const lead = await prisma.lead.findUnique({ where: { id } })
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    const results: {
      enrichment?: { success: boolean; error?: string }
      preview?: { success: boolean; error?: string }
      personalization?: { success: boolean; firstLine?: string; error?: string }
    } = {}

    // 1. Enrichment via SerpAPI
    if (enrichment) {
      try {
        await enrichLead(id)
        results.enrichment = { success: true }
      } catch (err) {
        results.enrichment = { success: false, error: err instanceof Error ? err.message : String(err) }
      }
    }

    // 2. Generate preview URL
    if (preview) {
      try {
        await generatePreview({ leadId: id })
        results.preview = { success: true }
      } catch (err) {
        results.preview = { success: false, error: err instanceof Error ? err.message : String(err) }
      }
    }

    // 3. Personalization (Serper research + AI)
    if (personalization) {
      try {
        try { await fetchSerperResearch(id) } catch { /* non-fatal */ }
        const personResult = await generatePersonalization(id)
        results.personalization = {
          success: !!personResult,
          firstLine: personResult?.firstLine,
        }
      } catch (err) {
        results.personalization = { success: false, error: err instanceof Error ? err.message : String(err) }
      }
    }

    return NextResponse.json({
      success: true,
      leadId: id,
      results,
    })
  } catch (error) {
    console.error('Process lead error:', error)
    return NextResponse.json(
      { error: 'Processing failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}