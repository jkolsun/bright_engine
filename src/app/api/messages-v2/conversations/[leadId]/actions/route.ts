export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'
import { pushToMessages } from '@/lib/messages-v2-events'
import { markOptedIn } from '@/lib/sms-campaign-service'
import { addRepTask } from '@/lib/rep-queue'

/**
 * POST /api/messages-v2/conversations/[leadId]/actions — Perform actions on a conversation
 * Body: { action, ...payload }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { leadId } = await params
    const body = await request.json()
    const { action, ...payload } = body

    if (!action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 })
    }

    switch (action) {
      case 'mark_dnc': {
        const now = new Date()

        // Update lead DNC fields
        await prisma.lead.update({
          where: { id: leadId },
          data: {
            dncAt: now,
            smsOptedOutAt: now,
          },
        })

        // Archive all active SmsCampaignLeads
        await prisma.smsCampaignLead.updateMany({
          where: { leadId, archivedAt: null },
          data: {
            archivedAt: now,
            archiveReason: 'DNC',
          },
        })

        // Create opt-out event
        await prisma.leadEvent.create({
          data: {
            leadId,
            eventType: 'SMS_OPT_OUT',
            metadata: { source: 'manual_messages_v2', userId: session.userId },
          },
        })

        pushToMessages({
          type: 'LEAD_UPDATE',
          data: { leadId, action: 'mark_dnc' },
          timestamp: new Date().toISOString(),
        })

        return NextResponse.json({ success: true, action: 'mark_dnc' })
      }

      case 'mark_opted_in': {
        // Find most recent non-archived SmsCampaignLead
        const campaignLead = await prisma.smsCampaignLead.findFirst({
          where: { leadId, archivedAt: null },
          orderBy: { createdAt: 'desc' },
        })

        if (!campaignLead) {
          return NextResponse.json({ error: 'No active campaign lead found' }, { status: 400 })
        }

        await markOptedIn(campaignLead.id, 'manual')

        pushToMessages({
          type: 'LEAD_UPDATE',
          data: { leadId, action: 'mark_opted_in' },
          timestamp: new Date().toISOString(),
        })

        return NextResponse.json({ success: true, action: 'mark_opted_in' })
      }

      case 'assign_rep': {
        const { repId } = payload
        if (!repId) {
          return NextResponse.json({ error: 'repId is required' }, { status: 400 })
        }

        await prisma.lead.update({
          where: { id: leadId },
          data: { assignedToId: repId },
        })

        pushToMessages({
          type: 'LEAD_UPDATE',
          data: { leadId, action: 'assign_rep', repId },
          timestamp: new Date().toISOString(),
        })

        return NextResponse.json({ success: true, action: 'assign_rep' })
      }

      case 'create_task': {
        const { repId, priority, taskType, notes } = payload
        if (!priority || !taskType) {
          return NextResponse.json({ error: 'priority and taskType are required' }, { status: 400 })
        }

        const task = await addRepTask({
          leadId,
          repId: repId || undefined,
          priority,
          taskType,
          notes: notes || undefined,
        })

        return NextResponse.json({ success: true, action: 'create_task', task })
      }

      case 'update_autonomy': {
        const { autonomyLevel } = payload
        if (!autonomyLevel || !['FULL_AUTO', 'SEMI_AUTO', 'MANUAL'].includes(autonomyLevel)) {
          return NextResponse.json({ error: 'Valid autonomyLevel is required (FULL_AUTO, SEMI_AUTO, MANUAL)' }, { status: 400 })
        }

        await prisma.closeEngineConversation.update({
          where: { leadId },
          data: { autonomyLevel },
        })

        pushToMessages({
          type: 'LEAD_UPDATE',
          data: { leadId, action: 'update_autonomy', autonomyLevel },
          timestamp: new Date().toISOString(),
        })

        return NextResponse.json({ success: true, action: 'update_autonomy' })
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (error) {
    console.error('Messages V2 action error:', error)
    return NextResponse.json(
      { error: 'Failed to perform action', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
