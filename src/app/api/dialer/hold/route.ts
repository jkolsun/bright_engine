import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { holdCall, resumeCall } from '@/lib/dialer'

export const dynamic = 'force-dynamic'

/**
 * POST /api/dialer/hold — Hold or resume call
 * Body: { callId: string, action: 'hold' | 'resume' }
 */
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { callId, action = 'hold' } = await request.json()
    if (!callId) {
      return NextResponse.json({ error: 'callId required' }, { status: 400 })
    }

    const call = action === 'resume' ? await resumeCall(callId) : await holdCall(callId)
    return NextResponse.json({ call })
  } catch (error) {
    console.error('Hold error:', error)
    return NextResponse.json({ error: 'Failed to hold call' }, { status: 500 })
  }
}