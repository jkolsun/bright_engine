import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { addImportProcessingJob } from '@/worker/queue'
import { v4 as uuidv4 } from 'uuid'

export const dynamic = 'force-dynamic'

/**
 * POST /api/leads/import/process
 * Queue a background job to process imported leads through enrichment/preview/personalization.
 * Body: { leadIds: string[], options: { enrichment, preview, personalization } }
 * Returns: { jobId, totalLeads, status: 'queued' }
 */
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const { leadIds, options } = await request.json()

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ error: 'leadIds array is required' }, { status: 400 })
    }

    const jobId = uuidv4()

    // Store initial progress in Redis
    try {
      const Redis = (await import('ioredis')).default
      const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
        maxRetriesPerRequest: 3,
        connectTimeout: 5000,
      })
      await redis.set(
        `import:${jobId}`,
        JSON.stringify({
          status: 'queued',
          processed: 0,
          total: leadIds.length,
          failed: 0,
          errors: [] as string[],
          results: {} as Record<string, any>,
        }),
        'EX',
        3600 // 1 hour TTL
      )
      await redis.quit()
    } catch (err) {
      console.error('[Import Process] Failed to store progress in Redis:', err)
    }

    // Queue the background job
    const job = await addImportProcessingJob({
      jobId,
      leadIds,
      options: {
        enrichment: options?.enrichment ?? true,
        preview: options?.preview ?? true,
        personalization: options?.personalization ?? true,
      },
    })

    if (!job) {
      return NextResponse.json(
        { error: 'Failed to queue processing job. Redis may be unavailable.' },
        { status: 503 }
      )
    }

    return NextResponse.json({
      jobId,
      totalLeads: leadIds.length,
      status: 'queued',
    })
  } catch (error) {
    console.error('Import process error:', error)
    return NextResponse.json(
      { error: 'Failed to queue import processing' },
      { status: 500 }
    )
  }
}
