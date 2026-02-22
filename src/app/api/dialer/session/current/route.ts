export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { getActiveSession } from '@/lib/dialer-service'

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')?.value
  const session = sessionCookie ? await verifySession(sessionCookie) : null
  if (!session || !['ADMIN', 'REP'].includes(session.role)) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const dialerSession = await getActiveSession(session.userId)
    return NextResponse.json(dialerSession ?? null)
  } catch (err) {
    console.error('[Dialer] Get current session error:', err)
    return NextResponse.json({ error: 'Failed to get session' }, { status: 500 })
  }
}
