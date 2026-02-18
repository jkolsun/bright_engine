import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

// GET /api/clients/stats - Get client overview stats
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [
      allClients,
      newThisMonth,
      churnedThisMonth,
      pastDuePayments,
      pendingEdits,
      escalatedMessages,
      revenueByMonth,
    ] = await Promise.all([
      prisma.client.findMany({
        select: {
          id: true,
          hostingStatus: true,
          monthlyRevenue: true,
          healthScore: true,
          createdAt: true,
          churnedDate: true,
          closedDate: true,
        }
      }),
      prisma.client.count({
        where: {
          createdAt: { gte: startOfMonth },
          hostingStatus: 'ACTIVE',
        }
      }),
      prisma.client.count({
        where: {
          churnedDate: { gte: startOfMonth },
          hostingStatus: 'CANCELLED',
        }
      }),
      prisma.client.count({
        where: {
          hostingStatus: { in: ['FAILED_PAYMENT', 'GRACE_PERIOD'] }
        }
      }),
      prisma.editRequest.count({
        where: {
          status: { in: ['new', 'ai_processing', 'ready_for_review'] }
        }
      }),
      prisma.message.count({
        where: {
          escalated: true,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }
      }),
      // Get revenue data for MRR timeline (last 6 months)
      prisma.revenue.groupBy({
        by: ['createdAt'],
        where: {
          type: 'HOSTING_MONTHLY',
          status: 'PAID',
          createdAt: { gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) }
        },
        _sum: { amount: true },
      }),
    ])

    const active = allClients.filter(c => c.hostingStatus === 'ACTIVE')
    const mrr = active.reduce((sum, c) => sum + (c.monthlyRevenue || 0), 0)
    const avgLtv = active.length > 0
      ? Math.round(active.reduce((sum, c) => {
          const months = Math.max(1, Math.ceil((Date.now() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30)))
          return sum + (c.monthlyRevenue || 0) * months
        }, 0) / active.length)
      : 0
    const churnRate = allClients.length > 0
      ? Math.round((churnedThisMonth / Math.max(1, allClients.filter(c => c.hostingStatus !== 'CANCELLED').length)) * 100)
      : 0

    // Edit requests ready for Jared
    const readyForReview = await prisma.editRequest.count({
      where: { status: 'ready_for_review' }
    })

    // Upsell replies needing follow-up
    const upsellFollowups = await prisma.upsellPitch.count({
      where: { status: { in: ['opened', 'clicked'] } }
    })

    return NextResponse.json({
      stats: {
        activeClients: active.length,
        mrr,
        avgLtv,
        churnRate,
        newThisMonth,
        churnedThisMonth,
        netNew: newThisMonth - churnedThisMonth,
      },
      alerts: {
        pastDuePayments,
        pendingEdits,
        readyForReview,
        upsellFollowups,
        escalatedMessages,
      },
    })
  } catch (error) {
    console.error('Error fetching client stats:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}