import twilio from 'twilio'
import { prisma } from './db'

// ============================================
// POWER DIALER SERVICE LAYER
// Handles all Twilio Voice/Conference operations
// Gracefully degrades when dialer tables don't exist yet
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

// Cache table existence checks
let _callsTableExists: boolean | null = null
let _dncTableExists: boolean | null = null
let _dialerSessionTableExists: boolean | null = null

async function checkTable(name: string): Promise<boolean> {
  try {
    await prisma.$queryRawUnsafe(`SELECT 1 FROM "${name}" LIMIT 1`)
    return true
  } catch {
    return false
  }
}

// Typed prisma accessors that gracefully fail
const callsDb = () => (prisma as any).call
const dncDb = () => (prisma as any).doNotCall
const dialerSessionDb = () => (prisma as any).dialerSession

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
  leadIds: string[]
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

  if (_callsTableExists === null) _callsTableExists = await checkTable('calls')
  if (_dncTableExists === null) _dncTableExists = await checkTable('do_not_call')

  // Get lead data
  const leads = await prisma.lead.findMany({
    where: { id: { in: leadIds } },
    select: { id: true, phone: true, firstName: true, companyName: true },
  })

  // Check DNC list if table exists
  let dncSet = new Set<string>()
  if (_dncTableExists) {
    try {
      const dncPhones: any[] = await dncDb().findMany({
        where: { phone: { in: leads.map(l => l.phone) } },
        select: { phone: true },
      })
      dncSet = new Set(dncPhones.map((d: any) => d.phone))
    } catch {
      _dncTableExists = false
    }
  }

  const validLeads = leads.filter(l => !dncSet.has(l.phone))

  // Create call records if Call table exists
  let callRecords: Array<{ call: any; lead: typeof validLeads[0] }> = []

  if (_callsTableExists) {
    try {
      callRecords = await Promise.all(
        validLeads.map(async (lead, idx) => {
          const call = await callsDb().create({
            data: {
              leadId: lead.id, repId, dialBatchId: batchId,
              lineNumber: idx + 1, status: 'initiated', direction: 'outbound',
            },
          })
          return { call, lead }
        })
      )
    } catch {
      _callsTableExists = false
      // Fallback: create mock call records for UI
      callRecords = validLeads.map((lead, idx) => ({
        call: { id: `mock-${batchId}-${idx}`, leadId: lead.id, repId, lineNumber: idx + 1, status: 'ringing', twilioCallSid: null },
        lead,
      }))
    }
  } else {
    // Mock call records when table doesn't exist
    callRecords = validLeads.map((lead, idx) => ({
      call: { id: `mock-${batchId}-${idx}`, leadId: lead.id, repId, lineNumber: idx + 1, status: 'ringing', twilioCallSid: null },
      lead,
    }))
  }

  // If Twilio is configured, actually dial
  if (isTwilioConfigured() && _callsTableExists) {
    const client = getTwilioClient()

    for (const { call, lead } of callRecords) {
      try {
        const twilioCall = await client.calls.create({
          to: lead.phone,
          from: getDialerNumber(call.lineNumber || 1),
          url: `${process.env.BASE_URL}/api/webhooks/twilio-voice?callId=${call.id}&batchId=${batchId}&repId=${repId}`,
          statusCallback: `${process.env.BASE_URL}/api/webhooks/twilio-voice?event=status&callId=${call.id}`,
          statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
          timeout: 25,
        })

        await callsDb().update({
          where: { id: call.id },
          data: { twilioCallSid: twilioCall.sid, conferenceSid: `dialer-${repId}-${batchId}`, status: 'ringing' },
        })
      } catch {
        await callsDb().update({ where: { id: call.id }, data: { status: 'failed' } }).catch(() => {})
      }
    }
  }

  // Update session stats if table exists
  if (sessionId && _dialerSessionTableExists !== false) {
    if (_dialerSessionTableExists === null) _dialerSessionTableExists = await checkTable('dialer_sessions')
    if (_dialerSessionTableExists) {
      await dialerSessionDb().update({
        where: { id: sessionId },
        data: { totalDials: { increment: validLeads.length } },
      }).catch(() => { _dialerSessionTableExists = false })
    }
  }

  return {
    batchId,
    calls: callRecords.map(({ call, lead }) => ({
      callId: call.id,
      leadId: lead.id,
      lineNumber: call.lineNumber || 1,
      status: call.status || 'ringing',
      twilioCallSid: call.twilioCallSid || undefined,
    })),
    configured: isTwilioConfigured(),
  }
}

// ============================================
// CALL MANAGEMENT
// ============================================

export async function connectCall(callId: string, repId: string) {
  if (!_callsTableExists) return { id: callId, status: 'connected' }

  try {
    const call = await callsDb().update({ where: { id: callId }, data: { status: 'connected' } })
    return call
  } catch {
    return { id: callId, status: 'connected' }
  }
}

export async function dropCall(callId: string) {
  if (!_callsTableExists) return null

  try {
    const call = await callsDb().findUnique({ where: { id: callId } })
    if (!call) return null

    if (isTwilioConfigured() && call.twilioCallSid) {
      try {
        const client = getTwilioClient()
        await client.calls(call.twilioCallSid).update({ status: 'completed' })
      } catch { /* Call may have already ended */ }
    }

    return callsDb().update({ where: { id: callId }, data: { status: 'completed', outcome: 'dropped' } })
  } catch {
    return null
  }
}

export async function hangupCall(callId: string) {
  if (!_callsTableExists) return null

  try {
    const call = await callsDb().findUnique({ where: { id: callId } })
    if (!call) return null

    if (isTwilioConfigured() && call.twilioCallSid) {
      try {
        const client = getTwilioClient()
        await client.calls(call.twilioCallSid).update({ status: 'completed' })
      } catch { /* Call may have already ended */ }
    }

    return callsDb().update({ where: { id: callId }, data: { status: 'completed' } })
  } catch {
    return null
  }
}

export async function holdCall(callId: string) {
  if (!_callsTableExists) return { id: callId, status: 'on_hold' }

  try {
    return callsDb().update({ where: { id: callId }, data: { status: 'on_hold' } })
  } catch {
    return { id: callId, status: 'on_hold' }
  }
}

export async function resumeCall(callId: string) {
  if (!_callsTableExists) return { id: callId, status: 'connected' }

  try {
    return callsDb().update({ where: { id: callId }, data: { status: 'connected' } })
  } catch {
    return { id: callId, status: 'connected' }
  }
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

  let call: any = null

  // Try to update Call record if table exists
  if (_callsTableExists !== false) {
    try {
      call = await callsDb().update({
        where: { id: callId },
        data: {
          outcome, notes,
          callbackDate: callbackDate ? new Date(callbackDate) : undefined,
          durationSeconds, status: 'completed',
        },
        include: { lead: true },
      })
    } catch {
      // Table might not exist or callId is a mock
      if (callId.startsWith('mock-')) {
        _callsTableExists = false
      }
    }
  }

  // If we couldn't get the call record, fetch the lead directly
  const leadId = call?.leadId
  const repId = call?.repId

  // Update lead status based on outcome
  if (leadId) {
    const statusMap: Record<string, string> = {
      interested: 'QUALIFIED', not_interested: 'CLOSED_LOST',
      wrong_number: 'CLOSED_LOST', dnc: 'DO_NOT_CONTACT',
    }
    if (statusMap[outcome]) {
      await prisma.lead.update({
        where: { id: leadId },
        data: { status: statusMap[outcome] as any },
      }).catch(() => {})
    }

    // Add to DNC list if requested
    if (outcome === 'dnc' && call?.lead && _dncTableExists !== false) {
      try {
        await dncDb().upsert({
          where: { phone: call.lead.phone },
          create: { phone: call.lead.phone, reason: notes || 'Requested via dialer', addedBy: repId },
          update: {},
        })
      } catch {
        _dncTableExists = false
      }
    }
  }

  // Log as Activity (always works — this table exists)
  if (leadId && repId) {
    const vmOutcomes = ['voicemail_left', 'voicemail_skipped', 'voicemail_preview_sent']
    await prisma.activity.create({
      data: {
        leadId, repId,
        activityType: vmOutcomes.includes(outcome) ? 'VOICEMAIL' : 'CALL',
        callDisposition: mapOutcomeToDisposition(outcome) as any,
        notes, durationSeconds,
        callbackDate: callbackDate ? new Date(callbackDate) : undefined,
      },
    }).catch(() => {})

    // Update daily RepActivity counters
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const conversationOutcomes = [
      'interested', 'interested_saw_preview', 'interested_no_preview',
      'not_interested', 'callback', 'callback_reviewing',
      'payment_link_sent', 'closed_paid', 'wants_changes',
    ]
    const closeOutcomes = ['interested', 'interested_saw_preview', 'closed_paid']
    const isConversation = conversationOutcomes.includes(outcome)
    const isClose = closeOutcomes.includes(outcome)
    const isPaymentLinkSent = outcome === 'payment_link_sent' || outcome === 'closed_paid'
    const isPaid = outcome === 'closed_paid'

    await (prisma.repActivity.upsert as any)({
      where: { repId_date: { repId, date: today } },
      create: {
        repId, date: today, dials: 1,
        conversations: isConversation ? 1 : 0,
        closes: isClose ? 1 : 0,
        paymentLinksSent: isPaymentLinkSent ? 1 : 0,
        paymentsClosed: isPaid ? 1 : 0,
      },
      update: {
        dials: { increment: 1 },
        ...(isConversation ? { conversations: { increment: 1 } } : {}),
        ...(isClose ? { closes: { increment: 1 } } : {}),
        ...(isPaymentLinkSent ? { paymentLinksSent: { increment: 1 } } : {}),
        ...(isPaid ? { paymentsClosed: { increment: 1 } } : {}),
      },
    }).catch(() => {})
  }

  return call || { id: callId, outcome, status: 'completed' }
}

function mapOutcomeToDisposition(outcome: string): string {
  const map: Record<string, string> = {
    interested: 'INTERESTED', interested_saw_preview: 'INTERESTED', interested_no_preview: 'INTERESTED',
    not_interested: 'NOT_INTERESTED',
    callback: 'CALLBACK', callback_reviewing: 'CALLBACK',
    no_answer: 'NO_ANSWER',
    voicemail_left: 'VOICEMAIL', voicemail_skipped: 'VOICEMAIL', voicemail_preview_sent: 'VOICEMAIL',
    wrong_number: 'WRONG_NUMBER', dnc: 'NOT_INTERESTED',
    payment_link_sent: 'INTERESTED', closed_paid: 'INTERESTED', wants_changes: 'INTERESTED',
  }
  return map[outcome] || 'NO_ANSWER'
}

// ============================================
// AUTO-TEXT (Send preview link via SMS)
// ============================================

export async function autoTextPreview(callId: string, repName: string) {
  // Try to get call + lead from Call table
  let call: any = null
  if (_callsTableExists !== false) {
    try {
      call = await callsDb().findUnique({ where: { id: callId }, include: { lead: true } })
    } catch {
      _callsTableExists = false
    }
  }

  if (!call || !call.lead || !call.lead.previewUrl) {
    return { success: false, error: 'No preview URL available' }
  }

  const lead = call.lead
  const message = `Hey ${lead.firstName}, just left you a voicemail. Here's the preview for ${lead.companyName}: ${lead.previewUrl}`

  if (isTwilioConfigured()) {
    const { sendSMS } = await import('./twilio')
    const result = await sendSMS({ to: lead.phone, message, leadId: lead.id, sender: repName, trigger: 'dialer_auto_text' })

    if (result.success) {
      if (_callsTableExists) {
        await callsDb().update({ where: { id: callId }, data: { autoTexted: true } }).catch(() => {})
      }
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      await prisma.repActivity.upsert({
        where: { repId_date: { repId: call.repId, date: today } },
        create: { repId: call.repId, date: today, previewLinksSent: 1 },
        update: { previewLinksSent: { increment: 1 } },
      }).catch(() => {})
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
  return { configured: true, mode: 'listen' }
}

export async function adminWhisper(conferenceSid: string, adminIdentity: string) {
  if (!isTwilioConfigured()) return { configured: false }
  return { configured: true, mode: 'whisper' }
}

export async function adminBarge(conferenceSid: string, adminIdentity: string) {
  if (!isTwilioConfigured()) return { configured: false }
  return { configured: true, mode: 'barge' }
}

// ============================================
// CALLBACK MANAGEMENT
// ============================================

export async function scheduleCallback(callId: string, callbackDate: string, notes?: string) {
  let call: any = null

  if (_callsTableExists !== false) {
    try {
      call = await callsDb().update({
        where: { id: callId },
        data: { outcome: 'callback', callbackDate: new Date(callbackDate), notes, status: 'completed' },
      })
    } catch {
      // Mock call or table doesn't exist
    }
  }

  // Also log as Activity (always works)
  if (call) {
    await prisma.activity.create({
      data: {
        leadId: call.leadId, repId: call.repId,
        activityType: 'CALL', callDisposition: 'CALLBACK' as any,
        callbackDate: new Date(callbackDate),
        notes: notes || `Callback scheduled for ${callbackDate}`,
      },
    }).catch(() => {})
  }

  return call || { id: callId, outcome: 'callback', callbackDate }
}

export async function getCallbacks(repId: string) {
  if (_callsTableExists === null) _callsTableExists = await checkTable('calls')

  if (!_callsTableExists) {
    // Fallback: get callbacks from Activity table
    const now = new Date()
    const activities = await prisma.activity.findMany({
      where: {
        repId, callDisposition: 'CALLBACK',
        callbackDate: { not: null },
      },
      include: { lead: true },
      orderBy: { callbackDate: 'asc' },
      take: 20,
    })

    const overdue = activities.filter(a => a.callbackDate && a.callbackDate < now && a.lead && !['CLOSED_LOST', 'DO_NOT_CONTACT', 'PAID'].includes(a.lead.status))
    const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999)
    const today = activities.filter(a => a.callbackDate && a.callbackDate >= now && a.callbackDate <= todayEnd)
    const upcoming = activities.filter(a => a.callbackDate && a.callbackDate > todayEnd)

    return { overdue, today, upcoming }
  }

  try {
    const now = new Date()
    const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999)

    const [overdue, today, upcoming] = await Promise.all([
      callsDb().findMany({
        where: {
          repId, outcome: 'callback', callbackDate: { lt: now },
          lead: { status: { notIn: ['CLOSED_LOST', 'DO_NOT_CONTACT', 'PAID'] } },
        },
        include: { lead: true },
        orderBy: { callbackDate: 'asc' },
      }),
      callsDb().findMany({
        where: {
          repId, outcome: 'callback', callbackDate: { gte: now, lte: todayEnd },
          lead: { status: { notIn: ['CLOSED_LOST', 'DO_NOT_CONTACT', 'PAID'] } },
        },
        include: { lead: true },
        orderBy: { callbackDate: 'asc' },
      }),
      callsDb().findMany({
        where: {
          repId, outcome: 'callback',
          callbackDate: { gt: todayEnd, lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
          lead: { status: { notIn: ['CLOSED_LOST', 'DO_NOT_CONTACT', 'PAID'] } },
        },
        include: { lead: true },
        orderBy: { callbackDate: 'asc' },
      }),
    ])

    return { overdue, today, upcoming }
  } catch {
    _callsTableExists = false
    return { overdue: [], today: [], upcoming: [] }
  }
}

// ============================================
// DIALER SESSION MANAGEMENT
// ============================================

export async function startDialerSession(repId: string, mode: string, linesPerDial: number) {
  if (_dialerSessionTableExists === null) _dialerSessionTableExists = await checkTable('dialer_sessions')

  if (!_dialerSessionTableExists) {
    return { id: `mock-session-${Date.now()}`, repId, mode, linesPerDial, status: 'active' }
  }

  try {
    await dialerSessionDb().updateMany({
      where: { repId, status: 'active' },
      data: { status: 'ended', endedAt: new Date() },
    })
    return dialerSessionDb().create({ data: { repId, mode, linesPerDial } })
  } catch {
    _dialerSessionTableExists = false
    return { id: `mock-session-${Date.now()}`, repId, mode, linesPerDial, status: 'active' }
  }
}

export async function endDialerSession(sessionId: string) {
  if (!_dialerSessionTableExists || sessionId.startsWith('mock-')) {
    return { id: sessionId, status: 'ended' }
  }

  try {
    return dialerSessionDb().update({
      where: { id: sessionId },
      data: { status: 'ended', endedAt: new Date() },
    })
  } catch {
    return { id: sessionId, status: 'ended' }
  }
}

// ============================================
// LIVE REP STATUS (Admin view)
// ============================================

export async function getLiveRepStatus() {
  if (_callsTableExists === null) _callsTableExists = await checkTable('calls')

  // Build select/include based on what tables exist
  const selectObj: any = { id: true, name: true }

  if (_dialerSessionTableExists !== false) {
    if (_dialerSessionTableExists === null) _dialerSessionTableExists = await checkTable('dialer_sessions')
    if (_dialerSessionTableExists) {
      selectObj.dialerSessions = { where: { status: 'active' }, orderBy: { startedAt: 'desc' }, take: 1 }
    }
  }

  if (_callsTableExists) {
    selectObj.calls = {
      where: { status: { in: ['ringing', 'connected', 'on_hold'] } },
      include: { lead: { select: { firstName: true, lastName: true, companyName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 3,
    }
  }

  const activeReps = await prisma.user.findMany({
    where: { role: 'REP', status: 'ACTIVE' },
    select: selectObj,
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const repStats = await prisma.repActivity.findMany({
    where: { repId: { in: activeReps.map((r: any) => r.id) }, date: today },
  })

  const statsMap = new Map(repStats.map(s => [s.repId, s]))

  // Get preview status for all connected leads in one batch
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000)
  const connectedLeadIds: string[] = []
  for (const rep of activeReps as any[]) {
    const connected = (rep.calls || []).find((c: any) => c.status === 'connected')
    if (connected?.leadId) connectedLeadIds.push(connected.leadId)
  }

  let previewEventsMap = new Map<string, any[]>()
  let previewSentMap = new Map<string, any>()
  if (connectedLeadIds.length > 0) {
    const previewEvents = await prisma.leadEvent.findMany({
      where: {
        leadId: { in: connectedLeadIds },
        eventType: { in: ['PREVIEW_VIEWED', 'PREVIEW_CTA_CLICKED'] },
        createdAt: { gte: thirtyMinAgo },
      },
      orderBy: { createdAt: 'desc' },
    })
    for (const evt of previewEvents) {
      const existing = previewEventsMap.get(evt.leadId) || []
      existing.push(evt)
      previewEventsMap.set(evt.leadId, existing)
    }

    const sentActivities = await prisma.activity.findMany({
      where: {
        leadId: { in: connectedLeadIds },
        activityType: 'PREVIEW_SENT' as any,
        createdAt: { gte: thirtyMinAgo },
      },
      orderBy: { createdAt: 'desc' },
    })
    for (const act of sentActivities) {
      if (act.leadId && !previewSentMap.has(act.leadId)) {
        previewSentMap.set(act.leadId, act)
      }
    }
  }

  return (activeReps as any[]).map((rep: any) => {
    const session = rep.dialerSessions?.[0]
    const activeCalls = rep.calls || []
    const stats = statsMap.get(rep.id)

    let status: 'idle' | 'dialing' | 'on_call' | 'on_hold' = 'idle'
    if (activeCalls.some((c: any) => c.status === 'on_hold')) status = 'on_hold'
    else if (activeCalls.some((c: any) => c.status === 'connected')) status = 'on_call'
    else if (activeCalls.some((c: any) => c.status === 'ringing')) status = 'dialing'

    const connectedCall = activeCalls.find((c: any) => c.status === 'connected')

    // Build preview status for connected lead
    let previewStatus: any = null
    if (connectedCall?.leadId) {
      const events = previewEventsMap.get(connectedCall.leadId) || []
      const sentActivity = previewSentMap.get(connectedCall.leadId)
      if (events.length > 0) {
        const lastView = events.find((e: any) => e.eventType === 'PREVIEW_VIEWED')
        const ctaClicked = events.some((e: any) => e.eventType === 'PREVIEW_CTA_CLICKED')
        let viewDuration = 0
        if (lastView?.metadata) {
          try {
            const meta = typeof lastView.metadata === 'string' ? JSON.parse(lastView.metadata as string) : lastView.metadata
            viewDuration = meta?.duration || 0
          } catch { /* ignore */ }
        }
        previewStatus = { opened: true, ctaClicked, viewDurationSeconds: viewDuration, lastViewedAt: lastView?.createdAt }
      } else if (sentActivity) {
        previewStatus = { opened: false, sent: true, sentAt: sentActivity.createdAt }
      }
    }

    return {
      repId: rep.id, repName: rep.name, status,
      sessionActive: !!session,
      currentLead: connectedCall?.lead || null,
      activeCalls: activeCalls.length,
      callDuration: connectedCall ? Math.floor((Date.now() - new Date(connectedCall.createdAt).getTime()) / 1000) : 0,
      todayStats: {
        dials: stats?.dials || 0, conversations: stats?.conversations || 0,
        closes: stats?.closes || 0, previewsSent: stats?.previewLinksSent || 0,
      },
      previewStatus,
    }
  })
}

// ============================================
// DIALER SETTINGS
// ============================================

export interface DialerSettings {
  linesPerDial: number
  ringTimeout: number
  pauseBetweenBatches: number
  maxDialsPerHour: number
}

export const DEFAULT_DIALER_SETTINGS: DialerSettings = {
  linesPerDial: 3, ringTimeout: 25, pauseBetweenBatches: 2, maxDialsPerHour: 80,
}

export async function getDialerSettings(): Promise<DialerSettings> {
  const settings = await prisma.settings.findUnique({ where: { key: 'dialer_settings' } })
  if (settings?.value) {
    return { ...DEFAULT_DIALER_SETTINGS, ...(settings.value as any) }
  }
  return DEFAULT_DIALER_SETTINGS
}

export async function updateDialerSettings(updates: Partial<DialerSettings>) {
  const current = await getDialerSettings()
  const merged = { ...current, ...updates }
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