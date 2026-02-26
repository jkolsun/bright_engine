import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateEngagementScore } from '@/lib/engagement-scoring'
import { dispatchWebhook, WebhookEvents } from '@/lib/webhook-dispatcher'
import { pushToRep, pushToAllAdmins } from '@/lib/dialer-events'

export const dynamic = 'force-dynamic'

// BUG NEW-L8: Bot user-agent detection — filter out crawlers/bots from analytics
const BOT_UA_REGEX = /bot|crawl|spider|slurp|mediapartners|facebookexternalhit|bingpreview|linkedinbot|twitterbot|whatsapp|telegram|preview|headless|phantom|puppeteer|lighthouse|pagespeed|gtmetrix|pingdom|uptimerobot/i

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
    // NEW-L8: Filter bot traffic before processing
    const userAgent = request.headers.get('user-agent') || ''
    if (BOT_UA_REGEX.test(userAgent)) {
      return NextResponse.json({ success: true, filtered: 'bot' })
    }

    // Rate limit by IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    const { previewId, event, duration, metadata } = await request.json()

    // BUG R.1: Extract UTM params and referrer for source attribution
    const url = new URL(request.url)
    const utmSource = url.searchParams.get('utm_source') || metadata?.utm_source || null
    const utmMedium = url.searchParams.get('utm_medium') || metadata?.utm_medium || null
    const utmCampaign = url.searchParams.get('utm_campaign') || metadata?.utm_campaign || null
    const referrer = request.headers.get('referer') || metadata?.referrer || null

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

    // Create event (BUG R.1: include UTM/referrer for source attribution)
    await prisma.leadEvent.create({
      data: {
        leadId: lead.id,
        eventType,
        metadata: {
          ...metadata,
          duration,
          event,
          ...(utmSource && { utm_source: utmSource }),
          ...(utmMedium && { utm_medium: utmMedium }),
          ...(utmCampaign && { utm_campaign: utmCampaign }),
          ...(referrer && { referrer }),
        },
        actor: 'client',
      }
    })

    // Bug 7: If there's an active dialer call for this lead, push SSE + update call flags
    let activeCall: { id: string; repId: string } | null = null
    try {
      activeCall = await prisma.dialerCall.findFirst({
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

    // Recalculate engagement score (persists score + derives priority)
    let scoreResult: Awaited<ReturnType<typeof calculateEngagementScore>> | null = null
    try { scoreResult = await calculateEngagementScore(lead.id) } catch (e) { console.warn('Engagement recalc failed:', e) }

    // If score crossed to HOT AND no active call (organic engagement), update status + webhook
    if (!activeCall && scoreResult?.priorityChanged && scoreResult.newPriority === 'HOT') {
      try {
        const urgencyScore = event === 'call_click' ? 90 : event === 'contact_form' ? 85 : event === 'cta_click' ? 80 : duration > 120 ? 75 : 65

        await prisma.lead.update({
          where: { id: lead.id },
          data: { status: 'HOT_LEAD' }
        })

        await dispatchWebhook(WebhookEvents.HOT_ENGAGEMENT(
          lead.id,
          event,
          urgencyScore,
          { duration, company: lead.companyName, firstName: lead.firstName }
        ))
      } catch (hotLeadErr) {
        console.warn('[Preview Track] Hot lead promotion failed:', hotLeadErr)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error tracking preview event:', error)
    return NextResponse.json(
      { error: 'Failed to track event' },
      { status: 500 }
    )
  }
}
