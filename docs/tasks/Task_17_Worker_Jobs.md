# TASK 17: Worker Jobs (Stall Check, Payment Follow-up, Expiry)

## Overview
Add 3 new recurring BullMQ jobs to the existing worker system plus a modification to pause urgency texts when a lead enters the Close Engine.

**File to modify:** `src/worker/index.ts`
**Est. Time:** 1.5 hours
**Dependencies:** Tasks 5, 11, 13

---

## IMPORTANT: Paste the existing worker/index.ts into Claude Code alongside this prompt.

---

## What To Do

Add these jobs to the existing worker file. Register them in the recurring job scheduler alongside the existing monitoring and sequence jobs.

### JOB 1: closeEngineStallCheck (every 15 minutes)

```typescript
async function closeEngineStallCheck() {
  // Find conversations with no inbound message in 4+ hours
  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
  const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000);
  
  const activeStages = ['QUALIFYING', 'COLLECTING_INFO', 'PREVIEW_SENT', 'EDIT_LOOP'];
  
  const conversations = await prisma.closeEngineConversation.findMany({
    where: {
      stage: { in: activeStages },
    },
    include: {
      lead: true,
    },
  });
  
  for (const conv of conversations) {
    // Find last inbound message
    const lastInbound = await prisma.message.findFirst({
      where: { leadId: conv.leadId, direction: 'INBOUND' },
      orderBy: { createdAt: 'desc' },
    });
    
    if (!lastInbound) continue;
    
    // Check if we already sent a nudge recently (last 4 hours)
    const lastNudge = await prisma.message.findFirst({
      where: {
        leadId: conv.leadId,
        direction: 'OUTBOUND',
        trigger: { startsWith: 'close_engine_nudge' },
        createdAt: { gte: fourHoursAgo },
      },
    });
    if (lastNudge) continue; // Already nudged recently
    
    // Respect timezone: only nudge 8 AM - 9 PM
    if (!canSendMessage(conv.lead.timezone || 'America/New_York')) continue;
    
    if (lastInbound.createdAt < seventyTwoHoursAgo) {
      // 72+ hours — mark STALLED
      await prisma.closeEngineConversation.update({
        where: { id: conv.id },
        data: { stage: 'STALLED', stalledAt: new Date() },
      });
      await prisma.notification.create({
        data: {
          type: 'CLIENT_TEXT',
          title: 'Close Engine — Lead Stalled',
          message: `${conv.lead.firstName} at ${conv.lead.companyName} hasn't responded in 72+ hours`,
          metadata: { conversationId: conv.id, leadId: conv.leadId },
        },
      });
    } else if (lastInbound.createdAt < fourHoursAgo) {
      // 4-72 hours — send nudge via Close Engine processor
      try {
        const { processCloseEngineInbound } = await import('../lib/close-engine-processor');
        // Send a system nudge that Claude will respond to
        await processCloseEngineInbound(conv.id, '[SYSTEM: Lead has not responded in 4+ hours. Send a friendly follow-up nudge.]');
      } catch (err) {
        console.error(`[Worker] Nudge failed for ${conv.id}:`, err);
      }
    }
  }
}
```

### JOB 2: closeEnginePaymentFollowUp (every hour)

```typescript
async function closeEnginePaymentFollowUp() {
  const conversations = await prisma.closeEngineConversation.findMany({
    where: { stage: 'PAYMENT_SENT' },
    include: { lead: true },
  });
  
  for (const conv of conversations) {
    if (!conv.paymentLinkSentAt) continue;
    
    const hoursSinceSent = (Date.now() - conv.paymentLinkSentAt.getTime()) / (1000 * 60 * 60);
    
    // Get follow-up message for this time threshold
    const { getPaymentFollowUpMessage } = await import('../lib/close-engine-payment');
    const followUpMsg = getPaymentFollowUpMessage(hoursSinceSent, conv.lead.firstName);
    
    if (!followUpMsg) continue; // Too soon
    
    // Determine which threshold we're at
    const threshold = hoursSinceSent >= 72 ? '72h' : hoursSinceSent >= 48 ? '48h' : hoursSinceSent >= 24 ? '24h' : '4h';
    
    // Check if we already sent this threshold's follow-up
    const existingFollowUp = await prisma.message.findFirst({
      where: {
        leadId: conv.leadId,
        trigger: `close_engine_payment_followup_${threshold}`,
      },
    });
    if (existingFollowUp) continue; // Already sent
    
    // Respect timezone
    if (!canSendMessage(conv.lead.timezone || 'America/New_York')) continue;
    
    // Send
    const { sendSMSViaProvider } = await import('../lib/sms-provider');
    await sendSMSViaProvider({
      to: conv.lead.phone,
      message: followUpMsg,
      leadId: conv.leadId,
      trigger: `close_engine_payment_followup_${threshold}`,
      aiGenerated: true,
      conversationType: 'pre_client',
      sender: 'clawdbot',
    });
    
    // At 72h+, also mark STALLED
    if (hoursSinceSent >= 72) {
      await prisma.closeEngineConversation.update({
        where: { id: conv.id },
        data: { stage: 'STALLED', stalledAt: new Date() },
      });
    }
  }
}
```

### JOB 3: closeEngineExpireStalled (daily at 9 PM EST)

```typescript
async function closeEngineExpireStalled() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  const stalled = await prisma.closeEngineConversation.findMany({
    where: {
      stage: 'STALLED',
      stalledAt: { lt: sevenDaysAgo },
    },
    include: { lead: true },
  });
  
  for (const conv of stalled) {
    await prisma.closeEngineConversation.update({
      where: { id: conv.id },
      data: {
        stage: 'CLOSED_LOST',
        closedLostAt: new Date(),
        closedLostReason: 'No response after 7 days',
      },
    });
    await prisma.lead.update({
      where: { id: conv.leadId },
      data: { status: 'CLOSED_LOST' },
    });
  }
  
  if (stalled.length > 0) {
    await prisma.notification.create({
      data: {
        type: 'DAILY_AUDIT',
        title: 'Close Engine — Expired Conversations',
        message: `${stalled.length} conversation(s) expired after 7 days of no response`,
        metadata: { count: stalled.length, leadIds: stalled.map(s => s.leadId) },
      },
    });
  }
}
```

### JOB 4: Urgency SMS Pause (modify existing)

In the existing urgency SMS logic (in `profit-systems.ts` or wherever urgency texts are sent), add a check:

```typescript
// Before sending urgency text, check if lead has active Close Engine conversation
const activeConv = await prisma.closeEngineConversation.findUnique({
  where: { leadId: lead.id },
});
if (activeConv && !['COMPLETED', 'CLOSED_LOST'].includes(activeConv.stage)) {
  console.log(`[Urgency] Skipping — lead ${lead.id} is in active Close Engine conversation`);
  continue; // Skip this lead
}
```

### Register Jobs

In the worker startup, add recurring jobs:
- `closeEngineStallCheck` — every 15 minutes
- `closeEnginePaymentFollowUp` — every hour
- `closeEngineExpireStalled` — daily at 9 PM EST (use existing cron pattern)

---

## Verify Before Moving On

- [ ] Stall check runs every 15 minutes
- [ ] Nudge sent to qualifying leads with 4+ hour silence
- [ ] No nudge sent outside 8 AM – 9 PM lead timezone
- [ ] No duplicate nudges within 4 hours
- [ ] 72h+ silence → STALLED status
- [ ] Payment follow-ups fire at correct thresholds (4h, 24h, 48h, 72h)
- [ ] No duplicate follow-ups (check trigger field)
- [ ] 72h unpaid → STALLED
- [ ] 7-day stalled → CLOSED_LOST with reason
- [ ] Lead status updated to CLOSED_LOST on expiry
- [ ] Urgency texts paused for leads in active close conversations
- [ ] Existing workers still function correctly
- [ ] All jobs registered in worker startup
