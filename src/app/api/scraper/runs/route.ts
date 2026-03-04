import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20', 10)

    const runs = await prisma.scraperRun.findMany({
      orderBy: { startedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        name: true,
        status: true,
        totalLeads: true,
        importedLeads: true,
        creditsUsed: true,
        startedAt: true,
        completedAt: true,
        cityMode: true,
        icpId: true,
        icp: { select: { name: true } },
      },
    })

    return NextResponse.json({ runs })
  } catch (error) {
    console.error('List runs error:', error)
    return NextResponse.json({ error: 'Failed to list runs' }, { status: 500 })
  }
}
