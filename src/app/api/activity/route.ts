import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * POST /api/activity — Log a rep call/activity
 * Body: { leadId, activityType, callDisposition?, notes?, durationSeconds? }
 * Auto-sets repId from session. Also increments daily RepActivity counters.
 */
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { leadId, activityType, callDisposition, notes, durationSeconds } = await request.json()

    if (!leadId || !activityType) {
      return NextResponse.json(
        { error: 'leadId and activityType are required' },
        { status: 400 }
      )
    }

    // Create Activity record
    const activity = await prisma.activity.create({
      data: {
        leadId,
        repId: session.userId,
        activityType,
        callDisposition: callDisposition ?? null,
        notes: notes ?? null,
        durationSeconds: durationSeconds ?? null,
      }
    })

    // Increment daily RepActivity counters
    if (activityType === 'CALL') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const isConversation = ['CONNECTED', 'INTERESTED', 'NOT_INTERESTED', 'CALLBACK'].includes(callDisposition || '')
      const isClose = callDisposition === 'INTERESTED'

      await prisma.repActivity.upsert({
        where: {
          repId_date: {
            repId: session.userId,
            date: today,
          }
        },
        create: {
          repId: session.userId,
          date: today,
          dials: 1,
          conversations: isConversation ? 1 : 0,
          closes: isClose ? 1 : 0,
        },
        update: {
          dials: { increment: 1 },
          ...(isConversation ? { conversations: { increment: 1 } } : {}),
          ...(isClose ? { closes: { increment: 1 } } : {}),
        }
      })
    }

    // Increment preview links sent counter
    if (activityType === 'PREVIEW_SENT') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      await prisma.repActivity.upsert({
        where: {
          repId_date: {
            repId: session.userId,
            date: today,
          }
        },
        create: {
          repId: session.userId,
          date: today,
          previewLinksSent: 1,
        },
        update: {
          previewLinksSent: { increment: 1 },
        }
      })
    }

    return NextResponse.json({ activity })
  } catch (error) {
    console.error('Activity log error:', error)
    return NextResponse.json(
      { error: 'Failed to log activity', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

/**
 * GET /api/activity — Get today's stats for the current rep
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const dailyStats = await prisma.repActivity.findUnique({
      where: {
        repId_date: {
          repId: session.userId,
          date: today,
        }
      }
    })

    return NextResponse.json({
      stats: {
        dials: dailyStats?.dials || 0,
        conversations: dailyStats?.conversations || 0,
        previewLinksSent: dailyStats?.previewLinksSent || 0,
        closes: dailyStats?.closes || 0,
      }
    })
  } catch (error) {
    console.error('Activity stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
