export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import Redis from 'ioredis'

export async function GET(request: NextRequest) {
  try {
    const testToken = request.nextUrl.searchParams.get('test-token')
    if (testToken !== 'e2e-test-live-pipeline-2026') {
      return NextResponse.json({ error: 'Invalid test token' }, { status: 403 })
    }

    const response: any = {
      timestamp: new Date().toISOString(),
      environment: {
        REDIS_URL: process.env.REDIS_URL ? 'SET' : 'MISSING',
        SERPAPI_KEY: process.env.SERPAPI_KEY ? 'SET' : 'MISSING',
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? 'SET' : 'MISSING',
        INSTANTLY_API_KEY: process.env.INSTANTLY_API_KEY ? 'SET' : 'MISSING',
      },
      redis: {
        configured: !!process.env.REDIS_URL,
        connected: false,
        error: null,
      },
    }

    // Test Redis connection
    if (process.env.REDIS_URL) {
      try {
        const redis = new Redis(process.env.REDIS_URL, {
          maxRetriesPerRequest: null,
          connectTimeout: 3000,
          retryStrategy: () => null,
          lazyConnect: true,
        })

        const connectPromise = redis.connect()
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))

        try {
          await Promise.race([connectPromise, timeout])
          const pong = await redis.ping()
          response.redis.connected = pong === 'PONG'
          await redis.quit()
        } catch (err) {
          response.redis.error = err instanceof Error ? err.message : 'Connection failed'
        }
      } catch (err) {
        response.redis.error = err instanceof Error ? err.message : 'Error initializing connection'
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Status check failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
