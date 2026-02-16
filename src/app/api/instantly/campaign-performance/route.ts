import { NextRequest, NextResponse } from 'next/server'
import { getCampaignPerformance, rebalanceCampaignCapacity } from '@/lib/instantly-phase2'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * GET /api/instantly/campaign-performance
 * Get detailed performance metrics for all campaigns
 * Admin-only
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const campaignId = request.nextUrl.searchParams.get('campaign_id')

    if (campaignId) {
      // Get specific campaign
      const perf = await getCampaignPerformance(campaignId)
      return NextResponse.json(perf)
    }

    // Return placeholder for all campaigns
    // In production, would fetch all and return array
    return NextResponse.json({
      message: 'Fetch specific campaign with ?campaign_id=xxx',
    })
  } catch (error) {
    console.error('Campaign performance error:', error)
    return NextResponse.json(
      { error: 'Failed to get performance', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
