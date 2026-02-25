import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import Redis from 'ioredis'
import { Queue } from 'bullmq'

export const dynamic = 'force-dynamic'

const QUEUE_NAMES = [
  'enrichment',
  'preview',
  'personalization',
  'scripts',
  'distribution',
  'sequence',
  'import',
  'monitoring',
]

/**
 * GET /api/admin/queue-status
 * Returns job counts and recent failed jobs for all BullMQ queues.
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    if (!process.env.REDIS_URL) {
      return NextResponse.json({ error: 'REDIS_URL not configured' }, { status: 500 })
    }

    const redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      connectTimeout: 5000,
      retryStrategy: () => null,
    })

    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Redis timeout')), 8000)
    )

    // Test connection
    const pong = await Promise.race([redis.ping(), timeout])
    if (pong !== 'PONG') {
      await redis.quit()
      return NextResponse.json({ error: 'Redis not responding' }, { status: 500 })
    }

    const queues: Record<string, unknown> = {}
    const allFailed: Array<{
      queue: string
      id: string | undefined
      name: string | undefined
      failedReason: string | undefined
      attemptsMade: number | undefined
      timestamp: number | undefined
      data: unknown
    }> = []

    for (const name of QUEUE_NAMES) {
      try {
        // @ts-ignore - bullmq accepts ioredis connection
        const q = new Queue(name, { connection: redis })

        const counts = await Promise.race([q.getJobCounts(), timeout]) as Record<string, number>
        queues[name] = counts

        // Get last 20 failed jobs
        const failed = await Promise.race([q.getFailed(0, 20), timeout]) as Array<{
          id?: string
          name?: string
          failedReason?: string
          attemptsMade?: number
          timestamp?: number
          data?: unknown
        }>

        for (const job of failed) {
          allFailed.push({
            queue: name,
            id: job?.id,
            name: job?.name,
            failedReason: job?.failedReason,
            attemptsMade: job?.attemptsMade,
            timestamp: job?.timestamp,
            data: job?.data,
          })
        }

        await q.close()
      } catch (err) {
        queues[name] = { error: err instanceof Error ? err.message : String(err) }
      }
    }

    // Sort failed jobs by timestamp descending
    allFailed.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))

    await redis.quit()

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      redisConnected: true,
      queues,
      failedJobs: allFailed.slice(0, 50),
    })
  } catch (error) {
    console.error('Queue status check failed:', error)
    return NextResponse.json(
      { error: 'Failed to fetch queue status', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/queue-status
 * Actions: retry a failed job, or clear all failed jobs from a queue.
 */
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    if (!process.env.REDIS_URL) {
      return NextResponse.json({ error: 'REDIS_URL not configured' }, { status: 500 })
    }

    const { action, queueName, jobId } = await request.json()

    if (!action || !queueName || !QUEUE_NAMES.includes(queueName)) {
      return NextResponse.json({ error: 'Invalid action or queue name' }, { status: 400 })
    }

    const redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      connectTimeout: 5000,
      retryStrategy: () => null,
    })

    await redis.ping()

    // @ts-ignore - bullmq accepts ioredis connection
    const q = new Queue(queueName, { connection: redis })

    if (action === 'retry' && jobId) {
      const job = await q.getJob(jobId)
      if (job) {
        await job.retry()
        await q.close()
        await redis.quit()
        return NextResponse.json({ success: true, retried: jobId })
      }
      await q.close()
      await redis.quit()
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (action === 'clear') {
      const failed = await q.getFailed(0, 100)
      let cleared = 0
      for (const job of failed) {
        await job.remove()
        cleared++
      }
      await q.close()
      await redis.quit()
      return NextResponse.json({ success: true, cleared })
    }

    await q.close()
    await redis.quit()
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Queue action failed:', error)
    return NextResponse.json(
      { error: 'Queue action failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
