import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'
import { addScraperJob } from '@/worker/queue'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const body = await request.json()
    const { name, searchTerms, cities, filters, cityMode, configId, icpId } = body as {
      name?: string
      searchTerms: Array<{ term: string; industry: string }>
      cities: string[]
      filters: {
        minReviews: number
        minRating: number
        targetLeads: number
        hasPhotos?: string
        hasHours?: string
        minCategories?: number
        maxDistance?: number
      }
      cityMode?: string
      configId?: string
      icpId?: string
    }

    if (!searchTerms || searchTerms.length === 0) {
      return NextResponse.json({ error: 'At least one search term is required' }, { status: 400 })
    }
    if (!cities || cities.length === 0) {
      return NextResponse.json({ error: 'At least one city is required' }, { status: 400 })
    }

    const scrapeName = name?.trim() || `Scrape ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

    // Create ScraperRun record
    const run = await prisma.scraperRun.create({
      data: {
        configId: configId || null,
        icpId: icpId || null,
        name: scrapeName,
        searchTerms: searchTerms as any,
        cities: cities as any,
        filters: filters as any,
        cityMode: cityMode || 'major',
        status: 'RUNNING',
      },
    })

    const totalQueries = searchTerms.length * cities.length

    // Write initial progress to Redis
    let redis: any = null
    try {
      const Redis = (await import('ioredis')).default
      redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
      })
      await redis.set(
        `scraper:${run.id}`,
        JSON.stringify({
          status: 'running',
          queriesUsed: 0,
          totalQueries,
          leadsFound: 0,
          resultsScanned: 0,
          skipped: { website: 0, noPhone: 0, lowReviews: 0, lowRating: 0, noPhotos: 0, noHours: 0 },
          qualifiedLeads: [],
        }),
        'EX',
        14400
      )
    } catch (err) {
      console.error('[Scraper Start] Failed to write initial Redis progress:', err)
    } finally {
      if (redis) try { await redis.quit() } catch { /* ignore */ }
    }

    // Queue BullMQ job
    const job = await addScraperJob({
      runId: run.id,
      config: { searchTerms, cities, filters },
    })

    if (!job) {
      await prisma.scraperRun.update({
        where: { id: run.id },
        data: { status: 'FAILED' },
      })
      return NextResponse.json(
        { error: 'Failed to queue scraper job. Redis may be unavailable.' },
        { status: 503 }
      )
    }

    return NextResponse.json({
      runId: run.id,
      totalQueries,
    })
  } catch (error) {
    console.error('Scraper start error:', error)
    return NextResponse.json(
      { error: 'Failed to start scraper', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
