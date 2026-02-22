export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { completeCallback } from '@/lib/dialer-service'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id } = await params
    const result = await completeCallback(id)

    return NextResponse.json(result)
  } catch (error) {
    console.error('[Dialer Callback Complete API] POST error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
