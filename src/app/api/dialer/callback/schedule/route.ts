export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { scheduleCallback } from '@/lib/dialer-service'

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { leadId, scheduledAt, notes, callId, isAllDay } = await request.json()

    if (!leadId || !scheduledAt) {
      return NextResponse.json({ error: 'leadId and scheduledAt are required' }, { status: 400 })
    }

    const callback = await scheduleCallback({
      leadId,
      repId: session.userId,
      scheduledAt: new Date(scheduledAt),
      notes: isAllDay ? `[ALL_DAY]${notes || ''}` : notes,
      callId,
    })

    return NextResponse.json(callback)
  } catch (error) {
    console.error('[Dialer Callback Schedule API] POST error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
