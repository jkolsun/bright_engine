import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

// POST /api/instantly/assign-campaign — Assign leads to an Instantly campaign
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const { leadIds, campaignId, campaignName } = await request.json()
    if (!leadIds?.length || !campaignId) {
      return NextResponse.json({ error: 'leadIds and campaignId required' }, { status: 400 })
    }

    const updated = await prisma.lead.updateMany({
      where: { id: { in: leadIds } },
      data: {
        instantlyCampaignId: campaignId,
        instantlyStatus: 'QUEUED',
        instantlyAddedDate: new Date(),
      },
    })

    return NextResponse.json({
      updated: updated.count,
      campaignName: campaignName || campaignId,
    })
  } catch (error) {
    console.error('Assign campaign error:', error)
    return NextResponse.json({ error: 'Failed to assign to campaign' }, { status: 500 })
  }
}
