import { prisma } from './db'
import { sendSMS } from './twilio'

/**
 * Hot Lead Notification System
 * Detects high-engagement leads and sends real-time notifications to Andrew
 */

export interface HotLeadTrigger {
  leadId: string
  eventType: string
  metadata?: any
  urgencyScore: number
}

export async function processHotLeadEvent(params: {
  leadId: string
  eventType: string
  metadata?: any
}): Promise<boolean> {
  try {
    const { leadId, eventType, metadata } = params

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        events: {
          where: {
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
          },
          orderBy: { createdAt: 'desc' }
        },
        assignedTo: { select: { name: true, email: true } }
      }
    })

    if (!lead) return false

    // Calculate urgency score
    const urgencyScore = calculateUrgencyScore(lead, eventType, metadata)

    // Check if this qualifies as a hot lead notification
    if (urgencyScore >= 70) {
      await createHotLeadNotification({
        leadId,
        eventType,
        metadata,
        urgencyScore
      })
      
      return true
    }

    return false
  } catch (error) {
    console.error('Hot lead event processing error:', error)
    return false
  }
}

function calculateUrgencyScore(lead: any, eventType: string, metadata?: any): number {
  let score = 0

  // Base event scores
  const eventScores: Record<string, number> = {
    'PREVIEW_VIEWED': 30,
    'PREVIEW_CTA_CLICKED': 60,
    'PREVIEW_CALL_CLICKED': 80,
    'PREVIEW_FORM_SUBMITTED': 90,
    'RETURN_VISIT': 40,
    'EXTENDED_VIEW': 50, // > 2 minutes on page
  }

  score += eventScores[eventType] || 20

  // Engagement frequency bonus
  const recentEvents = lead.events.length
  if (recentEvents >= 5) score += 30
  else if (recentEvents >= 3) score += 20
  else if (recentEvents >= 2) score += 10

  // Time-based urgency (recent activity = higher urgency)
  const latestEvent = lead.events[0]
  if (latestEvent) {
    const minutesAgo = (Date.now() - new Date(latestEvent.createdAt).getTime()) / (1000 * 60)
    if (minutesAgo <= 15) score += 20
    else if (minutesAgo <= 60) score += 10
  }

  // Company size/quality indicators
  if (lead.enrichedRating && lead.enrichedRating >= 4.5) score += 15
  if (lead.enrichedReviews && lead.enrichedReviews >= 100) score += 10

  // Metadata-specific scoring
  if (metadata?.timeOnPage && metadata.timeOnPage >= 120) score += 25 // 2+ minutes
  if (metadata?.scrollDepth && metadata.scrollDepth >= 80) score += 15 // 80%+ scroll
  if (metadata?.clickedPhone) score += 30
  if (metadata?.clickedEmail) score += 20

  // Business hours bonus (M-F 9-5 EST)
  const now = new Date()
  const hour = now.getHours()
  const day = now.getDay()
  if (day >= 1 && day <= 5 && hour >= 9 && hour <= 17) score += 15

  return Math.min(score, 100) // Cap at 100
}

async function createHotLeadNotification(trigger: HotLeadTrigger) {
  const lead = await prisma.lead.findUnique({
    where: { id: trigger.leadId },
    include: {
      assignedTo: { select: { name: true } }
    }
  })

  if (!lead) return

  // Check for duplicate notifications (prevent spam)
  const recentNotification = await prisma.notification.findFirst({
    where: {
      type: 'HOT_LEAD',
      metadata: { path: ['leadId'], equals: trigger.leadId },
      createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } // Last hour
    }
  })

  if (recentNotification) return // Don't spam

  // Create notification
  const notification = await prisma.notification.create({
    data: {
      type: 'HOT_LEAD',
      title: '🔥 Hot Lead Alert',
      message: `${lead.firstName} at ${lead.companyName} just ${trigger.eventType.toLowerCase().replace(/_/g, ' ')} (Score: ${trigger.urgencyScore})`,
      metadata: {
        leadId: trigger.leadId,
        eventType: trigger.eventType,
        urgencyScore: trigger.urgencyScore,
        companyName: lead.companyName,
        assignedTo: lead.assignedTo?.name,
        ...trigger.metadata
      }
    }
  })

  // Send SMS to Andrew if high urgency (85+)
  if (trigger.urgencyScore >= 85 && process.env.ANDREW_PHONE) {
    try {
      await sendSMS({
        to: process.env.ANDREW_PHONE,
        message: `🔥 HOT LEAD: ${lead.firstName} at ${lead.companyName} just ${trigger.eventType.toLowerCase().replace(/_/g, ' ')}! Score: ${trigger.urgencyScore}/100`,
        trigger: 'hot_lead_alert'
      })
    } catch (smsError) {
      console.error('SMS notification failed:', smsError)
    }
  }

  // Update lead priority if not already hot
  if (lead.priority !== 'HOT') {
    await prisma.lead.update({
      where: { id: trigger.leadId },
      data: { priority: 'HOT' }
    })
  }

  return notification
}

export async function checkForStaleHotLeads() {
  // Find hot leads with no activity in 48 hours
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000)
  
  const staleHotLeads = await prisma.lead.findMany({
    where: {
      priority: 'HOT',
      events: {
        none: {
          createdAt: { gte: cutoff }
        }
      }
    },
    include: {
      assignedTo: { select: { name: true } }
    }
  })

  for (const lead of staleHotLeads) {
    // Downgrade priority to WARM
    await prisma.lead.update({
      where: { id: lead.id },
      data: { priority: 'WARM' }
    })

    // Create follow-up notification
    await prisma.notification.create({
      data: {
        type: 'ESCALATION',
        title: 'Stale Hot Lead',
        message: `${lead.companyName} was hot but has gone cold (no activity 48h)`,
        metadata: { 
          leadId: lead.id,
          previousPriority: 'HOT',
          assignedTo: lead.assignedTo?.name
        }
      }
    })
  }

  return staleHotLeads.length
}

export async function getHotLeadSummary() {
  const [hotLeads, recentAlerts, todayConversions] = await Promise.all([
    prisma.lead.count({ where: { priority: 'HOT' } }),
    prisma.notification.count({
      where: {
        type: 'HOT_LEAD',
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    }),
    prisma.lead.count({
      where: {
        priority: 'HOT',
        status: 'PAID',
        updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    })
  ])

  return {
    currentHotLeads: hotLeads,
    alertsToday: recentAlerts,
    conversionsToday: todayConversions,
    conversionRate: recentAlerts > 0 ? Math.round((todayConversions / recentAlerts) * 100) : 0
  }
}