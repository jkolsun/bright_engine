import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { getDialerSettings, updateDialerSettings } from '@/lib/dialer'
import { startDialerSession, endDialerSession } from '@/lib/dialer'

export const dynamic = 'force-dynamic'

/**
 * GET /api/dialer/settings — Get dialer settings
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const settings = await getDialerSettings()
    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Settings error:', error)
    return NextResponse.json({ error: 'Failed to get settings' }, { status: 500 })
  }
}

/**
 * PUT /api/dialer/settings — Update dialer settings (admin only)
 */
export async function PUT(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const updates = await request.json()
    const settings = await updateDialerSettings(updates)
    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Update settings error:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}

/**
 * POST /api/dialer/settings — Start/end dialer session
 * Body: { action: 'start' | 'end', mode?: string, linesPerDial?: number, sessionId?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { action, mode = 'power', linesPerDial = 3, sessionId } = await request.json()

    if (action === 'start') {
      const dialerSession = await startDialerSession(session.userId, mode, linesPerDial)
      return NextResponse.json({ session: dialerSession })
    }

    if (action === 'end' && sessionId) {
      const dialerSession = await endDialerSession(sessionId)
      return NextResponse.json({ session: dialerSession })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Session error:', error)
    return NextResponse.json({ error: 'Failed to manage session' }, { status: 500 })
  }
}