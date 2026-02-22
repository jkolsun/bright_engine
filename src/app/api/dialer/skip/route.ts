import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * POST /api/dialer/skip
 * Skips a lead in the queue without logging a call outcome.
 * Does NOT change lead status or remove from queue.
 */
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { leadId } = await request.json()

    if (!leadId) {
      return NextResponse.json({ error: 'leadId required' }, { status: 400 })
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true },
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    const repId = (session as any).id || (session as any).userId
    const repName = session.name || 'Rep'

    await prisma.leadEvent.create({
      data: {
        leadId: lead.id,
        eventType: 'SKIPPED',
        actor: `rep:${repId}`,
        metadata: { repId, repName, timestamp: new Date().toISOString() },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Skip error:', error)
    return NextResponse.json(
      { error: 'Failed to skip lead', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
