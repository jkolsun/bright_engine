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

    const updated: any[] = []

    switch (action) {
      case 'reassign':
        // Bulk reassign leads to different rep (or unassign with null)
        const targetRepId = payload?.repId || null
        const reassignResults = await Promise.allSettled(
          leadIds.map(async (leadId: string) => {
            return await prisma.$transaction(async (tx) => {
              const lead = await tx.lead.update({
                where: { id: leadId },
                data: { assignedToId: targetRepId }
              })

              await tx.leadEvent.create({
                data: {
                  leadId,
                  eventType: 'STAGE_CHANGE',
                  toStage: targetRepId ? 'REASSIGNED' : 'UNASSIGNED',
                  metadata: { bulkAction: true, newRep: targetRepId },
                  actor: 'admin'
                }
              })

              return lead
            })
          })
        )
        
        reassignResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            updated.push(result.value)
          } else {
            console.error(`Failed to reassign lead ${leadIds[index]}:`, result.reason)
          }
        })
        break

      case 'status':
        // Bulk change status - use transaction for data consistency
        const statusResults = await Promise.allSettled(
          leadIds.map(async (leadId: string) => {
            return await prisma.$transaction(async (tx) => {
              const lead = await tx.lead.update({
                where: { id: leadId },
                data: { status: payload.status, priority: payload.priority }
              })
              
              await tx.leadEvent.create({
                data: {
                  leadId,
                  eventType: 'STAGE_CHANGE',
                  toStage: payload.status,
                  metadata: { bulkAction: true },
                  actor: 'admin'
                }
              })
              
              return lead
            })
          })
        )
        
        statusResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            updated.push(result.value)
          } else {
            console.error(`Failed to update status for lead ${leadIds[index]}:`, result.reason)
          }
        })
        break

      case 'delete':
        // Soft delete (mark as DO_NOT_CONTACT)
        const deleteResults = await Promise.allSettled(
          leadIds.map(async (leadId: string) => {
            return await prisma.lead.update({
              where: { id: leadId },
              data: { status: 'DO_NOT_CONTACT' }
            })
          })
        )
        
        deleteResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            updated.push(result.value)
          } else {
            console.error(`Failed to delete lead ${leadIds[index]}:`, result.reason)
          }
        })
        break
    }

    return NextResponse.json({
      success: true,
      updated: updated.length,
      leads: updated
    })
  } catch (error) {
    console.error('Bulk action error:', error)
    return NextResponse.json(
      { error: 'Bulk action failed' },
      { status: 500 }
    )
  }
}
