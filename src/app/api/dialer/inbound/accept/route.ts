export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Simple acknowledgment - the actual connection happens via TwiML in the inbound webhook
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Dialer Inbound Accept API] POST error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
