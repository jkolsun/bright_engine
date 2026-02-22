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
    const { callId, hold } = await request.json()
    if (!callId || typeof hold !== 'boolean') {
      return NextResponse.json({ error: 'callId and hold (boolean) are required' }, { status: 400 })
    }
    // Hold/unhold is a client-side operation with the Twilio Voice SDK.
    // No server-side Twilio action needed for direct-dial hold.
    return NextResponse.json({ success: true, held: hold })
  } catch (err) {
    console.error('[Dialer] Hold error:', err)
    return NextResponse.json({ error: 'Failed to update hold state' }, { status: 500 })
  }
}
