import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { hangupCall } from '@/lib/dialer'

export const dynamic = 'force-dynamic'

/**
 * POST /api/dialer/hangup — End current call
 * Body: { callId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { callId } = await request.json()
    if (!callId) {
      return NextResponse.json({ error: 'callId required' }, { status: 400 })
    }

    const call = await hangupCall(callId)
    return NextResponse.json({ call })
  } catch (error) {
    console.error('Hangup error:', error)
    return NextResponse.json({ error: 'Failed to hang up' }, { status: 500 })
  }
}