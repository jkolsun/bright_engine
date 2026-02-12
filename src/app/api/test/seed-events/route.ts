/**
 * DEVELOPMENT ONLY: Seed test lead events for engagement scoring testing
 * 
 * This endpoint should only be available in development and deleted before production
 * 
 * Creates various event types to test engagement scoring:
 * - email_opened
 * - preview_viewed
 * - cta_clicked
 * - call_connected
 * - text_responded
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const { leadId, eventCount = 5 } = body

    if (!leadId) {
      return NextResponse.json(
        { error: 'leadId is required' },
        { status: 400 }
      )
    }

    // Verify lead exists
    const lead = await prisma.lead.findUnique({ where: { id: leadId } })
    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    const eventTypes = [
      'email_opened',
      'preview_viewed',
      'cta_clicked',
      'call_connected',
      'text_responded',
    ]

    const events = []

    // Create random events
    for (let i = 0; i < eventCount; i++) {
      const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)]
      const minutesAgo = Math.floor(Math.random() * 60 * 24) // Last 24 hours

      const event = await prisma.leadEvent.create({
        data: {
          leadId,
          eventType,
          metadata: {
            source: 'test',
            userAgent: 'test-agent',
          },
          createdAt: new Date(Date.now() - minutesAgo * 60 * 1000),
        },
      })

      events.push(event)
    }

    // Recalculate engagement score
    const allEvents = await prisma.leadEvent.findMany({
      where: { leadId },
    })

    const EVENT_SCORES: Record<string, number> = {
      'email_opened': 2,
      'preview_viewed': 3,
      'cta_clicked': 5,
      'call_connected': 7,
      'text_responded': 4,
    }

    let totalScore = 0
    for (const evt of allEvents) {
      const points = EVENT_SCORES[evt.eventType.toLowerCase()] || 0
      totalScore += points
    }

    return NextResponse.json({
      success: true,
      leadId,
      eventsCreated: events.length,
      totalEvents: allEvents.length,
      totalScore,
      events,
    })
  } catch (error) {
    console.error('Error seeding events:', error)
    return NextResponse.json(
      { error: 'Failed to seed events' },
      { status: 500 }
    )
  }
}

// GET - List existing events for a lead (for testing)
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 403 }
    )
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const leadId = searchParams.get('leadId')

    if (!leadId) {
      return NextResponse.json(
        { error: 'leadId is required' },
        { status: 400 }
      )
    }

    const events = await prisma.leadEvent.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ events })
  } catch (error) {
    console.error('Error fetching events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    )
  }
}
