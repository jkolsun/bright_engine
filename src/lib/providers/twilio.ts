import twilio from 'twilio'
import type { SMSProvider, SMSSendOptions, SMSSendResult, SMSInboundMessage } from '../sms-provider'
import { registerClientInvalidator } from '../api-keys'

// Track active instance for key invalidation
let _activeProvider: TwilioProvider | null = null
registerClientInvalidator(() => { _activeProvider?.resetClient() })

export class TwilioProvider implements SMSProvider {
  private client: ReturnType<typeof twilio> | null = null

  constructor() {
    _activeProvider = this
  }

  resetClient() { this.client = null }

  private getClient() {
    if (!this.client) {
      this.client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      )
    }
    return this.client
  }

  async send(options: SMSSendOptions): Promise<SMSSendResult> {
    try {
      const client = this.getClient()
      const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID

      // Determine the "from" source — 3-tier priority:
      // 1. Explicit fromNumber (e.g., rep's personal Twilio number for manual texts)
      // 2. Messaging Service (A2P compliant for automated/system messages)
      // 3. System phone number (TWILIO_PHONE_NUMBER env var)
      let fromConfig: { from: string } | { messagingServiceSid: string }

      if (options.fromNumber) {
        // Rep or specific caller requested a specific from-number.
        // Use it directly — bypasses Messaging Service intentionally.
        fromConfig = { from: options.fromNumber }
      } else if (messagingServiceSid) {
        // No specific number requested — use Messaging Service for A2P compliance
        fromConfig = { messagingServiceSid }
      } else {
        // No Messaging Service configured — use system number directly
        fromConfig = { from: process.env.TWILIO_PHONE_NUMBER! }
      }

      const message = await client.messages.create({
        body: options.message,
        to: options.to,
        ...fromConfig,
      })

      return { success: true, sid: message.sid }
    } catch (error) {
      console.error('TwilioProvider.send failed:', error)
      return { success: false, error: (error as Error).message }
    }
  }

  async parseInboundWebhook(formData: FormData): Promise<SMSInboundMessage> {
    const from = formData.get('From') as string
    const body = formData.get('Body') as string
    const sid = formData.get('MessageSid') as string

    // Extract MMS media URLs and content types if present
    const numMedia = parseInt(formData.get('NumMedia') as string || '0', 10)
    const mediaUrls: string[] = []
    const mediaTypes: string[] = []
    for (let i = 0; i < numMedia; i++) {
      const url = formData.get(`MediaUrl${i}`) as string
      const contentType = formData.get(`MediaContentType${i}`) as string
      if (url) {
        mediaUrls.push(url)
        mediaTypes.push(contentType || 'unknown')
      }
    }

    return {
      from, body, sid,
      mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
      mediaTypes: mediaTypes.length > 0 ? mediaTypes : undefined,
    }
  }

  async validateWebhookSignature(request: Request, url: string): Promise<boolean> {
    // Skip validation in non-production
    if (process.env.NODE_ENV !== 'production') return true

    const signature = request.headers.get('X-Twilio-Signature')
    if (!signature) return false

    const authToken = process.env.TWILIO_AUTH_TOKEN!

    // Clone request to read form params without consuming the original
    try {
      const clonedRequest = request.clone()
      const formData = await clonedRequest.formData()
      const params: Record<string, string> = {}
      formData.forEach((value, key) => {
        params[key] = value as string
      })

      return twilio.validateRequest(authToken, signature, url, params)
    } catch {
      return false
    }
  }
}
