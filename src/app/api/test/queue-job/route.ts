import { NextRequest, NextResponse } from 'next/server'
import { addEnrichmentJob } from '@/worker/queue'

export const dynamic = 'force-dynamic'

/**
 * GET /api/test/queue-job - Manually queue an enrichment job to test race condition fix
 */
export async function GET(request: NextRequest) {
  try {
    const testToken = request.nextUrl.searchParams.get('test-token')
    if (testToken !== 'e2e-test-live-pipeline-2026') {
      return NextResponse.json({ error: 'Invalid test token' }, { status: 403 })
    }

    console.log('[TEST] Manually queueing enrichment job...')
    
    const result = await addEnrichmentJob({
      leadId: 'test-race-condition-fix',
      companyName: 'Test Company Race Fix',
      city: 'Miami',
      state: 'FL'
    })

    return NextResponse.json({
      success: !!result,
      jobQueued: !!result,
      jobId: result?.id || null,
      message: result ? 'Job queued successfully!' : 'Job failed to queue'
    })
  } catch (error) {
    console.error('Test queue-job error:', error)
    return NextResponse.json(
      {
        error: 'Failed to queue test job',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}