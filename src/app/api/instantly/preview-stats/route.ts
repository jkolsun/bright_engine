import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { getInstantlyDashboardStats } from '@/lib/instantly-campaign-stats'

export const dynamic = 'force-dynamic'
export const maxDuration = 15 // seconds — prevent Railway 502 on long queries

// In-memory cache: stats don't change every second, no need to hammer the DB
let cachedStats: { data: any; timestamp: number } | null = null
const CACHE_TTL_MS = 30_000 // 30 seconds

/**
 * GET /api/instantly/preview-stats
 * Returns full Instantly campaign stats with preview/personalization engagement data
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    // Return cached stats if fresh enough
    if (cachedStats && Date.now() - cachedStats.timestamp < CACHE_TTL_MS) {
      return NextResponse.json(cachedStats.data)
    }

    // Timeout wrapper: return a 500 instead of hanging until Railway kills us with 502
    const stats = await Promise.race([
      getInstantlyDashboardStats(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Stats query timed out after 12s')), 12000)
      ),
    ])

    // Cache successful results
    cachedStats = { data: stats, timestamp: Date.now() }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Preview stats endpoint error:', error)
    // If we have stale cache, serve it rather than error
    if (cachedStats) {
      return NextResponse.json(cachedStats.data)
    }
    return NextResponse.json(
      { error: 'Failed to get stats', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}