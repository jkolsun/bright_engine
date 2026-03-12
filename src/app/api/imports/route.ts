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

    const imports = await prisma.clawdbotActivity.findMany({
      where: { actionType: 'IMPORT' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        createdAt: true,
        description: true,
        metadata: true,
      },
    })

    return NextResponse.json({ imports })
  } catch (error) {
    console.error('Failed to fetch import history:', error)
    return NextResponse.json({ error: 'Failed to fetch import history' }, { status: 500 })
  }
}