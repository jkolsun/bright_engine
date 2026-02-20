import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * PUT /api/admin/approvals/[id] - Approve or Deny an approval
 * Body: { action: 'approve' | 'deny' }
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const { id } = await context.params
    const { action } = await request.json()

    if (!['approve', 'deny'].includes(action)) {
      return NextResponse.json({ error: 'action must be "approve" or "deny"' }, { status: 400 })
    }

    const approval = await prisma.approval.findUnique({ where: { id } })
    if (!approval) {
      return NextResponse.json({ error: 'Approval not found' }, { status: 404 })
    }
    if (approval.status !== 'PENDING') {
      return NextResponse.json({ error: `Already ${approval.status.toLowerCase()}` }, { status: 400 })
    }

    const newStatus = action === 'approve' ? 'APPROVED' : 'DENIED'

    const updated = await prisma.approval.update({
      where: { id },
      data: {
        status: newStatus,
        resolvedBy: session.name || session.email || 'admin',
        resolvedAt: new Date(),
      },
    })

    // If approved, execute the gated action
    if (action === 'approve') {
      await executeApprovedAction(updated)
    }

    return NextResponse.json({ approval: updated })
  } catch (error) {
    console.error('Error updating approval:', error)
    return NextResponse.json({ error: 'Failed to update approval' }, { status: 500 })
  }
}

/**
 * Execute the action that was gated behind approval.
 * Each gate type maps to a specific system action.
 */
async function executeApprovedAction(approval: any) {
  try {
    switch (approval.gate) {
      case 'PAYMENT_LINK': {
        // Send the payment link SMS
        if (approval.draftContent && approval.metadata?.phone) {
          const { sendSMSViaProvider } = await import('@/lib/sms-provider')
          await sendSMSViaProvider({
            to: approval.metadata.phone,
            message: approval.draftContent,
            leadId: approval.leadId || undefined,
            clientId: approval.clientId || undefined,
            sender: 'clawdbot',
            trigger: 'approved_payment_link',
            aiGenerated: true,
          })
        }
        break
      }
      case 'SEND_MESSAGE': {
        // Send the drafted SMS/email
        if (approval.draftContent && approval.metadata?.phone) {
          const { sendSMSViaProvider } = await import('@/lib/sms-provider')
          await sendSMSViaProvider({
            to: approval.metadata.phone,
            message: approval.draftContent,
            leadId: approval.leadId || undefined,
            clientId: approval.clientId || undefined,
            sender: 'clawdbot',
            trigger: 'approved_message',
            aiGenerated: true,
          })
        }
        break
      }
      case 'SITE_PUBLISH': {
        // Mark client site as live
        if (approval.clientId) {
          await prisma.client.update({
            where: { id: approval.clientId },
            data: { hostingStatus: 'ACTIVE', siteLiveDate: new Date() },
          })
        }
        break
      }
      case 'REFUND': {
        // Log refund approval — actual Stripe refund handled by admin
        console.log(`[Approvals] Refund approved for ${approval.clientId || approval.leadId}`)
        break
      }
      case 'SUBSCRIPTION_CANCEL': {
        if (approval.clientId) {
          await prisma.client.update({
            where: { id: approval.clientId },
            data: { hostingStatus: 'CANCELLED', closedDate: new Date() },
          })
        }
        break
      }
      default:
        console.log(`[Approvals] Action approved for gate: ${approval.gate}`)
    }
  } catch (error) {
    console.error(`[Approvals] Failed to execute action for ${approval.id}:`, error)
  }
}
