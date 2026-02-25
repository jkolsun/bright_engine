export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')?.value
  const session = sessionCookie ? await verifySession(sessionCookie) : null
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  // Collect all available dialer numbers from env vars
  // Dynamically scans for TWILIO_REPn_NUMBER_PRIMARY and TWILIO_DIALER_NUMBER_n patterns
  const numbers: string[] = []
  const seen = new Set<string>()
  for (const [key, val] of Object.entries(process.env)) {
    if (!val) continue
    const isRepPrimary = /^TWILIO_REP\d+_NUMBER_PRIMARY$/.test(key)
    const isDialerNum = /^TWILIO_DIALER_NUMBER_\d+$/.test(key)
    if ((isRepPrimary || isDialerNum) && !seen.has(val)) {
      numbers.push(val)
      seen.add(val)
    }
  }

  return NextResponse.json({ numbers })
}
