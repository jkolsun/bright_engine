import { NextRequest, NextResponse } from 'next/server'
import { initializeInstantlyJobs, startInstantlyWorker } from '@/worker/instantly-jobs'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * POST /api/instantly/init
 * Initialize Instantly BullMQ jobs on application startup
 * Admin-only (called once on deploy)
 */
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    console.log('[Instantly] Initializing jobs and worker...')

    // Initialize repeatable jobs
    await initializeInstantlyJobs()

    // Start the worker (listens for jobs)
    startInstantlyWorker()

    return NextResponse.json({
      status: 'initialized',
      message: 'Instantly BullMQ jobs created and worker started',
      jobs: [
        'daily-sync @ 8:00 AM ET',
        'midday-check @ 1:00 PM ET',
        'webhook-reconciliation @ hourly',
        'nightly-reconciliation @ 2:00 AM ET',
      ],
    })
  } catch (error) {
    console.error('Initialization error:', error)
    return NextResponse.json(
      { error: 'Failed to initialize', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
