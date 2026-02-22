import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * POST /api/dialer/note
 * Adds a free-text note to a lead.
 */
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { leadId, text } = await request.json()

    if (!leadId || !text) {
      return NextResponse.json({ error: 'leadId and text required' }, { status: 400 })
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
        leadId,
        eventType: 'REP_NOTE',
        actor: `rep:${repId}`,
        metadata: {
          repId,
          repName,
          text,
          timestamp: new Date().toISOString(),
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Note error:', error)
    return NextResponse.json(
      { error: 'Failed to add note', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
