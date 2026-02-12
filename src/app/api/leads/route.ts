import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { addEnrichmentJob, addPersonalizationJob } from '@/worker/queue'
import { generatePreviewId, getTimezoneFromState } from '@/lib/utils'

// GET /api/leads - List leads with filters
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const status = searchParams.get('status')
  const source = searchParams.get('source')
  const priority = searchParams.get('priority')
  const assignedTo = searchParams.get('assignedTo')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  const where: any = {}
  if (status) where.status = status
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
    const data = await request.json()

    const lead = await prisma.lead.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        companyName: data.companyName,
        industry: data.industry,
        city: data.city,
        state: data.state,
        timezone: data.timezone || getTimezoneFromState(data.state),
        website: data.website,
        source: data.source || 'COLD_EMAIL',
        sourceDetail: data.sourceDetail,
        previewId: generatePreviewId(),
        previewUrl: `${process.env.BASE_URL}/preview/${generatePreviewId()}`,
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

    // Queue enrichment and personalization
    await addEnrichmentJob(lead.id)
    await addPersonalizationJob(lead.id)

    return NextResponse.json({ lead })
  } catch (error) {
    console.error('Error creating lead:', error)
    return NextResponse.json(
      { error: 'Failed to create lead' },
      { status: 500 }
    )
  }
}
