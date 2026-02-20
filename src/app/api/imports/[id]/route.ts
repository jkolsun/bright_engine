import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/imports/[id]
 * Fetch import details + associated leads
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const activity = await prisma.clawdbotActivity.findUnique({
      where: { id },
    })

    if (!activity) {
      return NextResponse.json({ error: 'Import not found' }, { status: 404 })
    }

    const meta = (activity.metadata as any) || {}
    const leadIds: string[] = meta.leadIds || []

    let leads: any[] = []
    if (leadIds.length > 0) {
      leads = await prisma.lead.findMany({
        where: { id: { in: leadIds } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          companyName: true,
          email: true,
          phone: true,
          city: true,
          state: true,
          industry: true,
          website: true,
          status: true,
          enrichedRating: true,
          enrichedReviews: true,
          enrichedAddress: true,
          enrichedServices: true,
          previewUrl: true,
          personalization: true,
        },
        orderBy: { createdAt: 'asc' },
      })
    }

    return NextResponse.json({
      import: {
        id: activity.id,
        createdAt: activity.createdAt,
        description: activity.description,
        metadata: activity.metadata,
      },
      leads,
    })
  } catch (error) {
    console.error('Failed to fetch import details:', error)
    return NextResponse.json({ error: 'Failed to fetch import details' }, { status: 500 })
  }
}