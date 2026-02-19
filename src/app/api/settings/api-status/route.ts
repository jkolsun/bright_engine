import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

type ServiceStatus = {
  key: string
  label: string
  configured: boolean
  connected: boolean | null // null = not tested (key missing)
  detail: string
}

/**
 * GET /api/settings/api-status
 * Tests live connectivity for all integrated API services.
 * Admin-only.
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const results: ServiceStatus[] = await Promise.all([
      checkInstantly(),
      checkStripe(),
      checkTwilio(),
      checkResend(),
      checkAnthropic(),
      checkSerper(),
      checkSerpApi(),
    ])

    return NextResponse.json({ services: results, timestamp: new Date().toISOString() })
  } catch (error) {
    return NextResponse.json(
      { error: 'Status check failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

// ── Instantly ────────────────────────────────────────────────
async function checkInstantly(): Promise<ServiceStatus> {
  const key = process.env.INSTANTLY_API_KEY
  if (!key) return { key: 'instantly', label: 'Instantly', configured: false, connected: null, detail: 'INSTANTLY_API_KEY not set' }

  try {
    const res = await fetch('https://api.instantly.ai/api/v2/accounts?limit=1', {
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(8000),
    })
    if (res.ok) {
      return { key: 'instantly', label: 'Instantly', configured: true, connected: true, detail: 'API key valid' }
    }
    return { key: 'instantly', label: 'Instantly', configured: true, connected: false, detail: `API returned ${res.status}` }
  } catch (e) {
    return { key: 'instantly', label: 'Instantly', configured: true, connected: false, detail: (e as Error).message }
  }
}

// ── Stripe ───────────────────────────────────────────────────
async function checkStripe(): Promise<ServiceStatus> {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key || key === 'build-placeholder-do-not-use-in-production') {
    return { key: 'stripe', label: 'Stripe', configured: false, connected: null, detail: 'STRIPE_SECRET_KEY not set' }
  }

  try {
    // Lightweight balance fetch — no side effects
    const res = await fetch('https://api.stripe.com/v1/balance', {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8000),
    })
    if (res.ok) {
      return { key: 'stripe', label: 'Stripe', configured: true, connected: true, detail: 'API key valid' }
    }
    return { key: 'stripe', label: 'Stripe', configured: true, connected: false, detail: `API returned ${res.status}` }
  } catch (e) {
    return { key: 'stripe', label: 'Stripe', configured: true, connected: false, detail: (e as Error).message }
  }
}

// ── Twilio ───────────────────────────────────────────────────
async function checkTwilio(): Promise<ServiceStatus> {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const phone = process.env.TWILIO_PHONE_NUMBER
  if (!sid || !token) {
    return { key: 'twilio', label: 'Twilio', configured: false, connected: null, detail: 'TWILIO_ACCOUNT_SID or AUTH_TOKEN not set' }
  }

  try {
    // Fetch account info — read-only
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, {
      headers: { Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64') },
      signal: AbortSignal.timeout(8000),
    })
    if (res.ok) {
      return { key: 'twilio', label: 'Twilio', configured: true, connected: true, detail: phone ? `Phone: ${phone}` : 'Connected (no phone set)' }
    }
    return { key: 'twilio', label: 'Twilio', configured: true, connected: false, detail: `API returned ${res.status}` }
  } catch (e) {
    return { key: 'twilio', label: 'Twilio', configured: true, connected: false, detail: (e as Error).message }
  }
}

// ── Resend ──────────────────────────────────────────────────
async function checkResend(): Promise<ServiceStatus> {
  const key = process.env.RESEND_API_KEY
  if (!key) return { key: 'resend', label: 'Resend', configured: false, connected: null, detail: 'RESEND_API_KEY not set' }

  try {
    const res = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8000),
    })
    if (res.ok) {
      return { key: 'resend', label: 'Resend', configured: true, connected: true, detail: 'API key valid' }
    }
    return { key: 'resend', label: 'Resend', configured: true, connected: false, detail: `API returned ${res.status}` }
  } catch (e) {
    return { key: 'resend', label: 'Resend', configured: true, connected: false, detail: (e as Error).message }
  }
}

// ── Anthropic ────────────────────────────────────────────────
async function checkAnthropic(): Promise<ServiceStatus> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return { key: 'anthropic', label: 'Anthropic', configured: false, connected: null, detail: 'ANTHROPIC_API_KEY not set' }

  try {
    // Tiny 1-token completion to verify key
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }],
      }),
      signal: AbortSignal.timeout(10000),
    })
    if (res.ok) {
      return { key: 'anthropic', label: 'Anthropic', configured: true, connected: true, detail: 'API key valid' }
    }
    const body = await res.json().catch(() => null)
    const msg = body?.error?.message || `API returned ${res.status}`
    return { key: 'anthropic', label: 'Anthropic', configured: true, connected: false, detail: msg }
  } catch (e) {
    return { key: 'anthropic', label: 'Anthropic', configured: true, connected: false, detail: (e as Error).message }
  }
}

// ── Serper ────────────────────────────────────────────────────
async function checkSerper(): Promise<ServiceStatus> {
  const key = process.env.SERPER_API_KEY
  if (!key) return { key: 'serper', label: 'Serper', configured: false, connected: null, detail: 'SERPER_API_KEY not set' }

  try {
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: 'test', num: 1 }),
      signal: AbortSignal.timeout(8000),
    })
    if (res.ok) {
      return { key: 'serper', label: 'Serper', configured: true, connected: true, detail: 'API key valid' }
    }
    return { key: 'serper', label: 'Serper', configured: true, connected: false, detail: `API returned ${res.status}` }
  } catch (e) {
    return { key: 'serper', label: 'Serper', configured: true, connected: false, detail: (e as Error).message }
  }
}

// ── SerpAPI ──────────────────────────────────────────────────
async function checkSerpApi(): Promise<ServiceStatus> {
  const key = process.env.SERPAPI_KEY
  if (!key) return { key: 'serpapi', label: 'SerpAPI', configured: false, connected: null, detail: 'SERPAPI_KEY not set' }

  try {
    const url = new URL('https://serpapi.com/account.json')
    url.searchParams.set('api_key', key)
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) })
    if (res.ok) {
      return { key: 'serpapi', label: 'SerpAPI', configured: true, connected: true, detail: 'API key valid' }
    }
    return { key: 'serpapi', label: 'SerpAPI', configured: true, connected: false, detail: `API returned ${res.status}` }
  } catch (e) {
    return { key: 'serpapi', label: 'SerpAPI', configured: true, connected: false, detail: (e as Error).message }
  }
}
