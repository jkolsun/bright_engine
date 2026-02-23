# MASTER BUG LIST — Bright Automations Platform
## EXPANDED Deep Audit — All Bugs (Original 179 + New Findings)
## For Claude Code: Fix These In Priority Order

> **INSTRUCTIONS FOR CLAUDE CODE:** This is the single source of truth for ALL bugs. It includes the original 179 bugs (with corrections where bugs were already fixed), PLUS new bugs found via deep line-by-line code audit. Fix bugs in priority order (CRITICAL first). When fixing a bug, check if your fix affects other bugs in this list — many are interconnected.

---

## ⚠️ CORRECTIONS TO ORIGINAL LIST (Bugs Already Fixed)

Before starting: these bugs from the original list have been **VERIFIED AS ALREADY FIXED** in the current codebase. Do NOT re-fix them — but verify they still work:

| Original Bug | Status | Evidence |
|---|---|---|
| **BUG 11.1** — No charge.refunded handler | ✅ **ALREADY FIXED** | `handleChargeRefunded()` exists in `stripe/route.ts` with full clawback logic |
| **BUG 8.3** — Payment link no conversation matching | ✅ **PARTIALLY FIXED** | Email + phone fallback lookup exists. Still verify `client_reference_id` is always set |
| **BUG 9.2** — Worker restart loses jobs | ✅ **ALREADY FIXED** | `gracefulShutdown()` with SIGTERM/SIGINT handlers exists, closes all 7 workers |
| **BUG 14.1** — Plain text password | ✅ **PARTIALLY FIXED** | bcryptjs installed, `simple-login` route hashes on first login, but env-var fallback still exists |

**ACTION:** Skip these 4 fixes. Verify they work. Move budget to NEW bugs below.

---

## REVISED STATS

| Severity | Original | Corrections | New Found | Revised Total |
|----------|----------|-------------|-----------|---------------|
| CRITICAL | 42 | -3 fixed | +18 new | **57** |
| MEDIUM | 75 | -1 fixed | +31 new | **105** |
| LOW | 62 | 0 | +24 new | **86** |
| **TOTAL** | **179** | **-4** | **+73** | **248** |

---

## REVISED TOP 15 — FIX THESE FIRST

1. **BUG 8.1** — setTimeout for ALL AI messages → messages silently dropped on serverless
2. **NEW-C1** — Post-client engine ALSO uses setTimeout → same serverless drop bug
3. **BUG 12.1** — Commission shows $0.00 → reps see zero earnings
4. **BUG D.1** — buildStep never auto-advances → sites stuck forever
5. **BUG A.1** — No siteHtml versioning → bad save destroys site permanently
6. **NEW-C2** — SiteEditorClient regenerate sets HTML to empty string → snapshot failure = permanent data loss
7. **BUG 10.1** — 15+ silent catch blocks in dialer → UI/server state diverge
8. **BUG 10.2** — Fake offline session IDs → reps lose all work
9. **NEW-C3** — Post-client engine has NO DNC check → DNC clients get AI replies
10. **BUG I.1** — No timeout on ANY pending state → things stuck forever
11. **BUG E.1** — Onboarding "complete" doesn't match admin "go live"
12. **NEW-C4** — Multiple Anthropic client singletons → API key changes only affect 1 of 3
13. **BUG 10.3** — dialer-scoring.ts uses deprecated Call model → scoring returns zero
14. **BUG 13.3** — Close Engine emails bypass DNC check
15. **NEW-C5** — Disposition logging uses fake call IDs when activeCallId is null

---

# ═══════════════════════════════════════════════════════
# CRITICAL BUGS — ORIGINAL (39 remaining after corrections)
# ═══════════════════════════════════════════════════════

## CLOSE ENGINE

### BUG 8.1 — All AI Message Sends Use setTimeout (CONFIRMED STILL BROKEN)
**Files:** `src/lib/close-engine-processor.ts`, `src/lib/post-client-engine.ts`
**Problem:** Every AI message uses `setTimeout()` for humanizing delay. In serverless (Vercel, Railway), the function returns before setTimeout fires. Messages silently dropped.
**Evidence:** `processCloseEngineInbound()` line: `setTimeout(async () => { ... await sendCloseEngineMessage(...) }, delay * 1000)` — confirmed in 3 separate code paths: first message, normal reply, and pre-payment reply.
**Fix:** Replace ALL `setTimeout` with BullMQ delayed jobs. Create a `send-message` job type with delay option. Worker already exists. Apply to BOTH `close-engine-processor.ts` AND `post-client-engine.ts`. (~1.5 hours)

### BUG 8.2 — No Stall Detection Recovery
**File:** `src/lib/close-engine.ts`
**Problem:** STALLED stage exists but nothing ever transitions conversations to it unless the monitoring worker `closeEngineStallCheck()` runs. Verify the stall check worker is actually scheduled on startup.
**Fix:** Verify `scheduleCloseEngineStallCheck()` is called during worker init. If not, add it. (~15 min)

### BUG 8.3 — Payment Link Matching (PARTIALLY FIXED — verify)
**File:** `src/app/api/webhooks/stripe/route.ts`
**Problem:** Email + phone fallback NOW EXISTS. But verify: does `generatePaymentLink()` in `close-engine-payment.ts` ALWAYS set `client_reference_id: lead.id`?
**Status:** Verify only — email/phone fallback is implemented. Check that `metadata.leadId` is also always set. (~5 min verify)

## STRIPE / PAYMENTS

### BUG 11.1 — charge.refunded Handler (ALREADY FIXED — verify)
**Status:** ✅ `handleChargeRefunded()` exists with full clawback/rejection logic, admin notification.
**Action:** Verify it works end-to-end. Check that `status: 'REFUNDED' as any` cast is correct — does `PaymentStatus` enum include REFUNDED? **YES** — confirmed enum has `PAID | FAILED | REFUNDED | PENDING`. The `as any` cast is unnecessary and should be removed. (~2 min)

### BUG 11.2 — Stripe SDK Uses 'build-placeholder' Default
**File:** `src/app/api/webhooks/stripe/route.ts`
**Problem:** `process.env.STRIPE_SECRET_KEY || 'build-placeholder'` — the lazy init function throws if placeholder, but it's inside a try/catch that returns 500. The build-placeholder could leak into error logs.
**Fix:** Add startup env validation or at minimum remove the string literal from error-visible paths. (~10 min)

## COMMISSION SYSTEM

### BUG 12.1 — Commission Status Never Reaches APPROVED — $0.00 Display (CONFIRMED)
**Files:** `src/app/reps/earnings/page.tsx`, `src/app/part-time/earnings/page.tsx`
**Problem:** Confirmed — `totalEarned` filters `.filter(c => c.status === 'APPROVED' || c.status === 'PAID')`. Nothing ever sets APPROVED. Shows $0.00.
**Fix:** Change filter to `c.status !== 'REJECTED'` to include PENDING + APPROVED + PAID. Apply to BOTH pages. (~5 min)

### BUG 12.2 — processRevenueCommission Fragile Type Cast
**File:** `src/lib/commissions.ts`
**Problem:** `(lead as any)?.ownerRepId` — uses unsafe cast.
**Fix:** Add `ownerRep: true` to Prisma include. Use `lead.ownerRepId || lead.assignedToId`. (~5 min)

### BUG L.1 — Part-Time Earnings Excludes PENDING
**File:** `src/app/part-time/earnings/page.tsx`
**Fix:** Same as 12.1. (~2 min)

### BUG L.2 — Backend Summary Ignores APPROVED/REJECTED (CONFIRMED)
**File:** `src/lib/commissions.ts` → `getRepCommissionSummary()`
**Problem:** Confirmed — `stats.forEach` only handles PENDING and PAID. APPROVED and REJECTED silently dropped.
**Fix:** Handle all four CommissionStatus values in the forEach loop. (~5 min)

## DIALER

### BUG 10.1 — DialerCore Has 15+ Silent Catch Blocks (CONFIRMED)
**File:** `src/components/rep/DialerCore.tsx`
**Problem:** Confirmed — `handleHold`, `handleResume` (inside handleHold), `handleHangup`, `handleSkip`, `handleStartSession`, `handleEndSession` all have `catch { /* silent */ }` or `catch { }` blocks.
**Fix:** Replace with error toasts + state rollback for each. (~30 min)

### BUG 10.2 — Dialer "Offline Mode" Creates Fake Session IDs (CONFIRMED)
**File:** `src/components/rep/DialerCore.tsx` → `handleStartSession()`
**Problem:** Confirmed — both the `!res.ok` path AND the catch block create `session-${Date.now()}`. All calls linked to non-existent session.
**Fix:** Don't allow dialing without valid server-side session. Show error + retry button. (~10 min)

### BUG 10.3 — dialer-scoring.ts Uses Deprecated Call Model (CONFIRMED)
**File:** `src/lib/dialer-scoring.ts`
**Problem:** Confirmed — uses `(prisma as any).call.findMany` and `(prisma as any).callScoring.upsert`. References `c.outcome`, `c.durationSeconds` which don't exist on DialerCall.
**Fix:** Migrate to `prisma.dialerCall.findMany` with `dispositionResult` and `duration`. (~45 min)

## SITEHTML / EDITOR

### BUG A.1 — No Versioning on siteHtml
**File:** Lead model / `prisma/schema.prisma`
**Problem:** Every write to `lead.siteHtml` is destructive overwrite. Bad AI edit = permanent loss.
**Fix:** Add `SiteVersion` table. Cap at 10 versions. Save before every write. (~30 min)

### BUG A.2 — Regenerate Destroys All Edits With No Recovery (CONFIRMED)
**File:** `src/components/site-editor/SiteEditorClient.tsx`
**Problem:** Confirmed — `handleRegenerate` calls PUT with `{ html: '' }` FIRST, then POST to snapshot. If snapshot fails, HTML is permanently empty string. No pre-regenerate backup.
**Fix:** Save current siteHtml BEFORE clearing. Add "Undo Regenerate" button. (~15 min)

### BUG B.1 — Concurrent Edit Requests Have No Locking
**File:** `src/lib/edit-request-handler.ts`
**Problem:** Two simultaneous edits both read same siteHtml → second overwrites first.
**Fix:** Add optimistic locking (version counter) or queue edits sequentially. (~20 min)

### BUG B.2 — Simple Edit "Going Live" Message is False
**File:** `src/lib/edit-request-handler.ts`
**Fix:** Change confirmation message to "Changes have been applied to your preview!" (~2 min)

### BUG F.1 — Admin Edits Immediately Visible to Everyone
**File:** `src/app/preview/[id]/page.tsx`
**Problem:** No draft/publish separation.
**Fix:** Add `siteHtmlDraft` field. Editor writes to draft, publish action copies to live. (~30 min)

## BUILD QUEUE / ONBOARDING

### BUG D.1 — buildStep Has No Automatic Advancement (CONFIRMED)
**Problem:** Each step requires manual admin click. Auto-advance should fire on key events.
**Fix:** Auto-advance: BUILDING→QA when siteHtml saved, QA→PREVIEW_SENT on approval, etc. (~45 min)

### BUG D.2 — Live Sites All Served by One Next.js App
**Problem:** "Live" client sites = preview URL. Server down = all sites down.
**Fix:** Document as known limitation. Plan static export for V2. (~30 min document)

### BUG E.1 — Onboarding "Complete" Doesn't Match Admin "Go Live" (CONFIRMED)
**Problem:** Post-client engine step 7 = "complete" but admin build queue has separate flow. They don't sync.
**Fix:** Sync onboarding step 7 with buildStep LAUNCHED. (~20 min)

### BUG E.2 — DNS Worker Doesn't Update buildStep
**File:** `src/worker/index.ts` (DNS check job)
**Fix:** Ensure DNS verification triggers buildStep → LAUNCHED and notifies admin. (~15 min)

### BUG G.1 — Pre-Client Edit Loop Has No Automated Editing
**File:** `src/lib/close-engine-prompts.ts`
**Problem:** EDIT_LOOP stage acknowledged by AI but nothing triggers the edit handler.
**Fix:** Wire up edit detection in close-engine-processor for EDIT_LOOP → create EditRequest → route to handler. (~30 min)

### BUG I.1 — No Timeout/Escalation on ANY Pending State
**Problem:** Approvals, pending actions, edit requests can sit PENDING forever.
**Fix:** Add recurring worker check for items pending > 24 hours. (~30 min)

## WORKER / JOBS

### BUG 9.1 — No Dead Letter Queue / Failed Job Visibility
**File:** `src/worker/index.ts`
**Fix:** Add `/admin/queue-status` page. Add monitoring for queue depth > 100. (~1 hour)

### BUG 9.2 — Worker Restart Loses In-Progress Jobs (ALREADY FIXED — verify)
**Status:** ✅ Graceful shutdown handler EXISTS with SIGTERM/SIGINT.
**Action:** Verify all 7 workers are closed in the handler. (~2 min verify)

## DNC / COMPLIANCE

### BUG 13.1 — Sequence Worker May Bypass DNC Check
**Fix:** Verify per-send DNC check runs. Add double-check before batch processing. (~10 min)

### BUG 13.3 — Close Engine Emails Bypass DNC Check (CONFIRMED)
**File:** `src/lib/close-engine-processor.ts` → `sendCloseEngineMessage()`
**Problem:** SMS path has DNC check via `sendSMSViaProvider`. Email fallback calls `sendEmail()` directly — no DNC check.
**Fix:** Add DNC check before email fallback. (~5 min)

## AUTH / SECURITY

### BUG 14.1 — Plain Text Password for Admin (PARTIALLY FIXED)
**Status:** bcryptjs installed, `simple-login` route hashes on first login. But env-var plaintext comparison still exists as fallback.
**Fix:** Remove env-var plaintext fallback once all users have passwordHash set. Add migration script. (~15 min)

## ARCHITECTURE

### BUG 15.1 — Settings System Two Competing Patterns
**Fix:** Audit every Settings key. Document one source of truth per feature. (~1 hour)

### BUG 15.2 — No Database Migration Strategy
**Fix:** Switch to `prisma migrate`. Commit migration files. (~30 min)

## MESSAGES / DATA

### BUG M.1 — Pre-Client and All Tab Different Message Counts
**Fix:** Unify message counting logic. (~15 min)

### BUG L.3 — Admin Performance Includes REJECTED Commissions
**Fix:** Exclude REJECTED from performance totals. (~5 min)

---

# ═══════════════════════════════════════════════════════
# CRITICAL BUGS — NEW (18 found in deep audit)
# ═══════════════════════════════════════════════════════

### NEW-C1 — Post-Client Engine ALSO Uses setTimeout for All Sends
**File:** `src/lib/post-client-engine.ts`
**Problem:** Same bug as 8.1 but in the post-client path. `processPostClientInbound()` uses `setTimeout(async () => { await sendSMSViaProvider(...) }, delay * 1000)`. On serverless, this drops messages to paying clients. Edit confirmation replies also use setTimeout.
**Impact:** PAYING CLIENTS don't receive AI support responses. Higher impact than pre-client drops.
**Fix:** Replace with BullMQ delayed jobs, same pattern as BUG 8.1 fix. Apply to ALL setTimeout-based sends in this file. (~30 min)

### NEW-C2 — SiteEditorClient Regenerate Creates Empty HTML on Snapshot Failure
**File:** `src/components/site-editor/SiteEditorClient.tsx` → `handleRegenerate()`
**Problem:** Step 1: PUT `{ html: '' }` (clears siteHtml). Step 2: POST to snapshot to generate fresh. If snapshot POST fails (API error, timeout, network issue), the lead's siteHtml is now permanently an empty string. The preview page will show nothing. The client sees a blank page.
**Impact:** Data destruction. Client's site disappears with no recovery path.
**Fix:** NEVER clear siteHtml before regenerating. Instead: (1) Save backup `preRegenerateHtml = currentHtml`, (2) Generate new snapshot, (3) Only clear old HTML after new is confirmed. (~15 min)

### NEW-C3 — Post-Client Engine Has NO DNC Check Before AI Replies
**File:** `src/lib/post-client-engine.ts` → `processPostClientInbound()`
**Problem:** When a client sends an inbound message, `processPostClientInbound()` loads the client, checks for pending edits, processes AI response, and sends reply — but NEVER checks if the lead/client is DNC. The Twilio webhook checks DNC for leads but the client routing path may not.
**Impact:** COMPLIANCE VIOLATION — DNC clients receive automated AI messages.
**Fix:** Add DNC check at top of `processPostClientInbound()`: `if (client.lead?.dncAt) return`. (~5 min)

### NEW-C4 — Multiple Anthropic Client Singletons Not Coordinated
**Files:** `src/lib/close-engine-processor.ts`, `src/lib/post-client-engine.ts`, `src/lib/edit-confirmation-handler.ts`
**Problem:** Three separate files each create their own `_anthropicClient` singleton with `new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })`. Only `close-engine-processor.ts` has the `registerClientInvalidator()` hook that resets the client when the admin changes the API key. The other two files will keep using the OLD key until server restart.
**Impact:** Admin changes Anthropic API key → post-client engine and edit handler keep using old key → API calls fail silently or charge wrong account.
**Fix:** Extract shared `getAnthropicClient()` into a dedicated `src/lib/anthropic.ts` module with centralized invalidation. All three files import from it. (~20 min)

### NEW-C5 — Disposition Logging Uses Fake Call IDs
**File:** `src/components/rep/DialerCore.tsx` → `handleDisposition()`
**Problem:** Line: `callId: activeCallId || \`call-${Date.now()}\``  — when `activeCallId` is null (which happens if the dial API failed or the rep is in part-time mode using tel: links), dispositions are logged against non-existent call records. Same pattern as BUG 10.2 but for disposition data.
**Impact:** All disposition data for failed/tel-link calls is orphaned. Rep's activity stats are wrong.
**Fix:** If `activeCallId` is null, create a proper DialerCall record server-side first, or at minimum flag the disposition as "unlinked" for later reconciliation. (~15 min)

### NEW-C6 — handleCheckoutCompleted No Idempotency on Revenue Creation
**File:** `src/app/api/webhooks/stripe/route.ts` → `handleCheckoutCompleted()`
**Problem:** The duplicate check only verifies `lead.status === 'PAID'` (skips if already paid). But if the webhook fires twice in quick succession (common with Stripe retries), both invocations pass the check before either updates status. Result: duplicate Client, Revenue, and Commission records.
**Impact:** Double revenue records, double commissions, duplicate clients.
**Fix:** Use `prisma.revenue.create()` with `stripePaymentId: session.id` (unique constraint will reject duplicates). Wrap in try/catch for unique violation. (~10 min)

### NEW-C7 — handlePaymentSucceeded Creates Revenue Without Idempotency
**File:** `src/app/api/webhooks/stripe/route.ts` → `handlePaymentSucceeded()`
**Problem:** `prisma.revenue.create()` called without checking if this invoice was already processed. Stripe sends `invoice.payment_succeeded` multiple times on retry. No `stripePaymentId` set on the revenue record.
**Impact:** Duplicate monthly revenue records inflate MRR reporting.
**Fix:** Set `stripePaymentId: invoice.id` and use upsert or catch unique constraint error. (~5 min)

### NEW-C8 — Twilio Signature Verification Only in Production
**File:** `src/app/api/webhooks/twilio/route.ts`
**Problem:** Signature verification is wrapped in `if (process.env.NODE_ENV === 'production')`. This means in staging/development, anyone can spoof Twilio webhooks and inject messages into the system.
**Impact:** Staging environments completely unprotected. If staging uses real data, this is a security hole.
**Fix:** Enable signature verification in ALL environments except explicit local development. Use `process.env.SKIP_TWILIO_VERIFY === 'true'` flag instead. (~10 min)

### NEW-C9 — Close Engine Payment Flow Race Condition
**File:** `src/lib/close-engine-processor.ts` → Payment link section
**Problem:** When `nextStage === PAYMENT_SENT`, two async operations fire: (1) send conversational reply via setTimeout, (2) `sendPaymentLink()` via import. The payment link may arrive before the conversational message due to the setTimeout delay. Client gets payment link without context.
**Impact:** Confusing UX — client receives payment link before the "getting your payment link ready" message.
**Fix:** Chain the operations: send conversational reply first (via BullMQ delayed job), then schedule payment link with additional delay. (~15 min)

### NEW-C10 — Build Queue Rebuild Has No Pre-Rebuild Backup
**File:** `src/app/admin/build-queue/page.tsx` → `handleRebuild()`
**Problem:** The rebuild endpoint regenerates the site from scratch. While the UI shows a confirmation dialog mentioning "PERMANENTLY ERASE all manual edits", the server-side rebuild route does NOT save the current siteHtml before overwriting. If admin accidentally confirms, all edits are gone.
**Impact:** Irreversible data loss on rebuild.
**Fix:** Save `preRebuildHtml` to SiteVersion table (from BUG A.1 fix) before rebuild. (~10 min — depends on A.1)

### NEW-C11 — Dialer handleDial Safety Timeout Resets State Without Server Sync
**File:** `src/components/rep/DialerCore.tsx` → `handleDial()`
**Problem:** `setTimeout(() => { setCallPhase(prev => prev === 'dialing' ? 'idle' : prev) }, 45000)` — after 45 seconds of ringing with no connection, client-side resets to idle. But the server-side DialerCall record still shows INITIATED/RINGING status. Server thinks call is active, client thinks it's idle. Rep can start a new call while the old one is "active" server-side.
**Impact:** Ghost calls in the system. Rep can't end them. Active call queries return stale data.
**Fix:** When safety timeout fires, also call `/api/dialer/call/end` to close the server-side record. (~10 min)

### NEW-C12 — Onboarding Step Advancement Has No Order Validation
**File:** `src/lib/onboarding.ts`
**Problem:** `advanceOnboarding()` increments `onboardingStep` without validating the step is actually the next sequential one. A race condition or repeated message could advance from step 2 to step 4, skipping step 3 entirely.
**Impact:** Client misses onboarding steps. Critical setup like domain configuration gets skipped.
**Fix:** Validate `currentStep + 1 === targetStep` before advancing. Log and skip if out of order. (~10 min)

### NEW-C13 — Worker DNS Check Has No Maximum Retry Count
**File:** `src/worker/index.ts` → `handleOnboardingDnsCheck()`
**Problem:** DNS check re-queues itself with a delay if verification fails. But there's no counter tracking how many times it's retried. If DNS is never configured, this job runs forever, consuming worker resources and sending nudge messages indefinitely.
**Impact:** Infinite job loop. Worker queue fills up. Client gets spammed with DNS nudge messages.
**Fix:** Add `dnsCheckCount` to onboarding data. Max 20 checks (covers ~48 hours at reasonable intervals). After max, notify admin and stop. (~10 min)

### NEW-C14 — Preview HTML Served via dangerouslySetInnerHTML (XSS Vector)
**File:** `src/app/preview/[id]/page.tsx`
**Problem:** siteHtml is stored in the database and rendered directly. If any AI-generated content or client-submitted data contains `<script>` tags, they execute in the browser. The AI edit handler doesn't sanitize output.
**Impact:** Stored XSS. Any malicious content in siteHtml executes for every visitor.
**Fix:** Sanitize HTML with DOMPurify before rendering, OR serve in sandboxed iframe with `sandbox` attribute. (~20 min)

### NEW-C15 — Commission repId Could Be Null in processRevenueCommission
**File:** `src/lib/commissions.ts` → `processRevenueCommission()`
**Problem:** Uses `repUser!.id` with non-null assertion. If both `lead.ownerRepId` and `lead.assignedToId` are null (unassigned lead pays directly), this crashes the webhook handler with a null reference error.
**Impact:** Stripe webhook returns 500 → Stripe retries → creates duplicate processing attempts.
**Fix:** Guard: `if (!repUserId) { /* create commission with admin as rep, or skip */ return }`. (~5 min)

### NEW-C16 — Stripe Webhook Handler Catches All Errors → Returns 500 → Stripe Retries
**File:** `src/app/api/webhooks/stripe/route.ts`
**Problem:** The outer try/catch returns `{ error: 'Processing failed' }, { status: 500 }`. Stripe interprets any non-2xx as failure and retries the webhook up to ~15 times over 72 hours. If the error is non-transient (e.g., missing lead, schema error), every retry creates duplicate processing attempts.
**Impact:** Amplifies any bug into 15x the damage through retries.
**Fix:** Distinguish transient (500) from permanent (200 with logged error) failures. Return 200 for non-retryable errors. (~15 min)

### NEW-C17 — No STOP/UNSUBSCRIBE Keyword Auto-DNC in Twilio Webhook
**File:** `src/app/api/webhooks/twilio/route.ts`
**Problem:** When a lead texts "STOP", "UNSUBSCRIBE", "CANCEL", or "QUIT", Twilio auto-blocks at carrier level but the app doesn't mark the lead as DNC. Future attempts to send via the app will fail silently (Twilio rejects) but the system thinks messages were sent.
**Impact:** Wasted AI processing, incorrect message delivery stats, potential compliance issues if using multiple messaging services.
**Fix:** Detect STOP keywords in inbound handler → auto-mark DNC → create notification. (~10 min)

### NEW-C18 — SiteEditorPanel and SiteEditorClient Save to Same Endpoint But Different Logic
**Files:** `src/components/site-editor/SiteEditorClient.tsx`, `src/components/site-editor/SiteEditorPanel.tsx`
**Problem:** Both components save to `/api/site-editor/${leadId}/save` but SiteEditorClient has debounced auto-save with htmlRef tracking, while SiteEditorPanel has manual save with `debouncedHtml` state. If both are open simultaneously (admin opens panel while client editor is active), they overwrite each other.
**Impact:** Edit conflicts between admin and automated edits.
**Fix:** Add optimistic locking (version counter) on the save endpoint. Return conflict error if version mismatch. (~20 min)

---

# ═══════════════════════════════════════════════════════
# MEDIUM BUGS — ORIGINAL (74 remaining)
# ═══════════════════════════════════════════════════════

### BUG 8.4 — Claude JSON Parsing Silent Fallback Loses Data (CONFIRMED)
**File:** `src/lib/close-engine-processor.ts` → `parseClaudeResponse()`
**Problem:** Confirmed — catch block returns `{ replyText: raw.substring(0, 300), extractedData: null, nextStage: null, ... }`. ALL structured data lost.
**Fix:** Add regex extraction for individual JSON fields before full fallback. (~20 min)

### BUG 8.5 — shouldAIRespond() Uses require() Inside Async (CONFIRMED)
**File:** `src/lib/close-engine-processor.ts`
**Problem:** `const { isConversationEnder, getSmartChatSettings } = require('./message-batcher')` inside async function.
**Fix:** Move to top-level import. (~2 min)

### BUG 8.6 — First Message AI Rewrite Has No Quality Gate (CONFIRMED)
**Problem:** Only checks length 10-500. No check for AI revealing it's a bot.
**Fix:** Add keyword filter. (~10 min)

### BUG 8.7 — Stage Transitions Have No Validation
**Fix:** Add valid transition map. Reject invalid. (~15 min)

### BUG 8.8 — AI Vision Classification Silently Fails
**Fix:** Append image attachment note even if classification fails. (~5 min)

### BUG 9.3 — Sequence Timezone May Block All Sends
**Fix:** Default to EST if no timezone. (~5 min)

### BUG 9.4 — Enrichment Worker No Deduplication
**Fix:** Check if lead has enrichment data before calling SerpAPI. (~5 min)

### BUG 9.5 — No Worker Health Check Endpoint
**Fix:** Add HTTP health endpoint to worker process. (~15 min)

### BUG 10.4 — SSE Subscription Doesn't Clean Up
**Fix:** Add ref-based cleanup and debounce. (~15 min)

### BUG 10.5 — Monitor Listen/Whisper/Barge Are Placeholder alerts()
**Fix:** Hide buttons with "Coming Soon" label. (~5 min)

### BUG 10.6 — Call Duration Client-Side Only (CONFIRMED)
**Problem:** `callTimer` state incremented via `setInterval` on client. If browser tab freezes, duration is wrong.
**Fix:** Calculate server-side from `connectedAt` to `endedAt`. (~10 min)

### BUG 10.7 — VM Drop Requires Two Twilio Numbers (No UI)
**Fix:** Add Twilio number management to admin rep settings. (~30 min)

### BUG 11.3 — Duplicate Payment Protection Weak
**Fix:** Add idempotency check using `session.id`. (~10 min)

### BUG 11.4 — Revenue Duplicate Creates
**Fix:** Use `stripePaymentId` unique constraint or upsert. (~5 min)

### BUG 11.5 — Subscription Cancel Missing Win-Back (CHECK)
**Status:** `triggerWinBackSequence(client.id)` IS called in `handleSubscriptionCancelled()`. Verify the function actually queues the sequence.
**Fix:** Verify win-back sequence is properly queued and sent. (~10 min verify)

### BUG 12.3 — No Upsell Commission
**Fix:** Add upsell commission creation. (~20 min)

### BUG 12.4 — Part-Time Earnings Is Exact Duplicate Code (CONFIRMED)
**Fix:** Extract shared EarningsComponent. (~15 min)

### BUG 13.2 — markDNC No Reason/Source Tracking (CONFIRMED)
**Problem:** Confirmed — `markDNC(leadId, repId)` receives repId but doesn't store it. No `dncReason` or `dncAddedBy` fields exist in schema.
**Fix:** Add fields to Lead schema. Update markDNC. (~15 min)

### BUG 14.2 — XSS via dangerouslySetInnerHTML on Preview
**Fix:** Sanitize HTML or use iframe sandbox. (~20 min)

### BUG 14.3 — Webhook Endpoints No Rate Limiting
**Fix:** Add rate limiting. Enable Twilio sig verification everywhere. (~15 min)

### BUG 15.3 — Console.log Only Logging
**Fix:** Add structured logger (pino). (~1 hour)

### BUG 15.4 — No Backup Strategy
**Fix:** Document backup strategy. Set up daily pg_dump. (~30 min)

### BUG 15.5 — Dynamic Imports for Circular Dep Avoidance
**Fix:** Refactor module graph. (~1 hour)

### BUG 15.6 — Old Call/DialerSession Models Still in Schema (CONFIRMED)
**Problem:** User model has relations to BOTH old (`Call`, `DialerSession`) and new (`DialerCall`, `DialerSessionNew`). Old models never used by new code but pollute schema.
**Fix:** Migrate all refs. Drop old models. (~1 hour)

### BUG B.3 — Edit Handler Failure Silently Swallowed
**Fix:** Log failures, notify admin, update EditRequest to FAILED. (~10 min)

### BUG B.4 — AI Complexity Classification by Haiku (Cheap, Inaccurate)
**Fix:** Use Sonnet for classification or add manual override. (~10 min)

### BUG C.1 — Build Queue Edit and Site Editor Are Different Systems
**Fix:** Document or unify. (~20 min)

### BUG D.3 — Rebuild Destroys All Edits
**Fix:** Save current siteHtml before rebuild. (~15 min)

### BUG E.3 — Onboarding Steps in 4 Different Places
**Fix:** Centralize in `onboarding.ts`. (~30 min)

### BUG F.2 — Preview URL is Guessable
**Fix:** Use UUID or random hash. (~10 min)

### BUG G.2 — EDIT_LOOP → PAYMENT Requires Approval Detection
**Fix:** More robust detection patterns. (~10 min)

### BUG H.1 — Clients Page No Edit Request Visibility
**Fix:** Add pending edit count/badge. (~15 min)

### BUG H.2 — Lead Status and buildStep Diverge
**Fix:** Add sync logic. (~20 min)

### BUG K.1 — Clients Page MRR Excludes Upsells
**Fix:** Include upsell revenue. (~10 min)

### BUG K.2 — Rep Performance Uses Hardcoded $149
**Fix:** Use `getPricingConfig()`. (~5 min)

### BUG L.4 — Leaderboard Uses Projection Not Actual Revenue
**Fix:** Use actual revenue data. (~15 min)

### BUG M.2 — Conversation Grouping Key Can Collide
**Fix:** Use unique conversation ID. (~10 min)

### BUG M.3 — Messages Page Loads ALL Messages Every 3-10s
**Fix:** Add pagination + incremental polling. (~20 min)

### BUG N.1 — Client Has No Access to Lead Enrichment Data
**Fix:** Copy enrichment data on creation. (~10 min)

### BUG N.2 — Client Source/Channel Not Tracked
**Fix:** Copy `lead.closeEntryPoint`. (~5 min)

### BUG O.1 — Rep Dashboard Stale Numbers
**Fix:** Add auto-refresh. (~10 min)

### BUG O.2 — Rep Assignment Uses Two Different Fields (CONFIRMED)
**Problem:** Confirmed — `assignedToId` (CSV import), `ownerRepId` (dialer). Used inconsistently.
**Fix:** Standardize on `ownerRepId`. Fall back to `assignedToId`. (~30 min)

### BUG P.1 — Notifications No Deduplication
**Fix:** Check before creating. (~10 min)

### BUG P.2 — Notifications Never Auto-Cleaned
**Fix:** Add cleanup job for 30+ day old notifications. (~10 min)

### BUG Q.1 — Pricing Changes Don't Propagate
**Fix:** Audit all hardcoded values. Use `getPricingConfig()`. (~20 min)

### BUG R.1 — Preview Analytics Don't Attribute Source
**Fix:** Track UTM params and referrer. (~15 min)

### BUG R.2 — Contact Form Submissions Go Nowhere
**Fix:** Wire to LeadEvent or notification. (~20 min)

### BUG S.1 — Post-Launch Sequence Starts Before Site Live
**Fix:** Check hosting status before sending. (~10 min)

### BUG S.2 — Touchpoint Messages Reference Missing Analytics
**Fix:** Check for data before referencing. (~10 min)

### BUG T.1 — Client Deletion Cascades Delete Revenue History
**Fix:** Change to `onDelete: SetNull` or soft-delete. (~10 min)

### BUG T.2 — EditRequest Has Optional leadId But Needs It
**Fix:** Make required or add validation. (~5 min)

### BUG U.1 — Two Editor Components Different Feature Sets
**Fix:** Unify or document. (~30 min)

### BUG U.2 — Build Queue No Time Since Update Alert
**Fix:** Show yellow/red badge. (~15 min)

---

# ═══════════════════════════════════════════════════════
# MEDIUM BUGS — NEW (31 found in deep audit)
# ═══════════════════════════════════════════════════════

### NEW-M1 — Post-Client Engine AI Cost is Hardcoded, Not Actual
**File:** `src/lib/close-engine-processor.ts`
**Problem:** `await prisma.apiCost.create({ data: { service: 'anthropic', operation: '...', cost: 0.03 } })` — cost is hardcoded $0.03 for every call regardless of actual token usage. Over thousands of messages, cost tracking is inaccurate.
**Fix:** Calculate from `apiResponse.usage.input_tokens` and `apiResponse.usage.output_tokens` with model-specific pricing. (~15 min)

### NEW-M2 — First Message AI Rewrite Cost Also Hardcoded
**File:** `src/lib/close-engine-processor.ts` → `processCloseEngineFirstMessage()`
**Problem:** `cost: 0.01` hardcoded for first message generation.
**Fix:** Same as NEW-M1 — calculate from actual usage. (~5 min)

### NEW-M3 — handleConnect() Is Client-Side Only — No Server Verification
**File:** `src/components/rep/DialerCore.tsx` → `handleConnect()`
**Problem:** `handleConnect()` just sets `setCallPhase('connected')` and increments `sessionStats.connects`. It fires a background `/api/activity` call but doesn't verify the Twilio call actually connected. Rep could manually trigger "connect" on a call that's still ringing.
**Fix:** Verify call connected status via Twilio API or SSE event before allowing connect. (~15 min)

### NEW-M4 — Session Stats Are Client-Side Only — Not Persisted
**File:** `src/components/rep/DialerCore.tsx`
**Problem:** `sessionStats = { dials: 0, connects: 0, previewsSent: 0 }` — all local state. If rep refreshes the page during a session, all stats reset to zero. EndOfSessionScreen shows zeros.
**Fix:** Persist stats to DialerSessionNew record via API on each increment. (~20 min)

### NEW-M5 — Edit Confirmation Handler Has No API Call Timeout
**File:** `src/lib/edit-confirmation-handler.ts` → `classifyConfirmationResponse()`
**Problem:** Calls Anthropic API with `max_tokens: 50` but no timeout. If API hangs, the entire inbound message processing hangs.
**Fix:** Add `AbortController` with 10-second timeout. (~10 min)

### NEW-M6 — Dialer Queue Doesn't Exclude Leads With Active Calls
**File:** `src/app/api/dialer/queue/route.ts`
**Problem:** Query filters by status and DNC but doesn't exclude leads that currently have an active call (`endedAt: null`). Two reps could dial the same lead simultaneously.
**Fix:** Add `NOT: { dialerCalls: { some: { endedAt: null } } }` to the where clause. (~5 min)

### NEW-M7 — Auto-Dial 300ms/500ms Race Condition
**File:** `src/components/rep/DialerCore.tsx`
**Problem:** After disposition, `setTimeout(() => handleDialRef.current(), 500)` auto-dials next. But the disposition API call may not have completed. Next dial could hit the same lead if queue hasn't updated.
**Fix:** `await` disposition API response before auto-dialing. Use the updated queue from the API response. (~10 min)

### NEW-M8 — Login Session Has No Refresh Mechanism
**File:** `src/app/api/auth/simple-login/route.ts`
**Problem:** Session cookie has `maxAge: 24 * 60 * 60` (24 hours). After 24 hours, session expires with no warning. Rep mid-dial-session loses everything.
**Fix:** Add session refresh on API calls (extend maxAge). Add frontend session expiry warning. (~20 min)

### NEW-M9 — handleDisposition callbackDate Not Validated
**File:** `src/components/rep/DialerCore.tsx`
**Problem:** Callback date from user input sent directly: `callbackDate: \`${extra.callbackDate}T${extra.callbackTime || '09:00'}:00\``. No validation that date is in the future, no timezone handling, no format validation.
**Fix:** Validate date is future, add timezone context, validate ISO format. (~10 min)

### NEW-M10 — Diagnostics API Creates Redis Connections That May Not Close
**File:** `src/app/api/admin/diagnostics/route.ts`
**Problem:** Creates `new Redis(...)` for testing, calls `redis.quit()` in happy path. But if the `Queue` inspection throws before quit, the Redis connection leaks.
**Fix:** Wrap in try/finally to always call `redis.quit()`. (~5 min)

### NEW-M11 — Close Engine normalizeNextStage May Not Cover All AI Hallucinations
**File:** `src/lib/close-engine-processor.ts`
**Problem:** `normalizeNextStage()` is called after parsing but before using `claudeResponse.nextStage`. If Claude outputs something like "READY_TO_BUILD" instead of "BUILDING", the normalization may not catch it and the stage transition fails silently.
**Fix:** Add comprehensive mapping of common hallucinated stage names. Log unrecognized stages. (~10 min)

### NEW-M12 — Webhook Dispatch Errors Swallowed
**File:** `src/app/api/webhooks/stripe/route.ts`
**Problem:** `dispatchWebhook(WebhookEvents.PAYMENT_RECEIVED(...)).catch(err => console.error(...))` — webhook dispatch failures are logged but not tracked in FailedWebhook table.
**Fix:** On dispatch failure, create FailedWebhook record for retry. (~10 min)

### NEW-M13 — Edit Request Handler Doesn't Check Lead Exists
**File:** `src/lib/edit-request-handler.ts`
**Problem:** `applyEdit()` accesses `lead.siteHtml` but if `client.lead` is null (orphaned client), it crashes.
**Fix:** Add null check and return error. (~5 min)

### NEW-M14 — Onboarding GBP Prompt No Deduplication
**File:** `src/worker/index.ts` → `handleOnboardingGbpPrompt()`
**Problem:** If this job runs twice (BullMQ retry), client gets duplicate GBP setup messages.
**Fix:** Check if GBP prompt already sent before sending. (~5 min)

### NEW-M15 — Message Model Stores Both leadId AND clientId — Ambiguous Ownership
**File:** `prisma/schema.prisma`
**Problem:** Message has both `leadId` and `clientId` as optional fields. A message about a client's lead could be linked to either or both. Queries that filter by one miss the other.
**Fix:** Document the rule: pre-client messages use leadId only, post-client use clientId. Add validation. (~10 min)

### NEW-M16 — Approval Gate SEND_MESSAGE Not in Escalation Gates List
**File:** `src/lib/close-engine-processor.ts`
**Problem:** `checkAutonomy(conversationId, 'SEND_MESSAGE')` creates approvals with gate 'SEND_MESSAGE', but `escalation-gates.ts` lists 11 gates and SEND_MESSAGE isn't one of them. The approval system works (generic), but admin approval UI may not know how to handle this gate type.
**Fix:** Add SEND_MESSAGE, PAYMENT_LINK, SITE_EDIT to the documented gate types. Verify admin approval handler covers all cases. (~10 min)

### NEW-M17 — Pricing Config `firstMonthTotal` Not Always Correct
**File:** `src/lib/close-engine-payment.ts`
**Problem:** `unit_amount: Math.round(pricingConfig.firstMonthTotal * 100)` — if `getPricingConfig()` returns stale cached data or the Settings table has been updated but cache not invalidated, the payment link has the wrong price.
**Fix:** Always fetch fresh pricing for payment link generation (no cache). (~5 min)

### NEW-M18 — Rep Onboarding Wizard Completion Doesn't Refresh Session
**File:** `src/components/rep/RepOnboardingWizard.tsx`
**Problem:** When rep completes onboarding, the session cookie still has the old `onboardingCompletedAt: null`. Middleware onboarding gate checks this value. Rep may be stuck in redirect loop until cookie refreshes.
**Fix:** After onboarding completion, refresh the session cookie or redirect to re-login. (~10 min)

### NEW-M19 — Build Queue Page Polls Edit Requests Every 10 Seconds
**File:** `src/app/admin/build-queue/page.tsx`
**Problem:** `setInterval(fetchEditRequests, 10000)` — polls every 10 seconds regardless of whether admin is looking at that tab. Multiple admin tabs = multiple polling loops.
**Fix:** Use `document.hidden` check to pause polling when tab not visible. (~5 min)

### NEW-M20 — API Cost Service Name Inconsistency
**Files:** Multiple
**Problem:** `apiCost.create({ data: { service: 'anthropic', operation: '...' } })` — some files use 'anthropic', others might use 'claude'. No enum/constant for service names.
**Fix:** Create constants for API cost service names. (~5 min)

### NEW-M21 — Close Engine sendCloseEngineMessage Email Fallback Has No DNC Check
**File:** `src/lib/close-engine-processor.ts`
**Problem:** (Same as BUG 13.3 but more detail) — The SMS path goes through `sendSMSViaProvider` which has a DNC check. When SMS fails, the email fallback calls `sendEmail()` directly with NO DNC check. A DNC lead could receive emails.
**Fix:** Add DNC check before the email fallback: `const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { dncAt: true } }); if (lead?.dncAt) return`. (~5 min)

### NEW-M22 — Client.monthlyRevenue Defaults to $39 But Pricing May Be Different
**File:** `prisma/schema.prisma`
**Problem:** `monthlyRevenue Float @default(39)` — the schema default is $39 but the pricing config may specify a different hosting price. If the webhook doesn't explicitly set this field, it defaults to $39 regardless of actual plan.
**Fix:** Remove schema default or set dynamically from `getPricingConfig()` during client creation. (~5 min)

### NEW-M23 — Stripe Webhook Creates Client With assignedToId Instead of ownerRepId
**File:** `src/app/api/webhooks/stripe/route.ts` → `handleCheckoutCompleted()`
**Problem:** Client creation likely uses `lead.assignedToId` for `repId`. Should use `lead.ownerRepId || lead.assignedToId` for consistency.
**Fix:** Use `lead.ownerRepId || lead.assignedToId` when setting client repId. (~2 min)

### NEW-M24 — Preview Page Tracking API Has No Authentication
**File:** `src/app/api/preview/track/route.ts`
**Problem:** Preview tracking endpoint is public (no auth). Anyone can send fake analytics events — inflate time-on-page, fake CTA clicks, trigger hot lead detection.
**Fix:** Add basic validation: check referrer, rate limit per IP, verify lead/preview exists. (~15 min)

### NEW-M25 — Sequence Worker canSendMessage Timezone Default
**File:** `src/worker/index.ts`
**Problem:** `canSendMessage(client.lead.timezone || 'America/New_York')` — if lead has no timezone, defaults to Eastern. A lead in California gets messages at 5 AM Pacific.
**Fix:** Use lead's state to derive timezone via the existing `stateToTimezone()` utility. (~5 min)

### NEW-M26 — Import Processing Job Has Only 1 Attempt
**File:** `src/worker/queue.ts`
**Problem:** `addImportProcessingJob` uses `attempts: 1`. If the job fails once (transient network error), all leads in that import batch are lost.
**Fix:** Increase to `attempts: 3` with exponential backoff. (~2 min)

### NEW-M27 — EndOfSessionScreen Stats Don't Include Disposition Breakdown
**File:** `src/components/rep/DialerCore.tsx`
**Problem:** Session summary shows only dials, connects, previews sent. Doesn't show interested/not interested/callbacks/voicemails — the metrics that actually matter for rep performance.
**Fix:** Track disposition counts in sessionStats and display in summary. (~15 min)

### NEW-M28 — handleTextPreview Hardcodes Message Template
**File:** `src/components/rep/DialerCore.tsx`
**Problem:** `const message = \`Hey ${currentLead.firstName || 'there'}, this is ${userName || 'us'} with Bright Automations.\`` — hardcoded template. Should use configurable templates from Settings.
**Fix:** Fetch preview text template from settings. (~10 min)

### NEW-M29 — SiteEditorPanel handleReset Confirms But Doesn't Save
**File:** `src/components/site-editor/SiteEditorPanel.tsx`
**Problem:** Reset to original HTML confirms with user dialog but if the original HTML was itself wrong (loaded from corrupted state), there's no way to get back to a known-good state.
**Fix:** Add "Restore from version history" option (depends on BUG A.1 versioning fix). (~10 min)

### NEW-M30 — Approval Handler DOMAIN_SETUP Async Operations Not Awaited
**File:** `src/app/api/admin/approvals/[id]/route.ts`
**Problem:** The DOMAIN_SETUP approval handler does complex async work (Vercel API, DNS setup) inside a switch case. If this takes too long, the API response times out.
**Fix:** Queue domain setup work as a BullMQ job instead of executing inline. (~15 min)

### NEW-M31 — User DELETE Endpoint Soft-Deletes But Doesn't Reassign Leads
**File:** `src/app/api/users/[id]/route.ts`
**Problem:** DELETE marks user as INACTIVE but doesn't reassign their leads, active dialer sessions, or pending commissions. Leads assigned to inactive rep are stuck.
**Fix:** On user deactivation, reassign all active leads to admin or unassigned pool. End active dialer sessions. (~20 min)

---

# ═══════════════════════════════════════════════════════
# LOW BUGS — ORIGINAL (62 — all still valid)
# ═══════════════════════════════════════════════════════

*(All original LOW bugs remain valid. Listing IDs for reference:)*

BUG 8.9, 8.10, 8.11, 9.6, 9.7, 9.8, 10.8, 10.9, 11.6, 11.7, 12.5, 13.4, 14.4, 14.5, 15.7, 15.8, K.3, K.4, L.5, M.4, N.3, O.3, P.3, Q.2, R.3, S.3, T.3, T.4, U.3, U.4, U.5, U.6, U.7, U.8

*(See original document above for full descriptions of each.)*

---

# ═══════════════════════════════════════════════════════
# LOW BUGS — NEW (24 found in deep audit)
# ═══════════════════════════════════════════════════════

### NEW-L1 — EndOfSessionScreen Shows Stats But Doesn't Persist to Server
**File:** `src/components/rep/DialerCore.tsx`
**Problem:** Session summary stats are client-side only. When rep clicks "Back to Dashboard", stats vanish. The DialerSessionNew record may have zeros for all stat fields.
**Fix:** On session end, POST final stats to `/api/dialer/session/end` with counts. (~10 min)

### NEW-L2 — handleSkip Silent Catch
**File:** `src/components/rep/DialerCore.tsx`
**Problem:** Skip failure shows toast but doesn't retry or rollback queue position.
**Fix:** On failure, keep current index and show retry option. (~5 min)

### NEW-L3 — Multiple `catch(() => {})` Patterns Across Codebase
**Files:** Multiple API routes, DialerCore, worker
**Problem:** Pattern like `await prisma.lead.update(...).catch(() => {})` suppresses all errors including schema violations and connection failures.
**Fix:** At minimum log: `.catch(err => console.error('Non-critical update failed:', err))`. (~20 min for audit)

### NEW-L4 — Part-Time Dialer Defaults to Single Mode But Mode Toggle Visible
**File:** `src/components/rep/DialerCore.tsx`
**Problem:** `isPartTime ? 'single' : 'power'` sets default, but `!isPartTime && (mode toggle)` hides toggle for part-time. Correct behavior, but the `dialerMode` state is still used in auto-dial logic. Verify single mode prevents auto-dial.
**Fix:** Verify and add test. (~5 min)

### NEW-L5 — callbackDate/callbackTime UI Not Timezone-Aware
**File:** `src/components/rep/DialerCore.tsx`
**Problem:** Callback date/time input is naive (no timezone). If rep is in EST and lead is in PST, callback fires at wrong time.
**Fix:** Store callback in lead's timezone. (~10 min)

### NEW-L6 — Session Cookie Secure Flag May Block Local Development
**File:** `src/app/api/auth/simple-login/route.ts`
**Problem:** `secure: true` on cookie. On localhost (http, not https), cookie won't be set.
**Fix:** Set `secure: process.env.NODE_ENV === 'production'`. (~2 min)

### NEW-L7 — Dialer Queue Returns All Matching Leads — No Pagination
**File:** `src/app/api/dialer/queue/route.ts`
**Problem:** Returns all leads matching criteria. Rep with 500 assigned leads gets all 500 loaded.
**Fix:** Add limit (50-100) with "load more" support. (~10 min)

### NEW-L8 — Preview Track API Logs All Events Including Bot Traffic
**File:** `src/app/api/preview/track/route.ts`
**Problem:** No bot/crawler detection. Google bot visiting preview = fake analytics = false hot lead detection.
**Fix:** Check user-agent for known bots. Skip analytics for bots. (~10 min)

### NEW-L9 — Commission Amount Uses Float — Precision Issues
**File:** `prisma/schema.prisma`
**Problem:** `amount Float` — floating point math causes rounding errors. $0.10 + $0.20 might equal $0.30000000000000004.
**Fix:** Use `Decimal` type or store in cents as Int. (~15 min — schema change)

### NEW-L10 — Revenue Amount Also Uses Float
**File:** `prisma/schema.prisma`
**Fix:** Same as NEW-L9. (~5 min — combine with L9)

### NEW-L11 — API Test Routes Are Public in Production
**File:** `src/middleware.ts`
**Problem:** `/api/test/*` routes are public. If test routes exist that modify data, this is a risk.
**Fix:** Remove test routes in production or add auth. (~5 min)

### NEW-L12 — Lead Events Don't Capture IP/User-Agent
**File:** Various event creation points
**Problem:** LeadEvent records don't include source metadata (IP, user-agent, referrer).
**Fix:** Add optional metadata fields and populate where available. (~10 min)

### NEW-L13 — Notification Bell Count Doesn't Filter by User
**Problem:** Admin notifications and rep notifications may be mixed in the bell count.
**Fix:** Filter notifications by `userId` or `role`. (~10 min)

### NEW-L14 — Build Queue SiteBuildCard No Loading State for Approve/Publish
**File:** `src/app/admin/build-queue/page.tsx`
**Problem:** `handleApprove` and `handlePublish` have loading states but the UI doesn't disable other buttons while processing. Admin could approve AND publish simultaneously.
**Fix:** Disable all action buttons when any action is processing. (~5 min)

### NEW-L15 — Stripe Connect Status Update No Error Handling
**File:** `src/app/api/webhooks/stripe/route.ts`
**Problem:** `account.updated` case updates user's `stripeConnectStatus` but the ternary logic: `(account.requirements?.errors?.length ?? 0) > 0` → 'restricted'. Doesn't handle `account.requirements?.disabled_reason`.
**Fix:** Add more comprehensive Connect status mapping. (~10 min)

### NEW-L16 — API Cost Tracking Catches and Suppresses
**File:** `src/lib/close-engine-processor.ts`
**Problem:** `await prisma.apiCost.create(...).catch(() => {})` — if ApiCost table has issues, all cost tracking silently fails.
**Fix:** Log the error: `.catch(err => console.warn('ApiCost tracking failed:', err))`. (~2 min)

### NEW-L17 — Close Engine containsPaymentUrl Check Is Regex-Based
**File:** `src/lib/close-engine-processor.ts`
**Problem:** `containsPaymentUrl()` uses pattern matching to detect Stripe URLs in AI output. If Stripe changes URL format, the check misses it.
**Fix:** Also check for common payment patterns: "checkout.stripe.com", "pay.stripe.com", etc. (~5 min)

### NEW-L18 — Rep Stripe Return Page Has No Auto-Detection
**File:** `src/app/reps/stripe-return/page.tsx`
**Problem:** Page says "The wizard will automatically detect your connection" but there's no polling mechanism on this page. Rep must manually navigate back.
**Fix:** Add polling to check Stripe Connect status, then auto-redirect. (~15 min)

### NEW-L19 — System Test Endpoint Creates Temporary Redis Connections
**File:** `src/app/api/admin/system-test/route.ts`
**Problem:** Same as NEW-M10 — creates Redis connections for testing that may not be cleaned up on error.
**Fix:** Wrap in try/finally. (~5 min)

### NEW-L20 — Enrichment Worker No Rate Limiting for SerpAPI
**File:** `src/worker/index.ts`
**Problem:** If 100 leads imported simultaneously, 100 SerpAPI calls fire at once. SerpAPI has rate limits.
**Fix:** Add concurrency limit on enrichment worker or BullMQ rate limiting. (~10 min)

### NEW-L21 — Preview Page No robots.txt / noindex (CONFIRMED STILL MISSING)
**Fix:** Add `<meta name="robots" content="noindex">` to preview pages. (~2 min)

### NEW-L22 — Lead Phone No Unique Constraint Allows Duplicates
**File:** `prisma/schema.prisma`
**Problem:** Two leads with same phone number → AI responds to the wrong conversation.
**Fix:** Add unique constraint or dedup logic on import. (~10 min)

### NEW-L23 — Webhook Failed Retry Table Not Actually Used for Retries
**File:** `prisma/schema.prisma`
**Problem:** `FailedWebhook` model exists but no code actually retries failed webhooks.
**Fix:** Add a worker job that retries failed webhooks. (~20 min)

### NEW-L24 — Admin Dashboard Hot Leads Hard Limit of 5
**Problem:** Only shows 5 hot leads. If there are 20, admin misses 15.
**Fix:** Add "View All" link or increase limit. (~5 min)

---

# ═══════════════════════════════════════════════════════
# CROSS-CUTTING PATTERNS (Updated)
# ═══════════════════════════════════════════════════════

## PATTERN 1: setTimeout on Serverless (CRITICAL — 5 instances)
All of these will silently drop messages:
| File | Function | Line Pattern |
|------|----------|-------------|
| `close-engine-processor.ts` | `processCloseEngineFirstMessage` | `setTimeout(async () => { await sendCloseEngineMessage(...) }, delay * 1000)` |
| `close-engine-processor.ts` | `processCloseEngineInbound` (normal) | `setTimeout(async () => { await sendCloseEngineMessage(...) }, delay * 1000)` |
| `close-engine-processor.ts` | `processCloseEngineInbound` (payment) | `setTimeout(async () => { await sendCloseEngineMessage(...) }, delay * 1000)` |
| `post-client-engine.ts` | `processPostClientInbound` | `setTimeout(async () => { await sendSMSViaProvider(...) }, delay * 1000)` |
| `post-client-engine.ts` | Edit confirmation reply | `setTimeout(async () => { await sendSMSViaProvider(...) }, delay * 1000)` |

**Fix ALL at once:** Create `send-delayed-message` BullMQ job type. Replace all 5 setTimeouts.

## PATTERN 2: Fake Client-Side IDs (CRITICAL — 3 instances)
| File | What | Pattern |
|------|------|---------|
| `DialerCore.tsx` | Session ID | `session-${Date.now()}` |
| `DialerCore.tsx` | Call ID (disposition) | `activeCallId \|\| \`call-${Date.now()}\`` |
| `DialerCore.tsx` | Call ID (dial) | `setActiveCallId(\`call-${Date.now()}\`)` |

**Fix ALL at once:** Never use client-generated IDs for server records. Require server-side creation first.

## PATTERN 3: Anthropic Client Singletons (MEDIUM — 3 instances)
| File | Variable | Has Invalidation? |
|------|----------|--------------------|
| `close-engine-processor.ts` | `anthropicClient` | ✅ Yes |
| `post-client-engine.ts` | `_anthropicClient` | ❌ No |
| `edit-confirmation-handler.ts` | `_anthropicClient` | ❌ No |

**Fix ALL at once:** Extract to shared `src/lib/anthropic.ts`.

## PATTERN 4: Silent Error Suppression (MEDIUM — 20+ instances)
Pattern: `}).catch(() => {})` or `} catch { /* silent */ }`
**Fix:** Global audit. Replace with `.catch(err => console.warn(...))` minimum.

## PATTERN 5: Rep Assignment Field Mismatch (MEDIUM — confirmed)
- `lead.assignedToId` — CSV import
- `lead.ownerRepId` — dialer
- Used inconsistently in: commissions.ts, stripe webhook, dialer queue, earnings pages
**Fix:** Standardize on `ownerRepId || assignedToId` everywhere.

## PATTERN 6: Commission Status Flow Mismatch (CRITICAL — confirmed)
- Creates as PENDING → nothing sets APPROVED → markCommissionPaid → PAID
- Frontend filters APPROVED || PAID → shows $0
- Backend summary includes PENDING → numbers don't match
**Fix in:** Both earnings pages, commissions.ts summary function.

---

# ═══════════════════════════════════════════════════════
# FILES MOST AFFECTED (Updated — fix these, fix most bugs)
# ═══════════════════════════════════════════════════════

| File | Bug Count | Priority |
|------|-----------|----------|
| `src/lib/close-engine-processor.ts` | 12 | Fix first — setTimeout, parsing, DNC, costs |
| `src/components/rep/DialerCore.tsx` | 14 | Fix second — fake IDs, silent catches, stats |
| `src/app/api/webhooks/stripe/route.ts` | 9 | Fix third — idempotency, retries, Connect |
| `src/lib/post-client-engine.ts` | 5 | Fix fourth — setTimeout, DNC, AI client |
| `src/lib/commissions.ts` | 5 | Quick wins — filter fix, summary fix |
| `src/app/reps/earnings/page.tsx` | 3 | Quick win — $0.00 display fix |
| `src/app/part-time/earnings/page.tsx` | 3 | Quick win — same fix |
| `src/worker/index.ts` | 8 | Infrastructure — DNS retry, dedup, health |
| `src/lib/edit-request-handler.ts` | 5 | Editor bugs |
| `src/components/site-editor/SiteEditorClient.tsx` | 4 | Regenerate data loss, save conflicts |
| `src/components/site-editor/SiteEditorPanel.tsx` | 3 | Save conflicts |
| `src/app/preview/[id]/page.tsx` | 4 | XSS, robots, bot filtering |
| `src/app/admin/build-queue/page.tsx` | 5 | Rebuild backup, polling, UI states |
| `src/lib/dialer-scoring.ts` | 1 | Critical — deprecated model |
| `src/lib/edit-confirmation-handler.ts` | 2 | Timeout, shared client |
| `src/lib/onboarding.ts` | 2 | Step validation, centralization |
| `prisma/schema.prisma` | 8 | Float precision, old models, constraints |
| `src/middleware.ts` | 3 | Test routes, rate limiting |
| `src/app/api/auth/simple-login/route.ts` | 2 | Cookie security, session refresh |

---

# ═══════════════════════════════════════════════════════
# SCENARIO WALKTHROUGH: End-to-End Bug Impact
# ═══════════════════════════════════════════════════════

## Scenario 1: Lead Texts "I'm interested" → Payment → Client

1. Twilio webhook receives SMS ✅
2. DNC check on lead ✅
3. Close Engine processes inbound ✅
4. Claude generates response ✅
5. **setTimeout fires to send reply** ❌ BUG 8.1 — may drop on serverless
6. Stage transitions to QUALIFYING ✅
7. Lead provides info → COLLECTING_INFO → BUILDING ✅
8. Site built, preview sent ✅
9. Lead approves → PAYMENT_SENT ✅
10. **Payment link may arrive BEFORE context message** ❌ NEW-C9
11. Lead pays via Stripe checkout ✅
12. **Webhook fires → handleCheckoutCompleted** ⚠️ NEW-C6 — no idempotency
13. **Client created with assignedToId instead of ownerRepId** ❌ NEW-M23
14. **Revenue created without stripePaymentId** ❌ NEW-C7
15. **Commission created with non-null assertion on repId** ❌ NEW-C15
16. **Commission status = PENDING, frontend filters APPROVED || PAID** ❌ BUG 12.1
17. Rep sees $0.00 earnings ❌

## Scenario 2: Client Requests Edit After Launch

1. Client texts "can you make the header blue?" ✅
2. Post-client engine processes ✅
3. **No DNC check on client** ❌ NEW-C3
4. AI classifies as EDIT_REQUEST ✅
5. EditRequest created ✅
6. **handleEditRequest fires, AI applies edit** ✅
7. **setTimeout for confirmation message** ❌ NEW-C1 — may drop
8. Client never gets confirmation, texts again
9. **Second edit fires while first still processing** ❌ BUG B.1 — no locking
10. **Second edit overwrites first** ❌
11. **Admin opens SiteEditorPanel while AI edit active** ❌ NEW-C18

## Scenario 3: Rep Dials Through Queue

1. Rep starts session ✅... or **offline mode with fake ID** ❌ BUG 10.2
2. Rep dials lead ✅
3. **45-second safety timeout resets UI but not server** ❌ NEW-C11
4. Rep connects ✅... or **handleConnect fires without server verification** ❌ NEW-M3
5. Rep logs disposition ✅
6. **Disposition uses fake callId if activeCallId null** ❌ NEW-C5
7. **Auto-dial fires before disposition API completes** ❌ NEW-M7
8. **Session stats are client-side only, lost on refresh** ❌ NEW-M4
9. Session ends → summary shows ✅
10. **Stats not persisted to server** ❌ NEW-L1

---

## HOW TO USE THIS FILE

1. **Check CORRECTIONS first** — skip bugs already fixed
2. **Fix REVISED TOP 15** — highest impact combination of old + new
3. **Fix by PATTERN** — patterns 1-6 fix multiple bugs at once
4. **Fix by FILE** — work through files most affected table
5. **Run SCENARIOS** — verify end-to-end after fixes
6. **Then MEDIUM → LOW** in priority order
7. **After fixing each bug**, run relevant test from AUDIT_PROMPT_v2.md checklist

---

## ESTIMATED EFFORT

| Category | Count | Est. Hours |
|----------|-------|------------|
| CRITICAL (original remaining) | 39 | ~13 hrs |
| CRITICAL (new) | 18 | ~4 hrs |
| MEDIUM (original) | 74 | ~17 hrs |
| MEDIUM (new) | 31 | ~6 hrs |
| LOW (original) | 62 | ~8 hrs |
| LOW (new) | 24 | ~4 hrs |
| **TOTAL** | **248** | **~52 hrs** |

**Recommended sprint plan:**
- **Day 1-2:** All CRITICAL bugs (~17 hrs) — fixes by pattern
- **Day 3-4:** All MEDIUM bugs (~23 hrs) — fixes by file
- **Day 5:** All LOW bugs (~12 hrs) + end-to-end scenario testing
