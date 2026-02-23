export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const repId = searchParams.get('repId')

    const targetRepId = (session.role === 'ADMIN' && repId) ? repId : session.userId

    const whereClause: Prisma.LeadWhereInput = {
      OR: [
        { ownerRepId: targetRepId },
        { assignedToId: targetRepId },
      ],
      status: { notIn: ['CLOSED_LOST', 'DO_NOT_CONTACT'] },
      dncAt: null,
    }

    // NEW-L7: Run count + query in parallel for hasMore flag
    const [leads, totalCount] = await Promise.all([
      prisma.lead.findMany({
        where: whereClause,
        select: {
          id: true, companyName: true, firstName: true, lastName: true,
          phone: true, secondaryPhone: true, email: true, status: true, priority: true,
          city: true, state: true, industry: true, ownerRepId: true,
          previewId: true, previewUrl: true,
          _count: { select: { dialerCalls: true } },
        },
        orderBy: [
          { priority: 'desc' },
          { updatedAt: 'desc' },
        ],
        take: 100,
      }),
      prisma.lead.count({ where: whereClause }),
    ])

    return NextResponse.json({ leads, hasMore: totalCount > 100, totalCount })
  } catch (error) {
    console.error('[Dialer Queue API] GET error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
