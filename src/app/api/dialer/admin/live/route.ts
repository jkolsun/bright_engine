export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'
import { getConnectionStats } from '@/lib/dialer-events'

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const sessions = await prisma.dialerSessionNew.findMany({
      where: { isActive: true },
      include: {
        rep: { select: { id: true, name: true, email: true } },
        _count: { select: { calls: true } },
      },
      orderBy: { startedAt: 'desc' },
    })

    return NextResponse.json({ sessions, connections: getConnectionStats() })
  } catch (error) {
    console.error('[Dialer Admin Live API] GET error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
