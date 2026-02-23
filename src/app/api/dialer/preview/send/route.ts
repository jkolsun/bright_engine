export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'
import { sendSMS, getLeadSmsNumber } from '@/lib/twilio'

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { leadId, callId, channel } = await request.json()

    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 })
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { companyName: true, previewUrl: true, previewId: true, phone: true },
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    const previewUrl = lead.previewUrl || (lead.previewId
      ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://preview.brightautomations.org'}/preview/${lead.previewId}`
      : null)

    if (!previewUrl) {
      return NextResponse.json({ error: 'No preview available for this lead' }, { status: 400 })
    }

    const toNumber = await getLeadSmsNumber(leadId)
    const rep = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { name: true },
    })

    await sendSMS({
      to: toNumber,
      message: `Check out the website I built for ${lead.companyName}: ${previewUrl}`,
      leadId,
      sender: `rep:${rep?.name || session.userId}`,
      trigger: 'dialer_preview',
    })

    // Update DialerCall if callId provided
    if (callId) {
      await prisma.dialerCall.update({
        where: { id: callId },
        data: { previewSentDuringCall: true, previewSentChannel: channel || 'sms' },
      })

      // Update session counter
      const call = await prisma.dialerCall.findUnique({
        where: { id: callId },
        select: { sessionId: true },
      })
      if (call?.sessionId) {
        await prisma.dialerSessionNew.update({
          where: { id: call.sessionId },
          data: { previewsSent: { increment: 1 } },
        }).catch(err => console.error('[DialerPreview] Session preview count update failed:', err))
      }
    }

    // Create LeadEvent
    await prisma.leadEvent.create({
      data: {
        leadId,
        eventType: 'PREVIEW_SENT_SMS',
        actor: `rep:${rep?.name}`,
        metadata: { source: 'dialer', previewUrl },
      },
    })

    return NextResponse.json({ success: true, previewUrl })
  } catch (error) {
    console.error('[Dialer Preview Send API] POST error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
