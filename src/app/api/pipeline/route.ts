import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/pipeline - Get pipeline stats and conversion rates
export async function GET(request: NextRequest) {
  try {
    // Define pipeline stages in order
    const stages = [
      { name: 'New', status: 'NEW' },
      { name: 'Hot Lead', status: 'HOT_LEAD' },
      { name: 'Qualified', status: 'QUALIFIED' },
      { name: 'Info Collected', status: 'INFO_COLLECTED' },
      { name: 'Building', status: 'BUILDING' },
      { name: 'QA', status: 'QA' },
      { name: 'Client Review', status: 'CLIENT_REVIEW' },
      { name: 'Approved', status: 'APPROVED' },
      { name: 'Paid', status: 'PAID' },
    ]

    // Get counts for each stage
    const stageCounts = await Promise.all(
      stages.map(async (stage) => ({
        name: stage.name,
        status: stage.status,
        count: await prisma.lead.count({
          where: { status: stage.status as any }
        })
      }))
    )

    // Calculate conversion rates
    const totalLeads = await prisma.lead.count()
    const paidLeads = await prisma.lead.count({ where: { status: 'PAID' } })
    const overallConversion = totalLeads > 0 ? (paidLeads / totalLeads) * 100 : 0

    // Get stage-to-stage conversion rates (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentLeads = await prisma.lead.count({
      where: { createdAt: { gte: thirtyDaysAgo } }
    })

    const recentPaid = await prisma.lead.count({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        status: 'PAID'
      }
    })

    const recentConversion = recentLeads > 0 ? (recentPaid / recentLeads) * 100 : 0

    // Get average time in pipeline
    const paidLeadsWithTime = await prisma.lead.findMany({
      where: { status: 'PAID' },
      select: {
        createdAt: true,
        updatedAt: true
      },
      take: 100,
      orderBy: { updatedAt: 'desc' }
    })

    const avgTimeInPipeline = paidLeadsWithTime.length > 0
      ? paidLeadsWithTime.reduce((sum, lead) => {
          const days = Math.floor(
            (lead.updatedAt.getTime() - lead.createdAt.getTime()) / (1000 * 60 * 60 * 24)
          )
          return sum + days
        }, 0) / paidLeadsWithTime.length
      : 0

    return NextResponse.json({
      stages: stageCounts,
      metrics: {
        totalLeads,
        paidLeads,
        overallConversion: Math.round(overallConversion * 10) / 10,
        recentConversion: Math.round(recentConversion * 10) / 10,
        avgDaysInPipeline: Math.round(avgTimeInPipeline)
      }
    })
  } catch (error) {
    console.error('Error fetching pipeline:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pipeline' },
      { status: 500 }
    )
  }
}
