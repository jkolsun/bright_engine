export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { updateSessionSettings, mergeClientStats } from '@/lib/dialer-service'

export async function PATCH(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')?.value
  const session = sessionCookie ? await verifySession(sessionCookie) : null
  if (!session || !['ADMIN', 'REP'].includes(session.role)) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { sessionId } = body

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
    }

    // Handle stats update (NEW-M4 fix — persist client-side session stats)
    if (body.stats && typeof body.stats === 'object') {
      const updated = await mergeClientStats(sessionId, body.stats)
      return NextResponse.json(updated)
    }

    // Handle autoDialEnabled toggle
    if (typeof body.autoDialEnabled === 'boolean') {
      const updated = await updateSessionSettings(sessionId, body.autoDialEnabled)
      return NextResponse.json(updated)
    }

    return NextResponse.json({ error: 'No valid update provided' }, { status: 400 })
  } catch (err) {
    console.error('[Dialer] Update session settings error:', err)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
