import twilio from 'twilio'
import { prisma } from './db'

// Lazy initialize Twilio client
let client: ReturnType<typeof twilio> | null = null

function getTwilioClient() {
  if (!client) {
    client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )
  }
  return client
}

function getFromNumber() {
  return process.env.TWILIO_PHONE_NUMBER!
}

export interface SendSMSOptions {
  to: string
  message: string
  leadId?: string
  clientId?: string
  sender?: string // 'clawdbot', 'andrew', etc.
  trigger?: string // What caused this message
}

export async function sendSMS(options: SendSMSOptions) {
  const { to, message, leadId, clientId, sender = 'clawdbot', trigger } = options

  try {
    // Send via Twilio
    const client = getTwilioClient()
    const twilioMessage = await client.messages.create({
      body: message,
      from: getFromNumber(),
      to: to,
    })

    // Log to database
    await prisma.message.create({
      data: {
        leadId,
        clientId,
        direction: 'OUTBOUND',
        channel: 'SMS',
        senderType: 'CLAWDBOT',
        senderName: sender,
        recipient: to,
        content: message,
        trigger,
        twilioSid: twilioMessage.sid,
        twilioStatus: twilioMessage.status,
      },
    })

    return { success: true, sid: twilioMessage.sid }
  } catch (error) {
    console.error('SMS send failed:', error)
    
    // Log failed message
    await prisma.message.create({
      data: {
        leadId,
        clientId,
        direction: 'OUTBOUND',
        channel: 'SMS',
        senderType: 'CLAWDBOT',
        senderName: sender,
        recipient: to,
        content: message,
        trigger,
        twilioStatus: 'failed',
      },
    })

    return { success: false, error: (error as Error).message }
  }
}

export async function logInboundSMS(options: {
  from: string
  body: string
  sid: string
  leadId?: string
  clientId?: string
}) {
  const { from, body, sid, leadId, clientId } = options

  await prisma.message.create({
    data: {
      leadId,
      clientId,
      direction: 'INBOUND',
      channel: 'SMS',
      senderType: 'LEAD',
      senderName: 'client',
      recipient: getFromNumber(),
      content: body,
      twilioSid: sid,
      twilioStatus: 'received',
    },
  })
}

export default client
