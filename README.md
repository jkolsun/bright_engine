# Bright Automations Platform

Complete operations platform for Bright Automations website business.

## Features

### Control Center (Admin Portal)
- **Pipeline Dashboard**: Visual funnel showing lead count at each stage
- **Hot Leads Queue**: Real-time feed of prospects engaging with previews
- **Today's Numbers**: Daily stats dashboard
- **MRR Ticker**: Current MRR broken down by hosting + upsells
- **Notification Feed**: Unified alerts for hot leads, payments, escalations
- **Lead Detail View**: Full journey timeline for each prospect
- **Revenue Dashboard**: MRR trends, breakdown by product, churn tracking
- **Rep Scoreboard**: Leaderboard and activity tracking
- **Client Health**: Churn risk scoring and proactive monitoring

### Preview Engine
- Generate personalized website previews from enriched lead data
- SerpAPI enrichment: pulls photos, reviews, hours, address
- Serper personalization: AI-generated first lines
- Analytics tracking: time on page, CTA clicks, return visits
- 7-day expiration with automated reminders

### Rep Portal
- **Dashboard**: Daily targets, callbacks due, earnings
- **Dialer**: Single-lead focus view with keyboard shortcuts
- **My Leads**: Assigned leads with filters
- **Callbacks**: Overdue and scheduled management
- **Earnings**: Commission tracking and leaderboard

### Automation (Clawdbot Integration)
- **Lead qualification**: 3-question conversational flow via SMS
- **Info collection**: Automated nudges for logo/photos/services
- **Site build pipeline**: From template selection to QA to live
- **Post-launch sequences**: Day 3, 7, 14, 21, 28 automated touchpoints
- **Upsell triggers**: Data-driven pitches based on analytics
- **Win-back sequences**: Automated re-engagement for cancelled clients
- **Churn prediction**: Risk scoring based on engagement patterns

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS, shadcn/ui
- **Database**: PostgreSQL with Prisma ORM
- **Job Queue**: BullMQ + Redis
- **APIs**: Twilio (SMS), Stripe (payments), SerpAPI (enrichment), Serper (personalization)
- **Deployment**: Railway (recommended) or Vercel + Railway DB

## Project Structure

```
bright-automations-platform/
├── prisma/
│   └── schema.prisma          # Complete database schema
├── src/
│   ├── app/                   # Next.js app router
│   │   ├── (admin)/          # Control Center routes
│   │   │   ├── dashboard/
│   │   │   ├── leads/
│   │   │   ├── clients/
│   │   │   ├── reps/
│   │   │   ├── revenue/
│   │   │   └── settings/
│   │   ├── (rep)/            # Rep portal routes
│   │   │   ├── dashboard/
│   │   │   ├── dialer/
│   │   │   ├── leads/
│   │   │   └── earnings/
│   │   ├── api/              # API routes
│   │   │   ├── leads/
│   │   │   ├── clients/
│   │   │   ├── messages/
│   │   │   ├── preview/
│   │   │   ├── webhooks/
│   │   │   └── enrichment/
│   │   ├── preview/[id]/     # Public preview pages
│   │   └── login/            # Auth
│   ├── components/
│   │   ├── ui/               # shadcn/ui components
│   │   ├── admin/            # Admin-specific components
│   │   └── rep/              # Rep-specific components
│   ├── lib/
│   │   ├── db.ts             # Prisma client
│   │   ├── redis.ts          # Redis connection
│   │   ├── twilio.ts         # Twilio client
│   │   ├── stripe.ts         # Stripe client
│   │   ├── serpapi.ts        # SerpAPI client
│   │   ├── serper.ts         # Serper client
│   │   └── utils.ts          # Utilities
│   ├── worker/
│   │   ├── index.ts          # Worker entry point
│   │   ├── jobs/             # Job definitions
│   │   │   ├── enrichment.ts
│   │   │   ├── personalization.ts
│   │   │   ├── sequences.ts
│   │   │   └── monitoring.ts
│   │   └── queue.ts          # BullMQ setup
│   └── types/
│       └── index.ts          # TypeScript types
├── .env.example              # Environment template
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── README.md
```

## Setup Instructions

### 1. Prerequisites

- Node.js 18+
- PostgreSQL database (Railway, Supabase, or local)
- Redis (Railway add-on or local)

### 2. Clone and Install

```bash
cd bright-automations-platform
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:
- DATABASE_URL: PostgreSQL connection string
- REDIS_HOST/PORT: Redis connection
- TWILIO_*: Twilio account details
- STRIPE_*: Stripe API keys
- SERPAPI_KEY: SerpAPI key
- SERPER_API_KEY: Serper API key

### 4. Initialize Database

```bash
npm run db:generate
npm run db:push
```

### 5. Run Development

```bash
# Terminal 1: Web server
npm run dev

# Terminal 2: Background worker
npm run worker
```

Access at: http://localhost:3000

### 6. First Login

Use credentials from .env:
- Email: andrew@brightautomations.com
- Password: (set in .env ADMIN_PASSWORD)

## API Endpoints

### Leads
- `GET /api/leads` - List leads (filterable)
- `GET /api/leads/[id]` - Lead detail
- `POST /api/leads/import` - Bulk import from CSV
- `PUT /api/leads/[id]` - Update lead
- `POST /api/leads/[id]/qualify` - Mark as qualified

### Preview
- `GET /preview/[id]` - Render preview page
- `POST /api/preview/generate` - Generate new preview
- `POST /api/analytics/track` - Track preview events

### Messages
- `GET /api/messages/[leadId]` - Message history
- `POST /api/messages/send` - Send SMS (Clawdbot or manual)

### Webhooks
- `POST /api/webhooks/twilio` - Inbound SMS
- `POST /api/webhooks/stripe` - Payment events
- `POST /api/webhooks/instantly` - Email events

### Enrichment
- `POST /api/enrichment/serpapi` - Enrich lead data
- `POST /api/enrichment/serper` - Generate personalization

## Clawdbot Integration

Clawdbot (OpenClaw AI assistant) connects via API:

**Authentication**: API key in request header
**Base URL**: `https://your-domain.com/api`

**Key operations**:
1. Poll hot leads: `GET /api/leads/hot`
2. Send qualification SMS: `POST /api/messages/send`
3. Update lead stage: `PUT /api/leads/[id]`
4. Create notifications: `POST /api/notifications`

**Heartbeat schedule**:
- Every 15 min: Check hot leads (preview engagement)
- Daily 9 PM: Audit report (summarize day's activity)

## Deployment

### Railway (Recommended)

1. Create new Railway project
2. Add PostgreSQL + Redis services
3. Connect GitHub repo
4. Set environment variables
5. Deploy

### Vercel + Railway DB

1. Deploy Next.js app to Vercel
2. Host PostgreSQL + Redis on Railway
3. Connect via DATABASE_URL and REDIS_HOST
4. Deploy worker separately (Railway worker service)

## Cost Breakdown (0-30 clients)

| Service | Monthly Cost |
|---------|-------------|
| Railway (hosting + DB + Redis) | ~$25 |
| Twilio SMS | ~$50-100 (usage-based) |
| SerpAPI | $50 (5k requests) |
| Serper | $50 (10k searches) |
| Stripe | 2.9% + $0.30 per transaction |
| **Total** | **~$175-225/month** |

## Support

Built for Bright Automations by Jared + Clawdbot
Questions: Contact Jared or Andrew
