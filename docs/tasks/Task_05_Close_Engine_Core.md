# TASK 5: Close Engine Core Service

## Overview
Create the central orchestration module for the AI Close Engine. This is the brain that manages conversation lifecycle, stage transitions, autonomy checks, and context loading. It does NOT contain Claude API calls — those come in Tasks 10–12.

**File to create:** `src/lib/close-engine.ts` (NEW)
**Est. Time:** 2 hours
**Dependencies:** Task 1 (schema must be migrated)

---

## Context

The Close Engine has 4 entry points (Instantly email reply, SMS reply, rep close button, preview CTA click). All of them call `triggerCloseEngine()` which creates a `CloseEngineConversation` record and kicks off the AI conversation.

Each conversation progresses through these stages:
- **INITIATED** → First message about to be sent
- **QUALIFYING** → Asking core qualification questions (services, hours, photos)
- **COLLECTING_INFO** → Dynamic follow-up questions for gaps
- **BUILDING** → Site being auto-generated, waiting for Jared QA
- **PREVIEW_SENT** → Preview link sent, waiting for feedback
- **EDIT_LOOP** → Lead requested changes, collecting edits
- **PENDING_APPROVAL** → Andrew approval needed (Semi-Auto mode)
- **PAYMENT_SENT** → Payment link sent, waiting for payment
- **COMPLETED** → Payment confirmed, transitioning to post-client
- **STALLED** → Lead stopped responding
- **CLOSED_LOST** → Terminal state, lead didn't convert

Autonomy levels per lead:
- **FULL_AUTO** — Claude handles everything including payment link
- **SEMI_AUTO** — Claude handles qualification, payment link needs Andrew's approval
- **MANUAL** — Claude drafts every message, Andrew reviews and clicks send

---

## What To Do

Create `src/lib/close-engine.ts` with:

### 1. Constants

```typescript
export const CONVERSATION_STAGES = {
  INITIATED: 'INITIATED',
  QUALIFYING: 'QUALIFYING',
  COLLECTING_INFO: 'COLLECTING_INFO',
  BUILDING: 'BUILDING',
  PREVIEW_SENT: 'PREVIEW_SENT',
  EDIT_LOOP: 'EDIT_LOOP',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  PAYMENT_SENT: 'PAYMENT_SENT',
  COMPLETED: 'COMPLETED',
  STALLED: 'STALLED',
  CLOSED_LOST: 'CLOSED_LOST',
} as const;

export const ENTRY_POINTS = {
  INSTANTLY_REPLY: 'INSTANTLY_REPLY',
  SMS_REPLY: 'SMS_REPLY',
  REP_CLOSE: 'REP_CLOSE',
  PREVIEW_CTA: 'PREVIEW_CTA',
} as const;

export const AUTONOMY_LEVELS = {
  FULL_AUTO: 'FULL_AUTO',
  SEMI_AUTO: 'SEMI_AUTO',
  MANUAL: 'MANUAL',
} as const;
```

### 2. triggerCloseEngine()

```typescript
export async function triggerCloseEngine(options: {
  leadId: string;
  entryPoint: string;
  repId?: string;
}): Promise<{ success: boolean; conversationId?: string; error?: string }>
```

This function:
1. Check if lead already has an active CloseEngineConversation (stage NOT in COMPLETED, CLOSED_LOST). If so, return the existing conversationId — no duplicate.
2. Load the lead record. Verify it exists and has a phone number. If no phone, return error.
3. Update lead: `status → QUALIFIED`, `priority → HOT`, `closeEntryPoint = entryPoint`
4. Create `CloseEngineConversation` record with: leadId, entryPoint, repId (if provided), autonomyLevel from lead (defaults to FULL_AUTO)
5. Create notification for Andrew: `'New close conversation: {companyName} via {entryPoint}'`
6. Create a LeadEvent: `eventType: 'CLOSE_ENGINE_TRIGGERED'`, metadata with entryPoint
7. Call `processCloseEngineFirstMessage(conversationId)` — this is a placeholder for now
8. Return `{ success: true, conversationId }`

### 3. transitionStage()

```typescript
export async function transitionStage(
  conversationId: string,
  newStage: string
): Promise<void>
```

Updates the conversation stage. Also sets timestamps:
- If newStage = STALLED → set `stalledAt = now()`
- If newStage = COMPLETED → set `completedAt = now()`
- If newStage = CLOSED_LOST → set `closedLostAt = now()`

Log a LeadEvent with `eventType: 'CLOSE_ENGINE_STAGE_CHANGE'` and metadata `{ from: oldStage, to: newStage }`.

### 4. getConversationContext()

```typescript
export async function getConversationContext(conversationId: string): Promise<ConversationContext>
```

Loads everything Claude needs:
- The CloseEngineConversation record
- The lead record with all fields (including enriched data: services, hours, photos, rating, reviews)
- The last 20 messages in the conversation (ordered by createdAt asc)
- The conversation's collectedData and questionsAsked
- The lead's previewUrl

Return a typed `ConversationContext` object. Define the type in this file.

### 5. checkAutonomy()

```typescript
export async function checkAutonomy(
  conversationId: string,
  actionType: 'SEND_MESSAGE' | 'SEND_PAYMENT_LINK' | 'SEND_PREVIEW'
): Promise<{ allowed: boolean; requiresApproval: boolean }>
```

Logic:
- **FULL_AUTO**: always `{ allowed: true, requiresApproval: false }`
- **SEMI_AUTO**: 
  - SEND_MESSAGE and SEND_PREVIEW → `{ allowed: true, requiresApproval: false }`
  - SEND_PAYMENT_LINK → `{ allowed: false, requiresApproval: true }`
- **MANUAL**: always `{ allowed: false, requiresApproval: true }`

### 6. Placeholder Functions

```typescript
// These will be implemented in Task 11
export async function processCloseEngineFirstMessage(conversationId: string): Promise<void> {
  console.log(`[CloseEngine] First message placeholder for conversation ${conversationId}`);
  // TODO: Implement in Task 11
}

export async function processCloseEngineInbound(
  conversationId: string,
  message: string,
  mediaUrls?: string[]
): Promise<void> {
  console.log(`[CloseEngine] Inbound placeholder for conversation ${conversationId}: ${message}`);
  // TODO: Implement in Task 11
}
```

---

## Verify Before Moving On

- [ ] File compiles with no TypeScript errors
- [ ] `triggerCloseEngine()` creates a CloseEngineConversation record in the database
- [ ] Calling `triggerCloseEngine()` twice with the same leadId returns the existing conversation (no duplicates)
- [ ] Lead status updates to QUALIFIED and priority to HOT on trigger
- [ ] LeadEvent created with CLOSE_ENGINE_TRIGGERED
- [ ] Notification created for Andrew
- [ ] `transitionStage()` updates stage and sets correct timestamp
- [ ] `getConversationContext()` returns lead data, messages, and enriched data
- [ ] `checkAutonomy()` returns correct results for FULL_AUTO, SEMI_AUTO, MANUAL
- [ ] Lead with no phone number returns error (not a crash)
