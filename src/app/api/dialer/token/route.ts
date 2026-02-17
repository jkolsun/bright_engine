import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { generateDialerToken } from '@/lib/dialer'

export const dynamic = 'force-dynamic'

/**
 * POST /api/dialer/token — Generate browser calling token for rep
 */
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const result = await generateDialerToken(session.userId, session.name || 'Rep')

    return NextResponse.json(result)
  } catch (error) {
    console.error('Token generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate token', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}