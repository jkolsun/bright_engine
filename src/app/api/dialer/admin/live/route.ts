export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'
import { getConnectionStats } from '@/lib/dialer-events'

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const CONVERSATION_DISPOSITIONS = [
      'WANTS_TO_MOVE_FORWARD', 'NOT_INTERESTED', 'CALLBACK',
      'INTERESTED_VERBAL', 'WANTS_CHANGES', 'WILL_LOOK_LATER', 'DNC',
    ]

    // Batch all queries (5 queries instead of N per rep)
    const [allReps, activeSessions, activeCalls, todayDials, todayDispositions] = await Promise.all([
      // 1. All active reps
      prisma.user.findMany({
        where: { role: 'REP', status: 'ACTIVE' },
        select: { id: true, name: true, email: true },
        orderBy: { name: 'asc' },
      }),

      // 2. Active dialer sessions
      prisma.dialerSessionNew.findMany({
        where: { isActive: true },
        select: {
          id: true,
          repId: true,
          totalCalls: true,
          connectedCalls: true,
          previewsSent: true,
          interestedCount: true,
        },
      }),

      // 3. Currently active calls (to determine on_call/dialing status + current lead)
      prisma.dialerCall.findMany({
        where: {
          status: { in: ['INITIATED', 'RINGING', 'CONNECTED'] },
        },
        select: {
          repId: true,
          status: true,
          connectedAt: true,
          lead: { select: { firstName: true, lastName: true, companyName: true } },
        },
        orderBy: { startedAt: 'desc' },
      }),

      // 4. Today's total dials per rep
      prisma.dialerCall.groupBy({
        by: ['repId'],
        where: { startedAt: { gte: today } },
        _count: true,
      }),

      // 5. Today's dispositions per rep (Bug D fix: group by disposition, not connectedAt)
      prisma.dialerCall.groupBy({
        by: ['repId', 'dispositionResult'],
        where: { startedAt: { gte: today }, dispositionResult: { not: null } },
        _count: true,
      }),
    ])

    // Build lookup maps
    const sessionByRep = new Map(activeSessions.map(s => [s.repId, s]))
    const dialsByRep = new Map(todayDials.map(d => [d.repId, d._count]))

    // Build per-rep disposition breakdown
    const dispositionsByRep = new Map<string, Map<string, number>>()
    for (const row of todayDispositions) {
      if (!row.dispositionResult) continue
      if (!dispositionsByRep.has(row.repId)) dispositionsByRep.set(row.repId, new Map())
      dispositionsByRep.get(row.repId)!.set(row.dispositionResult, row._count)
    }
    const getDispositionCount = (repId: string, disp: string) =>
      dispositionsByRep.get(repId)?.get(disp) || 0
    const getConversationCount = (repId: string) =>
      CONVERSATION_DISPOSITIONS.reduce((sum, d) => sum + getDispositionCount(repId, d), 0)

    // Group active calls by rep (take most recent)
    const activeCallByRep = new Map<string, typeof activeCalls[0]>()
    for (const call of activeCalls) {
      if (!activeCallByRep.has(call.repId)) {
        activeCallByRep.set(call.repId, call)
      }
    }

    const connectionStats = getConnectionStats()
    const connectedRepSet = new Set(connectionStats.connectedRepIds)

    // Build enriched rep list
    const reps = allReps.map(rep => {
      const repSession = sessionByRep.get(rep.id)
      const activeCall = activeCallByRep.get(rep.id)
      const isSSEConnected = connectedRepSet.has(rep.id)

      let status: 'on_call' | 'dialing' | 'idle' | 'offline' = 'offline'
      if (repSession) {
        if (activeCall?.status === 'CONNECTED') status = 'on_call'
        else if (activeCall?.status === 'INITIATED' || activeCall?.status === 'RINGING') status = 'dialing'
        else status = 'idle'
      } else if (isSSEConnected) {
        status = 'idle'
      }

      const callDuration = activeCall?.connectedAt
        ? Math.floor((Date.now() - new Date(activeCall.connectedAt).getTime()) / 1000)
        : 0

      return {
        repId: rep.id,
        repName: rep.name,
        status,
        sessionActive: !!repSession,
        currentLead: activeCall?.lead || null,
        callDuration,
        todayStats: {
          dials: dialsByRep.get(rep.id) || 0,
          conversations: getConversationCount(rep.id),
          wantsToMoveForward: getDispositionCount(rep.id, 'WANTS_TO_MOVE_FORWARD'),
          callback: getDispositionCount(rep.id, 'CALLBACK'),
          interestedVerbal: getDispositionCount(rep.id, 'INTERESTED_VERBAL'),
          wantsChanges: getDispositionCount(rep.id, 'WANTS_CHANGES'),
          willLookLater: getDispositionCount(rep.id, 'WILL_LOOK_LATER'),
          notInterested: getDispositionCount(rep.id, 'NOT_INTERESTED'),
          voicemail: getDispositionCount(rep.id, 'VOICEMAIL'),
          noAnswer: getDispositionCount(rep.id, 'NO_ANSWER'),
          wrongNumber: getDispositionCount(rep.id, 'WRONG_NUMBER'),
          disconnected: getDispositionCount(rep.id, 'DISCONNECTED'),
          dnc: getDispositionCount(rep.id, 'DNC'),
          previewsSent: repSession?.previewsSent || 0,
        },
      }
    })

    return NextResponse.json({ reps, connections: connectionStats })
  } catch (error) {
    console.error('[Dialer Admin Live API] GET error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
