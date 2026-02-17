import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * POST /api/webhooks/twilio-voice — Handle Twilio voice call events
 * This endpoint receives call status callbacks from Twilio
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const callId = searchParams.get('callId')
    const batchId = searchParams.get('batchId')
    const repId = searchParams.get('repId')
    const event = searchParams.get('event')

    const formData = await request.formData()
    const callStatus = formData.get('CallStatus') as string
    const callSid = formData.get('CallSid') as string
    const callDuration = formData.get('CallDuration') as string

    if (event === 'status' && callId) {
      // Status callback — update call record
      const statusMap: Record<string, string> = {
        initiated: 'initiated',
        ringing: 'ringing',
        'in-progress': 'connected',
        completed: 'completed',
        busy: 'busy',
        'no-answer': 'no_answer',
        failed: 'failed',
        canceled: 'failed',
      }

      const newStatus = statusMap[callStatus] || callStatus

      await prisma.call.update({
        where: { id: callId },
        data: {
          status: newStatus,
          ...(callDuration ? { durationSeconds: parseInt(callDuration) } : {}),
        },
      })

      // If call was answered, check if we need to connect to rep and drop others
      if (callStatus === 'in-progress' && batchId && repId) {
        // This call was answered — drop all other calls in the same batch
        const otherCalls = await prisma.call.findMany({
          where: {
            dialBatchId: batchId,
            id: { not: callId },
            status: { in: ['initiated', 'ringing'] },
          },
        })

        for (const otherCall of otherCalls) {
          if (otherCall.twilioCallSid) {
            // In production, would hang up via Twilio API
          }
          await prisma.call.update({
            where: { id: otherCall.id },
            data: { status: 'completed', outcome: 'dropped' },
          })
        }
      }
    } else if (callId) {
      // TwiML response for outbound call
      // When Twilio connects the call, serve TwiML to bridge to conference
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Conference
      beep="false"
      startConferenceOnEnter="true"
      endConferenceOnExit="false"
      waitUrl=""
    >
      dialer-${repId}-${batchId}
    </Conference>
  </Dial>
</Response>`

      return new NextResponse(twiml, {
        headers: { 'Content-Type': 'text/xml' },
      })
    }

    // Default empty TwiML response
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { 'Content-Type': 'text/xml' } }
    )
  } catch (error) {
    console.error('Twilio voice webhook error:', error)
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { 'Content-Type': 'text/xml' } }
    )
  }
}