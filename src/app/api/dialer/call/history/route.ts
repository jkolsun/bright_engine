export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')?.value
  const session = sessionCookie ? await verifySession(sessionCookie) : null
  if (!session || !['ADMIN', 'REP'].includes(session.role)) {
    return NextResponse.json({ error: 'Auth required' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const leadId = searchParams.get('leadId')
  if (!leadId) return NextResponse.json({ calls: [], nextCallback: null })

  const [calls, nextCallback] = await Promise.all([
    prisma.dialerCall.findMany({
      where: { leadId },
      orderBy: { startedAt: 'desc' },
      take: 5,
      select: {
        id: true, status: true, dispositionResult: true, notes: true,
        duration: true, connectedAt: true, startedAt: true,
        rep: { select: { name: true } },
      },
    }),
    prisma.callbackSchedule.findFirst({
      where: { leadId, status: 'PENDING' },
      orderBy: { scheduledAt: 'asc' },
      select: { scheduledAt: true, status: true, notes: true },
    }),
  ])

  return NextResponse.json({ calls, nextCallback })
}
