export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { logDisposition } from '@/lib/dialer-service'

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { callId, result, path, wasRecommended, notes } = await request.json()

    if (!callId || !result) {
      return NextResponse.json({ error: 'callId and result are required' }, { status: 400 })
    }

    const disposition = await logDisposition({ callId, result, path, wasRecommended, notes })

    return NextResponse.json(disposition)
  } catch (error) {
    console.error('[Dialer Disposition API] POST error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
