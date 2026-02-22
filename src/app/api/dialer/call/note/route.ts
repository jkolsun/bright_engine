export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { updateCallNotes } from '@/lib/dialer-service'

export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')?.value
  const session = sessionCookie ? await verifySession(sessionCookie) : null
  if (!session || !['ADMIN', 'REP'].includes(session.role)) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const { callId, notes } = await request.json()
    if (!callId || typeof notes !== 'string') {
      return NextResponse.json({ error: 'callId and notes are required' }, { status: 400 })
    }
    const result = await updateCallNotes(callId, notes)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[Dialer] Update notes error:', err)
    return NextResponse.json({ error: 'Failed to update notes' }, { status: 500 })
  }
}
