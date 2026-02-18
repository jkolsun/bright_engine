import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * GET /api/dialer/preview-status?leadId=xxx
 * Lightweight polling endpoint for real-time preview status during active calls.
 * Called every 5 seconds by DialerCore when a call is connected.
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const leadId = request.nextUrl.searchParams.get('leadId')
    if (!leadId) {
      return NextResponse.json({ error: 'leadId required' }, { status: 400 })
    }

    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000)

    // Check for preview view/CTA events (last 30 min)
    const previewEvents = await prisma.leadEvent.findMany({
      where: {
        leadId,
        eventType: { in: ['PREVIEW_VIEWED', 'PREVIEW_CTA_CLICKED'] },
        createdAt: { gte: thirtyMinAgo },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    // Check if preview was sent recently
    const previewSentActivity = await prisma.activity.findFirst({
      where: {
        leadId,
        activityType: 'PREVIEW_SENT' as any,
        createdAt: { gte: thirtyMinAgo },
      },
      orderBy: { createdAt: 'desc' },
    })

    let sent = !!previewSentActivity
    let opened = false
    let viewDurationSeconds = 0
    let ctaClicked = false
    let lastEventAt: Date | null = null

    if (previewEvents.length > 0) {
      opened = true
      ctaClicked = previewEvents.some(e => e.eventType === 'PREVIEW_CTA_CLICKED')
      lastEventAt = previewEvents[0].createdAt

      // Get max duration from metadata
      for (const evt of previewEvents) {
        if (evt.eventType === 'PREVIEW_VIEWED' && evt.metadata) {
          try {
            const meta = typeof evt.metadata === 'string' ? JSON.parse(evt.metadata) : evt.metadata
            if (meta?.duration && meta.duration > viewDurationSeconds) {
              viewDurationSeconds = meta.duration
            }
          } catch { /* ignore */ }
        }
      }
    }

    return NextResponse.json({ sent, opened, viewDurationSeconds, ctaClicked, lastEventAt })
  } catch (error) {
    console.error('Preview status error:', error)
    return NextResponse.json(
      { error: 'Failed to get preview status' },
      { status: 500 }
    )
  }
}