import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET — List all pending actions (approval queue)
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
    }

    const pendingActions = await prisma.pendingAction.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      include: {
        lead: {
          select: {
            firstName: true,
            companyName: true,
          },
        },
        conversation: {
          select: {
            stage: true,
          },
        },
      },
    })

    return NextResponse.json(pendingActions)
  } catch (error) {
    console.error('[PendingActions API] GET error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
