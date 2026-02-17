import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { logCallOutcome, autoTextPreview } from '@/lib/dialer'

export const dynamic = 'force-dynamic'

/**
 * POST /api/dialer/log — Log call outcome
 * Body: { callId, outcome, notes?, callbackDate?, durationSeconds?, autoText?: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { callId, outcome, notes, callbackDate, durationSeconds, autoText } = await request.json()

    if (!callId || !outcome) {
      return NextResponse.json({ error: 'callId and outcome required' }, { status: 400 })
    }

    const validOutcomes = [
      'interested', 'not_interested', 'callback', 'no_answer',
      'voicemail_left', 'voicemail_skipped', 'wrong_number', 'dnc',
    ]

    if (!validOutcomes.includes(outcome)) {
      return NextResponse.json({ error: `Invalid outcome. Must be: ${validOutcomes.join(', ')}` }, { status: 400 })
    }

    const call = await logCallOutcome({ callId, outcome, notes, callbackDate, durationSeconds })

    // Auto-text preview if requested
    let textResult: any = null
    if (autoText) {
      textResult = await autoTextPreview(callId, session.name || 'Rep')
    }

    return NextResponse.json({ call, textResult })
  } catch (error) {
    console.error('Log outcome error:', error)
    return NextResponse.json(
      { error: 'Failed to log outcome', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}