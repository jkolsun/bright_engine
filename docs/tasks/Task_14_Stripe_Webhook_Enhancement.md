# TASK 14: Stripe Webhook Enhancement (Post-Payment)

## Overview
Enhance the existing Stripe webhook to handle Close Engine conversions: transition the conversation to COMPLETED, migrate to post-client, and send a Claude-powered welcome message.

**File to modify:** `src/app/api/webhooks/stripe/route.ts`
**Est. Time:** 1.5 hours
**Dependencies:** Tasks 5, 11, 13

---

## IMPORTANT: Paste the existing Stripe webhook file into Claude Code alongside this prompt.

---

## What To Do

In `handleCheckoutCompleted()`, AFTER the existing Client creation and Lead status update (after `await prisma.lead.update({ ... data: { status: 'PAID' } })`), add:

```typescript
// ── CLOSE ENGINE: Post-Payment Processing ──
try {
  const conversation = await prisma.closeEngineConversation.findUnique({
    where: { leadId: lead.id },
  });
  
  if (conversation && ['PAYMENT_SENT', 'PENDING_APPROVAL'].includes(conversation.stage)) {
    // 1. Complete the conversation
    await prisma.closeEngineConversation.update({
      where: { id: conversation.id },
      data: {
        stage: 'COMPLETED',
        completedAt: new Date(),
      },
    });
    
    // 2. Copy autonomy level to client
    if (clientId) {
      await prisma.client.update({
        where: { id: clientId },
        data: { autonomyLevel: conversation.autonomyLevel },
      });
    }
    
    // 3. Send welcome message via Claude (Haiku, post-client)
    // For now, send a template welcome. Task 18 will enhance with Haiku.
    const welcomeMessage = `Welcome aboard, ${lead.firstName}! 🎉 Your site is going live. You'll get a text from us when it's up. Quick win: make sure your Google Business Profile is claimed — that alone can double your local visibility.`;
    
    const { sendSMSViaProvider } = await import('@/lib/sms-provider');
    
    // Delay welcome message 2-3 minutes after payment
    setTimeout(async () => {
      try {
        await sendSMSViaProvider({
          to: lead.phone,
          message: welcomeMessage,
          leadId: lead.id,
          clientId: clientId,
          trigger: 'close_engine_welcome',
          aiGenerated: true,
          aiDelaySeconds: 150,
          conversationType: 'post_client',
          sender: 'clawdbot',
        });
      } catch (smsErr) {
        console.error('[Stripe Webhook] Welcome SMS failed:', smsErr);
      }
    }, 150 * 1000); // ~2.5 minutes
    
    // 4. Enhanced notification
    await prisma.notification.create({
      data: {
        type: 'PAYMENT_RECEIVED',
        title: '🎉 AI Close Engine — New Client!',
        message: `${lead.companyName} paid $${amountTotal / 100} via Close Engine (${conversation.entryPoint})`,
        metadata: {
          leadId: lead.id,
          clientId,
          conversationId: conversation.id,
          entryPoint: conversation.entryPoint,
          amount: amountTotal / 100,
        },
      },
    });
    
    console.log(`[CloseEngine] Payment complete: ${lead.companyName}, conversation ${conversation.id} → COMPLETED`);
  }
} catch (closeEngineErr) {
  console.error('[Stripe Webhook] Close Engine post-payment processing failed:', closeEngineErr);
  // Don't fail the webhook if Close Engine processing fails
}
```

**Do NOT modify any existing webhook logic.** All additions go AFTER existing handling, wrapped in try/catch.

---

## Verify Before Moving On

- [ ] Payment triggers conversation stage → COMPLETED
- [ ] `completedAt` timestamp set on conversation
- [ ] Client record gets `autonomyLevel` from conversation
- [ ] Welcome message sent via SMS ~2.5 minutes after payment
- [ ] Welcome message logged with `conversationType: 'post_client'`
- [ ] Notification includes Close Engine context (entry point, conversation ID)
- [ ] Existing Stripe webhook logic still works (revenue records, commission, etc.)
- [ ] Non-Close-Engine payments still work normally (no conversation found → skip)
- [ ] Close Engine failure doesn't break the webhook (try/catch)
