import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Simple in-memory rate limiting (use Redis in production for multi-instance)
const rateLimit = new Map<string, { count: number; resetAt: number }>()

const RATE_LIMIT = {
  '/api/messages': { requests: 20, window: 60000 }, // 20 per minute
  '/api/leads/import': { requests: 5, window: 60000 }, // 5 per minute
  '/login': { requests: 5, window: 300000 }, // 5 per 5 minutes
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'anonymous'

  // Check if path needs rate limiting
  const limitConfig = Object.entries(RATE_LIMIT).find(([path]) => 
    pathname.startsWith(path)
  )

  if (limitConfig) {
    const [path, config] = limitConfig
    const key = `${ip}:${path}`
    const now = Date.now()
    const record = rateLimit.get(key)

    if (record) {
      if (now < record.resetAt) {
        // Within window
        if (record.count >= config.requests) {
          return NextResponse.json(
            { error: 'Too many requests. Please try again later.' },
            { status: 429 }
          )
        }
        record.count++
      } else {
        // Window expired, reset
        rateLimit.set(key, { count: 1, resetAt: now + config.window })
      }
    } else {
      // First request
      rateLimit.set(key, { count: 1, resetAt: now + config.window })
    }
  }

  // Cleanup old entries (every 100 requests)
  if (Math.random() < 0.01) {
    const now = Date.now()
    for (const [key, record] of rateLimit.entries()) {
      if (now > record.resetAt + 60000) {
        rateLimit.delete(key)
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/api/:path*',
    '/login',
  ],
}
