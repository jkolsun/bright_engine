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
  WANTS_TO_MOVE_FORWARD: 'HOT_LEAD',
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
        select: { duration: true, connectedAt: true, dispositionResult: true },
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

  // Gap 2: Update RepActivity for the session
  await upsertRepActivity(session.repId, {
    dials: session.totalCalls,
    conversations: session.connectedCalls,
    closes: session.interestedCount,
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

  // Get rep's twilio number for caller ID
  const rep = await prisma.user.findUnique({
    where: { id: repId },
    select: { twilioNumber1: true },
  })

  if (!rep?.twilioNumber1) {
    return { error: 'Rep has no assigned Twilio number', code: 'CONFIG_ERROR' }
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

  return { callId: call.id, phoneToCall, leadId }
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

  // 4. Update DialerSessionNew stats
  if (call.session?.id) {
    const sessionUpdate: Record<string, unknown> = {}

    if (isConnected) {
      sessionUpdate.connectedCalls = { increment: 1 }
    }
    if (result === 'VOICEMAIL' || result === 'NO_ANSWER') {
      if (result === 'VOICEMAIL') sessionUpdate.voicemails = { increment: 1 }
      if (result === 'NO_ANSWER') sessionUpdate.noAnswers = { increment: 1 }
    }
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

  // 5. Gap 2: Upsert RepActivity
  await upsertRepActivityIncremental(call.repId, {
    dials: 1,
    conversations: isConversation ? 1 : 0,
    closes: isClose ? 1 : 0,
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

  // 8. Hot lead notifications for interested dispositions
  if (isInterested) {
    processHotLeadEvent({
      leadId: call.lead.id,
      eventType: result === 'WANTS_TO_MOVE_FORWARD' ? 'PREVIEW_CTA_CLICKED' : 'PREVIEW_VIEWED',
      metadata: { source: 'dialer', disposition: result, repName: call.rep?.name },
    }).catch((err) => {
      console.error('[DialerService] Hot lead notification error:', err)
    })
  }

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
        select: { id: true, vmRecordingUrl: true, twilioNumber2: true },
      },
    },
  })

  if (!call) throw new Error('Call not found')
  if (!call.rep?.vmRecordingUrl) throw new Error('No VM recording configured for this rep')
  if (!call.rep?.twilioNumber2) throw new Error('No VM drop number configured for this rep')

  // Bug 10: HEAD-check VM URL before attempting drop
  try {
    const headResponse = await fetch(call.rep.vmRecordingUrl, { method: 'HEAD' })
    if (!headResponse.ok) {
      console.error(`[DialerService] VM recording URL broken (${headResponse.status}): ${call.rep.vmRecordingUrl}`)
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

  // Use Twilio REST to redirect the call to play the VM recording
  try {
    const client = getTwilioClient()
    const publicUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://preview.brightautomations.org'

    // Create TwiML that plays the recording and hangs up
    // We'll redirect the current call to a TwiML endpoint
    await client.calls(call.twilioCallSid).update({
      twiml: `<?xml version="1.0" encoding="UTF-8"?><Response><Play>${call.rep.vmRecordingUrl}</Play></Response>`,
    })

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
  increments: { dials?: number; conversations?: number; closes?: number; previewLinksSent?: number; previewsOpened?: number }
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
      },
      update: {
        ...(increments.dials ? { dials: { increment: increments.dials } } : {}),
        ...(increments.conversations ? { conversations: { increment: increments.conversations } } : {}),
        ...(increments.closes ? { closes: { increment: increments.closes } } : {}),
        ...(increments.previewLinksSent ? { previewLinksSent: { increment: increments.previewLinksSent } } : {}),
        ...(increments.previewsOpened ? { previewsOpened: { increment: increments.previewsOpened } } : {}),
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
