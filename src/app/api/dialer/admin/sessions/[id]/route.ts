export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id } = params

    const dialerSession = await prisma.dialerSessionNew.findUnique({
      where: { id },
      include: { rep: { select: { id: true, name: true } } },
    })

    if (!dialerSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const calls = await prisma.dialerCall.findMany({
      where: { sessionId: id },
      select: {
        id: true,
        startedAt: true,
        connectedAt: true,
        endedAt: true,
        duration: true,
        dispositionResult: true,
        previewSentDuringCall: true,
        vmDropped: true,
        notes: true,
        lead: {
          select: {
            id: true,
            companyName: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
      orderBy: { startedAt: 'desc' },
    })

    const conversations = dialerSession.notInterestedCount + dialerSession.callbackCount +
      dialerSession.wantsToMoveForwardCount + dialerSession.interestedVerbalCount +
      dialerSession.wantsChangesCount + dialerSession.willLookLaterCount + dialerSession.dncCount

    const durationMs = dialerSession.endedAt && dialerSession.startedAt
      ? new Date(dialerSession.endedAt).getTime() - new Date(dialerSession.startedAt).getTime()
      : 0

    const freshLeadsRemaining = dialerSession.freshLeadsAtStart != null && dialerSession.uniqueFreshCalled != null
      ? Math.max(0, dialerSession.freshLeadsAtStart - dialerSession.uniqueFreshCalled)
      : null

    return NextResponse.json({
      id: dialerSession.id,
      name: dialerSession.name,
      repId: dialerSession.repId,
      repName: dialerSession.rep?.name || 'Unknown',
      startedAt: dialerSession.startedAt.toISOString(),
      endedAt: dialerSession.endedAt?.toISOString() || null,
      duration: Math.round(durationMs / 60000),
      totalCalls: dialerSession.totalCalls,
      connectedCalls: dialerSession.connectedCalls,
      voicemails: dialerSession.voicemails,
      noAnswers: dialerSession.noAnswers,
      previewsSent: dialerSession.previewsSent,
      interestedCount: dialerSession.interestedCount,
      notInterestedCount: dialerSession.notInterestedCount,
      wantsToMoveForwardCount: dialerSession.wantsToMoveForwardCount,
      callbackCount: dialerSession.callbackCount,
      interestedVerbalCount: dialerSession.interestedVerbalCount,
      wantsChangesCount: dialerSession.wantsChangesCount,
      willLookLaterCount: dialerSession.willLookLaterCount,
      dncCount: dialerSession.dncCount,
      wrongNumberCount: dialerSession.wrongNumberCount,
      disconnectedCount: dialerSession.disconnectedCount,
      avgCallDuration: dialerSession.avgCallDuration,
      previewsOpened: dialerSession.previewsOpened,
      ctaClicks: dialerSession.ctaClicks,
      conversations,
      freshLeadsAtStart: dialerSession.freshLeadsAtStart,
      uniqueFreshCalled: dialerSession.uniqueFreshCalled,
      freshLeadsRemaining,
      aiRecommendation: dialerSession.aiRecommendation,
      autoDialEnabled: dialerSession.autoDialEnabled,
      calls,
    })
  } catch (error) {
    console.error('[Session Detail API] GET error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id } = params
    const body = await request.json()
    const { name, generateAI } = body

    const dialerSession = await prisma.dialerSessionNew.findUnique({
      where: { id },
    })

    if (!dialerSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Update name if provided
    const updateData: any = {}
    if (name !== undefined) {
      updateData.name = name || null
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.dialerSessionNew.update({
        where: { id },
        data: updateData,
      })
    }

    // Queue AI analysis if requested
    if (generateAI && !dialerSession.aiRecommendation && !dialerSession.isActive) {
      try {
        const { addSessionAnalysisJob } = await import('@/worker/queue')
        await addSessionAnalysisJob({ sessionId: id })
      } catch (err) {
        console.warn('[Session PATCH] Failed to queue AI analysis:', err)
      }
    }

    const updated = await prisma.dialerSessionNew.findUnique({
      where: { id },
      include: { rep: { select: { id: true, name: true } } },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[Session Detail API] PATCH error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
