export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { manualDial } from '@/lib/dialer-service'

export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')?.value
  const session = sessionCookie ? await verifySession(sessionCookie) : null
  if (!session || !['ADMIN', 'REP'].includes(session.role)) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const { phone, sessionId } = await request.json()
    if (!phone) {
      return NextResponse.json({ error: 'phone is required' }, { status: 400 })
    }
    const result = await manualDial(session.userId, phone, sessionId)
    if ('error' in result && result.error) {
      return NextResponse.json({ error: result.error, code: result.code }, { status: 400 })
    }
    return NextResponse.json(result)
  } catch (err) {
    console.error('[Dialer] Manual dial error:', err)
    return NextResponse.json({ error: 'Failed to manual dial' }, { status: 500 })
  }
}
