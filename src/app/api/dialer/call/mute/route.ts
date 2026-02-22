export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'

export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')?.value
  const session = sessionCookie ? await verifySession(sessionCookie) : null
  if (!session || !['ADMIN', 'REP'].includes(session.role)) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const { callId, muted } = await request.json()
    if (!callId || typeof muted !== 'boolean') {
      return NextResponse.json({ error: 'callId and muted (boolean) are required' }, { status: 400 })
    }
    // Mute is purely a client-side operation with the Twilio Voice SDK.
    return NextResponse.json({ success: true, muted })
  } catch (err) {
    console.error('[Dialer] Mute error:', err)
    return NextResponse.json({ error: 'Failed to update mute state' }, { status: 500 })
  }
}
