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

    const missed = await prisma.dialerCall.findMany({
      where: {
        repId: session.userId,
        direction: 'INBOUND',
        dispositionResult: null,
        status: { in: ['COMPLETED', 'NO_ANSWER', 'FAILED'] },
      },
      include: {
        lead: {
          select: { id: true, companyName: true, phone: true, firstName: true, lastName: true },
        },
      },
      orderBy: { startedAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({ missed })
  } catch (error) {
    console.error('[Dialer Queue Missed API] GET error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
