import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

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

    // Try Redis first
    let redis: any = null
    try {
      const Redis = (await import('ioredis')).default
      redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
      })

      const data = await redis.get(`scraper:${runId}`)
      if (data) {
        return NextResponse.json(JSON.parse(data))
      }
    } catch (err) {
      console.error('[Scraper Status] Redis error, falling back to DB:', err)
    } finally {
      if (redis) try { await redis.quit() } catch { /* ignore */ }
    }

    // Fallback to database
    const run = await prisma.scraperRun.findUnique({
      where: { id: runId },
      select: { status: true, totalLeads: true, creditsUsed: true },
    })

    if (!run) {
      return NextResponse.json({ error: 'Run not found or expired' }, { status: 404 })
    }

    return NextResponse.json({
      status: run.status === 'RUNNING' ? 'running' : run.status === 'FAILED' ? 'failed' : run.status === 'CANCELLED' ? 'stopped' : 'completed',
      queriesUsed: run.creditsUsed,
      totalQueries: run.creditsUsed,
      leadsFound: run.totalLeads,
      resultsScanned: 0,
      skipped: { website: 0, noPhone: 0, lowReviews: 0, lowRating: 0, noPhotos: 0, noHours: 0 },
      qualifiedLeads: [],
    })
  } catch (error) {
    console.error('Scraper status error:', error)
    return NextResponse.json({ error: 'Failed to get scraper status' }, { status: 500 })
  }
}
