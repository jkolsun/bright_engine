import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * GET /api/build-queue - Get all active builds and summary stats
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const [activeBuilds, failedBuilds, completedToday, allCompletedToday] = await Promise.all([
      // Currently in-progress builds
      prisma.lead.findMany({
        where: {
          buildStep: { not: null },
          buildCompletedAt: null,
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
      // Failed builds
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
      // Completed today count
      prisma.lead.count({
        where: {
          buildCompletedAt: { gte: todayStart },
        },
      }),
      // All completed today with timing for avg calculation
      prisma.lead.findMany({
        where: {
          buildCompletedAt: { gte: todayStart },
        },
        select: {
          buildStartedAt: true,
          buildCompletedAt: true,
          buildEnrichmentMs: true,
          buildPreviewMs: true,
          buildPersonalizationMs: true,
          buildScriptsMs: true,
          buildDistributionMs: true,
        },
      }),
    ])

    // Calculate average build time
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
  } catch (error) {
    console.error('Error fetching build queue:', error)
    return NextResponse.json({ error: 'Failed to fetch build queue' }, { status: 500 })
  }
}
