import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * GET /api/scraper/download?runId=xxx
 * Download scrape results as CSV.
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

    // Read results from Redis
    let redis: any = null
    let data: string | null = null
    try {
      const Redis = (await import('ioredis')).default
      redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
      })
      data = await redis.get(`scraper:${runId}:results`)
    } finally {
      if (redis) try { await redis.quit() } catch { /* ignore */ }
    }

    if (!data) {
      return NextResponse.json({ error: 'Results not found or expired' }, { status: 404 })
    }

    const leads = JSON.parse(data) as Array<{
      companyName: string
      phone: string
      city: string
      state: string
      industry: string
      rating: number
      reviews: number
      address: string
      qualityScore: number
    }>

    // Build CSV
    const headers = ['companyName', 'phone', 'city', 'state', 'industry', 'rating', 'reviews', 'qualityScore', 'address']
    const rows = leads.map(lead =>
      headers.map(h => {
        const val = String((lead as any)[h] ?? '')
        // Escape CSV fields containing commas or quotes
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          return `"${val.replace(/"/g, '""')}"`
        }
        return val
      }).join(',')
    )

    const csv = [headers.join(','), ...rows].join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="scraper-results-${runId.slice(0, 8)}.csv"`,
      },
    })
  } catch (error) {
    console.error('Scraper download error:', error)
    return NextResponse.json({ error: 'Failed to download results' }, { status: 500 })
  }
}
