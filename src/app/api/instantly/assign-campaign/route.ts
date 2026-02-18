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

    // Validate leads have required fields for Instantly (email + preview URL)
    const leads = await prisma.lead.findMany({
      where: { id: { in: leadIds } },
      select: { id: true, email: true, previewUrl: true, firstName: true, companyName: true },
    })

    const validLeadIds = leads
      .filter((l) => l.email && l.previewUrl)
      .map((l) => l.id)

    const skipped = leads.filter((l) => !l.email || !l.previewUrl)

    if (validLeadIds.length === 0) {
      return NextResponse.json({
        error: 'No leads have both email and preview URL — required for Instantly campaigns',
        skipped: skipped.length,
      }, { status: 400 })
    }

    // Queue valid leads — instantlyAddedDate is set later when actually pushed to Instantly
    const updated = await prisma.lead.updateMany({
      where: { id: { in: validLeadIds } },
      data: {
        instantlyCampaignId: campaignId,
        instantlyStatus: 'QUEUED',
      },
    })

    return NextResponse.json({
      updated: updated.count,
      skipped: skipped.length,
      skippedReason: skipped.length > 0 ? 'Missing email or preview URL' : undefined,
      campaignName: campaignName || campaignId,
    })
  } catch (error) {
    console.error('Assign campaign error:', error)
    return NextResponse.json({ error: 'Failed to assign to campaign' }, { status: 500 })
  }
}
