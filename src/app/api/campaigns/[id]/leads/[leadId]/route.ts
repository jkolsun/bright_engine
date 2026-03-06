export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

// DELETE /api/campaigns/[id]/leads/[leadId] — Remove a lead from a campaign
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; leadId: string }> }
) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
    }

    const { id: campaignId, leadId } = await params

    const campaignLead = await prisma.smsCampaignLead.findFirst({
      where: { campaignId, leadId },
    })

    if (!campaignLead) {
      return NextResponse.json({ error: 'Lead not found in this campaign' }, { status: 404 })
    }

    // Only allow removal for QUEUED, TEXTED, or already ARCHIVED leads
    const removableStages = ['QUEUED', 'TEXTED', 'ARCHIVED']
    if (!removableStages.includes(campaignLead.funnelStage)) {
      return NextResponse.json(
        { error: 'Cannot remove a lead that is actively in the funnel. Archive them instead.' },
        { status: 400 }
      )
    }

    // Soft delete: archive with reason
    await prisma.smsCampaignLead.update({
      where: { id: campaignLead.id },
      data: {
        funnelStage: 'ARCHIVED',
        archivedAt: new Date(),
        archiveReason: 'admin_removed',
      },
    })

    // Fresh count of non-archived leads for totalLeads
    const totalLeads = await prisma.smsCampaignLead.count({
      where: { campaignId, funnelStage: { not: 'ARCHIVED' } },
    })
    await prisma.smsCampaign.update({
      where: { id: campaignId },
      data: { totalLeads },
    })

    // Reset lead's campaign reference if this was their most recent campaign
    await prisma.lead.updateMany({
      where: { id: leadId, lastSmsCampaignId: campaignId },
      data: { lastSmsCampaignId: null, smsFunnelStage: null },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing lead from campaign:', error)
    return NextResponse.json(
      { error: 'Failed to remove lead', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
