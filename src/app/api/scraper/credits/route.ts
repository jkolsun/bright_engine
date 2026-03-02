import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'
import { syncApiKeysToEnv } from '@/lib/api-keys'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    // Ensure DB key overrides are loaded
    try { await syncApiKeysToEnv() } catch { /* non-fatal */ }

    const apiKey = process.env.SERPAPI_KEY
    if (!apiKey) {
      return NextResponse.json({ configured: false })
    }

    // Fetch SerpAPI account info (free endpoint — does NOT count toward quota)
    let account: {
      totalSearchesLeft: number
      searchesPerMonth: number
      thisMonthUsage: number
      planName: string
      lastHourSearches: number
      rateLimit: number
    } | null = null
    let connected = false
    try {
      const res = await fetch(`https://serpapi.com/account.json?api_key=${apiKey}`, {
        signal: AbortSignal.timeout(10000),
      })
      if (res.ok) {
        const data = await res.json()
        connected = true
        account = {
          totalSearchesLeft: data.total_searches_left ?? 0,
          searchesPerMonth: data.searches_per_month ?? 0,
          thisMonthUsage: data.this_month_usage ?? 0,
          planName: data.plan_name ?? 'Unknown',
          lastHourSearches: data.last_hour_searches ?? 0,
          rateLimit: data.account_rate_limit_per_hour ?? 0,
        }
      }
    } catch {
      // SerpAPI unreachable
    }

    // Fetch today's daily usage from ApiCost table
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const todayUsage = await prisma.apiCost.count({
      where: {
        service: 'serpapi',
        createdAt: { gte: todayStart },
      },
    })

    const dailyLimit = parseInt(process.env.SERPAPI_DAILY_LIMIT || '0', 10)
    const dailyRemaining = dailyLimit > 0 ? Math.max(0, dailyLimit - todayUsage) : null
    const limitReached = dailyLimit > 0 && todayUsage >= dailyLimit

    return NextResponse.json({
      configured: true,
      connected,
      account,
      daily: {
        todayUsage,
        dailyLimit,
        dailyRemaining,
        limitReached,
      },
    })
  } catch (error) {
    console.error('Scraper credits error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch credits', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
