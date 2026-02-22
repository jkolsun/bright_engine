export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { updateSessionSettings } from '@/lib/dialer-service'

export async function PATCH(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')?.value
  const session = sessionCookie ? await verifySession(sessionCookie) : null
  if (!session || !['ADMIN', 'REP'].includes(session.role)) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const { sessionId, autoDialEnabled } = await request.json()
    if (!sessionId || typeof autoDialEnabled !== 'boolean') {
      return NextResponse.json({ error: 'sessionId and autoDialEnabled are required' }, { status: 400 })
    }
    const updated = await updateSessionSettings(sessionId, autoDialEnabled)
    return NextResponse.json(updated)
  } catch (err) {
    console.error('[Dialer] Update session settings error:', err)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
