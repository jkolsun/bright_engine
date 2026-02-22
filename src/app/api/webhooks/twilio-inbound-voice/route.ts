export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { verifyTwilioSignature } from '@/lib/twilio-verify'
import { prisma } from '@/lib/db'
import { isDNC } from '@/lib/dnc-check'
import { pushToRep, pushToAllAdmins } from '@/lib/dialer-events'

const getPublicUrl = () =>
  process.env.NEXT_PUBLIC_APP_URL || process.env.BASE_URL || 'https://preview.brightautomations.org'

export async function POST(request: NextRequest) {
  try {
    const publicUrl = getPublicUrl()

    const isValid = await verifyTwilioSignature(
      request.clone(),
      `${publicUrl}/api/webhooks/twilio-inbound-voice`
    )
    if (!isValid) {
      return new Response('Forbidden', { status: 403 })
    }

    const formData = await request.formData()
    const from = formData.get('From') as string
    const to = formData.get('To') as string
    const callSid = formData.get('CallSid') as string

    // Find which rep owns this number
    const rep = await prisma.user.findFirst({
      where: { OR: [{ twilioNumber1: to }, { twilioNumber2: to }] },
      select: { id: true, name: true },
    })

    if (!rep) {
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Say>This number is not configured.</Say></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    // Find lead by phone (primary or secondary)
    const lead = await prisma.lead.findFirst({
      where: { OR: [{ phone: from }, { secondaryPhone: from }] },
      select: { id: true, companyName: true, dncAt: true, firstName: true },
    })

    // DNC check
    const blocked = lead?.dncAt || (lead ? await isDNC(from, lead.id) : await isDNC(from))

    // Create DialerCall for inbound only if we have a lead (leadId is required FK)
    let call: { id: string } | null = null
    if (lead) {
      call = await prisma.dialerCall.create({
        data: {
          leadId: lead.id,
          repId: rep.id,
          direction: 'INBOUND',
          twilioCallSid: callSid,
          phoneNumberUsed: from,
          status: 'RINGING',
        },
      }).catch(() => null)
    }

    // Push INBOUND_CALL SSE to rep
    pushToRep(rep.id, {
      type: 'INBOUND_CALL',
      data: {
        callId: call?.id,
        callSid,
        from,
        leadId: lead?.id,
        companyName: lead?.companyName,
        contactName: lead?.firstName || undefined,
        isDNC: !!blocked,
      },
      timestamp: new Date().toISOString(),
    })

    pushToAllAdmins({
      type: 'INBOUND_CALL',
      data: { callId: call?.id, from, repId: rep.id, repName: rep.name, leadId: lead?.id },
      timestamp: new Date().toISOString(),
    })

    // TwiML: ring the rep's browser (using their identity)
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial timeout="30" action="${publicUrl}/api/webhooks/twilio-voice-status${call ? `?callId=${call.id}` : ''}">
    <Client>rep-${rep.id}</Client>
  </Dial>
</Response>`

    return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } })
  } catch (error) {
    console.error('[Twilio Inbound Voice Webhook] POST error:', error)
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response><Say>An error occurred. Please try again later.</Say></Response>',
      { status: 500, headers: { 'Content-Type': 'text/xml' } }
    )
  }
}
