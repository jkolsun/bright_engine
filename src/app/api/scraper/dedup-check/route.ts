import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * POST /api/scraper/dedup-check
 * Pre-scrape overlap check — counts existing leads per selected city.
 */
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const { cities } = await request.json() as { cities: string[] }
    if (!cities || cities.length === 0) {
      return NextResponse.json({ overlaps: [] })
    }

    // Parse "City ST" strings into city/state pairs
    const cityStatePairs: Array<{ city: string; state: string }> = []
    for (const c of cities) {
      const match = c.match(/^(.+?)\s+([A-Z]{2})$/)
      if (match) {
        cityStatePairs.push({ city: match[1].trim(), state: match[2] })
      }
    }

    if (cityStatePairs.length === 0) {
      return NextResponse.json({ overlaps: [] })
    }

    // Use paired OR conditions to avoid cross-state false positives
    const existingLeads = await prisma.lead.findMany({
      where: {
        OR: cityStatePairs.map(p => ({ city: p.city, state: p.state })),
        status: { notIn: ['CLOSED_LOST', 'DO_NOT_CONTACT'] },
      },
      select: { city: true, state: true },
    })

    // Group by city+state
    const counts: Record<string, number> = {}
    for (const lead of existingLeads) {
      const key = `${lead.city} ${lead.state}`
      counts[key] = (counts[key] || 0) + 1
    }

    const overlaps = Object.entries(counts)
      .map(([cityState, count]) => ({ city: cityState, count }))
      .sort((a, b) => b.count - a.count)

    return NextResponse.json({ overlaps })
  } catch (error) {
    console.error('Dedup check error:', error)
    return NextResponse.json(
      { error: 'Failed to check duplicates', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
