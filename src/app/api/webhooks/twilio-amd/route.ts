export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { verifyTwilioSignature } from '@/lib/twilio-verify'
import { prisma } from '@/lib/db'
import { pushToRep, pushToAllAdmins } from '@/lib/dialer-events'

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
  const webhookUrl = `${publicUrl}/api/webhooks/twilio-amd`

  const isValid = await verifyTwilioSignature(request.clone(), webhookUrl)
  if (!isValid) {
    console.warn('[TwilioAMD] Invalid signature — rejecting request')
    return new Response('Forbidden', { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const callId = searchParams.get('callId')

    const formData = await request.formData()
    const answeredBy = formData.get('AnsweredBy') as string | null
    const callSid = formData.get('CallSid') as string | null

    // AnsweredBy values: human, machine_start, machine_end_beep,
    // machine_end_silence, machine_end_other, fax, unknown

    if (!answeredBy) {
      return new Response('OK', { status: 200 })
    }

    // Find DialerCall
    let dialerCall: { id: string; repId: string; leadId: string } | null = null
    if (callId) {
      dialerCall = await prisma.dialerCall.findUnique({
        where: { id: callId },
        select: { id: true, repId: true, leadId: true },
      })
    }
    if (!dialerCall && callSid) {
      dialerCall = await prisma.dialerCall.findUnique({
        where: { twilioCallSid: callSid },
        select: { id: true, repId: true, leadId: true },
      })
    }

    if (!dialerCall) {
      console.warn('[TwilioAMD] No matching DialerCall for', { callId, callSid })
      return new Response('OK', { status: 200 })
    }

    // Determine if machine or human
    const isMachine = answeredBy.startsWith('machine') || answeredBy === 'fax'

    // Update DialerCall with AMD result
    await prisma.dialerCall.update({
      where: { id: dialerCall.id },
      data: {
        amdResult: answeredBy,
        // If voicemail detected, update status
        ...(isMachine ? { status: 'VOICEMAIL' } : {}),
      },
    })

    // Push SSE to rep — enables VM drop button if machine detected
    const sseEvent = {
      type: 'CALL_STATUS' as const,
      data: {
        callId: dialerCall.id,
        leadId: dialerCall.leadId,
        amdResult: answeredBy,
        isMachine,
        status: isMachine ? 'VOICEMAIL' : undefined,
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
