/**
 * SMS Provider Abstraction Layer
 *
 * Provider-agnostic SMS interface that lets the system swap between
 * Twilio, Vonage, SignalWire, or Bandwidth by changing the SMS_PROVIDER env var.
 * Database logging happens here so individual providers stay clean.
 */

import { prisma } from './db'

// ============================================
// Interfaces
// ============================================

export interface SMSSendOptions {
  to: string
  message: string
  leadId?: string
  clientId?: string
  sender?: string       // 'clawdbot', 'andrew', etc.
  trigger?: string      // What caused this message: 'close_engine_first_message', 'nudge', etc.
  aiGenerated?: boolean
  aiDelaySeconds?: number
  conversationType?: string // 'pre_client' | 'post_client'
  aiDecisionLog?: Record<string, unknown>
}

export interface SMSSendResult {
  success: boolean
  sid?: string
  error?: string
}

export interface SMSInboundMessage {
  from: string
  body: string
  sid: string
  mediaUrls?: string[]   // MMS photo URLs
  mediaTypes?: string[]  // MIME content types (image/jpeg, etc.)
}

export interface SMSProvider {
  send(options: SMSSendOptions): Promise<SMSSendResult>
  parseInboundWebhook(formData: FormData): Promise<SMSInboundMessage>
  validateWebhookSignature(request: Request, url: string): Promise<boolean>
}

// ============================================
// Provider Type
// ============================================

export type SMSProviderName = 'twilio' | 'vonage' | 'signalwire' | 'bandwidth'

// ============================================
// Factory
// ============================================

/** Returns the configured SMS provider instance based on SMS_PROVIDER env var (defaults to 'twilio'). */
export function getSMSProvider(): SMSProvider {
  const provider = (process.env.SMS_PROVIDER || 'twilio') as SMSProviderName
  switch (provider) {
    case 'twilio': {
      // Lazy import to avoid loading unnecessary dependencies
      const { TwilioProvider } = require('./providers/twilio')
      return new TwilioProvider()
    }
    case 'vonage':
    case 'signalwire':
    case 'bandwidth':
      throw new Error(`SMS provider '${provider}' not yet implemented. Use 'twilio' or implement the SMSProvider interface.`)
    default:
      throw new Error(`Unknown SMS provider: ${provider}`)
  }
}

// ============================================
// Convenience Functions
// ============================================

/**
 * Primary function for sending SMS. All code should call this instead of
 * provider.send() directly. Sends via the configured provider AND logs to the database.
 */
export async function sendSMSViaProvider(options: SMSSendOptions): Promise<SMSSendResult> {
  const provider = getSMSProvider()

  try {
    const result = await provider.send(options)

    // Log to database regardless of success/failure
    await prisma.message.create({
      data: {
        leadId: options.leadId || null,
        clientId: options.clientId || null,
        direction: 'OUTBOUND',
        channel: 'SMS',
        senderType: options.aiGenerated ? 'CLAWDBOT' : (options.sender === 'admin' ? 'ADMIN' : 'SYSTEM'),
        senderName: options.sender || 'clawdbot',
        recipient: options.to,
        content: options.message,
        trigger: options.trigger || null,
        aiGenerated: options.aiGenerated || false,
        aiDelaySeconds: options.aiDelaySeconds || null,
        aiDecisionLog: (options.aiDecisionLog as any) || undefined,
        conversationType: options.conversationType || null,
        twilioSid: result.sid || null,
        twilioStatus: result.success ? 'sent' : 'failed',
      },
    })

    return result
  } catch (error) {
    console.error('sendSMSViaProvider failed:', error)

    // Log failed message
    await prisma.message.create({
      data: {
        leadId: options.leadId || null,
        clientId: options.clientId || null,
        direction: 'OUTBOUND',
        channel: 'SMS',
        senderType: options.aiGenerated ? 'CLAWDBOT' : 'SYSTEM',
        senderName: options.sender || 'clawdbot',
        recipient: options.to,
        content: options.message,
        trigger: options.trigger || null,
        twilioStatus: 'failed',
      },
    })

    return { success: false, error: (error as Error).message }
  }
}

/**
 * Logs an inbound SMS to the database. Call this when processing incoming
 * webhook messages after parsing via the provider.
 */
export async function logInboundSMSViaProvider(options: {
  from: string
  body: string
  sid: string
  leadId?: string
  clientId?: string
  mediaUrls?: string[]
  mediaTypes?: string[]
}) {
  // If no text but has media, show placeholder content
  const content = options.body || (options.mediaUrls && options.mediaUrls.length > 0
    ? `[${options.mediaUrls.length} image${options.mediaUrls.length > 1 ? 's' : ''} sent]`
    : '')

  await prisma.message.create({
    data: {
      leadId: options.leadId || null,
      clientId: options.clientId || null,
      direction: 'INBOUND',
      channel: 'SMS',
      senderType: options.clientId ? 'CLIENT' : 'LEAD',
      senderName: 'contact',
      content,
      twilioSid: options.sid,
      twilioStatus: 'received',
      mediaUrls: options.mediaUrls && options.mediaUrls.length > 0 ? options.mediaUrls : undefined,
      mediaTypes: options.mediaTypes && options.mediaTypes.length > 0 ? options.mediaTypes : undefined,
    },
  })
}
