import { NextRequest, NextResponse } from 'next/server'
import { dailySyncAndCalculate } from '@/lib/instantly'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * POST /api/instantly/manual-sync
 * Trigger an immediate Instantly sync (capacity calculation + lead push)
 * Admin-only — used by "Sync Now" button on dashboard
 */
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    console.log('[Instantly] Manual sync triggered by admin')
    const result = await dailySyncAndCalculate()

    return NextResponse.json({
      status: 'success',
      message: 'Manual sync completed',
      timestamp: result.timestamp,
      calculations: result.calculations,
      pushResults: result.pushResults,
    })
  } catch (error) {
    console.error('Manual sync error:', error)
    return NextResponse.json(
      { error: 'Sync failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
