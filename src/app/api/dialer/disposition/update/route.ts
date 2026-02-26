export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'
import { pushToRep, pushToAllAdmins } from '@/lib/dialer-events'

const VALID_DISPOSITIONS = [
  'WANTS_TO_MOVE_FORWARD', 'NOT_INTERESTED', 'CALLBACK', 'INTERESTED_VERBAL',
  'WANTS_CHANGES', 'WILL_LOOK_LATER', 'DNC', 'NO_ANSWER', 'VOICEMAIL',
  'WRONG_NUMBER', 'DISCONNECTED',
]

const SESSION_DISPOSITION_FIELD: Record<string, string> = {
  WANTS_TO_MOVE_FORWARD: 'wantsToMoveForwardCount',
  CALLBACK: 'callbackCount',
  INTERESTED_VERBAL: 'interestedVerbalCount',
  WANTS_CHANGES: 'wantsChangesCount',
  WILL_LOOK_LATER: 'willLookLaterCount',
  DNC: 'dncCount',
  WRONG_NUMBER: 'wrongNumberCount',
  DISCONNECTED: 'disconnectedCount',
}

const DISPOSITION_STATUS_MAP: Record<string, string> = {
  WANTS_TO_MOVE_FORWARD: 'QUALIFIED',
  NOT_INTERESTED: 'CLOSED_LOST',
  DNC: 'DO_NOT_CONTACT',
  CALLBACK: 'QUALIFIED',
  INTERESTED_VERBAL: 'QUALIFIED',
  WANTS_CHANGES: 'QUALIFIED',
  WRONG_NUMBER: 'CLOSED_LOST',
  DISCONNECTED: 'CLOSED_LOST',
}

const INTERESTED_RESULTS = ['WANTS_TO_MOVE_FORWARD', 'CALLBACK', 'INTERESTED_VERBAL', 'WANTS_CHANGES']
const NOT_INTERESTED_RESULTS = ['NOT_INTERESTED', 'DNC']

function buildSessionStatChanges(oldResult: string, newResult: string): Record<string, { increment: number }> {
  const changes: Record<string, { increment: number }> = {}

  const apply = (field: string, delta: number) => {
    if (!changes[field]) changes[field] = { increment: 0 }
    changes[field].increment += delta
  }

  // Decrement old
  const oldField = SESSION_DISPOSITION_FIELD[oldResult]
  if (oldField) apply(oldField, -1)
  if (oldResult === 'VOICEMAIL') apply('voicemails', -1)
  if (['NO_ANSWER', 'BUSY', 'FAILED'].includes(oldResult)) apply('noAnswers', -1)
  if (INTERESTED_RESULTS.includes(oldResult)) apply('interestedCount', -1)
  if (NOT_INTERESTED_RESULTS.includes(oldResult)) apply('notInterestedCount', -1)

  // Increment new
  const newField = SESSION_DISPOSITION_FIELD[newResult]
  if (newField) apply(newField, 1)
  if (newResult === 'VOICEMAIL') apply('voicemails', 1)
  if (['NO_ANSWER', 'BUSY', 'FAILED'].includes(newResult)) apply('noAnswers', 1)
  if (INTERESTED_RESULTS.includes(newResult)) apply('interestedCount', 1)
  if (NOT_INTERESTED_RESULTS.includes(newResult)) apply('notInterestedCount', 1)

  // Remove zero-delta entries
  for (const key of Object.keys(changes)) {
    if (changes[key].increment === 0) delete changes[key]
  }

  return changes
}

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { callId, newResult } = await request.json()

    if (!callId || !newResult) {
      return NextResponse.json({ error: 'callId and newResult are required' }, { status: 400 })
    }
    if (!VALID_DISPOSITIONS.includes(newResult)) {
      return NextResponse.json({ error: `Invalid disposition: ${newResult}` }, { status: 400 })
    }

    const call = await prisma.dialerCall.findUnique({
      where: { id: callId },
      include: {
        lead: { select: { id: true, phone: true, status: true } },
        session: { select: { id: true } },
      },
    })

    if (!call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 })
    }
    if (!call.dispositionResult) {
      return NextResponse.json({ error: 'Call has not been dispositioned yet' }, { status: 400 })
    }

    const oldResult = call.dispositionResult

    if (oldResult === newResult) {
      return NextResponse.json({ success: true, changed: false, oldResult, newResult })
    }

    // Update DialerCall disposition
    await prisma.dialerCall.update({
      where: { id: callId },
      data: { dispositionResult: newResult },
    })

    // Adjust session stats (decrement old, increment new)
    if (call.session?.id) {
      const statChanges = buildSessionStatChanges(oldResult, newResult)
      if (Object.keys(statChanges).length > 0) {
        await prisma.dialerSessionNew.update({
          where: { id: call.session.id },
          data: statChanges,
        }).catch(() => {})
      }
    }

    // Update lead status
    if (call.lead) {
      const newLeadStatus = DISPOSITION_STATUS_MAP[newResult]
      if (newLeadStatus) {
        const updateData: Record<string, unknown> = { status: newLeadStatus }

        if (newResult === 'DNC') {
          updateData.dncAt = new Date()
          await prisma.doNotCall.upsert({
            where: { phone: call.lead.phone },
            create: { phone: call.lead.phone },
            update: {},
          }).catch(() => {})
        }

        await prisma.lead.update({
          where: { id: call.lead.id },
          data: updateData,
        }).catch(() => {})
      }

      // If moving away from DNC, clear DNC status
      if (oldResult === 'DNC' && newResult !== 'DNC') {
        await prisma.doNotCall.delete({
          where: { phone: call.lead.phone },
        }).catch(() => {})
        await prisma.lead.update({
          where: { id: call.lead.id },
          data: { dncAt: null },
        }).catch(() => {})
      }
    }

    // Audit trail
    if (call.lead) {
      await prisma.leadEvent.create({
        data: {
          leadId: call.lead.id,
          eventType: 'CALL_MADE',
          actor: `rep:${session.userId}`,
          metadata: {
            source: 'dialer_redisposition',
            callId: call.id,
            oldDisposition: oldResult,
            newDisposition: newResult,
          },
        },
      }).catch(() => {})
    }

    // Push SSE
    const sseEvent = {
      type: 'DISPOSITION_LOGGED' as const,
      data: {
        callId: call.id,
        leadId: call.leadId,
        disposition: newResult,
        oldDisposition: oldResult,
        isReDisposition: true,
        connected: !!call.connectedAt,
        duration: call.duration,
      },
      timestamp: new Date().toISOString(),
    }
    pushToRep(call.repId, sseEvent)
    pushToAllAdmins({ ...sseEvent, data: { ...sseEvent.data, repId: call.repId } })

    return NextResponse.json({ success: true, changed: true, oldResult, newResult })
  } catch (error) {
    console.error('[Dialer] Re-disposition error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
