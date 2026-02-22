export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { recordingUrl } = await request.json()

    if (!recordingUrl) {
      return NextResponse.json({ error: 'recordingUrl is required' }, { status: 400 })
    }

    // Bug 10: HEAD-check the URL before saving
    try {
      const headResp = await fetch(recordingUrl, { method: 'HEAD' })
      if (!headResp.ok) {
        return NextResponse.json({ error: 'Recording URL not accessible' }, { status: 400 })
      }
    } catch {
      return NextResponse.json({ error: 'Recording URL validation failed' }, { status: 400 })
    }

    await prisma.user.update({
      where: { id: session.userId },
      data: { vmRecordingUrl: recordingUrl },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Dialer VM Upload API] POST error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
