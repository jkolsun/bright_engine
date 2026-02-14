import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Clawdbot API uses API key auth, not cookies
  if (pathname.startsWith('/api/clawdbot/')) {
    const apiKey = request.headers.get('x-clawdbot-key')
    if (!apiKey || apiKey !== process.env.CLAWDBOT_API_KEY) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }
    return NextResponse.next()
  }

  // Webhook trigger has its own auth
  if (pathname === '/api/webhook-trigger') {
    return NextResponse.next()
  }

  // Public routes — no auth needed
  if (
    pathname === '/login' ||
    pathname === '/success' || 
    pathname === '/terms' ||
    pathname.startsWith('/preview/') ||
    pathname.startsWith('/api/preview/track') ||
    pathname.startsWith('/api/health') ||
    pathname.startsWith('/api/bootstrap/') ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/webhooks/')
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
  const decoded = verifySession(sessionCookie)
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

  // Admin-only API routes
  const adminOnlyPaths = ['/api/admin/', '/api/users', '/api/cleanup', '/api/clients/delete', '/api/leads/delete', '/api/activity/delete']
  if (adminOnlyPaths.some(p => pathname.startsWith(p))) {
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
  }

  // Admin routes — only ADMIN role
  if (pathname.startsWith('/admin')) {
    if (userRole !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.next()
  }

  // Rep routes — REP or ADMIN
  if (pathname.startsWith('/reps')) {
    if (userRole !== 'REP' && userRole !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.next()
  }

  // API routes — any authenticated user
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Default — allow authenticated users through
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
