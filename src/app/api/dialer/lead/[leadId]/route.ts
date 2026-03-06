export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'

// GET /api/dialer/lead/[leadId] — Fetch a single lead for the dialer UI (QueueLead shape)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { leadId } = await params

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        companyName: true,
        firstName: true,
        lastName: true,
        phone: true,
        secondaryPhone: true,
        email: true,
        status: true,
        priority: true,
        city: true,
        state: true,
        industry: true,
        ownerRepId: true,
        previewId: true,
        previewUrl: true,
        _count: { select: { dialerCalls: true } },
      },
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Include SMS campaign data
    const smsCampaignLead = await prisma.smsCampaignLead.findFirst({
      where: {
        leadId: lead.id,
        funnelStage: { notIn: ['ARCHIVED', 'OPTED_OUT'] },
      },
      include: { campaign: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      lead: {
        ...lead,
        smsCampaignLead: smsCampaignLead ? {
          id: smsCampaignLead.id,
          campaignId: smsCampaignLead.campaignId,
          campaignName: smsCampaignLead.campaign.name,
          funnelStage: smsCampaignLead.funnelStage,
          coldTextSentAt: smsCampaignLead.coldTextSentAt?.toISOString(),
          previewClickedAt: smsCampaignLead.previewClickedAt?.toISOString(),
          optedInAt: smsCampaignLead.optedInAt?.toISOString(),
          dripCurrentStep: smsCampaignLead.dripCurrentStep,
          assignedRepId: smsCampaignLead.assignedRepId,
        } : null,
      },
    })
  } catch (error) {
    console.error('[Dialer Lead] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch lead' }, { status: 500 })
  }
}
