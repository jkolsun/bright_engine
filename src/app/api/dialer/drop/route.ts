import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { dropCall } from '@/lib/dialer'

export const dynamic = 'force-dynamic'

/**
 * POST /api/dialer/drop — Drop unanswered parallel lines
 * Body: { callIds: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { callIds } = await request.json()
    if (!callIds || !Array.isArray(callIds)) {
      return NextResponse.json({ error: 'callIds array required' }, { status: 400 })
    }

    const results = await Promise.all(callIds.map(id => dropCall(id)))
    return NextResponse.json({ dropped: results.filter(Boolean).length })
  } catch (error) {
    console.error('Drop error:', error)
    return NextResponse.json({ error: 'Failed to drop calls' }, { status: 500 })
  }
}