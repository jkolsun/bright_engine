import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'
import { logConversationOutcome, getOutcomeStats } from '@/lib/conversation-outcomes'

export const dynamic = 'force-dynamic'

/**
 * GET /api/conversation-outcomes - Get AI learning stats
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const stats = await getOutcomeStats()
    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching conversation outcomes:', error)
    return NextResponse.json({ error: 'Failed to fetch outcomes' }, { status: 500 })
  }
}

/**
 * POST /api/conversation-outcomes - Log a conversation outcome
 * Body: { leadId: string, finalStage: 'PAID' | 'STALLED' | 'LOST' }
 */
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const { leadId, finalStage } = await request.json()

    if (!leadId || !['PAID', 'STALLED', 'LOST'].includes(finalStage)) {
      return NextResponse.json({ error: 'leadId and valid finalStage required' }, { status: 400 })
    }

    // Check for duplicate
    const existing = await prisma.conversationOutcome.findFirst({
      where: { leadId },
    })
    if (existing) {
      return NextResponse.json({ error: 'Outcome already logged for this lead' }, { status: 409 })
    }

    await logConversationOutcome(leadId, finalStage)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error logging conversation outcome:', error)
    return NextResponse.json({ error: 'Failed to log outcome' }, { status: 500 })
  }
}
