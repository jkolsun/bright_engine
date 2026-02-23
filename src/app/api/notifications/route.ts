import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'
import { NotificationType } from '@prisma/client'

export const dynamic = 'force-dynamic'

// NEW-L13: Notification types relevant to reps (not admin-only operational alerts)
const REP_NOTIFICATION_TYPES: NotificationType[] = ['PAYMENT_RECEIVED', 'ESCALATION']

// GET /api/notifications - Get notification feed (NEW-L13: role-filtered)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const unreadOnly = searchParams.get('unreadOnly') === 'true'
  const limit = parseInt(searchParams.get('limit') || '50')

  try {
    // NEW-L13: Auth check and role-based filtering
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const where: any = {}
    if (unreadOnly) {
      where.read = false
    }

    // NEW-L13: Reps only see rep-relevant notification types
    if (session.role !== 'ADMIN') {
      where.type = { in: REP_NOTIFICATION_TYPES }
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    const unreadCount = await prisma.notification.count({
      where: { read: false, ...(session.role !== 'ADMIN' ? { type: { in: REP_NOTIFICATION_TYPES } } : {}) }
    })

    return NextResponse.json({
      notifications,
      unreadCount
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

// POST /api/notifications - Create notification (with BUG P.1 deduplication)
export async function POST(request: NextRequest) {
  try {
    const { type, title, message, metadata, dedupKey } = await request.json()

    if (!type || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // BUG P.1: If dedupKey provided, check for recent duplicate
    if (dedupKey && metadata && metadata[dedupKey] !== undefined) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      const existing = await prisma.notification.findFirst({
        where: {
          type,
          metadata: { path: [dedupKey], equals: metadata[dedupKey] },
          createdAt: { gte: oneHourAgo },
        },
      })
      if (existing) {
        return NextResponse.json({ notification: existing, deduplicated: true })
      }
    }

    const notification = await prisma.notification.create({
      data: {
        type,
        title,
        message,
        metadata: metadata || {}
      }
    })

    return NextResponse.json({ notification })
  } catch (error) {
    console.error('Error creating notification:', error)
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    )
  }
}
