import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'
import { triggerMeetingCloseDripSequence } from '@/lib/resend'

export const dynamic = 'force-dynamic'

// POST /api/clients/[id]/mark-live — Mark a meeting-close client's site as live
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const commissionAmount = typeof body.commissionAmount === 'number' ? body.commissionAmount : null

    const client = await prisma.client.findUnique({
      where: { id: params.id },
      include: { lead: true, rep: true },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    if (client.clientTrack !== 'MEETING_CLOSE') {
      return NextResponse.json({ error: 'Only meeting-close clients can be marked live' }, { status: 400 })
    }

    if (client.hostingStatus === 'ACTIVE') {
      return NextResponse.json({ error: 'Client is already active' }, { status: 400 })
    }

    const effects: string[] = []
    const repDisplayName = client.repName || client.rep?.name || null
    let commissionCreated = false

    // Wrap core writes in a transaction — if any step fails, nothing commits
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update client: activate + set siteLiveDate
      const updatedClient = await tx.client.update({
        where: { id: params.id },
        data: {
          hostingStatus: 'ACTIVE',
          siteLiveDate: new Date(),
        },
      })
      effects.push('Hosting set to ACTIVE', 'siteLiveDate set')

      // 2. Create commission if amount provided and > 0
      if (commissionAmount && commissionAmount > 0) {
        await tx.commission.create({
          data: {
            repId: client.repId || null,
            repName: repDisplayName,
            clientId: client.id,
            type: 'MONTHLY_RETAINER',
            amount: commissionAmount,
            status: 'PENDING',
            notes: repDisplayName ? `Rep: ${repDisplayName}` : null,
          },
        })
        commissionCreated = true
        effects.push(`$${commissionAmount} MONTHLY_RETAINER commission created${repDisplayName ? ` for ${repDisplayName}` : ''}`)
      } else {
        effects.push('No commission created (no amount entered)')
      }

      // 3. Create LeadEvent if lead exists
      if (client.leadId) {
        await tx.leadEvent.create({
          data: {
            leadId: client.leadId,
            eventType: 'SITE_LIVE',
            metadata: {
              clientId: client.id,
              trigger: 'mark_live',
              commissionCreated,
              commissionAmount: commissionAmount || 0,
            },
          },
        })
        effects.push('LeadEvent SITE_LIVE created')
      }

      // 4. Create admin notification
      const notifMessage = commissionCreated
        ? `${client.companyName} marked live. $${commissionAmount} retainer commission queued${repDisplayName ? ` for ${repDisplayName}` : ''}. 4-touch drip started.`
        : `${client.companyName} marked live. No commission queued. 4-touch drip started.`

      await tx.notification.create({
        data: {
          type: 'SYSTEM_ALERT',
          title: 'Site Marked Live',
          message: notifMessage,
          metadata: {
            clientId: client.id,
            repId: client.repId,
            repName: client.repName,
            commissionCreated,
            commissionAmount: commissionAmount || 0,
            effects,
          },
        },
      })

      return updatedClient
    })

    // 5. Trigger 4-touch meeting-close drip sequence (outside transaction — BullMQ jobs aren't rollbackable)
    try {
      await triggerMeetingCloseDripSequence(client.id)
      effects.push('4-touch drip sequence queued')
    } catch (err) {
      console.error('[Mark Live] Failed to trigger meeting-close drip:', err)
      effects.push('Drip sequence failed to queue')
    }

    return NextResponse.json({ client: updated, effects })
  } catch (error: any) {
    console.error('[Mark Live] Error:', error)
    return NextResponse.json({ error: 'Failed to mark live', detail: error?.message }, { status: 500 })
  }
}
