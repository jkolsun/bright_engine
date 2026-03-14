export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'
import { EventType } from '@prisma/client'

const RELEVANT_EVENT_TYPES: EventType[] = [
  'PREVIEW_CTA_CLICKED',
  'PREVIEW_VIEWED',
  'PREVIEW_CALL_CLICKED',
  'PREVIEW_RETURN_VISIT',
  'CALL_ATTEMPTED',
  'CALL_CONNECTED',
  'CALL_ENDED',
  'SMS_COLD_SENT',
  'SMS_DELIVERED',
  'SMS_FAILED',
  'SMS_OPT_IN',
  'SMS_OPT_OUT',
  'SMS_DRIP_SENT',
  'SMS_DRIP_REPLY',
  'CLOSE_ENGINE_TRIGGERED',
  'CLOSE_ENGINE_STAGE_CHANGE',
]

/**
 * GET /api/messages-v2/conversations/[leadId] — Full conversation thread
 * Returns messages, campaign messages, events, lead data, and timeline
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { leadId } = await params

    // Fetch all data in parallel
    const [lead, messages, campaignMessages, events, campaignLeads, closeEngine] = await Promise.all([
      prisma.lead.findUnique({
        where: { id: leadId },
        include: {
          client: { select: { id: true, companyName: true } },
        },
      }),
      prisma.message.findMany({
        where: { leadId },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.smsCampaignMessage.findMany({
        where: { leadId },
        orderBy: { sentAt: 'asc' },
      }),
      prisma.leadEvent.findMany({
        where: {
          leadId,
          eventType: { in: RELEVANT_EVENT_TYPES },
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.smsCampaignLead.findMany({
        where: { leadId },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.closeEngineConversation.findUnique({
        where: { leadId },
      }).catch(() => null),
    ])

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Deduplicate campaign messages that overlap with regular messages (by twilioSid)
    const messageSids = new Set(messages.filter(m => m.twilioSid).map(m => m.twilioSid))
    const uniqueCampaignMessages = campaignMessages.filter(
      cm => !cm.twilioSid || !messageSids.has(cm.twilioSid)
    )

    // Build chronological timeline merging messages, campaign messages, and events
    const timeline: Array<{
      type: 'message' | 'campaign_message' | 'event'
      timestamp: string
      data: any
    }> = []

    for (const msg of messages) {
      timeline.push({
        type: 'message',
        timestamp: msg.createdAt.toISOString(),
        data: msg,
      })
    }

    for (const cm of uniqueCampaignMessages) {
      timeline.push({
        type: 'campaign_message',
        timestamp: (cm.sentAt || cm.createdAt).toISOString(),
        data: cm,
      })
    }

    for (const evt of events) {
      timeline.push({
        type: 'event',
        timestamp: evt.createdAt.toISOString(),
        data: evt,
      })
    }

    // Sort chronologically
    timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    // Aggregate preview engagement from events
    // Each PREVIEW_VIEWED = one real page visit (deduped server-side, 5-min window)
    const viewEvents = events.filter(e => e.eventType === 'PREVIEW_VIEWED')
    const previewEngagement = {
      ctaClicks: events.filter(e => e.eventType === 'PREVIEW_CTA_CLICKED').length,
      pageViews: viewEvents.length,
      callClicks: events.filter(e => e.eventType === 'PREVIEW_CALL_CLICKED').length,
      returnVisits: events.filter(e => e.eventType === 'PREVIEW_RETURN_VISIT').length,
      // Enriched data from page_exit events (duration + scroll depth from most recent visit)
      lastViewDuration: (() => {
        const lastView = viewEvents[viewEvents.length - 1]
        const meta = lastView?.metadata as Record<string, unknown> | null
        return meta?.duration ? Number(meta.duration) : null
      })(),
      lastScrollDepth: (() => {
        const lastView = viewEvents[viewEvents.length - 1]
        const meta = lastView?.metadata as Record<string, unknown> | null
        return meta?.scrollDepth ? Number(meta.scrollDepth) : null
      })(),
      firstViewedAt: viewEvents[0]?.createdAt?.toISOString() || null,
      lastViewedAt: viewEvents[viewEvents.length - 1]?.createdAt?.toISOString() || null,
    }

    return NextResponse.json({
      lead,
      messages,
      campaignMessages: uniqueCampaignMessages,
      events,
      campaignLeads,
      closeEngine,
      timeline,
      previewEngagement,
    })
  } catch (error) {
    console.error('Messages V2 conversation detail error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversation', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
