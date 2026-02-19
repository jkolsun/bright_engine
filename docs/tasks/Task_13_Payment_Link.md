# TASK 13: Payment Link Generation + Sending

## Overview
Create dynamic Stripe Checkout Sessions per lead and the logic for Claude to send payment links at the right time.

**File to create:** `src/lib/close-engine-payment.ts` (NEW)
**Est. Time:** 1.5 hours
**Dependencies:** Tasks 5, 11 (core service + processor must exist)

---

## Context

The existing `src/lib/stripe.ts` has a `createPaymentLink()` function that creates generic checkout sessions and a `getPaymentLink()` that uses pre-created Dashboard links. For the Close Engine, we create dynamic sessions with the lead's company name and leadId embedded.

**CRITICAL:** Every payment link MUST include `client_reference_id: lead.id`. The Stripe webhook uses this to find the lead and create the Client record.

---

## What To Do

Create `src/lib/close-engine-payment.ts` with:

### 1. generatePaymentLink(leadId)

```typescript
import { getStripe } from './stripe';
import { prisma } from './db';

export async function generatePaymentLink(leadId: string): Promise<string> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new Error(`Lead ${leadId} not found`);
  
  const conversation = await prisma.closeEngineConversation.findUnique({
    where: { leadId },
  });
  
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: `Website for ${lead.companyName}`,
          description: 'Professional website build + monthly hosting',
        },
        unit_amount: 14900, // $149.00
      },
      quantity: 1,
    }],
    mode: 'payment',
    client_reference_id: lead.id, // CRITICAL
    success_url: `${process.env.BASE_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: lead.previewId ? `${process.env.BASE_URL}/preview/${lead.previewId}` : `${process.env.BASE_URL}`,
    customer_email: lead.email || undefined,
    metadata: {
      leadId: lead.id,
      repId: conversation?.repId || '',
      source: 'close_engine',
    },
  });
  
  // Save to conversation
  if (conversation) {
    await prisma.closeEngineConversation.update({
      where: { id: conversation.id },
      data: {
        paymentLinkUrl: session.url,
        paymentLinkSentAt: new Date(),
      },
    });
  }
  
  return session.url!;
}
```

### 2. sendPaymentLink(conversationId)

```typescript
import { sendSMSViaProvider } from './sms-provider';
import { checkAutonomy, transitionStage, getConversationContext, CONVERSATION_STAGES } from './close-engine';
import { calculateDelay } from './close-engine-processor';

export async function sendPaymentLink(conversationId: string): Promise<{ success: boolean }> {
  const context = await getConversationContext(conversationId);
  if (!context) throw new Error(`Conversation ${conversationId} not found`);
  
  const lead = context.lead;
  
  // Check autonomy
  const autonomy = await checkAutonomy(conversationId, 'SEND_PAYMENT_LINK');
  
  // Generate the link
  const paymentUrl = await generatePaymentLink(lead.id);
  
  const message = `Looks great! Here's your payment link to go live: ${paymentUrl}\n\n$149 gets your site built and launched, plus monthly hosting at $39/month. You can cancel anytime.\n\nOnce you pay, we'll have your site live within 48 hours!`;
  
  if (autonomy.requiresApproval) {
    await prisma.pendingAction.create({
      data: {
        conversationId,
        leadId: lead.id,
        type: 'SEND_PAYMENT_LINK',
        draftMessage: message,
        metadata: { paymentUrl },
        status: 'PENDING',
      },
    });
    await prisma.notification.create({
      data: {
        type: 'CLIENT_TEXT',
        title: 'Payment Link Ready — Approve?',
        message: `Payment link ready for ${lead.companyName}. Approve to send.`,
        metadata: { conversationId, leadId: lead.id, paymentUrl },
      },
    });
    return { success: true };
  }
  
  const delay = calculateDelay(message.length, 'payment_link');
  
  setTimeout(async () => {
    try {
      await sendSMSViaProvider({
        to: lead.phone,
        message,
        leadId: lead.id,
        trigger: 'close_engine_payment_link',
        aiGenerated: true,
        aiDelaySeconds: delay,
        conversationType: 'pre_client',
        sender: 'clawdbot',
      });
      await transitionStage(conversationId, CONVERSATION_STAGES.PAYMENT_SENT);
    } catch (err) {
      console.error('[CloseEngine] Payment link send failed:', err);
    }
  }, delay * 1000);
  
  return { success: true };
}
```

### 3. getPaymentFollowUpMessage(hoursSinceSent)

```typescript
export function getPaymentFollowUpMessage(hoursSinceSent: number, firstName: string): string | null {
  if (hoursSinceSent >= 72) {
    return `Last check-in — want me to hold your spot or should I free it up for someone else, ${firstName}?`;
  } else if (hoursSinceSent >= 48) {
    return `Hey ${firstName}, your preview is looking great. Payment link is ready when you are!`;
  } else if (hoursSinceSent >= 24) {
    return `Hey ${firstName}, just wanted to make sure you got the payment link. Any questions about getting your site live?`;
  } else if (hoursSinceSent >= 4) {
    return `Hey ${firstName}, just checking — any questions about getting your site live?`;
  }
  return null; // Too soon for follow-up
}
```

---

## Verify Before Moving On

- [ ] `generatePaymentLink()` creates Stripe Checkout Session
- [ ] Session includes `client_reference_id: leadId` (CRITICAL)
- [ ] Session shows lead's company name in checkout
- [ ] `sendPaymentLink()` sends SMS with payment URL in FULL_AUTO
- [ ] SEMI_AUTO creates PendingAction with payment link instead of sending
- [ ] `paymentLinkUrl` and `paymentLinkSentAt` saved to conversation
- [ ] Stage transitions to PAYMENT_SENT after send
- [ ] Follow-up messages correct: 4h nudge, 24h reminder, 48h urgency, 72h final
- [ ] No follow-up before 4 hours (returns null)
