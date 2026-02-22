export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { getTwilioClient } from '@/lib/twilio'

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { callSid } = await request.json()

    if (callSid) {
      const client = getTwilioClient()
      await client.calls(callSid).update({
        twiml: '<?xml version="1.0" encoding="UTF-8"?><Response><Say>The person you are trying to reach is unavailable. Please leave a message after the beep.</Say><Record maxLength="120" /></Response>',
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Dialer Inbound Decline API] POST error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
