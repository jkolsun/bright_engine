import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateEngagementScore } from '@/lib/engagement-scoring'

/**
 * GET /api/reps/[repId]/lead/[leadId]
 * Returns full context for rep dialer: company summary, script, engagement data
 * Used when rep opens a lead to call
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { repId: string; leadId: string } }
) {
  try {
    const { repId, leadId } = params

    // Verify rep and lead exist
    const [rep, lead] = await Promise.all([
      prisma.user.findUnique({
        where: { id: repId },
      }),
      prisma.lead.findUnique({
        where: { id: leadId },
        include: {
          events: true,
          outboundEvents: true,
          messages: true,
        },
      }),
    ])

    if (!rep || rep.role !== 'REP') {
      return NextResponse.json(
        { error: 'Rep not found' },
        { status: 404 }
      )
    }

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    // Calculate engagement score
    const engagement = await calculateEngagementScore(leadId)

    // Parse rep script from notes (temporary until dedicated table)
    let repScript = null
    if (lead.notes) {
      try {
        const scriptMatch = lead.notes.match(/\[REP SCRIPT\]\n([\s\S]*?)(?:\n\[|$)/)
        if (scriptMatch) {
          repScript = JSON.parse(scriptMatch[1])
        }
      } catch (err) {
        console.warn('Failed to parse rep script:', err)
      }
    }

    // Count outbound touches
    const emailTouches = lead.outboundEvents.filter(
      (e) => e.channel === 'EMAIL' || e.channel === 'INSTANTLY'
    ).length
    const smsTouches = lead.outboundEvents.filter((e) => e.channel === 'SMS').length
    const linkedinTouches = lead.outboundEvents.filter(
      (e) => e.channel === 'LINKEDIN'
    ).length

    // Last touch
    const allTouches = [
      ...lead.outboundEvents,
      ...lead.events,
    ]
    const lastTouch =
      allTouches.length > 0
        ? new Date(
            Math.max(
              ...allTouches.map((e) =>
                new Date(
                  (e as any).sentAt || (e as any).createdAt
                ).getTime()
              )
            )
          )
        : null

    return NextResponse.json({
      lead: {
        id: lead.id,
        firstName: lead.firstName,
        lastName: lead.lastName,
        company: lead.companyName,
        industry: lead.industry,
        city: lead.city,
        state: lead.state,
        email: lead.email,
        phone: lead.phone,
        website: lead.website,
      },
      engagement,
      context: {
        rating: lead.enrichedRating,
        reviews: lead.enrichedReviews,
        address: lead.enrichedAddress,
        personalization: lead.personalization,
        previewUrl: lead.previewUrl,
      },
      outreach: {
        emailTouches,
        smsTouches,
        linkedinTouches,
        totalTouches: emailTouches + smsTouches + linkedinTouches,
        lastTouch,
      },
      script: repScript || {
        opening: 'Hi [name], got a quick second?',
        hook: lead.personalization || 'I noticed your business and thought I could help',
        discovery: 'How are things going with [company]?',
        objectionHandlers: {
          'not interested': 'I totally get it. Can I just ask...',
        },
        closeAttempt: 'Could we hop on a call next week?',
        notes: 'Build rapport before pitching. Listen more than you talk.',
      },
      previewUrl: lead.previewUrl,
      createdAt: lead.createdAt,
    })
  } catch (error) {
    console.error('Get dialer context error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch context' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/reps/[repId]/lead/[leadId]
 * Log call result, objection, follow-up action
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { repId: string; leadId: string } }
) {
  try {
    const { repId, leadId } = params
    const body = await request.json()
    const { callResult, objection, followUpAction, notes } = body

    // Log call event
    const event = await prisma.leadEvent.create({
      data: {
        leadId,
        eventType: 'CALL_MADE',
        actor: `rep:${repId}`,
        metadata: {
          result: callResult, // 'CONNECTED', 'VOICEMAIL', 'NO_ANSWER', 'REJECTED'
          objection,
          followUpAction,
        },
      },
    })

    // Update lead notes
    if (notes) {
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
      })
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          notes: (lead?.notes || '') + `\n[CALL] ${new Date().toISOString()}: ${notes}`,
        },
      })
    }

    // Schedule follow-up if needed
    if (followUpAction === 'FOLLOW_UP') {
      // TODO: Create touch recommendation for automatic follow-up
    }

    return NextResponse.json({ event, success: true })
  } catch (error) {
    console.error('Log call error:', error)
    return NextResponse.json(
      { error: 'Failed to log call' },
      { status: 500 }
    )
  }
}
