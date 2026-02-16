import { NextRequest, NextResponse } from 'next/server'
import { Queue } from 'bullmq'
import Redis from 'ioredis'

export const dynamic = 'force-dynamic'

/**
 * GET /api/test/force-queue - Force queue a job bypassing all our wrapper logic
 */
export async function GET(request: NextRequest) {
  try {
    const testToken = request.nextUrl.searchParams.get('test-token')
    if (testToken !== 'e2e-test-live-pipeline-2026') {
      return NextResponse.json({ error: 'Invalid test token' }, { status: 403 })
    }

    console.log('[FORCE-QUEUE] Creating direct Redis connection...')
    
    const connection = new Redis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: null,
      connectTimeout: 5000,
    })

    console.log('[FORCE-QUEUE] Testing Redis ping...')
    await connection.ping()
    console.log('[FORCE-QUEUE] Redis ping successful!')

    console.log('[FORCE-QUEUE] Creating queue directly...')
    // @ts-ignore
    const queue = new Queue('enrichment', { connection })

    console.log('[FORCE-QUEUE] Adding job directly to queue...')
    const job = await queue.add('enrich-lead', {
      leadId: 'force-test-job',
      companyName: 'Force Test Company',
      city: 'Miami',
      state: 'FL'
    })

    console.log('[FORCE-QUEUE] Job added successfully!', job.id)
    
    await connection.quit()

    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: 'Job force-queued successfully!'
    })
  } catch (error) {
    console.error('[FORCE-QUEUE] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to force queue job',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}