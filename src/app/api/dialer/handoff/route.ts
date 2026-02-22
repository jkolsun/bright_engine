import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * POST /api/dialer/handoff
 * Hands a lead off to the AI (Close Engine).
 * Sets aiFollowup=true and stores handoff context. Does NOT change lead status enum.
 */
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { leadId, notes, context } = await request.json()

    if (!leadId) {
      return NextResponse.json({ error: 'leadId required' }, { status: 400 })
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true, companyName: true, status: true },
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    const repId = (session as any).id || (session as any).userId
    const repName = session.name || 'Rep'

    // Build handoff context with rep name
    const handoffContext = {
      repName,
      repId,
      notes: notes || '',
      discussed: context?.discussed || [],
      interestedIn: context?.interestedIn || '',
      objections: context?.objections || [],
      previewStatus: context?.previewStatus || '',
      upsellsPitched: context?.upsellsPitched || [],
      handoffTimestamp: new Date().toISOString(),
    }

    // Update lead: set aiFollowup, store context. Do NOT change status enum.
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        aiFollowup: true,
        handoffContext: handoffContext as any,
        // Keep status as-is (typically QUALIFIED). LeadStatus enum has no AI_FOLLOWUP value.
      },
    })

    // Create LeadEvent
    await prisma.leadEvent.create({
      data: {
        leadId: lead.id,
        eventType: 'AI_HANDOFF',
        actor: `rep:${repId}`,
        metadata: {
          repId,
          repName,
          notes: notes || '',
          discussed: context?.discussed || [],
          interestedIn: context?.interestedIn || '',
          objections: context?.objections || [],
          previewStatus: context?.previewStatus || '',
          upsellsPitched: context?.upsellsPitched || [],
          timestamp: new Date().toISOString(),
        },
      },
    })

    // Notify admin
    await prisma.notification.create({
      data: {
        type: 'CLOSE_ENGINE',
        title: 'AI Handoff',
        message: `${repName} handed off ${lead.companyName} to AI.`,
        metadata: { leadId: lead.id, repId, repName },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Handoff error:', error)
    return NextResponse.json(
      { error: 'Failed to hand off lead', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
