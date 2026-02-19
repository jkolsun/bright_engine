# TASK 4: Migrate Existing Code to SMS Abstraction

## Overview
Update the existing `twilio.ts` and Twilio webhook to use the new provider abstraction. This is a pure refactor — no behavior changes.

**Files to modify:** `src/lib/twilio.ts` + `src/app/api/webhooks/twilio/route.ts`
**Est. Time:** 1 hour
**Dependencies:** Tasks 2, 3 (SMS abstraction + Twilio provider must exist)

---

## IMPORTANT: Paste both existing files into Claude Code alongside this prompt.

---

## What To Do

### FILE 1: `src/lib/twilio.ts`

Keep the existing `sendSMS()` and `logInboundSMS()` function signatures for backward compatibility so nothing else in the codebase breaks. But change their implementations to use the new abstraction:

```typescript
import { sendSMSViaProvider, logInboundSMSViaProvider } from './sms-provider';

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
  });
}

/**
 * @deprecated Use logInboundSMSViaProvider() from sms-provider.ts directly.
 */
export async function logInboundSMS(options: {
  from: string;
  body: string;
  sid: string;
  leadId?: string;
  clientId?: string;
}) {
  return logInboundSMSViaProvider(options);
}
```

Keep the existing `SendSMSOptions` interface and the default export of the Twilio client (some existing code may import it). Remove the direct Prisma logging from `sendSMS()` since `sendSMSViaProvider()` handles that now — but make sure the logging behavior is identical (same fields written to the Message table).

### FILE 2: `src/app/api/webhooks/twilio/route.ts`

Update the webhook to use the provider abstraction for parsing and validation:

1. Import `getSMSProvider` and `logInboundSMSViaProvider` from `sms-provider.ts`
2. Replace manual `formData.get('From')`, `formData.get('Body')`, etc. with:
   ```typescript
   const provider = getSMSProvider();
   const formData = await request.formData();
   const { from, body, sid, mediaUrls } = await provider.parseInboundWebhook(formData);
   ```
3. Replace manual signature validation with:
   ```typescript
   const isValid = await provider.validateWebhookSignature(request, request.url);
   if (!isValid && process.env.NODE_ENV === 'production') {
     return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
   }
   ```
4. Replace `logInboundSMS()` call with `logInboundSMSViaProvider()`
5. **Keep ALL existing logic untouched:** lead/client lookup, escalation check, notification creation
6. Add a placeholder comment after the escalation check:
   ```typescript
   // ── CLOSE ENGINE HANDLER (Task 7) ──
   // TODO: Check for active close conversation and route inbound message
   ```
7. Keep the empty TwiML response

**Do NOT change any business logic. This is a pure refactor.**

---

## Verify Before Moving On

- [ ] Existing SMS sending still works (test with `sendSMS()` from twilio.ts)
- [ ] Existing Twilio webhook still processes inbound messages correctly
- [ ] Messages are logged to the database with the same fields as before
- [ ] Escalation detection still triggers on keywords like "refund", "cancel"
- [ ] No TypeScript errors across the entire codebase
- [ ] `grep -r "from '@/lib/twilio'" src/` — all existing imports still work
- [ ] No behavior changes — this is a pure refactor
