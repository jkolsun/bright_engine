export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get('leadId')

    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 })
    }

    const events = await prisma.leadEvent.findMany({
      where: {
        leadId,
        eventType: {
          in: ['PREVIEW_VIEWED', 'PREVIEW_CTA_CLICKED', 'PREVIEW_CALL_CLICKED', 'PREVIEW_SENT_SMS', 'PREVIEW_SENT_EMAIL'],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { eventType: true, metadata: true, createdAt: true },
    })

    const viewed = events.some(e => e.eventType === 'PREVIEW_VIEWED')
    const ctaClicked = events.some(e => e.eventType === 'PREVIEW_CTA_CLICKED')
    const sent = events.some(e => e.eventType === 'PREVIEW_SENT_SMS' || e.eventType === 'PREVIEW_SENT_EMAIL')

    return NextResponse.json({ viewed, ctaClicked, sent, events })
  } catch (error) {
    console.error('[Dialer Preview Status API] GET error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
