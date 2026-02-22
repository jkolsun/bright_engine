import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * PUT /api/admin/approvals/[id] - Approve or Deny an approval
 * Body: { action: 'approve' | 'deny', denialReason?: string }
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
    const { action, denialReason, paymentUrl: overridePaymentUrl } = await request.json()

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

    // Merge metadata updates: denial reason or admin-edited payment URL
    const existingMeta = (approval.metadata as Record<string, unknown>) || {}
    let updatedMeta = { ...existingMeta }
    if (action === 'deny' && denialReason) {
      updatedMeta = { ...updatedMeta, denialReason }
    }
    if (action === 'approve' && overridePaymentUrl && approval.gate === 'PAYMENT_LINK') {
      updatedMeta = { ...updatedMeta, paymentUrl: overridePaymentUrl }
    }

    const updated = await prisma.approval.update({
      where: { id },
      data: {
        status: newStatus,
        resolvedBy: session.name || session.email || 'admin',
        resolvedAt: new Date(),
        metadata: updatedMeta as any,
      },
    })

    // If approved, execute the gated action
    if (action === 'approve') {
      await executeApprovedAction(updated)
    }

    // If denied, revert lead to previous stage and notify
    if (action === 'deny' && updated.leadId) {
      const reasonText = denialReason ? ` Reason: ${denialReason}` : ''

      if (updated.gate === 'SEND_PREVIEW') {
        // Denied preview -> back to editing for Jared to fix
        await prisma.lead.update({
          where: { id: updated.leadId },
          data: { buildStep: 'EDITING' },
        })
        await prisma.notification.create({
          data: {
            type: 'CLOSE_ENGINE',
            title: 'Preview Denied — Back to Editing',
            message: `Preview for lead was denied. Lead returned to Build Queue for edits.${reasonText}`,
            metadata: { leadId: updated.leadId, gate: updated.gate, denialReason: denialReason || null },
          },
        })
      } else if (updated.gate === 'SITE_PUBLISH') {
        await prisma.lead.update({
          where: { id: updated.leadId },
          data: { buildStep: 'EDITING' },
        })
        await prisma.notification.create({
          data: {
            type: 'CLOSE_ENGINE',
            title: 'Site Publish Denied — Back to Editing',
            message: `Site publication denied. Lead returned to Build Queue for edits.${reasonText}`,
            metadata: { leadId: updated.leadId, gate: updated.gate, denialReason: denialReason || null },
          },
        })
      } else if (updated.gate === 'PAYMENT_LINK') {
        // Denied payment link -> lead stays in CLIENT_REVIEW, AI continues conversation
        await prisma.notification.create({
          data: {
            type: 'CLOSE_ENGINE',
            title: 'Payment Link Denied',
            message: `Payment link denied. Lead stays in CLIENT_REVIEW — AI continues the conversation.${reasonText}`,
            metadata: { leadId: updated.leadId, gate: updated.gate, denialReason: denialReason || null },
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
 *
 * NOTE: sendSMSViaProvider() already creates a Message record in the database.
 * Do NOT create additional message records here or messages will appear twice
 * in the Control Center.
 */
async function executeApprovedAction(approval: any) {
  try {
    switch (approval.gate) {
      case 'PAYMENT_LINK': {
        // Use static Stripe link from metadata (admin may have edited it before approving)
        let paymentUrl: string = (approval.metadata as any)?.paymentUrl || ''
        if (!paymentUrl) {
          console.error(`[Approvals] No payment URL for approval ${approval.id}`)
          break
        }
        // Safety net: ensure client_reference_id is on the URL so the webhook can match
        if (approval.leadId && paymentUrl && !paymentUrl.includes('client_reference_id')) {
          try {
            const urlObj = new URL(paymentUrl)
            urlObj.searchParams.set('client_reference_id', approval.leadId)
            paymentUrl = urlObj.toString()
          } catch {
            const sep = paymentUrl.includes('?') ? '&' : '?'
            paymentUrl = `${paymentUrl}${sep}client_reference_id=${approval.leadId}`
          }
        }

        const { getPricingConfig } = await import('@/lib/pricing-config')
        const pricingConfig = await getPricingConfig()

        const { getSystemMessage } = await import('@/lib/system-messages')
        const paymentLead = approval.leadId ? await prisma.lead.findUnique({ where: { id: approval.leadId }, select: { firstName: true, companyName: true } }) : null
        const { text: paymentMessage } = await getSystemMessage('payment_link', {
          firstName: paymentLead?.firstName || 'there',
          companyName: paymentLead?.companyName || 'your business',
          paymentLink: paymentUrl,
          firstMonthTotal: `$${pricingConfig.firstMonthTotal}`,
          monthlyHosting: `$${pricingConfig.monthlyHosting}`,
        })

        // Send via SMS (with email fallback)
        const phone = approval.metadata?.phone as string | undefined
        if (phone) {
          const { sendCloseEngineMessage } = await import('@/lib/close-engine-processor')
          await sendCloseEngineMessage({
            to: phone,
            toEmail: (approval.metadata?.email as string) || undefined,
            message: paymentMessage,
            leadId: approval.leadId || '',
            trigger: 'approved_payment_link',
            conversationType: 'pre_client',
            emailSubject: `Your payment link to go live`,
          })
        }

        // Update lead buildStep and status
        if (approval.leadId) {
          await prisma.lead.update({
            where: { id: approval.leadId },
            data: { buildStep: 'PAYMENT_SENT', status: 'APPROVED' },
          })
        }

        // Transition conversation to PAYMENT_SENT
        if (approval.leadId) {
          try {
            const conversation = await prisma.closeEngineConversation.findUnique({
              where: { leadId: approval.leadId },
            })
            if (conversation) {
              const { transitionStage, CONVERSATION_STAGES } = await import('@/lib/close-engine')
              await transitionStage(conversation.id, CONVERSATION_STAGES.PAYMENT_SENT)
            }
          } catch (stageErr) {
            console.error('[Approvals] Failed to transition to PAYMENT_SENT:', stageErr)
          }
        }

        // Save payment URL to approval metadata for reference
        await prisma.approval.update({
          where: { id: approval.id },
          data: { metadata: { ...(approval.metadata as any || {}), paymentUrl } },
        })

        await prisma.notification.create({
          data: {
            type: 'CLOSE_ENGINE',
            title: 'Payment Link Approved & Sent',
            message: `Payment link generated and sent to client via SMS.`,
            metadata: { leadId: approval.leadId, clientId: approval.clientId, paymentUrl },
          },
        })

        console.log(`[Approvals] Payment link generated & sent for ${approval.leadId || approval.clientId}`)
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

          const previewUrl = approval.metadata?.previewUrl || lead.previewUrl || (lead.previewId ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://preview.brightautomations.org'}/preview/${lead.previewId}` : null)

          // Send preview link to client via SMS immediately
          if (lead.phone && previewUrl) {
            try {
              const { sendSMSViaProvider } = await import('@/lib/sms-provider')
              const { getSystemMessage } = await import('@/lib/system-messages')
              const firstName = lead.firstName || 'there'
              const company = lead.companyName || 'your business'
              const { text: message, enabled: previewMsgEnabled } = await getSystemMessage('preview_sent', { firstName, companyName: company, previewUrl })
              if (!previewMsgEnabled) { console.log('[Approvals] preview_sent message disabled'); break }

              await sendSMSViaProvider({
                to: lead.phone,
                message,
                leadId: lead.id,
                sender: 'clawdbot',
                trigger: 'approved_preview_send',
                aiGenerated: true,
              })
              // sendSMSViaProvider already logs the message — no manual message.create needed

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

          // Transition CloseEngineConversation to PREVIEW_SENT so AI knows client is reviewing
          try {
            const conversation = await prisma.closeEngineConversation.findUnique({
              where: { leadId: approval.leadId! },
            })
            if (conversation) {
              const { transitionStage, CONVERSATION_STAGES } = await import('@/lib/close-engine')
              await transitionStage(conversation.id, CONVERSATION_STAGES.PREVIEW_SENT)
            }
          } catch (stageErr) {
            console.error('[Approvals] Failed to transition conversation to PREVIEW_SENT:', stageErr)
          }
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