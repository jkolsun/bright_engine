import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { getRepStats, getCoachingTip, calculateWeeklyScore } from '@/lib/dialer-scoring'

export const dynamic = 'force-dynamic'

/**
 * GET /api/dialer/stats — Get rep stats
 * Query: ?period=today|week|month|all&scoring=true
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = (searchParams.get('period') || 'today') as 'today' | 'week' | 'month' | 'all'
    const includeScoring = searchParams.get('scoring') === 'true'
    const repId = searchParams.get('repId') || session.userId

    // Check admin access for viewing other reps
    if (repId !== session.userId && session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Cannot view other reps stats' }, { status: 403 })
    }

    const stats = await getRepStats(repId, period)
    const coachingTip = await getCoachingTip(repId)

    let scoring: any = null
    if (includeScoring) {
      scoring = await calculateWeeklyScore(repId)
    }

    return NextResponse.json({ stats, coachingTip, scoring })
  } catch (error) {
    console.error('Stats error:', error)
    return NextResponse.json(
      { error: 'Failed to get stats', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}