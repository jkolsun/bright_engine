import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'
import { sendSMSViaProvider } from '@/lib/sms-provider'
import { transitionStage, CONVERSATION_STAGES } from '@/lib/close-engine'

export const dynamic = 'force-dynamic'

// PUT — Approve or reject a pending action
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { action, editedMessage, reason } = body

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be "approve" or "reject"' },
        { status: 400 }
      )
    }

    const pendingAction = await prisma.pendingAction.findUnique({
      where: { id },
      include: {
        lead: true,
      },
    })

    if (!pendingAction) {
      return NextResponse.json({ error: 'Pending action not found' }, { status: 404 })
    }

    if (pendingAction.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Action already ${pendingAction.status.toLowerCase()}` },
        { status: 409 }
      )
    }

    // ── REJECT ──
    if (action === 'reject') {
      await prisma.pendingAction.update({
        where: { id },
        data: {
          status: 'REJECTED',
          metadata: {
            ...(pendingAction.metadata as Record<string, unknown> || {}),
            rejectedReason: reason || null,
          },
        },
      })

      return NextResponse.json({ success: true, status: 'REJECTED' })
    }

    // ── APPROVE ──
    const messageToSend = editedMessage !== undefined ? editedMessage : pendingAction.draftMessage

    // Send SMS
    await sendSMSViaProvider({
      to: pendingAction.lead.phone,
      message: messageToSend,
      leadId: pendingAction.leadId,
      trigger: `close_engine_${pendingAction.type.toLowerCase()}`,
      aiGenerated: true,
      conversationType: 'pre_client',
      sender: 'clawdbot',
    })

    // Update pending action
    await prisma.pendingAction.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy: session.userId,
        approvedAt: new Date(),
      },
    })

    // If payment link, transition stage to PAYMENT_SENT
    if (pendingAction.type === 'SEND_PAYMENT_LINK') {
      await transitionStage(pendingAction.conversationId, CONVERSATION_STAGES.PAYMENT_SENT)
    }

    return NextResponse.json({ success: true, status: 'APPROVED' })
  } catch (error) {
    console.error('[PendingActions API] PUT error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
