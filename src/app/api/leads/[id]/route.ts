import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/leads/[id] - Get lead detail with timeline
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
        events: {
          orderBy: { createdAt: 'desc' },
          take: 50
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 50
        },
        activities: {
          include: {
            rep: {
              select: { id: true, name: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 50
        },
        client: true
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

// PUT /api/leads/[id] - Update lead
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json()

    // Whitelist allowed fields to prevent injection
    const allowed: Record<string, any> = {}
    const safeFields = [
      'status',
      'priority',
      'notes',
      'firstName',
      'lastName',
      'email',
      'phone',
      'companyName',
      'city',
      'state',
      'website',
      'industry',
    ]

    for (const key of safeFields) {
      if (data[key] !== undefined) allowed[key] = data[key]
    }

    const lead = await prisma.lead.update({
      where: { id: params.id },
      data: {
        ...allowed,
        updatedAt: new Date(),
      },
    })

    // Log status change if status was updated
    if (data.status) {
      await prisma.leadEvent.create({
        data: {
          leadId: lead.id,
          eventType: 'STAGE_CHANGE',
          toStage: data.status,
          actor: 'admin',
        },
      })
    }

    return NextResponse.json({ lead })
  } catch (error) {
    console.error('Error updating lead:', error)
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 })
  }
}

// DELETE /api/leads/[id] - Soft delete (mark as CLOSED_LOST)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
