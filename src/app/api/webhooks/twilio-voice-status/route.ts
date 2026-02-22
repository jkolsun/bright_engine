export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { verifyTwilioSignature } from '@/lib/twilio-verify'
import { prisma } from '@/lib/db'
import { pushToRep, pushToAllAdmins } from '@/lib/dialer-events'

const getPublicUrl = () =>
  process.env.NEXT_PUBLIC_APP_URL || process.env.BASE_URL || 'https://preview.brightautomations.org'

/**
 * POST /api/webhooks/twilio-voice-status — Twilio call status callback
 * Receives status updates (initiated, ringing, answered, completed, etc.)
 * and updates DialerCall records + pushes SSE events.
 * Bug 9: Verify Twilio signature in production.
 */
export async function POST(request: NextRequest) {
  const publicUrl = getPublicUrl()
  const webhookUrl = `${publicUrl}/api/webhooks/twilio-voice-status`

  const isValid = await verifyTwilioSignature(request.clone(), webhookUrl)
  if (!isValid) {
    console.warn('[TwilioVoiceStatus] Invalid signature — rejecting request')
    return new Response('Forbidden', { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const callId = searchParams.get('callId')

    const formData = await request.formData()
    const callStatus = formData.get('CallStatus') as string | null
    const callSid = formData.get('CallSid') as string | null
    const callDuration = formData.get('CallDuration') as string | null

    if (!callStatus) {
      return new Response('OK', { status: 200 })
    }

    // Map Twilio statuses to our DialerCallStatus enum
    const statusMap: Record<string, string> = {
      initiated: 'INITIATED',
      ringing: 'RINGING',
      'in-progress': 'CONNECTED',
      answered: 'CONNECTED',
      completed: 'COMPLETED',
      busy: 'BUSY',
      'no-answer': 'NO_ANSWER',
      failed: 'FAILED',
      canceled: 'FAILED',
    }

    const newStatus = statusMap[callStatus] || null
    if (!newStatus) {
      return new Response('OK', { status: 200 })
    }

    // Find the DialerCall — by callId (query param) or by twilioCallSid
    let dialerCall: { id: string; status: any; leadId: string; repId: string } | null = null
    if (callId) {
      dialerCall = await prisma.dialerCall.findUnique({
        where: { id: callId },
        select: { id: true, repId: true, leadId: true, status: true },
      })
    }
    if (!dialerCall && callSid) {
      dialerCall = await prisma.dialerCall.findUnique({
        where: { twilioCallSid: callSid },
        select: { id: true, repId: true, leadId: true, status: true },
      })
    }

    if (!dialerCall) {
      console.warn('[TwilioVoiceStatus] No matching DialerCall for', { callId, callSid })
      return new Response('OK', { status: 200 })
    }

    // Build update data based on status
    const updateData: Record<string, unknown> = {
      status: newStatus,
    }

    if (newStatus === 'CONNECTED' && dialerCall.status !== 'CONNECTED') {
      updateData.connectedAt = new Date()
    }

    if (newStatus === 'COMPLETED' || newStatus === 'FAILED' || newStatus === 'BUSY' || newStatus === 'NO_ANSWER') {
      updateData.endedAt = new Date()
      if (callDuration) {
        updateData.duration = parseInt(callDuration, 10)
      }
    }

    // Store twilioCallSid if we have it and it's not set
    if (callSid) {
      updateData.twilioCallSid = callSid
    }

    await prisma.dialerCall.update({
      where: { id: dialerCall.id },
      data: updateData,
    })

    // Push SSE to rep
    const sseEvent = {
      type: 'CALL_STATUS' as const,
      data: {
        callId: dialerCall.id,
        leadId: dialerCall.leadId,
        status: newStatus,
        callSid,
        duration: callDuration ? parseInt(callDuration, 10) : undefined,
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
    console.error('[TwilioVoiceStatus] Error processing status callback:', error)
    return new Response('OK', { status: 200 })
  }
}
