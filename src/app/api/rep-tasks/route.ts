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
      orderBy: [{ priority: 'asc' }, { dueAt: 'asc' }],
      take: 100,
    })
    return NextResponse.json({ tasks })
  } catch (error) {
    console.error('Error fetching rep tasks:', error)
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}
