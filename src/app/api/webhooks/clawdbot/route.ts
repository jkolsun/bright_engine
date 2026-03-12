import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// POST /api/webhooks/clawdbot - Receive events from the platform
export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature/auth
    const authHeader = request.headers.get('authorization')
    const expectedToken = `Bearer ${process.env.CLAWDBOT_WEBHOOK_SECRET}`
    
    if (!authHeader || authHeader !== expectedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const event = await request.json()
    console.log('🤖 Clawdbot webhook received:', event.type, event.data)

    // Process the event based on type
    // Each handler is wrapped in try-catch so a failure in one doesn't crash the webhook
    let handlerError: string | null = null

    switch (event.type) {
      case 'lead.hot_engagement':
        try { await handleHotEngagement(event.data) } catch (e) {
          console.error(`[Clawdbot Webhook] handleHotEngagement failed:`, e)
          handlerError = (e as Error).message
        }
        break

      case 'lead.imported':
        try { await handleLeadImported(event.data) } catch (e) {
          console.error(`[Clawdbot Webhook] handleLeadImported failed:`, e)
          handlerError = (e as Error).message
        }
        break

      case 'payment.received':
        try { await handlePaymentReceived(event.data) } catch (e) {
          console.error(`[Clawdbot Webhook] handlePaymentReceived failed:`, e)
          handlerError = (e as Error).message
        }
        break

      case 'client.question':
        try { await handleClientQuestion(event.data) } catch (e) {
          console.error(`[Clawdbot Webhook] handleClientQuestion failed:`, e)
          handlerError = (e as Error).message
        }
        break

      case 'lead.stalled':
        try { await handleStalledLead(event.data) } catch (e) {
          console.error(`[Clawdbot Webhook] handleStalledLead failed:`, e)
          handlerError = (e as Error).message
        }
        break

      case 'daily.digest_requested':
        try { await handleDailyDigest(event.data) } catch (e) {
          console.error(`[Clawdbot Webhook] handleDailyDigest failed:`, e)
          handlerError = (e as Error).message
        }
        break

      case 'dialer.call_completed':
      case 'dialer.lead_interested':
        // Acknowledged — no action needed in Clawdbot for these event types
        break

      default:
        console.log('[Clawdbot Webhook] Unknown event type:', event.type)
    }

    // Log the webhook event (always runs, even if handler failed)
    await prisma.clawdbotActivity.create({
      data: {
        actionType: 'ALERT',
        description: handlerError
          ? `Webhook handler failed: ${event.type} — ${handlerError}`
          : `Processed webhook: ${event.type}`,
        metadata: event.data,
      }
    })

    return NextResponse.json({ success: !handlerError, processed: event.type, ...(handlerError ? { warning: 'Handler error logged' } : {}) })
  } catch (error) {
    console.error('🤖 Webhook processing error:', error)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}

// Event Handlers
async function handleHotEngagement(data: any) {
  const { leadId, eventType, urgencyScore } = data
  
  // Get lead details
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { assignedTo: true }
  })

  if (!lead) return

  // Send immediate SMS alert to Andrew if urgency is high
  if (urgencyScore >= 80 && process.env.ANDREW_PHONE) {
    // This would integrate with your messaging system
    console.log(`🔥 URGENT: ${lead.firstName} at ${lead.companyName} - ${eventType} (Score: ${urgencyScore})`)
    
    // TODO: Actually send SMS via your messaging service
    // await sendSMS(process.env.ANDREW_PHONE, `🔥 HOT LEAD: ${lead.firstName} at ${lead.companyName} just ${eventType}!`)
  }

  // Create high-priority task for rep if assigned
  const engagementRepId = lead.ownerRepId || lead.assignedToId
  if (engagementRepId && urgencyScore >= 70) {
    await prisma.repTask.create({
      data: {
        leadId,
        repId: engagementRepId,
        taskType: 'URGENT_FOLLOWUP',
        priority: 'URGENT',
        dueAt: new Date(), // Due immediately
        notes: `Hot engagement: ${eventType} (Score: ${urgencyScore})`
      }
    })
  }
}

async function handleLeadImported(data: any) {
  const { leadIds, campaign } = data
  
  console.log(`🤖 Processing ${leadIds.length} new leads from ${campaign}`)
  
  // Could trigger additional enrichment, qualification, or assignment logic
  for (const leadId of leadIds) {
    // Queue for immediate AI qualification
    // TODO: Implement AI lead scoring/qualification
  }
}

async function handlePaymentReceived(data: any) {
  const { leadId, amount, clientId } = data
  
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { assignedTo: true }
  })

  console.log(`🎉 Payment received: $${amount} from ${lead?.companyName}`)
  
  // Send congratulations to responsible rep
  const paymentRepId = lead?.ownerRepId || lead?.assignedToId
  if (paymentRepId) {
    // TODO: Send notification to rep about their commission
  }
  
  // Trigger client onboarding sequence
  // TODO: Queue welcome messages, setup calls, etc.
}

async function handleClientQuestion(data: any) {
  const { clientId, question, phone } = data
  
  console.log(`❓ Client question from ${phone}: ${question}`)
  
  // TODO: Use AI to determine if this can be auto-answered
  // Or escalate to Andrew/support team
}

async function handleStalledLead(data: any) {
  const { leadId, daysSinceActivity } = data
  
  const lead = await prisma.lead.findUnique({ where: { id: leadId } })
  
  console.log(`⚠️ Stalled lead: ${lead?.companyName} (${daysSinceActivity} days inactive)`)
  
  // Create re-engagement task
  const stalledRepId = lead?.ownerRepId || lead?.assignedToId
  if (stalledRepId) {
    await prisma.repTask.create({
      data: {
        leadId,
        repId: stalledRepId,
        taskType: 'RE_ENGAGEMENT',
        priority: 'MEDIUM',
        dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Due tomorrow
        notes: `Lead has been inactive for ${daysSinceActivity} days - needs re-engagement`
      }
    })
  }
}

async function handleDailyDigest(data: any) {
  console.log('📊 Generating daily business digest...')
  
  // TODO: Compile daily stats and send to Andrew
  // - New leads
  // - Hot prospects
  // - Payments received
  // - Pipeline health
}