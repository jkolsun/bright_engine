import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { buildTimeline } from '@/lib/sms-campaign-timeline'

export const dynamic = 'force-dynamic'

// GET /api/campaigns/[id]/leads/[leadId]/timeline — Full timeline for one lead in a campaign
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; leadId: string }> }
) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id: campaignId, leadId } = await params

    const timeline = await buildTimeline(campaignId, leadId)

    return NextResponse.json({ timeline })
  } catch (error) {
    console.error('Error building timeline:', error)
    return NextResponse.json(
      { error: 'Failed to build timeline', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
