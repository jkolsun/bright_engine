import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/unknown-inbound/[id]/link
 * Manually links an unknown inbound conversation to an existing lead.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const { id: messageId } = await context.params
    const { leadId } = await request.json()

    if (!leadId) {
      return NextResponse.json({ error: 'leadId required' }, { status: 400 })
    }

    // Find the source message to get the sender's phone/email
    const sourceMessage = await prisma.message.findUnique({
      where: { id: messageId },
    })

    if (!sourceMessage) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true, companyName: true, assignedToId: true },
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Determine the sender's contact value (from the inbound message)
    // For inbound messages, the "recipient" field might be our number,
    // and the actual sender's number might be in the content or parsed from Twilio data
    const senderPhone = sourceMessage.recipient || ''

    // Create LeadContact for the unknown number on the target lead
    if (senderPhone) {
      const existingContact = await prisma.leadContact.findFirst({
        where: { leadId, value: senderPhone },
      })

      if (!existingContact) {
        await prisma.leadContact.create({
          data: {
            leadId,
            type: 'PHONE',
            value: senderPhone,
            label: 'Other',
            addedBy: 'admin',
          },
        })
      }
    }

    // Move all messages from this unknown sender to the lead
    // Find all messages from this sender that have no lead/client assignment
    if (senderPhone) {
      await prisma.message.updateMany({
        where: {
          recipient: senderPhone,
          leadId: null,
          clientId: null,
        },
        data: {
          leadId,
        },
      })
    }

    // Notify the lead's assigned rep
    if (lead.assignedToId) {
      await prisma.notification.create({
        data: {
          type: 'CLIENT_TEXT',
          title: 'Unknown Contact Linked',
          message: `An unknown inbound conversation from ${senderPhone} has been linked to ${lead.companyName}.`,
          metadata: { leadId, phone: senderPhone },
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Link unknown inbound error:', error)
    return NextResponse.json(
      { error: 'Failed to link conversation', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
