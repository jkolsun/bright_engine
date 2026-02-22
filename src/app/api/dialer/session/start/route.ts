export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { startSession } from '@/lib/dialer-service'

export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')?.value
  const session = sessionCookie ? await verifySession(sessionCookie) : null
  if (!session || !['ADMIN', 'REP'].includes(session.role)) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { autoDialEnabled = false } = body
    const dialerSession = await startSession(session.userId, autoDialEnabled)
    return NextResponse.json(dialerSession)
  } catch (err) {
    console.error('[Dialer] Start session error:', err)
    return NextResponse.json({ error: 'Failed to start session' }, { status: 500 })
  }
}
