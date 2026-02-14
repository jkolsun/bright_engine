import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

// DELETE /api/leads/[id] - Soft delete (mark as CLOSED_LOST)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Admin-only access check
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const leadId = params.id

    const lead = await prisma.lead.findUnique({
      where: { id: leadId }
    })

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    // Soft delete: mark as CLOSED_LOST
    const updated = await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: 'CLOSED_LOST'
      }
    })

    // Log deletion event
    await prisma.leadEvent.create({
      data: {
        leadId,
        eventType: 'ESCALATED',
        toStage: 'CLOSED_LOST',
        actor: 'system',
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Lead deleted successfully',
      lead: updated
    })
  } catch (error) {
    console.error('Error deleting lead:', error)
    return NextResponse.json(
      { error: 'Failed to delete lead' },
      { status: 500 }
    )
  }
}
