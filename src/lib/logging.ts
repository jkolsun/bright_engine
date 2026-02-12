import { prisma } from './db'

/**
 * Log any action Clawdbot takes to the activity feed
 * This is the core audit trail for governance + learning
 */
export async function logActivity(
  actionType: string,
  description: string,
  options?: {
    leadId?: string
    clientId?: string
    repId?: string
    metadata?: Record<string, any>
    tokenCost?: number
  }
) {
  try {
    // Use any type for now until prisma client is regenerated after migration
    const prismaAny = prisma as any
    if (prismaAny.clawdbotActivity) {
      await prismaAny.clawdbotActivity.create({
        data: {
          actionType,
          description,
          leadId: options?.leadId,
          clientId: options?.clientId,
          repId: options?.repId,
          metadata: options?.metadata,
          tokenCost: options?.tokenCost,
        },
      })
    }
  } catch (error) {
    // If logging fails, log to console but don't break the operation
    console.error('Failed to log activity:', {
      actionType,
      description,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

/**
 * Get recent activity for the dashboard
 */
export async function getRecentActivity(limit = 50) {
  try {
    const prismaAny = prisma as any
    if (!prismaAny.clawdbotActivity) return []
    
    return await prismaAny.clawdbotActivity.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            companyName: true,
          },
        },
        client: {
          select: {
            id: true,
            companyName: true,
          },
        },
        rep: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })
  } catch {
    return []
  }
}

/**
 * Get activity stats for today
 */
export async function getTodayStats() {
  try {
    const prismaAny = prisma as any
    if (!prismaAny.clawdbotActivity) {
      return {
        totalActions: 0,
        textsSent: 0,
        textsReceived: 0,
        alertsSent: 0,
        previewsGenerated: 0,
        upsellsPitched: 0,
        referralsAsked: 0,
        errors: 0,
      }
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const activities = await prismaAny.clawdbotActivity.findMany({
      where: {
        createdAt: {
          gte: today,
        },
      },
      select: {
        actionType: true,
      },
    })

    const stats = {
      totalActions: activities.length,
      textsSent: activities.filter((a: any) => a.actionType === 'TEXT_SENT').length,
      textsReceived: activities.filter((a: any) => a.actionType === 'TEXT_RECEIVED').length,
      alertsSent: activities.filter((a: any) => a.actionType === 'ALERT').length,
      previewsGenerated: activities.filter((a: any) => a.actionType === 'PREVIEW_GENERATED').length,
      upsellsPitched: activities.filter((a: any) => a.actionType === 'UPSELL_PITCH').length,
      referralsAsked: activities.filter((a: any) => a.actionType === 'REFERRAL_ASK').length,
      errors: activities.filter((a: any) => a.actionType === 'ERROR').length,
    }

    return stats
  } catch {
    return {
      totalActions: 0,
      textsSent: 0,
      textsReceived: 0,
      alertsSent: 0,
      previewsGenerated: 0,
      upsellsPitched: 0,
      referralsAsked: 0,
      errors: 0,
    }
  }
}

/**
 * Get active queues status
 */
export async function getQueueStatus() {
  const activeLeads = await prisma.lead.findMany({
    where: {
      status: {
        in: ['NEW', 'HOT_LEAD', 'QUALIFIED', 'INFO_COLLECTED'],
      },
    },
    select: {
      id: true,
      companyName: true,
      status: true,
      priority: true,
    },
  })

  return {
    nurture_active: activeLeads.filter(l => l.status === 'INFO_COLLECTED').length,
    preview_urgency: activeLeads.filter(l => l.status === 'HOT_LEAD').length,
    upsell_pending: 0, // Will be populated when upsell system is live
    referral_pending: 0, // Will be populated when referral system is live
    total_hot: activeLeads.filter(l => l.priority === 'HOT').length,
    leads: activeLeads,
  }
}
