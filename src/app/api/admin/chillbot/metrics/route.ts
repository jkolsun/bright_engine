import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || (session.role !== 'ADMIN' && session.role !== 'CHILLBOT')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const now = new Date()
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [
      totalLeads,
      leadsByStatus,
      leadsBySource,
      leadsLast7Days,
      leadsLast30Days,
      totalActiveClients,
      clientsByStatus,
      totalMRR,
      churnedLast30,
      revenueLast7,
      revenueLast30,
      revenueByType,
      commissionsByStatus,
      activeReps,
      messagesLast7Days,
    ] = await Promise.all([
      prisma.lead.count(),

      prisma.lead.groupBy({
        by: ['status'],
        _count: { id: true },
      }),

      prisma.lead.groupBy({
        by: ['source'],
        _count: { id: true },
      }),

      prisma.lead.count({ where: { createdAt: { gte: sevenDaysAgo } } }),

      prisma.lead.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),

      prisma.client.count({ where: { hostingStatus: 'ACTIVE' } }),

      prisma.client.groupBy({
        by: ['hostingStatus'],
        _count: { id: true },
      }),

      prisma.client.aggregate({
        _sum: { monthlyRevenue: true },
        where: { hostingStatus: 'ACTIVE' },
      }),

      prisma.client.count({
        where: {
          hostingStatus: { in: ['CANCELLED'] },
          updatedAt: { gte: thirtyDaysAgo },
        },
      }),

      prisma.revenue.aggregate({
        _sum: { amount: true },
        _count: { id: true },
        where: { createdAt: { gte: sevenDaysAgo } },
      }),

      prisma.revenue.aggregate({
        _sum: { amount: true },
        _count: { id: true },
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),

      prisma.revenue.groupBy({
        by: ['type'],
        _sum: { amount: true },
        _count: { id: true },
      }),

      prisma.commission.groupBy({
        by: ['status'],
        _sum: { amount: true },
        _count: { id: true },
      }),

      prisma.user.findMany({
        where: { role: 'REP', status: 'ACTIVE' },
        select: {
          id: true,
          name: true,
          email: true,
        },
      }),

      prisma.message.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
    ])

    const paidLeads = leadsByStatus.find((l) => l.status === 'PAID')
    const conversionRate = leadsLast30Days > 0
      ? ((paidLeads?._count.id || 0) / leadsLast30Days * 100).toFixed(2)
      : '0.00'

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      pipeline: {
        totalLeads,
        byStatus: leadsByStatus.reduce((acc: Record<string, number>, item) => {
          acc[item.status] = item._count.id
          return acc
        }, {}),
        bySource: leadsBySource.reduce((acc: Record<string, number>, item) => {
          acc[item.source] = item._count.id
          return acc
        }, {}),
        newLast7Days: leadsLast7Days,
        newLast30Days: leadsLast30Days,
        conversionRate30d: parseFloat(conversionRate),
      },
      clients: {
        totalActive: totalActiveClients,
        byStatus: clientsByStatus.reduce((acc: Record<string, number>, item) => {
          acc[item.hostingStatus] = item._count.id
          return acc
        }, {}),
        mrr: totalMRR._sum.monthlyRevenue || 0,
        churnedLast30Days: churnedLast30,
      },
      revenue: {
        last7Days: {
          total: revenueLast7._sum.amount || 0,
          count: revenueLast7._count.id || 0,
        },
        last30Days: {
          total: revenueLast30._sum.amount || 0,
          count: revenueLast30._count.id || 0,
        },
        byType: revenueByType.reduce((acc: Record<string, any>, item) => {
          acc[item.type] = { total: item._sum.amount || 0, count: item._count.id }
          return acc
        }, {}),
      },
      commissions: {
        byStatus: commissionsByStatus.reduce((acc: Record<string, any>, item) => {
          acc[item.status] = { total: item._sum.amount || 0, count: item._count.id }
          return acc
        }, {}),
      },
      reps: {
        active: activeReps.map((rep) => ({
          id: rep.id,
          name: rep.name,
        })),
        count: activeReps.length,
      },
      communications: {
        messagesLast7Days,
      },
    })
  } catch (error) {
    console.error('[ChillBot Metrics] Error:', error)
    return NextResponse.json(
      { error: 'Metrics check failed', detail: String(error) },
      { status: 500 }
    )
  }
}
