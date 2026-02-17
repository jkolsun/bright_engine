import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

// POST /api/feedback — Rep submits feedback to admin
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { message, category } = await request.json()
    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Store as a notification for admin
    await prisma.notification.create({
      data: {
        type: 'ESCALATION',
        title: `Feedback from ${session.name || session.email}`,
        message: message.trim(),
        metadata: {
          category: category || 'general',
          repId: session.userId,
          repEmail: session.email,
          repName: session.name,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Feedback error:', error)
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 })
  }
}

// GET /api/feedback — Admin views feedback
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const feedback = await prisma.notification.findMany({
      where: {
        title: { startsWith: 'Feedback from' },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({ feedback })
  } catch (error) {
    console.error('Feedback fetch error:', error)
    return NextResponse.json({ feedback: [] })
  }
}
