import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { addEnrichmentJob } from '@/worker/queue'
import { generatePreviewId, getTimezoneFromState } from '@/lib/utils'
import { verifySession } from '@/lib/session'

// GET /api/leads - List leads with filters
export async function GET(request: NextRequest) {
  try {
    // Authentication check - admin or rep access
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
  const status = searchParams.get('status')
  const source = searchParams.get('source')
  const priority = searchParams.get('priority')
  const assignedTo = searchParams.get('assignedTo')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  const where: any = {}
  
  // Default: hide CLOSED_LOST (soft deleted) leads unless explicitly requested
  if (status) {
    if (status.includes(',')) {
      where.status = { in: status.split(',') }
    } else {
      where.status = status
    }
  } else {
    where.NOT = { status: 'CLOSED_LOST' }
  }
  
  if (source) where.source = source
  if (priority) where.priority = priority
  if (assignedTo) where.assignedToId = assignedTo

  try {
    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: {
          assignedTo: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.lead.count({ where })
    ])

    return NextResponse.json({ leads, total, limit, offset })
  } catch (error) {
    console.error('Error fetching leads:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leads' },
      { status: 500 }
    )
  }
}

// POST /api/leads - Create single lead
export async function POST(request: NextRequest) {
  try {
    // Authentication check - admin or rep access
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const data = await request.json()

    const previewId = generatePreviewId()

    const lead = await prisma.lead.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName || undefined,
        email: data.email || undefined,
        phone: data.phone,
        companyName: data.companyName,
        industry: (data.industry || 'GENERAL_CONTRACTING') as any,
        city: data.city || undefined,
        state: data.state || undefined,
        timezone: data.timezone || getTimezoneFromState(data.state) || 'America/New_York',
        website: data.website || undefined,
        source: (data.source || 'COLD_EMAIL') as any,
        sourceDetail: data.sourceDetail || undefined,
        previewId: previewId,
        previewUrl: `${process.env.BASE_URL}/preview/${previewId}`,
        previewExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      }
    })

    // Log event
    await prisma.leadEvent.create({
      data: {
        leadId: lead.id,
        eventType: 'STAGE_CHANGE',
        toStage: 'NEW',
        actor: 'system',
      }
    })

    // Queue enrichment (non-blocking) - pipeline chaining handles the rest
    try {
      await addEnrichmentJob({
        leadId: lead.id,
        companyName: lead.companyName,
        city: lead.city || undefined,
        state: lead.state || undefined,
      })
      // Pipeline chaining in worker/index.ts handles: enrichment → preview → personalization → scripts → distribution
    } catch (queueError) {
      console.warn('Queue job failed (non-blocking):', queueError)
      // Don't fail lead creation if queue jobs fail
    }

    return NextResponse.json({ lead })
  } catch (error) {
    console.error('Error creating lead:', error)
    return NextResponse.json(
      { error: 'Failed to create lead' },
      { status: 500 }
    )
  }
}
