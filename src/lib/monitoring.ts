import { prisma } from './db'
import { logActivity } from './logging'
import twilio from 'twilio'

/**
 * Real-Time Monitoring & Alerts
 * Tracks system health and sends critical alerts to Andrew
 */

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

export interface SystemAlert {
  severity: 'CRITICAL' | 'WARNING' | 'INFO'
  title: string
  message: string
  component: string
  metadata?: Record<string, any>
  timestamp?: Date
}

/**
 * Send critical alert to Andrew
 */
export async function sendAlert(alert: SystemAlert) {
  try {
    const message = `🚨 [${alert.severity}] ${alert.title}\n\n${alert.message}`

    // Send SMS alert
    if (process.env.TWILIO_PHONE_NUMBER && process.env.ANDREW_PHONE) {
      await twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: process.env.ANDREW_PHONE,
      })
    }

    // Log activity
    await logActivity(
      'ESCALATION',
      `${alert.severity}: ${alert.title}`,
      {
        metadata: {
          component: alert.component,
          ...alert.metadata,
        },
      }
    )

    console.log(`[ALERT] ${alert.severity}: ${alert.title}`)
  } catch (error) {
    console.error('Alert sending error:', error)
  }
}

/**
 * Monitor system health
 */
export async function checkSystemHealth() {
  const alerts: SystemAlert[] = []

  try {
    // Check 1: Database connection
    try {
      await prisma.lead.count()
    } catch (err) {
      alerts.push({
        severity: 'CRITICAL',
        title: 'Database Connection Failed',
        message: `Cannot connect to PostgreSQL database`,
        component: 'database',
      })
    }

    // Check 2: Redis availability
    try {
      // This would require a Redis client - skipping for now
    } catch (err) {
      alerts.push({
        severity: 'WARNING',
        title: 'Redis Unavailable',
        message: `Redis queue system offline. Job processing may be delayed.`,
        component: 'redis',
      })
    }

    // Check 3: Error rate (check last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const recentErrors = await prisma.clawdbotActivity.count({
      where: {
        actionType: 'ERROR',
        createdAt: { gte: oneHourAgo },
      },
    })

    if (recentErrors > 10) {
      alerts.push({
        severity: 'WARNING',
        title: `High Error Rate: ${recentErrors} errors in last hour`,
        message: `System experienced ${recentErrors} errors. Review logs.`,
        component: 'system',
        metadata: { errorCount: recentErrors },
      })
    }

    // Check 4: Stuck jobs (not processed in 24h)
    const stuckLeads = await prisma.lead.findMany({
      where: {
        status: 'BUILDING',
        createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      take: 5,
    })

    if (stuckLeads.length > 0) {
      alerts.push({
        severity: 'WARNING',
        title: `${stuckLeads.length} leads stuck in BUILDING for >24h`,
        message: `Possible pipeline stall. Check job queue.`,
        component: 'pipeline',
        metadata: { stuckCount: stuckLeads.length },
      })
    }

    // Check 5: Failed payments
    const failedPayments = await prisma.revenue.count({
      where: {
        status: 'FAILED',
        createdAt: { gte: oneHourAgo },
      },
    })

    if (failedPayments > 0) {
      alerts.push({
        severity: 'WARNING',
        title: `${failedPayments} payment(s) failed`,
        message: `Check Stripe webhooks and payment processing.`,
        component: 'payments',
        metadata: { failedCount: failedPayments },
      })
    }

    // Send critical alerts
    for (const alert of alerts) {
      if (alert.severity === 'CRITICAL') {
        await sendAlert(alert)
      }
    }

    return {
      healthy: alerts.length === 0,
      alerts,
      timestamp: new Date(),
    }
  } catch (error) {
    console.error('Health check error:', error)
    return {
      healthy: false,
      alerts: [
        {
          severity: 'CRITICAL' as const,
          title: 'Health Check Failed',
          message: error instanceof Error ? error.message : 'Unknown error',
          component: 'monitoring',
        },
      ],
      timestamp: new Date(),
    }
  }
}

/**
 * Monitor rep performance and quota
 */
export async function monitorRepPerformance() {
  const reps = await prisma.user.findMany({
    where: { role: 'REP', status: 'ACTIVE' },
    include: {
      assignedLeads: true,
      commissions: true,
    },
  })

  const alerts: SystemAlert[] = []

  for (const rep of reps) {
    // Check quota: each rep should have 20-50 active leads
    if (rep.assignedLeads.length < 20) {
      alerts.push({
        severity: 'WARNING',
        title: `Rep ${rep.name} below quota (${rep.assignedLeads.length} leads)`,
        message: `${rep.name} has only ${rep.assignedLeads.length} assigned leads. Target: 20-50.`,
        component: 'reps',
        metadata: { repId: rep.id, leadCount: rep.assignedLeads.length },
      })
    }

    if (rep.assignedLeads.length > 100) {
      alerts.push({
        severity: 'INFO',
        title: `Rep ${rep.name} over quota (${rep.assignedLeads.length} leads)`,
        message: `${rep.name} has ${rep.assignedLeads.length} assigned leads. May need distribution.`,
        component: 'reps',
        metadata: { repId: rep.id, leadCount: rep.assignedLeads.length },
      })
    }
  }

  return alerts
}

/**
 * Monitor data quality
 */
export async function monitorDataQuality() {
  const alerts: SystemAlert[] = []

  // Check for leads missing critical fields
  const incompleteLeads = await prisma.lead.count({
    where: {
      OR: [{ email: { equals: '' } }, { phone: { equals: '' } }],
    },
  })

  if (incompleteLeads > 0) {
    alerts.push({
      severity: 'WARNING',
      title: `${incompleteLeads} leads with missing contact info`,
      message: `${incompleteLeads} leads missing email or phone. Check import quality.`,
      component: 'data_quality',
      metadata: { count: incompleteLeads },
    })
  }

  return alerts
}

/**
 * Comprehensive system monitoring
 */
export async function runFullMonitoring() {
  const [health, repAlerts, dataQualityAlerts] = await Promise.all([
    checkSystemHealth(),
    monitorRepPerformance(),
    monitorDataQuality(),
  ])

  const allAlerts = [...health.alerts, ...repAlerts, ...dataQualityAlerts]

  // Log activity
  if (allAlerts.length > 0) {
    await logActivity(
      'ALERT',
      `Monitoring: ${allAlerts.length} alerts`,
      {
        metadata: {
          alerts: allAlerts.map((a) => ({
            severity: a.severity,
            title: a.title,
            component: a.component,
          })),
        },
      }
    )
  }

  return {
    health: health.healthy,
    totalAlerts: allAlerts.length,
    criticalAlerts: allAlerts.filter((a) => a.severity === 'CRITICAL').length,
    alerts: allAlerts,
    timestamp: new Date(),
  }
}
