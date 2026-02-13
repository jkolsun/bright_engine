import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Public routes — no auth needed
  if (
    pathname === '/login' ||
    pathname.startsWith('/preview/') ||
    pathname.startsWith('/api/health') ||
    pathname.startsWith('/api/bootstrap/') ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/db-test') ||
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

  // Decode session
  let userRole = 'guest'
  try {
    const decoded = JSON.parse(Buffer.from(sessionCookie, 'base64').toString())
    userRole = decoded.role || 'guest'
  } catch {
    // Invalid cookie — clear it and redirect to login
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('session')
    return response
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
