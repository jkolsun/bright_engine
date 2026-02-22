export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { createLeadFromManualDial } from '@/lib/dialer-service'

export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')?.value
  const session = sessionCookie ? await verifySession(sessionCookie) : null
  if (!session || !['ADMIN', 'REP'].includes(session.role)) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const { phone, sessionId, twilioCallSid, companyName, contactName } = await request.json()
    if (!phone) {
      return NextResponse.json({ error: 'phone is required' }, { status: 400 })
    }
    const result = await createLeadFromManualDial({
      repId: session.userId,
      phone,
      sessionId,
      twilioCallSid,
      companyName,
      contactName,
    })
    return NextResponse.json(result)
  } catch (err) {
    console.error('[Dialer] Create lead from manual dial error:', err)
    return NextResponse.json({ error: 'Failed to create lead from manual dial' }, { status: 500 })
  }
}
