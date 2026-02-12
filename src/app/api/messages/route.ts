import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendSMS } from '@/lib/twilio'

// GET /api/messages - Get message history
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const leadId = searchParams.get('leadId')
  const clientId = searchParams.get('clientId')
  const escalated = searchParams.get('escalated')
  const limit = parseInt(searchParams.get('limit') || '100')

  const where: any = {}
  if (leadId) where.leadId = leadId
  if (clientId) where.clientId = clientId
  if (escalated) where.escalated = escalated === 'true'

  try {
    const messages = await prisma.message.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyName: true,
            phone: true,
          }
        },
        client: {
          select: {
            id: true,
            companyName: true,
          }
        }
      }
    })

    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

// POST /api/messages - Send SMS
export async function POST(request: NextRequest) {
  try {
    const { to, message, leadId, clientId, sender = 'admin', trigger } = await request.json()

    if (!to || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: to, message' },
        { status: 400 }
      )
    }

    const result = await sendSMS({
      to,
      message,
      leadId,
      clientId,
      sender,
      trigger,
    })

    if (result.success) {
      return NextResponse.json({ success: true, sid: result.sid })
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}
