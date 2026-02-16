import { NextRequest, NextResponse } from 'next/server'
import { pauseInstantlySequenceOnPositiveResponse, resumeInstantlySequence } from '@/lib/instantly-phase2'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * POST /api/instantly/pause-resume
 * Pause or resume a lead's Instantly sequence
 * Called when rep gets positive response on call (pause) or decides to re-engage (resume)
 * Reps can call this, admins can call this
 */
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? verifySession(sessionCookie) : null
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { lead_id, action } = await request.json()

    if (!lead_id || !action) {
      return NextResponse.json({ error: 'lead_id and action required' }, { status: 400 })
    }

    if (!['pause', 'resume'].includes(action)) {
      return NextResponse.json({ error: 'action must be pause or resume' }, { status: 400 })
    }

    if (action === 'pause') {
      await pauseInstantlySequenceOnPositiveResponse(lead_id)
      return NextResponse.json({
        status: 'paused',
        lead_id,
        message: 'Instantly sequence paused. Rep can resume if conversation dies.',
      })
    } else {
      await resumeInstantlySequence(lead_id)
      return NextResponse.json({
        status: 'resumed',
        lead_id,
        message: 'Instantly sequence resumed.',
      })
    }
  } catch (error) {
    console.error('Pause/resume error:', error)
    return NextResponse.json(
      { error: 'Failed to update sequence', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
