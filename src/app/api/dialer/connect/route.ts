import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { connectCall } from '@/lib/dialer'

export const dynamic = 'force-dynamic'

/**
 * POST /api/dialer/connect — Connect answered call to rep
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

    const call = await connectCall(callId, session.userId)
    return NextResponse.json({ call })
  } catch (error) {
    console.error('Connect error:', error)
    return NextResponse.json({ error: 'Failed to connect call' }, { status: 500 })
  }
}