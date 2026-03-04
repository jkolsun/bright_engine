import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const { runId } = await params

    const run = await prisma.scraperRun.findUnique({
      where: { id: runId },
      include: {
        icp: {
          select: {
            id: true,
            name: true,
            repAllocation: true,
          },
        },
      },
    })

    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 })
    }

    return NextResponse.json({ run })
  } catch (error) {
    console.error('Get scraper run error:', error)
    return NextResponse.json({ error: 'Failed to get run' }, { status: 500 })
  }
}
