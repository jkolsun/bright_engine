import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { OutboundChannel } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const channel = searchParams.get('channel') as OutboundChannel | null
    const repId = searchParams.get('repId')
    const period = searchParams.get('period') // YYYY-MM-DD
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)

    const where: any = {}
    if (channel) where.channel = channel
    if (repId) where.repId = repId
    if (period) where.period = period

    const performance = await prisma.channelPerformance.findMany({
      where,
      include: {
        rep: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { period: 'desc' },
      take: limit,
    })

    // Calculate aggregate stats
    const stats = {
      totalRecords: performance.length,
      aggregates: {
        totalSent: performance.reduce((sum, p) => sum + p.totalSent, 0),
        totalDelivered: performance.reduce((sum, p) => sum + p.totalDelivered, 0),
        totalOpened: performance.reduce((sum, p) => sum + p.totalOpened, 0),
        totalClicked: performance.reduce((sum, p) => sum + p.totalClicked, 0),
        totalReplied: performance.reduce((sum, p) => sum + p.totalReplied, 0),
        totalConversions: performance.reduce(
          (sum, p) => sum + p.conversionCount,
          0
        ),
        totalRevenue: performance.reduce((sum, p) => sum + p.revenue, 0),
      },
      averageRates: {
        openRate:
          performance.length > 0
            ? performance.reduce((sum, p) => sum + p.openRate, 0) /
              performance.length
            : 0,
        clickRate:
          performance.length > 0
            ? performance.reduce((sum, p) => sum + p.clickRate, 0) /
              performance.length
            : 0,
        replyRate:
          performance.length > 0
            ? performance.reduce((sum, p) => sum + p.replyRate, 0) /
              performance.length
            : 0,
      },
    }

    return NextResponse.json({ performance, stats })
  } catch (error) {
    console.error('Channel performance error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch channel performance' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      channel,
      period,
      campaignId,
      repId,
      metrics: {
        totalSent,
        totalDelivered,
        totalOpened,
        totalClicked,
        totalReplied,
        totalBounced,
        conversionCount,
        revenue,
      },
    } = body

    if (!channel || !period) {
      return NextResponse.json(
        { error: 'channel and period are required' },
        { status: 400 }
      )
    }

    // Calculate rates
    const openRate = totalSent > 0 ? totalOpened / totalSent : 0
    const clickRate = totalSent > 0 ? totalClicked / totalSent : 0
    const replyRate = totalSent > 0 ? totalReplied / totalSent : 0

    const record = await prisma.channelPerformance.upsert({
      where: {
        channel_campaignId_repId_period: {
          channel,
          campaignId: campaignId || null,
          repId: repId || null,
          period,
        },
      },
      create: {
        channel,
        period,
        campaignId,
        repId,
        totalSent,
        totalDelivered,
        totalOpened,
        totalClicked,
        totalReplied,
        totalBounced,
        openRate,
        clickRate,
        replyRate,
        conversionCount,
        revenue,
      },
      update: {
        totalSent,
        totalDelivered,
        totalOpened,
        totalClicked,
        totalReplied,
        totalBounced,
        openRate,
        clickRate,
        replyRate,
        conversionCount,
        revenue,
      },
    })

    return NextResponse.json({ record }, { status: 201 })
  } catch (error) {
    console.error('Channel performance creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create/update channel performance' },
      { status: 500 }
    )
  }
}
