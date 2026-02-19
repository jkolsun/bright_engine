# TASK 16: Messages Tab UI — Pre/Post Client Tabs

## Overview
Major UI update to the Messages page. Split into Pre-Client and Post-Client tabs. Add autonomy dropdowns, stage badges, draft message approval UI, and pending action banners.

**File to modify:** `src/app/admin/messages/page.tsx`
**Est. Time:** 2.5 hours
**Dependencies:** Tasks 5, 15 (APIs must exist)

---

## IMPORTANT: Paste the existing messages page into Claude Code alongside this prompt.

---

## What To Do

### 1. Add Tab Bar

Add 3 tabs at the top of the messages page: **Pre-Client** | **Post-Client** | **All**

- Default tab: Pre-Client
- Tabs styled with teal active indicator

### 2. Pre-Client Tab Data Source

Fetch from `/api/close-engine/conversations` (you may need to create a simple list endpoint, or query directly):
- Show conversations where stage is NOT COMPLETED and NOT CLOSED_LOST
- Each row shows: company name, lead name, entry point badge, stage badge, last message preview, timestamp

**Entry point badges** (small colored pills):
- INSTANTLY_REPLY → blue pill "Email"
- SMS_REPLY → green pill "SMS"
- REP_CLOSE → purple pill "Rep"
- PREVIEW_CTA → orange pill "CTA"

**Stage badges** (colored based on stage):
- QUALIFYING, COLLECTING_INFO → teal
- BUILDING → blue
- PREVIEW_SENT, EDIT_LOOP → yellow/amber
- PAYMENT_SENT → green
- STALLED → red
- PENDING_APPROVAL → orange with pulse animation

### 3. Conversation Detail Panel

When a conversation is selected:

**Header area:**
- Company name + lead name
- Phone number
- Entry point badge + stage badge
- **Autonomy dropdown** (Full Auto / Semi-Auto / Manual) — calls PUT `/api/close-engine/conversations/[id]` on change

**Pending action banner** (shows if there's a PENDING action):
- Yellow background banner at top of message area
- Text: "Draft message ready — [message preview]"
- Two buttons: "Approve & Send" (teal) and "Reject" (gray)
- Calls PUT `/api/pending-actions/[id]` with action: approve or reject

**Message area:**
- Same bubble format as current (outbound blue right, inbound gray left)
- AI messages tagged with 🤖 and delay time shown
- In MANUAL mode: Claude's draft messages shown with dashed teal border and "Send" / "Edit" / "Skip" buttons

**Message input:**
- Keep the existing send message input for manual override
- Andrew can always type and send a manual message

### 4. Post-Client Tab

Shows conversations with paying clients (Messages where clientId != null):
- Company name, client status, health score indicator
- Last message + timestamp
- Autonomy dropdown (defaults to Full Auto)

### 5. All Tab

Current behavior — shows everything as it does today. No changes needed.

### 6. Auto-Migration Visual

When a payment comes in:
- Conversation disappears from Pre-Client tab
- Appears in Post-Client tab with a "NEW CLIENT" badge (green, fades after 24 hours)
- This happens on data refresh, no WebSocket needed

### 7. Data Fetching

- Pre-Client: Fetch close engine conversations + their messages
- Post-Client: Fetch the existing messages grouped by clientId (current logic)
- Auto-refresh every 10 seconds (or match existing polling pattern)

---

## Verify Before Moving On

- [ ] 3 tabs visible: Pre-Client, Post-Client, All
- [ ] Pre-Client shows only active close conversations
- [ ] Post-Client shows only paying client conversations
- [ ] Entry point badges render correctly with different colors
- [ ] Stage badges show current stage with correct color
- [ ] Autonomy dropdown visible and changes persist to database
- [ ] Pending action banner shows when a PENDING action exists
- [ ] "Approve & Send" sends the draft message
- [ ] "Reject" dismisses without sending
- [ ] Manual mode shows draft messages with Send/Edit/Skip buttons
- [ ] Message bubbles display correctly (AI tagged with 🤖)
- [ ] Manual message sending still works
- [ ] AI Settings tab still accessible
- [ ] Auto-refresh pulls new messages
