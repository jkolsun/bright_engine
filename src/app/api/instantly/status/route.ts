import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * GET /api/instantly/status
 * Returns current Instantly pipeline status and today's capacity calculation
 * Admin-only access
 */
export async function GET(request: NextRequest) {
  try {
    // Admin-only access check
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    // Get latest sync log
    const latestSync = await prisma.instantlySyncLog.findFirst({
      orderBy: { timestamp: 'desc' },
      take: 1,
    })

    // Get latest drip logs (one per campaign)
    const latestDrips = await prisma.instantlyDripLog.findMany({
      where: { date: { gte: new Date(new Date().toDateString()) } },
    })

    // Get queue status
    const queueStats = await prisma.lead.groupBy({
      by: ['instantlyCampaignId'],
      where: { instantlyStatus: 'QUEUED' },
      _count: true,
    })

    // Get active sequence leads
    const activeSequence = await prisma.lead.count({
      where: { instantlyStatus: 'IN_SEQUENCE' },
    })

    // Get completed leads
    const completed = await prisma.lead.count({
      where: { instantlyStatus: 'COMPLETED' },
    })

    // Get replied leads
    const replied = await prisma.lead.count({
      where: { instantlyStatus: 'REPLIED' },
    })

    // Get bounced leads
    const bounced = await prisma.lead.count({
      where: { instantlyStatus: 'BOUNCED' },
    })

    // Get unsubscribed leads
    const unsubscribed = await prisma.lead.count({
      where: { instantlyStatus: 'UNSUBSCRIBED' },
    })

    return NextResponse.json({
      latestSync,
      latestDrips,
      queue: {
        total_queued: queueStats.reduce((sum, q) => sum + q._count, 0),
        by_campaign: queueStats,
      },
      active: {
        in_sequence: activeSequence,
        completed,
        replied,
        bounced,
        unsubscribed,
      },
      timestamp: new Date(),
    })
  } catch (error) {
    console.error('Status endpoint error:', error)
    return NextResponse.json(
      { error: 'Failed to get status', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
