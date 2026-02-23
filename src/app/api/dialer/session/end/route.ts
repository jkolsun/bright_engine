export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { endSession, mergeClientStats } from '@/lib/dialer-service'

export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')?.value
  const session = sessionCookie ? await verifySession(sessionCookie) : null
  if (!session || !['ADMIN', 'REP'].includes(session.role)) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const { sessionId, stats } = await request.json()
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
    }

    // Merge client-side stats before ending (NEW-M4/L1 fix)
    if (stats && typeof stats === 'object') {
      await mergeClientStats(sessionId, stats)
    }

    const dialerSession = await endSession(sessionId)
    return NextResponse.json(dialerSession)
  } catch (err) {
    console.error('[Dialer] End session error:', err)
    return NextResponse.json({ error: 'Failed to end session' }, { status: 500 })
  }
}
