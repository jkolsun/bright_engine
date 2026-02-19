# TASK 11: Claude Conversation Engine — Message Processor

## Overview
The main message processing pipeline. This is the most important file in the system. It calls the Anthropic API, parses responses, applies humanizing delays, checks autonomy, and sends replies.

**File to create:** `src/lib/close-engine-processor.ts` (NEW)
**Est. Time:** 3 hours
**Dependencies:** Tasks 5, 10 (core service + prompts must exist)

---

## Context

When a lead sends an SMS, the Twilio webhook (Task 7) routes it to `processCloseEngineInbound()`. When a new conversation starts, `triggerCloseEngine()` (Task 5) calls `processCloseEngineFirstMessage()`. Both functions live here.

**Model:** `claude-sonnet-4-5-20250514` for pre-client conversations
**Response format:** JSON with replyText, extractedData, nextStage, etc.
**Humanizing delay:** 30–180 seconds depending on message type and length
**Autonomy check:** Before every send, verify the lead's autonomy level

This file also replaces the placeholder functions in `close-engine.ts` (Task 5).

---

## What To Do

Create `src/lib/close-engine-processor.ts` with:

### 1. Imports and Constants

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from './db';
import { sendSMSViaProvider } from './sms-provider';
import { getConversationContext, transitionStage, checkAutonomy, CONVERSATION_STAGES } from './close-engine';
import { buildPreClientSystemPrompt, getFirstMessageTemplate, ESCALATION_KEYWORDS } from './close-engine-prompts';

const PRE_CLIENT_MODEL = 'claude-sonnet-4-5-20250514';
const POST_CLIENT_MODEL = 'claude-haiku-4-5-20251001';

let anthropicClient: Anthropic | null = null;
function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}
```

### 2. processCloseEngineFirstMessage(conversationId)

```typescript
export async function processCloseEngineFirstMessage(conversationId: string): Promise<void> {
  const context = await getConversationContext(conversationId);
  if (!context) throw new Error(`Conversation ${conversationId} not found`);
  
  const lead = context.lead;
  const firstMessage = getFirstMessageTemplate(context.conversation.entryPoint, lead);
  
  // Check autonomy
  const autonomy = await checkAutonomy(conversationId, 'SEND_MESSAGE');
  
  if (autonomy.requiresApproval) {
    // MANUAL mode — create pending action
    await prisma.pendingAction.create({
      data: {
        conversationId,
        leadId: lead.id,
        type: 'SEND_MESSAGE',
        draftMessage: firstMessage,
        status: 'PENDING',
      },
    });
    // Notify Andrew
    await prisma.notification.create({
      data: {
        type: 'CLIENT_TEXT',
        title: 'Draft Message Ready',
        message: `AI drafted first message for ${lead.companyName} — review and send`,
        metadata: { conversationId, leadId: lead.id },
      },
    });
    return;
  }
  
  // Calculate delay (120-180 seconds for first message)
  const delay = calculateDelay(firstMessage.length, 'first_message');
  
  // Schedule delayed send
  setTimeout(async () => {
    try {
      await sendSMSViaProvider({
        to: lead.phone,
        message: firstMessage,
        leadId: lead.id,
        trigger: 'close_engine_first_message',
        aiGenerated: true,
        aiDelaySeconds: delay,
        conversationType: 'pre_client',
        sender: 'clawdbot',
      });
      
      // Transition stage
      await transitionStage(conversationId, CONVERSATION_STAGES.QUALIFYING);
    } catch (err) {
      console.error('[CloseEngine] Failed to send first message:', err);
    }
  }, delay * 1000);
}
```

### 3. processCloseEngineInbound(conversationId, message, mediaUrls?)

This is the main loop — called every time a lead texts back:

```typescript
export async function processCloseEngineInbound(
  conversationId: string,
  inboundMessage: string,
  mediaUrls?: string[]
): Promise<void> {
  const context = await getConversationContext(conversationId);
  if (!context) throw new Error(`Conversation ${conversationId} not found`);
  
  const lead = context.lead;
  
  // 1. Check for escalation keywords
  const lowerMessage = inboundMessage.toLowerCase();
  const escalationHit = ESCALATION_KEYWORDS.find(kw => lowerMessage.includes(kw));
  if (escalationHit) {
    // Flag the inbound message as escalated
    const lastMessage = await prisma.message.findFirst({
      where: { leadId: lead.id, direction: 'INBOUND' },
      orderBy: { createdAt: 'desc' },
    });
    if (lastMessage) {
      await prisma.message.update({
        where: { id: lastMessage.id },
        data: { escalated: true, escalationReason: `Keyword detected: ${escalationHit}` },
      });
    }
    await prisma.notification.create({
      data: {
        type: 'CLIENT_TEXT',
        title: 'Escalation — Close Engine',
        message: `${lead.firstName} at ${lead.companyName} said "${inboundMessage.substring(0, 80)}..." — keyword: ${escalationHit}`,
        metadata: { conversationId, leadId: lead.id, keyword: escalationHit },
      },
    });
  }
  
  // 2. Build system prompt
  const systemPrompt = buildPreClientSystemPrompt(context);
  
  // 3. Call Anthropic API
  let claudeResponse;
  try {
    const client = getAnthropicClient();
    const apiResponse = await client.messages.create({
      model: PRE_CLIENT_MODEL,
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: inboundMessage }],
    });
    
    // Extract text from response
    const rawText = apiResponse.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('');
    
    claudeResponse = parseClaudeResponse(rawText);
    
    // Log API cost
    await prisma.apiCost.create({
      data: {
        service: 'anthropic',
        endpoint: 'messages',
        model: PRE_CLIENT_MODEL,
        cost: 0.03, // Approximate per call
        metadata: { conversationId, stage: context.conversation.stage },
      },
    });
  } catch (apiError) {
    console.error('[CloseEngine] Anthropic API failed:', apiError);
    await prisma.notification.create({
      data: {
        type: 'DAILY_AUDIT',
        title: 'AI Error — Close Engine',
        message: `Claude API failed for ${lead.companyName}. Manual intervention needed.`,
        metadata: { conversationId, leadId: lead.id, error: String(apiError) },
      },
    });
    return; // Don't send a broken message
  }
  
  // 4. Process extracted data
  if (claudeResponse.extractedData) {
    const existing = context.conversation.collectedData || {};
    const merged = { ...existing, ...claudeResponse.extractedData };
    await prisma.closeEngineConversation.update({
      where: { id: conversationId },
      data: { collectedData: merged },
    });
    // Also save to lead's qualificationData
    await prisma.lead.update({
      where: { id: lead.id },
      data: { qualificationData: merged },
    });
  }
  
  // 5. Handle stage transition
  if (claudeResponse.nextStage) {
    await transitionStage(conversationId, claudeResponse.nextStage);
  }
  
  // 6. Handle readyToBuild
  if (claudeResponse.readyToBuild) {
    await transitionStage(conversationId, CONVERSATION_STAGES.BUILDING);
    // TODO: Trigger site auto-builder (for now, just notify Jared)
    await prisma.notification.create({
      data: {
        type: 'DAILY_AUDIT',
        title: 'Site Build Ready',
        message: `${lead.companyName} qualification complete. Ready to build site.`,
        metadata: { conversationId, leadId: lead.id, collectedData: claudeResponse.extractedData },
      },
    });
    // Update lead status
    await prisma.lead.update({
      where: { id: lead.id },
      data: { status: 'BUILDING' },
    });
  }
  
  // 7. Handle escalation from Claude
  if (claudeResponse.escalate) {
    await prisma.notification.create({
      data: {
        type: 'CLIENT_TEXT',
        title: 'AI Escalation',
        message: `Claude escalated ${lead.companyName}: ${claudeResponse.escalateReason}`,
        metadata: { conversationId, leadId: lead.id, reason: claudeResponse.escalateReason },
      },
    });
  }
  
  // 8. Check autonomy and send
  const actionType = claudeResponse.nextStage === CONVERSATION_STAGES.PAYMENT_SENT 
    ? 'SEND_PAYMENT_LINK' as const
    : 'SEND_MESSAGE' as const;
  const autonomy = await checkAutonomy(conversationId, actionType);
  
  const delay = calculateDelay(claudeResponse.replyText.length, 
    claudeResponse.readyToBuild ? 'detailed' : 'standard');
  
  if (autonomy.requiresApproval) {
    // Create pending action for Andrew
    await prisma.pendingAction.create({
      data: {
        conversationId,
        leadId: lead.id,
        type: actionType === 'SEND_PAYMENT_LINK' ? 'SEND_PAYMENT_LINK' : 'SEND_MESSAGE',
        draftMessage: claudeResponse.replyText,
        status: 'PENDING',
      },
    });
    await prisma.notification.create({
      data: {
        type: 'CLIENT_TEXT',
        title: autonomy.requiresApproval ? 'Approval Required' : 'Draft Ready',
        message: `AI drafted response for ${lead.companyName} — review in Messages`,
        metadata: { conversationId, leadId: lead.id },
      },
    });
    return;
  }
  
  // 9. Send with humanizing delay
  setTimeout(async () => {
    try {
      await sendSMSViaProvider({
        to: lead.phone,
        message: claudeResponse.replyText,
        leadId: lead.id,
        trigger: `close_engine_${context.conversation.stage.toLowerCase()}`,
        aiGenerated: true,
        aiDelaySeconds: delay,
        conversationType: 'pre_client',
        sender: 'clawdbot',
      });
    } catch (err) {
      console.error('[CloseEngine] Failed to send reply:', err);
    }
  }, delay * 1000);
  
  // 10. Track question asked
  if (claudeResponse.questionAsked) {
    const asked = (context.conversation.questionsAsked as string[] || []);
    asked.push(claudeResponse.questionAsked);
    await prisma.closeEngineConversation.update({
      where: { id: conversationId },
      data: { questionsAsked: asked },
    });
  }
}
```

### 4. calculateDelay()

```typescript
export function calculateDelay(messageLength: number, messageType: string): number {
  const base = messageType === 'first_message' ? 120
    : messageType === 'payment_link' ? 90
    : messageType === 'acknowledgment' ? 30
    : 45; // standard
  
  const lengthFactor = Math.min(messageLength / 150, 1) * 60;
  const jitter = Math.random() * 30 - 15;
  
  return Math.max(30, Math.round(base + lengthFactor + jitter));
}
```

### 5. parseClaudeResponse()

```typescript
interface ClaudeCloseResponse {
  replyText: string;
  extractedData: Record<string, any> | null;
  nextStage: string | null;
  questionAsked: string | null;
  readyToBuild: boolean;
  escalate: boolean;
  escalateReason: string | null;
}

export function parseClaudeResponse(raw: string): ClaudeCloseResponse {
  try {
    // Strip markdown code fences if present
    const cleaned = raw.replace(/```json\s?/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      replyText: parsed.replyText || raw,
      extractedData: parsed.extractedData || null,
      nextStage: parsed.nextStage || null,
      questionAsked: parsed.questionAsked || null,
      readyToBuild: parsed.readyToBuild || false,
      escalate: parsed.escalate || false,
      escalateReason: parsed.escalateReason || null,
    };
  } catch {
    // If JSON parse fails, treat raw text as the reply
    console.warn('[CloseEngine] Failed to parse Claude JSON, using raw text');
    return {
      replyText: raw.substring(0, 300), // Limit to SMS length
      extractedData: null,
      nextStage: null,
      questionAsked: null,
      readyToBuild: false,
      escalate: false,
      escalateReason: null,
    };
  }
}
```

### 6. Update close-engine.ts Placeholders

After creating this file, update `src/lib/close-engine.ts` to import and use the real implementations:

```typescript
// Replace the placeholder functions with:
import { processCloseEngineFirstMessage, processCloseEngineInbound } from './close-engine-processor';
export { processCloseEngineFirstMessage, processCloseEngineInbound };
```

---

## Verify Before Moving On

- [ ] `processCloseEngineFirstMessage()` sends first SMS after delay
- [ ] First message uses correct template based on entry point
- [ ] `processCloseEngineInbound()` calls Anthropic API with Sonnet 4.5
- [ ] Claude's JSON response parsed correctly
- [ ] Malformed JSON doesn't crash (falls back to raw text)
- [ ] Extracted data merged into collectedData
- [ ] Stage transitions happen when Claude outputs nextStage
- [ ] Escalation keywords in inbound message trigger notification
- [ ] Claude's escalate:true triggers notification
- [ ] Humanizing delay varies (check aiDelaySeconds in Message records)
- [ ] MANUAL autonomy creates PendingAction instead of sending
- [ ] SEMI_AUTO + payment link creates PendingAction
- [ ] FULL_AUTO sends everything automatically
- [ ] API cost logged to ApiCost table
- [ ] Anthropic API failure → notification, no broken SMS sent
- [ ] Messages logged with correct trigger, conversationType, aiGenerated
- [ ] readyToBuild triggers BUILDING stage + notification for Jared
