import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { lastSeenAt: true }
    })

    // Default to 24 hours ago if never logged in before
    const since = user?.lastSeenAt || new Date(Date.now() - 24 * 60 * 60 * 1000)

    const [
      newLeads,
      hotLeads,
      unansweredMessages,
      aiMessages,
      payments,
      failedSms,
    ] = await Promise.all([
      // 1. New leads since last login
      prisma.lead.findMany({
        where: { createdAt: { gt: since } },
        select: { id: true, firstName: true, lastName: true, companyName: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),

      // 2. Leads that went HOT since last login
      prisma.leadEvent.findMany({
        where: {
          createdAt: { gt: since },
          eventType: { in: ['PREVIEW_CTA_CLICKED', 'PREVIEW_CALL_CLICKED'] },
        },
        include: {
          lead: { select: { id: true, firstName: true, companyName: true, status: true, priority: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),

      // 3. Inbound messages with no admin reply after them
      prisma.message.findMany({
        where: {
          direction: 'INBOUND',
          createdAt: { gt: since },
        },
        include: {
          lead: { select: { id: true, firstName: true, companyName: true } },
          client: { select: { id: true, companyName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),

      // 4. AI auto-responses sent while away
      prisma.message.findMany({
        where: {
          senderType: 'CLAWDBOT',
          direction: 'OUTBOUND',
          createdAt: { gt: since },
        },
        include: {
          lead: { select: { id: true, firstName: true, companyName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),

      // 5. Payments received (amounts stored in dollars)
      prisma.revenue.findMany({
        where: {
          createdAt: { gt: since },
          status: 'PAID',
        },
        include: {
          client: { select: { id: true, companyName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),

      // 6. Failed SMS deliveries
      prisma.message.findMany({
        where: {
          channel: 'SMS',
          direction: 'OUTBOUND',
          twilioStatus: { in: ['failed', 'undelivered'] },
          createdAt: { gt: since },
        },
        include: {
          lead: { select: { id: true, firstName: true, companyName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ])

    const totalPayments = payments.reduce((sum, p) => sum + (p.amount || 0), 0)
    const hasAnything = newLeads.length > 0 || hotLeads.length > 0 || unansweredMessages.length > 0 || aiMessages.length > 0 || payments.length > 0 || failedSms.length > 0

    return NextResponse.json({
      since: since.toISOString(),
      hasAnything,
      sections: {
        newLeads: { count: newLeads.length, items: newLeads },
        hotLeads: { count: hotLeads.length, items: hotLeads },
        unansweredMessages: { count: unansweredMessages.length, items: unansweredMessages },
        aiMessages: { count: aiMessages.length, items: aiMessages },
        payments: { count: payments.length, total: totalPayments, items: payments },
        failedSms: { count: failedSms.length, items: failedSms },
      },
    })
  } catch (error) {
    console.error('Briefing error:', error)
    return NextResponse.json({ error: 'Failed to load briefing' }, { status: 500 })
  }
}

// POST - Mark briefing as seen (update lastSeenAt)
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.user.update({
      where: { id: session.userId },
      data: { lastSeenAt: new Date() }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}
