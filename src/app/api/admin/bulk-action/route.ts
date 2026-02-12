import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// POST /api/admin/bulk-action - Bulk operations on leads
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { action, leadIds, payload } = data

    if (!action || !leadIds || !Array.isArray(leadIds)) {
      return NextResponse.json(
        { error: 'Missing action or leadIds' },
        { status: 400 }
      )
    }

    const updated = []

    switch (action) {
      case 'reassign':
        // Bulk reassign leads to different rep
        for (const leadId of leadIds) {
          const lead = await prisma.lead.update({
            where: { id: leadId },
            data: { assignedToId: payload.repId }
          })
          
          await prisma.leadEvent.create({
            data: {
              leadId,
              eventType: 'STAGE_CHANGE',
              toStage: 'REASSIGNED',
              metadata: { bulkAction: true, newRep: payload.repId },
              actor: 'admin'
            }
          })
          
          updated.push(lead)
        }
        break

      case 'status':
        // Bulk change status
        for (const leadId of leadIds) {
          const lead = await prisma.lead.update({
            where: { id: leadId },
            data: { status: payload.status, priority: payload.priority }
          })
          
          await prisma.leadEvent.create({
            data: {
              leadId,
              eventType: 'STAGE_CHANGE',
              toStage: payload.status,
              metadata: { bulkAction: true },
              actor: 'admin'
            }
          })
          
          updated.push(lead)
        }
        break

      case 'delete':
        // Soft delete (mark as DO_NOT_CONTACT)
        for (const leadId of leadIds) {
          const lead = await prisma.lead.update({
            where: { id: leadId },
            data: { status: 'DO_NOT_CONTACT' }
          })
          updated.push(lead)
        }
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
