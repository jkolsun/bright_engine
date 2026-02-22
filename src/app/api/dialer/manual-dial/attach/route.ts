export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { attachManualDialToLead } from '@/lib/dialer-service'

export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')?.value
  const session = sessionCookie ? await verifySession(sessionCookie) : null
  if (!session || !['ADMIN', 'REP'].includes(session.role)) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const { leadId, phone, sessionId, twilioCallSid } = await request.json()
    if (!leadId || !phone) {
      return NextResponse.json({ error: 'leadId and phone are required' }, { status: 400 })
    }
    const result = await attachManualDialToLead({
      repId: session.userId,
      leadId,
      phone,
      sessionId,
      twilioCallSid,
    })
    return NextResponse.json(result)
  } catch (err) {
    console.error('[Dialer] Attach manual dial error:', err)
    return NextResponse.json({ error: 'Failed to attach manual dial to lead' }, { status: 500 })
  }
}
