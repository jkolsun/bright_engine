import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// POST /api/webhooks/instantly - Instantly email webhook
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    // Handle Instantly webhook events
    const { event, email, contact_id, campaign_id } = data

    // Find lead by email
    const lead = await prisma.lead.findFirst({
      where: { email }
    })

    if (!lead) {
      return NextResponse.json({ received: true })
    }

    // Map Instantly events to LeadEvent types
    let eventType: string | null = null
    switch (event) {
      case 'open':
        eventType = 'EMAIL_OPENED'
        break
      case 'click':
        eventType = 'EMAIL_REPLIED'
        break
      case 'reply':
        eventType = 'EMAIL_REPLIED'
        break
      case 'bounce':
        eventType = 'EMAIL_SENT'
        break
      default:
        return NextResponse.json({ received: true })
    }

    // Log the event
    await prisma.leadEvent.create({
      data: {
        leadId: lead.id,
        eventType: eventType as any,
        metadata: {
          campaign_id,
          contact_id,
          provider: 'instantly'
        },
        actor: 'instantly'
      }
    })

    // Update lead engagement if hot lead trigger
    if (event === 'click' || event === 'reply') {
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          status: 'HOT_LEAD',
          priority: 'HOT'
        }
      })
    }

    return NextResponse.json({ received: true, leadId: lead.id })
  } catch (error) {
    console.error('Instantly webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 400 }
    )
  }
}
