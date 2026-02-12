import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
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

    // Get MRR
    const activeClients = await prisma.client.count({
      where: { hostingStatus: 'ACTIVE' },
    })

    const hostingMRR = activeClients * 39

    const upsellRevenue = await prisma.client.findMany({
      where: { hostingStatus: 'ACTIVE' },
      select: { monthlyRevenue: true },
    })

    const totalMRR = upsellRevenue.reduce((sum, client) => sum + client.monthlyRevenue, 0)
    const upsellMRR = totalMRR - hostingMRR

    return NextResponse.json({
      pipeline,
      today: todayStats,
      mrr: {
        hosting: hostingMRR,
        upsells: upsellMRR,
        total: totalMRR,
      },
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
