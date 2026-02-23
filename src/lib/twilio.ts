import twilio from 'twilio'
import { sendSMSViaProvider, logInboundSMSViaProvider } from './sms-provider'
import { registerClientInvalidator } from './api-keys'

// Lazy initialize Twilio client (kept for direct Twilio usage like voice/dialer)
let client: ReturnType<typeof twilio> | null = null
registerClientInvalidator(() => { client = null })

function getTwilioClient() {
  if (!client) {
    client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )
  }
  return client
}

export function getFromNumber() {
  return process.env.TWILIO_PHONE_NUMBER!
}

export interface SendSMSOptions {
  to: string
  fromNumber?: string // Send from a specific Twilio number (passed through to provider)
  message: string
  leadId?: string
  clientId?: string
  sender?: string // 'clawdbot', 'andrew', etc.
  trigger?: string // What caused this message
}

/**
 * @deprecated Use sendSMSViaProvider() from sms-provider.ts directly for new code.
 * This wrapper exists for backward compatibility with existing call sites.
 */
export async function sendSMS(options: SendSMSOptions) {
  return sendSMSViaProvider({
    to: options.to,
    fromNumber: options.fromNumber,
    message: options.message,
    leadId: options.leadId,
    clientId: options.clientId,
    sender: options.sender,
    trigger: options.trigger,
  })
}

/**
 * @deprecated Use logInboundSMSViaProvider() from sms-provider.ts directly.
 */
export async function logInboundSMS(options: {
  from: string
  body: string
  sid: string
  leadId?: string
  clientId?: string
}) {
  return logInboundSMSViaProvider(options)
}

/**
 * Get the preferred SMS number for a lead.
 * Respects the smsPreferredNumber field (primary vs secondary).
 */
export async function getLeadSmsNumber(leadId: string): Promise<string> {
  const { prisma } = await import('./db')
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { phone: true, secondaryPhone: true, smsPreferredNumber: true },
  })
  if (!lead) throw new Error(`Lead ${leadId} not found`)

  if (lead.smsPreferredNumber === 'secondary' && lead.secondaryPhone) {
    return lead.secondaryPhone
  }
  return lead.phone
}

export { getTwilioClient }
export default client
