
# BUTTON TEST AUDIT — FINAL DIAGNOSTIC REPORT
## Bright Automations Platform
## Date: 2026-02-23

---

# SECTION 1: SYSTEM MAP

| Category | Count |
|----------|-------|
| Total pages | 49 |
| Total API routes | 250+ |
| Total lib/service files | 64 |
| Total components | 83 |
| Total Prisma models | 48 |
| Total enums | 24 |
| Total env vars | 40+ |
| Total workers/queues | 8 queues + 1 Instantly queue |
| Total hooks | 5 |
| Total test files | 4 |

---

# SECTION 2: BREAK SUMMARY

| Severity | Count | Description |
|----------|-------|-------------|
| **CRITICAL** | 8 | System literally doesn't work / security vulnerability |
| **HIGH** | 14 | Data loss, silent failures, wrong data shown |
| **MEDIUM** | 18 | Degraded experience, missing validation |
| **LOW** | 12 | Cosmetic, minor inconsistency, tech debt |
| **TOTAL** | **52** | |

---

# SECTION 3: CRITICAL BREAKS

## BREAK C-1: Email DNC Bypass — All Email Paths Skip DNC Check

**CHAIN:** Lead marked DNC → Worker sends email → `sendEmail()` in `resend.ts` → No DNC check → Email delivered to DNC contact
**FILES:** `src/lib/resend.ts:48`, `src/lib/channel-router.ts:356`, `src/worker/index.ts` (13+ sendEmail calls at lines 883-1185)
**CAUSE:** `sendEmail()` has a duplicate-send guard but zero DNC checking. Only `sendSMSViaProvider()` has the DNC check.
**IMPACT:** DNC contacts receive onboarding emails, payment follow-ups, win-back emails, nudge emails, post-launch day 3/7/14/21/28 emails — any email-only path bypasses DNC.
**PATTERN:** Pattern G — Missing DNC Checks
**EVIDENCE:**
```typescript
// src/lib/resend.ts:48 — sendEmail() function
// NO isDNC() call anywhere in this function
// Contrast with src/lib/sms-provider.ts:88 which calls isDNC() before every send
```

---

## BREAK C-2: Instantly Webhook — Zero Authentication

**CHAIN:** External actor → `POST /api/webhooks/instantly` → No signature verification → Payload processed as legitimate
**FILES:** `src/app/api/webhooks/instantly/route.ts:14-15`
**CAUSE:** Comment says "Instantly may not require it" and the code processes all incoming webhooks without any verification.
**IMPACT:** Anyone can POST to this endpoint and trigger webhook handling, potentially manipulating lead data or campaign states.
**PATTERN:** Pattern H — Security vulnerability
**EVIDENCE:**
```typescript
// src/app/api/webhooks/instantly/route.ts:14-15
// No authentication or signature verification of any kind
```

---

## BREAK C-3: Test Pipeline Endpoint — No Authentication, Consumes Paid API Credits

**CHAIN:** External actor → `POST /api/test/pipeline` → No auth → Runs SerpAPI enrichment + Anthropic AI → Consumes paid credits
**FILES:** `src/app/api/test/pipeline/route.ts`
**CAUSE:** Unlike other test endpoints that check a test token, this endpoint has NO authentication whatsoever.
**IMPACT:** Anyone can trigger enrichment/preview/personalization for any leadId, consuming SerpAPI and Anthropic API credits.
**PATTERN:** Pattern E — Orphaned/exposed test code
**DEPENDS:** Also affects C-4 (all test endpoints share the same static token)

---

## BREAK C-4: 11 Test Endpoints in Production with Hardcoded Static Token

**CHAIN:** External actor → guesses token `e2e-test-live-pipeline-2026` → Full access to test endpoints → Can create leads, force queue jobs, expose env status
**FILES:** `src/app/api/test/*/route.ts` (11 files)
**CAUSE:** Test token is a hardcoded string literal, not an environment variable. Same token across all endpoints. Two endpoints (`/api/test/simple`, `/api/test/pipeline`) have no token check at all.
**IMPACT:** If token is discovered, attacker can: create leads in prod DB, add jobs to production queues, run enrichment consuming paid API credits, expose whether env vars are set.
**PATTERN:** Pattern E — Orphaned/exposed test code

---

## BREAK C-5: Multiple Anthropic Client Instances — Config Drift & Key Invalidation Failure

**CHAIN:** Admin changes API key → `registerClientInvalidator()` resets main singleton → 7 other instances keep using old key → API calls fail silently or use wrong key
**FILES:** `src/lib/retention-messages.ts:4`, `src/lib/rep-scripts.ts:11`, `src/lib/personalization.ts:13`, `src/lib/channel-router.ts:177`, `src/lib/serper.ts:419`, `src/lib/ai-site-editor.ts:18`, `src/app/api/build-queue/[id]/edit/route.ts:13`
**CAUSE:** 7 separate `new Anthropic()` instances instead of using shared `getAnthropicClient()` from `anthropic.ts`.
**IMPACT:** After admin API key change: retention messages, personalization, rep scripts, channel routing, AI site editing, and build queue edits all fail until server restart. Import-time initialization (3 files) also breaks serverless cold starts.
**PATTERN:** Pattern — Multiple singleton instances

---

## BREAK C-6: DNC Check Fail-Open Design

**CHAIN:** DNC check function throws error → `catch` block logs error → SMS is sent anyway to DNC contact
**FILES:** `src/lib/sms-provider.ts:94-96`
**CAUSE:** If the DNC check itself fails (database error, timeout), the code allows the send: `console.error('[SMS] DNC check failed, allowing send:', dncErr)`
**IMPACT:** During database outages or high load, DNC contacts receive messages that should have been blocked.
**PATTERN:** Pattern G — Missing DNC Checks (fail-open)
**EVIDENCE:**
```typescript
// src/lib/sms-provider.ts:94-96
} catch (dncErr) {
  console.error('[SMS] DNC check failed, allowing send:', dncErr)
}
```

---

## BREAK C-7: Message Batcher — In-Memory setTimeout Will Lose Messages on Serverless

**CHAIN:** Inbound message arrives → `message-batcher.ts` batches with setTimeout → Server process killed → Batched messages lost forever
**FILES:** `src/lib/message-batcher.ts:205,216`
**CAUSE:** Uses `setTimeout(() => processBatch(...), settings.batchWindowMs)` to batch rapid-fire inbound messages. Works only on Railway persistent process. Migration to Vercel/serverless would silently lose all batched messages.
**IMPACT:** Currently safe on Railway, but a deployment platform change would cause silent message loss.
**PATTERN:** Pattern A — setTimeout on Serverless
**EVIDENCE:**
```typescript
// src/lib/message-batcher.ts:205
setTimeout(() => processBatch(...), settings.batchWindowMs)
// Comment at line 15: "This works because Railway runs a persistent Node process"
```

---

## BREAK C-8: Stripe Webhook Returns 200 on Application Errors — Prevents Retries

**CHAIN:** Stripe sends webhook → App has transient DB error → Returns 200 to prevent retries → Payment/commission never recorded
**FILES:** `src/app/api/webhooks/stripe/route.ts:100-101`
**CAUSE:** Comment says "Return 200 so Stripe does not retry." This is intentional to prevent infinite retries, but also means transient failures (DB timeout, connection error) are never retried.
**IMPACT:** During DB outages, payments are received by Stripe but never recorded in the system. Clients pay but don't get onboarded. Commissions never created.
**PATTERN:** Pattern B — Silent error handling

---

# SECTION 4: HIGH BREAKS

## BREAK H-1: Dialer Dual Implementation Risk

**CHAIN:** Rep opens dialer → System loads EITHER `DialerCore.tsx` (legacy monolith, 2180 lines) OR `DialerProvider.tsx` + modular components → Different API endpoints, different features
**FILES:** `src/components/rep/DialerCore.tsx`, `src/components/dialer/DialerProvider.tsx`
**CAUSE:** Two complete dialer implementations exist. The legacy `DialerCore` calls `/api/dialer/log` for dispositions; the new modular system calls `/api/dialer/disposition`. Different endpoint, different data shapes.
**IMPACT:** If the wrong implementation is loaded, dispositions may be logged incorrectly or not at all. Features like VM drop, manual dial, and inbound call handling differ between implementations.
**PATTERN:** Orphaned/duplicated code

---

## BREAK H-2: Dialer Calls `/api/dialer/hangup` — Route Does Not Exist

**CHAIN:** Rep clicks Hangup → `DialerCore.tsx:1636` → `POST /api/dialer/hangup` → 404
**FILES:** `src/components/rep/DialerCore.tsx:1636`, `src/app/api/dialer/call/end/route.ts`
**CAUSE:** Legacy dialer calls `/api/dialer/hangup` but the actual route is at `/api/dialer/call/end`. The new modular dialer correctly calls `/api/dialer/call/end`.
**IMPACT:** If legacy dialer is active, hangup button fails silently (error caught, toast shown). Call continues.
**PATTERN:** Orphaned/mismatched API endpoints

---

## BREAK H-3: Dialer Calls `/api/dialer/skip` and `/api/dialer/log` — Routes May Not Exist

**CHAIN:** Rep clicks Skip → `DialerCore.tsx:1668` → `POST /api/dialer/skip` → 404
**FILES:** `src/components/rep/DialerCore.tsx:1668,1734`
**CAUSE:** Legacy dialer calls `/api/dialer/skip` and `/api/dialer/log` which may not have matching route files. The new system uses `/api/dialer/disposition`.
**IMPACT:** Skip and disposition logging may fail in legacy dialer mode.

---

## BREAK H-4: Admin Bulk Action Buttons — Dead Handlers

**CHAIN:** Admin selects clients → clicks "Send Upsell" / "Send Stat Report" / "Change Tags" → Nothing happens
**FILES:** `src/app/admin/clients/page.tsx`
**CAUSE:** Buttons render in the UI but have no click handlers attached.
**IMPACT:** Admin sees functional-looking buttons that do nothing when clicked.
**PATTERN:** Orphaned UI elements

---

## BREAK H-5: Twilio Inbound SMS — No Idempotency

**CHAIN:** Twilio sends SMS webhook → App processes → App slow to respond → Twilio retries → Duplicate message record created
**FILES:** `src/app/api/webhooks/twilio/route.ts`
**CAUSE:** No dedup on `message.create()`. The `twilioSid` field exists and has `@unique` but is not always set for inbound messages.
**IMPACT:** Duplicate inbound messages in the system, potentially triggering duplicate AI responses.
**PATTERN:** Pattern H — Race conditions / missing idempotency

---

## BREAK H-6: Twilio Inbound Voice — Duplicate DialerCall Records

**CHAIN:** Inbound call webhook → Create DialerCall → Twilio retries → Another DialerCall created
**FILES:** `src/app/api/webhooks/twilio-inbound-voice/route.ts:53-64`
**CAUSE:** No dedup on `DialerCall.create()` for inbound calls.
**IMPACT:** Duplicate call records in rep's call history, inflated call stats.
**PATTERN:** Pattern H — Race conditions / missing idempotency

---

## BREAK H-7: Multiple Twilio Client Instances — Import-Time Initialization

**CHAIN:** `monitoring.ts` and `digest-reports.ts` create Twilio clients at module import → Serverless cold start → Unnecessary initialization → No credential invalidation
**FILES:** `src/lib/monitoring.ts:10`, `src/lib/digest-reports.ts:13`, `src/lib/providers/twilio.ts:20`
**CAUSE:** 4-5 separate Twilio instances outside the main singleton. Import-time creation breaks serverless.
**IMPACT:** Stale credentials after key rotation, unnecessary cold start latency.
**PATTERN:** Multiple singleton instances

---

## BREAK H-8: Stripe Dual Singletons

**CHAIN:** Webhook handler creates separate `_stripeInstance` → `stripe.ts` has `_stripe` → Two different Stripe clients
**FILES:** `src/app/api/webhooks/stripe/route.ts:20`, `src/lib/stripe.ts:5`
**CAUSE:** Webhook route has its own lazy singleton instead of using shared `getStripe()`.
**IMPACT:** Config drift potential, though currently both use same API version.

---

## BREAK H-9: Session Secret Hardcoded Placeholder

**CHAIN:** `SESSION_SECRET` not set → Fallback to `'build-placeholder-do-not-use-in-production'` → Sessions signed with known key
**FILES:** `src/lib/session.ts:1`
**CAUSE:** Placeholder fallback masks missing config. Has runtime validation but only at function call time.
**IMPACT:** If env var missing, all sessions use a publicly known signing key.
**PATTERN:** Pattern D — Hardcoded values

---

## BREAK H-10: Distribution Overwrites Lead Status

**CHAIN:** Lead at HOT_LEAD/QUALIFIED → Distribution runs → Status set to 'BUILDING' → Original status lost
**FILES:** `src/lib/distribution.ts:129-134`
**CAUSE:** Distribution unconditionally sets `status: 'BUILDING'` regardless of current status.
**IMPACT:** HOT_LEAD or QUALIFIED leads lose their status and appear as BUILDING in the admin dashboard.

---

## BREAK H-11: CLAWDBOT_WEBHOOK_SECRET Inconsistent Fallback

**CHAIN:** Secret not set → `webhook-dispatcher.ts` uses `'dev-secret'` → `webhooks/clawdbot/route.ts` has no fallback → Signature mismatch → All Clawdbot webhooks rejected
**FILES:** `src/lib/webhook-dispatcher.ts:41`, `src/app/api/webhooks/clawdbot/route.ts:11`
**CAUSE:** Dispatcher has `|| 'dev-secret'` fallback, route handler has none. Different behavior when env var is missing.
**IMPACT:** Clawdbot webhook dispatches and verifications use different secrets.

---

## BREAK H-12: Clawdbot Webhook Handlers Are Stubs

**CHAIN:** Clawdbot sends `lead.imported` / `payment.received` / `client.question` / `daily.digest_requested` → Handler runs → TODO comments → No actual functionality
**FILES:** `src/app/api/webhooks/clawdbot/route.ts` (lines 84, 111, 128-129, 141, 170-174)
**CAUSE:** Handler functions have TODO comments with minimal/no actual implementation.
**IMPACT:** These webhook events are received but effectively dropped.

---

## BREAK H-13: Revenue/Transactions Returns Empty Array on Error

**CHAIN:** Database error → `catch {}` → Returns `{ transactions: [] }` with 200 status → User sees "no transactions"
**FILES:** `src/app/api/revenue/transactions/route.ts:14`
**CAUSE:** Empty catch returns success with empty data instead of error.
**IMPACT:** During DB issues, admin sees no revenue data with no indication of error.
**PATTERN:** Pattern B — Silent catch blocks

---

## BREAK H-14: Post-Client Engine Partial DNC Check

**CHAIN:** Client's lead marked DNC → Post-client engine checks `client.lead.dncAt` → Does NOT call `isDNC()` → Misses system-wide DoNotCall table entries
**FILES:** `src/lib/post-client-engine.ts:39`
**CAUSE:** Only checks the lead's own `dncAt` field, not the centralized `isDNC()` function.
**IMPACT:** If a phone is in the DoNotCall table but the specific lead's `dncAt` isn't set, messages still send.

---

# SECTION 5: MEDIUM + LOW BREAKS

| # | Severity | Action | Break Point | Pattern | Files |
|---|----------|--------|-------------|---------|-------|
| M-1 | MEDIUM | Part-time has no onboarding page | `/reps/onboarding` exists, `/part-time/onboarding` missing | Feature gap | N/A |
| M-2 | MEDIUM | Part-time stripe-return has no status polling | Reps version polls every 5s + auto-redirect, PT is static | Feature gap | `src/app/part-time/stripe-return/page.tsx` |
| M-3 | MEDIUM | Part-time dashboard has no auto-refresh | Reps has 60s auto-refresh, PT loads once | Feature gap | `src/app/part-time/page.tsx` |
| M-4 | MEDIUM | Leaderboard and Tasks pages copy-pasted | Identical code in `/reps` and `/part-time` instead of shared | Tech debt | Both leaderboard and tasks pages |
| M-5 | MEDIUM | Part-time leaderboard fetches `role=REP` | May exclude part-time reps if they have different role | Data display | `src/app/part-time/leaderboard/page.tsx:39` |
| M-6 | MEDIUM | Admin settings auto-fires WRITE ops on mount | Price corrections and product seeding run as mount side effects | Unexpected writes | `CompanyTab.tsx` |
| M-7 | MEDIUM | Dialer monitor: Listen/Whisper/Barge disabled | Buttons present but disabled pending Twilio Conference API | Feature gap | `src/app/admin/dialer-monitor/page.tsx` |
| M-8 | MEDIUM | No dead letter queue for BullMQ | Failed jobs after max retries stay in failed state with no alerting | No alerting | `src/worker/queue.ts`, `src/worker/index.ts` |
| M-9 | MEDIUM | Worker pipeline chain uses events, not dependencies | If worker crashes between job completion and `on('completed')`, chain breaks | Race condition | `src/worker/index.ts:207-270` |
| M-10 | MEDIUM | REDIS_URL inconsistent fallbacks across files | Some use `|| 'redis://localhost:6379'`, some use `!` assertion, some conditional | Config drift | 10+ files |
| M-11 | MEDIUM | BASE_URL vs NEXT_PUBLIC_APP_URL confusion | Different files check different env vars with different fallback domains | Config drift | 8+ files |
| M-12 | MEDIUM | `customer.subscription.updated` not handled by Stripe webhook | Plan changes/downgrades go unprocessed | Missing handler | `src/app/api/webhooks/stripe/route.ts:93` |
| M-13 | MEDIUM | Instantly worker job handlers are stubs | `midday_health_check`, `webhook_reconciliation`, `nightly_reconciliation` just log | Missing functionality | `src/worker/instantly-jobs.ts:129-144` |
| M-14 | MEDIUM | AMD `unknown` result treated as human | Could miss voicemail detection | Edge case | `src/app/api/webhooks/twilio-amd/route.ts` |
| M-15 | MEDIUM | 6 enum bypass casts with `as any` | `industry as any`, `source as any` bypass Prisma validation — invalid values crash at DB | Type safety | 6 files |
| M-16 | MEDIUM | Close-engine-payment.ts silent catch on admin SMS | Admin never notified client wants to pay | Pattern B | `src/lib/close-engine-payment.ts:164` |
| M-17 | MEDIUM | Dialer session stat update silently dropped | `.catch(() => {})` on voicemail/noAnswer increment | Pattern B | `src/lib/dialer-service.ts:800` |
| M-18 | MEDIUM | Serper lead website URL update silently dropped | `.catch(() => {})` on website URL save | Pattern B | `src/lib/serper.ts:564` |
| L-1 | LOW | STRIPE_SECRET_KEY has build-time placeholder | `'build-placeholder-do-not-use-in-production'` masks missing config until runtime | Pattern D | `src/lib/stripe.ts:16` |
| L-2 | LOW | 7 env vars in .env.example never read in code | TWILIO_API_KEY_*, TWILIO_TWIML_APP_SID, STRIPE_WEBHOOK_SECRET, etc. | Dead config | `.env.example` |
| L-3 | LOW | Resend webhook verification only in production | Dev mode accepts all webhook requests without Svix verification | Dev-only | `src/app/api/webhooks/resend/route.ts:31` |
| L-4 | LOW | `ownerRepId || assignedToId` coalescence in 6+ places | Should be centralized utility function | Pattern F | Multiple files |
| L-5 | LOW | EditRequest/UpsellPitch use lowercase status, Lead uses UPPERCASE | Not a bug but confusing — `'new'` vs `'NEW'`, `'paid'` vs `'PAID'` | Pattern F | Schema + query files |
| L-6 | LOW | Priority field mixes engagement (HOT/WARM/COLD) and task (HIGH/MEDIUM/LOW) systems | Dead code branches in UI for values that never appear on leads | Pattern F | `src/components/dialer/LeadInfo.tsx` |
| L-7 | LOW | Pricing ($188/$39/$149) hardcoded in 8+ locations as fallbacks | AI instruction strings in `defaults.ts` never update dynamically | Pattern D | Multiple files |
| L-8 | LOW | 2 fallback domains: `preview.brightautomations.org` and `app.brightautomations.net` | Inconsistent fallback URLs across files | Pattern D | 8 files |
| L-9 | LOW | Anthropic token cost hardcoded at `0.0000008` | Will be wrong if API pricing changes | Pattern D | `src/lib/retention-messages.ts:163` |
| L-10 | LOW | SerpAPI cost hardcoded at `0.002` per call | Will be wrong if pricing changes | Pattern D | `src/lib/serpapi.ts:117` |
| L-11 | LOW | 30+ `as any` casts on Prisma Json fields | Need shared type definitions for metadata/settings structures | Pattern C | 27+ files |
| L-12 | LOW | Admin cleanup endpoint has hardcoded email addresses | `admin@brightautomations.net` and `andrew@brightautomations.net` | Pattern D | `src/app/api/admin/cleanup-database/route.ts:31-32` |

---

# SECTION 6: PATTERN ANALYSIS

## Pattern A: setTimeout on Serverless
**INSTANCES:** 50+ total (3 critical, rest safe)
**CRITICAL FILES:** `src/lib/message-batcher.ts` (in-memory batching), `src/app/api/auth/simple-login/route.ts` (fire-and-forget password migration), `src/app/api/test/direct-process/route.ts` (BullMQ worker inside API route)
**FIX STRATEGY:** Replace message batcher setTimeout with BullMQ delayed jobs. Move password migration to a separate endpoint. Remove test endpoints from production.

## Pattern B: Silent Catch Blocks
**INSTANCES:** 36 total (6 completely empty, 15 comment-only, 15 return-defaults)
**CRITICAL FILES:** `src/lib/close-engine-payment.ts:164` (admin payment notification), `src/app/api/revenue/transactions/route.ts:14` (returns empty on error), `src/lib/dialer-service.ts:800` (stats silently dropped), `src/lib/serper.ts:564` (website URL dropped)
**FIX STRATEGY:** Add `console.error()` to all empty catches. Return error responses instead of empty data from API routes. Add structured error logging.

## Pattern C: Type Casts (`as any`)
**INSTANCES:** 56 total
**ROOT CAUSE:** Prisma `Json?` fields typed as `JsonValue` (27 instances), include-relation types too narrow (6 instances), enum bypass (6 instances), BullMQ type incompatibility (4 instances), UI dynamic access (13 instances)
**FIX STRATEGY:** Create shared interfaces for common Json structures (SettingsValue, LeadMetadata, EventMetadata). Use Prisma `validator` utility for typed Json fields. Add explicit generic types to include queries.

## Pattern D: Hardcoded Values
**INSTANCES:** 30+ across pricing, URLs, emails, API costs
**AFFECTED FILES:** 8+ files with pricing fallbacks, 8 files with URL fallbacks, 6 files with email addresses
**FIX STRATEGY:** Already mostly solved by `pricing-config.ts` — just need to remove hardcoded fallbacks from UI components and use the API-fetched values. Centralize URL config. Use env vars for all email addresses.

## Pattern E: Orphaned Code
**INSTANCES:** 11 test endpoints in production, ~7 unused env vars, legacy payment links, dead message-processor
**AFFECTED FILES:** `src/app/api/test/**`, `.env.example`, `src/lib/stripe.ts` (legacy links), `src/lib/message-processor.ts`
**FIX STRATEGY:** Delete test endpoints or gate behind NODE_ENV check. Remove unused env vars from .env.example. Remove legacy payment link constants from stripe.ts.

## Pattern F: Inconsistent Field Usage
**INSTANCES:** 6+ `ownerRepId||assignedToId` duplications, 3 different status casing conventions, mixed priority systems
**AFFECTED FILES:** `commissions.ts`, admin pages, `dialer-scoring.ts`, all status queries
**FIX STRATEGY:** Create `getLeadRepId(lead)` utility. Document status casing conventions per model. Remove dead priority branches.

## Pattern G: Missing DNC Checks
**INSTANCES:** 1 critical gap (email path), 1 partial check (post-client engine), 1 fail-open design
**AFFECTED FILES:** `src/lib/resend.ts`, `src/lib/post-client-engine.ts`, `src/lib/sms-provider.ts`
**FIX STRATEGY:** Add `isDNC()` check to `sendEmail()`. Change sms-provider fail-open to fail-closed. Use `isDNC()` instead of `lead.dncAt` in post-client engine.

## Pattern H: Race Conditions / Security
**INSTANCES:** 3 missing idempotency (Twilio SMS, Twilio voice, Clawdbot), 1 unauthenticated webhook (Instantly), worker chain event-based fragility
**AFFECTED FILES:** Twilio webhooks, Instantly webhook, worker index
**FIX STRATEGY:** Add `twilioSid` dedup to inbound SMS handler. Add signature verification to Instantly webhook. Consider using BullMQ flow dependencies instead of event-based chaining.

---

# SECTION 7: CROSS-SYSTEM FLOW STATUS

## Flow 4.1 — Lead Import Pipeline
**STATUS:** ⚠️ PARTIAL
**BREAKS IN CHAIN:** H-10 (distribution overwrites status), M-8 (no dead letter queue), M-9 (event-based chain fragility)
**BOTTLENECK:** M-9 — If any worker in the enrichment→preview→personalization→scripts→distribution chain crashes between job completion and the `on('completed')` event, the entire pipeline stalls for that lead with no alerting.

## Flow 4.2 — Close Engine: Inbound Message → AI Response
**STATUS:** ⚠️ PARTIAL
**BREAKS IN CHAIN:** C-1 (email DNC bypass), C-5 (multiple Anthropic instances), C-7 (message batcher setTimeout)
**BOTTLENECK:** C-1 — If the Close Engine falls back to email (SMS fails), the email is sent even to DNC contacts.

## Flow 4.3 — Payment Flow: Stripe Checkout → Client Creation
**STATUS:** ⚠️ PARTIAL
**BREAKS IN CHAIN:** C-8 (200 on error prevents retries), H-8 (dual Stripe singletons), M-12 (subscription.updated unhandled), M-16 (admin SMS notification silently swallowed)
**BOTTLENECK:** C-8 — If the DB is down when Stripe sends `checkout.session.completed`, the payment is never recorded and the webhook is never retried. Client paid but never onboarded.

## Flow 4.4 — Dialer Session: Start → Call → Disposition → Next Lead
**STATUS:** ⚠️ PARTIAL
**BREAKS IN CHAIN:** H-1 (dual implementation), H-2 (hangup calls wrong endpoint), H-3 (skip/log may 404), M-17 (session stats silently dropped)
**BOTTLENECK:** H-1 — Two complete dialer implementations exist with different API endpoints. If the legacy `DialerCore.tsx` is active, hangup and skip buttons call non-existent routes.

## Flow 4.5 — DNC Marking: Rep → System-Wide Block
**STATUS:** ⚠️ PARTIAL
**BREAKS IN CHAIN:** C-1 (emails bypass DNC), C-6 (SMS DNC fail-open), H-14 (post-client partial check)
**BOTTLENECK:** C-1 — DNC marking correctly blocks SMS (via `sendSMSViaProvider`) and calls (via `dialer-service.ts`), but emails have NO DNC check whatsoever. A DNC contact can still receive all email communications.

## Flow 4.6 — Commission Lifecycle: Creation → Display → Payout
**STATUS:** ✅ COMPLETE (with minor issues)
**BREAKS IN CHAIN:** None critical. Commission creation has good dedup (unique constraint on stripePaymentId). `getRepCommissionSummary` correctly counts PENDING+APPROVED for "Total Earned". Admin payouts page exists with export.
**BOTTLENECK:** L-4 — `ownerRepId || assignedToId` coalescence duplicated across commission calculation and display code.

## Flow 4.7 — Site Edit Flow: Client Request → AI Edit → Admin Review
**STATUS:** ⚠️ PARTIAL
**BREAKS IN CHAIN:** C-5 (AI site editor has its own Anthropic instance with different timeout), L-5 (EditRequest uses lowercase status)
**BOTTLENECK:** C-5 — `ai-site-editor.ts` has its own Anthropic singleton with 5-minute timeout that won't reset on API key change.

## Flow 4.8 — Webhook Integrity
**STATUS:** ❌ BROKEN (Instantly)
**BREAKS IN CHAIN:** C-2 (Instantly — zero auth), H-5 (Twilio SMS — no idempotency), H-6 (Twilio voice — no dedup), H-11 (Clawdbot — mismatched secrets)
**BOTTLENECK:** C-2 — Instantly webhook endpoint is completely unauthenticated.

---

# SECTION 8: ORPHANED CODE

## Dead/Unprotected API Routes
- `/api/test/simple` — No auth, no purpose in production
- `/api/test/pipeline` — No auth, consumes paid API credits
- `/api/test/create-leads` — Static token auth
- `/api/test/import-direct` — Static token auth
- `/api/test/env-status` — Static token auth, exposes config
- `/api/test/force-queue` — Static token auth
- `/api/test/queue-debug` — Static token auth
- `/api/test/queue-job` — Static token auth
- `/api/test/worker-debug` — Static token auth
- `/api/test/direct-process` — Static token auth
- `/api/test/manual-process` — Static token auth

## Dead Lib Functions
- `src/lib/message-processor.ts` — `handleIncomingSMS()` exported but likely never called (Twilio webhook handles inbound directly)

## Unread/Unused Env Vars (in .env.example but never used in code)
- `TWILIO_API_KEY_SID`
- `TWILIO_API_KEY_SECRET`
- `TWILIO_TWIML_APP_SID`
- `TWILIO_DIALER_NUMBER_1/2/3`
- `STRIPE_WEBHOOK_SECRET` (webhook route has its own secret)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `RESEND_WEBHOOK_SECRET` (conditionally used)
- `BOOTSTRAP_SECRET`
- `ADMIN_PASSWORD`

## Dead Worker Jobs
- `midday_health_check` — stub handler, logs only
- `webhook_reconciliation` — stub handler, logs only
- `nightly_reconciliation` — stub handler, logs only

## Legacy/Duplicate Code
- `src/lib/stripe.ts:32-41` — `PAYMENT_LINKS` constant marked as legacy, replaced by Products table
- `src/components/rep/DialerCore.tsx` — 2180-line legacy monolith, potentially replaced by modular dialer system

---

# SECTION 9: RECOMMENDED FIX ORDER

## PRIORITY 1 — Fix First (Security + Data Integrity)

| Break | Fix | Pattern |
|-------|-----|---------|
| C-2 | Add signature verification to Instantly webhook | Security |
| C-3 | Add auth check to `/api/test/pipeline` | Security |
| C-4 | Move test token to env var OR delete test endpoints | Security |
| C-1 | Add `isDNC()` check to `sendEmail()` in `resend.ts` | DNC |
| C-6 | Change DNC check fail-open to fail-closed in `sms-provider.ts` | DNC |
| H-14 | Use `isDNC()` instead of `lead.dncAt` in `post-client-engine.ts` | DNC |

## PRIORITY 2 — Fix Next (Revenue-Critical Path)

| Break | Fix | Pattern |
|-------|-----|---------|
| C-8 | Return 500 for transient errors in Stripe webhook (let Stripe retry) | Webhooks |
| H-1 | Decide on single dialer implementation, remove the other | Dialer |
| H-2, H-3 | Fix API endpoint URLs in active dialer OR remove legacy dialer | Dialer |
| H-5, H-6 | Add idempotency checks to Twilio SMS and voice webhooks | Webhooks |
| C-5 | Replace all 7 Anthropic instances with shared `getAnthropicClient()` | Singletons |
| H-7 | Replace all Twilio instances with shared `getTwilioClient()` | Singletons |

## PRIORITY 3 — Fix Next (Reliability + Observability)

| Break | Fix | Pattern |
|-------|-----|---------|
| C-7 | Replace message batcher setTimeout with BullMQ delayed jobs | setTimeout |
| M-8 | Add dead letter queue and alerting for failed BullMQ jobs | Workers |
| M-9 | Consider BullMQ flow dependencies instead of event-based chaining | Workers |
| H-11 | Standardize CLAWDBOT_WEBHOOK_SECRET across both files | Config |
| H-13, M-16, M-17, M-18 | Add logging to all empty catch blocks | Silent catches |
| M-10, M-11 | Centralize Redis and URL config | Config |

## PRIORITY 4 — Cleanup (Tech Debt + Polish)

| Break | Fix | Pattern |
|-------|-----|---------|
| H-4 | Implement or remove dead bulk action buttons | UI |
| H-12 | Implement Clawdbot webhook handler stubs | Webhooks |
| M-1, M-2, M-3 | Implement part-time feature parity (onboarding, polling, auto-refresh) | Feature gap |
| M-4 | Extract shared components for leaderboard/tasks | Tech debt |
| L-1 through L-12 | Various cleanup items | Multiple |

---

# SECTION 10: VARIABLE DEPENDENCY MAP

## VARIABLE: `ownerRepId` (Lead model)
- **WRITTEN BY:** `src/lib/dialer-service.ts` (atomic ownership claim on first call)
- **READ BY:** `src/lib/commissions.ts` (commission assignment), `src/app/admin/reps/page.tsx` (lead counts), `src/app/admin/reps/performance/page.tsx` (performance stats), admin dashboard (lead assignment display)
- **DISPLAY:** Admin leads table, admin reps page, admin revenue
- **INCONSISTENCY:** Always coalesced with `assignedToId` via `||` pattern — duplicated in 6+ places without utility function

## VARIABLE: `assignedToId` (Lead model)
- **WRITTEN BY:** `src/lib/distribution.ts` (CSV import assignment), `src/app/api/leads/[id]/assign/route.ts` (manual assignment), `src/app/api/admin/leads/[id]/reassign/route.ts` (reassignment)
- **READ BY:** Same files as `ownerRepId` — always used as fallback
- **DISPLAY:** Dialer queue filter, rep dashboard lead list
- **INCONSISTENCY:** Some queries filter on `assignedToId` only, others on `ownerRepId || assignedToId`

## VARIABLE: `lead.status` (LeadStatus enum)
- **WRITTEN BY:** 15+ locations (Stripe webhook, dialer disposition, distribution, close engine, import, admin bulk actions, DNC marking)
- **READ BY:** Every lead list, dialer queue filter, dashboard stats, close engine triggers, worker sequence checks
- **DISPLAY:** Admin leads page, admin dashboard, rep dashboard, dialer queue
- **INCONSISTENCY:** Distribution unconditionally overwrites to `'BUILDING'` (H-10), dialer sets `'QUALIFIED'` on interest without checking current status

## VARIABLE: `commission.status` (CommissionStatus enum)
- **WRITTEN BY:** `src/lib/commissions.ts` (creates as PENDING), `src/app/api/admin/payouts/mark-paid/route.ts` (→ PAID), admin approvals
- **READ BY:** `src/components/shared/EarningsView.tsx` (rep earnings), `src/app/api/commissions/route.ts` (API), admin payouts page
- **DISPLAY:** Rep earnings page shows PENDING+APPROVED as "Total Earned", admin payouts shows PENDING for approval
- **INCONSISTENCY:** None found — frontend and backend agree on what counts as "earned"

## VARIABLE: `siteHtml` (Lead model)
- **WRITTEN BY:** Preview generator worker, site editor save, AI edit handler, build-queue rebuild
- **READ BY:** Preview page, site editor load, client site page, close engine (for AI context)
- **DISPLAY:** Preview page, client site, site editor panel
- **INCONSISTENCY:** No locking mechanism. Two simultaneous edits (e.g., AI edit + manual save) could overwrite each other. Site editor has version checking (409 conflict), but AI edits from close engine don't check versions.

## VARIABLE: `dncAt` (Lead model)
- **WRITTEN BY:** Dialer DNC button (`dialer-service.ts:951`), inbound SMS STOP handler, `isDNC()` auto-heal
- **READ BY:** `sms-provider.ts` (via `isDNC()`), `post-client-engine.ts` (directly), dialer queue filter, worker touchpoints
- **DISPLAY:** Admin leads page (DNC badge), dialer lead info
- **INCONSISTENCY:** `post-client-engine.ts` checks `dncAt` directly instead of using `isDNC()`, missing DoNotCall table entries. `sendEmail()` doesn't check at all.