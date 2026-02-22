export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id } = await params
    const { status, scheduledAt, notes } = await request.json()

    const updated = await prisma.callbackSchedule.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(scheduledAt ? { scheduledAt: new Date(scheduledAt) } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[Dialer Callback API] PATCH error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
