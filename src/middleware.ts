import { NextRequest, NextResponse } from 'next/server'

/**
 * Middleware to enforce role-based access control
 * - Admins can access /admin/*
 * - Reps can only access /reps/* and /preview/*
 * - Public routes: /login, /preview/*, /api/health, /api/bootstrap/*, /api/auth/*
 */
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Public routes - allow all (no auth required)
  if (
    pathname === '/login' ||
    pathname.startsWith('/preview/') ||
    pathname.startsWith('/api/health') ||
    pathname.startsWith('/api/bootstrap/') ||
    pathname.startsWith('/api/auth/')
  ) {
    return NextResponse.next()
  }

  // Get user role from cookie/session (simplified - check headers)
  const userRole = request.headers.get('x-user-role') || 'guest'

  // Admin routes - only ADMIN role
  if (pathname.startsWith('/admin')) {
    if (userRole !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.next()
  }

  // Rep routes - only REP role
  if (pathname.startsWith('/reps')) {
    if (userRole !== 'REP' && userRole !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.next()
  }

  // API routes require auth (except public ones handled above)
  if (pathname.startsWith('/api/')) {
    if (userRole === 'guest') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.next()
  }

  // Default - redirect to login
  return NextResponse.redirect(new URL('/login', request.url))
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
