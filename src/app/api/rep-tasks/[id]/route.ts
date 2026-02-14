import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
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
}