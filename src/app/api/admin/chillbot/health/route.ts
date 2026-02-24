import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || (session.role !== 'ADMIN' && session.role !== 'CHILLBOT')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000)
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)

    const [
      dbCheck,
      leadsByStatus,
      stalledLeads,
      todayLeads,
      activeClients,
      failedPaymentClients,
      clientsByStatus,
      mrr,
      recentFailedMessages,
      todayRevenue,
      failedPayments,
      pendingCommissions,
      failedWebhooks24h,
      clawdbotErrors,
    ] = await Promise.all([
      prisma.$queryRaw`SELECT 1 as health`
        .then(() => ({ status: 'connected' as const }))
        .catch((e: any) => ({ status: 'error' as const, error: String(e) })),

      prisma.lead.groupBy({
        by: ['status'],
        _count: { id: true },
      }),

      prisma.lead.count({
        where: {
          status: { notIn: ['CLOSED_LOST', 'DO_NOT_CONTACT', 'PAID'] },
          updatedAt: { lt: new Date(now.getTime() - 48 * 60 * 60 * 1000) },
        },
      }),

      prisma.lead.count({
        where: { createdAt: { gte: todayStart } },
      }),

      prisma.client.count({
        where: { hostingStatus: 'ACTIVE' },
      }),

      prisma.client.count({
        where: { hostingStatus: { in: ['FAILED_PAYMENT', 'GRACE_PERIOD'] } },
      }),

      prisma.client.groupBy({
        by: ['hostingStatus'],
        _count: { id: true },
      }),

      prisma.client.aggregate({
        _sum: { monthlyRevenue: true },
        where: { hostingStatus: 'ACTIVE' },
      }),

      prisma.message.count({
        where: {
          createdAt: { gte: oneDayAgo },
          twilioStatus: { in: ['failed', 'undelivered'] },
        },
      }),

      prisma.revenue.aggregate({
        _sum: { amount: true },
        _count: { id: true },
        where: { createdAt: { gte: todayStart } },
      }),

      prisma.revenue.count({
        where: {
          createdAt: { gte: oneDayAgo },
          status: 'FAILED',
        },
      }),

      prisma.commission.count({
        where: {
          status: 'PENDING',
          createdAt: { lt: oneDayAgo },
        },
      }),

      prisma.failedWebhook.count({
        where: { createdAt: { gte: oneDayAgo } },
      }),

      prisma.clawdbotActivity.count({
        where: {
          actionType: 'ERROR',
          createdAt: { gte: oneDayAgo },
        },
      }),
    ])

    let redisHealth: { status: string; error?: string } = { status: 'unknown' }
    try {
      const { default: Redis } = await import('ioredis')
      const redis = new Redis(process.env.REDIS_URL || '')
      await redis.ping()
      redisHealth = { status: 'connected' }
      await redis.quit()
    } catch (e) {
      redisHealth = { status: 'error', error: String(e) }
    }

    const twilioConfigured = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
    const stripeConfigured = !!process.env.STRIPE_SECRET_KEY

    const issues: string[] = []
    if (recentFailedMessages > 10) issues.push(`${recentFailedMessages} failed messages in last 24h`)
    if (failedWebhooks24h > 5) issues.push(`${failedWebhooks24h} failed webhooks in last 24h`)
    if (failedPayments > 0) issues.push(`${failedPayments} failed payments in last 24h`)
    if (clawdbotErrors > 10) issues.push(`${clawdbotErrors} ClawdBot errors in last 24h`)
    if (redisHealth.status !== 'connected') issues.push('Redis not connected')
    if (dbCheck.status !== 'connected') issues.push('Database not connected')

    const healthStatus = issues.length > 2 ? 'critical' : issues.length > 0 ? 'warning' : 'healthy'

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      database: dbCheck,
      redis: redisHealth,
      twilio: { status: twilioConfigured ? 'configured' : 'not_configured' },
      stripe: { status: stripeConfigured ? 'configured' : 'not_configured' },
      pipeline: {
        leadsByStatus: leadsByStatus.reduce((acc: Record<string, number>, item) => {
          acc[item.status] = item._count.id
          return acc
        }, {}),
        stalledLeads,
        todayNewLeads: todayLeads,
      },
      clients: {
        active: activeClients,
        failedPayment: failedPaymentClients,
        byStatus: clientsByStatus.reduce((acc: Record<string, number>, item) => {
          acc[item.hostingStatus] = item._count.id
          return acc
        }, {}),
        mrr: mrr._sum.monthlyRevenue || 0,
      },
      payments: {
        todayRevenue: todayRevenue._sum.amount || 0,
        todayCount: todayRevenue._count.id || 0,
        failedLast24h: failedPayments,
        pendingCommissions,
      },
      communications: {
        failedMessagesLast24h: recentFailedMessages,
        failedWebhooksLast24h: failedWebhooks24h,
      },
      clawdbot: {
        errorsLast24h: clawdbotErrors,
      },
      health: {
        status: healthStatus,
        issues,
      },
    })
  } catch (error) {
    console.error('[ChillBot Health] Error:', error)
    return NextResponse.json(
      { error: 'Health check failed', detail: String(error) },
      { status: 500 }
    )
  }
}
