# TASK 7: Entry Point 2 — Twilio Webhook Enhancement

## Overview
When an inbound SMS arrives, route it to the Close Engine if the lead has an active conversation, or trigger a new conversation if the reply indicates interest.

**File to modify:** `src/app/api/webhooks/twilio/route.ts`
**Est. Time:** 1.5 hours
**Dependencies:** Tasks 4, 5 (SMS abstraction migrated + close-engine.ts must exist)

---

## IMPORTANT: Paste the existing file into Claude Code alongside this prompt.

---

## Context

The Twilio webhook (updated in Task 4) already:
- Parses inbound SMS via the provider abstraction
- Looks up lead and client by phone number
- Logs inbound message to database
- Checks for escalation triggers
- Has a placeholder comment: `// ── CLOSE ENGINE HANDLER (Task 7) ──`

We're replacing that placeholder with real routing logic.

---

## What To Do

Replace the `// ── CLOSE ENGINE HANDLER (Task 7) ──` placeholder with:

### 1. Check for Active Close Conversation

```typescript
// ── CLOSE ENGINE HANDLER ──
if (lead) {
  const { processCloseEngineInbound, triggerCloseEngine } = await import('@/lib/close-engine');
  const { prisma } = await import('@/lib/db');
  
  // Check if lead has an active close conversation
  const activeConversation = await prisma.closeEngineConversation.findUnique({
    where: { leadId: lead.id },
  });
  
  if (activeConversation && !['COMPLETED', 'CLOSED_LOST'].includes(activeConversation.stage)) {
    // Route to existing Close Engine conversation
    console.log(`[Twilio] Routing inbound to Close Engine conversation ${activeConversation.id}`);
    try {
      await processCloseEngineInbound(activeConversation.id, body, mediaUrls);
    } catch (err) {
      console.error('[Twilio] Close Engine processing failed:', err);
      // Don't fail the webhook
    }
  } else if (!activeConversation) {
    // No active conversation — check if this is an interested reply
    const isInterested = checkInterestSignal(body);
    if (isInterested) {
      console.log(`[Twilio] Interest detected from ${from}, triggering Close Engine`);
      try {
        await triggerCloseEngine({
          leadId: lead.id,
          entryPoint: 'SMS_REPLY',
        });
      } catch (err) {
        console.error('[Twilio] Close Engine trigger failed:', err);
      }
    }
  }
}
```

### 2. Add Interest Detection Function

Add this function at the bottom of the file (alongside the existing `checkForEscalation`):

```typescript
function checkInterestSignal(message: string): boolean {
  const lowerMessage = message.toLowerCase().trim();
  
  // Direct positive signals
  const positiveKeywords = [
    'yes', 'yeah', 'yep', 'yup', 'sure',
    'interested', 'tell me more', 'sounds good',
    'let\'s do it', 'lets do it', 'i\'m in', 'im in',
    'ready', 'sign me up', 'how much',
    'let\'s go', 'lets go', 'i want', 'i\'d like',
    'sounds great', 'love it', 'looks good',
    'get started', 'how do i', 'what\'s next',
    'send me', 'set it up',
  ];
  
  return positiveKeywords.some(keyword => lowerMessage.includes(keyword));
}
```

### 3. Handle Client Messages (Post-Client)

After the Close Engine block, add routing for paying clients (this is a placeholder for Task 18):

```typescript
// ── POST-CLIENT HANDLER (Task 18) ──
if (client && !lead) {
  // TODO: Route to post-client engine in Task 18
  console.log(`[Twilio] Client message from ${client.companyName}: ${body.substring(0, 50)}`);
}
```

### 4. Store Media URLs

Update the `logInboundSMSViaProvider()` call to include media URLs if present. If the Message model doesn't have a dedicated mediaUrls field, store them in a note or skip for now — the important thing is they're extracted by the provider.

---

## Verify Before Moving On

- [ ] Lead with active conversation → message routed to Close Engine (check console log)
- [ ] Lead with COMPLETED conversation → NOT routed (treated as no active conversation)
- [ ] Lead with no conversation + "yes" reply → triggers new Close Engine conversation
- [ ] Lead with no conversation + "yeah interested" → triggers new conversation
- [ ] Lead with no conversation + "no thanks" → does NOT trigger
- [ ] Lead with no conversation + random text → does NOT trigger
- [ ] MMS media URLs extracted via provider
- [ ] Client messages hit the post-client placeholder
- [ ] Existing escalation detection still works
- [ ] Empty TwiML still returned (no auto-reply from webhook)
- [ ] Webhook doesn't fail if Close Engine throws an error
