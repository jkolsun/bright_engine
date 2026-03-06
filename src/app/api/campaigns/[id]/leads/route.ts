import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

// GET /api/campaigns/[id]/leads — Paginated leads with funnel stage filter
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id: campaignId } = await params
    const searchParams = request.nextUrl.searchParams
    const stage = searchParams.get('stage')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))
    const skip = (page - 1) * limit

    // Verify campaign exists
    const campaign = await prisma.smsCampaign.findUnique({ where: { id: campaignId } })
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Build where clause
    const where: Record<string, unknown> = { campaignId }
    if (stage) {
      where.funnelStage = stage
    }

    const [campaignLeads, total, stageCounts] = await Promise.all([
      prisma.smsCampaignLead.findMany({
        where,
        include: {
          lead: {
            select: {
              id: true,
              companyName: true,
              firstName: true,
              lastName: true,
              phone: true,
              city: true,
              state: true,
              industry: true,
              previewUrl: true,
              email: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      prisma.smsCampaignLead.count({ where }),
      prisma.smsCampaignLead.groupBy({
        by: ['funnelStage'],
        where: { campaignId },
        _count: { id: true },
      }),
    ])

    const totalPages = Math.ceil(total / limit)

    // Build funnelCounts map: { QUEUED: 5, TEXTED: 12, ... }
    const funnelCounts: Record<string, number> = {}
    for (const row of stageCounts) {
      funnelCounts[row.funnelStage] = row._count.id
    }

    // Look up rep names for assigned leads
    const repIds = [...new Set(campaignLeads.map(cl => cl.assignedRepId).filter(Boolean))] as string[]
    const repMap: Record<string, string> = {}
    if (repIds.length > 0) {
      const reps = await prisma.user.findMany({
        where: { id: { in: repIds } },
        select: { id: true, name: true },
      })
      for (const r of reps) {
        repMap[r.id] = r.name || ''
      }
    }

    // Flatten nested lead data to match UI CampaignLead interface
    const flatLeads = campaignLeads.map(cl => ({
      id: cl.id,
      leadId: cl.leadId,
      companyName: cl.lead.companyName || '',
      firstName: cl.lead.firstName || '',
      lastName: cl.lead.lastName || '',
      phone: cl.lead.phone || '',
      city: cl.lead.city || '',
      state: cl.lead.state || '',
      stage: cl.funnelStage,
      lastActivityAt: cl.updatedAt.toISOString(),
      repName: cl.assignedRepId ? (repMap[cl.assignedRepId] || '') : '',
    }))

    return NextResponse.json({
      leads: flatLeads,
      total,
      page,
      totalPages,
      funnelCounts,
    })
  } catch (error) {
    console.error('Error fetching campaign leads:', error)
    return NextResponse.json(
      { error: 'Failed to fetch campaign leads', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

// POST /api/campaigns/[id]/leads — Add leads to an existing campaign
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
    }

    const { id: campaignId } = await params
    const body = await request.json()
    const { folderId } = body
    let { leadIds } = body

    const campaign = await prisma.smsCampaign.findUnique({ where: { id: campaignId } })
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }
    if (campaign.status === 'COMPLETED' || campaign.status === 'ARCHIVED') {
      return NextResponse.json({ error: 'Cannot add leads to a completed or archived campaign' }, { status: 400 })
    }

    // Resolve folderId to leadIds if no explicit leadIds provided
    if (folderId && (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0)) {
      const folderLeads = await prisma.lead.findMany({
        where: {
          folderId,
          dncAt: null,
          smsOptedOutAt: null,
          previewUrl: { not: null },
          status: { notIn: ['CLOSED_LOST', 'DO_NOT_CONTACT', 'PAID'] },
        },
        select: { id: true },
      })
      leadIds = folderLeads.map(l => l.id)
    }

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json(
        { error: folderId ? 'No eligible leads found in that folder' : 'leadIds or folderId is required' },
        { status: 400 }
      )
    }

    const uniqueLeadIds = [...new Set(leadIds)] as string[]

    // Filter out leads already in this campaign
    const existing = await prisma.smsCampaignLead.findMany({
      where: { campaignId, leadId: { in: uniqueLeadIds } },
      select: { leadId: true },
    })
    const existingSet = new Set(existing.map(e => e.leadId))
    const newLeadIds = uniqueLeadIds.filter(id => !existingSet.has(id))

    if (newLeadIds.length === 0) {
      return NextResponse.json({ added: 0, skipped: uniqueLeadIds.length, total: campaign.totalLeads })
    }

    // Create SmsCampaignLead records
    await prisma.$transaction(
      newLeadIds.map(leadId =>
        prisma.smsCampaignLead.create({
          data: { campaignId, leadId, funnelStage: 'QUEUED' },
        })
      )
    )

    // Update Lead.lastSmsCampaignId + smsFunnelStage
    await prisma.lead.updateMany({
      where: { id: { in: newLeadIds } },
      data: { lastSmsCampaignId: campaignId, smsFunnelStage: 'QUEUED' },
    })

    // Fresh count for accuracy
    const totalLeads = await prisma.smsCampaignLead.count({ where: { campaignId } })
    await prisma.smsCampaign.update({
      where: { id: campaignId },
      data: { totalLeads },
    })

    return NextResponse.json({
      added: newLeadIds.length,
      skipped: uniqueLeadIds.length - newLeadIds.length,
      total: totalLeads,
    })
  } catch (error) {
    console.error('Error adding leads to campaign:', error)
    return NextResponse.json(
      { error: 'Failed to add leads', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
