import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generatePreviewId, getTimezoneFromState } from '@/lib/utils'
import { addEnrichmentJob, addPersonalizationJob } from '@/worker/queue'

// GET /api/clawdbot/leads - List leads for Clawdbot
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const status = searchParams.get('status')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  try {
    const where: any = {}
    if (status) where.status = status

    const leads = await prisma.lead.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        events: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    })

    return NextResponse.json({ 
      leads: leads.map(lead => ({
        id: lead.id,
        companyName: lead.companyName,
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        industry: lead.industry,
        city: lead.city,
        state: lead.state,
        status: lead.status,
        priority: lead.priority,
        previewUrl: lead.previewUrl,
        assignedTo: lead.assignedTo,
        lastActivity: lead.events[0]?.createdAt || lead.createdAt,
        createdAt: lead.createdAt
      }))
    })
  } catch (error) {
    console.error('Clawdbot leads fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
  }
}

// POST /api/clawdbot/leads - Create lead via Clawdbot
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    const previewId = generatePreviewId()
    
    const lead = await prisma.lead.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        companyName: data.companyName,
        industry: data.industry || 'GENERAL_CONTRACTING',
        city: data.city,
        state: data.state,
        timezone: data.timezone || getTimezoneFromState(data.state),
        website: data.website,
        source: 'COLD_EMAIL', // Use existing enum value
        previewId,
        previewUrl: `${process.env.BASE_URL || process.env.NEXT_PUBLIC_BASE_URL}/preview/${previewId}`,
        previewExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    })

    // Log creation event
    await prisma.leadEvent.create({
      data: {
        leadId: lead.id,
        eventType: 'STAGE_CHANGE', // Use existing enum value
        toStage: 'NEW',
        actor: 'clawdbot'
      }
    })

    // Queue enrichment (non-blocking)
    try {
      await addEnrichmentJob({
        leadId: lead.id,
        companyName: lead.companyName,
        city: lead.city || undefined,
        state: lead.state || undefined
      })
      await addPersonalizationJob({ leadId: lead.id })
    } catch (queueError) {
      console.warn('Queue job failed (non-blocking):', queueError)
    }

    return NextResponse.json({ 
      lead: {
        id: lead.id,
        previewUrl: lead.previewUrl,
        previewId: lead.previewId,
        status: lead.status
      }
    })
  } catch (error) {
    console.error('Clawdbot lead creation error:', error)
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 })
  }
}

// PUT /api/clawdbot/leads/[id] - Update lead status/priority
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json()
    const leadId = data.leadId

    if (!leadId) {
      return NextResponse.json({ error: 'Lead ID required' }, { status: 400 })
    }

    const updateData: any = {}
    if (data.status) updateData.status = data.status
    if (data.priority) updateData.priority = data.priority
    if (data.notes) updateData.notes = data.notes

    const lead = await prisma.lead.update({
      where: { id: leadId },
      data: updateData
    })

    // Log update event
    if (data.status) {
      await prisma.leadEvent.create({
        data: {
          leadId: lead.id,
          eventType: 'STAGE_CHANGE',
          toStage: data.status,
          actor: 'clawdbot'
        }
      })
    }

    return NextResponse.json({ lead: { id: lead.id, status: lead.status, priority: lead.priority } })
  } catch (error) {
    console.error('Clawdbot lead update error:', error)
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 })
  }
}