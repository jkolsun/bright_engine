export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { verifyTwilioSignature } from '@/lib/twilio-verify'
import { prisma } from '@/lib/db'

const getPublicUrl = () =>
  process.env.NEXT_PUBLIC_APP_URL || process.env.BASE_URL || 'https://preview.brightautomations.org'

/**
 * POST /api/webhooks/twilio-voice — TwiML App webhook
 * When a rep initiates a call via @twilio/voice-sdk, Twilio hits this endpoint
 * to get TwiML instructions. Returns <Dial> with caller ID, AMD, and status callbacks.
 * Bug 9: Verify Twilio signature in production.
 */
export async function POST(request: NextRequest) {
  const publicUrl = getPublicUrl()
  const webhookUrl = `${publicUrl}/api/webhooks/twilio-voice`

  const isValid = await verifyTwilioSignature(request.clone(), webhookUrl)
  if (!isValid) {
    console.warn('[TwilioVoice] Invalid signature — rejecting request')
    return new Response('Forbidden', { status: 403 })
  }

  try {
    const formData = await request.formData()
    const to = formData.get('To') as string | null
    const from = formData.get('From') as string | null
    const callSid = formData.get('CallSid') as string | null

    // Custom params passed from device.connect({ params: { ... } })
    const callId = formData.get('callId') as string | null
    const leadId = formData.get('leadId') as string | null

    if (!to) {
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Say>No destination number provided.</Say></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    // Extract repId from identity (format: "client:rep-{userId}" or "rep-{userId}")
    const identityMatch = from?.match(/rep-(.+)/)
    const repId = identityMatch ? identityMatch[1] : null

    // Look up rep's numbers for caller ID rotation
    let callerId = process.env.TWILIO_PHONE_NUMBER || ''
    if (repId) {
      const rep = await prisma.user.findUnique({
        where: { id: repId },
        select: { twilioNumber1: true, twilioNumber2: true },
      })
      if (rep?.twilioNumber1) {
        callerId = rep.twilioNumber1
        // Alternate caller ID: odd session call count → number1, even → number2
        if (rep.twilioNumber2 && callId) {
          try {
            const dialerCall = await prisma.dialerCall.findUnique({
              where: { id: callId },
              select: { sessionId: true },
            })
            if (dialerCall?.sessionId) {
              const callCount = await prisma.dialerCall.count({
                where: { sessionId: dialerCall.sessionId, direction: 'OUTBOUND' },
              })
              // Even count → number2 (0-indexed: call 0=num1, 1=num2, 2=num1...)
              if (callCount % 2 === 0) {
                callerId = rep.twilioNumber2
              }
            }
          } catch (err) {
            // Fall through to twilioNumber1 on any error
            console.warn('[TwilioVoice] Number rotation query failed:', err)
          }
        }
      }
    }

    // Update DialerCall with Twilio CallSid if we have a callId
    if (callId && callSid) {
      await prisma.dialerCall.update({
        where: { id: callId },
        data: { twilioCallSid: callSid, status: 'INITIATED' },
      }).catch(() => { /* call may not exist yet */ })
    }

    // Build callback URLs
    const queryParams = callId ? `?callId=${encodeURIComponent(callId)}` : ''
    const statusCallbackUrl = `${publicUrl}/api/webhooks/twilio-voice-status${queryParams}`
    const amdCallbackUrl = `${publicUrl}/api/webhooks/twilio-amd${queryParams}`

    // Escape XML special chars in URLs
    const escXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${escXml(callerId)}" answerOnBridge="true" timeout="30"
        statusCallback="${escXml(statusCallbackUrl)}"
        statusCallbackEvent="initiated ringing answered completed no-answer busy failed"
        statusCallbackMethod="POST">
    <Number
      machineDetection="DetectMessageEnd"
      asyncAmd="true"
      asyncAmdStatusCallback="${escXml(amdCallbackUrl)}"
      asyncAmdStatusCallbackMethod="POST"
    >${escXml(to)}</Number>
  </Dial>
</Response>`

    return new Response(twiml, {
      headers: { 'Content-Type': 'text/xml' },
    })
  } catch (error) {
    console.error('[TwilioVoice] Error generating TwiML:', error)
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { 'Content-Type': 'text/xml' } }
    )
  }
}
