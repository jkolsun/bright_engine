import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Verify the task belongs to this rep (unless admin)
    if (session.role !== 'ADMIN') {
      const existing = await prisma.repTask.findUnique({ where: { id: params.id }, select: { repId: true } })
      if (!existing || existing.repId !== session.userId) {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
      }
    }

    const data = await request.json()
    const task = await prisma.repTask.update({
      where: { id: params.id },
      data: {
        ...(data.status && { status: data.status }),
        ...(data.outcome && { outcome: data.outcome }),
        ...(data.completedAt && { completedAt: new Date(data.completedAt) }),
        ...(data.notes && { notes: data.notes }),
      }
    })
    return NextResponse.json({ task })
  } catch (error) {
    console.error('Error updating rep task:', error)
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
  }
}
