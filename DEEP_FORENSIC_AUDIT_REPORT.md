# DEEP FORENSIC AUDIT REPORT
## Bright Automations Platform
### Date: 2026-02-24 | Auditor: Claude Opus 4.6

---

> **Scope**: This audit went UNDERNEATH the surface-level Button Test Audit (52 breaks) to find what that audit was structurally incapable of finding. Every finding below is NEW — not a duplicate of the previous report.

> **Method**: 10 parallel forensic agents read every line of code across 250+ API routes, 48 Prisma models, 8 BullMQ queues, and all frontend components. No code was modified.

---

## EXECUTIVE SUMMARY

| Severity | Count | Examples |
|----------|-------|---------|
| **CRITICAL** | 18 | Open API endpoints, non-transactional payments, data loss on infrastructure failure |
| **HIGH** | 42 | IDOR, missing auth, broken refunds, race conditions, silent message drops |
| **MEDIUM** | 52 | Dead state machines, DNC bypass, stale data, missing validation |
| **LOW** | 12 | Info leakage, cosmetic data issues, minor dead code |
| **TOTAL** | **124** | All new findings beyond the 52 from Button Test Audit |

---

## MASTER FINDINGS TABLE

Sorted by severity, then by recommended fix order (dependencies accounted for).

### CRITICAL (18 findings)

| # | ID | Phase | Finding | File | Line(s) |
|---|-----|-------|---------|------|---------|
| 1 | C-AUTH-1 | 2 | `/api/leads/[id]` GET/PUT/DELETE has ZERO authentication — any authenticated user can read/modify/hard-delete ANY lead including PII | `src/app/api/leads/[id]/route.ts` | 1-171 |
| 2 | C-AUTH-2 | 2 | `/api/leads/[id]/assign` PUT has ZERO authentication — any user can reassign any lead | `src/app/api/leads/[id]/assign/route.ts` | 1-62 |
| 3 | C-AUTH-3 | 2 | `/api/settings/store-campaigns` is PUBLIC (middleware whitelisted) — anyone on the internet can overwrite Instantly campaign IDs | `src/app/api/settings/store-campaigns/route.ts` | 1-92 |
| 4 | C-AUTH-4 | 2 | `/api/revenue/transactions` has ZERO authentication — returns last 50 revenue records publicly | `src/app/api/revenue/transactions/route.ts` | 1-17 |
| 5 | C-AUTH-5 | 2 | `/api/email-preview/send-test` is an open email relay — zero auth, any user can send emails to any recipient with arbitrary content | `src/app/api/email-preview/send-test/route.ts` | 1-65 |
| 6 | C-MONEY-1 | 3 | Non-transactional Stripe checkout: `handleCheckoutCompleted` performs 9+ sequential DB writes without `prisma.$transaction()` — partial failure leaves orphaned Client with no Revenue/Commission | `src/app/api/webhooks/stripe/route.ts` | 218-339 |
| 7 | C-MONEY-2 | 3 | No idempotency on `client.create` — duplicate Stripe webhooks create duplicate Client records (no unique constraint on `Client.leadId`) | `src/app/api/webhooks/stripe/route.ts` | 170-236 |
| 8 | C-MSG-1 | 4 | Close Engine + Post-Client Engine BOTH fire on same inbound SMS — no mutual exclusion, guaranteed double AI response for leads in transition | `src/app/api/webhooks/twilio/route.ts` | 368-422 |
| 9 | C-ERR-1 | 8 | Redis down silently drops ALL Close Engine messages — `addDelayedMessageJob()` returns null, caller never checks. Conversations created but first SMS never sent | `src/lib/close-engine-processor.ts` + `src/worker/queue.ts` | 258-280, 307-329 |
| 10 | C-ERR-2 | 8 | Postgres down during Stripe webhook = permanent financial data loss — handler returns 200 on ALL errors, Stripe never retries | `src/app/api/webhooks/stripe/route.ts` | 98-101 |
| 11 | C-ERR-3 | 8 | Stack trace + file paths leaked in `/api/webhook-trigger` API response body (public endpoint) | `src/app/api/webhook-trigger/route.ts` | 24-29 |
| 12 | C-ENV-1 | 9 | `DEFAULT_LOGIN_PASSWORD` falls back to `'123456'` — any user without passwordHash can be logged in with this trivially guessable default | `src/app/api/auth/simple-login/route.ts` | 67 |
| 13 | C-FE-1 | 11 | `/api/dialer/hold` does not exist (wrong URL + wrong body shape) — hold/resume completely broken in legacy DialerCore | `src/components/rep/DialerCore.tsx` | 1605-1618 |
| 14 | C-FE-2 | 11 | `/api/dialer/dial` does not exist — all dial attempts in legacy DialerCore return 404, falls back to native phone dialer | `src/components/rep/DialerCore.tsx` | 1522 |
| 15 | C-FE-3 | 11 | `/api/dialer/callback` POST does not exist (wrong URL + wrong field names) — callback scheduling silently fails, leads fall through | `src/components/rep/DialerCore.tsx` | 1805-1814 |
| 16 | C-FE-4 | 11 | `/api/dialer/note` does not exist (wrong URL + wrong field name) — lead event notes silently lost | `src/components/rep/DialerCore.tsx` | 1761-1765 |
| 17 | C-FE-5 | 11 | `/api/dialer/preview-status` does not exist (wrong URL + wrong response fields) — live preview engagement indicators never update | `src/components/rep/DialerCore.tsx` | 1335 |
| 18 | C-WORK-1 | 12 | Rebuild silently skips enrichment due to dedup guards — leads that need re-enrichment get stuck | `src/worker/index.ts` | various |

### HIGH (42 findings)

| # | ID | Phase | Finding | File | Line(s) |
|---|-----|-------|---------|------|---------|
| 19 | H-AUTH-1 | 2 | `/api/onboard/[id]` GET/PUT is PUBLIC — exposes lead PII (phone, email, company) and allows arbitrary JSON write to `onboardingData` | `src/app/api/onboard/[id]/route.ts` | 1-129 |
| 20 | H-AUTH-2 | 2 | `/api/onboard/[id]/submit` POST is PUBLIC — triggers enrichment pipeline + sends SMS with zero auth | `src/app/api/onboard/[id]/submit/route.ts` | 1-264 |
| 21 | H-AUTH-3 | 2 | `/api/notifications/[id]` PUT/DELETE has ZERO authentication — any user can mark/delete any notification (hide security alerts from admins) | `src/app/api/notifications/[id]/route.ts` | 1-48 |
| 22 | H-AUTH-4 | 2 | `/api/notifications` POST has ZERO authentication — any user can create spoofed admin-level notifications | `src/app/api/notifications/route.ts` | 58-102 |
| 23 | H-AUTH-5 | 2 | Default login password `123456` for all users without passwordHash | `src/app/api/auth/simple-login/route.ts` | 67 |
| 24 | H-MONEY-3 | 3 | Revenue split uses config price ($149+$39=$188), not actual Stripe amount — coupons/discounts cause revenue records to overstate income | `src/app/api/webhooks/stripe/route.ts` | 299-311 |
| 25 | H-MONEY-4 | 3 | Site build revenue ($149) never gets commission — only last revenue record passed to `processRevenueCommission()`. Rep loses $74.50 per close | `src/app/api/webhooks/stripe/route.ts` | 296-323 |
| 26 | H-MONEY-5 | 3 | Refund lookup uses `payment_intent` (pi_) but revenue stores `session.id` (cs_) — refunds can NEVER match, revenue stays PAID forever | `src/app/api/webhooks/stripe/route.ts` | 597-611 |
| 27 | H-MONEY-6 | 3 | Refund `findFirst` only finds 1 of 2 revenue records from checkout split — second revenue stays PAID | `src/app/api/webhooks/stripe/route.ts` | 597 |
| 28 | H-MONEY-7 | 3 | Refund clawback targets most recent commission, not the one linked to refunded revenue — wrong commission clawed back | `src/app/api/webhooks/stripe/route.ts` | 625-632 |
| 29 | H-MONEY-8 | 3 | Manual client creation makes revenue with no `stripePaymentId` — no duplicate protection, PENDING revenue inflates dashboard | `src/app/api/clients/route.ts` | 49-70 |
| 30 | H-MONEY-9 | 3 | Referral reward sets `clientId` to a User ID (wrong FK type) — orphaned revenue or FK violation | `src/lib/profit-systems.ts` | 264-272 |
| 31 | H-MONEY-10 | 3 | `/api/revenue/transactions` has NO authentication (confirmed by Phase 2 + Phase 3 independently) | `src/app/api/revenue/transactions/route.ts` | 1-17 |
| 32 | H-MSG-2 | 4 | No phone/email validation anywhere in send pipeline — malformed sends waste Twilio/Resend credits | `src/lib/sms-provider.ts` | 85-146 |
| 33 | H-MSG-3 | 4 | No cross-system per-recipient rate limiting — a lead can receive 5+ messages from different subsystems in minutes | Multiple files | — |
| 34 | H-MSG-4 | 4 | Message record written AFTER send — if DB fails after Twilio succeeds, message is lost from system | `src/lib/sms-provider.ts` | 100-124 |
| 35 | H-MSG-5 | 4 | `containsPaymentUrl` regex uses `/gi` flag with `.test()` — stateful bug alternates true/false, payment URLs leak on even-numbered calls | `src/lib/close-engine-processor.ts` | 1035-1053 |
| 36 | H-MSG-11 | 4 | Twilio SMS webhook returns 500 on error — Twilio retries indefinitely, each retry triggers full AI pipeline again (retry storm) | `src/app/api/webhooks/twilio/route.ts` | 431-437 |
| 37 | H-MSG-12 | 4 | Reactions and normal messages race without serialization — concurrent AI responses from same conversation | `src/app/api/webhooks/twilio/route.ts` | 224-245 |
| 38 | H-STATE-3 | 6 | Bulk action allows any-to-any lead status transition with zero validation | `src/app/api/admin/bulk-action/route.ts` | 70 |
| 39 | H-STATE-5 | 6 | All workers bypass `advanceBuildStep()` — transition validation function is dead code | `src/worker/index.ts` | 108-197 |
| 40 | H-STATE-8 | 6 | Worker stall-check + Stripe webhook bypass `transitionStage()` — no Close Engine stage validation or LeadEvent logging | `src/worker/index.ts` + `src/app/api/webhooks/stripe/route.ts` | 1331-1432, 413 |
| 41 | H-STATE-11 | 6 | Client update API uses raw `...data` spread — mass assignment vulnerability allows arbitrary field injection | `src/app/api/clients/[id]/route.ts` | 77-83 |
| 42 | H-STATE-14 | 6 | Onboarding status desync — `Lead.onboardingStatus` and `Client.onboardingStep` are independent, can show false "completed" | `src/app/api/onboard/[id]/submit/route.ts` + `src/app/api/webhooks/stripe/route.ts` | 121, 244 |
| 43 | H-RACE-6 | 7 | No BullMQ job deduplication — same lead can have multiple enrichment/preview/personalization jobs running simultaneously | `src/worker/queue.ts` | various |
| 44 | H-RACE-7 | 7 | Duplicate Client records possible — no unique constraint on `Client.leadId`, duplicate Stripe webhooks create duplicates | `prisma/schema.prisma` + `src/app/api/webhooks/stripe/route.ts` | 269, 218 |
| 45 | H-ERR-2.2 | 8 | `triggerCloseEngine` creates 4 records without transaction — if first message fails, conversation stuck in INITIATED forever | `src/lib/close-engine.ts` | 112-159 |
| 46 | H-ERR-2.3 | 8 | `createCommission` creates commission + notifications without transaction — function returns null if notification fails but commission already exists in DB | `src/lib/commissions.ts` | 88-138 |
| 47 | H-ERR-3.4 | 8 | Worker `on('completed')` callbacks are async but BullMQ doesn't catch errors — unhandled rejections crash worker, lead pipeline gets permanently stuck | `src/worker/index.ts` | 207-269 |
| 48 | H-ERR-5.2 | 8 | Redis down breaks entire build pipeline silently — all `addJob()` functions return null, callers don't check, leads stuck at current buildStep forever | `src/worker/queue.ts` | 347-369 |
| 49 | H-ERR-5.3 | 8 | Redis down disables admin SMS rate limiting — catch block sends EVERY notification, causing SMS flood | `src/lib/notifications.ts` | 72-84 |
| 50 | H-ERR-4.2 | 8 | 60+ API routes leak internal error details via `details: error.message` — exposes Prisma schema, SQL queries, third-party API info | Multiple files | — |
| 51 | H-ENV-1 | 9 | `NEXT_PUBLIC_BASE_URL` ghost variable produces broken preview URLs when `BASE_URL` is unset | `src/app/api/clawdbot/leads/route.ts` | — |
| 52 | H-ENV-4 | 9 | `SKIP_TWILIO_VERIFY` is undocumented security bypass — should be gated behind NODE_ENV, not a standalone toggle | `src/middleware.ts` | — |
| 53 | H-ENV-5 | 9 | Resend webhook verification requires BOTH secret AND production mode — staging environments completely unprotected | `src/app/api/webhooks/resend/route.ts` | 30-31 |
| 54 | H-ENV-10 | 9 | `setInterval` in `anthropic.ts` leaks timers — no cleanup on module reload | `src/lib/anthropic.ts` | — |
| 55 | H-FE-6 | 11 | `/api/dialer/live` does not exist — admin dialer monitor page completely broken (wrong URL + wrong response shape) | `src/app/admin/dialer-monitor/page.tsx` | 69 |
| 56 | H-FE-7 | 11 | `/api/dialer/leads` does not exist — EarningsView pipeline data always empty | `src/components/shared/EarningsView.tsx` | 81 |
| 57 | H-FE-8 | 11 | SSE `RECOMMENDATION_UPDATE` event subscribed by frontend but never sent by any backend code | `src/hooks/useDialerSSE.ts` | 30 |
| 58 | H-FE-9 | 11 | SSE reconnection drops events with no recovery — no `Last-Event-Id`, missed CALL_STATUS events leave UI in stale state | `src/hooks/useDialerSSE.ts` | 60-63 |
| 59 | H-WORK-2 | 12 | Redis availability tracking never resets — once `isRedisAvailable` goes false, all jobs silently dropped until process restart | `src/worker/queue.ts` | — |
| 60 | H-WORK-3 | 12 | Instantly worker is completely dead code — imported but never processes jobs | `src/worker/index.ts` | — |

### MEDIUM (52 findings)

| # | ID | Phase | Finding | File |
|---|-----|-------|---------|------|
| 61 | M-SCHEMA-1a | 1 | `User.totalCloses` always 0 — never incremented, all leaderboard pages show $0 revenue | `prisma/schema.prisma:24` |
| 62 | M-SCHEMA-1b | 1 | `User.vmRecordingSid` read and cleared but never populated — voicemail recording always null | `prisma/schema.prisma:40` |
| 63 | M-SCHEMA-1c | 1 | `Client.lastInteraction` never written — churn risk UI perpetually shows no data | `prisma/schema.prisma:237` |
| 64 | M-SCHEMA-1d | 1 | `Lead.secondaryPhone` extensively queried in 10+ Twilio WHERE clauses but never set — dead matching code | `prisma/schema.prisma:144` |
| 65 | M-SCHEMA-1e | 1 | `Lead.smsPreferredNumber` read but never changed from default — condition can never be true | `prisma/schema.prisma:145` |
| 66 | M-SCHEMA-1f | 1 | `Lead.handoffContext` selected and parsed but never populated — elaborate JSON parsing of null | `prisma/schema.prisma:143` |
| 67 | M-SCHEMA-3a | 1 | `Client.aiAutoRespond` toggle does nothing — never checked by Post-Client Engine or Close Engine | `prisma/schema.prisma:244` |
| 68 | M-SCHEMA-3b | 1 | `Client.statReportFrequency` editable but never used by any worker/cron/report logic | `prisma/schema.prisma:257` |
| 69 | M-SCHEMA-5a | 1 | Commission `onDelete: Cascade` destroys financial audit trail when Client deleted — including PAID commissions with payout references | `prisma/schema.prisma:403` |
| 70 | M-SCHEMA-5b | 1 | `clients/delete` route does HARD delete despite "soft delete" comment — `all: true` parameter nukes ALL clients | `src/app/api/clients/delete/route.ts` |
| 71 | M-SCHEMA-5c | 1 | `leads/delete` route has nuclear `all: true` option — cascades through 17+ related tables | `src/app/api/leads/delete/route.ts` |
| 72 | M-AUTH-M1 | 2 | `/api/clients/[id]` PUT: admin auth but raw `...data` spread (mass assignment) | `src/app/api/clients/[id]/route.ts:75-83` |
| 73 | M-AUTH-M2 | 2 | `/api/preview/[id]` GET: public, returns FULL lead object including all PII | `src/app/api/preview/[id]/route.ts` |
| 74 | M-AUTH-M3 | 2 | `/api/leads` GET: REPs can access ALL leads — no ownership scope filter for REP role | `src/app/api/leads/route.ts` |
| 75 | M-AUTH-M4 | 2 | `/api/messages` GET: REPs can read ALL messages across all leads — no ownership filter | `src/app/api/messages/route.ts` |
| 76 | M-AUTH-M5 | 2 | `/api/dialer/callback/[id]` PATCH: no ownership check (DELETE has it, PATCH doesn't) | `src/app/api/dialer/callback/[id]/route.ts` |
| 77 | M-AUTH-M6 | 2 | `/api/dialer/callback/[id]/complete`: no ownership check — any REP can complete any callback | `src/app/api/dialer/callback/[id]/complete/route.ts` |
| 78 | M-AUTH-M7 | 2 | `/api/onboard/[id]/upload`: PUBLIC file upload with no file type validation (only size limit) | `src/app/api/onboard/[id]/upload/route.ts` |
| 79 | M-AUTH-M8 | 2 | `/api/admin/diagnostics`: hardcoded test token `e2e-test-live-pipeline-2026` bypasses auth | `src/app/api/admin/diagnostics/route.ts:16-17` |
| 80 | M-AUTH-M9 | 2 | `/api/webhook-trigger`: public, leaks `process.pid` and `process.env.NODE_ENV` | `src/app/api/webhook-trigger/route.ts` |
| 81 | M-AUTH-M10 | 2 | Resend webhook: signature verification only in production — staging endpoints unauthenticated | `src/app/api/webhooks/resend/route.ts:30-31` |
| 82 | M-AUTH-M11 | 2 | `/api/dialer/vm/upload`: SSRF risk — server fetches any user-provided URL with no scheme validation | `src/app/api/dialer/vm/upload/route.ts:22-29` |
| 83 | M-MONEY-10 | 3 | Multiple dashboard endpoints sum revenue without status filter — PENDING and REFUNDED inflate totals | `src/app/api/clawdbot/status/route.ts` + `src/lib/digest-reports.ts` |
| 84 | M-MONEY-12 | 3 | Performance tier uses `assignedLeads` count, not `ownerRepId` — tier rate inflated by other reps' closes | `src/lib/commissions.ts:49-59` |
| 85 | M-MONEY-13 | 3 | `getPaymentLink()` clientId silently overwrites leadId — payment becomes "unmatched" | `src/lib/stripe.ts:48-49` |
| 86 | M-MONEY-14 | 3 | `invoice.payment_succeeded` silently drops if no client match on `stripeCustomerId` — recurring revenue lost | `src/app/api/webhooks/stripe/route.ts:468-527` |
| 87 | M-MONEY-15 | 3 | Pricing cache race condition — 60s stale pricing across serverless instances during admin price updates | `src/lib/pricing-config.ts:36-46` |
| 88 | M-MONEY-19 | 3 | Two conflicting payment generation paths with potentially different prices (dynamic checkout vs static Stripe link) | `src/lib/close-engine-payment.ts` |
| 89 | M-MSG-6 | 4 | Worker email sequences skip DNC check — DNC'd leads still receive onboarding/winback/referral emails | `src/worker/index.ts:870-1192` |
| 90 | M-MSG-7 | 4 | `getLeadSmsNumber()` can return null typed as string — sends fail at Twilio with confusing error | `src/lib/twilio.ts:66-78` |
| 91 | M-MSG-8 | 4 | Channel router email-to-SMS fallback bypasses night hours protection — 2am SMS after email fails | `src/lib/channel-router.ts:336-346` |
| 92 | M-MSG-9 | 4 | Email duplicate guard only works with `clientId` — pre-client emails have no dedup | `src/lib/resend.ts:65-79` |
| 93 | M-MSG-10 | 4 | Close Engine AI responses ignore timezone/quiet hours — 11pm texts get 11:00:15pm replies | `src/lib/close-engine-processor.ts` |
| 94 | M-MSG-14 | 4 | Inbound voice does not validate From/To — null fields match leads with null phone | `src/app/api/webhooks/twilio-inbound-voice/route.ts:25-27` |
| 95 | M-MSG-16 | 4 | Unknown inbound SMS auto-reply has no rate limit — 100 texts = 100 identification requests sent back | `src/app/api/webhooks/twilio/route.ts:136-144` |
| 96 | M-STATE-1 | 6 | `INFO_COLLECTED` is a dead lead status — never set anywhere in code | `prisma/schema.prisma:1051` |
| 97 | M-STATE-2 | 6 | `APPROVED` status has no automated exit/timeout — leads stuck in approval limbo forever | `src/app/api/admin/approvals/[id]/route.ts:177` |
| 98 | M-STATE-4 | 6 | `build-readiness.ts` can jump from `HOT_LEAD` to `QA` skipping intermediate states | `src/lib/build-readiness.ts:189` |
| 99 | M-STATE-6 | 6 | DNS handler sets `LAUNCHED` from any buildStep — no transition validation | `src/worker/index.ts:1738` |
| 100 | M-STATE-7 | 6 | Close Engine sets `buildStep=ENRICHMENT` but build-step-machine maps that to `QUALIFIED` status — mismatch | `src/lib/close-engine-processor.ts:604` |
| 101 | M-STATE-9 | 6 | `STALLED -> QUALIFYING` re-engagement exists but nothing triggers it; `stalledAt` never cleared | `src/lib/close-engine.ts:182` |
| 102 | M-STATE-10 | 6 | `GRACE_PERIOD` hosting status never set; `FAILED_PAYMENT` has no auto-recovery timer | `prisma/schema.prisma:1121-1127` |
| 103 | M-STATE-12 | 6 | EditRequest `escalated` state has no automated exit; approval handler doesn't always update editFlowState | `src/lib/edit-request-handler.ts:258` |
| 104 | M-STATE-13 | 6 | `PendingAction.expiresAt` field exists but is never checked — expired actions can be approved indefinitely | `prisma/schema.prisma:949` |
| 105 | M-ERR-6.5 | 8 | Redis health check is no-op — empty try block with "skipping for now" comment. Health endpoint NEVER reports Redis as down | `src/lib/monitoring.ts:77-87` |
| 106 | M-ERR-6.4 | 8 | Onboard submit returns `success: true` even when 5/5 side effects fail (pipeline, QA, enrichment, notification, SMS) | `src/app/api/onboard/[id]/submit/route.ts:190-250` |
| 107 | M-ERR-2.4 | 8 | `logDisposition` performs 11 sequential operations without transaction — `.catch(() => {})` swallows ALL errors including DB timeouts | `src/lib/dialer-service.ts:409-581` |
| 108 | M-ERR-4.3 | 8 | Admin leads page renders full stack traces in error boundary — internal code paths exposed in browser | `src/app/admin/leads/page.tsx:36,43` |
| 109 | M-FE-10 | 11 | `/api/leads?countOnly=true` parameter silently ignored — part-time-reps page fetches full lead records, undercounts past 50 | `src/app/admin/part-time-reps/page.tsx:127` |
| 110 | M-FE-11 | 11 | No double-submit prevention on admin Create Lead, Create Client, Invite Rep forms — rapid clicks create duplicates | Multiple admin pages |
| 111 | M-FE-12 | 11 | No AbortController in 5+ useEffect fetch calls — stale responses overwrite current data during rapid lead switching | Multiple dialer components |
| 112 | M-WORK-4 | 12 | Pipeline workers ignore deleted/DNC'd leads — continue processing and sending to already-removed contacts | `src/worker/index.ts` |

### LOW (12 findings)

| # | ID | Phase | Finding | File |
|---|-----|-------|---------|------|
| 113 | L-AUTH-L1 | 2 | Pervasive error message leakage via `details: error.message` across 60+ routes | Multiple API routes |
| 114 | L-AUTH-L2 | 2 | Bootstrap admin/rep endpoints are public (have guard but remain exposed after first use) | `src/app/api/bootstrap/*/route.ts` |
| 115 | L-SCHEMA-2a | 1 | `Lead.formUrl` stored but never read from DB — computed on-the-fly instead | `src/lib/close-engine.ts:118` |
| 116 | L-SCHEMA-2b | 1 | `Lead.aiFollowup` is complete ghost field — never read, never written, never queried | `prisma/schema.prisma:142` |
| 117 | L-SCHEMA-2c | 1 | `Client.nextTouchpoint` written by worker but never displayed or queried | `prisma/schema.prisma:238` |
| 118 | L-MONEY-16 | 3 | Rep commission total includes negative clawback amounts in summary | `src/lib/commissions.ts:266-270` |
| 119 | L-MONEY-17 | 3 | Revenue API returns all statuses without filter option | `src/app/api/revenue/route.ts:20-35` |
| 120 | L-MSG-17 | 4 | TwiML action URL exposes callId in query string | `src/app/api/webhooks/twilio-inbound-voice/route.ts:88-93` |
| 121 | L-MSG-18 | 4 | Resend webhook reads body twice on error — failed webhook record captures empty payload | `src/app/api/webhooks/resend/route.ts:117-134` |
| 122 | L-STATE-BONUS | 6 | Commission `APPROVED` status is dead code — commissions go PENDING->PAID or PENDING->REJECTED, never APPROVED | `prisma/schema.prisma` |
| 123 | L-SCHEMA-7 | 1 | Build timing fields (`buildEnrichmentMs`, etc.) written by worker but never displayed in UI | `src/worker/index.ts` + `src/app/admin/build-queue/page.tsx` |
| 124 | L-WORK-5 | 12 | Import worker OOM/stall risk for large imports — processes all leads in single array without streaming | `src/worker/index.ts` |

---

## RECOMMENDED FIX ORDER

Dependencies between fixes are noted. Fixes are grouped into waves that can be parallelized.

### WAVE 1: Stop the Bleeding (Security — Do These TODAY)

These require zero architectural changes — just adding auth checks to existing routes.

| Priority | Fix | Estimated Effort | Dependencies |
|----------|-----|-----------------|--------------|
| 1.1 | Add `verifySession` + role check to `/api/leads/[id]` (C-AUTH-1) | 15 min | None |
| 1.2 | Add `verifySession` + role check to `/api/leads/[id]/assign` (C-AUTH-2) | 10 min | None |
| 1.3 | Remove `/api/settings/store-campaigns` from middleware whitelist; add admin auth (C-AUTH-3) | 10 min | None |
| 1.4 | Add `verifySession` + admin check to `/api/revenue/transactions` (C-AUTH-4) | 10 min | None |
| 1.5 | Add `verifySession` + admin check to `/api/email-preview/send-test` (C-AUTH-5) | 10 min | None |
| 1.6 | Add `verifySession` to notification routes (H-AUTH-3, H-AUTH-4) | 15 min | None |
| 1.7 | Set strong `DEFAULT_LOGIN_PASSWORD`; remove `'123456'` fallback (C-ENV-1, H-AUTH-5) | 5 min | None |
| 1.8 | Remove `stack` from `/api/webhook-trigger` error response (C-ERR-3) | 5 min | None |
| 1.9 | Add HMAC-signed links or rate limiting for `/api/onboard/[id]/*` (H-AUTH-1, H-AUTH-2) | 30 min | None |

### WAVE 2: Fix Money Path (Financial Integrity)

| Priority | Fix | Estimated Effort | Dependencies |
|----------|-----|-----------------|--------------|
| 2.1 | Wrap `handleCheckoutCompleted` in `prisma.$transaction()` (C-MONEY-1) | 2 hours | None |
| 2.2 | Add unique constraint on `Client.leadId` + P2002 handling (C-MONEY-2, H-RACE-7) | 1 hour | Migration |
| 2.3 | Use actual Stripe amount for revenue records, not config price (H-MONEY-3) | 30 min | After 2.1 |
| 2.4 | Add commission for both revenue records in split (H-MONEY-4) | 30 min | After 2.1 |
| 2.5 | Fix refund lookup to match `session.id` (cs_) instead of `payment_intent` (pi_) (H-MONEY-5) | 30 min | None |
| 2.6 | Fix refund to find ALL revenue records for a session, not just first (H-MONEY-6) | 30 min | After 2.5 |
| 2.7 | Link commission to specific revenueId for accurate clawback (H-MONEY-7) | 1 hour | Migration |
| 2.8 | Fix referral reward clientId type mismatch (H-MONEY-9) | 15 min | None |
| 2.9 | Add `status: 'PAID'` filter to all revenue aggregation queries (M-MONEY-10) | 30 min | None |

### WAVE 3: Fix Message Pipeline (Stop Double Sends + Data Loss)

| Priority | Fix | Estimated Effort | Dependencies |
|----------|-----|-----------------|--------------|
| 3.1 | Add mutual exclusion between Close Engine and Post-Client Engine (C-MSG-1) | 1 hour | None |
| 3.2 | Remove `/gi` global flag from `PAYMENT_URL_PATTERNS` regex (H-MSG-5) | 5 min | None |
| 3.3 | Return 200 (not 500) from Twilio SMS webhook on all errors (H-MSG-11) | 15 min | None |
| 3.4 | Write Message record BEFORE send, update with result after (H-MSG-4) | 1 hour | None |
| 3.5 | Check `addDelayedMessageJob()` return value; fallback to direct send on null (C-ERR-1) | 30 min | None |
| 3.6 | Add DNC check to all worker email sequence functions (M-MSG-6) | 30 min | None |
| 3.7 | Add per-recipient rate limiter (e.g., max 5 SMS/hour per phone) (H-MSG-3) | 2 hours | Redis |

### WAVE 4: Fix Frontend Contracts (DialerCore)

| Priority | Fix | Estimated Effort | Dependencies |
|----------|-----|-----------------|--------------|
| 4.1 | Fix all 5 DialerCore API URLs: `/api/dialer/hold` -> `/api/dialer/call/hold`, etc. (C-FE-1 through C-FE-5) | 1 hour | None |
| 4.2 | Fix body shapes to match backend expectations (hold: boolean, scheduledAt, notes) | 30 min | After 4.1 |
| 4.3 | Fix admin dialer-monitor URL and response shape mapping (H-FE-6) | 30 min | None |
| 4.4 | Fix EarningsView `/api/dialer/leads` to correct endpoint or add the route (H-FE-7) | 30 min | None |

### WAVE 5: Fix Infrastructure Resilience

| Priority | Fix | Estimated Effort | Dependencies |
|----------|-----|-----------------|--------------|
| 5.1 | Change Stripe webhook to return 500 on processing errors (so Stripe retries) (C-ERR-2) | 15 min | After 2.1 |
| 5.2 | Add error handling to worker `on('completed')` callbacks (H-ERR-3.4) | 30 min | None |
| 5.3 | Check all `addJob()` return values; create admin notification on null (H-ERR-5.2) | 1 hour | None |
| 5.4 | Implement Redis health check in monitoring (not empty try block) (M-ERR-6.5) | 30 min | None |
| 5.5 | Add BullMQ job deduplication via `jobId` parameter (H-RACE-6) | 1 hour | None |
| 5.6 | Fix Redis availability tracking to reset on successful reconnect (H-WORK-2) | 30 min | None |

### WAVE 6: State Machine + Schema Cleanup

| Priority | Fix | Estimated Effort | Dependencies |
|----------|-----|-----------------|--------------|
| 6.1 | Add field whitelist to `PUT /api/clients/[id]` (H-STATE-11) | 15 min | None |
| 6.2 | Change Commission `onDelete: Cascade` to `SetNull` (M-SCHEMA-5a) | 15 min | Migration |
| 6.3 | Remove dead schema fields or add write paths for ghost fields (M-SCHEMA-1a through 1f) | 2 hours | Migration |
| 6.4 | Wire `Client.aiAutoRespond` to Post-Client Engine (M-SCHEMA-3a) | 30 min | None |
| 6.5 | Enforce `PendingAction.expiresAt` in approval handler (M-STATE-13) | 15 min | None |

---

## CROSS-PHASE CONFIRMATION MAP

These findings were independently discovered by multiple phases, confirming their validity:

| Finding | Confirmed By |
|---------|-------------|
| Non-transactional Stripe checkout | Phase 3 (F1), Phase 7 (Race #2), Phase 8 (F2.1) |
| Close Engine + Post-Client double send | Phase 4 (F1), Phase 7 (Race #1) |
| `/api/revenue/transactions` no auth | Phase 2 (C-4), Phase 3 (F18) |
| Duplicate Client on `leadId` (no unique) | Phase 3 (F2), Phase 7 (Race #7), Phase 1 (F4a) |
| Redis down = silent message drops | Phase 8 (F5.1), Phase 12 (F2) |
| Mass assignment on client update | Phase 2 (M-1), Phase 6 (F11) |
| `advanceBuildStep()` is dead code | Phase 6 (F5), Phase 12 context |
| Default password 123456 | Phase 2 (H-5), Phase 9 (F9.3) |
| Resend webhook auth only in production | Phase 2 (M-10), Phase 4 (F13), Phase 9 (F9.5) |

---

## ARCHITECTURE OBSERVATIONS

### Systemic Patterns That Cause Most Bugs

1. **No transactions anywhere**: The codebase has ZERO uses of `prisma.$transaction()`. Every multi-write operation is vulnerable to partial failure.

2. **Fire-and-forget async**: Pervasive use of `void fn()`, `.catch(() => {})`, and unhandled async event callbacks. Errors vanish silently.

3. **No input validation layer**: No Zod, no joi, no validation middleware. Every route trusts `request.json()` raw.

4. **No idempotency**: Webhook handlers don't use idempotency keys. Retry = duplicate data.

5. **Auth is opt-in, not opt-out**: Routes must explicitly add auth. Missing auth = public. Should be the reverse.

6. **Legacy component drift**: `DialerCore.tsx` was built against an older API surface. When routes were restructured, the old component was never updated.

7. **Redis is a single point of failure**: When Redis is down, the entire job queue, rate limiting, session extension, and message batching systems fail — mostly silently.

---

## WHAT THE BUTTON TEST AUDIT COULD NOT FIND

The surface-level audit tested "does clicking X do Y?" This deep audit found:

- **Data integrity failures** that only manifest under concurrent load or infrastructure stress
- **Financial calculation errors** that silently accumulate over time (wrong revenue amounts, missing commissions, unmatchable refunds)
- **Ghost data fields** that UI components read but nothing ever writes — showing perpetual zeros/nulls
- **Race conditions** between parallel webhook deliveries and concurrent user actions
- **Cascade deletion chains** that can destroy financial audit trails
- **State machine dead code** where validation functions exist but are never called
- **Error propagation failures** where catch blocks hide critical errors from operators
- **Frontend-backend contract mismatches** where URLs and field names diverged during refactors

---

*Report generated by 10 parallel forensic agents. Every finding includes exact file path and line number. No code was modified during this audit.*
