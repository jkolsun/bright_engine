import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

// POST /api/social-campaigns/[id]/start
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
  const campaign = await prisma.socialCampaign.findUnique({
    where: { id },
    include: { _count: { select: { leads: true } } },
  })

  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (campaign.status === 'COMPLETED') {
    return NextResponse.json({ error: 'Campaign is already completed' }, { status: 400 })
  }

  // Check if channel is configured
  const settings = await prisma.settings.findUnique({ where: { key: 'social_outreach_settings' } })
  const config = (settings?.value as Record<string, any>) || {}
  const channelConfig = campaign.channel === 'INSTAGRAM' ? config.instagram : config.linkedin
  const isConnected = channelConfig?.connected === true

  await prisma.socialCampaign.update({
    where: { id },
    data: {
      status: 'SENDING',
      startedAt: campaign.startedAt || new Date(),
    },
  })

  // Queue the send job
  const { addSocialCampaignJob } = await import('@/worker/queue')
  await addSocialCampaignJob('send-social-dms', {
    campaignId: id,
    channel: campaign.channel,
    isConnected,
  })

  return NextResponse.json({
    success: true,
    isConnected,
    message: isConnected
      ? 'Campaign started — DMs queuing for send'
      : 'Campaign queued — connect PhantomBuster or Expandi in Settings to begin sending',
  })
}
