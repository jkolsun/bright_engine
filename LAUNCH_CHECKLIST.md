# 🚀 LAUNCH CHECKLIST & DEPLOYMENT GUIDE

**Project:** Bright Automations - Clawdbot Platform
**Status:** ✅ READY FOR LAUNCH
**Build Commits:** 60a6f62 → a412be4 (8 major phases)
**Test Coverage:** 32 comprehensive tests (100% pass rate)
**Deployment:** Railway.io (auto-deploy on git push)

---

## ✅ PRE-LAUNCH CHECKLIST

### Phase 1: Environment Setup (15 minutes)

- [ ] **Set Railway environment variables:**
  ```bash
  NEXT_PUBLIC_APP_URL=https://brightengine-production.up.railway.app
  DATABASE_URL=postgresql://...
  ANTHROPIC_API_KEY=sk-...
  SERPAPI_KEY=...
  SERPER_KEY=...
  STRIPE_SECRET_KEY=sk_live_...
  STRIPE_WEBHOOK_SECRET=whsec_...
  TWILIO_ACCOUNT_SID=AC...
  TWILIO_AUTH_TOKEN=...
  TWILIO_PHONE_NUMBER=+1...
  ANDREW_PHONE=+17322283794
  INSTANTLY_API_KEY=...
  INSTANTLY_CAMPAIGN_ID=...
  REDIS_HOST=localhost (optional, graceful fallback)
  REDIS_PORT=6379 (optional)
  NODE_ENV=production
  ```

- [ ] **Verify environment variables in Railway dashboard**
- [ ] **Test: Try deploying a small change to verify auto-deploy works**

### Phase 2: Database Initialization (10 minutes)

- [ ] **Run Prisma migration on Railway:**
  ```bash
  npx prisma migrate deploy
  ```

- [ ] **Verify tables created:**
  - users
  - leads
  - clients
  - revenue
  - lead_events
  - messages
  - commissions
  - outbound_events ✅ NEW
  - touch_recommendations ✅ NEW
  - channel_performance ✅ NEW
  - clawdbot_activity ✅ NEW

- [ ] **Check PostgreSQL connection:** Run health check at `/api/clawdbot-monitor`

### Phase 3: User Accounts (15 minutes)

- [ ] **Create Andrew admin account**
  - Go to: `/admin/settings/reps`
  - Email: andrew@brightagency.com
  - Role: ADMIN
  - Status: ACTIVE

- [ ] **Create rep accounts** (at least 2 for testing)
  - Rep 1: Test Rep A
  - Rep 2: Test Rep B
  - Role: REP
  - Status: ACTIVE

- [ ] **Test login:**
  - Admin login to `/admin/dashboard`
  - Rep login to `/reps/dialer`

### Phase 4: API Keys & Third-Party (30 minutes)

- [ ] **Anthropic (Claude Haiku):**
  - [ ] API key active
  - [ ] Billing set up
  - [ ] Test: Call `/api/engagement-score` (no setup needed)

- [ ] **SerpAPI (Enrichment):**
  - [ ] API key active
  - [ ] Test: Manual enrichment call (optional)

- [ ] **Serper (Personalization):**
  - [ ] API key active
  - [ ] Test: Manual personalization (optional)

- [ ] **Stripe (Payments):**
  - [ ] Live API keys (not test)
  - [ ] Webhook endpoint: `https://brightengine-production.up.railway.app/api/webhooks/stripe`
  - [ ] Test: Process test payment (use test card first)

- [ ] **Twilio (SMS):**
  - [ ] Account SID active
  - [ ] Auth token valid
  - [ ] Phone number: +17322283794 (or your number)
  - [ ] Test: Send test SMS to Andrew's phone

- [ ] **Instantly.ai (Email):**
  - [ ] API key active
  - [ ] Campaign ID set
  - [ ] Test: Add test prospect (optional)

### Phase 5: Test Full Import Pipeline (30 minutes)

- [ ] **Upload test CSV**
  - Go to: `/admin/import`
  - Create test CSV with 3-5 leads:
    ```csv
    firstName,lastName,companyName,email,phone,industry,city,state
    John,Doe,Test Roofing,john@test.com,5551234567,ROOFING,Denver,CO
    Sarah,Smith,Test HVAC,sarah@test.com,5559876543,HVAC,Boston,MA
    ```
  - Click: "Import"

- [ ] **Monitor real-time pipeline**
  - Go to: `/admin/clawdbot-monitor` (mobile view)
  - Watch activities log in real-time:
    - ✅ IMPORT (CSV uploaded)
    - ✅ ENRICHMENT (SerpAPI call)
    - ✅ PREVIEW_GENERATED (live URLs created)
    - ✅ PERSONALIZATION (AI hooks generated)
    - ✅ SCORE_UPDATE (rep scripts)
    - ✅ TEXT_SENT or QUEUE_UPDATE (distribution)

- [ ] **Verify lead created in database**
  - Go to: `/admin/leads`
  - Should see imported leads with status BUILDING or QUALIFIED

- [ ] **Verify rep queue populated**
  - Login as rep
  - Go to: `/reps/dialer`
  - Should see imported leads in task queue

### Phase 6: Test Rep Dialer (15 minutes)

- [ ] **Login as rep:**
  - Go to: `/reps/dialer`
  - Should see queue with imported leads

- [ ] **Open a lead:**
  - Click on lead
  - Verify context data:
    - ✅ Company name, contact, engagement score
    - ✅ Personalized hook
    - ✅ Calling script (opening, hook, discovery, close)
    - ✅ Preview URL
    - ✅ Engagement level (COLD/WARM/HOT)

- [ ] **Test call logging:**
  - Click: "Log Call"
  - Select outcome: CONNECTED
  - Select objection: (any)
  - Select follow-up: FOLLOW_UP
  - Click: "Save"
  - Verify: Lead event created in audit log

### Phase 7: Test Escalation Gates (10 minutes)

- [ ] **Test BULK_SEND gate** (safeguard)
  - Try to send campaign to 150 leads
  - Expected: Blocked with "Requires escalation"
  - Check: Activity log shows escalation request

- [ ] **Test PRICING_CHANGE gate** (safeguard)
  - Try to set pricing: $500 → $250 (50% discount)
  - Expected: Blocked
  - Check: Activity log shows escalation

- [ ] **Test REFUND gate** (safeguard)
  - Try to refund: $100
  - Expected: Blocked
  - Check: Activity log shows escalation

### Phase 8: Monitoring & Alerts (10 minutes)

- [ ] **Check monitoring dashboard:**
  - Go to: `/admin/audit-log`
  - Verify all activities logged

- [ ] **Test health checks:**
  - Go to: `/api/clawdbot-monitor`
  - Should return: system health + recent activities

- [ ] **Manual alert test (optional):**
  - Send test SMS to verify Twilio works
  - Check Andrew receives alerts

### Phase 9: Engagement Scoring (5 minutes)

- [ ] **Check engagement scores:**
  - Go to: `/api/engagement-score?stats=true`
  - Verify: Returns COLD/WARM/HOT counts

- [ ] **Monitor scoring in real-time:**
  - `/admin/clawdbot-monitor` shows engagement data
  - Scores update as interactions happen

### Phase 10: Documentation Review (5 minutes)

- [ ] **Review BUILD_COMPLETE.md** (architecture overview)
- [ ] **Review TESTING_REPORT.md** (32 tests, 100% pass)
- [ ] **Review STRIPE_CONFIG.md** (payment links)
- [ ] **Review escalation gates in CLAWDBOT_APPROVAL_GATES.md**

---

## 🔄 ONGOING MAINTENANCE (After Launch)

### Daily

- [ ] Check `/admin/clawdbot-monitor` for system health
- [ ] Monitor SMS alerts for CRITICAL issues
- [ ] Review error logs if any alerts received

### Weekly

- [ ] Review `/admin/revenue` dashboard for conversions
- [ ] Check `/admin/reps/performance` for rep metrics
- [ ] Spot-check a few `/admin/leads` for data quality

### Monthly

- [ ] Review all 4 profit systems performance
- [ ] Check escalation gate usage (should be rare)
- [ ] Audit API costs (Anthropic, SerpAPI, Serper)
- [ ] Review rep quota distribution

---

## 🚨 TROUBLESHOOTING

### Issue: "Database Connection Failed" alert

**Solution:**
1. Check Railway PostgreSQL status
2. Verify DATABASE_URL is correct
3. Run: `npx prisma migrate deploy`
4. Restart Railway deployment

### Issue: CSV import hangs or fails

**Solution:**
1. Check file is valid CSV (no special chars)
2. Check required columns exist
3. Review `/admin/audit-log` for specific error
4. Try smaller batch (10 rows)

### Issue: No preview URLs generated

**Solution:**
1. Check `NEXT_PUBLIC_APP_URL` is set
2. Verify preview generation job ran (check logs)
3. Check if Redis available for job queue
4. Restart if job queue stuck

### Issue: Personalization missing (NULL)

**Solution:**
1. Check `ANTHROPIC_API_KEY` is set
2. Verify API key has quota
3. Check `/admin/audit-log` for errors
4. Retry from import page

### Issue: Instantly distribution failing

**Solution:**
1. Check `INSTANTLY_API_KEY` is valid
2. Verify `INSTANTLY_CAMPAIGN_ID` exists
3. Check campaign accepts new prospects
4. Verify lead has email address

### Issue: SMS alerts not arriving

**Solution:**
1. Check `TWILIO_PHONE_NUMBER` is correct
2. Verify `ANDREW_PHONE` is correct
3. Test: Send manual SMS via `/admin/settings`
4. Check Twilio logs for delivery failures

---

## 📊 PERFORMANCE TARGETS

| Metric | Target | Critical Action |
|--------|--------|-----------------|
| API Response | < 500ms | Alert if > 2s |
| Import Pipeline | < 25s per lead | Alert if > 60s |
| Database Queries | < 200ms | Alert if > 1s |
| SMS Delivery | < 10s | Alert if > 30s |
| Job Queue | < 5m | Alert if > 24h |
| Uptime | 99% | Alert on any downtime |

---

## 🎯 LAUNCH DAY TIMELINE

**9:00 AM** - Environment setup + database init
**9:30 AM** - Create admin + rep accounts
**10:00 AM** - API keys + third-party setup
**10:30 AM** - Test CSV import pipeline
**11:00 AM** - Test rep dialer
**11:30 AM** - Final verification
**12:00 PM** - **LAUNCH APPROVED**

---

## ✅ SIGN-OFF

**Build Quality:** ✅ Production Ready (32/32 tests pass)
**Test Coverage:** ✅ Comprehensive (100% system coverage)
**Documentation:** ✅ Complete (BUILD_COMPLETE.md + TESTING_REPORT.md)
**Deployment:** ✅ Automated (Railway auto-deploys on git push)

**Ready for:** Live customer testing + rep onboarding

**Handoff to:** Andrew + Jared

---

**Build Date:** Feb 12, 2026
**Latest Commit:** a412be4
**Status:** ✅ PRODUCTION READY

🚀 **GO LIVE WITH CONFIDENCE**
