import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const { runId } = await request.json()
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
      await redis.set(`scraper:${runId}:stop`, '1', 'EX', 3600)
      return NextResponse.json({ success: true })
    } catch (err) {
      console.error('[Scraper Stop] Redis error:', err)
      return NextResponse.json({ error: 'Failed to stop scraper' }, { status: 503 })
    } finally {
      if (redis) try { await redis.quit() } catch { /* ignore */ }
    }
  } catch (error) {
    console.error('Scraper stop error:', error)
    return NextResponse.json({ error: 'Failed to stop scraper' }, { status: 500 })
  }
}
