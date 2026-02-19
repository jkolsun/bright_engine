# TASK 2: SMS Provider Abstraction Interface

## Overview
Create a provider-agnostic SMS interface so the entire system can swap between Twilio, Vonage, SignalWire, or Bandwidth by changing one env variable. This is critical because Twilio has denied A2P approval 4 times.

**File to create:** `src/lib/sms-provider.ts` (NEW)
**Est. Time:** 45 minutes
**Dependencies:** Task 1 (schema must be migrated for Message model types)

---

## Context

The existing SMS code lives in `src/lib/twilio.ts` with a `sendSMS()` function that directly calls Twilio and logs to the database. We're abstracting this so:
- All SMS sending goes through a provider interface
- The provider is selected via `SMS_PROVIDER` env variable (defaults to `twilio`)
- Database logging happens in the abstraction layer, not the provider
- Swapping providers requires only implementing the interface + changing the env var

The existing Message model already has these fields we'll use: leadId, clientId, direction (OUTBOUND/INBOUND), channel (SMS/EMAIL), senderType, senderName, content, trigger, twilioSid, twilioStatus, aiGenerated, aiDelaySeconds, conversationType, escalated, escalationReason.

---

## What To Do

Create `src/lib/sms-provider.ts` with the following:

### 1. SMSProvider Interface

```typescript
export interface SMSSendOptions {
  to: string;
  message: string;
  leadId?: string;
  clientId?: string;
  sender?: string;       // 'clawdbot', 'andrew', etc.
  trigger?: string;      // What caused this message: 'close_engine_first_message', 'nudge', etc.
  aiGenerated?: boolean;
  aiDelaySeconds?: number;
  conversationType?: string; // 'pre_client' | 'post_client'
}

export interface SMSSendResult {
  success: boolean;
  sid?: string;
  error?: string;
}

export interface SMSInboundMessage {
  from: string;
  body: string;
  sid: string;
  mediaUrls?: string[];  // MMS photo URLs
}

export interface SMSProvider {
  send(options: SMSSendOptions): Promise<SMSSendResult>;
  parseInboundWebhook(formData: FormData): Promise<SMSInboundMessage>;
  validateWebhookSignature(request: Request, url: string): Promise<boolean>;
}
```

### 2. Provider Type

```typescript
export type SMSProviderName = 'twilio' | 'vonage' | 'signalwire' | 'bandwidth';
```

### 3. Factory Function

```typescript
export function getSMSProvider(): SMSProvider {
  const provider = (process.env.SMS_PROVIDER || 'twilio') as SMSProviderName;
  switch (provider) {
    case 'twilio':
      // Lazy import to avoid loading unnecessary dependencies
      const { TwilioProvider } = require('./providers/twilio');
      return new TwilioProvider();
    case 'vonage':
    case 'signalwire':
    case 'bandwidth':
      throw new Error(`SMS provider '${provider}' not yet implemented. Use 'twilio' or implement the SMSProvider interface.`);
    default:
      throw new Error(`Unknown SMS provider: ${provider}`);
  }
}
```

### 4. Convenience Function: sendSMSViaProvider

This is the primary function all code should call to send SMS. It sends via the provider AND logs to the database.

```typescript
import { prisma } from './db';

export async function sendSMSViaProvider(options: SMSSendOptions): Promise<SMSSendResult> {
  const provider = getSMSProvider();

  try {
    const result = await provider.send(options);

    // Log to database regardless of success/failure
    await prisma.message.create({
      data: {
        leadId: options.leadId || null,
        clientId: options.clientId || null,
        direction: 'OUTBOUND',
        channel: 'SMS',
        senderType: options.aiGenerated ? 'AI' : (options.sender === 'admin' ? 'ADMIN' : 'SYSTEM'),
        senderName: options.sender || 'system',
        recipient: options.to,
        content: options.message,
        trigger: options.trigger || null,
        aiGenerated: options.aiGenerated || false,
        aiDelaySeconds: options.aiDelaySeconds || null,
        conversationType: options.conversationType || null,
        twilioSid: result.sid || null,
        twilioStatus: result.success ? 'sent' : 'failed',
      },
    });

    return result;
  } catch (error) {
    console.error('sendSMSViaProvider failed:', error);

    // Log failed message
    await prisma.message.create({
      data: {
        leadId: options.leadId || null,
        clientId: options.clientId || null,
        direction: 'OUTBOUND',
        channel: 'SMS',
        senderType: options.aiGenerated ? 'AI' : 'SYSTEM',
        senderName: options.sender || 'system',
        recipient: options.to,
        content: options.message,
        trigger: options.trigger || null,
        twilioStatus: 'failed',
      },
    });

    return { success: false, error: (error as Error).message };
  }
}
```

### 5. Convenience Function: logInboundSMSViaProvider

```typescript
export async function logInboundSMSViaProvider(options: {
  from: string;
  body: string;
  sid: string;
  leadId?: string;
  clientId?: string;
  mediaUrls?: string[];
}) {
  await prisma.message.create({
    data: {
      leadId: options.leadId || null,
      clientId: options.clientId || null,
      direction: 'INBOUND',
      channel: 'SMS',
      senderType: options.clientId ? 'CLIENT' : 'LEAD',
      senderName: 'contact',
      content: options.body,
      twilioSid: options.sid,
      twilioStatus: 'received',
      // Store media URLs in a metadata-like approach if needed
    },
  });
}
```

Add JSDoc comments explaining the abstraction's purpose on the main exports.

---

## Verify Before Moving On

- [ ] File compiles with no TypeScript errors
- [ ] `SMSProvider` interface is exported
- [ ] `getSMSProvider()` returns a provider instance (will error until Task 3 creates TwilioProvider — that's OK)
- [ ] `sendSMSViaProvider()` function exists with correct signature
- [ ] `logInboundSMSViaProvider()` function exists with correct signature
- [ ] Factory defaults to `twilio` when `SMS_PROVIDER` env is not set
- [ ] Provider type includes twilio, vonage, signalwire, bandwidth
