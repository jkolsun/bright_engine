import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

// POST /api/social-campaigns/[id]/leads/[leadId]/book
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; leadId: string }> }
) {
  const sessionCookie = request.cookies.get('session')?.value
  const session = sessionCookie ? await verifySession(sessionCookie) : null
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin required' }, { status: 403 })
  }

  const { id, leadId } = await context.params

  const campaignLead = await prisma.socialCampaignLead.findFirst({
    where: { campaignId: id, leadId },
  })
  if (!campaignLead) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Also support marking as CLOSED via query param
  const action = request.nextUrl.searchParams.get('action') || 'book'
  const stage = action === 'close' ? 'CLOSED' : 'BOOKED'
  const counterField = action === 'close' ? 'closedCount' : 'bookedCount'
  const dateField = action === 'close' ? 'closedAt' : 'bookedAt'

  await prisma.socialCampaignLead.update({
    where: { id: campaignLead.id },
    data: { funnelStage: stage, [dateField]: new Date() },
  })

  await prisma.socialCampaign.update({
    where: { id },
    data: { [counterField]: { increment: 1 } },
  })

  return NextResponse.json({ success: true })
}
