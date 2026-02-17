import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { getLiveRepStatus } from '@/lib/dialer'

export const dynamic = 'force-dynamic'

/**
 * GET /api/dialer/live — All reps' live status (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const reps = await getLiveRepStatus()
    return NextResponse.json({ reps })
  } catch (error) {
    console.error('Live status error:', error)
    return NextResponse.json({ error: 'Failed to get live status' }, { status: 500 })
  }
}