import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/messages - List messages
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  try {
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
