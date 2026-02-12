import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/revenue - Get revenue summary
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const period = searchParams.get('period') || 'month' // day, week, month, year

  try {
    // Calculate date range
    const now = new Date()
    let startDate = new Date()
    
    switch (period) {
      case 'day':
        startDate.setHours(0, 0, 0, 0)
        break
      case 'week':
        startDate.setDate(now.getDate() - 7)
        break
      case 'month':
        startDate.setDate(now.getDate() - 30)
        break
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1)
        break
    }

    // Get active clients
    const activeClients = await prisma.client.count({
      where: { hostingStatus: 'ACTIVE' }
    })

    // Calculate hosting MRR
    const hostingMRR = activeClients * 39

    // Calculate upsells MRR
    const clients = await prisma.client.findMany({
      where: { hostingStatus: 'ACTIVE' },
      select: { upsells: true, monthlyRevenue: true }
    })

    const upsellsMRR = clients.reduce((sum, client) => {
      return sum + (client.monthlyRevenue - 39)
    }, 0)

    const totalMRR = hostingMRR + upsellsMRR

    // Get revenue for period
    const periodRevenue = await prisma.revenue.aggregate({
      where: {
        createdAt: { gte: startDate },
        status: 'PAID'
      },
      _sum: { amount: true },
      _count: true
    })

    // Get revenue by type
    const revenueByType = await prisma.revenue.groupBy({
      by: ['type'],
      where: {
        createdAt: { gte: startDate },
        status: 'PAID'
      },
      _sum: { amount: true }
    })

    // Calculate churn rate (monthly)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(now.getDate() - 30)
    
    const cancelledThisMonth = await prisma.client.count({
      where: {
        hostingStatus: 'CANCELLED',
        updatedAt: { gte: thirtyDaysAgo }
      }
    })

    const totalClientsStartOfMonth = activeClients + cancelledThisMonth
    const churnRate = totalClientsStartOfMonth > 0 
      ? (cancelledThisMonth / totalClientsStartOfMonth) * 100 
      : 0

    // Projections (simple 3-month based on current growth)
    const projectedAnnualRevenue = totalMRR * 12

    return NextResponse.json({
      summary: {
        totalMRR,
        hostingMRR,
        upsellsMRR,
        activeClients,
        projectedAnnualRevenue,
        churnRate: Math.round(churnRate * 10) / 10
      },
      period: {
        revenue: periodRevenue._sum.amount || 0,
        transactions: periodRevenue._count,
        period
      },
      breakdown: revenueByType.map(item => ({
        type: item.type,
        amount: item._sum.amount || 0
      }))
    })
  } catch (error) {
    console.error('Error fetching revenue:', error)
    return NextResponse.json(
      { error: 'Failed to fetch revenue' },
      { status: 500 }
    )
  }
}
