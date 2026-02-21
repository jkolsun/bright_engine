import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateEngagementScore } from '@/lib/engagement-scoring'
import { dispatchWebhook, WebhookEvents } from '@/lib/webhook-dispatcher'

export const dynamic = 'force-dynamic'

// POST /api/preview/track - Track preview analytics events
export async function POST(request: NextRequest) {
  try {
    const { previewId, event, duration, metadata } = await request.json()

    if (!previewId || !event) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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
