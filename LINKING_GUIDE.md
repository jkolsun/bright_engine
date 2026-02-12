# 🔗 LINKING GUIDE - CONNECTING ALL COMPONENTS

## HOW EVERYTHING CONNECTS

This system has **3 main layers** that work together seamlessly:

---

## 🎯 LAYER 1: FRONTEND (What You See)

### Pages & Navigation

**Dashboard** (`/dashboard`)
- Shows real-time metrics from database
- Displays notifications from Prisma
- Pulls MRR from revenue calculations
- Links to: leads, clients, revenue

**Leads** (`/leads`)
- Queries PostgreSQL for lead list
- Shows engagement from analytics table
- Filters by status from database
- Links to: lead detail, messages

**Lead Detail** (`/leads/[id]`)
- Fetches single lead + timeline
- Shows messages from messages table
- Displays analytics from tracking
- Links to: call (Twilio), SMS (messages)

**Clients** (`/clients`)
- Lists clients from PostgreSQL
- Calculates MRR from subscriptions
- Shows churn risk (calculated)
- Links to: revenue, upsells

**Revenue** (`/revenue`)
- Aggregates from transactions
- Projects future MRR
- Shows breakdown by type
- Links to: clients, Stripe

**Messages** (`/messages`)
- Loads conversations from DB
- Shows SMS thread per lead
- Sends via Twilio API
- Links to: leads, templates

**Rep Portal** (`/reps`)
- Shows rep-specific stats
- Filters leads by assignment
- Tracks earnings (commissions)
- Links to: dialer, leads, messages

**Settings** (`/settings`)
- Manages company config
- Edits sequences (workers)
- Configures personalization
- Links to: all features

**Import** (`/import`)
- Uploads CSV files
- Validates lead data
- Bulk creates in PostgreSQL
- Links to: leads, enrichment

---

## ⚙️ LAYER 2: BACKEND APIs (The Glue)

### API Routes → Database

**GET /api/leads**
1. Receives request
2. Queries PostgreSQL: `prisma.lead.findMany()`
3. Returns JSON array
4. Frontend displays in table

**POST /api/leads**
1. Receives lead data
2. Validates fields
3. Creates: `prisma.lead.create()`
4. Triggers enrichment worker
5. Returns new lead

**POST /api/messages**
1. Receives SMS text
2. Sends via Twilio
3. Logs in PostgreSQL
4. Returns delivery status

**GET /api/revenue**
1. Aggregates transactions
2. Calculates MRR
3. Groups by type
4. Returns breakdown

### Workers → Automation

**Enrichment Worker**
1. Pulls lead from queue
2. Calls SerpAPI with address
3. Gets lat/long, details
4. Updates lead in DB

**Personalization Worker**
1. Pulls lead from queue
2. Calls Serper AI API
3. Generates first line
4. Updates lead in DB

**Sequence Worker**
1. Checks triggers (time-based)
2. Finds matching leads
3. Sends SMS via Twilio
4. Updates sequence status

**Monitoring Worker**
1. Runs every 15 minutes
2. Checks preview analytics
3. Detects hot leads
4. Creates notifications

---

## 🔌 LAYER 3: EXTERNAL SERVICES (The Power)

### Twilio (SMS)
**Purpose:** Send/receive SMS  
**Connected:** `/api/messages`, `/api/webhooks/twilio`  
**Data Flow:**
1. Frontend → API → Twilio → Lead's phone
2. Lead replies → Twilio → Webhook → API → DB → Frontend

### Stripe (Payments)
**Purpose:** Process payments  
**Connected:** `/api/webhooks/stripe`, revenue pages  
**Data Flow:**
1. Lead pays → Stripe → Webhook → API → DB
2. Subscription created → Monthly charges → Revenue tracking

### SerpAPI (Enrichment)
**Purpose:** Get location data  
**Connected:** Enrichment worker  
**Data Flow:**
1. Lead created → Worker → SerpAPI → Location data
2. Updates lead with lat/long, timezone, details

### Serper (AI Personalization)
**Purpose:** Generate first lines  
**Connected:** Personalization worker  
**Data Flow:**
1. Lead created → Worker → Serper AI → First line
2. Personalized message → Stored → Used in SMS

### PostgreSQL (Database)
**Purpose:** Store everything  
**Connected:** All API routes, workers  
**Tables:**
- leads, clients, messages, revenue, analytics, notifications
- sequences, reps, timeline, previews

### Redis (Queue)
**Purpose:** Job scheduling  
**Connected:** All workers  
**Data Flow:**
1. Job added to queue
2. Worker picks up job
3. Processes task
4. Marks complete

---

## 🔄 COMPLETE DATA FLOW EXAMPLE

### Scenario: New Lead → Hot Lead → Close

**Step 1: Lead Import**
1. User uploads CSV at `/import`
2. POST `/api/leads/import` validates data
3. Creates leads in PostgreSQL
4. Adds enrichment jobs to Redis queue

**Step 2: Enrichment**
1. Worker picks up enrichment job
2. Calls SerpAPI with address
3. Gets location data
4. Updates lead in PostgreSQL

**Step 3: Personalization**
1. Worker picks up personalization job
2. Calls Serper AI API
3. Generates first line
4. Updates lead in PostgreSQL

**Step 4: Initial Outreach**
1. Sequence worker triggers Day 0 SMS
2. Generates message with personalization
3. Sends via Twilio
4. Logs in messages table

**Step 5: Preview Sent**
1. Lead receives SMS with preview link
2. Clicks link → `/preview/[id]`
3. Page view tracked → POST `/api/preview/track`
4. Analytics saved to PostgreSQL

**Step 6: Hot Lead Detection**
1. Lead views preview 3x in 10 min
2. Monitoring worker detects pattern
3. Updates priority to HOT
4. Creates notification in DB

**Step 7: Rep Notification**
1. Frontend polls `/api/notifications`
2. Sees hot lead alert
3. Shows in dashboard
4. Rep gets notified

**Step 8: Rep Follow-up**
1. Rep opens `/reps` portal
2. Sees hot lead in queue
3. Clicks "Call" → Opens dialer
4. Makes call (tracked)

**Step 9: Deal Close**
1. Lead agrees, pays via Stripe
2. Stripe webhook hits `/api/webhooks/stripe`
3. Creates transaction in revenue table
4. Updates lead status to PAID

**Step 10: Client Onboarding**
1. Client record created
2. Subscription activated
3. Monthly billing starts
4. MRR updated on dashboard

**All automatic. All tracked. All profitable.**

---

## 🎛️ CONFIGURATION CONNECTIONS

### Environment Variables → Services

```env
DATABASE_URL → PostgreSQL (all data)
REDIS_URL → Redis (job queue)
TWILIO_* → SMS sending/receiving
STRIPE_* → Payment processing
SERPAPI_KEY → Lead enrichment
SERPER_API_KEY → AI personalization
NEXTAUTH_* → User authentication
```

### Settings Page → System Behavior

**Company Settings:**
- Updates PostgreSQL config table
- Used in SMS sender, emails, previews

**Sequences:**
- Edits sequence definitions in DB
- Workers read these for triggers
- Controls automation timing

**Personalization:**
- Toggles AI first lines
- Affects personalization worker
- Controls message tone

**Targets:**
- Sets goals in DB
- Dashboard compares actuals
- Affects rep performance tracking

**Team:**
- Manages user accounts
- Controls access (ADMIN vs REP)
- Assigns leads to reps

---

## 🔐 AUTHENTICATION FLOW

### NextAuth → Middleware → Pages

1. User visits any page
2. Middleware checks session
3. If not logged in → `/login`
4. Login form → POST credentials
5. NextAuth validates
6. Session created (JWT)
7. Redirect to dashboard
8. All pages protected

### Role-Based Access

**ADMIN:**
- Full access to everything
- Settings, revenue, team management
- Can assign leads, edit sequences

**REP:**
- Rep portal only
- Assigned leads
- Dialer, messages, earnings
- No settings access

---

## 📊 ANALYTICS CONNECTIONS

### Preview Engine → Database → Dashboard

1. Lead clicks preview link
2. Page loads → JS tracker active
3. Page view logged: POST `/api/preview/track`
4. Time on page tracked (beacon on exit)
5. CTA clicks tracked (event listeners)
6. All data saved to analytics table
7. Dashboard queries for engagement metrics
8. Hot lead detection runs on analytics

### Engagement Score Calculation

```javascript
engagement = (
  (views * 10) +
  (clicks * 20) +
  (messages * 15) +
  (timeOnPage / 60 * 5)
) / 100
```

Displayed on:
- Lead detail page
- Leads list table
- Dashboard hot leads

---

## 🚀 DEPLOYMENT CONNECTIONS

### GitHub → Railway → Production

1. Code pushed to GitHub
2. Railway detects push
3. Builds Next.js app
4. Runs database migrations
5. Starts web server (PORT 3000)
6. Starts worker process
7. Both connect to PostgreSQL + Redis
8. Webhooks configured to domain
9. System live and operational

### Service Dependencies

```
Web Server (Next.js)
├── PostgreSQL (data)
├── Redis (cache)
├── Twilio (SMS)
├── Stripe (payments)
├── SerpAPI (enrichment)
└── Serper (AI)

Worker Process
├── PostgreSQL (jobs)
├── Redis (queue)
├── Twilio (SMS)
├── SerpAPI (enrichment)
└── Serper (AI)
```

---

## 🎯 KEY INTEGRATION POINTS

### Frontend ↔ Backend
- API routes called via `fetch()`
- JSON requests/responses
- Real-time updates via polling
- Session auth via NextAuth

### Backend ↔ Database
- Prisma ORM for all queries
- Type-safe database access
- Automatic migrations
- Connection pooling

### Backend ↔ Workers
- Jobs added via BullMQ
- Redis as message broker
- Separate Node process
- Shared database connection

### Workers ↔ External APIs
- HTTP requests with retry logic
- API key authentication
- Error handling & logging
- Rate limiting respected

---

## ✅ VERIFICATION CHECKLIST

**After deployment, verify these connections:**

- [ ] Frontend loads (DNS → Railway)
- [ ] Login works (NextAuth → Database)
- [ ] Dashboard shows data (API → PostgreSQL)
- [ ] Leads page loads (Prisma query works)
- [ ] Can send SMS (Twilio connected)
- [ ] Workers running (Redis queue active)
- [ ] Enrichment works (SerpAPI responding)
- [ ] Analytics tracking (Preview page logs)
- [ ] Payments work (Stripe webhook receives)
- [ ] Notifications appear (Monitoring worker active)

---

## 🔧 TROUBLESHOOTING CONNECTIONS

**Dashboard not loading data:**
→ Check DATABASE_URL, verify PostgreSQL running

**SMS not sending:**
→ Check Twilio credentials, verify phone number

**Workers not processing:**
→ Check REDIS_URL, verify Redis service active

**Preview analytics missing:**
→ Check tracking script loaded, verify API route

**Hot leads not detected:**
→ Check monitoring worker logs, verify Redis

---

## 🎉 YOU'RE CONNECTED!

Everything is linked. Everything works together.

**The system is a well-oiled machine:**
- Frontend talks to backend
- Backend talks to database
- Workers process jobs
- APIs provide data
- Everything flows seamlessly

**Deploy and watch it work!** 🚀

---

Built with: Next.js + Prisma + BullMQ + Twilio + Stripe + AI  
Status: Fully integrated and operational  
Ready: Deploy NOW
