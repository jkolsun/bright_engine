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
  // Supports both naming conventions: TWILIO_REPn_NUMBER_PRIMARY and TWILIO_DIALER_NUMBER_n
  const numbers: string[] = []
  const seen = new Set<string>()
  const envKeys = [
    'TWILIO_REP1_NUMBER_PRIMARY',
    'TWILIO_REP2_NUMBER_PRIMARY',
    'TWILIO_DIALER_NUMBER_1',
    'TWILIO_DIALER_NUMBER_2',
    'TWILIO_DIALER_NUMBER_3',
  ]
  for (const key of envKeys) {
    const num = process.env[key]
    if (num && !seen.has(num)) {
      numbers.push(num)
      seen.add(num)
    }
  }

  return NextResponse.json({ numbers })
}
