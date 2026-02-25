export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'

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

    const [activeSessions, callsToday, conversationsToday, interestedToday] = await Promise.all([
      prisma.dialerSessionNew.count({ where: { isActive: true } }),
      prisma.dialerCall.count({ where: { startedAt: { gte: today } } }),
      prisma.dialerCall.count({
        where: { startedAt: { gte: today }, dispositionResult: { in: CONVERSATION_DISPOSITIONS } },
      }),
      prisma.dialerCall.count({
        where: {
          startedAt: { gte: today },
          dispositionResult: { in: ['WANTS_TO_MOVE_FORWARD', 'INTERESTED_VERBAL', 'CALLBACK', 'WANTS_CHANGES'] },
        },
      }),
    ])

    return NextResponse.json({ activeSessions, callsToday, conversationsToday, interestedToday })
  } catch (error) {
    console.error('[Dialer Admin Stats API] GET error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
