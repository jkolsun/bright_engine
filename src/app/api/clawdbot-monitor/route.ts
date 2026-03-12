import { getRecentActivity, getTodayStats, getQueueStatus } from '@/lib/logging'
import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const [activity, stats, queues] = await Promise.all([
      getRecentActivity(50),
      getTodayStats(),
      getQueueStatus(),
    ])

    return NextResponse.json({
      status: 'online',
      activity,
      stats,
      queues,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
