import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  const repId = request.nextUrl.searchParams.get('repId')
  const status = request.nextUrl.searchParams.get('status')

  const where: any = {}
  if (repId) where.repId = repId
  if (status) where.status = { in: status.split(',') }

  const tasks = await prisma.repTask.findMany({
    where,
    include: { lead: { select: { id: true, firstName: true, lastName: true, companyName: true, phone: true, status: true } } },
    orderBy: [{ priority: 'asc' }, { dueAt: 'asc' }],
    take: 100,
  })
  return NextResponse.json({ tasks })
}