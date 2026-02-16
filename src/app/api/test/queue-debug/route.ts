export const dynamic = 'force-dynamic'

import { Queue } from 'bullmq'
import Redis from 'ioredis'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const testToken = request.nextUrl.searchParams.get('test-token')
    if (testToken !== 'e2e-test-live-pipeline-2026') {
      return NextResponse.json({ error: 'Invalid test token' }, { status: 403 })
    }

    // Environment variables status
    const envStatus = {
      REDIS_URL: !!process.env.REDIS_URL ? 'SET' : 'MISSING',
      SERPAPI_KEY: !!process.env.SERPAPI_KEY ? 'SET' : 'MISSING',
      ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY ? 'SET' : 'MISSING',
      INSTANTLY_API_KEY: !!process.env.INSTANTLY_API_KEY ? 'SET' : 'MISSING',
    }

    // Try to connect to Redis and check queue status
    let queueStatus: any = {
      connected: false,
      jobCounts: null,
      failedJobs: [],
      error: null,
    }

    if (process.env.REDIS_URL) {
      try {
        const redis = new Redis(process.env.REDIS_URL, {
          maxRetriesPerRequest: null,
          connectTimeout: 5000,
          retryStrategy: () => null,
        })

        // Set timeout for Redis operations
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Redis timeout')), 5000)
        )

        // Test connection
        const pingPromise = redis.ping()
        await Promise.race([pingPromise, timeoutPromise])

        queueStatus.connected = true

        // Create enrichment queue and get job counts
        // @ts-ignore - bullmq has vendored ioredis that conflicts with root ioredis
        const enrichmentQueue = new Queue('enrichment', { connection: redis })
        const jobCountsPromise = enrichmentQueue.getJobCounts()
        const jobCounts = await Promise.race([jobCountsPromise, timeoutPromise]) as any
        queueStatus.jobCounts = jobCounts

        // Get failed jobs
        const failedJobsPromise = enrichmentQueue.getFailed(0, 10)
        const failedJobs = await Promise.race([failedJobsPromise, timeoutPromise]) as any[]
        queueStatus.failedJobs = failedJobs.map((j) => ({
          id: j?.id,
          name: j?.name,
          failedReason: j?.failedReason,
          attempts: j?.attemptsMade,
          data: j?.data,
        }))

        // Clean up
        await redis.quit()
      } catch (err) {
        queueStatus.error = err instanceof Error ? err.message : String(err)
      }
    } else {
      queueStatus.error = 'REDIS_URL not configured'
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: envStatus,
      queue: queueStatus,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Debug check failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
