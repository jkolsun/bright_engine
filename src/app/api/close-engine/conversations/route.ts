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

    // For each conversation, get the last message and pending action count
    const enriched = await Promise.all(
      conversations.map(async (conv) => {
        const lastMessage = await prisma.message.findFirst({
          where: { leadId: conv.leadId },
          orderBy: { createdAt: 'desc' },
        })

        const pendingActionCount = await prisma.pendingAction.count({
          where: { conversationId: conv.id, status: 'PENDING' },
        })

        return {
          ...conv,
          lastMessage,
          pendingActionCount,
        }
      })
    )

    return NextResponse.json(enriched)
  } catch (error) {
    console.error('[CloseEngine Conversations API] List error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
