import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { triggerCloseEngine } from '@/lib/close-engine'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Require auth (Admin or Rep)
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { leadId, entryPoint, repId } = await request.json()

    if (!leadId || !entryPoint) {
      return NextResponse.json({ error: 'leadId and entryPoint required' }, { status: 400 })
    }

    // Validate entryPoint
    const validEntryPoints = ['INSTANTLY_REPLY', 'SMS_REPLY', 'REP_CLOSE', 'PREVIEW_CTA']
    if (!validEntryPoints.includes(entryPoint)) {
      return NextResponse.json({ error: 'Invalid entryPoint' }, { status: 400 })
    }

    const result = await triggerCloseEngine({ leadId, entryPoint, repId })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[CloseEngine Trigger API] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
