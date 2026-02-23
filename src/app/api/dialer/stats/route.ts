export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')?.value
  const session = sessionCookie ? await verifySession(sessionCookie) : null
  if (!session || !['ADMIN', 'REP'].includes(session.role)) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') || 'week'
  // Admins can query any rep; reps can only see their own stats
  const repId = session.role === 'ADMIN'
    ? searchParams.get('repId') || session.userId
    : session.userId

  // Calculate date range
  const now = new Date()
  let dateFrom: Date

  switch (period) {
    case 'today': {
      dateFrom = new Date(now)
      dateFrom.setHours(0, 0, 0, 0)
      break
    }
    case 'week': {
      dateFrom = new Date(now)
      dateFrom.setDate(dateFrom.getDate() - 7)
      dateFrom.setHours(0, 0, 0, 0)
      break
    }
    case 'month': {
      dateFrom = new Date(now)
      dateFrom.setDate(dateFrom.getDate() - 30)
      dateFrom.setHours(0, 0, 0, 0)
      break
    }
    case 'all':
    default: {
      dateFrom = new Date('2020-01-01')
      break
    }
  }

  try {
    // Aggregate from RepActivity (daily stat snapshots)
    const agg = await prisma.repActivity.aggregate({
      where: {
        repId,
        date: { gte: dateFrom },
      },
      _sum: {
        dials: true,
        conversations: true,
        previewLinksSent: true,
        closes: true,
        commissionEarned: true,
      },
    })

    const stats = {
      dials: agg._sum.dials ?? 0,
      conversations: agg._sum.conversations ?? 0,
      previewsSent: agg._sum.previewLinksSent ?? 0,
      closes: agg._sum.closes ?? 0,
      commissionEarned: agg._sum.commissionEarned ?? 0,
    }

    // Simple coaching tip for weekly stats
    let coachingTip: string | null = null
    if (period === 'week') {
      if (stats.dials > 0 && stats.conversations === 0) {
        coachingTip = 'You\'re putting in the dials — try adjusting your opener to convert more conversations.'
      } else if (stats.conversations > 0 && stats.closes === 0) {
        coachingTip = 'You\'re getting conversations — focus on qualifying harder and asking for the close.'
      } else if (stats.dials === 0) {
        coachingTip = 'Time to get on the phones! Consistent dials are the foundation of every top rep.'
      }
    }

    return NextResponse.json({ stats, coachingTip })
  } catch (error) {
    console.error('[Dialer Stats] Error:', error)
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 })
  }
}
