import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/preview/[id] - Get preview data
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const lead = await prisma.lead.findUnique({
      where: { previewId: params.id },
    })

    if (!lead) {
      return NextResponse.json(
        { error: 'Preview not found' },
        { status: 404 }
      )
    }

    // Check if expired
    if (lead.previewExpiresAt && new Date() > lead.previewExpiresAt) {
      return NextResponse.json(
        { error: 'Preview expired', expired: true },
        { status: 410 }
      )
    }

    // Log preview view
    await prisma.leadEvent.create({
      data: {
        leadId: lead.id,
        eventType: 'PREVIEW_VIEWED',
        actor: 'client',
      }
    })

    // Update priority to HOT if not already
    if (lead.priority !== 'HOT') {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { priority: 'HOT' }
      })
    }

    return NextResponse.json({ lead })
  } catch (error) {
    console.error('Error fetching preview:', error)
    return NextResponse.json(
      { error: 'Failed to fetch preview' },
      { status: 500 }
    )
  }
}
