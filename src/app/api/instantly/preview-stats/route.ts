import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { getInstantlyDashboardStats } from '@/lib/instantly-campaign-stats'

export const dynamic = 'force-dynamic'

/**
 * GET /api/instantly/preview-stats
 * Returns full Instantly campaign stats with preview/personalization engagement data
 * This is the core "spit back the stats" endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const stats = await getInstantlyDashboardStats()

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Preview stats endpoint error:', error)
    return NextResponse.json(
      { error: 'Failed to get stats', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}