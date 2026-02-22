export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const reps = await prisma.user.findMany({
      where: { role: { in: ['REP', 'ADMIN'] } },
      select: { id: true, name: true, email: true, role: true, twilioNumber1: true, twilioNumber2: true },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ reps })
  } catch (error) {
    console.error('[Admin Rep Numbers API] GET error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
