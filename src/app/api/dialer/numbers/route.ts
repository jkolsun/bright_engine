import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * GET /api/dialer/numbers — List available Twilio dialer numbers
 * Returns the dialer numbers configured in env vars (admin-only).
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const numbers = [
      process.env.TWILIO_DIALER_NUMBER_1,
      process.env.TWILIO_DIALER_NUMBER_2,
      process.env.TWILIO_DIALER_NUMBER_3,
      process.env.TWILIO_DIALER_NUMBER_4,
    ].filter((n): n is string => !!n && n.trim().length > 0)

    return NextResponse.json({ numbers })
  } catch (error) {
    console.error('Dialer numbers error:', error)
    return NextResponse.json({ error: 'Failed to get numbers' }, { status: 500 })
  }
}
