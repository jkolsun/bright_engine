export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { initiateCall } from '@/lib/dialer-service'

export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')?.value
  const session = sessionCookie ? await verifySession(sessionCookie) : null
  if (!session || !['ADMIN', 'REP'].includes(session.role)) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const { leadId, sessionId, phone } = await request.json()
    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 })
    }
    const result = await initiateCall(session.userId, leadId, sessionId, phone)
    if ('error' in result && result.error) {
      return NextResponse.json({ error: result.error, code: result.code }, { status: 400 })
    }
    return NextResponse.json(result)
  } catch (err) {
    console.error('[Dialer] Initiate call error:', err)
    return NextResponse.json({ error: 'Failed to initiate call' }, { status: 500 })
  }
}
