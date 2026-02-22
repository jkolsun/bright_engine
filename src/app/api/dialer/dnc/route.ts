export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { markDNC } from '@/lib/dialer-service'

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { leadId } = await request.json()

    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 })
    }

    const result = await markDNC(leadId, session.userId)

    return NextResponse.json(result)
  } catch (error) {
    console.error('[Dialer DNC API] POST error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
