export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'
import { sendSMSViaProvider } from '@/lib/sms-provider'
import { sendEmail } from '@/lib/resend'
import { pushToMessages } from '@/lib/messages-v2-events'

/**
 * POST /api/messages-v2/send — Send a message to a lead
 * Body: { leadId, body, channel }
 */
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { leadId, body, channel } = await request.json()

    if (!leadId || !body || !channel) {
      return NextResponse.json({ error: 'leadId, body, and channel are required' }, { status: 400 })
    }

    if (!['SMS', 'EMAIL'].includes(channel)) {
      return NextResponse.json({ error: 'channel must be SMS or EMAIL' }, { status: 400 })
    }

    // Look up lead
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        phone: true,
        email: true,
        dncAt: true,
        smsOptedOutAt: true,
        companyName: true,
        firstName: true,
        lastName: true,
      },
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // DNC check — dncAt blocks all channels, smsOptedOutAt blocks SMS only
    if (lead.dncAt) {
      return NextResponse.json({ error: 'Cannot message a DNC lead' }, { status: 400 })
    }

    if (channel === 'SMS') {
      if (lead.smsOptedOutAt) {
        return NextResponse.json({ error: 'Lead has opted out of SMS' }, { status: 400 })
      }
      if (!lead.phone) {
        return NextResponse.json({ error: 'Lead has no phone number' }, { status: 400 })
      }

      await sendSMSViaProvider({
        to: lead.phone,
        message: body,
        leadId,
        sender: 'admin',
        trigger: 'manual_messages_v2',
      })
    } else if (channel === 'EMAIL') {
      if (!lead.email) {
        return NextResponse.json({ error: 'Lead has no email address' }, { status: 400 })
      }

      await sendEmail({
        to: lead.email,
        subject: 'Message from Bright Automations',
        html: body,
        leadId,
        sender: 'admin',
        trigger: 'manual_messages_v2',
      })
    }

    // Push SSE event (non-critical — message already sent)
    try {
      pushToMessages({
        type: 'NEW_MESSAGE',
        data: {
          leadId,
          channel,
          direction: 'OUTBOUND',
          senderType: 'ADMIN',
          content: body,
        },
        timestamp: new Date().toISOString(),
      })
    } catch {}


    // Return the latest message for this lead
    const latestMessage = await prisma.message.findFirst({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, message: latestMessage })
  } catch (error) {
    console.error('Messages V2 send error:', error)
    return NextResponse.json(
      { error: 'Failed to send message', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
