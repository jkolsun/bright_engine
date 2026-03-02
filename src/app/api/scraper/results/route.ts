import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * GET /api/scraper/results?runId=xxx
 * Fetch full scrape results (JSON) from Redis.
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const runId = request.nextUrl.searchParams.get('runId')
    if (!runId) {
      return NextResponse.json({ error: 'runId is required' }, { status: 400 })
    }

    let redis: any = null
    try {
      const Redis = (await import('ioredis')).default
      redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
      })

      const data = await redis.get(`scraper:${runId}:results`)

      if (!data) {
        return NextResponse.json({ error: 'Results not found or expired' }, { status: 404 })
      }

      const leads = JSON.parse(data)
      return NextResponse.json({ leads })
    } catch (err) {
      console.error('Scraper results Redis error:', err)
      return NextResponse.json({ error: 'Failed to fetch results' }, { status: 500 })
    } finally {
      if (redis) try { await redis.quit() } catch { /* ignore */ }
    }
  } catch (error) {
    console.error('Scraper results error:', error)
    return NextResponse.json({ error: 'Failed to fetch results' }, { status: 500 })
  }
}
