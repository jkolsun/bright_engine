import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/unknown-inbound
 * Returns unknown inbound conversations being identified by AI or awaiting manual linking.
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    // Find inbound messages that have no leadId and no clientId (unknown sender)
    // Group by sender phone number
    const unknownMessages = await prisma.message.findMany({
      where: {
        leadId: null,
        clientId: null,
        direction: 'INBOUND',
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })

    // Group by sender phone/email
    const conversations = new Map<string, {
      id: string
      phone: string
      messages: typeof unknownMessages
      status: string
      matchedLeadId: string | null
      createdAt: Date
    }>()

    for (const msg of unknownMessages) {
      const sender = msg.recipient || 'unknown'
      if (!conversations.has(sender)) {
        conversations.set(sender, {
          id: msg.id,
          phone: sender,
          messages: [],
          status: 'UNRESOLVED',
          matchedLeadId: null,
          createdAt: msg.createdAt,
        })
      }
      conversations.get(sender)!.messages.push(msg)
    }

    return NextResponse.json({
      conversations: Array.from(conversations.values()),
    })
  } catch (error) {
    console.error('Unknown inbound fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch unknown inbound', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
