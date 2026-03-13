export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

/**
 * GET /api/messages-v2/reps — List all reps
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const reps = await prisma.user.findMany({
      where: { role: 'REP' },
      select: { id: true, name: true },
    })

    return NextResponse.json({ reps })
  } catch (error) {
    console.error('Messages V2 reps error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reps', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
