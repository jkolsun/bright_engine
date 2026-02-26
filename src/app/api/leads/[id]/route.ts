import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

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
        client: true,
        upsellTags: {
          where: { removedAt: null },
          select: { id: true, productName: true, productPrice: true, taggedAt: true, addedByRepId: true },
          orderBy: { taggedAt: 'desc' },
        },
        dialerCalls: {
          select: {
            id: true, status: true, dispositionResult: true, notes: true,
            duration: true, connectedAt: true, startedAt: true,
            wasRecommended: true, previewSentDuringCall: true, previewSentChannel: true,
            rep: { select: { name: true } },
          },
          orderBy: { startedAt: 'desc' },
          take: 20,
        },
        callbackSchedules: {
          select: { id: true, scheduledAt: true, completedAt: true, status: true, notes: true, rep: { select: { name: true } } },
          orderBy: { scheduledAt: 'desc' },
        },
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

    // Auth check
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const data = await request.json()

    // Extract metadata before whitelist filtering
    const _editedField = data._editedField as string | undefined
    const _previousValue = data._previousValue as string | undefined

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
      'secondaryPhone',
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
          actor: session.role === 'ADMIN' ? 'admin' : `rep:${session.userId}`,
        },
      })
    }

    // Contact field edit side-effects (fire-and-forget)
    if (_editedField && ['phone', 'secondaryPhone', 'email'].includes(_editedField)) {
      // Auto-archive old primary phone as LeadContact
      if (_editedField === 'phone' && _previousValue && _previousValue !== allowed.phone) {
        prisma.leadContact.findFirst({ where: { leadId: id, value: _previousValue } }).then(existing => {
          if (!existing) {
            return prisma.leadContact.create({
              data: { leadId: id, type: 'PHONE', value: _previousValue, label: 'Previous Primary', addedBy: session.userId }
            })
          }
        }).catch(err => console.error('[LeadUpdate] Auto-archive failed:', err))
      }

      // LeadEvent
      prisma.leadEvent.create({
        data: {
          leadId: id,
          eventType: 'STAGE_CHANGE',
          actor: `rep:${session.userId}`,
          metadata: { source: 'dialer_edit', field: _editedField, previousValue: _previousValue, newValue: allowed[_editedField], editedBy: session.userId },
        },
      }).catch(err => console.error('[LeadUpdate] Event write failed:', err))

      // Admin notification
      prisma.user.findUnique({ where: { id: session.userId }, select: { name: true } }).then(rep => {
        return prisma.notification.create({
          data: {
            type: 'SYSTEM_ALERT',
            title: 'Lead Contact Updated',
            message: `${rep?.name || 'A rep'} changed ${_editedField} on ${lead.companyName} from "${_previousValue || '(empty)'}" to "${allowed[_editedField]}"`,
            metadata: { leadId: id, field: _editedField, previousValue: _previousValue, newValue: allowed[_editedField], repId: session.userId },
          },
        })
      }).catch(err => console.error('[LeadUpdate] Notification write failed:', err))
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
