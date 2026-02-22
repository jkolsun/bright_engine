export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { vmRecordingUrl: true, vmRecordingSid: true },
    })

    return NextResponse.json({
      recordingUrl: user?.vmRecordingUrl,
      recordingSid: user?.vmRecordingSid,
    })
  } catch (error) {
    console.error('[Dialer VM Recording API] GET error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    await prisma.user.update({
      where: { id: session.userId },
      data: { vmRecordingUrl: null, vmRecordingSid: null },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Dialer VM Recording API] DELETE error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
