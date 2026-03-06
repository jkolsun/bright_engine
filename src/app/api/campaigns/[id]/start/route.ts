import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'
import { startCampaign } from '@/lib/sms-campaign-service'

export const dynamic = 'force-dynamic'

// POST /api/campaigns/[id]/start — Start sending cold texts
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

    const { id } = await params

    // Verify campaign exists and is in a startable state
    const campaign = await prisma.smsCampaign.findUnique({ where: { id } })
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    if (campaign.status !== 'DRAFT' && campaign.status !== 'PAUSED') {
      return NextResponse.json(
        { error: `Campaign cannot be started from status "${campaign.status}"` },
        { status: 400 }
      )
    }

    await startCampaign(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error starting campaign:', error)
    return NextResponse.json(
      { error: 'Failed to start campaign', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
