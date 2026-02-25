export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { verifyTwilioSignature } from '@/lib/twilio-verify'
import { prisma } from '@/lib/db'
import { pushToRep, pushToAllAdmins } from '@/lib/dialer-events'
import { dropVoicemail } from '@/lib/dialer-service'

const getPublicUrl = () =>
  process.env.NEXT_PUBLIC_APP_URL || process.env.BASE_URL || 'https://preview.brightautomations.org'

/**
 * POST /api/webhooks/twilio-amd — Async AMD (Answering Machine Detection) callback
 * Twilio posts AMD result here after detection completes.
 * Updates DialerCall.amdResult and pushes SSE so the UI can offer VM drop.
 * Bug 9: Verify Twilio signature in production.
 */
export async function POST(request: NextRequest) {
  const publicUrl = getPublicUrl()

  // Build verification URL with query params — Twilio signs the FULL URL
  const { searchParams } = new URL(request.url)
  const callId = searchParams.get('callId')
  const webhookUrl = callId
    ? `${publicUrl}/api/webhooks/twilio-amd?callId=${encodeURIComponent(callId)}`
    : `${publicUrl}/api/webhooks/twilio-amd`

  const isValid = await verifyTwilioSignature(request.clone(), webhookUrl)
  if (!isValid) {
    console.warn('[TwilioAMD] Invalid signature — rejecting request')
    return new Response('Forbidden', { status: 403 })
  }

  try {

    const formData = await request.formData()
    const answeredBy = formData.get('AnsweredBy') as string | null
    const callSid = formData.get('CallSid') as string | null

    // AnsweredBy values: human, machine_start, machine_end_beep,
    // machine_end_silence, machine_end_other, fax, unknown

    if (!answeredBy) {
      return new Response('OK', { status: 200 })
    }

    // Find DialerCall (include connectedAt and status for false-positive detection)
    let dialerCall: { id: string; repId: string; leadId: string; connectedAt: Date | null; status: string } | null = null
    if (callId) {
      dialerCall = await prisma.dialerCall.findUnique({
        where: { id: callId },
        select: { id: true, repId: true, leadId: true, connectedAt: true, status: true },
      })
    }
    if (!dialerCall && callSid) {
      dialerCall = await prisma.dialerCall.findUnique({
        where: { twilioCallSid: callSid },
        select: { id: true, repId: true, leadId: true, connectedAt: true, status: true },
      })
    }

    if (!dialerCall) {
      console.warn('[TwilioAMD] No matching DialerCall for', { callId, callSid })
      return new Response('OK', { status: 200 })
    }

    // Determine if machine or human
    const isMachine = answeredBy.startsWith('machine') || answeredBy === 'fax'

    // CRITICAL: If the call is already connected (rep is talking to a live person),
    // AMD is a false positive — do NOT mark as voicemail or auto-drop
    const wasAlreadyConnected = !!(dialerCall.connectedAt || dialerCall.status === 'CONNECTED')
    if (isMachine && wasAlreadyConnected) {
      console.log('[TwilioAMD] AMD says machine but call already connected — treating as false positive for call', dialerCall.id)
      // Still record the AMD result for analytics, but do NOT change status
      await prisma.dialerCall.update({
        where: { id: dialerCall.id },
        data: { amdResult: answeredBy },
      })
      // Push SSE with amdOverridden so frontend knows to ignore
      const sseEvent = {
        type: 'CALL_STATUS' as const,
        data: {
          callId: dialerCall.id,
          leadId: dialerCall.leadId,
          amdResult: answeredBy,
          isMachine: true,
          amdOverridden: true,
          wasAlreadyConnected: true,
        },
        timestamp: new Date().toISOString(),
      }
      pushToRep(dialerCall.repId, sseEvent)
      pushToAllAdmins({ ...sseEvent, data: { ...sseEvent.data, repId: dialerCall.repId } })
      return new Response('OK', { status: 200 })
    }

    // Update DialerCall with AMD result
    await prisma.dialerCall.update({
      where: { id: dialerCall.id },
      data: {
        amdResult: answeredBy,
        ...(isMachine ? { status: 'VOICEMAIL' } : {}),
      },
    })

    // Auto VM drop: if machine detected + rep has recording + session has auto-dial ON
    // → drop the pre-recorded VM immediately (right after the beep) and free the rep
    let vmAutoDropped = false
    if (isMachine) {
      try {
        const [rep, activeSession] = await Promise.all([
          prisma.user.findUnique({
            where: { id: dialerCall.repId },
            select: { vmRecordingUrl: true, outboundVmUrl: true },
          }),
          prisma.dialerSessionNew.findFirst({
            where: { repId: dialerCall.repId, endedAt: null, autoDialEnabled: true },
            select: { id: true },
          }),
        ])

        const vmUrl = rep?.vmRecordingUrl || rep?.outboundVmUrl
        if (activeSession && vmUrl) {
          await dropVoicemail(dialerCall.id)
          vmAutoDropped = true
          console.log('[TwilioAMD] Auto VM drop succeeded for call', dialerCall.id)
        }
      } catch (err) {
        console.warn('[TwilioAMD] Auto VM drop failed, falling back to manual:', err)
      }
    }

    // Push SSE to rep — frontend auto-skips when isMachine + auto-dial ON
    const sseEvent = {
      type: 'CALL_STATUS' as const,
      data: {
        callId: dialerCall.id,
        leadId: dialerCall.leadId,
        amdResult: answeredBy,
        isMachine,
        status: isMachine ? 'VOICEMAIL' : undefined,
        vmAutoDropped,
      },
      timestamp: new Date().toISOString(),
    }

    pushToRep(dialerCall.repId, sseEvent)
    pushToAllAdmins({
      ...sseEvent,
      data: { ...sseEvent.data, repId: dialerCall.repId },
    })

    return new Response('OK', { status: 200 })
  } catch (error) {
    console.error('[TwilioAMD] Error processing AMD callback:', error)
    return new Response('OK', { status: 200 })
  }
}
