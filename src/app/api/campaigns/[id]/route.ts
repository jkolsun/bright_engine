import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'
import { pauseCampaign, startCampaign } from '@/lib/sms-campaign-service'

export const dynamic = 'force-dynamic'

// GET /api/campaigns/[id] — Campaign detail with funnel stage breakdown
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
    }

    const { id } = await params

    const campaign = await prisma.smsCampaign.findUnique({
      where: { id },
    })

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Get funnel stage breakdown
    const stageCounts = await prisma.smsCampaignLead.groupBy({
      by: ['funnelStage'],
      where: { campaignId: id },
      _count: { id: true },
    })

    const funnelBreakdown: Record<string, number> = {}
    for (const row of stageCounts) {
      funnelBreakdown[row.funnelStage] = row._count.id
    }

    return NextResponse.json({
      campaign: {
        ...campaign,
        // Map schema field names to UI-expected names
        clickedCount: campaign.clickCount,
        optedInCount: campaign.optInCount,
        optedOutCount: campaign.optOutCount,
        closedCount: campaign.closeCount,
      },
      funnelBreakdown,
    })
  } catch (error) {
    console.error('Error fetching campaign:', error)
    return NextResponse.json(
      { error: 'Failed to fetch campaign', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

// PUT /api/campaigns/[id] — Update campaign (name, pause, resume)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, status, templateBody, fromNumber } = body

    // Verify campaign exists
    const existing = await prisma.smsCampaign.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Block templateBody changes on non-DRAFT campaigns
    if (templateBody !== undefined && existing.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Template body cannot be changed after campaign has started sending' },
        { status: 400 }
      )
    }

    // Block name changes on non-DRAFT campaigns
    if (name !== undefined && existing.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Campaign name can only be edited while in DRAFT status' },
        { status: 400 }
      )
    }

    // Block fromNumber changes on SENDING or COMPLETED campaigns
    if (fromNumber !== undefined && (existing.status === 'SENDING' || existing.status === 'COMPLETED')) {
      return NextResponse.json(
        { error: 'From number can only be changed on DRAFT or PAUSED campaigns' },
        { status: 400 }
      )
    }

    let updatedCampaign = existing

    // Handle status transitions
    if (status === 'PAUSED') {
      updatedCampaign = await pauseCampaign(id)
    } else if (status === 'SENDING') {
      updatedCampaign = await startCampaign(id)
    }

    // Handle field updates
    const updateData: Record<string, unknown> = {}
    if (name !== undefined && name !== updatedCampaign.name) updateData.name = name
    if (templateBody !== undefined) updateData.templateBody = templateBody
    if (fromNumber !== undefined) updateData.fromNumber = fromNumber

    if (Object.keys(updateData).length > 0) {
      updatedCampaign = await prisma.smsCampaign.update({
        where: { id },
        data: updateData,
      })
    }

    return NextResponse.json({
      campaign: {
        ...updatedCampaign,
        clickedCount: updatedCampaign.clickCount,
        optedInCount: updatedCampaign.optInCount,
        optedOutCount: updatedCampaign.optOutCount,
        closedCount: updatedCampaign.closeCount,
      },
    })
  } catch (error) {
    console.error('Error updating campaign:', error)
    return NextResponse.json(
      { error: 'Failed to update campaign', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

// DELETE /api/campaigns/[id] — Delete a campaign
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
    }

    const { id } = await params
    const campaign = await prisma.smsCampaign.findUnique({ where: { id } })
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    if (campaign.status === 'SENDING') {
      return NextResponse.json(
        { error: 'Pause the campaign before deleting' },
        { status: 400 }
      )
    }

    // Reset Lead.lastSmsCampaignId and smsFunnelStage for affected leads
    // Only reset if this campaign was their most recent
    await prisma.lead.updateMany({
      where: { lastSmsCampaignId: id },
      data: { lastSmsCampaignId: null, smsFunnelStage: null },
    })

    // Delete campaign — Cascade handles SmsCampaignLead + SmsCampaignMessage
    await prisma.smsCampaign.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting campaign:', error)
    return NextResponse.json(
      { error: 'Failed to delete campaign', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
