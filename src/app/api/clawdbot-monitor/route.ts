import { getRecentActivity, getTodayStats, getQueueStatus } from '@/lib/logging'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
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
