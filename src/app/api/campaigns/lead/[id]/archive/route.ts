import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

// POST /api/campaigns/lead/[id]/archive — Archive a SmsCampaignLead (rep "Not Interested" button)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id: campaignLeadId } = await params

    const campaignLead = await prisma.smsCampaignLead.findUnique({
      where: { id: campaignLeadId },
      select: { id: true, leadId: true, campaignId: true, funnelStage: true },
    })

    if (!campaignLead) {
      return NextResponse.json({ error: 'Campaign lead not found' }, { status: 404 })
    }

    if (['OPTED_OUT', 'ARCHIVED', 'CLOSED'].includes(campaignLead.funnelStage)) {
      return NextResponse.json({ error: 'Lead already archived or opted out' }, { status: 400 })
    }

    await prisma.smsCampaignLead.update({
      where: { id: campaignLeadId },
      data: {
        funnelStage: 'ARCHIVED',
        archivedAt: new Date(),
        archiveReason: 'not_interested',
      },
    })

    await prisma.lead.update({
      where: { id: campaignLead.leadId },
      data: { smsFunnelStage: 'ARCHIVED' },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error archiving campaign lead:', error)
    return NextResponse.json(
      { error: 'Failed to archive', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
