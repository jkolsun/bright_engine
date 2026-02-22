import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/admin/leads/[id]/reassign
 * Reassigns a lead to a different rep.
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const { id } = await context.params
    const { newRepId, reason } = await request.json()

    if (!newRepId) {
      return NextResponse.json({ error: 'newRepId required' }, { status: 400 })
    }

    const lead = await prisma.lead.findUnique({
      where: { id },
      select: {
        id: true,
        companyName: true,
        assignedToId: true,
        assignedTo: { select: { id: true, name: true } },
      },
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    const newRep = await prisma.user.findUnique({
      where: { id: newRepId },
      select: { id: true, name: true },
    })

    if (!newRep) {
      return NextResponse.json({ error: 'New rep not found' }, { status: 404 })
    }

    const oldRepId = lead.assignedToId
    const oldRepName = lead.assignedTo?.name || 'Unassigned'
    const adminId = (session as any).id || (session as any).userId

    // Update lead assignment
    await prisma.lead.update({
      where: { id },
      data: { assignedToId: newRepId },
    })

    // Create LeadEvent
    await prisma.leadEvent.create({
      data: {
        leadId: id,
        eventType: 'REASSIGNED',
        actor: 'admin',
        metadata: {
          oldRepId,
          oldRepName,
          newRepId: newRep.id,
          newRepName: newRep.name,
          reason: reason || null,
          adminId,
          timestamp: new Date().toISOString(),
        },
      },
    })

    // Notify admin
    await prisma.notification.create({
      data: {
        type: 'CLOSE_ENGINE',
        title: 'Lead Reassigned',
        message: `${lead.companyName} reassigned from ${oldRepName} to ${newRep.name}.${reason ? ` Reason: ${reason}` : ''}`,
        metadata: { leadId: id, oldRepId, newRepId: newRep.id },
      },
    })

    return NextResponse.json({
      success: true,
      oldRep: { id: oldRepId, name: oldRepName },
      newRep: { id: newRep.id, name: newRep.name },
    })
  } catch (error) {
    console.error('Reassign error:', error)
    return NextResponse.json(
      { error: 'Failed to reassign lead', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
