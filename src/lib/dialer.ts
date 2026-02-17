import twilio from 'twilio'
import { prisma } from './db'

// ============================================
// POWER DIALER SERVICE LAYER
// Handles all Twilio Voice/Conference operations
// ============================================

let twilioClient: ReturnType<typeof twilio> | null = null

function getTwilioClient() {
  if (!twilioClient) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.')
    }
    twilioClient = twilio(accountSid, authToken)
  }
  return twilioClient
}

function isTwilioConfigured(): boolean {
  return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
}

// ============================================
// TOKEN GENERATION (Browser WebRTC calling)
// ============================================

export async function generateDialerToken(repId: string, repName: string) {
  if (!isTwilioConfigured()) {
    return { token: null, configured: false }
  }

  const AccessToken = twilio.jwt.AccessToken
  const VoiceGrant = AccessToken.VoiceGrant

  const token = new AccessToken(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_API_KEY_SID || process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_API_KEY_SECRET || process.env.TWILIO_AUTH_TOKEN!,
    { identity: `rep-${repId}` }
  )

  const voiceGrant = new VoiceGrant({
    outgoingApplicationSid: process.env.TWILIO_TWIML_APP_SID,
    incomingAllow: true,
  })

  token.addGrant(voiceGrant)

  return { token: token.toJwt(), configured: true }
}

// ============================================
// PARALLEL DIALING (Conference API)
// ============================================

interface DialOptions {
  repId: string
  leadIds: string[]       // 1-3 leads to dial simultaneously
  sessionId?: string
  linesPerDial?: number
}

interface DialResult {
  batchId: string
  calls: Array<{
    callId: string
    leadId: string
    lineNumber: number
    status: string
    twilioCallSid?: string
  }>
  configured: boolean
}

export async function initiateParallelDial(options: DialOptions): Promise<DialResult> {
  const { repId, leadIds, sessionId } = options
  const batchId = `batch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  // Check DNC list
  const leads = await prisma.lead.findMany({
    where: { id: { in: leadIds } },
    select: { id: true, phone: true, firstName: true, companyName: true },
  })

  const dncPhones = await prisma.doNotCall.findMany({
    where: { phone: { in: leads.map(l => l.phone) } },
    select: { phone: true },
  })
  const dncSet = new Set(dncPhones.map(d => d.phone))

  const validLeads = leads.filter(l => !dncSet.has(l.phone))

  // Create call records for each line
  const callRecords = await Promise.all(
    validLeads.map(async (lead, idx) => {
      const call = await prisma.call.create({
        data: {
          leadId: lead.id,
          repId,
          dialBatchId: batchId,
          lineNumber: idx + 1,
          status: 'initiated',
          direction: 'outbound',
        },
      })
      return { call, lead }
    })
  )

  // If Twilio is configured, actually dial
  if (isTwilioConfigured()) {
    const client = getTwilioClient()
    const conferenceName = `dialer-${repId}-${batchId}`

    for (const { call, lead } of callRecords) {
      try {
        const twilioCall = await client.calls.create({
          to: lead.phone,
          from: getDialerNumber(call.lineNumber || 1),
          url: `${process.env.BASE_URL}/api/webhooks/twilio-voice?callId=${call.id}&batchId=${batchId}&repId=${repId}`,
          statusCallback: `${process.env.BASE_URL}/api/webhooks/twilio-voice?event=status&callId=${call.id}`,
          statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
          timeout: 25, // Ring timeout in seconds
        })

        await prisma.call.update({
          where: { id: call.id },
          data: {
            twilioCallSid: twilioCall.sid,
            conferenceSid: conferenceName,
            status: 'ringing',
          },
        })
      } catch (err) {
        await prisma.call.update({
          where: { id: call.id },
          data: { status: 'failed' },
        })
      }
    }
  } else {
    // Twilio not configured — mark as simulated for UI development
    for (const { call } of callRecords) {
      await prisma.call.update({
        where: { id: call.id },
        data: { status: 'ringing' },
      })
    }
  }

  // Update session stats
  if (sessionId) {
    await prisma.dialerSession.update({
      where: { id: sessionId },
      data: { totalDials: { increment: validLeads.length } },
    }).catch(() => {})
  }

  return {
    batchId,
    calls: callRecords.map(({ call, lead }) => ({
      callId: call.id,
      leadId: lead.id,
      lineNumber: call.lineNumber || 1,
      status: call.status,
      twilioCallSid: call.twilioCallSid || undefined,
    })),
    configured: isTwilioConfigured(),
  }
}

// ============================================
// CALL MANAGEMENT
// ============================================

export async function connectCall(callId: string, repId: string) {
  const call = await prisma.call.update({
    where: { id: callId },
    data: { status: 'connected' },
  })

  if (isTwilioConfigured() && call.twilioCallSid) {
    // In real implementation, this would bridge the call to the rep's browser via Conference
    const client = getTwilioClient()
    // The conference approach: rep joins a conference, answered call joins same conference
  }

  return call
}

export async function dropCall(callId: string) {
  const call = await prisma.call.findUnique({ where: { id: callId } })
  if (!call) return null

  if (isTwilioConfigured() && call.twilioCallSid) {
    try {
      const client = getTwilioClient()
      await client.calls(call.twilioCallSid).update({ status: 'completed' })
    } catch (e) {
      // Call may have already ended
    }
  }

  return prisma.call.update({
    where: { id: callId },
    data: { status: 'completed', outcome: 'dropped' },
  })
}

export async function hangupCall(callId: string) {
  const call = await prisma.call.findUnique({ where: { id: callId } })
  if (!call) return null

  if (isTwilioConfigured() && call.twilioCallSid) {
    try {
      const client = getTwilioClient()
      await client.calls(call.twilioCallSid).update({ status: 'completed' })
    } catch (e) {
      // Call may have already ended
    }
  }

  return prisma.call.update({
    where: { id: callId },
    data: { status: 'completed' },
  })
}

export async function holdCall(callId: string) {
  const call = await prisma.call.findUnique({ where: { id: callId } })
  if (!call) return null

  if (isTwilioConfigured() && call.conferenceSid) {
    // In conference mode, mute the lead's audio
    // This would use Twilio Conference participant API
  }

  return prisma.call.update({
    where: { id: callId },
    data: { status: 'on_hold' },
  })
}

export async function resumeCall(callId: string) {
  return prisma.call.update({
    where: { id: callId },
    data: { status: 'connected' },
  })
}

// ============================================
// CALL OUTCOME LOGGING
// ============================================

interface LogOutcomeOptions {
  callId: string
  outcome: string
  notes?: string
  callbackDate?: string
  durationSeconds?: number
}

export async function logCallOutcome(options: LogOutcomeOptions) {
  const { callId, outcome, notes, callbackDate, durationSeconds } = options

  const call = await prisma.call.update({
    where: { id: callId },
    data: {
      outcome,
      notes,
      callbackDate: callbackDate ? new Date(callbackDate) : undefined,
      durationSeconds,
      status: 'completed',
    },
    include: { lead: true },
  })

  // Update lead status based on outcome
  const statusMap: Record<string, string> = {
    interested: 'QUALIFIED',
    not_interested: 'CLOSED_LOST',
    wrong_number: 'CLOSED_LOST',
    dnc: 'DO_NOT_CONTACT',
  }

  if (statusMap[outcome]) {
    await prisma.lead.update({
      where: { id: call.leadId },
      data: { status: statusMap[outcome] as any },
    })
  }

  // Add to DNC list if requested
  if (outcome === 'dnc' && call.lead) {
    await prisma.doNotCall.upsert({
      where: { phone: call.lead.phone },
      create: {
        phone: call.lead.phone,
        reason: notes || 'Requested via dialer',
        addedBy: call.repId,
      },
      update: {},
    })
  }

  // Log as Activity for existing tracking
  await prisma.activity.create({
    data: {
      leadId: call.leadId,
      repId: call.repId,
      activityType: outcome === 'voicemail_left' || outcome === 'voicemail_skipped' ? 'VOICEMAIL' : 'CALL',
      callDisposition: mapOutcomeToDisposition(outcome) as any,
      notes,
      durationSeconds,
      callbackDate: callbackDate ? new Date(callbackDate) : undefined,
    },
  })

  // Update daily RepActivity counters
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const isConversation = ['interested', 'not_interested', 'callback'].includes(outcome)
  const isClose = outcome === 'interested'

  await prisma.repActivity.upsert({
    where: { repId_date: { repId: call.repId, date: today } },
    create: {
      repId: call.repId,
      date: today,
      dials: 1,
      conversations: isConversation ? 1 : 0,
      closes: isClose ? 1 : 0,
    },
    update: {
      dials: { increment: 1 },
      ...(isConversation ? { conversations: { increment: 1 } } : {}),
      ...(isClose ? { closes: { increment: 1 } } : {}),
    },
  })

  return call
}

function mapOutcomeToDisposition(outcome: string): string {
  const map: Record<string, string> = {
    interested: 'INTERESTED',
    not_interested: 'NOT_INTERESTED',
    callback: 'CALLBACK',
    no_answer: 'NO_ANSWER',
    voicemail_left: 'VOICEMAIL',
    voicemail_skipped: 'VOICEMAIL',
    wrong_number: 'WRONG_NUMBER',
    dnc: 'NOT_INTERESTED',
  }
  return map[outcome] || 'NO_ANSWER'
}

// ============================================
// AUTO-TEXT (Send preview link via SMS)
// ============================================

export async function autoTextPreview(callId: string, repName: string) {
  const call = await prisma.call.findUnique({
    where: { id: callId },
    include: { lead: true },
  })

  if (!call || !call.lead || !call.lead.previewUrl) {
    return { success: false, error: 'No preview URL available' }
  }

  const lead = call.lead
  const message = `Hey ${lead.firstName}, just left you a voicemail. Here's the preview for ${lead.companyName}: ${lead.previewUrl}`

  // Use existing SMS infrastructure
  if (isTwilioConfigured()) {
    const { sendSMS } = await import('./twilio')
    const result = await sendSMS({
      to: lead.phone,
      message,
      leadId: lead.id,
      sender: repName,
      trigger: 'dialer_auto_text',
    })

    if (result.success) {
      await prisma.call.update({
        where: { id: callId },
        data: { autoTexted: true },
      })

      // Track preview sent
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      await prisma.repActivity.upsert({
        where: { repId_date: { repId: call.repId, date: today } },
        create: { repId: call.repId, date: today, previewLinksSent: 1 },
        update: { previewLinksSent: { increment: 1 } },
      })
    }

    return result
  }

  return { success: false, error: 'Twilio not configured' }
}

// ============================================
// ADMIN MONITORING (Listen/Whisper/Barge)
// ============================================

export async function adminListen(conferenceSid: string, adminIdentity: string) {
  if (!isTwilioConfigured()) return { configured: false }

  const client = getTwilioClient()
  // Join conference as muted participant (listen-only)
  // In production, this creates a new call to admin's browser that joins the conference muted
  return { configured: true, mode: 'listen' }
}

export async function adminWhisper(conferenceSid: string, adminIdentity: string) {
  if (!isTwilioConfigured()) return { configured: false }

  // Join conference where admin can talk to rep but not lead
  // This requires Twilio's conference coaching feature
  return { configured: true, mode: 'whisper' }
}

export async function adminBarge(conferenceSid: string, adminIdentity: string) {
  if (!isTwilioConfigured()) return { configured: false }

  // Join conference as full participant — both rep and lead hear admin
  return { configured: true, mode: 'barge' }
}

// ============================================
// CALLBACK MANAGEMENT
// ============================================

export async function scheduleCallback(callId: string, callbackDate: string, notes?: string) {
  const call = await prisma.call.update({
    where: { id: callId },
    data: {
      outcome: 'callback',
      callbackDate: new Date(callbackDate),
      notes,
      status: 'completed',
    },
  })

  // Also log as Activity
  await prisma.activity.create({
    data: {
      leadId: call.leadId,
      repId: call.repId,
      activityType: 'CALL',
      callDisposition: 'CALLBACK',
      callbackDate: new Date(callbackDate),
      notes: notes || `Callback scheduled for ${callbackDate}`,
    },
  })

  return call
}

export async function getCallbacks(repId: string) {
  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(now)
  todayEnd.setHours(23, 59, 59, 999)

  const [overdue, today, upcoming] = await Promise.all([
    // Overdue callbacks (past due)
    prisma.call.findMany({
      where: {
        repId,
        outcome: 'callback',
        callbackDate: { lt: now },
        lead: { status: { notIn: ['CLOSED_LOST', 'DO_NOT_CONTACT', 'PAID'] } },
      },
      include: { lead: true },
      orderBy: { callbackDate: 'asc' },
    }),
    // Today's callbacks (not yet overdue)
    prisma.call.findMany({
      where: {
        repId,
        outcome: 'callback',
        callbackDate: { gte: now, lte: todayEnd },
        lead: { status: { notIn: ['CLOSED_LOST', 'DO_NOT_CONTACT', 'PAID'] } },
      },
      include: { lead: true },
      orderBy: { callbackDate: 'asc' },
    }),
    // Upcoming (next 7 days, after today)
    prisma.call.findMany({
      where: {
        repId,
        outcome: 'callback',
        callbackDate: {
          gt: todayEnd,
          lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
        lead: { status: { notIn: ['CLOSED_LOST', 'DO_NOT_CONTACT', 'PAID'] } },
      },
      include: { lead: true },
      orderBy: { callbackDate: 'asc' },
    }),
  ])

  return { overdue, today, upcoming }
}

// ============================================
// DIALER SESSION MANAGEMENT
// ============================================

export async function startDialerSession(repId: string, mode: string, linesPerDial: number) {
  // End any existing active sessions
  await prisma.dialerSession.updateMany({
    where: { repId, status: 'active' },
    data: { status: 'ended', endedAt: new Date() },
  })

  return prisma.dialerSession.create({
    data: { repId, mode, linesPerDial },
  })
}

export async function endDialerSession(sessionId: string) {
  return prisma.dialerSession.update({
    where: { id: sessionId },
    data: { status: 'ended', endedAt: new Date() },
  })
}

// ============================================
// LIVE REP STATUS (Admin view)
// ============================================

export async function getLiveRepStatus() {
  const activeReps = await prisma.user.findMany({
    where: { role: 'REP', status: 'ACTIVE' },
    select: {
      id: true,
      name: true,
      dialerSessions: {
        where: { status: 'active' },
        orderBy: { startedAt: 'desc' },
        take: 1,
      },
      calls: {
        where: {
          status: { in: ['ringing', 'connected', 'on_hold'] },
        },
        include: { lead: { select: { firstName: true, lastName: true, companyName: true } } },
        orderBy: { createdAt: 'desc' },
        take: 3,
      },
    },
  })

  // Get today's stats for each rep
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const repStats = await prisma.repActivity.findMany({
    where: {
      repId: { in: activeReps.map(r => r.id) },
      date: today,
    },
  })

  const statsMap = new Map(repStats.map(s => [s.repId, s]))

  return activeReps.map(rep => {
    const session = rep.dialerSessions[0]
    const activeCalls = rep.calls
    const stats = statsMap.get(rep.id)

    let status: 'idle' | 'dialing' | 'on_call' | 'on_hold' = 'idle'
    if (activeCalls.some(c => c.status === 'on_hold')) status = 'on_hold'
    else if (activeCalls.some(c => c.status === 'connected')) status = 'on_call'
    else if (activeCalls.some(c => c.status === 'ringing')) status = 'dialing'
    else if (session) status = 'idle'

    const connectedCall = activeCalls.find(c => c.status === 'connected')

    return {
      repId: rep.id,
      repName: rep.name,
      status,
      sessionActive: !!session,
      currentLead: connectedCall?.lead || null,
      activeCalls: activeCalls.length,
      callDuration: connectedCall ? Math.floor((Date.now() - new Date(connectedCall.createdAt).getTime()) / 1000) : 0,
      todayStats: {
        dials: stats?.dials || 0,
        conversations: stats?.conversations || 0,
        closes: stats?.closes || 0,
        previewsSent: stats?.previewLinksSent || 0,
      },
    }
  })
}

// ============================================
// DIALER SETTINGS
// ============================================

export interface DialerSettings {
  linesPerDial: number    // 1-3
  ringTimeout: number     // 15-35 sec
  pauseBetweenBatches: number  // 0-10 sec
  maxDialsPerHour: number     // 40-120
}

export const DEFAULT_DIALER_SETTINGS: DialerSettings = {
  linesPerDial: 3,
  ringTimeout: 25,
  pauseBetweenBatches: 2,
  maxDialsPerHour: 80,
}

export async function getDialerSettings(): Promise<DialerSettings> {
  const settings = await prisma.settings.findUnique({
    where: { key: 'dialer_settings' },
  })

  if (settings?.value) {
    return { ...DEFAULT_DIALER_SETTINGS, ...(settings.value as any) }
  }

  return DEFAULT_DIALER_SETTINGS
}

export async function updateDialerSettings(updates: Partial<DialerSettings>) {
  const current = await getDialerSettings()
  const merged = { ...current, ...updates }

  // Validate ranges
  merged.linesPerDial = Math.max(1, Math.min(3, merged.linesPerDial))
  merged.ringTimeout = Math.max(15, Math.min(35, merged.ringTimeout))
  merged.pauseBetweenBatches = Math.max(0, Math.min(10, merged.pauseBetweenBatches))
  merged.maxDialsPerHour = Math.max(40, Math.min(120, merged.maxDialsPerHour))

  await prisma.settings.upsert({
    where: { key: 'dialer_settings' },
    create: { key: 'dialer_settings', value: merged as any },
    update: { value: merged as any },
  })

  return merged
}

// ============================================
// HELPER: Get dialer phone number for a line
// ============================================

function getDialerNumber(lineNumber: number): string {
  const numbers = [
    process.env.TWILIO_DIALER_NUMBER_1 || process.env.TWILIO_PHONE_NUMBER || '',
    process.env.TWILIO_DIALER_NUMBER_2 || process.env.TWILIO_PHONE_NUMBER || '',
    process.env.TWILIO_DIALER_NUMBER_3 || process.env.TWILIO_PHONE_NUMBER || '',
  ]
  return numbers[(lineNumber - 1) % numbers.length] || process.env.TWILIO_PHONE_NUMBER || ''
}