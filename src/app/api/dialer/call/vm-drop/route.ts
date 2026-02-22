export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { dropVoicemail } from '@/lib/dialer-service'

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
    const result = await dropVoicemail(callId)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[Dialer] VM drop error:', err)
    const message = err instanceof Error ? err.message : 'Failed to drop voicemail'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
