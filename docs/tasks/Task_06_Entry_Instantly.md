# TASK 6: Entry Point 1 — Instantly Webhook Enhancement

## Overview
When a lead replies positively to a cold email in Instantly, trigger the Close Engine so Claude can start a sales conversation via SMS.

**File to modify:** `src/app/api/webhooks/instantly/route.ts` AND `src/lib/instantly.ts`
**Est. Time:** 1.5 hours
**Dependencies:** Task 5 (close-engine.ts must exist)

---

## IMPORTANT: Paste both existing files into Claude Code alongside this prompt.

---

## Context

The existing `handleInstantlyWebhook()` in `src/lib/instantly.ts` already:
- Receives reply events from Instantly
- Finds the lead by email
- Classifies reply sentiment (positive, negative, question, neutral)
- Updates lead `instantlyStatus → REPLIED` and `replySentiment`

We're adding a Close Engine trigger after this existing logic.

The reply stays visible in Instantly Unibox for Andrew's reference. The real conversation happens via SMS in the Control Center Messages tab.

---

## What To Do

In `src/lib/instantly.ts`, in the `handleInstantlyWebhook()` function, in the `case 'reply':` block, **after** the existing sentiment classification and lead update:

### 1. Add Close Engine Trigger

```typescript
// After existing: await prisma.lead.update({ ... replySentiment: sentiment })

// ── CLOSE ENGINE TRIGGER ──
if (sentiment === 'positive' || sentiment === 'question') {
  // Only trigger if lead has a phone number (Claude communicates via SMS)
  if (lead.phone) {
    try {
      const { triggerCloseEngine } = await import('./close-engine');
      const result = await triggerCloseEngine({
        leadId: lead.id,
        entryPoint: 'INSTANTLY_REPLY',
      });
      
      if (result.success) {
        console.log(`[Instantly] Close Engine triggered for ${email} (${sentiment}), conversation: ${result.conversationId}`);
        
        // Log the event
        await prisma.leadEvent.create({
          data: {
            leadId: lead.id,
            eventType: 'CLOSE_ENGINE_TRIGGERED',
            metadata: { 
              entryPoint: 'INSTANTLY_REPLY', 
              sentiment,
              emailBody: body?.substring(0, 200), // First 200 chars for context
            },
          },
        });
      }
    } catch (err) {
      console.error('[Instantly] Close Engine trigger failed:', err);
      // Don't fail the webhook if Close Engine fails
    }
  } else {
    // No phone number — can't start SMS conversation
    console.warn(`[Instantly] Lead ${email} replied positively but has no phone number`);
    await prisma.notification.create({
      data: {
        type: 'HOT_LEAD',
        title: 'Positive Reply — No Phone Number',
        message: `${lead.firstName} at ${lead.companyName} replied to email but has no phone. Manual follow-up needed.`,
        metadata: { leadId: lead.id, email, sentiment, source: 'instantly_reply' },
      },
    });
  }
}
```

### 2. Do NOT Modify Anything Else

- Keep all existing reply handling
- Keep the `case 'bounce':`, `case 'unsubscribe':`, etc. unchanged
- Keep the link clicked notification logic
- Keep the sentiment classification function

---

## Verify Before Moving On

- [ ] Positive Instantly reply triggers Close Engine (check `close_engine_conversations` table)
- [ ] Question reply triggers Close Engine
- [ ] Negative reply does NOT trigger Close Engine
- [ ] Neutral reply does NOT trigger Close Engine
- [ ] Lead with no phone number → notification created instead of Close Engine
- [ ] LeadEvent logged with `CLOSE_ENGINE_TRIGGERED` type
- [ ] Duplicate positive reply doesn't create duplicate conversation
- [ ] Existing Instantly webhook logic still works unchanged (bounce, unsubscribe, click)
- [ ] Webhook doesn't fail if Close Engine throws an error (try/catch protects it)
