# ✅ COMPLETE TESTING CHECKLIST

**Use this to verify every system component works perfectly**

---

## 🧪 PRE-DEPLOYMENT TESTING

### Environment Setup (5 minutes)

**1. Dependencies**
```bash
cd bright-automations-platform
npm install
```
- [ ] No errors during install
- [ ] All packages installed successfully
- [ ] bcryptjs package present

**2. Environment Variables**
```bash
cp .env.example .env
# Edit .env with your values
```
- [ ] DATABASE_URL set
- [ ] REDIS_HOST, REDIS_PORT, REDIS_PASSWORD set
- [ ] TWILIO credentials set
- [ ] STRIPE keys set
- [ ] SERPAPI_KEY set
- [ ] SERPER_API_KEY set
- [ ] NEXTAUTH_SECRET generated (openssl rand -base64 32)
- [ ] BASE_URL set
- [ ] ADMIN_EMAIL and ADMIN_PASSWORD set

**3. Database**
```bash
npm run db:generate
npm run db:push
```
- [ ] Prisma client generated
- [ ] All 15 tables created
- [ ] No migration errors

**4. Build Test**
```bash
npm run build
```
- [ ] Build succeeds
- [ ] No TypeScript errors
- [ ] No ESLint errors

---

## 🚀 LOCAL TESTING

### Start Services (2 terminals)

**Terminal 1: Web Server**
```bash
npm run dev
```
- [ ] Server starts on port 3000
- [ ] No console errors
- [ ] "Ready" message appears

**Terminal 2: Worker**
```bash
npm run worker
```
- [ ] All 4 workers start
- [ ] Redis connection succeeds
- [ ] No startup errors

---

## 🔐 AUTHENTICATION TESTING

### Login Flow

**1. Access Login Page**
- [ ] Visit http://localhost:3000
- [ ] Redirects to /login
- [ ] Login form displays

**2. Invalid Login**
- [ ] Enter wrong email
- [ ] Error message shows
- [ ] Does NOT login

**3. Valid Login**
- [ ] Enter ADMIN_EMAIL and ADMIN_PASSWORD
- [ ] Redirects to /admin/dashboard
- [ ] No console errors

**4. Session Persistence**
- [ ] Refresh page
- [ ] Still logged in
- [ ] Dashboard loads

**5. Navigation**
- [ ] Click Leads - page loads
- [ ] Click Clients - page loads
- [ ] Click Revenue - page loads
- [ ] All sidebar links work

**6. Logout**
- [ ] Click Sign Out
- [ ] Redirects to /login
- [ ] Cannot access /admin/dashboard without login

---

## 📊 API TESTING

### Leads API

**Create Lead**
```bash
curl -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "Lead",
    "phone": "+15551234567",
    "companyName": "Test Roofing Co",
    "industry": "ROOFING",
    "city": "Austin",
    "state": "TX",
    "source": "COLD_EMAIL",
    "email": "test@example.com"
  }'
```
- [ ] Returns 200 status
- [ ] Returns lead object with id
- [ ] previewId generated
- [ ] previewUrl generated

**List Leads**
```bash
curl http://localhost:3000/api/leads
```
- [ ] Returns array of leads
- [ ] Test lead appears in list
- [ ] Pagination info included

**Get Lead Detail**
```bash
curl http://localhost:3000/api/leads/[LEAD_ID]
```
- [ ] Returns full lead object
- [ ] Includes events array
- [ ] Includes messages array

**Check Worker Processing**
- [ ] Terminal 2 shows "Processing enrichment job"
- [ ] Terminal 2 shows "Processing personalization job"
- [ ] No worker errors

---

### Messages API

**Send SMS**
```bash
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+15551234567",
    "message": "Test SMS from Bright Automations",
    "leadId": "[LEAD_ID]",
    "sender": "admin",
    "trigger": "test"
  }'
```
- [ ] Returns 200 status
- [ ] Twilio dashboard shows SMS sent
- [ ] Message logged to database

**Get Messages**
```bash
curl "http://localhost:3000/api/messages?leadId=[LEAD_ID]"
```
- [ ] Returns message history
- [ ] Test message appears

---

### Preview API

**Get Preview Data**
```bash
curl http://localhost:3000/api/preview/[PREVIEW_ID]
```
- [ ] Returns lead data
- [ ] Lead priority changed to HOT
- [ ] Event logged

**Visit Preview Page**
- [ ] Open http://localhost:3000/preview/[PREVIEW_ID] in browser
- [ ] Page renders with lead data
- [ ] Company name displays
- [ ] Phone number displays
- [ ] Services show (if enriched)
- [ ] Mobile responsive
- [ ] Sticky banner shows "$149 to go live"

**Track Analytics**
- [ ] Stay on page for 10+ seconds
- [ ] Click CTA button
- [ ] Click call button
- [ ] Check Terminal 2 for "HOT_LEAD" event
- [ ] Dashboard should show hot lead notification

---

### Revenue API

**Get Revenue Summary**
```bash
curl http://localhost:3000/api/revenue
```
- [ ] Returns MRR breakdown
- [ ] Returns period revenue
- [ ] Returns by-type breakdown
- [ ] Calculations correct

---

### Pipeline API

**Get Pipeline Stats**
```bash
curl http://localhost:3000/api/pipeline
```
- [ ] Returns stage counts
- [ ] Returns conversion metrics
- [ ] Math checks out

---

## 🔗 WEBHOOK TESTING

### Twilio Webhook

**Send Test SMS to Twilio Number**
- [ ] Send SMS to your Twilio number
- [ ] Check Terminal 1 logs
- [ ] Webhook received
- [ ] Message logged to database
- [ ] Lead messages updated

**Escalation Test**
- [ ] Send SMS with word "refund"
- [ ] Check logs for escalation flag
- [ ] Notification created

### Stripe Webhook (Local Testing)

**Install Stripe CLI**
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

**Trigger Test Event**
```bash
stripe trigger checkout.session.completed
```
- [ ] Webhook received
- [ ] Event logged
- [ ] No errors

---

## 🎨 FRONTEND TESTING

### Dashboard Page

**Visit /admin/dashboard**
- [ ] Pipeline section loads
- [ ] Shows stage counts
- [ ] MRR ticker displays
- [ ] Today's numbers show
- [ ] Notification feed visible
- [ ] All widgets render
- [ ] No console errors

### Leads List

**Visit /admin/leads**
- [ ] Table loads
- [ ] Test lead appears
- [ ] Status badges show
- [ ] Stats cards display
- [ ] Click "View" on a lead

### Lead Detail

**Visit /admin/leads/[ID]**
- [ ] Contact info displays
- [ ] Preview URL link works
- [ ] Timeline shows events
- [ ] Messages display
- [ ] Enrichment status shows
- [ ] Quick actions visible
- [ ] No console errors

### Clients List

**Visit /admin/clients**
- [ ] Table loads (empty for now)
- [ ] Stats cards show zeros
- [ ] No errors with empty data

### Revenue Page

**Visit /admin/revenue**
- [ ] MRR card displays
- [ ] Metrics cards show
- [ ] Charts render
- [ ] Recent transactions (empty ok)
- [ ] No console errors

---

## 🛠️ WORKER TESTING

### Enrichment Worker

**Verify Processing**
- [ ] Check Terminal 2 logs
- [ ] "Processing enrichment job" appears
- [ ] Job completes successfully
- [ ] Lead enriched data populated (check database or lead detail)

### Personalization Worker

**Verify Processing**
- [ ] "Processing personalization job" appears
- [ ] Job completes
- [ ] Lead has personalization text

### Sequence Worker (Manual Test)

**Queue Test Job**
```bash
# In Node REPL or create test script
const { addSequenceJob } = require('./src/worker/queue')
addSequenceJob('test-sequence', { clientId: 'test' })
```
- [ ] Worker picks up job
- [ ] Processes without error

### Monitoring Worker

**Hot Lead Check**
- [ ] Worker runs every 15 min
- [ ] Checks preview_events table
- [ ] Creates notifications for hot leads
- [ ] No duplicate notifications

---

## 🔒 SECURITY TESTING

### Rate Limiting

**Test Message Endpoint**
```bash
# Send 25 requests rapidly
for i in {1..25}; do
  curl -X POST http://localhost:3000/api/messages \
    -H "Content-Type: application/json" \
    -d '{"to":"+15551234567","message":"Test '$i'"}' &
done
```
- [ ] First 20 succeed
- [ ] Requests 21-25 return 429 (Too Many Requests)
- [ ] Error message: "Too many requests"

**Test Login Rate Limit**
- [ ] Try logging in 6 times with wrong password
- [ ] 6th attempt should be rate limited
- [ ] Wait 5 minutes, try again - should work

### Webhook Signature Validation

**Twilio (Production Only)**
- [ ] Invalid signature returns 403
- [ ] Valid signature processes

**Stripe**
- [ ] Invalid signature returns 400
- [ ] Valid signature processes

---

## 📱 MOBILE TESTING

### Preview Page on Mobile

**Open preview URL on phone**
- [ ] Layout responsive
- [ ] Text readable
- [ ] Buttons large enough
- [ ] Click-to-call works
- [ ] CTA button accessible
- [ ] Banner sticky
- [ ] Photos load

### Admin Portal on Mobile

**Open dashboard on phone**
- [ ] Sidebar accessible
- [ ] Cards stack vertically
- [ ] Stats readable
- [ ] Tables scroll horizontally
- [ ] Touch targets adequate

---

## 🔄 INTEGRATION TESTING

### End-to-End Lead Flow

**1. Import Lead**
- [ ] Create via API or admin UI
- [ ] Lead appears in dashboard

**2. Wait for Enrichment**
- [ ] Check Terminal 2 (15-30 seconds)
- [ ] Enrichment job completes
- [ ] Personalization job completes

**3. View Preview**
- [ ] Copy preview URL from lead detail
- [ ] Open in incognito browser
- [ ] Page renders with enriched data
- [ ] Analytics track

**4. Check Hot Lead**
- [ ] Wait 30 seconds on preview page
- [ ] Click CTA button
- [ ] Go back to dashboard
- [ ] Notification should appear
- [ ] Lead priority should be HOT

**5. Send SMS**
- [ ] From lead detail, send SMS
- [ ] SMS delivers
- [ ] Message logged

**6. Receive Reply**
- [ ] Reply to SMS from phone
- [ ] Webhook receives
- [ ] Message logged
- [ ] Shows in lead detail

---

## 🧹 CLEANUP TESTING

### Graceful Shutdown

**Terminal 2 (Worker)**
- [ ] Press Ctrl+C
- [ ] "Shutting down workers gracefully" message
- [ ] Workers close
- [ ] Redis connection closes
- [ ] No error messages

**Terminal 1 (Web)**
- [ ] Press Ctrl+C
- [ ] Server stops cleanly

---

## 📊 STRESS TESTING

### Bulk Lead Import

**Create 100 test leads**
```bash
# Create import script or use API in loop
for i in {1..100}; do
  curl -X POST http://localhost:3000/api/leads -H "Content-Type: application/json" -d "{"firstName":"Lead$i",...}" 
done
```
- [ ] All leads created
- [ ] Workers process all enrichment jobs
- [ ] No memory issues
- [ ] Dashboard loads with 100+ leads

### Concurrent Requests

**Send 50 simultaneous API calls**
- [ ] System handles load
- [ ] No 500 errors
- [ ] Response times <1 second

---

## ✅ FINAL CHECKS

### Code Quality
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] No TypeScript errors
- [ ] No console warnings

### Documentation
- [ ] README.md is accurate
- [ ] SETUP.md has all steps
- [ ] DEPLOY_NOW.md is complete
- [ ] SYSTEM_AUDIT.md documents issues

### Configuration
- [ ] .env.example has all variables
- [ ] .gitignore includes .env
- [ ] package.json has all dependencies

### Database
- [ ] All tables exist
- [ ] Indexes created
- [ ] Foreign keys work
- [ ] Cascading deletes configured

### Files
- [ ] No TODO comments
- [ ] No console.log in production paths
- [ ] No hardcoded secrets
- [ ] No debug code left

---

## 🎯 DEPLOYMENT READINESS

### Checklist
- [ ] All tests above pass
- [ ] No blocking issues
- [ ] Documentation complete
- [ ] Environment variables documented
- [ ] Error handling present
- [ ] Logging configured
- [ ] Security hardened
- [ ] Performance acceptable

### Go/No-Go Decision

**GO if:**
- ✅ All critical tests pass
- ✅ No P0/P1 bugs
- ✅ Security measures in place
- ✅ Documentation complete

**NO-GO if:**
- ❌ Authentication broken
- ❌ Database connection fails
- ❌ Workers not processing
- ❌ Critical security issue

---

## 📞 POST-DEPLOYMENT VERIFICATION

**After deploying to Railway:**

### Smoke Test (5 minutes)
- [ ] Visit production URL
- [ ] Login works
- [ ] Dashboard loads
- [ ] Create test lead
- [ ] Preview URL works
- [ ] Send test SMS
- [ ] Check worker logs in Railway

### Monitor (First Hour)
- [ ] Check Railway logs every 15 min
- [ ] Watch for errors
- [ ] Verify webhooks receiving
- [ ] Test critical paths

### Validate (First 24 Hours)
- [ ] Import real leads
- [ ] Send cold emails with previews
- [ ] Monitor hot lead notifications
- [ ] Check SMS delivery rate
- [ ] Verify enrichment quality

---

**TESTING STATUS:** ✅ READY TO TEST

**Follow this checklist step-by-step before deploying.**
**Document any failures and fix before proceeding.**

**Estimated Testing Time:** 2-3 hours for complete checklist
**Critical Path Only:** 30 minutes

**🚀 After all tests pass → Deploy with confidence!**
