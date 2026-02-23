import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'
import { sendSMSViaProvider } from '@/lib/sms-provider'
import { sendEmail } from '@/lib/resend'

export const dynamic = 'force-dynamic'

// GET /api/messages - List messages with pagination + incremental polling (BUG M.3)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')
  const after = searchParams.get('after') // ISO timestamp for incremental polling

  try {
    // Authentication check - admin or rep access
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // BUG M.3: If `after` is provided, only fetch messages created after that timestamp
    const where: any = {}
    if (after) {
      where.createdAt = { gt: new Date(after) }
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        include: {
          lead: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyName: true,
              phone: true,
              email: true,
              autonomyLevel: true,
            }
          },
          client: {
            select: {
              id: true,
              companyName: true,
              email: true,
              autonomyLevel: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: after ? 0 : offset, // No offset when doing incremental poll
      }),
      prisma.message.count(after ? { where } : undefined)
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

// POST /api/messages - Send a message (actually delivers via SMS or Email)
export async function POST(request: NextRequest) {
  try {
    // Authentication check - admin or rep access
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { leadId, clientId, to, content, channel, senderType, senderName } = await request.json()

    if (!content) {
      return NextResponse.json({ error: 'Content required' }, { status: 400 })
    }

    const resolvedChannel = channel || 'SMS'
    const resolvedSender = senderName || 'admin'

    // Actually send the message via the appropriate channel
    // Note: sendSMSViaProvider and sendEmail both create their own Message records
    if (resolvedChannel === 'EMAIL' && to) {
      const result = await sendEmail({
        to,
        subject: 'Message from Bright Automations',
        html: content.replace(/\n/g, '<br>'),
        leadId: leadId || undefined,
        clientId: clientId || undefined,
        sender: resolvedSender,
        trigger: 'manual_admin',
      })

      if (!result.success) {
        return NextResponse.json({ error: result.error || 'Email send failed' }, { status: 500 })
      }

      // Log event if lead
      if (leadId) {
        await prisma.leadEvent.create({
          data: {
            leadId,
            eventType: 'EMAIL_SENT',
            actor: resolvedSender,
            metadata: { channel: 'EMAIL', resendId: result.resendId },
          }
        })
      }

      return NextResponse.json({ success: true, channel: 'EMAIL' })
    } else if (to) {
      // SMS send
      const result = await sendSMSViaProvider({
        to,
        message: content,
        leadId: leadId || undefined,
        clientId: clientId || undefined,
        sender: resolvedSender,
        trigger: 'manual_admin',
      })

      if (!result.success) {
        return NextResponse.json({ error: result.error || 'SMS send failed' }, { status: 500 })
      }

      // Log event if lead
      if (leadId) {
        await prisma.leadEvent.create({
          data: {
            leadId,
            eventType: 'TEXT_SENT',
            actor: resolvedSender,
            metadata: { channel: 'SMS', sid: result.sid },
          }
        })
      }

      return NextResponse.json({ success: true, channel: 'SMS' })
    } else {
      return NextResponse.json({ error: 'No recipient address provided' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
