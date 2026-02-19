# BUILD SPEC: Products & Payments — System-Wide Control Center
### Dynamic Upsell Products + Live Stripe Payment Links

**Est. Build Time:** 4–5 hours total
**Priority:** High — blocks Close Engine AI context
**Dependencies:** None — all base APIs already exist

---

## What This Spec Does

Two interconnected features that make Settings the single source of truth for all products and payments across the entire system:

**Part A — Upsell Products (Dynamic + AI-Aware):** Add a product once in Settings, and the AI knows about it, the touchpoint sequences pitch it, the client profile shows it, the revenue tracking captures it. Deactivate it, and it vanishes from everything.

**Part B — Stripe Payment Links (Fully Live CRUD):** Replace the static hardcoded env var display with a live system where you can add/edit/delete payment links, verify they're working, and cross-check what's in the DB vs what's set in Railway.

Both feed into the Close Engine and Post-Client AI via a single context builder function.

---

## Existing Codebase (Already Built — Do Not Recreate)

| What Exists | File | Status |
|-------------|------|--------|
| UpsellProduct model | `prisma/schema.prisma` (line ~1068) | Has: id, name, price, recurring, stripeLink, active, createdAt. Missing: 8 new AI/targeting fields |
| UpsellPitch model | `prisma/schema.prisma` (line ~1085) | Has: clientId, productId, status, pitchedAt, pitchChannel, sequenceDay. Statuses: pitched/opened/clicked/paid/declined |
| GET/POST /api/upsell-products | `src/app/api/upsell-products/route.ts` | GET lists all products with pitch relations. POST creates with basic fields (name, price, recurring, stripeLink, active) |
| GET/POST /api/upsell-pitches | `src/app/api/upsell-pitches/route.ts` | GET lists pitches with pipeline stats (pitched/opened/clicked/paid/revenueAdded). POST creates pitch |
| Settings generic CRUD | `src/app/api/settings/route.ts` | Key/value upsert to Settings table (value is Json type) |
| API status checker | `src/app/api/settings/api-status/route.ts` | Checks Stripe/Twilio/etc connectivity |
| Stripe helpers | `src/lib/stripe.ts` | Has `PAYMENT_LINKS` object from env vars, `getPaymentLink()` function. Does NOT import prisma |
| Hardcoded upsell logic | `src/lib/profit-systems.ts` | `recommendUpsells()` returns `string[]` with hardcoded industry checks. Has prisma import |
| Settings page — Upsell form | `src/app/admin/settings/page.tsx` (line ~1223) | Basic form: name, price, key, phone, paymentLink. Stores to `client_sequences` Settings key, NOT to UpsellProduct DB table |
| Settings page — Stripe links | `src/app/admin/settings/page.tsx` (line ~678) | Static display of 7 env var names. Read-only, no CRUD |
| Clients page upsell view | `src/app/admin/clients/page.tsx` | UpsellView component with product table + pipeline stats |
| Client model | `prisma/schema.prisma` | Has direct `industry` field (String) |

> **Key finding:** The Settings page upsell form currently stores products in `client_sequences` Settings key (local JSON), NOT in the `UpsellProduct` database table. This task migrates to using the actual DB model via the API.

---

## Build Order

Execute in this exact order. Each step builds on the previous.

```
STEP 1  → Schema migration (adds AI fields to UpsellProduct)
STEP 2  → Individual upsell product API route (GET/PUT/DELETE by ID)
STEP 3  → Update existing upsell POST to accept new fields
STEP 4  → Replace hardcoded recommendUpsells() with dynamic DB logic
STEP 5  → AI context builder function (buildUpsellContextForAI)
STEP 6  → Payment Links API routes (CRUD + Verify)
STEP 7  → Update stripe.ts (DB-first, env fallback)
STEP 8  → Settings page UI — Expanded upsell form
STEP 9  → Settings page UI — Live payment links section
STEP 10 → Auto-seed defaults on first load
```

---

## STEP 1: Schema Migration

**File:** `prisma/schema.prisma`
**Action:** Add 8 new fields + `updatedAt` to existing `UpsellProduct` model (line ~1068)

The current model is:
```prisma
model UpsellProduct {
  id           String  @id @default(cuid())
  name         String
  price        Float
  recurring    Boolean @default(true)
  stripeLink   String? @map("stripe_link")
  active       Boolean @default(true)
  createdAt    DateTime @default(now()) @map("created_at")

  pitches UpsellPitch[]

  @@map("upsell_products")
}
```

Replace it entirely with:

```prisma
model UpsellProduct {
  id                  String   @id @default(cuid())
  name                String
  price               Float
  recurring           Boolean  @default(true)
  stripeLink          String?  @map("stripe_link")
  active              Boolean  @default(true)

  // AI awareness fields
  description         String?  @db.Text
  aiPitchInstructions String?  @db.Text  @map("ai_pitch_instructions")
  aiProductSummary    String?  @map("ai_product_summary")

  // Eligibility & targeting
  eligibleIndustries  String[] @default([]) @map("eligible_industries")
  minClientAgeDays    Int?     @map("min_client_age_days")
  maxPitchesPerClient Int      @default(3) @map("max_pitches_per_client")
  pitchChannel        String   @default("sms") @map("pitch_channel")
  sortOrder           Int      @default(0) @map("sort_order")

  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")

  pitches UpsellPitch[]

  @@map("upsell_products")
}
```

**Field definitions for the AI:**
- `description` — Human-readable description for admin UI. Not sent to AI.
- `aiPitchInstructions` — Plain English instructions telling the AI exactly how to pitch this product, when, and to whom. Example: *"Pitch GBP setup to local service businesses. Mention that 46% of Google searches are local. Emphasize it's a one-time $49 setup, not recurring. Only pitch if the client doesn't already have a claimed GBP listing."*
- `aiProductSummary` — One-liner the AI can drop into conversation. Example: *"Google Business Profile setup — $49 one-time, we claim and optimize your listing"*
- `eligibleIndustries` — String array. Empty = all industries eligible. If populated, only pitch to matching industries.
- `minClientAgeDays` — Don't pitch until client has been active this many days. Null = no restriction.
- `maxPitchesPerClient` — Stop pitching after this many attempts (declined or no response). Default 3.
- `pitchChannel` — "sms", "email", or "both"
- `sortOrder` — Display order in UI and priority for AI (lower number = higher priority)

> **Note:** Adding `updatedAt` with `@updatedAt` is new — the current model doesn't have it. Prisma will auto-populate it.

Run migration:
```bash
npx prisma db push
```

---

## STEP 2: Individual Upsell Product API Route

**File:** `src/app/api/upsell-products/[id]/route.ts` (NEW — does not exist yet)
**Action:** Create GET, PUT, DELETE for individual products

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

// GET /api/upsell-products/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const product = await prisma.upsellProduct.findUnique({
      where: { id: params.id },
      include: {
        pitches: {
          orderBy: { pitchedAt: 'desc' },
          take: 50
        }
      }
    })

    if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ product })
  } catch (error) {
    console.error('Error fetching upsell product:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

// PUT /api/upsell-products/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const data = await request.json()
    const product = await prisma.upsellProduct.update({
      where: { id: params.id },
      data: {
        name: data.name,
        price: data.price,
        recurring: data.recurring,
        stripeLink: data.stripeLink,
        active: data.active,
        description: data.description,
        aiPitchInstructions: data.aiPitchInstructions,
        aiProductSummary: data.aiProductSummary,
        eligibleIndustries: data.eligibleIndustries || [],
        minClientAgeDays: data.minClientAgeDays,
        maxPitchesPerClient: data.maxPitchesPerClient,
        pitchChannel: data.pitchChannel,
        sortOrder: data.sortOrder,
      }
    })

    return NextResponse.json({ product })
  } catch (error) {
    console.error('Error updating upsell product:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

// DELETE /api/upsell-products/[id] — Soft delete (preserves pitch history)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const product = await prisma.upsellProduct.update({
      where: { id: params.id },
      data: { active: false }
    })

    return NextResponse.json({ product, message: 'Deactivated' })
  } catch (error) {
    console.error('Error deactivating upsell product:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
```

---

## STEP 3: Update Existing Upsell POST

**File:** `src/app/api/upsell-products/route.ts`
**Action:** Expand the POST handler's `prisma.upsellProduct.create()` data to include all new fields

The current POST handler only accepts: `name`, `price`, `recurring`, `stripeLink`, `active`.

Replace the create data block inside the POST handler:

```typescript
const product = await prisma.upsellProduct.create({
  data: {
    name: data.name,
    price: data.price,
    recurring: data.recurring ?? true,
    stripeLink: data.stripeLink,
    active: data.active ?? true,
    description: data.description || null,
    aiPitchInstructions: data.aiPitchInstructions || null,
    aiProductSummary: data.aiProductSummary || null,
    eligibleIndustries: data.eligibleIndustries || [],
    minClientAgeDays: data.minClientAgeDays || null,
    maxPitchesPerClient: data.maxPitchesPerClient ?? 3,
    pitchChannel: data.pitchChannel || 'sms',
    sortOrder: data.sortOrder ?? 0,
  }
})
```

> **Also update the GET handler** to order by `sortOrder` instead of `name`:
> ```typescript
> orderBy: { sortOrder: 'asc' }
> ```

---

## STEP 4: Replace Hardcoded recommendUpsells()

**File:** `src/lib/profit-systems.ts`
**Action:** Replace the existing `recommendUpsells()` function (lines 126–176). The current version returns `string[]` with hardcoded industry/engagement/review checks. New version pulls from DB dynamically and returns structured objects.

> **Important:** This changes the return type from `string[]` to an array of objects. Any callers of `recommendUpsells()` must be updated. Check for callers with grep before changing.

```typescript
export async function recommendUpsells(clientId: string): Promise<{
  productId: string
  name: string
  price: number
  recurring: boolean
  aiProductSummary: string | null
  aiPitchInstructions: string | null
  stripeLink: string | null
}[]> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { lead: true }
  })
  if (!client) return []

  // Get all active upsell products, ordered by priority
  const products = await prisma.upsellProduct.findMany({
    where: { active: true },
    orderBy: { sortOrder: 'asc' },
  })

  // Get all existing pitches for this client
  const existingPitches = await prisma.upsellPitch.findMany({
    where: { clientId },
  })

  const clientAgeDays = Math.floor(
    (Date.now() - new Date(client.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  )
  // Client has direct `industry` field, but also check lead for fallback
  const clientIndustry = client.industry || client.lead?.industry || ''

  const recommendations = []

  for (const product of products) {
    // Check min client age
    if (product.minClientAgeDays && clientAgeDays < product.minClientAgeDays) continue

    // Check industry eligibility (empty array = all industries eligible)
    if (product.eligibleIndustries.length > 0 &&
        !product.eligibleIndustries.includes(clientIndustry)) continue

    // Check max pitch attempts
    const pitchCount = existingPitches.filter(p => p.productId === product.id).length
    if (pitchCount >= product.maxPitchesPerClient) continue

    // Skip if client already paid for this product
    const alreadyPaid = existingPitches.some(
      p => p.productId === product.id && p.status === 'paid'
    )
    if (alreadyPaid) continue

    recommendations.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      recurring: product.recurring,
      aiProductSummary: product.aiProductSummary,
      aiPitchInstructions: product.aiPitchInstructions,
      stripeLink: product.stripeLink,
    })
  }

  return recommendations
}
```

**Important:** Keep all other functions in `profit-systems.ts` unchanged (`hasLeadViewedPreview`, `generateUrgencyMessages`, `shouldPitchAnnualHosting`, `generateReferralReward`, `checkProfitSystemTriggers`). Only replace `recommendUpsells()`.

> **Caller check:** The function `checkProfitSystemTriggers()` in the same file calls `recommendUpsells()`. After changing the return type, update that call site to handle the new object format (it currently expects `string[]`).

---

## STEP 5: AI Context Builder

**File:** `src/lib/profit-systems.ts` (add to bottom, after existing functions)
**Action:** New exported function that generates a text block for AI system prompts

```typescript
/**
 * Build upsell context for AI prompts.
 * Called by Close Engine and Post-Client AI.
 * Returns a formatted text block the AI uses to understand available upsells.
 */
export async function buildUpsellContextForAI(clientId: string): Promise<string> {
  const recommendations = await recommendUpsells(clientId)

  if (recommendations.length === 0) {
    return 'No upsell products are currently recommended for this client.'
  }

  let context = '## Available Upsells for This Client\n\n'
  context += 'You may mention these products if the conversation naturally leads to them, '
  context += 'or if the client asks about additional services. Never hard-sell.\n\n'

  for (const rec of recommendations) {
    context += `### ${rec.name} — $${rec.price}${rec.recurring ? '/mo' : ''}${rec.stripeLink ? '' : ' (no payment link yet)'}\n`
    if (rec.aiProductSummary) {
      context += `Summary: ${rec.aiProductSummary}\n`
    }
    if (rec.aiPitchInstructions) {
      context += `Pitch guidance: ${rec.aiPitchInstructions}\n`
    }
    if (rec.stripeLink) {
      context += `Payment link: ${rec.stripeLink}\n`
    }
    context += '\n'
  }

  return context
}
```

**Integration points (for future tasks — do NOT build these now):**
- Close Engine (Task 10) prompt builder will call `buildUpsellContextForAI(clientId)` for QUALIFIED+ leads
- Post-Client AI (Task 18) will always include this in system prompt for active clients

---

## STEP 6: Payment Links API Routes

### 6A: CRUD Route

**File:** `src/app/api/settings/payment-links/route.ts` (NEW — directory does not exist yet)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export interface PaymentLinkEntry {
  id: string
  label: string
  url: string
  price: number
  recurring: boolean
  envKey: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

// GET /api/settings/payment-links
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const setting = await prisma.settings.findUnique({
      where: { key: 'payment_links' }
    })
    const dbLinks: PaymentLinkEntry[] = setting?.value
      ? (Array.isArray(setting.value) ? setting.value : [])
      : []

    // Check which env vars are set (server-side only, truncated for security)
    const envLinks: Record<string, { set: boolean; preview: string }> = {
      STRIPE_LINK_SITE_BUILD: envStatus(process.env.STRIPE_LINK_SITE_BUILD),
      STRIPE_LINK_HOSTING_39: envStatus(process.env.STRIPE_LINK_HOSTING_39),
      STRIPE_LINK_HOSTING_ANNUAL: envStatus(process.env.STRIPE_LINK_HOSTING_ANNUAL),
      STRIPE_LINK_GBP: envStatus(process.env.STRIPE_LINK_GBP),
      STRIPE_LINK_REVIEW_WIDGET: envStatus(process.env.STRIPE_LINK_REVIEW_WIDGET),
      STRIPE_LINK_SEO: envStatus(process.env.STRIPE_LINK_SEO),
      STRIPE_LINK_SOCIAL: envStatus(process.env.STRIPE_LINK_SOCIAL),
    }

    return NextResponse.json({ links: dbLinks, envLinks })
  } catch (error) {
    console.error('Error fetching payment links:', error)
    return NextResponse.json({ error: 'Failed to fetch payment links' }, { status: 500 })
  }
}

// POST /api/settings/payment-links — Save full array (replace all)
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const { links } = await request.json()

    if (!Array.isArray(links)) {
      return NextResponse.json({ error: 'links must be an array' }, { status: 400 })
    }

    for (const link of links) {
      if (!link.label || !link.id) {
        return NextResponse.json({ error: 'Each link needs id and label' }, { status: 400 })
      }
    }

    const now = new Date().toISOString()
    const stamped = links.map((link: any) => ({
      ...link,
      updatedAt: now,
      createdAt: link.createdAt || now,
    }))

    await prisma.settings.upsert({
      where: { key: 'payment_links' },
      create: { key: 'payment_links', value: stamped as any },
      update: { value: stamped as any },
    })

    return NextResponse.json({ success: true, links: stamped })
  } catch (error) {
    console.error('Error saving payment links:', error)
    return NextResponse.json({ error: 'Failed to save payment links' }, { status: 500 })
  }
}

function envStatus(value: string | undefined): { set: boolean; preview: string } {
  if (!value) return { set: false, preview: '' }
  const preview = value.length > 35
    ? value.substring(0, 30) + '...' + value.substring(value.length - 5)
    : value
  return { set: true, preview }
}
```

> **Note:** Uses the existing `Settings` model with `key: 'payment_links'` and `value: Json`. Same pattern as `src/app/api/settings/route.ts`.

### 6B: Verify Route

**File:** `src/app/api/settings/payment-links/verify/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

// POST /api/settings/payment-links/verify
// Tests if a Stripe payment link URL is reachable
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const { url } = await request.json()

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ valid: false, reason: 'No URL provided' })
    }

    const isStripeLink = url.startsWith('https://buy.stripe.com/') ||
                         url.startsWith('https://checkout.stripe.com/') ||
                         url.startsWith('https://invoice.stripe.com/')

    if (!isStripeLink) {
      return NextResponse.json({
        valid: false,
        reason: 'Not a recognized Stripe URL. Expected https://buy.stripe.com/...',
        url,
      })
    }

    // NOTE: Use GET not HEAD — Stripe payment links redirect and return 405 on HEAD
    try {
      const res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: AbortSignal.timeout(8000),
      })

      if (res.ok || res.status === 303 || res.status === 302) {
        return NextResponse.json({
          valid: true,
          reason: 'Link is live and reachable',
          status: res.status,
          url,
        })
      }

      return NextResponse.json({
        valid: false,
        reason: `Stripe returned HTTP ${res.status}. Link may be inactive or expired.`,
        status: res.status,
        url,
      })
    } catch (fetchErr) {
      return NextResponse.json({
        valid: false,
        reason: `Could not reach URL: ${(fetchErr as Error).message}`,
        url,
      })
    }
  } catch (error) {
    console.error('Error verifying payment link:', error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
```

---

## STEP 7: Update stripe.ts — DB-First, Env Fallback

**File:** `src/lib/stripe.ts`
**Action:** Add prisma import + 3 new functions. Keep ALL existing code unchanged for backward compatibility.

> **Current state:** `stripe.ts` does NOT import prisma. The existing `PAYMENT_LINKS` constant and `getPaymentLink()` function use env vars only. Both must remain untouched.

Add at top of file (with other imports):
```typescript
import { prisma } from './db'
```

Add after existing `getPaymentLink()` function (don't replace it):

```typescript
/**
 * Get a payment link — checks DB first, falls back to env vars.
 * This is the NEW single source of truth. Use this instead of getPaymentLink().
 */
export async function getPaymentLinkDynamic(
  productId: string,
  metadata?: { leadId?: string; clientId?: string }
): Promise<string> {
  // 1. Check DB first
  try {
    const setting = await prisma.settings.findUnique({
      where: { key: 'payment_links' }
    })
    if (setting?.value && Array.isArray(setting.value)) {
      const links = setting.value as any[]
      const match = links.find(
        (l: any) => l.id === productId && l.active && l.url
      )
      if (match?.url) {
        return appendMetadata(match.url, metadata)
      }
    }
  } catch (e) {
    console.warn('[Stripe] DB lookup failed, falling back to env:', e)
  }

  // 2. Fall back to env vars
  const envMap: Record<string, string | undefined> = {
    site_build: process.env.STRIPE_LINK_SITE_BUILD,
    hosting_monthly: process.env.STRIPE_LINK_HOSTING_39,
    hosting_annual: process.env.STRIPE_LINK_HOSTING_ANNUAL,
    gbp_setup: process.env.STRIPE_LINK_GBP,
    review_widget: process.env.STRIPE_LINK_REVIEW_WIDGET,
    seo_monthly: process.env.STRIPE_LINK_SEO,
    social_monthly: process.env.STRIPE_LINK_SOCIAL,
  }

  const envUrl = envMap[productId]
  if (envUrl) return appendMetadata(envUrl, metadata)

  // 3. Fall back to legacy PAYMENT_LINKS keys
  const legacyMap: Record<string, keyof typeof PAYMENT_LINKS> = {
    site_build: 'SITE_BUILD',
    hosting_monthly: 'HOSTING_MONTHLY',
    hosting_annual: 'HOSTING_ANNUAL',
    gbp_setup: 'GBP_SETUP',
    review_widget: 'REVIEW_WIDGET',
    seo_monthly: 'SEO_MONTHLY',
    social_monthly: 'SOCIAL_MONTHLY',
  }
  const legacyKey = legacyMap[productId]
  if (legacyKey && PAYMENT_LINKS[legacyKey]) {
    return appendMetadata(PAYMENT_LINKS[legacyKey], metadata)
  }

  return ''
}

function appendMetadata(
  baseUrl: string,
  metadata?: { leadId?: string; clientId?: string }
): string {
  if (!metadata) return baseUrl
  try {
    const url = new URL(baseUrl)
    if (metadata.clientId) url.searchParams.set('client_reference_id', metadata.clientId)
    else if (metadata.leadId) url.searchParams.set('client_reference_id', metadata.leadId)
    return url.toString()
  } catch {
    return baseUrl
  }
}

/**
 * Get ALL active payment links (for AI context, UI displays, etc.)
 */
export async function getAllPaymentLinks(): Promise<Array<{
  id: string; label: string; url: string; price: number; recurring: boolean
}>> {
  try {
    const setting = await prisma.settings.findUnique({
      where: { key: 'payment_links' }
    })
    if (setting?.value && Array.isArray(setting.value)) {
      return (setting.value as any[]).filter((l: any) => l.active && l.url)
    }
  } catch (e) {
    console.warn('[Stripe] Failed to fetch payment links from DB:', e)
  }

  // Fallback: build from env vars
  return Object.entries(PAYMENT_LINKS)
    .filter(([_, url]) => !!url)
    .map(([key, url]) => ({
      id: key.toLowerCase(),
      label: key.replace(/_/g, ' '),
      url,
      price: 0,
      recurring: false,
    }))
}
```

> **Note on `appendMetadata`:** The existing `getPaymentLink()` has similar logic (appends `client_reference_id`). The new `appendMetadata` helper is separate to avoid breaking existing code. If `clientId` AND `leadId` are both provided, `clientId` takes precedence (matching existing behavior).

---

## STEPS 8–10: Settings Page UI

**File:** `src/app/admin/settings/page.tsx`

These three steps modify the same file. They are the largest visual changes.

### STEP 8: Expand Upsell Product Form (line ~1223)

**What to change:** Replace the existing basic add-upsell form (currently has: name, price, key, phone, paymentLink) with the expanded form that includes all new fields: description, aiPitchInstructions, aiProductSummary, eligibleIndustries, minClientAgeDays, maxPitchesPerClient, pitchChannel, sortOrder.

**Key requirement:** The `addUpsellProduct` handler must POST to `/api/upsell-products` (the real API), not save to `client_sequences` Settings key. After success, refetch the products list. The current implementation stores to a local JSON key — this must change.

**New state needed:**
```typescript
const [upsellProducts, setUpsellProducts] = useState<any[]>([])
const [upsellLoading, setUpsellLoading] = useState(false)
```

**New fetch function:**
```typescript
const fetchUpsellProducts = async () => {
  setUpsellLoading(true)
  try {
    const res = await fetch('/api/upsell-products')
    if (res.ok) {
      const data = await res.json()
      setUpsellProducts(data.products || [])
    }
  } catch (err) { console.error(err) }
  setUpsellLoading(false)
}
```

Call `fetchUpsellProducts()` in the existing `useEffect` on mount.

### STEP 9: Replace Static Stripe Payment Links (line ~678)

**What to change:** Remove the entire `{/* Stripe Payment Links */}` Card that currently shows 7 hardcoded env variable names as read-only rows. Replace with the fully live CRUD UI.

**New state variables needed:**
- `paymentLinks`, `envLinks`, `paymentLinksLoading`, `editingLink`, `addingLink`, `verifyResults`, `newLink`

**New handlers needed:**
- `fetchPaymentLinks`, `savePaymentLinks`, `handleAddLink`, `handleDeleteLink`, `handleUpdateLink`, `handleVerifyLink`, `handleVerifyAll`

**New JSX sections:**
- Add New Link form (blue background, label/URL/price/type/id fields)
- Links list with view mode (status dot, label, badges, URL link, verify/edit/delete buttons) and edit mode (inline fields + save/cancel)
- Environment Variable Cross-Check Panel (shows which Railway STRIPE_LINK_* vars are set)

**New icon imports needed:**
```typescript
import { Pencil, Shield, AlertCircle } from 'lucide-react'
```

> **Verify existing imports first:** The file already imports `Trash2`, `Link`, `Phone`, `Plus`, etc. Only add icons that are missing.

### STEP 10: Auto-Seed Default Links

**What to change:** In `fetchPaymentLinks`, after fetching from the API, if the DB is empty but env vars exist, scaffold default link entries with correct labels/prices but **blank URLs**. Display them in the UI for the user to paste their actual Stripe URLs.

Default entries to seed:
| ID | Label | Price | Recurring | Env Key |
|----|-------|-------|-----------|---------|
| site_build | Site Build | 149 | false | STRIPE_LINK_SITE_BUILD |
| hosting_monthly | Monthly Hosting | 39 | true | STRIPE_LINK_HOSTING_39 |
| hosting_annual | Annual Hosting | 349 | false | STRIPE_LINK_HOSTING_ANNUAL |
| gbp_setup | Google Business Profile | 49 | false | STRIPE_LINK_GBP |
| review_widget | Review Widget | 69 | true | STRIPE_LINK_REVIEW_WIDGET |
| seo_monthly | SEO Package | 149 | true | STRIPE_LINK_SEO |
| social_monthly | Social Media | 99 | true | STRIPE_LINK_SOCIAL |

**Critical:** Do NOT populate URLs from env var previews — they're truncated for security and would create broken links. URLs must be left blank for the user to fill in manually.

---

## System-Wide Data Flow

```
Andrew adds "Review Widget" in Settings → Upsell Products
  ↓
Saved to UpsellProduct table with AI instructions + eligibility rules
  ↓
Andrew adds Stripe payment link in Settings → Payment Links
  ↓
Saved to Settings table (key: "payment_links")
  ↓
recommendUpsells(clientId) runs eligibility checks:
  ✓ Product active? ✓ Client age met? ✓ Industry match? ✓ Under pitch limit? ✓ Not already paid?
  ↓
buildUpsellContextForAI(clientId) generates prompt text block
  ↓
AI system prompt includes: product name, summary, pitch guidance, payment link
  ↓
Client texts "what else do you offer?"
  ↓
AI responds naturally with Review Widget pitch + Stripe link
  ↓
Client pays → Stripe webhook → UpsellPitch.status = "paid" → Revenue record created
  ↓
Shows in: Clients billing tab, Revenue dashboard, Upsell pipeline stats
```

---

## Files to Create

| File | Action |
|------|--------|
| `src/app/api/upsell-products/[id]/route.ts` | NEW — GET/PUT/DELETE individual products |
| `src/app/api/settings/payment-links/route.ts` | NEW — GET/POST payment links CRUD |
| `src/app/api/settings/payment-links/verify/route.ts` | NEW — POST verify link reachability |

## Files to Modify

| File | Action |
|------|--------|
| `prisma/schema.prisma` | Add 8 new fields + updatedAt to UpsellProduct model |
| `src/app/api/upsell-products/route.ts` | Expand POST to accept new fields, update GET orderBy |
| `src/lib/profit-systems.ts` | Replace `recommendUpsells()` + add `buildUpsellContextForAI()` |
| `src/lib/stripe.ts` | Add prisma import + `getPaymentLinkDynamic()` + `appendMetadata()` + `getAllPaymentLinks()` |
| `src/app/admin/settings/page.tsx` | Expanded upsell form (DB-backed), live payment links CRUD, auto-seed |

---

## Verification Checklist

### Part A: Upsell Products
- [ ] Schema migration runs without errors (`npx prisma db push`)
- [ ] Can create product with all new fields via POST /api/upsell-products
- [ ] Can update product via PUT /api/upsell-products/[id]
- [ ] Can soft-delete (deactivate) product via DELETE /api/upsell-products/[id]
- [ ] Settings UI shows expanded form with all fields
- [ ] Products save to UpsellProduct database table via API (NOT to `client_sequences` Settings key)
- [ ] `recommendUpsells()` uses DB products — no hardcoded industry logic remains
- [ ] Industry filtering works (empty array = all, populated = filtered)
- [ ] Min age filtering works (null = no restriction)
- [ ] Max pitch count respected (default 3)
- [ ] Already-paid products excluded from recommendations
- [ ] `buildUpsellContextForAI()` generates clean, formatted prompt text
- [ ] Deactivated products don't appear in recommendations or AI context
- [ ] Existing UpsellView in Clients tab still works
- [ ] Existing UpsellPitch tracking pipeline unchanged
- [ ] `checkProfitSystemTriggers()` in profit-systems.ts still works after return type change

### Part B: Stripe Payment Links
- [ ] GET /api/settings/payment-links returns DB links + env var status
- [ ] POST /api/settings/payment-links saves full array to Settings table (key: `payment_links`)
- [ ] POST /api/settings/payment-links/verify tests URL reachability
- [ ] Settings UI shows all payment links with live status indicators
- [ ] Can add new link with all fields (label, URL, price, type, ID)
- [ ] Can inline edit existing link
- [ ] Can delete link with confirmation
- [ ] "Verify" button per link shows green/red result
- [ ] "Verify All" button checks every active link
- [ ] Env var cross-check panel shows which Railway STRIPE_LINK_* vars are set vs not
- [ ] Auto-seed creates default entries with correct labels/prices and BLANK URLs on first load
- [ ] `getPaymentLinkDynamic()` checks DB first, then env vars, then legacy constant
- [ ] `getAllPaymentLinks()` returns all active links for AI context
- [ ] Existing `getPaymentLink()` in stripe.ts still works (backward compatible)
- [ ] No TypeScript errors
- [ ] No regressions to existing Settings page functionality (all other tabs unchanged)

### Integration
- [ ] Upsell products with stripeLink field populated appear in payment link context
- [ ] AI context builder includes payment links from upsell products
- [ ] Deactivating a product removes it from all downstream systems
- [ ] Deleting a payment link removes it from `getPaymentLinkDynamic()` results
