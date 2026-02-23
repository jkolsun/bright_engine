import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Authentication check - admin or rep access
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get pipeline counts
    const pipeline = {
      new: await prisma.lead.count({ where: { status: 'NEW' } }),
      hotLead: await prisma.lead.count({ where: { status: 'HOT_LEAD' } }),
      qualified: await prisma.lead.count({ where: { status: 'QUALIFIED' } }),
      building: await prisma.lead.count({ where: { status: 'BUILDING' } }),
      paid: await prisma.lead.count({ where: { status: 'PAID' } }),
    }

    // Get today's stats
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todayStats = {
      leadsImported: await prisma.lead.count({
        where: { createdAt: { gte: today } },
      }),
      emailsSent: await prisma.leadEvent.count({
        where: { 
          eventType: 'EMAIL_SENT',
          createdAt: { gte: today }
        },
      }),
      replies: await prisma.leadEvent.count({
        where: { 
          eventType: 'EMAIL_REPLIED',
          createdAt: { gte: today }
        },
      }),
      closes: await prisma.lead.count({
        where: { 
          status: 'PAID',
          updatedAt: { gte: today }
        },
      }),
      revenue: (await prisma.revenue.aggregate({
        where: { 
          createdAt: { gte: today },
          status: 'PAID'
        },
        _sum: { amount: true },
      }))._sum.amount || 0,
    }

    // Get MRR from actual PAID revenue records (not projected client.monthlyRevenue)
    const activeClients = await prisma.client.count({
      where: { hostingStatus: 'ACTIVE', deletedAt: null },
    })

    // MRR = sum of most recent PAID HOSTING_MONTHLY revenue per active client in last 60 days
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
    const recentHostingRevenue = await prisma.revenue.findMany({
      where: {
        type: 'HOSTING_MONTHLY',
        status: 'PAID',
        createdAt: { gte: sixtyDaysAgo },
        client: { hostingStatus: 'ACTIVE', deletedAt: null },
      },
      orderBy: { createdAt: 'desc' },
      select: { clientId: true, amount: true },
    })

    // Dedupe to most recent payment per client
    const latestPerClient = new Map<string, number>()
    for (const r of recentHostingRevenue) {
      if (r.clientId && !latestPerClient.has(r.clientId)) {
        latestPerClient.set(r.clientId, r.amount)
      }
    }
    const hostingMRR = Array.from(latestPerClient.values()).reduce((sum, amt) => sum + amt, 0)

    // Upsell MRR from recurring upsell revenue in last 60 days
    const recentUpsellRevenue = await prisma.revenue.findMany({
      where: {
        type: 'UPSELL',
        status: 'PAID',
        recurring: true,
        createdAt: { gte: sixtyDaysAgo },
        client: { hostingStatus: 'ACTIVE', deletedAt: null },
      },
      orderBy: { createdAt: 'desc' },
      select: { clientId: true, amount: true, product: true },
    })

    // Dedupe upsell by client+product
    const latestUpsellPerClient = new Map<string, number>()
    for (const r of recentUpsellRevenue) {
      const key = `${r.clientId}-${r.product || ''}`
      if (!latestUpsellPerClient.has(key)) {
        latestUpsellPerClient.set(key, r.amount)
      }
    }
    const upsellMRR = Array.from(latestUpsellPerClient.values()).reduce((sum, amt) => sum + amt, 0)

    const totalMRR = hostingMRR + upsellMRR

    // Add today's numbers
    const [todayLeads, todayHot, todayPaid, pipelineCounts] = await Promise.all([
      prisma.lead.count({ where: { createdAt: { gte: today } } }),
      prisma.lead.count({ where: { status: 'HOT_LEAD', updatedAt: { gte: today } } }),
      prisma.lead.count({ where: { status: 'PAID', updatedAt: { gte: today } } }),
      prisma.lead.groupBy({ by: ['status'], _count: { _all: true } }),
    ])

    // Calculate preview engagement metrics
    const totalLeads = await prisma.lead.count({
      where: { NOT: { status: 'CLOSED_LOST' } }
    })
    const previewViews = await prisma.leadEvent.count({
      where: { eventType: 'PREVIEW_VIEWED' }
    })
    const previewClicks = await prisma.leadEvent.count({
      where: { eventType: { in: ['PREVIEW_CTA_CLICKED', 'PREVIEW_CALL_CLICKED'] } }
    })
    
    // Count total clients for dashboard (exclude soft-deleted)
    const totalClients = await prisma.client.count({ where: { deletedAt: null } })

    return NextResponse.json({
      // Flat keys that the dashboard expects
      totalLeads,
      hotLeads: pipeline.hotLead,
      activeClients,
      totalClients,
      mrr: totalMRR,
      todayRevenue: todayStats.revenue,
      previewViews,
      previewClicks,
      // Keep nested data for other consumers
      pipeline,
      today: todayStats,
      mrrDetail: {
        hosting: hostingMRR,
        upsells: upsellMRR,
        total: totalMRR,
      },
      todayLeads,
      todayHot,
      todayPaid,
      pipelineDetailed: Object.fromEntries(pipelineCounts.map(p => [p.status, p._count._all])),
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
