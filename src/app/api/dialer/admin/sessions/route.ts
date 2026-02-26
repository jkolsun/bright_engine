export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'

const CONVERSATION_DISPOSITIONS = [
  'NOT_INTERESTED', 'CALLBACK', 'WANTS_TO_MOVE_FORWARD',
  'INTERESTED_VERBAL', 'WANTS_CHANGES', 'WILL_LOOK_LATER', 'DNC',
]

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const url = new URL(request.url)
    const repId = url.searchParams.get('repId') || undefined
    const from = url.searchParams.get('from') || undefined
    const to = url.searchParams.get('to') || undefined
    const search = url.searchParams.get('search') || undefined
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)))
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = { isActive: false }
    if (repId) where.repId = repId
    if (from || to) {
      where.startedAt = {}
      if (from) where.startedAt.gte = new Date(from)
      if (to) where.startedAt.lte = new Date(to + 'T23:59:59.999Z')
    }
    if (search) {
      where.name = { contains: search, mode: 'insensitive' }
    }

    const [sessions, total] = await Promise.all([
      prisma.dialerSessionNew.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        skip,
        take: limit,
        include: {
          rep: { select: { id: true, name: true } },
          _count: { select: { calls: true } },
        },
      }),
      prisma.dialerSessionNew.count({ where }),
    ])

    const result = sessions.map(s => {
      const conversations = s.notInterestedCount + s.callbackCount +
        s.wantsToMoveForwardCount + s.interestedVerbalCount +
        s.wantsChangesCount + s.willLookLaterCount + s.dncCount

      const durationMs = s.endedAt && s.startedAt
        ? new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()
        : 0
      const durationMinutes = Math.round(durationMs / 60000)

      const freshLeadsRemaining = s.freshLeadsAtStart != null && s.uniqueFreshCalled != null
        ? Math.max(0, s.freshLeadsAtStart - s.uniqueFreshCalled)
        : null

      return {
        id: s.id,
        name: s.name,
        repId: s.repId,
        repName: s.rep?.name || 'Unknown',
        startedAt: s.startedAt.toISOString(),
        endedAt: s.endedAt?.toISOString() || null,
        duration: durationMinutes,
        totalCalls: s.totalCalls,
        connectedCalls: s.connectedCalls,
        voicemails: s.voicemails,
        noAnswers: s.noAnswers,
        previewsSent: s.previewsSent,
        interestedCount: s.interestedCount,
        notInterestedCount: s.notInterestedCount,
        wantsToMoveForwardCount: s.wantsToMoveForwardCount,
        callbackCount: s.callbackCount,
        interestedVerbalCount: s.interestedVerbalCount,
        wantsChangesCount: s.wantsChangesCount,
        willLookLaterCount: s.willLookLaterCount,
        dncCount: s.dncCount,
        wrongNumberCount: s.wrongNumberCount,
        disconnectedCount: s.disconnectedCount,
        avgCallDuration: s.avgCallDuration,
        previewsOpened: s.previewsOpened,
        ctaClicks: s.ctaClicks,
        conversations,
        freshLeadsAtStart: s.freshLeadsAtStart,
        uniqueFreshCalled: s.uniqueFreshCalled,
        freshLeadsRemaining,
        aiRecommendation: s.aiRecommendation,
        autoDialEnabled: s.autoDialEnabled,
      }
    })

    return NextResponse.json({
      sessions: result,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('[Session History API] GET error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
