export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const callbacks = await prisma.callbackSchedule.findMany({
      where: {
        repId: session.userId,
        status: 'PENDING',
      },
      include: {
        lead: {
          select: { id: true, companyName: true, phone: true, firstName: true, lastName: true },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    })

    // Group into overdue, today, and upcoming
    const now = new Date()
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(now)
    todayEnd.setHours(23, 59, 59, 999)

    const overdue: typeof callbacks = []
    const today: typeof callbacks = []
    const upcoming: typeof callbacks = []

    for (const cb of callbacks) {
      const scheduled = new Date(cb.scheduledAt)
      if (scheduled < todayStart) {
        overdue.push(cb)
      } else if (scheduled <= todayEnd) {
        today.push(cb)
      } else {
        upcoming.push(cb)
      }
    }

    return NextResponse.json({ overdue, today, upcoming })
  } catch (error) {
    console.error('[Dialer Callback API] GET error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
