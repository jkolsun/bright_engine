import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

// GET /api/messages - List messages
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  try {
    // Authentication check - admin or rep access
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        include: {
          lead: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyName: true,
              phone: true
            }
          },
          client: {
            select: {
              id: true,
              companyName: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.message.count()
    ])

    return NextResponse.json({ messages, total })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

// POST /api/messages - Send a message
export async function POST(request: NextRequest) {
  try {
    // Authentication check - admin or rep access
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { leadId, clientId, to, content, channel, senderType, senderName } = await request.json()
    
    if (!content) {
      return NextResponse.json({ error: 'Content required' }, { status: 400 })
    }

    // Create message record
    const message = await prisma.message.create({
      data: {
        leadId: leadId || undefined,
        clientId: clientId || undefined,
        content,
        direction: 'OUTBOUND',
        channel: channel || 'SMS',
        senderType: senderType || 'ADMIN',
        senderName: senderName || 'admin',
        recipient: to || undefined,
      }
    })

    // Log event if lead
    if (leadId) {
      await prisma.leadEvent.create({
        data: {
          leadId,
          eventType: 'TEXT_SENT',
          actor: senderName || 'admin',
          metadata: { channel, messageId: message.id },
        }
      })
    }

    return NextResponse.json({ message })
  } catch (error) {
    console.error('Error creating message:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
