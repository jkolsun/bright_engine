import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

// POST /api/reps/lead-bank/add-to-queue — Rep self-assigns leads to their queue
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { leadIds } = await request.json()

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ error: 'leadIds array required' }, { status: 400 })
    }

    // Validate leads exist and are not excluded statuses
    const validLeads = await prisma.lead.findMany({
      where: {
        id: { in: leadIds },
        status: { notIn: ['DO_NOT_CONTACT', 'CLOSED_LOST', 'PAID'] },
      },
      select: { id: true },
    })

    const validIds = validLeads.map(l => l.id)

    if (validIds.length === 0) {
      return NextResponse.json({ error: 'No valid leads found' }, { status: 400 })
    }

    // Assign leads to this rep (only assignedToId, NOT ownerRepId)
    await prisma.$transaction([
      prisma.lead.updateMany({
        where: { id: { in: validIds } },
        data: { assignedToId: session.userId },
      }),
      prisma.leadEvent.createMany({
        data: validIds.map((leadId: string) => ({
          leadId,
          eventType: 'REASSIGNED' as any,
          metadata: { selfAssigned: true, repId: session.userId },
          actor: 'rep',
        })),
      }),
    ])

    return NextResponse.json({ success: true, assigned: validIds.length })
  } catch (error) {
    console.error('Add to queue error:', error)
    return NextResponse.json({ error: 'Failed to add leads to queue' }, { status: 500 })
  }
}
