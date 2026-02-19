# TASK 1: Prisma Schema Changes

## Overview
Add two new models and new fields to existing models to support the AI Close Engine — the system that takes interested leads and closes them into paying clients via Claude-powered SMS conversations.

**File:** `prisma/schema.prisma`
**Est. Time:** 30 minutes
**Dependencies:** None — this is the first task

---

## What To Do

Open `prisma/schema.prisma` and make the following additions. Do NOT modify or remove any existing models, fields, or relationships.

### 1. Add New Model: CloseEngineConversation

This tracks each AI close conversation from first contact through payment.

```prisma
// ============================================
// CLOSE ENGINE CONVERSATION (AI sales conversations)
// ============================================
model CloseEngineConversation {
  id              String    @id @default(cuid())
  leadId          String    @unique @map("lead_id")
  repId           String?   @map("rep_id")
  entryPoint      String    @map("entry_point")     // INSTANTLY_REPLY, SMS_REPLY, REP_CLOSE, PREVIEW_CTA
  stage           String    @default("INITIATED")    // INITIATED, QUALIFYING, COLLECTING_INFO, BUILDING, PREVIEW_SENT, EDIT_LOOP, PENDING_APPROVAL, PAYMENT_SENT, COMPLETED, STALLED, CLOSED_LOST
  autonomyLevel   String    @default("FULL_AUTO") @map("autonomy_level") // FULL_AUTO, SEMI_AUTO, MANUAL
  questionsAsked  Json?     @map("questions_asked")  // Array of question IDs asked so far
  collectedData   Json?     @map("collected_data")   // Structured qualification data from Claude
  editRounds      Int       @default(0) @map("edit_rounds")
  paymentLinkUrl  String?   @map("payment_link_url")
  paymentLinkSentAt DateTime? @map("payment_link_sent_at")
  stalledAt       DateTime? @map("stalled_at")
  completedAt     DateTime? @map("completed_at")
  closedLostAt    DateTime? @map("closed_lost_at")
  closedLostReason String?  @map("closed_lost_reason")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  lead  Lead  @relation(fields: [leadId], references: [id], onDelete: Cascade)
  rep   User? @relation("CloseEngineRep", fields: [repId], references: [id])

  @@index([stage])
  @@index([entryPoint])
  @@index([createdAt])
  @@map("close_engine_conversations")
}
```

### 2. Add New Model: PendingAction

This stores messages that need Andrew's approval before sending (Semi-Auto and Manual modes).

```prisma
// ============================================
// PENDING ACTION (Approval queue for Semi-Auto/Manual)
// ============================================
model PendingAction {
  id              String    @id @default(cuid())
  conversationId  String    @map("conversation_id")
  leadId          String    @map("lead_id")
  type            String    // SEND_PAYMENT_LINK, SEND_MESSAGE, SEND_PREVIEW
  draftMessage    String    @db.Text @map("draft_message")
  metadata        Json?     // paymentUrl, previewUrl, etc.
  status          String    @default("PENDING") // PENDING, APPROVED, REJECTED, EXPIRED
  approvedBy      String?   @map("approved_by")
  approvedAt      DateTime? @map("approved_at")
  expiresAt       DateTime? @map("expires_at")
  createdAt       DateTime  @default(now()) @map("created_at")

  @@index([status])
  @@index([leadId])
  @@index([conversationId])
  @@map("pending_actions")
}
```

### 3. Add Fields to Existing Lead Model

Find the existing `Lead` model and add these fields (place them near the other status/tracking fields):

```prisma
  // Close Engine fields
  autonomyLevel     String   @default("FULL_AUTO") @map("autonomy_level") // FULL_AUTO, SEMI_AUTO, MANUAL
  closeEntryPoint   String?  @map("close_entry_point")  // INSTANTLY_REPLY, SMS_REPLY, REP_CLOSE, PREVIEW_CTA
  qualificationData Json?    @map("qualification_data") // Structured data collected by Claude
```

### 4. Add Fields to Existing Client Model

Find the existing `Client` model and add:

```prisma
  // Close Engine fields
  autonomyLevel     String   @default("FULL_AUTO") @map("autonomy_level") // FULL_AUTO, SEMI_AUTO, MANUAL
```

### 5. Add Relation Back-References

In the **Lead** model, add this relation (near the other relations at the bottom):
```prisma
  closeConversation  CloseEngineConversation?
```

In the **User** model, add this relation (near the other relations):
```prisma
  closeEngineConversations CloseEngineConversation[] @relation("CloseEngineRep")
```

### 6. Run Migration

After all changes:
```bash
npx prisma db push
```

Then verify:
```bash
npx prisma studio
```

---

## Verify Before Moving On

- [ ] `npx prisma db push` completes without errors
- [ ] Prisma Studio shows `close_engine_conversations` table with all columns
- [ ] Prisma Studio shows `pending_actions` table with all columns
- [ ] Lead table now has `autonomy_level`, `close_entry_point`, `qualification_data` columns
- [ ] Client table now has `autonomy_level` column
- [ ] Existing data is not affected (no destructive changes)
- [ ] `npx prisma generate` succeeds (client types updated)
