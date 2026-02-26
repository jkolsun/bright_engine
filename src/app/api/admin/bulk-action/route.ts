import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

// POST /api/admin/bulk-action - Bulk operations on leads
export async function POST(request: NextRequest) {
  try {
    // Admin-only access check
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const data = await request.json()
    const { action, leadIds, payload } = data

    if (!action || !leadIds || !Array.isArray(leadIds)) {
      return NextResponse.json(
        { error: 'Missing action or leadIds' },
        { status: 400 }
      )
    }

    let updated = 0

    switch (action) {
      case 'reassign': {
        const targetRepId = payload?.repId || null
        const [updateResult] = await prisma.$transaction([
          prisma.lead.updateMany({
            where: { id: { in: leadIds } },
            data: { assignedToId: targetRepId },
          }),
          prisma.leadEvent.createMany({
            data: leadIds.map((leadId: string) => ({
              leadId,
              eventType: 'STAGE_CHANGE',
              toStage: targetRepId ? 'REASSIGNED' : 'UNASSIGNED',
              metadata: { bulkAction: true, newRep: targetRepId },
              actor: 'admin',
            })),
          }),
        ])
        updated = updateResult.count
        break
      }

      case 'status': {
        const updateData: any = { status: payload.status, priority: payload.priority }
        if (payload.status === 'DO_NOT_CONTACT') {
          updateData.dncAt = new Date()
          updateData.dncReason = 'Admin bulk action from LeadBank'
          updateData.dncAddedBy = 'admin'
        }
        const [updateResult] = await prisma.$transaction([
          prisma.lead.updateMany({
            where: { id: { in: leadIds } },
            data: updateData,
          }),
          prisma.leadEvent.createMany({
            data: leadIds.map((leadId: string) => ({
              leadId,
              eventType: 'STAGE_CHANGE',
              toStage: payload.status,
              metadata: { bulkAction: true },
              actor: 'admin',
            })),
          }),
        ])
        updated = updateResult.count
        break
      }

      case 'delete': {
        const result = await prisma.lead.updateMany({
          where: { id: { in: leadIds } },
          data: { status: 'DO_NOT_CONTACT' },
        })
        updated = result.count
        break
      }
    }

    return NextResponse.json({
      success: true,
      updated,
    })
  } catch (error) {
    console.error('Bulk action error:', error)
    return NextResponse.json(
      { error: 'Bulk action failed' },
      { status: 500 }
    )
  }
}
