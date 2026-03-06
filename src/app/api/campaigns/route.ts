import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'
import { createCampaign } from '@/lib/sms-campaign-service'

export const dynamic = 'force-dynamic'

// GET /api/campaigns — List all campaigns with summary metrics
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
    }

    const campaigns = await prisma.smsCampaign.findMany({
      orderBy: { createdAt: 'desc' },
    })

    // For each campaign, get funnel stage breakdown
    const campaignsWithMetrics = await Promise.all(
      campaigns.map(async (campaign) => {
        const stageCounts = await prisma.smsCampaignLead.groupBy({
          by: ['funnelStage'],
          where: { campaignId: campaign.id },
          _count: { id: true },
        })

        const funnelBreakdown: Record<string, number> = {}
        for (const row of stageCounts) {
          funnelBreakdown[row.funnelStage] = row._count.id
        }

        return {
          ...campaign,
          funnelBreakdown,
        }
      })
    )

    return NextResponse.json({ campaigns: campaignsWithMetrics })
  } catch (error) {
    console.error('Error fetching campaigns:', error)
    return NextResponse.json(
      { error: 'Failed to fetch campaigns', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

// POST /api/campaigns — Create a new campaign
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
    }

    const body = await request.json()
    const { name, templateBody, fromNumber, leadIds } = body

    if (!name || !templateBody || !leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json(
        { error: 'name, templateBody, and leadIds (non-empty array) are required' },
        { status: 400 }
      )
    }

    const campaign = await createCampaign({
      name,
      templateBody,
      fromNumber,
      leadIds,
    })

    return NextResponse.json({ campaign }, { status: 201 })
  } catch (error) {
    console.error('Error creating campaign:', error)
    return NextResponse.json(
      { error: 'Failed to create campaign', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
