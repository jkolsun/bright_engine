# Setup Guide - Bright Automations Platform

Complete step-by-step guide to get the system running.

---

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database (Railway, Supabase, or local)
- Redis instance (Railway add-on or local)
- API keys ready (see below)

---

## Step 1: Install Dependencies

```bash
cd bright-automations-platform
npm install
```

This installs all required packages including:
- Next.js, React, TypeScript
- Prisma (database ORM)
- BullMQ (job queue)
- Twilio, Stripe, SerpAPI, Serper SDKs
- shadcn/ui components
- And more...

---

## Step 2: Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and fill in all values:

### Database
```env
DATABASE_URL="postgresql://user:password@host:5432/database"
```

**Get this from:**
- Railway: Create PostgreSQL service → copy connection string
- Supabase: Project Settings → Database → Connection string
- Local: `postgresql://postgres:password@localhost:5432/bright_automations`

### Redis
```env
REDIS_HOST="your-redis-host.railway.app"
REDIS_PORT="6379"
REDIS_PASSWORD="your-redis-password"
```

**Get this from:**
- Railway: Add Redis service → copy connection details
- Local: Leave as `localhost` and `6379`, no password

### Twilio (SMS)
```env
TWILIO_ACCOUNT_SID="ACxxxxx"
TWILIO_AUTH_TOKEN="your_auth_token"
TWILIO_PHONE_NUMBER="+1234567890"
```

**Get this from:**
1. Sign up at https://twilio.com
2. Go to Console Dashboard
3. Copy Account SID and Auth Token
4. Buy a phone number (Phone Numbers → Buy a number)
5. Copy the phone number

### Stripe (Payments)
```env
STRIPE_SECRET_KEY="sk_test_xxxxx"
STRIPE_WEBHOOK_SECRET="whsec_xxxxx"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_xxxxx"
```

**Get this from:**
1. Sign up at https://stripe.com
2. Go to Developers → API keys
3. Copy Secret key and Publishable key
4. Go to Developers → Webhooks → Add endpoint
5. URL: `https://your-domain.com/api/webhooks/stripe`
6. Events to listen: `checkout.session.completed`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.deleted`
7. Copy Signing secret

### SerpAPI (Enrichment)
```env
SERPAPI_KEY="your_serpapi_key"
```

**Get this from:**
1. Sign up at https://serpapi.com
2. Go to Dashboard → API Key
3. Copy your API key
4. Choose plan: $50/month for 5,000 requests

### Serper (Personalization)
```env
SERPER_API_KEY="your_serper_key"
```

**Get this from:**
1. Sign up at https://serper.dev
2. Go to API Key
3. Copy your API key
4. Choose plan: $50/month for 10,000 searches

### Cloudinary (Image Uploads)
```env
CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"
```

**Get this from:**
1. Sign up at https://cloudinary.com
2. Go to Dashboard
3. Copy Cloud name, API Key, API Secret
4. Free tier: 25GB storage, 25GB bandwidth/month

### Instantly (Cold Email)
```env
INSTANTLY_API_KEY="your_instantly_key"
```

**Get this from:**
1. Sign up at https://instantly.ai
2. Go to Settings → API
3. Generate API key

### Sentry (Error Tracking - Optional)
```env
SENTRY_DSN="https://xxxxx@sentry.io/xxxxx"
```

**Get this from:**
1. Sign up at https://sentry.io
2. Create new project (Next.js)
3. Copy DSN
4. Free tier: 5k events/month

### App Settings
```env
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate_a_32_char_random_string_here"
BASE_URL="http://localhost:3000"

ADMIN_EMAIL="andrew@brightautomations.com"
ADMIN_PASSWORD="change_this_password"
```

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

---

## Step 3: Initialize Database

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database (creates all tables)
npm run db:push
```

This creates all tables with proper indexes:
- users
- leads
- lead_events
- clients
- client_analytics
- messages
- activities
- rep_activity
- commissions
- revenue
- notifications
- failed_webhooks
- api_costs
- settings

---

## Step 4: Start Redis (if running locally)

```bash
# macOS
brew services start redis

# Linux
sudo systemctl start redis

# Docker
docker run -d -p 6379:6379 redis

# Windows (via WSL or Docker)
```

**Verify Redis is running:**
```bash
redis-cli ping
# Should return: PONG
```

---

## Step 5: Start the Application

Open 2 terminal windows:

### Terminal 1: Web Server
```bash
npm run dev
```

This starts Next.js on http://localhost:3000

### Terminal 2: Background Worker
```bash
npm run worker
```

This starts the BullMQ worker that processes:
- Enrichment jobs
- Personalization jobs
- Sequence jobs (automated messages)
- Monitoring jobs (hot leads, daily audit)

---

## Step 6: Access the Platform

Open http://localhost:3000 in your browser.

**First login:**
- Email: `andrew@brightautomations.com` (or whatever you set in .env)
- Password: (whatever you set in ADMIN_PASSWORD)

---

## Step 7: Configure Webhooks

### Twilio SMS Webhook
1. Go to Twilio Console → Phone Numbers
2. Click your phone number
3. Under "Messaging", set:
   - A MESSAGE COMES IN: Webhook
   - URL: `https://your-domain.com/api/webhooks/twilio`
   - HTTP POST
4. Save

### Stripe Webhook
1. Already set up in Step 2
2. Test webhook:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

### Instantly Webhook (Optional)
1. Go to Instantly → Settings → Webhooks
2. Add webhook URL: `https://your-domain.com/api/webhooks/instantly`
3. Enable events: email.opened, email.replied, email.bounced

---

## Step 8: Test the System

### Import Test Leads
1. Go to http://localhost:3000/admin/leads
2. Click "Import Leads"
3. Upload CSV with columns:
   - firstName
   - lastName
   - email
   - phone
   - companyName
   - industry
   - city
   - state

### Watch the Workers
Terminal 2 should show:
```
Processing enrichment job: ...
Processing personalization job: ...
```

### Check Preview URLs
1. Go to lead detail page
2. Copy preview URL
3. Open in incognito window
4. Should see personalized site preview

---

## Step 9: Schedule Recurring Jobs

The monitoring worker needs to be initialized. Run once:

```bash
node -e "
const { scheduleHotLeadMonitoring, scheduleDailyAudit } = require('./src/worker/queue.ts');
scheduleHotLeadMonitoring();
scheduleDailyAudit();
"
```

This sets up:
- Hot lead checks every 15 minutes
- Daily audit at 9 PM EST

---

## Production Deployment (Railway)

### 1. Create Railway Project
```bash
railway login
railway init
```

### 2. Add Services
- PostgreSQL (automatically provisions)
- Redis (add from marketplace)

### 3. Set Environment Variables
```bash
railway variables set DATABASE_URL=$DATABASE_URL
railway variables set REDIS_HOST=$REDIS_HOST
# ... set all other variables
```

### 4. Deploy
```bash
railway up
```

### 5. Add Worker Service
In `railway.json`:
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "numReplicas": 1,
    "startCommand": "npm run worker",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

Deploy worker separately:
```bash
railway service create worker
railway up --service worker
```

---

## Verify Everything is Working

### ✅ Checklist

- [ ] Web server running (http://localhost:3000)
- [ ] Worker running (Terminal 2 shows "Workers started successfully")
- [ ] Can login to admin portal
- [ ] Can import leads
- [ ] Enrichment jobs process (check Terminal 2)
- [ ] Preview URLs generate and load
- [ ] Can send SMS (test with your own phone)
- [ ] Webhooks receive events (check logs)
- [ ] Redis connection working
- [ ] Database queries working

### 🐛 Troubleshooting

**Database connection fails:**
- Check DATABASE_URL is correct
- Verify database is running
- Try: `npm run db:push` again

**Redis connection fails:**
- Check REDIS_HOST and port
- Verify Redis is running: `redis-cli ping`
- Check firewall/network rules

**Worker not processing jobs:**
- Check Redis connection
- Restart worker: `npm run worker`
- Check for errors in Terminal 2

**API keys not working:**
- Verify all keys are correct
- Check for extra spaces in .env
- Restart server after changing .env

**Webhooks not receiving events:**
- Check webhook URLs are correct
- Verify HTTPS (webhooks don't work on HTTP in production)
- Check webhook signatures are enabled
- Review webhook logs in respective dashboards

---

## Next Steps

1. Customize templates (src/app/preview/templates/)
2. Configure settings (Settings page in admin portal)
3. Add reps (Reps page in admin portal)
4. Start importing real leads
5. Configure Clawdbot API access
6. Set up monitoring/alerting
7. Configure backups
8. Set up SSL certificate (production)

---

## Monthly Cost Summary (0-30 clients)

| Service | Cost |
|---------|------|
| Railway (hosting + DB + Redis) | $25 |
| Twilio SMS | $50-100 |
| SerpAPI | $50 |
| Serper | $50 |
| Stripe | 2.9% + $0.30/transaction |
| **Total** | **$175-225/month** |

---

## Support

Questions? Check:
- README.md - Full feature list
- BUILD_STATUS.md - What's implemented
- Master Knowledge Base - Business processes
- SOUL.md - Clawdbot behavior rules

Built by Jared + Clawdbot for Bright Automations.
