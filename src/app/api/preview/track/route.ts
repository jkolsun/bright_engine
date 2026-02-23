import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateEngagementScore } from '@/lib/engagement-scoring'
import { dispatchWebhook, WebhookEvents } from '@/lib/webhook-dispatcher'
import { pushToRep, pushToAllAdmins } from '@/lib/dialer-events'

export const dynamic = 'force-dynamic'

// In-memory rate limiter: max 100 events per IP per hour
const ipCounts = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 100
const RATE_WINDOW_MS = 60 * 60 * 1000 // 1 hour

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = ipCounts.get(ip)
  if (!entry || now > entry.resetAt) {
    ipCounts.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return false
  }
  entry.count++
  return entry.count > RATE_LIMIT
}

// Known valid event types
const VALID_EVENTS = ['page_view', 'time_on_page', 'cta_click', 'call_click', 'contact_form', 'return_visit', 'scroll_depth']

// POST /api/preview/track - Track preview analytics events
export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    const { previewId, event, duration, metadata } = await request.json()

    if (!previewId || !event) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate event is from known list
    if (!VALID_EVENTS.includes(event)) {
      return NextResponse.json(
        { error: 'Invalid event type' },
        { status: 400 }
      )
    }

    // Find lead by preview ID, fall back to lead ID
    let lead = await prisma.lead.findUnique({
      where: { previewId },
    })

    if (!lead) {
      // Fallback: try looking up by lead ID (handles cases where previewId wasn't set)
      lead = await prisma.lead.findUnique({
        where: { id: previewId },
      })
    }

    if (!lead) {
      return NextResponse.json(
        { error: 'Preview not found' },
        { status: 404 }
      )
    }

    // Map event types
    const eventTypeMap: Record<string, any> = {
      'page_view': 'PREVIEW_VIEWED',
      'time_on_page': 'PREVIEW_VIEWED',
      'cta_click': 'PREVIEW_CTA_CLICKED',
      'call_click': 'PREVIEW_CALL_CLICKED',
      'contact_form': 'PREVIEW_CTA_CLICKED',
      'return_visit': 'PREVIEW_RETURN_VISIT',
      'scroll_depth': 'PREVIEW_VIEWED',
    }

    const eventType = eventTypeMap[event]

    if (!eventType) {
      return NextResponse.json(
        { error: 'Invalid event type' },
        { status: 400 }
      )
    }

    // Create event
    await prisma.leadEvent.create({
      data: {
        leadId: lead.id,
        eventType,
        metadata: {
          ...metadata,
          duration,
          event,
        },
        actor: 'client',
      }
    })

    // Bug 7: If there's an active dialer call for this lead, push SSE + update call flags
    try {
      const activeCall = await prisma.dialerCall.findFirst({
        where: {
          leadId: lead.id,
          endedAt: null,
          status: { in: ['INITIATED', 'RINGING', 'CONNECTED'] },
        },
        select: { id: true, repId: true },
        orderBy: { startedAt: 'desc' },
      })

      if (activeCall) {
        const isPreviewOpen = event === 'page_view' || event === 'time_on_page' || event === 'return_visit' || event === 'scroll_depth'
        const isCtaClick = event === 'cta_click' || event === 'call_click' || event === 'contact_form'

        if (isPreviewOpen) {
          await prisma.dialerCall.update({
            where: { id: activeCall.id },
            data: { previewOpenedDuringCall: true },
          })
          const sseEvent = {
            type: 'PREVIEW_OPENED' as const,
            data: { callId: activeCall.id, leadId: lead.id, event, duration },
            timestamp: new Date().toISOString(),
          }
          pushToRep(activeCall.repId, sseEvent)
          pushToAllAdmins({ ...sseEvent, data: { ...sseEvent.data, repId: activeCall.repId } })
        }

        if (isCtaClick) {
          await prisma.dialerCall.update({
            where: { id: activeCall.id },
            data: { ctaClickedDuringCall: true },
          })
          const sseEvent = {
            type: 'CTA_CLICKED' as const,
            data: { callId: activeCall.id, leadId: lead.id, event },
            timestamp: new Date().toISOString(),
          }
          pushToRep(activeCall.repId, sseEvent)
          pushToAllAdmins({ ...sseEvent, data: { ...sseEvent.data, repId: activeCall.repId } })
        }
      }
    } catch (dialerErr) {
      // Non-critical — don't break preview tracking
      console.warn('[Preview Track] Dialer SSE push failed:', dialerErr)
    }

    // If high engagement, mark as HOT and dispatch webhook
    if (duration && duration > 60 || event === 'cta_click' || event === 'call_click' || event === 'contact_form') {
      const urgencyScore = event === 'call_click' ? 90 : event === 'contact_form' ? 85 : event === 'cta_click' ? 80 : duration > 120 ? 75 : 65

      if (lead.priority !== 'HOT') {
        await prisma.lead.update({
          where: { id: lead.id },
          data: { priority: 'HOT', status: 'HOT_LEAD' }
        })

        // Create hot lead notification
        await prisma.notification.create({
          data: {
            type: 'HOT_LEAD',
            title: 'Hot Lead Alert',
            message: `${lead.firstName} at ${lead.companyName} engaged with preview: ${event}`,
            metadata: { leadId: lead.id, event },
          }
        })
      }

      // 🚀 Dispatch immediate webhook for hot engagement
      await dispatchWebhook(WebhookEvents.HOT_ENGAGEMENT(
        lead.id, 
        event, 
        urgencyScore,
        { duration, company: lead.companyName, firstName: lead.firstName }
      ))
    }

    // After logging the event, recalculate engagement:
    try { await calculateEngagementScore(lead.id) } catch (e) { console.warn('Engagement recalc failed:', e) }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error tracking preview event:', error)
    return NextResponse.json(
      { error: 'Failed to track event' },
      { status: 500 }
    )
  }
}
