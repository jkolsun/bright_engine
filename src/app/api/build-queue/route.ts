import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

const SITE_BUILD_STEPS = ['QA_REVIEW', 'EDITING', 'QA_APPROVED', 'CLIENT_REVIEW', 'CLIENT_APPROVED', 'LAUNCHING', 'LIVE'] as const
const WORKER_STEPS = ['ENRICHMENT', 'PREVIEW', 'PERSONALIZATION', 'SCRIPTS', 'DISTRIBUTION'] as const

/**
 * GET /api/build-queue - Get site build pipeline + worker pipeline data
 * ?view=worker — returns worker pipeline view (original)
 * default — returns site build pipeline view
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const view = searchParams.get('view')

    if (view === 'worker') {
      return getWorkerPipelineView()
    }

    return getSiteBuildPipelineView()
  } catch (error) {
    console.error('Error fetching build queue:', error)
    return NextResponse.json({ error: 'Failed to fetch build queue' }, { status: 500 })
  }
}

/**
 * Site Build Pipeline — the main Build Queue view
 * Shows leads in QA_REVIEW → EDITING → QA_APPROVED → CLIENT_REVIEW → CLIENT_APPROVED → LAUNCHING → LIVE
 */
async function getSiteBuildPipelineView() {
  const [siteBuildLeads, stageCounts] = await Promise.all([
    prisma.lead.findMany({
      where: {
        buildStep: { in: [...SITE_BUILD_STEPS] },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        companyName: true,
        industry: true,
        city: true,
        state: true,
        logo: true,
        status: true,
        buildStep: true,
        buildReadinessScore: true,
        buildNotes: true,
        buildStartedAt: true,
        previewId: true,
        previewUrl: true,
        siteHtml: true,
        updatedAt: true,
        createdAt: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    }),
    // Get counts per stage
    prisma.$queryRaw<Array<{ build_step: string; count: bigint }>>`
      SELECT build_step, COUNT(*) as count
      FROM leads
      WHERE build_step IN ('QA_REVIEW', 'EDITING', 'QA_APPROVED', 'CLIENT_REVIEW', 'CLIENT_APPROVED', 'LAUNCHING', 'LIVE')
      GROUP BY build_step
    `,
  ])

  // Convert raw counts to object
  const counts: Record<string, number> = {}
  for (const row of stageCounts) {
    counts[row.build_step] = Number(row.count)
  }

  // Badge count = items needing attention (QA_REVIEW + EDITING)
  const badgeCount = (counts.QA_REVIEW || 0) + (counts.EDITING || 0)

  return NextResponse.json({
    leads: siteBuildLeads,
    counts,
    badgeCount,
    total: siteBuildLeads.length,
  })
}

/**
 * Worker Pipeline — the original build queue view
 * Shows leads being processed by the 5-stage BullMQ worker pipeline
 */
async function getWorkerPipelineView() {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [activeBuilds, failedBuilds, completedToday, allCompletedToday] = await Promise.all([
    prisma.lead.findMany({
      where: {
        buildStep: { in: [...WORKER_STEPS] },
        buildError: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        companyName: true,
        buildStep: true,
        buildStartedAt: true,
        buildEnrichmentMs: true,
        buildPreviewMs: true,
        buildPersonalizationMs: true,
        buildScriptsMs: true,
        buildDistributionMs: true,
        createdAt: true,
      },
      orderBy: { buildStartedAt: 'desc' },
      take: 50,
    }),
    prisma.lead.findMany({
      where: {
        buildError: { not: null },
        buildCompletedAt: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        companyName: true,
        buildStep: true,
        buildStartedAt: true,
        buildError: true,
        createdAt: true,
      },
      orderBy: { buildStartedAt: 'desc' },
      take: 20,
    }),
    prisma.lead.count({
      where: { buildCompletedAt: { gte: todayStart } },
    }),
    prisma.lead.findMany({
      where: { buildCompletedAt: { gte: todayStart } },
      select: {
        buildStartedAt: true,
        buildCompletedAt: true,
      },
    }),
  ])

  let avgBuildTimeMs = 0
  if (allCompletedToday.length > 0) {
    const totalMs = allCompletedToday.reduce((sum, b) => {
      if (b.buildStartedAt && b.buildCompletedAt) {
        return sum + (b.buildCompletedAt.getTime() - b.buildStartedAt.getTime())
      }
      return sum
    }, 0)
    avgBuildTimeMs = Math.round(totalMs / allCompletedToday.length)
  }

  return NextResponse.json({
    activeBuilds,
    failedBuilds,
    summary: {
      inProgress: activeBuilds.length,
      failed: failedBuilds.length,
      completedToday,
      avgBuildTimeMs,
    },
  })
}
