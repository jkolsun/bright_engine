import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/approvals - List approvals with optional status filter
 * Query params: status (PENDING | APPROVED | DENIED | all), limit, offset
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
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where = status === 'all' ? {} : { status }

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

    return NextResponse.json({ approvals, total, pendingCount })
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
