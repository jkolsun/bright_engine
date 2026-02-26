import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { recalculateAllEngagementScores } from '@/lib/engagement-scoring'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const scores = await recalculateAllEngagementScores()

    const hot = scores.filter(s => s.level === 'HOT').length
    const warm = scores.filter(s => s.level === 'WARM').length
    const cold = scores.filter(s => s.level === 'COLD').length

    return NextResponse.json({
      scored: scores.length,
      hot,
      warm,
      cold,
      averageScore: scores.length > 0
        ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length)
        : 0,
    })
  } catch (error) {
    console.error('[Backfill Scores] Error:', error)
    return NextResponse.json(
      { error: 'Failed to backfill scores', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
