export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { calculateRecommendation } from '@/lib/recommendation-engine'

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const callId = searchParams.get('callId')
    const leadId = searchParams.get('leadId')

    if (!callId || !leadId) {
      return NextResponse.json({ error: 'callId and leadId are required' }, { status: 400 })
    }

    const recommendation = await calculateRecommendation(callId, leadId)

    return NextResponse.json(recommendation)
  } catch (error) {
    console.error('[Dialer Recommendation API] GET error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
