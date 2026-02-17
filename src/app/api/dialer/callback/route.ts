import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { scheduleCallback, getCallbacks } from '@/lib/dialer'

export const dynamic = 'force-dynamic'

/**
 * POST /api/dialer/callback — Schedule callback
 * Body: { callId: string, callbackDate: string, notes?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { callId, callbackDate, notes } = await request.json()

    if (!callId || !callbackDate) {
      return NextResponse.json({ error: 'callId and callbackDate required' }, { status: 400 })
    }

    const call = await scheduleCallback(callId, callbackDate, notes)
    return NextResponse.json({ call })
  } catch (error) {
    console.error('Callback error:', error)
    return NextResponse.json({ error: 'Failed to schedule callback' }, { status: 500 })
  }
}

/**
 * GET /api/dialer/callback — Get callbacks for current rep
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const callbacks = await getCallbacks(session.userId)
    return NextResponse.json(callbacks)
  } catch (error) {
    console.error('Get callbacks error:', error)
    return NextResponse.json({ error: 'Failed to get callbacks' }, { status: 500 })
  }
}