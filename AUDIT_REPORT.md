> **TEARDOWN NOTE (March 2026):** This document predates the pipeline redesign.
> Urgency sequences, upsells, old pricing ($199/$149), and Close Engine closing behavior
> have been removed. See SPEC_Teardown for details.

# SMS FUNNEL BUILD — AUDIT REPORT
## Date: 2026-03-05

---

### Summary

| Agent | Scope | Checks | PASS | FAIL | Issues |
|-------|-------|--------|------|------|--------|
| Agent 1 (Schema) | prisma/schema.prisma | 65 | 63 | 2 | 1 MEDIUM |
| Agent 2 (Backend) | sms-campaign-service, sms-provider, twilio, timeline | 45 | 42 | 3 | 1 HIGH, 1 MEDIUM, 3 LOW |
| Agent 3 (Worker) | queue.ts, index.ts | 43 | 42 | 1 | 1 MEDIUM, 1 LOW |
| Agent 4 (Routes) | 13 route files (8 new, 5 modified) | 74 | 74 | 0 | 5 LOW |
| Agent 5 (UI) | campaigns page, layout, dialer, tasks | 46 | 44 | 0 | 1 LOW |
| Agent 6 (SSE/Types) | dialer-events, useDialerSSE, types, DialerProvider | 91 | 90 | 1 | 1 LOW |
| **TOTAL** | **30 files** | **364** | **355** | **7** | **1 HIGH, 3 MEDIUM, 11 LOW** |

**Zero regressions detected.** All existing functionality verified intact across all modified files.

---

### CRITICAL Issues (must fix before commit)

None.

---

### HIGH Issues (should fix before commit)

**1. [HIGH] Missing smsOptedOutAt / dncAt checks in sendColdTextToLead()**

File: `src/lib/sms-campaign-service.ts` | Line: ~209

- **Expected:** Explicit checks for `smsOptedOutAt` and `dncAt` on the Lead record before sending
- **Actual:** `sendColdTextToLead()` goes directly from the landline check to template personalization. The DNC check is delegated to `sendSMSViaProvider()`, but `smsOptedOutAt` and `dncAt` on the Lead record are never checked directly.
- **Impact:** Compliance risk — messages may be sent to leads who have opted out of SMS campaigns (`smsOptedOutAt`) or are flagged DNC on the lead record (`dncAt`). While `sendSMSViaProvider` checks the `dnc_numbers` table, it does NOT check `lead.smsOptedOutAt` or `lead.dncAt`.
- **Fix:** Add guards after the landline check:
  ```ts
  if (lead.smsOptedOutAt) { /* archive as opted_out, return */ }
  if (lead.dncAt) { /* archive as dnc, return */ }
  ```

---

### MEDIUM Issues (should fix before commit)

**2. [MEDIUM] Missing SmsCampaignMessage ↔ SmsCampaignLead relation**

File: `prisma/schema.prisma` | Line: ~1606-1619

- **Expected:** `campaignLeadId` field on SmsCampaignMessage has a `@relation` to SmsCampaignLead, and SmsCampaignLead has a back-reference `messages SmsCampaignMessage[]`
- **Actual:** `campaignLeadId` is a plain string field with no relation annotation. SmsCampaignLead has no `messages` back-reference.
- **Impact:** (1) No referential integrity — `campaignLeadId` can reference nonexistent rows. (2) No cascade delete — deleting a SmsCampaignLead leaves orphaned messages. (3) Prisma client cannot do `smsCampaignLead.messages` or `smsCampaignMessage.campaignLead` includes — any code attempting these will fail.
- **Fix:** Add `@relation` to SmsCampaignMessage.campaignLeadId and `messages SmsCampaignMessage[]` back-reference on SmsCampaignLead.

**3. [MEDIUM] sendColdTextToLead() doesn't handle send failures correctly**

File: `src/lib/sms-campaign-service.ts` | Line: ~274

- **Expected:** When `sendSMSViaProvider` returns `{ success: false }`, increment `failedCount` on the campaign and do NOT update lead stage to TEXTED.
- **Actual:** No failure handling path exists. When `sendSMSViaProvider` returns `{ success: false }`, the function still creates a SmsCampaignMessage with "failed" status but does NOT increment `failedCount`, and the lead stage still gets updated to TEXTED.
- **Impact:** Campaign `failedCount` metric will always stay at 0 regardless of failures. Leads will show TEXTED even when no text was successfully delivered. Dashboard metrics inaccurate.
- **Fix:** Check `result.success` after send — if false, increment `failedCount`, set `coldTextFailedAt`, skip the TEXTED stage update.

**4. [MEDIUM] drip-check handler doesn't update Lead.smsFunnelStage**

File: `src/worker/index.ts` | Line: ~1161-1169

- **Expected:** When archiving stale drip leads, also update `Lead.smsFunnelStage` to `'ARCHIVED'`
- **Actual:** Only updates `SmsCampaignLead.funnelStage` to ARCHIVED; does NOT update `Lead.smsFunnelStage`
- **Impact:** `Lead.smsFunnelStage` remains stale (e.g., `'OPTED_IN'` or `'DRIP_ACTIVE'`), causing data inconsistency. Any downstream logic querying `Lead.smsFunnelStage` (dashboards, filters, re-enrollment guards) will see the lead as still active.
- **Fix:** Add `prisma.lead.update({ where: { id: cl.leadId }, data: { smsFunnelStage: 'ARCHIVED' } })` in the loop.

---

### LOW Issues (fix later, non-blocking)

| # | File | Line | Issue | Impact |
|---|------|------|-------|--------|
| 5 | `sms-campaign-service.ts` | ~12 | No static import of `isDNC` — DNC check delegated to `sendSMSViaProvider` | Functional — DNC IS checked, just indirectly |
| 6 | `sms-campaign-service.ts` | ~231 | SmsCampaignMessage omits explicit `direction: 'OUTBOUND'` (relies on DB default) | Works via schema default `@default("OUTBOUND")` |
| 7 | `sms-campaign-timeline.ts` | ~14 | TimelineEntry has `type` but no `category` field (spec says "type/category") | Minor naming; `type` serves the same purpose |
| 8 | `worker/index.ts` | ~1218 | Health check hardcodes `workers: 8`, should be 10 (9 original + sms-campaign) | Cosmetic — health endpoint reports wrong count |
| 9 | `webhooks/twilio-sms-status/route.ts` | ~17 | Returns 403 on invalid signature (spec says "200 in all cases") | Correct security behavior — not a real issue |
| 10 | `webhooks/twilio/route.ts` | ~429 | RepTask only created when rep is assigned (no fallback for unassigned drip leads) | Edge case — campaign leads should always have rep |
| 11 | `preview/track/route.ts` | ~10 | BOT_UA_REGEX uses `att\.net` (too narrow for some AT&T crawlers) | May generate a few false clicks from AT&T link previews |
| 12 | `preview/cta-click/route.ts` | ~128-147 | Every CTA click increments campaign clickCount (no first-click distinction like preview/track) | Slightly inflated click metrics from repeat CTA clicks |
| 13 | `campaigns/[id]/opt-in/route.ts` | ~21 | Campaign ID from URL params is awaited but never used | Misleading URL semantics, no data risk |
| 14 | `admin/campaigns/page.tsx` | ~3 | No shadcn/ui imports — all UI built with raw HTML/Tailwind | Style consistency with other admin pages |
| 15 | `DialerProvider.tsx` | ~62, ~333 | `hotLeadNotification` state omits `phone` field (only stores leadId + companyName) | Toast can't display phone without secondary lookup |

---

### REGRESSION Risks

**None detected.** All 6 agents verified existing functionality across all modified files:

- **Schema:** All 38 original EventType values intact. All existing Lead fields (29 checked), relations (22 checked), and indexes (19 original + 2 new) preserved. No other models modified.
- **SMS Provider:** `sendSMSViaProvider()` logic unchanged — DNC check, Message logging, error handling all intact. `logInboundSMSViaProvider()` unchanged.
- **Twilio Provider:** 3-tier fromConfig logic unchanged. `parseInboundWebhook()` and `validateWebhookSignature()` unchanged.
- **Worker/Queue:** All 9 existing queues initialized. All existing getters and job helpers exported. All 9 existing workers present. Worker chain (enrichment→preview→personalization→scripts→distribution) intact. Delayed message handler, sequence jobs, monitoring jobs, import worker, scraper worker all unchanged. Health check server present.
- **Twilio Webhook:** Phone normalization, lead/client lookup, reaction detection, MMS processing, message logging, STOP handling, Close Engine routing, negative response detection, post-client routing, unknown sender handling, TwiML response — all unchanged.
- **Preview Track:** Bot UA filtering (original patterns), rate limiting, lead lookup, LeadEvent creation, dialer SSE, engagement score, organic HOT promotion — all unchanged.
- **Admin Layout:** All 16 NavLinks present in correct order. Sales Team link, Sign Out, ThemeToggle, BriefingModal all present.
- **Dialer Layout:** QueuePanel, LeadCard, CallGuidePanel, CallControls, SessionStart, SessionRecap, InboundCallBanner, AutoDialBanner all intact.
- **LeadCard:** LeadInfo, QuickStats, LiveFeed, PreviewButton, DispositionTree, CallNotes, UpsellTags, ManualCallPanel, call history, call summary banner all present.
- **Dialer Provider:** All 27+ context exports intact. CALL_STATUS and INBOUND_CALL handlers unchanged. dial(), hangup(), auto-dial state machine, session management all unchanged.
- **SSE Chain:** All 10 original event types present in dialer-events.ts, useDialerSSE.ts, and types/dialer.ts. HOT_LEAD properly threaded through all three.
- **Dialer Types:** All existing interfaces unchanged (DialerCall, DialerSession, QueueLead existing fields, CallbackItem, DispositionNode, Recommendation, UpsellTag, UpsellProduct, CallGuideContent, LiveFeedItem, DispositionOutcome).

---

### Verdict: **NEEDS 4 FIXES BEFORE COMMIT**

The build is 97.5% correct (355/364 checks pass). Zero regressions. The 4 fixes needed (1 HIGH + 3 MEDIUM) are all localized and won't cascade — each is a 5-15 line change in a single file:

1. **sms-campaign-service.ts** — Add `smsOptedOutAt` / `dncAt` guard (~5 lines)
2. **prisma/schema.prisma** — Add `campaignLeadId` relation + back-reference (~4 lines)
3. **sms-campaign-service.ts** — Add send failure handling with `failedCount` increment (~15 lines)
4. **worker/index.ts** — Add `Lead.smsFunnelStage` update in drip-check (~3 lines)

After these 4 fixes: **READY TO COMMIT.**
