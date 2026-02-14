import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/clawdbot/activity - Get activity feed for Clawdbot monitoring
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const leadId = searchParams.get('leadId')
  const eventType = searchParams.get('eventType')
  const limit = parseInt(searchParams.get('limit') || '50')
  const since = searchParams.get('since') // ISO date string

  try {
    const where: any = {}
    if (leadId) where.leadId = leadId
    if (eventType) where.eventType = eventType
    if (since) where.createdAt = { gte: new Date(since) }

    const [events, hotLeads, recentRevenue] = await Promise.all([
      // Lead events
      prisma.leadEvent.findMany({
        where,
        include: {
          lead: {
            select: {
              id: true,
              companyName: true,
              firstName: true,
              status: true,
              priority: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      }),
      
      // Hot leads (high engagement in last 24h)
      prisma.leadEvent.findMany({
        where: {
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          eventType: { in: ['PREVIEW_VIEWED', 'PREVIEW_CTA_CLICKED', 'PREVIEW_CALL_CLICKED'] }
        },
        include: {
          lead: {
            select: { id: true, companyName: true, firstName: true, priority: true }
          }
        },
        distinct: ['leadId']
      }),

      // Recent revenue
      prisma.revenue.findMany({
        where: {
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        },
        include: {
          client: {
            select: { id: true, companyName: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ])

    const summary = {
      totalEvents: events.length,
      hotLeadsToday: hotLeads.length,
      revenueThisWeek: recentRevenue.reduce((sum, r) => sum + r.amount, 0)
    }

    return NextResponse.json({
      events: events.map(event => ({
        id: event.id,
        eventType: event.eventType,
        toStage: event.toStage,
        leadId: event.leadId,
        lead: event.lead,
        actor: event.actor,
        createdAt: event.createdAt
      })),
      hotLeads: hotLeads.map(event => ({
        leadId: event.leadId,
        lead: event.lead,
        lastEngagement: event.createdAt,
        eventType: event.eventType
      })),
      recentRevenue: recentRevenue.map(rev => ({
        id: rev.id,
        amount: rev.amount,
        type: rev.type,
        client: rev.client,
        createdAt: rev.createdAt
      })),
      summary
    })
  } catch (error) {
    console.error('Clawdbot activity fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 })
  }
}

// POST /api/clawdbot/activity - Log activity from Clawdbot
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    const activity = await prisma.clawdbotActivity.create({
      data: {
        actionType: data.actionType,
        description: data.description,
        leadId: data.leadId || undefined,
        clientId: data.clientId || undefined,
        repId: data.repId || undefined,
        metadata: data.metadata || {},
        tokenCost: data.tokenCost || undefined
      }
    })

    // If this is a lead interaction, also create a lead event
    if (data.leadId && data.leadEventType) {
      await prisma.leadEvent.create({
        data: {
          leadId: data.leadId,
          eventType: data.leadEventType === 'STATUS_CHANGE' ? 'STAGE_CHANGE' : data.leadEventType,
          actor: 'clawdbot',
          toStage: data.toStage || 'NEW'
        }
      })
    }

    return NextResponse.json({ activity: { id: activity.id, logged: true } })
  } catch (error) {
    console.error('Clawdbot activity logging error:', error)
    return NextResponse.json({ error: 'Failed to log activity' }, { status: 500 })
  }
}