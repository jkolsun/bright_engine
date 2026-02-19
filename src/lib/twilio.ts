import twilio from 'twilio'
import { sendSMSViaProvider, logInboundSMSViaProvider } from './sms-provider'

// Lazy initialize Twilio client (kept for direct Twilio usage like voice/dialer)
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

export function getFromNumber() {
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

/**
 * @deprecated Use sendSMSViaProvider() from sms-provider.ts directly for new code.
 * This wrapper exists for backward compatibility with existing call sites.
 */
export async function sendSMS(options: SendSMSOptions) {
  return sendSMSViaProvider({
    to: options.to,
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

export { getTwilioClient }
export default client
