import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/approvals - List approvals with optional status and gate filter
 * Query params: status (PENDING | APPROVED | DENIED | all), gate (PAYMENT_LINK | SEND_PREVIEW | etc.), limit, offset
 *
 * Returns enriched approvals with lead data and recent conversation messages
 * so the admin has full context when reviewing.
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'PENDING'
    const gateFilter = searchParams.get('gate') || null
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: Record<string, unknown> = {}
    if (status !== 'all') where.status = status
    if (gateFilter) where.gate = gateFilter

    const [approvals, total, pendingCount] = await Promise.all([
      prisma.approval.findMany({
        where,
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
        take: limit,
        skip: offset,
      }),
      prisma.approval.count({ where }),
      prisma.approval.count({ where: { status: 'PENDING' } }),
    ])

    // Enrich approvals with lead data and recent messages for context
    const enriched = await Promise.all(
      approvals.map(async (approval: any) => {
        let lead: any = null
        let recentMessages: any[] = []

        if (approval.leadId) {
          // Fetch lead info
          lead = await prisma.lead.findUnique({
            where: { id: approval.leadId },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyName: true,
              phone: true,
              email: true,
              status: true,
              buildStep: true,
              previewUrl: true,
              previewId: true,
            },
          })

          // Fetch last 5 messages for conversation context
          recentMessages = await prisma.message.findMany({
            where: { leadId: approval.leadId },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
              id: true,
              content: true,
              direction: true,
              senderType: true,
              createdAt: true,
            },
          })
          // Reverse so they're chronological (oldest first)
          recentMessages.reverse()
        }

        return {
          ...approval,
          lead,
          recentMessages,
        }
      })
    )

    return NextResponse.json({ approvals: enriched, total, pendingCount })
  } catch (error) {
    console.error('Error fetching approvals:', error)
    return NextResponse.json({ error: 'Failed to fetch approvals' }, { status: 500 })
  }
}

/**
 * POST /api/admin/approvals - Create a new approval request
 * Called by system/AI when a high-risk action needs human sign-off
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { gate, title, description, draftContent, leadId, clientId, requestedBy, priority, metadata, expiresAt } = data

    if (!gate || !title || !description) {
      return NextResponse.json({ error: 'gate, title, and description are required' }, { status: 400 })
    }

    const approval = await prisma.approval.create({
      data: {
        gate,
        title,
        description,
        draftContent: draftContent || null,
        leadId: leadId || null,
        clientId: clientId || null,
        requestedBy: requestedBy || 'system',
        priority: priority || 'NORMAL',
        metadata: metadata || undefined,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    })

    return NextResponse.json({ approval }, { status: 201 })
  } catch (error) {
    console.error('Error creating approval:', error)
    return NextResponse.json({ error: 'Failed to create approval' }, { status: 500 })
  }
}