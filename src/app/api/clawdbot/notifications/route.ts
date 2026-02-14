import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/clawdbot/notifications - Get notifications for Clawdbot
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const type = searchParams.get('type')
  const unreadOnly = searchParams.get('unread') === 'true'
  const limit = parseInt(searchParams.get('limit') || '25')

  try {
    const where: any = {}
    if (type) where.type = type
    if (unreadOnly) where.read = false

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    return NextResponse.json({
      notifications: notifications.map(notif => ({
        id: notif.id,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        metadata: notif.metadata,
        read: notif.read,
        createdAt: notif.createdAt
      }))
    })
  } catch (error) {
    console.error('Clawdbot notifications fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

// POST /api/clawdbot/notifications - Create notification via Clawdbot
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    const notification = await prisma.notification.create({
      data: {
        type: data.type || 'SYSTEM_ALERT',
        title: data.title,
        message: data.message,
        metadata: data.metadata || {}
      }
    })

    // If this is a high-priority notification, also send to Andrew
    if (data.urgent || data.type === 'HOT_LEAD' || data.type === 'PAYMENT_FAILED') {
      // TODO: Send SMS/email notification to Andrew
      console.log('URGENT NOTIFICATION:', data.title, data.message)
    }

    return NextResponse.json({ 
      notification: { 
        id: notification.id, 
        created: true,
        urgent: data.urgent || false
      } 
    })
  } catch (error) {
    console.error('Clawdbot notification creation error:', error)
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 })
  }
}

// PUT /api/clawdbot/notifications/[id] - Mark notification as read
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json()
    const notificationId = data.notificationId

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID required' }, { status: 400 })
    }

    const notification = await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true }
    })

    return NextResponse.json({ 
      notification: { 
        id: notification.id, 
        marked: 'read',
        read: notification.read
      } 
    })
  } catch (error) {
    console.error('Clawdbot notification update error:', error)
    return NextResponse.json({ error: 'Failed to mark notification as read' }, { status: 500 })
  }
}