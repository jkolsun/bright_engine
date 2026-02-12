import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// PATCH /api/admin/leads/[id] - Admin edit lead (reassign, change status, etc)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json()

    const lead = await prisma.lead.update({
      where: { id: params.id },
      data: {
        ...(data.assignedToId && { assignedToId: data.assignedToId }),
        ...(data.status && { status: data.status }),
        ...(data.priority && { priority: data.priority }),
        ...(data.notes && { notes: data.notes }),
        ...(data.industry && { industry: data.industry })
      }
    })

    // Log the admin change
    await prisma.leadEvent.create({
      data: {
        leadId: lead.id,
        eventType: 'STATUS_CHANGE',
        toStage: data.status || lead.status,
        metadata: {
          changedBy: 'admin',
          changes: Object.keys(data)
        },
        actor: 'admin'
      }
    })

    return NextResponse.json({ lead })
  } catch (error) {
    console.error('Error updating lead:', error)
    return NextResponse.json(
      { error: 'Failed to update lead' },
      { status: 500 }
    )
  }
}

// GET /api/admin/leads/[id] - Get lead details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: params.id },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true }
        },
        activities: true,
        events: {
          orderBy: { createdAt: 'desc' },
          take: 20
        }
      }
    })

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ lead })
  } catch (error) {
    console.error('Error fetching lead:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lead' },
      { status: 500 }
    )
  }
}
