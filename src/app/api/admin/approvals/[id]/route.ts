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

    // If denied, revert lead to previous stage and notify
    if (action === 'deny' && updated.leadId) {
      if (updated.gate === 'SEND_PREVIEW') {
        // Denied preview → back to editing for Jared to fix
        await prisma.lead.update({
          where: { id: updated.leadId },
          data: { buildStep: 'EDITING' },
        })
        await prisma.notification.create({
          data: {
            type: 'CLOSE_ENGINE',
            title: 'Preview Denied — Back to Editing',
            message: `Preview for lead was denied. Lead returned to Build Queue for edits.`,
            metadata: { leadId: updated.leadId, gate: updated.gate },
          },
        })
      } else if (updated.gate === 'SITE_PUBLISH') {
        await prisma.lead.update({
          where: { id: updated.leadId },
          data: { buildStep: 'CLIENT_APPROVED' },
        })
        await prisma.notification.create({
          data: {
            type: 'CLOSE_ENGINE',
            title: 'Site Publish Denied',
            message: `Site publication denied. Lead status unchanged.`,
            metadata: { leadId: updated.leadId, gate: updated.gate },
          },
        })
      } else if (updated.gate === 'PAYMENT_LINK') {
        // Denied payment link → lead stays in CLIENT_REVIEW, AI continues conversation
        await prisma.notification.create({
          data: {
            type: 'CLOSE_ENGINE',
            title: 'Payment Link Denied',
            message: `Payment link denied. Lead stays in CLIENT_REVIEW — AI continues the conversation.`,
            metadata: { leadId: updated.leadId, gate: updated.gate },
          },
        })
      }
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
        // Send the payment link SMS and update lead status
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

          // Log the message in the database
          if (approval.leadId) {
            await prisma.message.create({
              data: {
                content: approval.draftContent,
                direction: 'OUTBOUND',
                channel: 'SMS',
                senderType: 'AI',
                senderName: 'clawdbot',
                recipient: approval.metadata.phone,
                leadId: approval.leadId,
                aiGenerated: true,
                trigger: 'approved_payment_link',
              },
            })
          }
        }

        // Update lead buildStep — status stays APPROVED until they pay (→ PAID)
        if (approval.leadId) {
          await prisma.lead.update({
            where: { id: approval.leadId },
            data: { buildStep: 'PAYMENT_SENT', status: 'APPROVED' },
          })
        }

        // Notify admin
        await prisma.notification.create({
          data: {
            type: 'CLOSE_ENGINE',
            title: 'Payment Link Approved & Sent',
            message: `Payment link sent to client via SMS.`,
            metadata: { leadId: approval.leadId, clientId: approval.clientId },
          },
        })

        console.log(`[Approvals] Payment link sent for ${approval.leadId || approval.clientId}`)
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
        // Move lead to LIVE
        if (approval.leadId) {
          await prisma.lead.update({
            where: { id: approval.leadId },
            data: { buildStep: 'LIVE' },
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
      case 'SEND_PREVIEW': {
        // Andrew approved the site preview — move lead to CLIENT_REVIEW and send preview SMS
        if (approval.leadId) {
          const lead = await prisma.lead.update({
            where: { id: approval.leadId },
            data: {
              buildStep: 'CLIENT_REVIEW',
              status: 'CLIENT_REVIEW',
            },
            select: { id: true, firstName: true, companyName: true, phone: true, email: true, previewUrl: true, previewId: true },
          })

          const previewUrl = approval.metadata?.previewUrl || lead.previewUrl || (lead.previewId ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.brightautomations.com'}/preview/${lead.previewId}` : null)

          // Send preview link to client via SMS immediately
          if (lead.phone && previewUrl) {
            try {
              const { sendSMSViaProvider } = await import('@/lib/sms-provider')
              const firstName = lead.firstName || 'there'
              const company = lead.companyName || 'your business'
              const message = `Hey ${firstName}! Your website for ${company} is ready for review. Take a look and let me know what you think: ${previewUrl}`

              await sendSMSViaProvider({
                to: lead.phone,
                message,
                leadId: lead.id,
                sender: 'clawdbot',
                trigger: 'approved_preview_send',
                aiGenerated: true,
              })

              // Log the message in the database
              await prisma.message.create({
                data: {
                  content: message,
                  direction: 'OUTBOUND',
                  channel: 'SMS',
                  senderType: 'AI',
                  senderName: 'clawdbot',
                  recipient: lead.phone,
                  leadId: lead.id,
                  aiGenerated: true,
                  trigger: 'approved_preview_send',
                },
              })

              console.log(`[Approvals] Preview SMS sent to ${lead.phone} for ${lead.companyName}`)
            } catch (smsErr) {
              console.error('[Approvals] Failed to send preview SMS:', smsErr)
            }
          }

          await prisma.notification.create({
            data: {
              type: 'CLOSE_ENGINE',
              title: 'Preview Approved & Sent to Client',
              message: `Preview link sent to ${lead.firstName || 'client'} via SMS.`,
              metadata: { leadId: approval.leadId, previewUrl },
            },
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
