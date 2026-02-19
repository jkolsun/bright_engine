import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { routeMessage } from '@/lib/channel-router'

export const dynamic = 'force-dynamic'

// GET /api/channel-router - Get recent routing decisions + stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const clientId = searchParams.get('clientId')

    const where = clientId ? { clientId } : {}

    const [decisions, stats] = await Promise.all([
      prisma.channelDecision.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.channelDecision.groupBy({
        by: ['chosenChannel'],
        _count: { id: true },
        where: {
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
    ])

    const smsCount = stats.find(s => s.chosenChannel === 'SMS')?._count.id || 0
    const emailCount = stats.find(s => s.chosenChannel === 'EMAIL')?._count.id || 0

    // Rule breakdown
    const ruleBreakdown = await prisma.channelDecision.groupBy({
      by: ['ruleApplied'],
      _count: { id: true },
      where: {
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        ruleApplied: { not: null },
      },
    })

    return NextResponse.json({
      decisions,
      stats: {
        smsCount,
        emailCount,
        total: smsCount + emailCount,
        smsPercent: smsCount + emailCount > 0 ? Math.round((smsCount / (smsCount + emailCount)) * 100) : 0,
        ruleBreakdown: ruleBreakdown.map(r => ({
          rule: r.ruleApplied,
          count: r._count.id,
        })),
      },
    })
  } catch (error) {
    console.error('Channel router stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}

// POST /api/channel-router - Test routing for a client/lead (dry run)
export async function POST(request: NextRequest) {
  try {
    const { clientId, leadId, trigger, messageContent, urgency } = await request.json()

    if (!trigger || !messageContent) {
      return NextResponse.json({ error: 'Missing trigger or messageContent' }, { status: 400 })
    }

    const decision = await routeMessage({
      clientId,
      leadId,
      trigger,
      messageContent,
      urgency,
    })

    return NextResponse.json({ decision })
  } catch (error) {
    console.error('Channel router test error:', error)
    return NextResponse.json({ error: 'Routing failed' }, { status: 500 })
  }
}
