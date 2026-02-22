export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { endCall } from '@/lib/dialer-service'

export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')?.value
  const session = sessionCookie ? await verifySession(sessionCookie) : null
  if (!session || !['ADMIN', 'REP'].includes(session.role)) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const { callId } = await request.json()
    if (!callId) {
      return NextResponse.json({ error: 'callId is required' }, { status: 400 })
    }
    const result = await endCall(callId)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[Dialer] End call error:', err)
    return NextResponse.json({ error: 'Failed to end call' }, { status: 500 })
  }
}
