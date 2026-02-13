# LOCAL TEST SUITE - COMPREHENSIVE SYSTEM VALIDATION

**Status:** READY FOR TESTING (awaiting DATABASE_URL setup)
**Last Updated:** 2026-02-12 22:55 EST

## PREREQUISITE: Setup Local Environment

1. **Get DATABASE_URL from Railway:**
   - Go to Railway.app → PostgreSQL service → Connect tab
   - Copy the Internal PostgreSQL URL
   
2. **Create .env.local:**
   ```bash
   # In project root:
   cp .env.example .env.local
   # Edit .env.local and replace DATABASE_URL with the Railway PostgreSQL URL
   ```

3. **Start dev server:**
   ```bash
   npm run dev
   ```

---

## TEST SUITE: Systems to Validate

### 1. ENGAGEMENT SCORING SYSTEM ✅ BUILT
**File:** `src/lib/engagement-scoring.ts`  
**Test endpoint:** `GET /api/test/engagement-score`

**Test cases:**
- [ ] Create lead with no events → COLD (score 0)
- [ ] Add preview view → WARM (score increases)
- [ ] Add email reply → HOT (score increases further)
- [ ] Add conversion signal → HOT (score maximized)
- [ ] Verify trend detection (up/down/flat)
- [ ] Verify recency decay (older events worth less)

**Expected behavior:**
```json
{
  "status": "ok",
  "message": "Engagement scoring system working",
  "tests": [
    {
      "name": "COLD score (no events)",
      "pass": true
    },
    {
      "name": "WARM score (after preview view)",
      "pass": true
    },
    {
      "name": "HOT score (after email reply)",
      "pass": true
    }
  ],
  "allTestsPassed": true
}
```

---

### 2. CSV IMPORT PIPELINE ✅ BUILT
**File:** `src/lib/csv-parser.ts`  
**Test endpoint:** `GET /api/test/csv-import`

**Test cases:**
- [ ] Valid CSV upload → creates leads
- [ ] Invalid phone numbers → rejected
- [ ] Duplicate emails → rejected or merged
- [ ] Missing required fields → error handling
- [ ] 100+ leads batch → performance check
- [ ] SerpAPI enrichment → company data attached
- [ ] Preview URLs → generated and live

**Expected behavior:**
- Valid leads: created in database
- Invalid rows: logged in error response
- Enrichment: completed within 5 seconds per lead
- Previews: URLs are valid and accessible

---

### 3. PROFIT SYSTEMS ✅ BUILT
**File:** `src/lib/profit-systems.ts`  
**Test endpoint:** `GET /api/test/profit-systems`

**Test cases - URGENCY:**
- [ ] Day 3 after preview → correct message
- [ ] Day 5 after preview → correct message
- [ ] Day 14 after preview → correct message

**Test cases - ANNUAL HOSTING:**
- [ ] At checkout → pitch shown
- [ ] Month 3 of subscription → upsell triggered
- [ ] Already annual → skip pitch

**Test cases - DYNAMIC UPSELLS:**
- [ ] GBP eligible → show GBP upsell
- [ ] Social eligible → show Social upsell
- [ ] Reviews eligible → show Reviews upsell
- [ ] SEO eligible → show SEO upsell

**Test cases - REFERRALS:**
- [ ] Month 3 reached → auto-generate reward
- [ ] Reward amount correct → $200 for annual, $50 for monthly

**Expected behavior:**
```json
{
  "status": "ok",
  "urgency": { "day3": "correct message", "day14": "correct message" },
  "annualHosting": { "checkout": true, "month3": true },
  "dynamicUpsells": { "gbp": true, "social": true, "reviews": true, "seo": true },
  "referrals": { "month3AutoReward": true, "amountCorrect": true }
}
```

---

### 4. ESCALATION GATES ✅ BUILT
**File:** `src/lib/escalation-gates.ts`  
**Test endpoint:** `GET /api/test/escalation-gates`

**10 gates to validate:**
- [ ] SITE_PUBLICATION → requires approval
- [ ] REFUND → requires approval
- [ ] PRICING → requires approval (>50% discount)
- [ ] ANGRY_CLIENT → requires approval
- [ ] LEAD_DELETION → requires approval
- [ ] STRIPE_REFUND → requires approval
- [ ] BULK_SEND → requires approval (>100 leads)
- [ ] TIMELINE_OVERRIDE → requires approval (>30 days change)
- [ ] EXTERNAL_DATA_IMPORT → requires approval
- [ ] SYSTEM_RULE_CHANGE → requires approval

**Test cases:**
- [ ] Gate 1: Try without approval → blocked ❌
- [ ] Gate 2: Request approval → pending 🔄
- [ ] Gate 3: With approval → allowed ✅
- [ ] Gate 4: Deny approval → rejected ❌
- [ ] Verify all 10 gates enforce → unbypassable

**Expected behavior:**
```json
{
  "status": "ok",
  "gates": {
    "SITE_PUBLICATION": { "enforced": true },
    "REFUND": { "enforced": true },
    "PRICING": { "enforced": true },
    ...
  },
  "allGatesEnforced": true
}
```

---

### 5. REP INTELLIGENCE ✅ BUILT
**File:** `src/lib/rep-queue.ts`  
**Test endpoint:** `GET /api/test/rep-queue`

**Test cases:**
- [ ] Dialer queue prioritizes by (URGENT > HIGH > MEDIUM > LOW, then HOT > WARM > COLD)
- [ ] Lead context includes: company, contact, engagement score, script, preview
- [ ] Call logging creates event
- [ ] Follow-up tracking updates next action
- [ ] Rep can view personal queue

**Expected behavior:**
```json
{
  "status": "ok",
  "queue": [
    {
      "leadId": "...",
      "priority": "URGENT",
      "engagement": "HOT",
      "action": "CALL_ASAP"
    }
  ],
  "context": {
    "company": "...",
    "contact": "...",
    "engagementScore": 85,
    "script": "...",
    "previewUrl": "..."
  }
}
```

---

### 6. MONITORING & ALERTS ✅ BUILT
**File:** `src/lib/monitoring.ts`  
**Test endpoint:** `GET /api/test/monitoring`

**Test cases:**
- [ ] Database connectivity check
- [ ] Redis availability detection
- [ ] Error rate calculation
- [ ] Stuck job detection
- [ ] Failed payment alerts
- [ ] Rep quota violations
- [ ] SMS alert delivery to +17322283794

**Expected behavior:**
```json
{
  "status": "ok",
  "database": "connected",
  "redis": "available",
  "errorRate": "1.2%",
  "stuckJobs": 0,
  "failedPayments": 0,
  "repQuotaViolations": 0,
  "alertsSent": 1
}
```

---

### 7. AUTOMATED DIGESTS ✅ BUILT
**File:** `src/lib/digest-reports.ts`  
**Test endpoint:** `GET /api/test/digest-reports`

**Test cases:**
- [ ] Nightly 9 PM digest generates
- [ ] Morning 9 AM report generates
- [ ] Sunday 6 PM weekly digest generates
- [ ] SMS delivery to +17322283794
- [ ] Content includes: new leads, conversions, revenue, alerts

**Expected behavior:**
```json
{
  "status": "ok",
  "nightly": { "generated": true, "sent": true },
  "morning": { "generated": true, "sent": true },
  "weekly": { "generated": true, "sent": true },
  "messageContent": "..."
}
```

---

## TESTING INSTRUCTIONS

### 1. Set up environment:
```bash
# Copy DATABASE_URL from Railway PostgreSQL service
cp .env.example .env.local
# Edit .env.local with the actual DATABASE_URL value
```

### 2. Start dev server:
```bash
npm run dev
```

### 3. Test each endpoint:
```bash
curl http://localhost:3001/api/test/engagement-score
curl http://localhost:3001/api/test/csv-import
curl http://localhost:3001/api/test/profit-systems
curl http://localhost:3001/api/test/escalation-gates
curl http://localhost:3001/api/test/rep-queue
curl http://localhost:3001/api/test/monitoring
curl http://localhost:3001/api/test/digest-reports
```

### 4. Review outputs:
- All endpoints should return `"status": "ok"`
- All internal tests should have `"pass": true`
- All summarized fields should show `"allTestsPassed": true` or similar

### 5. Report back:
Once all tests pass, report:
```
✅ ALL SYSTEMS TESTED & VALIDATED

Engagement Scoring: PASS
CSV Import: PASS
Profit Systems: PASS
Escalation Gates: PASS
Rep Intelligence: PASS
Monitoring: PASS
Digests: PASS

Ready for approval and deployment.
```

---

## NEXT STEPS AFTER APPROVAL

Once testing is complete and approved:
1. Commit all test endpoints
2. Deploy to Railway
3. Run tests against live Railway environment
4. Monitor for 24 hours before full launch
5. Gradual rollout to live reps

---

**Status:** BLOCKED ON DATABASE_URL SETUP
**Action Required:** Provide DATABASE_URL from Railway PostgreSQL service

