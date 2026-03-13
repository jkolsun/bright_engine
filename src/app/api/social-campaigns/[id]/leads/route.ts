import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

// POST /api/social-campaigns/[id]/leads
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const sessionCookie = request.cookies.get('session')?.value
  const session = sessionCookie ? await verifySession(sessionCookie) : null
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin required' }, { status: 403 })
  }

  const { id } = await context.params
  const campaign = await prisma.socialCampaign.findUnique({ where: { id } })
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (campaign.status === 'COMPLETED') {
    return NextResponse.json({ error: 'Cannot add leads to a completed campaign' }, { status: 400 })
  }

  const { leadIds } = await request.json()
  if (!leadIds?.length) return NextResponse.json({ error: 'No lead IDs provided' }, { status: 400 })

  const handleField = campaign.channel === 'INSTAGRAM' ? 'instagramHandle' : 'linkedinUrl'
  const leads = await prisma.lead.findMany({
    where: { id: { in: leadIds }, [handleField]: { not: null }, dncAt: null },
    select: { id: true, instagramHandle: true, linkedinUrl: true },
  })

  const toCreate = leads.map(lead => ({
    campaignId: id,
    leadId: lead.id,
    channel: campaign.channel,
    socialHandle: (campaign.channel === 'INSTAGRAM' ? lead.instagramHandle : lead.linkedinUrl) || '',
    funnelStage: 'QUEUED' as const,
  }))

  const result = await prisma.socialCampaignLead.createMany({
    data: toCreate,
    skipDuplicates: true,
  })

  await prisma.socialCampaign.update({
    where: { id },
    data: { totalLeads: { increment: result.count } },
  })

  return NextResponse.json({ added: result.count, skipped: leadIds.length - result.count })
}
