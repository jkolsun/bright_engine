import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/clawdbot/status - System status for Clawdbot monitoring
export async function GET(request: NextRequest) {
  try {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const [
      totalLeads,
      leadsToday,
      hotLeads,
      totalClients,
      activeClients,
      totalRevenue,
      revenueThisWeek,
      pendingCommissions,
      unreadNotifications,
      recentActivity
    ] = await Promise.all([
      // Lead stats
      prisma.lead.count(),
      prisma.lead.count({ where: { createdAt: { gte: today } } }),
      prisma.lead.count({ where: { priority: 'HOT' } }),
      
      // Client stats  
      prisma.client.count(),
      prisma.client.count({ where: { hostingStatus: 'ACTIVE' } }),
      
      // Revenue stats
      prisma.revenue.aggregate({ _sum: { amount: true } }),
      prisma.revenue.aggregate({ 
        where: { createdAt: { gte: thisWeek } },
        _sum: { amount: true } 
      }),
      
      // Commission stats
      prisma.commission.aggregate({ 
        where: { status: 'PENDING' },
        _sum: { amount: true } 
      }),
      
      // Notification stats
      prisma.notification.count({ where: { read: false } }),
      
      // Recent activity
      prisma.leadEvent.findMany({
        where: { createdAt: { gte: new Date(now.getTime() - 60 * 60 * 1000) } }, // Last hour
        include: {
          lead: { select: { companyName: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ])

    const status = {
      system: {
        status: 'operational',
        timestamp: now.toISOString(),
        uptime: process.uptime()
      },
      leads: {
        total: totalLeads,
        today: leadsToday,
        hot: hotLeads,
        conversionRate: totalClients > 0 ? Math.round((totalClients / totalLeads) * 100) : 0
      },
      clients: {
        total: totalClients,
        active: activeClients,
        churnRate: totalClients > 0 ? Math.round(((totalClients - activeClients) / totalClients) * 100) : 0
      },
      revenue: {
        total: totalRevenue._sum.amount || 0,
        thisWeek: revenueThisWeek._sum.amount || 0,
        averagePerClient: totalClients > 0 ? Math.round((totalRevenue._sum.amount || 0) / totalClients) : 0
      },
      commissions: {
        pending: pendingCommissions._sum.amount || 0
      },
      alerts: {
        unreadNotifications,
        hotLeadsRequiringAttention: hotLeads
      },
      recentActivity: recentActivity.map(event => ({
        type: event.eventType,
        lead: event.lead?.companyName,
        timestamp: event.createdAt,
        actor: event.actor
      }))
    }

    // Health checks
    const warnings: string[] = []
    if (hotLeads > 5) warnings.push(`${hotLeads} hot leads require attention`)
    if (unreadNotifications > 10) warnings.push(`${unreadNotifications} unread notifications`)
    if (activeClients < totalClients * 0.8) warnings.push('High churn rate detected')

    return NextResponse.json({
      ...status,
      health: {
        status: warnings.length > 0 ? 'warning' : 'healthy',
        warnings
      }
    })
  } catch (error) {
    console.error('Clawdbot status error:', error)
    return NextResponse.json({
      system: {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Failed to fetch system status'
      },
      health: {
        status: 'unhealthy',
        warnings: ['Database connection error']
      }
    }, { status: 500 })
  }
}