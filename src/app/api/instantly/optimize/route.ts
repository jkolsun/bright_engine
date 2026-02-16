import { NextRequest, NextResponse } from 'next/server'
import { analyzeAndOptimize, getOptimizationHistory } from '@/lib/instantly-phase3'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * GET /api/instantly/optimize
 * Get daily optimization analysis and recommendations
 * Requires 2+ weeks of send data to be meaningful
 * Admin-only
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const action = request.nextUrl.searchParams.get('action') || 'current'

    if (action === 'current') {
      // Get today's optimization analysis
      const analysis = await analyzeAndOptimize()
      return NextResponse.json(analysis)
    } else if (action === 'history') {
      // Get optimization history
      const days = parseInt(request.nextUrl.searchParams.get('days') || '30')
      const history = await getOptimizationHistory(days)
      return NextResponse.json(history)
    } else {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Optimize endpoint error:', error)
    return NextResponse.json(
      { error: 'Failed to get optimization', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
