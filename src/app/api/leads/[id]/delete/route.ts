import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

// DELETE /api/leads/[id]/delete - Hard delete lead
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const leadId = id

    const lead = await prisma.lead.findUnique({
      where: { id: leadId }
    })

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    // Use transaction: clean up non-FK orphan tables, then delete lead (cascades the rest)
    await prisma.$transaction([
      prisma.approval.deleteMany({ where: { leadId } }),
      prisma.channelDecision.deleteMany({ where: { leadId } }),
      prisma.lead.delete({ where: { id: leadId } }),
    ])

    return NextResponse.json({
      success: true,
      message: 'Lead permanently deleted',
    })
  } catch (error) {
    console.error('Error deleting lead:', error)
    return NextResponse.json(
      { error: 'Failed to delete lead' },
      { status: 500 }
    )
  }
}
