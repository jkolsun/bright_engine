export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { autoDisposition } from '@/lib/dialer-service'

const VALID_RESULTS = ['NO_ANSWER', 'VOICEMAIL', 'BUSY', 'FAILED']

export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')?.value
  const session = sessionCookie ? await verifySession(sessionCookie) : null
  if (!session || !['ADMIN', 'REP'].includes(session.role)) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const { callId, result } = await request.json()
    if (!callId || !result) {
      return NextResponse.json({ error: 'callId and result are required' }, { status: 400 })
    }
    if (!VALID_RESULTS.includes(result)) {
      return NextResponse.json({ error: `Invalid result. Must be one of: ${VALID_RESULTS.join(', ')}` }, { status: 400 })
    }

    await autoDisposition(callId, result)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Dialer] Auto-disposition error:', err)
    return NextResponse.json({ error: 'Failed to auto-disposition' }, { status: 500 })
  }
}
