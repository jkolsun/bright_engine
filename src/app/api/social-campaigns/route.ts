import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

// GET /api/social-campaigns
export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')?.value
  const session = sessionCookie ? await verifySession(sessionCookie) : null
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin required' }, { status: 403 })
  }

  const campaigns = await prisma.socialCampaign.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { leads: true } },
    },
  })

  return NextResponse.json({ campaigns })
}

// POST /api/social-campaigns
export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')?.value
  const session = sessionCookie ? await verifySession(sessionCookie) : null
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin required' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const {
      name,
      channel,
      templateDm1,
      templateDm2Click,
      templateDm2NoClick,
      templateDm3,
      bookingLink,
      dm2ClickDelay = 2,
      dm2NoClickDelay = 3,
      dm3Delay = 5,
      leadIds = [],
    } = body

    if (!name || !channel || !templateDm1 || !templateDm2Click || !templateDm2NoClick) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!['INSTAGRAM', 'LINKEDIN'].includes(channel)) {
      return NextResponse.json({ error: 'Invalid channel' }, { status: 400 })
    }

    const campaign = await prisma.socialCampaign.create({
      data: {
        name,
        channel,
        templateDm1,
        templateDm2Click,
        templateDm2NoClick,
        templateDm3: templateDm3 || null,
        bookingLink: bookingLink || null,
        dm2ClickDelay,
        dm2NoClickDelay,
        dm3Delay,
        totalLeads: 0,
      },
    })

    // Add leads if provided
    if (leadIds.length > 0) {
      const added = await addLeadsToCampaign(campaign.id, channel, leadIds)
      await prisma.socialCampaign.update({
        where: { id: campaign.id },
        data: { totalLeads: added },
      })
    }

    return NextResponse.json({ campaign }, { status: 201 })
  } catch (error) {
    console.error('Create social campaign error:', error)
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 })
  }
}

async function addLeadsToCampaign(campaignId: string, channel: string, leadIds: string[]): Promise<number> {
  const handleField = channel === 'INSTAGRAM' ? 'instagramHandle' : 'linkedinUrl'

  const leads = await prisma.lead.findMany({
    where: {
      id: { in: leadIds },
      [handleField]: { not: null },
      dncAt: null,
    },
    select: {
      id: true,
      instagramHandle: true,
      linkedinUrl: true,
    },
  })

  const campaignLeads = leads.map(lead => ({
    campaignId,
    leadId: lead.id,
    channel: channel as 'INSTAGRAM' | 'LINKEDIN',
    socialHandle: (channel === 'INSTAGRAM' ? lead.instagramHandle : lead.linkedinUrl) || '',
    funnelStage: 'QUEUED' as const,
  }))

  if (campaignLeads.length > 0) {
    await prisma.socialCampaignLead.createMany({
      data: campaignLeads,
      skipDuplicates: true,
    })
  }

  return campaignLeads.length
}
