# TASK 15: Autonomy Toggle + Pending Actions API

## Overview
Create API routes for managing autonomy levels on conversations and for Andrew to approve/reject pending actions (draft messages and payment links) in Semi-Auto and Manual modes.

**Files to create:** 3 new API routes
**Est. Time:** 1.5 hours
**Dependencies:** Tasks 5, 11

---

## What To Do

### FILE 1: `src/app/api/close-engine/conversations/[id]/route.ts` (NEW)

```typescript
// GET — Return conversation with lead, messages, pending actions
// PUT — Update autonomy level or notes
```

**GET handler:**
- Load CloseEngineConversation by ID with includes: lead (all fields), messages (last 50 ordered by createdAt asc)
- Also load PendingActions for this conversation where status = PENDING
- Return the full object

**PUT handler:**
- Accept body: `{ autonomyLevel?: string, notes?: string }`
- Validate autonomyLevel is one of: FULL_AUTO, SEMI_AUTO, MANUAL
- Update the conversation record
- ALSO update `lead.autonomyLevel` to stay in sync
- Return updated conversation

Both require ADMIN auth.

### FILE 2: `src/app/api/pending-actions/route.ts` (NEW)

**GET handler:**
- List all PendingActions where status = PENDING
- Order by createdAt desc
- Include related data: load the lead's firstName, companyName, and the conversation's stage
- This powers the approval queue in the Messages UI

Requires ADMIN auth.

### FILE 3: `src/app/api/pending-actions/[id]/route.ts` (NEW)

**PUT handler:**
- Accept body: `{ action: 'approve' | 'reject', editedMessage?: string, reason?: string }`

**On approve:**
1. Load the PendingAction
2. Get the message to send: use `editedMessage` if provided, otherwise `draftMessage`
3. Send via `sendSMSViaProvider()` with the stored metadata (leadId, trigger, etc.)
4. Update PendingAction: status → APPROVED, approvedBy (from session), approvedAt = now()
5. If type is SEND_PAYMENT_LINK, also transition conversation stage to PAYMENT_SENT

**On reject:**
1. Update PendingAction: status → REJECTED
2. Optionally log the reason
3. Do NOT send any message

Requires ADMIN auth.

---

## Verify Before Moving On

- [ ] GET conversation returns full data with lead, messages, pending actions
- [ ] PUT conversation updates autonomyLevel in both conversation AND lead
- [ ] Invalid autonomyLevel returns 400 error
- [ ] GET pending-actions returns list of PENDING items sorted by date
- [ ] Approve sends the draft message via SMS
- [ ] Approve with editedMessage sends the edited version instead
- [ ] Reject does NOT send any message
- [ ] Approve updates status to APPROVED with approvedBy and approvedAt
- [ ] Payment link approval transitions stage to PAYMENT_SENT
- [ ] All endpoints reject non-ADMIN requests with 401/403
