import { NextRequest, NextResponse } from 'next/server'
import { getSharedConnection } from '@/worker/queue'

export const dynamic = 'force-dynamic'

/**
 * GET /api/test/worker-debug - Debug shared connection status
 */
export async function GET(request: NextRequest) {
  try {
    const testToken = request.nextUrl.searchParams.get('test-token')
    if (testToken !== 'e2e-test-live-pipeline-2026') {
      return NextResponse.json({ error: 'Invalid test token' }, { status: 403 })
    }

    console.log('[WORKER-DEBUG] Checking shared connection...')
    
    const sharedConnection = getSharedConnection()
    
    let connectionStatus = {
      exists: !!sharedConnection,
      status: null as string | null,
      ping: null as string | null,
      error: null as string | null
    }

    if (sharedConnection) {
      try {
        connectionStatus.status = sharedConnection.status
        const pong = await sharedConnection.ping()
        connectionStatus.ping = pong
      } catch (err) {
        connectionStatus.error = err instanceof Error ? err.message : String(err)
      }
    }

    return NextResponse.json({
      sharedConnection: connectionStatus,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Worker debug error:', error)
    return NextResponse.json(
      {
        error: 'Debug failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}