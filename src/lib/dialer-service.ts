/**
 * Power Dialer Service Layer
 * Central business logic for all dialer operations.
 * Handles sessions, calls, dispositions, VM drop, callbacks, and all integrations.
 */

import { prisma } from './db'
import { isDNC } from './dnc-check'
import { getTwilioClient } from './twilio'
import { pushToRep, pushToAllAdmins } from './dialer-events'
import { calculateEngagementScore } from './engagement-scoring'
import { processHotLeadEvent } from './hot-lead-notifications'
import { dispatchWebhook } from './webhook-dispatcher'
import { triggerCloseEngine } from './close-engine'

// ============================================
// Types
// ============================================

export interface InitiateCallResult {
  callId: string
  phoneToCall: string
  leadId: string
  callerId: string
  error?: never
}

export interface InitiateCallError {
  callId?: never
  phoneToCall?: never
  leadId?: never
  error: string
  code: 'DNC' | 'OWNERSHIP_CONFLICT' | 'LEAD_NOT_FOUND' | 'CONFIG_ERROR' | 'UNKNOWN'
}

export type InitiateCallResponse = InitiateCallResult | InitiateCallError

// Disposition result → Lead status mapping (only valid LeadStatus enum values)
const DISPOSITION_STATUS_MAP: Record<string, string> = {
  WANTS_TO_MOVE_FORWARD: 'QUALIFIED',
  NOT_INTERESTED: 'CLOSED_LOST',
  DNC: 'DO_NOT_CONTACT',
  CALLBACK: 'QUALIFIED',
  INTERESTED_VERBAL: 'QUALIFIED',
  WANTS_CHANGES: 'QUALIFIED',
  WRONG_NUMBER: 'CLOSED_LOST',
  DISCONNECTED: 'CLOSED_LOST',
  // WILL_LOOK_LATER, NO_ANSWER, VOICEMAIL — no status change (keep current status)
}

// Dispositions indicating the lead is interested
const INTERESTED_DISPOSITIONS = [
  'WANTS_TO_MOVE_FORWARD',
  'CALLBACK',
  'INTERESTED_VERBAL',
  'WANTS_CHANGES',
]

// Dispositions that count as a conversation (connected + talked)
const CONVERSATION_DISPOSITIONS = [
  'WANTS_TO_MOVE_FORWARD',
  'NOT_INTERESTED',
  'CALLBACK',
  'INTERESTED_VERBAL',
  'WANTS_CHANGES',
  'WILL_LOOK_LATER',
  'DNC',
]

// Dispositions that count as a close
const CLOSE_DISPOSITIONS = ['WANTS_TO_MOVE_FORWARD']

// ============================================
// Session Management
// ============================================

export async function startSession(repId: string, autoDialEnabled: boolean = false) {
  // End any existing active sessions for this rep
  await prisma.dialerSessionNew.updateMany({
    where: { repId, isActive: true },
    data: { isActive: false, endedAt: new Date() },
  })

  const session = await prisma.dialerSessionNew.create({
    data: {
      repId,
      autoDialEnabled,
    },
  })

  pushToAllAdmins({
    type: 'SESSION_UPDATE',
    data: { action: 'session_started', sessionId: session.id, repId },
    timestamp: new Date().toISOString(),
  })

  return session
}

export async function endSession(sessionId: string) {
  const session = await prisma.dialerSessionNew.findUnique({
    where: { id: sessionId },
    include: {
      calls: {
        select: { id: true, status: true, duration: true, connectedAt: true, dispositionResult: true },
      },
    },
  })

  if (!session) throw new Error('Session not found')

  // Calculate final stats
  const connectedCalls = session.calls.filter((c) => c.connectedAt).length
  const totalDuration = session.calls.reduce((sum, c) => sum + (c.duration || 0), 0)
  const avgDuration = connectedCalls > 0 ? totalDuration / connectedCalls : 0

  const updated = await prisma.dialerSessionNew.update({
    where: { id: sessionId },
    data: {
      isActive: false,
      endedAt: new Date(),
      avgCallDuration: avgDuration,
    },
  })

  // Sweep orphaned calls — give fallback dispositions so they appear in Lead Bank
  const orphanedCalls = session.calls.filter(c => !c.dispositionResult)

  if (orphanedCalls.length > 0) {
    const vmIds = orphanedCalls
      .filter(c => c.status === 'VOICEMAIL')
      .map(c => c.id)
    const otherIds = orphanedCalls
      .filter(c => c.status !== 'VOICEMAIL')
      .map(c => c.id)

    const updates: Promise<any>[] = []
    if (vmIds.length > 0) {
      updates.push(
        prisma.dialerCall.updateMany({
          where: { id: { in: vmIds }, dispositionResult: null },
          data: { dispositionResult: 'VOICEMAIL' },
        })
      )
    }
    if (otherIds.length > 0) {
      updates.push(
        prisma.dialerCall.updateMany({
          where: { id: { in: otherIds }, dispositionResult: null },
          data: { dispositionResult: 'NO_ANSWER' },
        })
      )
    }

    await Promise.all(updates)
    console.log(`[SessionEnd] Fallback-dispositioned ${orphanedCalls.length} orphaned calls (${vmIds.length} VM, ${otherIds.length} other)`)
  }

  // Safety net log only — real RepActivity updates happen incrementally in initiateCall (dials),
  // autoDisposition (voicemails/noAnswers), and logDisposition (conversations + per-disposition).
  // Closes only come from Stripe payment confirmation.
  await upsertRepActivity(session.repId, {
    dials: session.totalCalls,
    conversations: session.connectedCalls,
    closes: 0,
    previewLinksSent: session.previewsSent,
    previewsOpened: session.previewsOpened,
  })

  pushToAllAdmins({
    type: 'SESSION_UPDATE',
    data: {
      action: 'session_ended',
      sessionId,
      repId: session.repId,
      stats: {
        totalCalls: session.totalCalls,
        connectedCalls,
        avgDuration: Math.round(avgDuration),
      },
    },
    timestamp: new Date().toISOString(),
  })

  return updated
}

export async function getActiveSession(repId: string) {
  return prisma.dialerSessionNew.findFirst({
    where: { repId, isActive: true },
    orderBy: { startedAt: 'desc' },
  })
}

export async function updateSessionSettings(sessionId: string, autoDialEnabled: boolean) {
  return prisma.dialerSessionNew.update({
    where: { id: sessionId },
    data: { autoDialEnabled },
  })
}

/**
 * Merge client-side session stats into the DialerSessionNew record.
 * Uses Math.max to avoid decrementing if server already has higher values
 * from concurrent updates. (NEW-M4/L1 fix)
 */
export async function mergeClientStats(
  sessionId: string,
  stats: Record<string, number>,
) {
  const current = await prisma.dialerSessionNew.findUnique({
    where: { id: sessionId },
    select: {
      totalCalls: true, connectedCalls: true, voicemails: true, noAnswers: true,
      previewsSent: true, callbacksScheduled: true, interestedCount: true, notInterestedCount: true,
      wantsToMoveForwardCount: true, callbackCount: true, interestedVerbalCount: true,
      wantsChangesCount: true, willLookLaterCount: true, dncCount: true,
      wrongNumberCount: true, disconnectedCount: true,
    },
  })
  if (!current) return null

  return prisma.dialerSessionNew.update({
    where: { id: sessionId },
    data: {
      totalCalls: Math.max(current.totalCalls, stats.dials ?? 0),
      connectedCalls: Math.max(current.connectedCalls, stats.connects ?? 0),
      voicemails: Math.max(current.voicemails, stats.voicemails ?? 0),
      noAnswers: Math.max(current.noAnswers, stats.noAnswer ?? 0),
      previewsSent: Math.max(current.previewsSent, stats.previewsSent ?? 0),
      callbacksScheduled: Math.max(current.callbacksScheduled, stats.callbacks ?? 0),
      interestedCount: Math.max(current.interestedCount, stats.interested ?? 0),
      notInterestedCount: Math.max(current.notInterestedCount, stats.notInterested ?? 0),
      wantsToMoveForwardCount: Math.max(current.wantsToMoveForwardCount, stats.wantsToMoveForwardCount ?? 0),
      callbackCount: Math.max(current.callbackCount, stats.callbackCount ?? 0),
      interestedVerbalCount: Math.max(current.interestedVerbalCount, stats.interestedVerbalCount ?? 0),
      wantsChangesCount: Math.max(current.wantsChangesCount, stats.wantsChangesCount ?? 0),
      willLookLaterCount: Math.max(current.willLookLaterCount, stats.willLookLaterCount ?? 0),
      dncCount: Math.max(current.dncCount, stats.dncCount ?? 0),
      wrongNumberCount: Math.max(current.wrongNumberCount, stats.wrongNumberCount ?? 0),
      disconnectedCount: Math.max(current.disconnectedCount, stats.disconnectedCount ?? 0),
    },
  })
}

// ============================================
// Call Operations
// ============================================

export async function initiateCall(
  repId: string,
  leadId: string,
  sessionId?: string,
  phone?: string
): Promise<InitiateCallResponse> {
  // Load lead
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: {
      id: true,
      phone: true,
      secondaryPhone: true,
      dncAt: true,
      status: true,
      ownerRepId: true,
      companyName: true,
    },
  })

  if (!lead) {
    return { error: 'Lead not found', code: 'LEAD_NOT_FOUND' }
  }

  const phoneToCall = phone || lead.phone
  if (!phoneToCall) {
    return { error: 'No phone number available', code: 'LEAD_NOT_FOUND' }
  }

  // Bug 3: DNC check at dial time
  const blocked = await isDNC(phoneToCall, leadId)
  if (blocked) {
    return { error: 'Lead is on Do Not Call list', code: 'DNC' }
  }

  // Bug 4: Atomic ownership claim — prevent two reps calling same lead
  if (!lead.ownerRepId) {
    const claimed = await prisma.lead.updateMany({
      where: { id: leadId, ownerRepId: null },
      data: { ownerRepId: repId },
    })
    if (claimed.count === 0) {
      return { error: 'Another rep has already claimed this lead', code: 'OWNERSHIP_CONFLICT' }
    }
  } else if (lead.ownerRepId !== repId) {
    return { error: 'Lead is owned by another rep', code: 'OWNERSHIP_CONFLICT' }
  }

  // Get rep's twilio numbers for caller ID rotation
  const rep = await prisma.user.findUnique({
    where: { id: repId },
    select: { twilioNumber1: true, twilioNumber2: true },
  })

  if (!rep?.twilioNumber1) {
    return { error: 'Rep has no assigned Twilio number', code: 'CONFIG_ERROR' }
  }

  // Number rotation: alternate between twilioNumber1 and twilioNumber2 per call
  let callerId = rep.twilioNumber1
  if (rep.twilioNumber2 && sessionId) {
    const sessionCallCount = await prisma.dialerCall.count({
      where: { sessionId, repId },
    })
    // Even count → number1, odd count → number2 (alternates each call)
    callerId = sessionCallCount % 2 === 0 ? rep.twilioNumber1 : rep.twilioNumber2
  }

  // Create DialerCall record
  const call = await prisma.dialerCall.create({
    data: {
      leadId,
      repId,
      sessionId: sessionId || undefined,
      direction: 'OUTBOUND',
      phoneNumberUsed: phoneToCall,
      status: 'INITIATED',
    },
  })

  // Increment session totalCalls
  if (sessionId) {
    await prisma.dialerSessionNew.update({
      where: { id: sessionId },
      data: { totalCalls: { increment: 1 } },
    }).catch(() => { /* session may not exist */ })
  }

  // Track dial in RepActivity immediately (Bug C fix: count at initiation, not disposition)
  await upsertRepActivityIncremental(repId, { dials: 1 })

  // Push SSE
  const sseEvent = {
    type: 'CALL_STATUS' as const,
    data: {
      callId: call.id,
      leadId,
      status: 'INITIATED',
      phone: phoneToCall,
      companyName: lead.companyName,
    },
    timestamp: new Date().toISOString(),
  }
  pushToRep(repId, sseEvent)
  pushToAllAdmins({ ...sseEvent, data: { ...sseEvent.data, repId } })

  return { callId: call.id, phoneToCall, leadId, callerId }
}

export async function endCall(callId: string) {
  const call = await prisma.dialerCall.findUnique({
    where: { id: callId },
    select: {
      id: true,
      repId: true,
      leadId: true,
      twilioCallSid: true,
      connectedAt: true,
      status: true,
    },
  })

  if (!call) throw new Error('Call not found')

  // Calculate duration if call was connected
  const duration = call.connectedAt
    ? Math.round((Date.now() - call.connectedAt.getTime()) / 1000)
    : 0

  const updated = await prisma.dialerCall.update({
    where: { id: callId },
    data: {
      status: 'COMPLETED',
      endedAt: new Date(),
      duration: duration || undefined,
    },
  })

  // Hang up via Twilio REST if we have a SID
  if (call.twilioCallSid) {
    try {
      const client = getTwilioClient()
      await client.calls(call.twilioCallSid).update({ status: 'completed' })
    } catch (err) {
      console.error('[DialerService] Error hanging up Twilio call:', err)
    }
  }

  // Push SSE
  const sseEvent = {
    type: 'CALL_STATUS' as const,
    data: {
      callId: call.id,
      leadId: call.leadId,
      status: 'COMPLETED',
      duration,
    },
    timestamp: new Date().toISOString(),
  }
  pushToRep(call.repId, sseEvent)
  pushToAllAdmins({ ...sseEvent, data: { ...sseEvent.data, repId: call.repId } })

  return updated
}

// ============================================
// Disposition — THE BIG ONE
// ============================================

export async function logDisposition(params: {
  callId: string
  result: string
  path?: unknown[]
  wasRecommended?: boolean
  notes?: string
}) {
  const { callId, result, path, wasRecommended = false, notes } = params

  // Load the call with lead + rep + session
  const call = await prisma.dialerCall.findUnique({
    where: { id: callId },
    include: {
      lead: {
        select: {
          id: true,
          phone: true,
          status: true,
          companyName: true,
          dncAt: true,
        },
      },
      rep: {
        select: { id: true, name: true },
      },
      session: {
        select: { id: true },
      },
    },
  })

  if (!call || !call.lead) throw new Error('Call not found')

  const isConnected = !!call.connectedAt
  const isConversation = CONVERSATION_DISPOSITIONS.includes(result)
  const isClose = CLOSE_DISPOSITIONS.includes(result)
  const isInterested = INTERESTED_DISPOSITIONS.includes(result)

  // 1. Update DialerCall
  await prisma.dialerCall.update({
    where: { id: callId },
    data: {
      dispositionResult: result,
      dispositionPath: path ? (path as any) : undefined,
      wasRecommended,
      notes: notes || undefined,
    },
  })

  // 2. Update Lead.status based on disposition
  const newLeadStatus = DISPOSITION_STATUS_MAP[result]
  if (newLeadStatus) {
    const updateData: Record<string, unknown> = { status: newLeadStatus }
    if (result === 'DNC') {
      updateData.dncAt = new Date()
      // Also create DoNotCall record
      await prisma.doNotCall.upsert({
        where: { phone: call.lead.phone },
        create: { phone: call.lead.phone },
        update: {},
      }).catch(() => { /* may already exist */ })
    }
    await prisma.lead.update({
      where: { id: call.lead.id },
      data: updateData,
    }).catch(() => { /* lead may have been deleted */ })
  }

  // 3. Create LeadEvent using EXISTING EventType (CALL_MADE)
  await prisma.leadEvent.create({
    data: {
      leadId: call.lead.id,
      eventType: 'CALL_MADE',
      actor: `rep:${call.rep?.name || call.repId}`,
      metadata: {
        source: 'dialer',
        disposition: result,
        duration: call.duration,
        callType: call.direction === 'OUTBOUND' ? 'outbound' : 'inbound',
        repId: call.repId,
        callId: call.id,
        connected: isConnected,
        wasRecommended,
      },
    },
  }).catch((err) => {
    console.error('[DialerService] Failed to create LeadEvent:', err)
  })

  // 4. Update DialerSessionNew stats (per-disposition + backward-compat aggregates)
  if (call.session?.id) {
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

    const sessionUpdate: Record<string, unknown> = {}

    if (isConnected) {
      sessionUpdate.connectedCalls = { increment: 1 }
    }

    // Per-disposition counter
    const sessionField = SESSION_DISPOSITION_FIELD[result]
    if (sessionField) {
      sessionUpdate[sessionField] = { increment: 1 }
    }

    // Existing fields for results that use them directly
    if (result === 'VOICEMAIL') sessionUpdate.voicemails = { increment: 1 }
    if (result === 'NO_ANSWER' || result === 'BUSY' || result === 'FAILED') sessionUpdate.noAnswers = { increment: 1 }

    // Backward-compat aggregates
    if (isInterested) {
      sessionUpdate.interestedCount = { increment: 1 }
    }
    if (result === 'NOT_INTERESTED' || result === 'DNC') {
      sessionUpdate.notInterestedCount = { increment: 1 }
    }

    if (Object.keys(sessionUpdate).length > 0) {
      await prisma.dialerSessionNew.update({
        where: { id: call.session.id },
        data: sessionUpdate,
      }).catch(() => { /* session may have ended */ })
    }
  }

  // 5. Upsert RepActivity (dials counted at initiation, closes only from Stripe)
  const REP_ACTIVITY_DISPOSITION_FIELD: Record<string, string> = {
    WANTS_TO_MOVE_FORWARD: 'wantsToMoveForward',
    CALLBACK: 'callbacks',
    INTERESTED_VERBAL: 'interestedVerbal',
    WANTS_CHANGES: 'wantsChanges',
    WILL_LOOK_LATER: 'willLookLater',
    NOT_INTERESTED: 'notInterested',
    DNC: 'dnc',
    VOICEMAIL: 'voicemails',
    NO_ANSWER: 'noAnswers',
    WRONG_NUMBER: 'wrongNumbers',
    DISCONNECTED: 'disconnected',
  }
  const repActivityField = REP_ACTIVITY_DISPOSITION_FIELD[result]
  await upsertRepActivityIncremental(call.repId, {
    conversations: isConversation ? 1 : 0,
    ...(repActivityField ? { [repActivityField]: 1 } : {}),
  })

  // 6. Gap 4: Create OutboundEvent
  await prisma.outboundEvent.create({
    data: {
      leadId: call.lead.id,
      channel: 'PHONE',
      status: isConnected ? 'REPLIED' : 'SENT',
      recipientPhone: call.phoneNumberUsed || call.lead.phone,
      sentAt: call.startedAt,
      repId: call.repId,
      metadata: {
        source: 'dialer',
        callId: call.id,
        disposition: result,
        duration: call.duration,
      },
    },
  }).catch((err) => {
    console.error('[DialerService] Failed to create OutboundEvent:', err)
  })

  // 7. Trigger engagement scoring (non-blocking)
  calculateEngagementScore(call.lead.id).catch((err) => {
    console.error('[DialerService] Engagement scoring error:', err)
  })

  // 8. Hot lead notifications removed — hot leads only from organic preview engagement (Bug A fix)

  // 9. Dispatch webhooks (non-blocking)
  dispatchWebhook({
    type: 'dialer.call_completed',
    data: {
      callId: call.id,
      leadId: call.lead.id,
      repId: call.repId,
      disposition: result,
      duration: call.duration,
      connected: isConnected,
      companyName: call.lead.companyName,
    },
  }).catch(err => console.error('[DialerService] Webhook dispatch failed:', err))

  if (isInterested) {
    dispatchWebhook({
      type: 'dialer.lead_interested',
      data: {
        callId: call.id,
        leadId: call.lead.id,
        repId: call.repId,
        disposition: result,
        companyName: call.lead.companyName,
      },
    }).catch(err => console.error('[DialerService] Webhook dispatch failed:', err))
  }

  // 10. Trigger Close Engine for WANTS_TO_MOVE_FORWARD (Bug 8 dedup built into triggerCloseEngine)
  if (result === 'WANTS_TO_MOVE_FORWARD') {
    triggerCloseEngine({
      leadId: call.lead.id,
      entryPoint: 'REP_CLOSE',
      repId: call.repId,
    }).catch((err) => {
      console.error('[DialerService] Close engine trigger error:', err)
    })
  }

  // 11. Push SSE
  const sseEvent = {
    type: 'DISPOSITION_LOGGED' as const,
    data: {
      callId: call.id,
      leadId: call.lead.id,
      disposition: result,
      connected: isConnected,
      duration: call.duration,
    },
    timestamp: new Date().toISOString(),
  }
  pushToRep(call.repId, sseEvent)
  pushToAllAdmins({ ...sseEvent, data: { ...sseEvent.data, repId: call.repId } })

  return { success: true }
}

// ============================================
// VM Drop
// ============================================

export async function dropVoicemail(callId: string) {
  const call = await prisma.dialerCall.findUnique({
    where: { id: callId },
    include: {
      rep: {
        select: { id: true, vmRecordingUrl: true, outboundVmUrl: true, twilioNumber1: true },
      },
    },
  })

  if (!call) throw new Error('Call not found')
  // Use vmRecordingUrl (synced on approval) with fallback to outboundVmUrl (Cloudinary onboarding upload)
  let vmUrl = call.rep?.vmRecordingUrl || call.rep?.outboundVmUrl
  if (!vmUrl) throw new Error('No VM recording configured for this rep')

  // Twilio <Play> only supports MP3/WAV — browser recordings are WebM.
  // Cloudinary converts on-the-fly when you swap the file extension.
  if (vmUrl.includes('cloudinary.com') && vmUrl.endsWith('.webm')) {
    vmUrl = vmUrl.replace(/\.webm$/, '.mp3')
  }

  // Bug 10: HEAD-check VM URL before attempting drop
  try {
    const headResponse = await fetch(vmUrl, { method: 'HEAD' })
    if (!headResponse.ok) {
      console.error(`[DialerService] VM recording URL broken (${headResponse.status}): ${vmUrl}`)
      throw new Error('VM recording URL is not accessible')
    }
  } catch (err) {
    if (err instanceof Error && err.message === 'VM recording URL is not accessible') throw err
    console.error('[DialerService] VM recording HEAD check failed:', err)
    throw new Error('VM recording URL validation failed')
  }

  if (!call.twilioCallSid) {
    throw new Error('No Twilio call SID — cannot drop VM')
  }

  // Use Twilio REST to redirect the CHILD call leg (Twilio → lead's phone) to play the recording,
  // then hang up the PARENT call (rep's browser connection).
  // If we redirect the parent, the recording plays to the rep instead of the voicemail.
  try {
    const client = getTwilioClient()

    // Find the child call (the <Dial> leg to the lead's phone)
    const childCalls = await client.calls.list({
      parentCallSid: call.twilioCallSid,
      limit: 1,
    })

    if (childCalls.length === 0) {
      throw new Error('No child call leg found — cannot drop VM')
    }

    // Check if the child call is still active before attempting redirect
    const childStatus = childCalls[0].status
    if (childStatus === 'completed' || childStatus === 'canceled' || childStatus === 'failed' || childStatus === 'busy' || childStatus === 'no-answer') {
      console.log(`[DialerService] Call already ended (${childStatus}), skipping VM drop for call ${callId}`)
      return
    }

    // Redirect the child call to play the VM recording to the voicemail
    const safeUrl = vmUrl.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    await client.calls(childCalls[0].sid).update({
      twiml: `<?xml version="1.0" encoding="UTF-8"?><Response><Play>${safeUrl}</Play></Response>`,
    })

    // Hang up the parent call so the rep is disconnected and can move on
    await client.calls(call.twilioCallSid).update({ status: 'completed' })

    // Update DialerCall
    await prisma.dialerCall.update({
      where: { id: callId },
      data: {
        vmDropped: true,
        vmDroppedAt: new Date(),
        status: 'VOICEMAIL',
      },
    })

    // Push SSE
    const sseEvent = {
      type: 'VM_DROP_COMPLETE' as const,
      data: { callId: call.id, leadId: call.leadId, success: true },
      timestamp: new Date().toISOString(),
    }
    pushToRep(call.repId, sseEvent)
    pushToAllAdmins({ ...sseEvent, data: { ...sseEvent.data, repId: call.repId } })

    // ── Auto-send preview text after VM drop ──
    try {
      if (call.previewSentDuringCall) {
        console.log(`[DialerService] VM auto-preview skipped — preview already sent during call ${callId}`)
      } else {
        const lead = await prisma.lead.findUnique({
          where: { id: call.leadId },
          select: { previewUrl: true, previewId: true, phone: true, companyName: true, firstName: true },
        })

        const previewUrl = lead?.previewUrl || (lead?.previewId
          ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://preview.brightautomations.org'}/preview/${lead.previewId}`
          : null)

        if (previewUrl && lead?.phone) {
          const { getLeadSmsNumber } = await import('./twilio')

          let toNumber: string
          try {
            toNumber = await getLeadSmsNumber(call.leadId)
          } catch {
            toNumber = lead.phone
          }

          const firstName = lead.firstName || 'there'
          const company = lead.companyName || 'your business'
          const message = `Hey ${firstName}, I just left you a voicemail about ${company}. Check out the site I built for you: ${previewUrl}`

          const { sendSMSViaProvider } = await import('./sms-provider')

          await sendSMSViaProvider({
            to: toNumber,
            fromNumber: call.rep?.twilioNumber1 || undefined,
            message,
            leadId: call.leadId,
            sender: `rep:${call.rep?.id || 'unknown'}`,
            trigger: 'vm_auto_preview',
          })

          await prisma.leadEvent.create({
            data: {
              leadId: call.leadId,
              eventType: 'PREVIEW_SENT_SMS',
              actor: 'system:vm-auto-preview',
              metadata: {
                source: 'vm_auto_preview',
                previewUrl,
                callId,
                repId: call.rep?.id,
                trigger: 'voicemail_drop',
              },
            },
          }).catch(() => {})

          await prisma.dialerCall.update({
            where: { id: callId },
            data: {
              previewSentDuringCall: true,
              previewSentChannel: 'sms',
            },
          }).catch(() => {})

          if (call.sessionId) {
            await prisma.dialerSessionNew.update({
              where: { id: call.sessionId },
              data: { previewsSent: { increment: 1 } },
            }).catch(() => {})
          }

          console.log(`[DialerService] VM auto-preview sent to ${toNumber} for lead ${call.leadId}`)
        } else {
          console.log(`[DialerService] VM auto-preview skipped — no preview URL for lead ${call.leadId}`)
        }
      }
    } catch (err) {
      console.warn('[DialerService] VM auto-preview failed (non-blocking):', err)
    }

    return { success: true }
  } catch (err) {
    console.error('[DialerService] VM drop error:', err)
    throw new Error('Failed to drop voicemail')
  }
}

// ============================================
// Redial
// ============================================

export async function redial(callId: string, sessionId?: string) {
  const call = await prisma.dialerCall.findUnique({
    where: { id: callId },
    select: { repId: true, leadId: true, phoneNumberUsed: true },
  })

  if (!call) throw new Error('Call not found')

  return initiateCall(call.repId, call.leadId, sessionId, call.phoneNumberUsed || undefined)
}

// ============================================
// Callback Scheduling
// ============================================

export async function scheduleCallback(params: {
  leadId: string
  repId: string
  scheduledAt: Date // Bug 8: Must be UTC from frontend
  notes?: string
  callId?: string
}) {
  const { leadId, repId, scheduledAt, notes, callId } = params

  const callback = await prisma.callbackSchedule.create({
    data: {
      leadId,
      repId,
      scheduledAt, // Stored as UTC
      notes,
      createdFromCallId: callId,
    },
  })

  // Update session counter if we have an active call
  if (callId) {
    const call = await prisma.dialerCall.findUnique({
      where: { id: callId },
      select: { sessionId: true },
    })
    if (call?.sessionId) {
      await prisma.dialerSessionNew.update({
        where: { id: call.sessionId },
        data: { callbacksScheduled: { increment: 1 } },
      }).catch(err => console.error('[DialerService] Session callback count update failed:', err))
    }
  }

  // Create LeadEvent using EXISTING EventType
  await prisma.leadEvent.create({
    data: {
      leadId,
      eventType: 'CALLBACK_SCHEDULED',
      actor: `rep:${repId}`,
      metadata: {
        source: 'dialer',
        scheduledAt: scheduledAt.toISOString(),
        notes,
        callId,
      },
    },
  }).catch(err => console.error('[DialerService] Callback event write failed:', err))

  // Push SSE
  const sseEvent = {
    type: 'QUEUE_UPDATE' as const,
    data: {
      action: 'callback_scheduled',
      leadId,
      callbackId: callback.id,
      scheduledAt: scheduledAt.toISOString(),
    },
    timestamp: new Date().toISOString(),
  }
  pushToRep(repId, sseEvent)

  return callback
}

export async function completeCallback(callbackId: string) {
  return prisma.callbackSchedule.update({
    where: { id: callbackId },
    data: { status: 'COMPLETED', completedAt: new Date() },
  })
}

export async function cancelCallback(callbackId: string) {
  return prisma.callbackSchedule.update({
    where: { id: callbackId },
    data: { status: 'CANCELLED' },
  })
}

// ============================================
// Auto-Disposition (predictive dialer chaining)
// ============================================

/**
 * Lightweight disposition for auto-dial chaining.
 * Used when auto-dialer skips a no-answer/VM/busy call without rep interaction.
 * Does NOT change lead status, trigger close engine, or create callbacks.
 */
export async function autoDisposition(callId: string, result: string) {
  const call = await prisma.dialerCall.findUnique({
    where: { id: callId },
    select: { id: true, repId: true, leadId: true, sessionId: true, connectedAt: true, dispositionResult: true },
  })
  if (!call) throw new Error('Call not found')

  // Idempotency guard — skip if already dispositioned (prevents double stat increments from race conditions)
  if (call.dispositionResult) return

  // Update DialerCall with disposition
  await prisma.dialerCall.update({
    where: { id: callId },
    data: {
      dispositionResult: result,
      status: result === 'VOICEMAIL' ? 'VOICEMAIL' : result === 'NO_ANSWER' ? 'NO_ANSWER' : 'COMPLETED',
      endedAt: new Date(),
    },
  })

  // Update session stats (BUSY and FAILED count as noAnswers)
  if (call.sessionId) {
    const sessionUpdate: Record<string, unknown> = {}
    if (result === 'VOICEMAIL') sessionUpdate.voicemails = { increment: 1 }
    if (result === 'NO_ANSWER' || result === 'BUSY' || result === 'FAILED') sessionUpdate.noAnswers = { increment: 1 }
    if (Object.keys(sessionUpdate).length > 0) {
      await prisma.dialerSessionNew.update({
        where: { id: call.sessionId },
        data: sessionUpdate,
      }).catch(() => {})
    }
  }

  // Create LeadEvent for audit trail
  await prisma.leadEvent.create({
    data: {
      leadId: call.leadId,
      eventType: 'CALL_MADE',
      actor: `system:auto-dial`,
      metadata: {
        source: 'dialer',
        disposition: result,
        callType: 'outbound',
        repId: call.repId,
        callId: call.id,
        connected: false,
        autoDispositioned: true,
      },
    },
  }).catch(err => console.error('[DialerService] Auto-disposition LeadEvent failed:', err))

  // Push SSE
  const sseEvent = {
    type: 'DISPOSITION_LOGGED' as const,
    data: {
      callId: call.id,
      leadId: call.leadId,
      disposition: result,
      connected: false,
      autoDispositioned: true,
    },
    timestamp: new Date().toISOString(),
  }
  pushToRep(call.repId, sseEvent)
  pushToAllAdmins({ ...sseEvent, data: { ...sseEvent.data, repId: call.repId } })

  // Track in RepActivity (Bug C fix: auto-dispositioned calls now visible in rep stats)
  const autoField = result === 'VOICEMAIL' ? 'voicemails'
    : (result === 'NO_ANSWER' || result === 'BUSY' || result === 'FAILED') ? 'noAnswers'
    : null
  if (autoField) {
    await upsertRepActivityIncremental(call.repId, { [autoField]: 1 })
  }

  // Recalculate engagement score after auto-disposition
  try { await calculateEngagementScore(call.leadId) } catch (e) { console.warn('[DialerService] Auto-disposition score calc failed:', e) }

  return { success: true }
}

// ============================================
// Manual Dial (no lead)
// ============================================

export async function manualDial(repId: string, phone: string, sessionId?: string) {
  // DNC check on the raw number
  const blocked = await isDNC(phone)
  if (blocked) {
    return { error: 'Number is on Do Not Call list', code: 'DNC' as const }
  }

  const rep = await prisma.user.findUnique({
    where: { id: repId },
    select: { twilioNumber1: true },
  })

  if (!rep?.twilioNumber1) {
    return { error: 'Rep has no assigned Twilio number', code: 'CONFIG_ERROR' as const }
  }

  // Don't create DialerCall yet — leadId is required by FK.
  // DialerCall will be created when the rep attaches this call to a lead or creates a new lead.
  if (sessionId) {
    await prisma.dialerSessionNew.update({
      where: { id: sessionId },
      data: { totalCalls: { increment: 1 } },
    }).catch(err => console.error('[DialerService] Session call count update failed:', err))
  }

  // Track dial in RepActivity immediately (Bug C fix)
  await upsertRepActivityIncremental(repId, { dials: 1 })

  return { phoneToCall: phone, repId, sessionId }
}

/**
 * Attach a manual dial to an existing lead — creates the DialerCall record.
 */
export async function attachManualDialToLead(params: {
  repId: string
  leadId: string
  phone: string
  sessionId?: string
  twilioCallSid?: string
}) {
  const { repId, leadId, phone, sessionId, twilioCallSid } = params

  return prisma.dialerCall.create({
    data: {
      leadId,
      repId,
      sessionId: sessionId || undefined,
      direction: 'OUTBOUND',
      phoneNumberUsed: phone,
      status: 'INITIATED',
      twilioCallSid,
    },
  })
}

/**
 * Create a new lead from a manual dial and attach the call to it.
 */
export async function createLeadFromManualDial(params: {
  repId: string
  phone: string
  sessionId?: string
  twilioCallSid?: string
  companyName?: string
  contactName?: string
}) {
  const { repId, phone, sessionId, twilioCallSid, companyName, contactName } = params

  const lead = await prisma.lead.create({
    data: {
      phone,
      companyName: companyName || 'Unknown',
      firstName: contactName || 'Unknown',
      source: 'COLD_CALL',
      status: 'NEW',
      ownerRepId: repId,
    },
  })

  const call = await prisma.dialerCall.create({
    data: {
      leadId: lead.id,
      repId,
      sessionId: sessionId || undefined,
      direction: 'OUTBOUND',
      phoneNumberUsed: phone,
      status: 'INITIATED',
      twilioCallSid,
    },
  })

  return { lead, call }
}

// ============================================
// DNC Management
// ============================================

export async function markDNC(leadId: string, repId: string, reason?: string) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { phone: true, companyName: true },
  })
  if (!lead) throw new Error('Lead not found')

  // Update lead
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      dncAt: new Date(),
      status: 'DO_NOT_CONTACT',
      dncReason: reason || 'Manual DNC by rep',
      dncAddedBy: repId,
    },
  })

  // Upsert DoNotCall record
  await prisma.doNotCall.upsert({
    where: { phone: lead.phone },
    create: { phone: lead.phone },
    update: {},
  })

  // Create LeadEvent
  await prisma.leadEvent.create({
    data: {
      leadId,
      eventType: 'STAGE_CHANGE',
      toStage: 'DO_NOT_CONTACT',
      actor: `rep:${repId}`,
      metadata: { source: 'dialer', action: 'dnc_applied' },
    },
  }).catch(err => console.error('[DialerService] DNC event write failed:', err))

  // Dispatch webhook
  dispatchWebhook({
    type: 'dialer.dnc',
    data: { leadId, phone: lead.phone, repId, companyName: lead.companyName },
  }).catch(err => console.error('[DialerService] Webhook dispatch failed:', err))

  return { success: true }
}

// ============================================
// Call Notes
// ============================================

export async function updateCallNotes(callId: string, notes: string) {
  return prisma.dialerCall.update({
    where: { id: callId },
    data: { notes },
  })
}

// ============================================
// Helpers
// ============================================

/**
 * Gap 2: Upsert RepActivity for the current day.
 * Called incrementally after each disposition.
 */
async function upsertRepActivityIncremental(
  repId: string,
  increments: {
    dials?: number; conversations?: number; closes?: number; previewLinksSent?: number; previewsOpened?: number
    wantsToMoveForward?: number; callbacks?: number; interestedVerbal?: number; wantsChanges?: number
    willLookLater?: number; notInterested?: number; voicemails?: number; noAnswers?: number
    wrongNumbers?: number; disconnected?: number; dnc?: number
  }
) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  try {
    await prisma.repActivity.upsert({
      where: { repId_date: { repId, date: today } },
      create: {
        repId,
        date: today,
        dials: increments.dials || 0,
        conversations: increments.conversations || 0,
        closes: increments.closes || 0,
        previewLinksSent: increments.previewLinksSent || 0,
        previewsOpened: increments.previewsOpened || 0,
        wantsToMoveForward: increments.wantsToMoveForward || 0,
        callbacks: increments.callbacks || 0,
        interestedVerbal: increments.interestedVerbal || 0,
        wantsChanges: increments.wantsChanges || 0,
        willLookLater: increments.willLookLater || 0,
        notInterested: increments.notInterested || 0,
        voicemails: increments.voicemails || 0,
        noAnswers: increments.noAnswers || 0,
        wrongNumbers: increments.wrongNumbers || 0,
        disconnected: increments.disconnected || 0,
        dnc: increments.dnc || 0,
      },
      update: {
        ...(increments.dials ? { dials: { increment: increments.dials } } : {}),
        ...(increments.conversations ? { conversations: { increment: increments.conversations } } : {}),
        ...(increments.closes ? { closes: { increment: increments.closes } } : {}),
        ...(increments.previewLinksSent ? { previewLinksSent: { increment: increments.previewLinksSent } } : {}),
        ...(increments.previewsOpened ? { previewsOpened: { increment: increments.previewsOpened } } : {}),
        ...(increments.wantsToMoveForward ? { wantsToMoveForward: { increment: increments.wantsToMoveForward } } : {}),
        ...(increments.callbacks ? { callbacks: { increment: increments.callbacks } } : {}),
        ...(increments.interestedVerbal ? { interestedVerbal: { increment: increments.interestedVerbal } } : {}),
        ...(increments.wantsChanges ? { wantsChanges: { increment: increments.wantsChanges } } : {}),
        ...(increments.willLookLater ? { willLookLater: { increment: increments.willLookLater } } : {}),
        ...(increments.notInterested ? { notInterested: { increment: increments.notInterested } } : {}),
        ...(increments.voicemails ? { voicemails: { increment: increments.voicemails } } : {}),
        ...(increments.noAnswers ? { noAnswers: { increment: increments.noAnswers } } : {}),
        ...(increments.wrongNumbers ? { wrongNumbers: { increment: increments.wrongNumbers } } : {}),
        ...(increments.disconnected ? { disconnected: { increment: increments.disconnected } } : {}),
        ...(increments.dnc ? { dnc: { increment: increments.dnc } } : {}),
      },
    })
  } catch (err) {
    console.error('[DialerService] RepActivity upsert error:', err)
  }
}

/**
 * Bulk upsert RepActivity at session end (cumulative).
 */
async function upsertRepActivity(
  repId: string,
  totals: { dials: number; conversations: number; closes: number; previewLinksSent: number; previewsOpened: number }
) {
  // At session end, incremental updates have already been applied.
  // This is a safety net — just log for monitoring.
  console.log(`[DialerService] Session ended for rep ${repId}:`, totals)
}
