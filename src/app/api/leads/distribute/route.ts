export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'

/**
 * POST /api/leads/distribute
 * SMS distribution coming soon — Instantly integration removed.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin auth
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    return NextResponse.json({ success: true, message: 'SMS distribution coming soon' })
  } catch (error) {
    console.error('Distribution error:', error)
    return NextResponse.json(
      {
        error: 'Failed to distribute leads',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
