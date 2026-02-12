import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { logInboundSMS } from '@/lib/twilio'
import twilio from 'twilio'

// POST /api/webhooks/twilio - Handle inbound SMS
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const from = formData.get('From') as string
    const body = formData.get('Body') as string
    const sid = formData.get('MessageSid') as string

    // Validate Twilio signature (PRODUCTION SECURITY)
    const signature = request.headers.get('X-Twilio-Signature')
    const url = request.url
    const authToken = process.env.TWILIO_AUTH_TOKEN!
    
    if (signature && process.env.NODE_ENV === 'production') {
      const params = Object.fromEntries(formData)
      const valid = twilio.validateRequest(authToken, signature, url, params)
      
      if (!valid) {
        console.error('Invalid Twilio signature')
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 403 }
        )
      }
    }

    // Find lead or client by phone
    const lead = await prisma.lead.findFirst({
      where: { phone: from }
    })

    const client = await prisma.client.findFirst({
      where: {
        lead: {
          phone: from
        }
      },
      include: { lead: true }
    })

    // Log inbound message
    await logInboundSMS({
      from,
      body,
      sid,
      leadId: lead?.id || client?.leadId,
      clientId: client?.id
    })

    // Check for escalation triggers
    const shouldEscalate = checkForEscalation(body)

    if (shouldEscalate) {
      await prisma.message.updateMany({
        where: { twilioSid: sid },
        data: {
          escalated: true,
          escalationReason: 'Detected escalation trigger in message'
        }
      })

      // Create notification
      await prisma.notification.create({
        data: {
          type: 'CLIENT_TEXT',
          title: 'Message Needs Attention',
          message: `From: ${lead?.firstName || client?.lead?.firstName} - ${body.substring(0, 50)}...`,
          metadata: { leadId: lead?.id, clientId: client?.id, from, body }
        }
      })
    }

    // Respond with empty TwiML (no auto-reply)
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        headers: { 'Content-Type': 'text/xml' }
      }
    )
  } catch (error) {
    console.error('Twilio webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

function checkForEscalation(message: string): boolean {
  const triggers = [
    'refund',
    'cancel',
    'lawyer',
    'attorney',
    'sue',
    'scam',
    'fraud',
    'worst',
    'unacceptable',
    'bbb',
    'complaint',
    'angry',
    'disappointed'
  ]

  const lowerMessage = message.toLowerCase()
  return triggers.some(trigger => lowerMessage.includes(trigger))
}
