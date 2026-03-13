import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET — List close engine conversations for the Messages UI
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active') !== 'false'

    const where = activeOnly
      ? { stage: { notIn: ['COMPLETED', 'CLOSED_LOST'] } }
      : {}

    const conversations = await prisma.closeEngineConversation.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyName: true,
            phone: true,
            email: true,
            industry: true,
            previewUrl: true,
          },
        },
      },
    })

    // For each conversation, get the last message, pending actions, and engagement data
    const enriched = await Promise.all(
      conversations.map(async (conv) => {
        const [lastMessage, pendingActionCount, engagementEvents] = await Promise.all([
          prisma.message.findFirst({
            where: { leadId: conv.leadId },
            orderBy: { createdAt: 'desc' },
          }),
          prisma.pendingAction.count({
            where: { conversationId: conv.id, status: 'PENDING' },
          }),
          prisma.leadEvent.findMany({
            where: {
              leadId: conv.leadId,
              eventType: { in: ['PREVIEW_CTA_CLICKED', 'PREVIEW_VIEWED', 'PREVIEW_CALL_CLICKED', 'PREVIEW_RETURN_VISIT'] },
            },
            orderBy: { createdAt: 'desc' },
            take: 20,
            select: { eventType: true, createdAt: true, metadata: true },
          }),
        ])

        const ctaClicks = engagementEvents.filter(e => e.eventType === 'PREVIEW_CTA_CLICKED')
        const previewViews = engagementEvents.filter(e => e.eventType === 'PREVIEW_VIEWED')
        const callClicks = engagementEvents.filter(e => e.eventType === 'PREVIEW_CALL_CLICKED')
        const returnVisits = engagementEvents.filter(e => e.eventType === 'PREVIEW_RETURN_VISIT')

        return {
          ...conv,
          lastMessage,
          pendingActionCount,
          engagement: {
            ctaClickCount: ctaClicks.length,
            lastCtaClick: ctaClicks[0]?.createdAt || null,
            previewViewCount: previewViews.length,
            lastPreviewView: previewViews[0]?.createdAt || null,
            callClickCount: callClicks.length,
            returnVisitCount: returnVisits.length,
            recentEvents: engagementEvents.slice(0, 5),
          },
        }
      })
    )

    return NextResponse.json(enriched)
  } catch (error) {
    console.error('[CloseEngine Conversations API] List error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
