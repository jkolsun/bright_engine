# TASK 3: Twilio Provider Implementation

## Overview
Implement the SMSProvider interface for Twilio. This extracts the existing Twilio logic into the new abstraction pattern.

**File to create:** `src/lib/providers/twilio.ts` (NEW)
**Est. Time:** 45 minutes
**Dependencies:** Task 2 (SMSProvider interface must exist)

---

## Context: Existing Twilio Code

The current `src/lib/twilio.ts` works like this (paste this file into Claude Code alongside this prompt):
- Lazy-initializes the Twilio client using `process.env.TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN`
- `sendSMS()` calls `client.messages.create()` with body, from, to
- `logInboundSMS()` writes inbound messages to the database
- The from number comes from `process.env.TWILIO_PHONE_NUMBER`

We're porting this exact logic into the SMSProvider interface.

---

## What To Do

Create `src/lib/providers/twilio.ts`:

```typescript
import twilio from 'twilio';
import type { SMSProvider, SMSSendOptions, SMSSendResult, SMSInboundMessage } from '../sms-provider';

export class TwilioProvider implements SMSProvider {
  private client: ReturnType<typeof twilio> | null = null;

  private getClient() {
    if (!this.client) {
      this.client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    }
    return this.client;
  }

  private getFromNumber(): string {
    return process.env.TWILIO_PHONE_NUMBER!;
  }

  async send(options: SMSSendOptions): Promise<SMSSendResult> {
    try {
      const client = this.getClient();
      const message = await client.messages.create({
        body: options.message,
        from: this.getFromNumber(),
        to: options.to,
      });

      return { success: true, sid: message.sid };
    } catch (error) {
      console.error('TwilioProvider.send failed:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  async parseInboundWebhook(formData: FormData): Promise<SMSInboundMessage> {
    const from = formData.get('From') as string;
    const body = formData.get('Body') as string;
    const sid = formData.get('MessageSid') as string;

    // Extract MMS media URLs if present
    const numMedia = parseInt(formData.get('NumMedia') as string || '0', 10);
    const mediaUrls: string[] = [];
    for (let i = 0; i < numMedia; i++) {
      const url = formData.get(`MediaUrl${i}`) as string;
      if (url) mediaUrls.push(url);
    }

    return { from, body, sid, mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined };
  }

  async validateWebhookSignature(request: Request, url: string): Promise<boolean> {
    // Skip validation in non-production
    if (process.env.NODE_ENV !== 'production') return true;

    const signature = request.headers.get('X-Twilio-Signature');
    if (!signature) return false;

    const authToken = process.env.TWILIO_AUTH_TOKEN!;

    // For Twilio validation, we need the form params
    // This is called BEFORE the formData is consumed, so the caller
    // should pass the raw request. We clone it to read params.
    try {
      const clonedRequest = request.clone();
      const formData = await clonedRequest.formData();
      const params: Record<string, string> = {};
      formData.forEach((value, key) => {
        params[key] = value as string;
      });

      return twilio.validateRequest(authToken, signature, url, params);
    } catch {
      return false;
    }
  }
}
```

Make sure the directory `src/lib/providers/` exists. Create it if needed.

---

## Verify Before Moving On

- [ ] `TwilioProvider` class compiles with no TypeScript errors
- [ ] Class implements `SMSProvider` interface (all 3 methods)
- [ ] `send()` method uses lazy-initialized Twilio client (same pattern as existing code)
- [ ] `parseInboundWebhook()` extracts From, Body, MessageSid from FormData
- [ ] `parseInboundWebhook()` extracts MMS media URLs (MediaUrl0, MediaUrl1, etc.)
- [ ] `validateWebhookSignature()` returns true in non-production
- [ ] `validateWebhookSignature()` uses `twilio.validateRequest()` in production
- [ ] Factory function in `sms-provider.ts` (Task 2) now returns `TwilioProvider` without error
- [ ] `getSMSProvider()` works when `SMS_PROVIDER` is unset (defaults to twilio)
