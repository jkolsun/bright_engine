import { NextRequest, NextResponse } from 'next/server'
import { Worker, Queue } from 'bullmq'
import Redis from 'ioredis'

export const dynamic = 'force-dynamic'

/**
 * GET /api/test/direct-process - Create fresh worker and process job directly
 */
export async function GET(request: NextRequest) {
  try {
    const testToken = request.nextUrl.searchParams.get('test-token')
    if (testToken !== 'e2e-test-live-pipeline-2026') {
      return NextResponse.json({ error: 'Invalid test token' }, { status: 403 })
    }

    console.log('[DIRECT-TEST] Creating fresh Redis connection...')
    
    const connection = new Redis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: null,
      connectTimeout: 10000,
    })
    
    // Wait for connection
    await connection.ping()
    console.log('[DIRECT-TEST] Connection ready')
    
    // Create queue and worker with same connection
    // @ts-ignore - BullMQ has vendored ioredis that conflicts with root ioredis
    const queue = new Queue('test-direct', { connection: connection as any })

    // @ts-ignore - BullMQ has vendored ioredis that conflicts with root ioredis
    const worker = new Worker('test-direct', async (job) => {
      console.log(`[DIRECT-TEST] Processing job ${job.id}`)
      return { processed: true, jobId: job.id }
    }, { connection: connection as any })
    
    // Wait for worker to be ready
    await new Promise<void>((resolve) => {
      worker.on('ready', () => resolve())
      setTimeout(() => resolve(), 2000) // Fallback timeout
    })
    
    console.log('[DIRECT-TEST] Worker ready, adding job...')
    
    // Add a job
    const job = await queue.add('test-job', { testData: 'direct-process-test' })
    
    console.log(`[DIRECT-TEST] Job ${job.id} added, waiting for completion...`)
    
    // Wait for job completion
    const result = await new Promise((resolve) => {
      const timeout = setTimeout(() => resolve({ timeout: true }), 10000)
      
      worker.on('completed', (completedJob, result) => {
        if (completedJob.id === job.id) {
          clearTimeout(timeout)
          resolve({ completed: true, result })
        }
      })
    })
    
    // Cleanup
    await worker.close()
    await connection.quit()
    
    return NextResponse.json({
      success: true,
      jobId: job.id,
      result,
      message: 'Direct processing test completed'
    })
    
  } catch (error) {
    console.error('[DIRECT-TEST] Error:', error)
    return NextResponse.json(
      {
        error: 'Direct test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}