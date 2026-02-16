import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import Redis from 'ioredis'
import { Queue } from 'bullmq'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/diagnostics
 * System health check - diagnoses worker and queue status
 * Admin-only access
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      environment: {},
      redis: { connected: false, error: null },
      worker: { running: false, registered: false, error: null },
      queues: {},
      failedJobs: [],
      errors: [],
      summary: 'Initializing...',
    }

    // 1. Check env vars
    diagnostics.environment = {
      REDIS_URL: !!process.env.REDIS_URL ? 'SET' : 'MISSING',
      SERPAPI_KEY: !!process.env.SERPAPI_KEY ? 'SET' : 'MISSING',
      ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY ? 'SET' : 'MISSING',
      INSTANTLY_API_KEY: !!process.env.INSTANTLY_API_KEY ? 'SET' : 'MISSING',
      BASE_URL: !!process.env.BASE_URL ? 'SET' : 'MISSING',
      SESSION_SECRET: !!process.env.SESSION_SECRET ? 'SET' : 'MISSING',
      NODE_ENV: process.env.NODE_ENV || 'unknown',
    }

    // 2. Test Redis connection and check queue status
    if (process.env.REDIS_URL) {
      try {
        const redis = new Redis(process.env.REDIS_URL, {
          maxRetriesPerRequest: null,
          connectTimeout: 5000,
          retryStrategy: () => null,
        })

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Redis timeout')), 5000)
        )

        // Test connection
        const pingPromise = redis.ping()
        const pong = await Promise.race([pingPromise, timeoutPromise])
        diagnostics.redis.connected = pong === 'PONG'

        // If connected, check enrichment queue
        if (diagnostics.redis.connected) {
          try {
            // @ts-ignore - bullmq has vendored ioredis
            const enrichmentQueue = new Queue('enrichment', { connection: redis })

            // Get job counts
            const jobCountsPromise = enrichmentQueue.getJobCounts()
            const jobCounts = await Promise.race([jobCountsPromise, timeoutPromise]) as any
            diagnostics.queues.enrichment = jobCounts

            // Get failed jobs
            const failedJobsPromise = enrichmentQueue.getFailed(0, 10)
            const failedJobs = await Promise.race([failedJobsPromise, timeoutPromise]) as any[]
            diagnostics.failedJobs = failedJobs.map((j) => ({
              id: j?.id,
              name: j?.name,
              failedReason: j?.failedReason,
              attemptsMade: j?.attemptsMade,
            }))
          } catch (err) {
            diagnostics.errors.push(
              'Failed to inspect queue: ' + (err instanceof Error ? err.message : String(err))
            )
          }
        }

        await redis.quit()
      } catch (err) {
        diagnostics.redis.error = err instanceof Error ? err.message : String(err)
        diagnostics.redis.connected = false
      }
    }

    // 3. Check if worker is registered
    // This is a simple check - in production you'd check for active worker connections
    diagnostics.worker.running = false // Will be false unless worker explicitly pings

    // Try to detect worker via environment
    const isWorkerProcess = process.env.WORKER_PROCESS === 'true'
    diagnostics.worker.registered = isWorkerProcess

    // 4. Summary
    const allEnvVarsSet = Object.values(diagnostics.environment).every(v => v !== 'MISSING')
    const redisConnected = diagnostics.redis.connected
    const workerRunning = diagnostics.worker.running || diagnostics.worker.registered

    if (!allEnvVarsSet) {
      const missing = Object.entries(diagnostics.environment)
        .filter(([, v]) => v === 'MISSING')
        .map(([k]) => k)
      diagnostics.summary = `MISSING ENV VARS: ${missing.join(', ')}`
    } else if (!redisConnected) {
      diagnostics.summary = 'REDIS NOT CONNECTED - enrichment queue blocked'
    } else if (!workerRunning) {
      diagnostics.summary = 'WORKER NOT RUNNING - jobs queued but not processed'
    } else {
      diagnostics.summary = 'ALL SYSTEMS OPERATIONAL'
    }

    return NextResponse.json(diagnostics, { status: 200 })
  } catch (error) {
    console.error('Diagnostic check failed:', error)
    return NextResponse.json(
      {
        error: 'Diagnostic failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
