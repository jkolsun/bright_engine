import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/leads/[id] - Get lead detail with timeline
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const lead = await prisma.lead.findUnique({
      where: { id },
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
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
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
      'autonomyLevel',
      'buildStep',
      'buildNotes',
    ]

    for (const key of safeFields) {
      if (data[key] !== undefined) allowed[key] = data[key]
    }

    const lead = await prisma.lead.update({
      where: { id },
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

// DELETE /api/leads/[id] - Hard delete (cascades to ALL related data)
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const lead = await prisma.lead.findUnique({
      where: { id }
    })

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    // Use transaction: clean up non-FK orphan tables, then delete lead (cascades the rest)
    await prisma.$transaction([
      prisma.approval.deleteMany({ where: { leadId: id } }),
      prisma.channelDecision.deleteMany({ where: { leadId: id } }),
      prisma.lead.delete({ where: { id } }),
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
