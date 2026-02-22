import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * POST /api/build-queue/[id]/rebuild
 * Re-triggers the build pipeline (ENRICHMENT → PREVIEW → PERSONALIZATION)
 * for a lead that's stuck or needs to be rebuilt.
 * Also clears any cached siteHtml so a fresh snapshot can be generated.
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

    const body = await request.json().catch(() => ({}))

    const lead = await prisma.lead.findUnique({
      where: { id },
      select: {
        id: true,
        companyName: true,
        city: true,
        state: true,
        buildStep: true,
        buildReadinessScore: true,
        siteHtml: true,
      },
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Safeguard: if siteHtml has been manually edited, require explicit confirmation
    if (lead.siteHtml && lead.siteHtml.length > 100 && !body.confirmOverwrite) {
      return NextResponse.json({
        error: 'This lead has edited site HTML. Rebuilding will ERASE all manual edits. Pass confirmOverwrite: true to proceed.',
        hasEdits: true,
        htmlSize: lead.siteHtml.length,
      }, { status: 409 })
    }

    // Clear cached siteHtml and reset build timing
    await prisma.lead.update({
      where: { id },
      data: {
        siteHtml: null,
        buildError: null,
        buildEnrichmentMs: null,
        buildPreviewMs: null,
        buildPersonalizationMs: null,
        buildScriptsMs: null,
        buildDistributionMs: null,
        buildCompletedAt: null,
        buildStartedAt: new Date(),
      },
    })

    // Trigger the enrichment pipeline — it chains: ENRICHMENT → PREVIEW → PERSONALIZATION
    const { addEnrichmentJob } = await import('@/worker/queue')
    const job = await addEnrichmentJob({
      leadId: id,
      companyName: lead.companyName || 'Unknown',
      city: lead.city || undefined,
      state: lead.state || undefined,
    })

    return NextResponse.json({
      success: true,
      jobId: job?.id || null,
      message: `Rebuild started for ${lead.companyName}. Pipeline: Enrichment → Preview → Personalization.`,
    })
  } catch (error) {
    console.error('Error triggering rebuild:', error)
    return NextResponse.json({ error: 'Failed to trigger rebuild' }, { status: 500 })
  }
}
