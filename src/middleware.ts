import { NextRequest, NextResponse } from 'next/server'
import { verifySession, signSession } from '@/lib/session'

// Platform domains — requests to these are handled as the admin app.
// Custom domains (anything else) are rewritten to /site/[clientId].
const PLATFORM_DOMAINS = (process.env.PLATFORM_DOMAINS || 'brightautomations.org,localhost').split(',').map(d => d.trim().toLowerCase())

// ── Webhook rate limiting (BUG 14.3) ──
// In-memory sliding window: IP → timestamps of recent requests
const webhookRateMap = new Map<string, number[]>()
const WEBHOOK_RATE_LIMIT = 100 // requests
const WEBHOOK_RATE_WINDOW = 60_000 // 1 minute

function isWebhookRateLimited(ip: string): boolean {
  const now = Date.now()
  const timestamps = webhookRateMap.get(ip) || []
  // Remove entries older than the window
  const recent = timestamps.filter(t => now - t < WEBHOOK_RATE_WINDOW)
  recent.push(now)
  webhookRateMap.set(ip, recent)
  // Periodic cleanup: if map gets large, prune stale IPs
  if (webhookRateMap.size > 10_000) {
    for (const [key, vals] of webhookRateMap) {
      if (vals.every(t => now - t >= WEBHOOK_RATE_WINDOW)) webhookRateMap.delete(key)
    }
  }
  return recent.length > WEBHOOK_RATE_LIMIT
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const hostname = (request.headers.get('host') || '').toLowerCase()

  // ── Multi-tenant domain routing ──
  // If hostname is NOT a known platform domain, treat it as a client custom domain
  const isPlatformDomain = PLATFORM_DOMAINS.some(d => hostname.includes(d))
  const isInternalPath = pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/site/') ||
    pathname.includes('.')

  if (!isPlatformDomain && !isInternalPath) {
    // Custom domain — look up clientId via internal API
    const lookupUrl = new URL('/api/domain-lookup', request.url)
    lookupUrl.searchParams.set('domain', hostname)

    try {
      const res = await fetch(lookupUrl.toString())
      if (res.ok) {
        const { clientId } = await res.json()
        if (clientId) {
          const url = request.nextUrl.clone()
          url.pathname = `/site/${clientId}`
          return NextResponse.rewrite(url)
        }
      }
    } catch (err) {
      console.error('[Middleware] Domain lookup failed:', err)
    }

    // Domain not found — show "site not available"
    const url = request.nextUrl.clone()
    url.pathname = '/site/not-found'
    return NextResponse.rewrite(url)
  }

  // ── BUG 14.5 + NEW-L11: Block test routes in production ──
  if (pathname.startsWith('/api/test') && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Test routes disabled in production' }, { status: 404 })
  }

  // ── BUG 14.3: Webhook rate limiting ──
  if (pathname.startsWith('/api/webhooks/')) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
    if (isWebhookRateLimited(ip)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }
  }

  // Clawdbot API uses API key auth, not cookies
  if (pathname.startsWith('/api/clawdbot/')) {
    const apiKey = request.headers.get('x-clawdbot-key')
    if (!apiKey || apiKey !== process.env.CLAWDBOT_API_KEY) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }
    return NextResponse.next()
  }

  // Public routes — no auth needed
  if (
    pathname === '/login' ||
    pathname === '/start' ||
    pathname === '/success' ||
    pathname === '/terms' ||
    pathname.startsWith('/preview/') ||
    pathname.startsWith('/site/') ||
    pathname.startsWith('/onboard/') ||
    pathname.startsWith('/api/onboard/') ||
    pathname.startsWith('/api/preview/track') ||
    pathname.startsWith('/api/domain-lookup') ||
    pathname.startsWith('/api/health') ||
    pathname.startsWith('/api/bootstrap/') ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/start') ||
    pathname.startsWith('/api/webhooks/') ||
    pathname.startsWith('/api/test/') ||
    pathname.startsWith('/api/worker-init') ||
    pathname.startsWith('/api/admin/diagnostics') ||
    pathname.startsWith('/api/instantly/sync-campaigns') ||
    pathname.startsWith('/api/settings/store-campaigns') ||
    pathname === '/api/webhook-trigger' ||
    pathname === '/api/webhook-trigger-simple' ||
    pathname === '/api/health-simple'
  ) {
    return NextResponse.next()
  }

  // Read session cookie
  const sessionCookie = request.cookies.get('session')?.value

  if (!sessionCookie) {
    // No session — redirect to login (but not for API routes, return 401 instead)
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Verify signed session
  const decoded = await verifySession(sessionCookie)
  if (!decoded) {
    // Invalid session — clear it and redirect to login
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('session')
    return response
  }

  const userRole = decoded.role || 'guest'

  // ── NEW-M8: Session refresh — extend active sessions ──
  // If session is >12h old but <24h, re-sign with fresh maxAge
  let sessionRefreshResponse: NextResponse | null = null
  if (decoded.iat) {
    const ageMs = Date.now() - decoded.iat
    const TWELVE_HOURS = 12 * 60 * 60 * 1000
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000
    if (ageMs > TWELVE_HOURS && ageMs < TWENTY_FOUR_HOURS) {
      try {
        const refreshed = await signSession({ ...decoded, iat: Date.now() })
        sessionRefreshResponse = NextResponse.next()
        sessionRefreshResponse.cookies.set({
          name: 'session',
          value: refreshed,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 24 * 60 * 60,
        })
      } catch {
        // Refresh failed — continue with existing session
      }
    }
  }

  // Admin-only API routes (but diagnostics is checked inside the route)
  const adminOnlyPaths = [
    '/api/admin/',
    '/api/users',
    '/api/cleanup', 
    '/api/clients/delete',
    '/api/leads/delete',
    '/api/activity/delete',
    '/api/revenue',
    '/api/clients',
    '/api/dashboard/stats'
  ]
  if (adminOnlyPaths.some(p => pathname.startsWith(p)) && !pathname.includes('/diagnostics') && !pathname.includes('/onboarding')) {
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
  }

  // Site editor — admin only (full-screen, outside /admin layout)
  if (pathname.startsWith('/site-editor')) {
    if (userRole !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return sessionRefreshResponse || NextResponse.next()
  }

  // Admin routes — only ADMIN role
  if (pathname.startsWith('/admin')) {
    if (userRole !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return sessionRefreshResponse || NextResponse.next()
  }

  // Part-time rep routes — REP (PART_TIME) or ADMIN
  if (pathname.startsWith('/part-time')) {
    if (userRole !== 'REP' && userRole !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    // Full-time reps should use /reps instead
    if (userRole === 'REP' && decoded.portalType !== 'PART_TIME') {
      return NextResponse.redirect(new URL('/reps', request.url))
    }
    return sessionRefreshResponse || NextResponse.next()
  }

  // Rep routes — REP (FULL) or ADMIN
  if (pathname.startsWith('/reps')) {
    if (userRole !== 'REP' && userRole !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    // Part-time reps should use /part-time instead
    if (userRole === 'REP' && decoded.portalType === 'PART_TIME') {
      return NextResponse.redirect(new URL('/part-time', request.url))
    }
    // Onboarding gate — redirect unboarded full-time reps
    if (userRole === 'REP' && decoded.portalType !== 'PART_TIME' && !decoded.onboardingCompletedAt) {
      if (!pathname.startsWith('/reps/onboarding')) {
        return NextResponse.redirect(new URL('/reps/onboarding', request.url))
      }
    }
    return sessionRefreshResponse || NextResponse.next()
  }

  // API routes — any authenticated user
  if (pathname.startsWith('/api/')) {
    return sessionRefreshResponse || NextResponse.next()
  }

  // Default — allow authenticated users through
  return sessionRefreshResponse || NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
