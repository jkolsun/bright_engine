import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { initiateParallelDial } from '@/lib/dialer'

export const dynamic = 'force-dynamic'

/**
 * POST /api/dialer/dial — Initiate parallel dial (1-3 lines)
 * Body: { leadIds: string[], sessionId?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { leadIds, sessionId } = await request.json()

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ error: 'leadIds array required' }, { status: 400 })
    }

    if (leadIds.length > 3) {
      return NextResponse.json({ error: 'Maximum 3 parallel lines' }, { status: 400 })
    }

    const result = await initiateParallelDial({
      repId: session.userId,
      leadIds,
      sessionId,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Dial error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate dial', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}