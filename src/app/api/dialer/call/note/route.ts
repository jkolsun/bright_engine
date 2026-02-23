export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { updateCallNotes } from '@/lib/dialer-service'

export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')?.value
  const session = sessionCookie ? await verifySession(sessionCookie) : null
  if (!session || !['ADMIN', 'REP'].includes(session.role)) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const { callId, leadId, notes } = await request.json()

    if (typeof notes !== 'string') {
      return NextResponse.json({ error: 'notes is required' }, { status: 400 })
    }

    // If callId provided, save to DialerCall.notes (existing behavior)
    if (callId) {
      const result = await updateCallNotes(callId, notes)
      return NextResponse.json(result)
    }

    // If only leadId provided, save as a LeadEvent (pre-call note)
    if (leadId) {
      const { prisma } = await import('@/lib/db')
      await prisma.leadEvent.create({
        data: {
          leadId,
          eventType: 'REP_NOTE',
          actor: `rep:${session.userId}`,
          metadata: { text: notes, source: 'dialer_notes' },
        },
      })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'callId or leadId is required' }, { status: 400 })
  } catch (err) {
    console.error('[Dialer] Update notes error:', err)
    return NextResponse.json({ error: 'Failed to update notes' }, { status: 500 })
  }
}
