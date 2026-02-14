import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { OutboundChannel, OutboundEventStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get('leadId')
    const channel = searchParams.get('channel') as OutboundChannel | null
    const status = searchParams.get('status') as OutboundEventStatus | null
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)

    const where: any = {}
    if (leadId) where.leadId = leadId
    if (channel) where.channel = channel
    if (status) where.status = status

    const events = await prisma.outboundEvent.findMany({
      where,
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyName: true,
            email: true,
          },
        },
        rep: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    // Calculate stats
    const stats = {
      total: events.length,
      bySent: events.filter((e) => e.status === 'SENT').length,
      byDelivered: events.filter((e) => e.status === 'DELIVERED').length,
      byOpened: events.filter((e) => e.status === 'OPENED').length,
      byClicked: events.filter((e) => e.status === 'CLICKED').length,
      byReplied: events.filter((e) => e.status === 'REPLIED').length,
      byBounced: events.filter((e) => e.status === 'BOUNCED').length,
    }

    return NextResponse.json({ events, stats })
  } catch (error) {
    console.error('Outbound events error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch outbound events' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      leadId,
      channel,
      messageId,
      content,
      subject,
      recipientEmail,
      recipientPhone,
      repId,
      campaignId,
    } = body

    if (!leadId || !channel) {
      return NextResponse.json(
        { error: 'leadId and channel are required' },
        { status: 400 }
      )
    }

    const event = await prisma.outboundEvent.create({
      data: {
        leadId,
        channel,
        messageId,
        content,
        subject,
        recipientEmail,
        recipientPhone,
        sentAt: new Date(),
        status: 'SENT',
        repId,
        campaignId,
      },
      include: {
        lead: true,
        rep: true,
      },
    })

    return NextResponse.json({ event }, { status: 201 })
  } catch (error) {
    console.error('Outbound event creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create outbound event' },
      { status: 500 }
    )
  }
}
