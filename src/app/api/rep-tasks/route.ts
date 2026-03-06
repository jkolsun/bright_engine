import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const repId = request.nextUrl.searchParams.get('repId')
    const status = request.nextUrl.searchParams.get('status')

    const where: any = {}
    // Reps can only see their own tasks
    if (session.role === 'ADMIN') {
      if (repId) where.repId = repId
    } else {
      where.repId = session.userId
    }
    if (status) where.status = { in: status.split(',') }

    const tasks = await prisma.repTask.findMany({
      where,
      include: { lead: { select: { id: true, firstName: true, lastName: true, companyName: true, phone: true, status: true } } },
      orderBy: [{ dueAt: 'asc' }],
      take: 100,
    })

    // Custom priority sort: URGENT first, then HIGH, then MEDIUM, then LOW
    const PRIORITY_ORDER: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
    tasks.sort((a, b) => {
      const aPri = PRIORITY_ORDER[a.priority] ?? 9
      const bPri = PRIORITY_ORDER[b.priority] ?? 9
      if (aPri !== bPri) return aPri - bPri
      // Secondary sort by dueAt (already sorted by Prisma, stable sort preserves)
      return 0
    })

    return NextResponse.json({ tasks })
  } catch (error) {
    console.error('Error fetching rep tasks:', error)
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}
