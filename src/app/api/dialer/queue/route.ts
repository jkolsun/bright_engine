import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { buildRepQueue, getLeadHistory } from '@/lib/dialer-queue'
import { generateAITip } from '@/lib/dialer-queue'

export const dynamic = 'force-dynamic'

/**
 * GET /api/dialer/queue — Get prioritized lead queue for current rep
 * Query: ?history=leadId (optionally fetch history for a specific lead)
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const historyLeadId = searchParams.get('history')

    // If requesting history for a specific lead
    if (historyLeadId) {
      const history = await getLeadHistory(historyLeadId)
      return NextResponse.json({ history })
    }

    // Build full prioritized queue
    const { leads, summary } = await buildRepQueue(session.userId)

    // Add AI tips to each lead
    const leadsWithTips = leads.map(lead => ({
      ...lead,
      aiTip: generateAITip(lead),
    }))

    return NextResponse.json({ leads: leadsWithTips, summary })
  } catch (error) {
    console.error('Queue error:', error)
    return NextResponse.json(
      { error: 'Failed to build queue', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}