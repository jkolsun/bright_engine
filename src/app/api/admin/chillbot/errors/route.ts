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

    const url = new URL(request.url)
    const hours = Math.min(parseInt(url.searchParams.get('hours') || '24'), 168)
    const since = new Date(Date.now() - hours * 60 * 60 * 1000)

    const [
      failedMessages,
      failedWebhooks,
      clawdbotErrors,
      failedPayments,
    ] = await Promise.all([
      prisma.message.findMany({
        where: {
          createdAt: { gte: since },
          twilioStatus: { in: ['failed', 'undelivered'] },
        },
        select: {
          id: true,
          leadId: true,
          channel: true,
          content: true,
          twilioStatus: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),

      prisma.failedWebhook.findMany({
        where: { createdAt: { gte: since } },
        select: {
          id: true,
          source: true,
          error: true,
          retryCount: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),

      prisma.clawdbotActivity.findMany({
        where: {
          actionType: 'ERROR',
          createdAt: { gte: since },
        },
        select: {
          id: true,
          description: true,
          leadId: true,
          clientId: true,
          metadata: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),

      prisma.revenue.findMany({
        where: {
          status: 'FAILED',
          createdAt: { gte: since },
        },
        select: {
          id: true,
          amount: true,
          type: true,
          clientId: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ])

    const maskedMessages = failedMessages.map((m) => ({
      ...m,
      content: m.content ? m.content.substring(0, 50) + '...' : null,
    }))

    const totalErrors =
      failedMessages.length +
      failedWebhooks.length +
      clawdbotErrors.length +
      failedPayments.length

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      hours,
      failedMessages: maskedMessages,
      failedWebhooks,
      clawdbotErrors,
      failedPayments,
      summary: {
        totalErrors,
        failedMessages: failedMessages.length,
        failedWebhooks: failedWebhooks.length,
        clawdbotErrors: clawdbotErrors.length,
        failedPayments: failedPayments.length,
      },
    })
  } catch (error) {
    console.error('[ChillBot Errors] Error:', error)
    return NextResponse.json(
      { error: 'Error check failed', detail: String(error) },
      { status: 500 }
    )
  }
}
