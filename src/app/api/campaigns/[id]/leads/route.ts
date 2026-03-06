import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

// GET /api/campaigns/[id]/leads — Paginated leads with funnel stage filter
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id: campaignId } = await params
    const searchParams = request.nextUrl.searchParams
    const stage = searchParams.get('stage')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))
    const skip = (page - 1) * limit

    // Verify campaign exists
    const campaign = await prisma.smsCampaign.findUnique({ where: { id: campaignId } })
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Build where clause
    const where: Record<string, unknown> = { campaignId }
    if (stage) {
      where.funnelStage = stage
    }

    const [campaignLeads, total] = await Promise.all([
      prisma.smsCampaignLead.findMany({
        where,
        include: {
          lead: {
            select: {
              id: true,
              companyName: true,
              firstName: true,
              lastName: true,
              phone: true,
              city: true,
              state: true,
              industry: true,
              previewUrl: true,
              email: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      prisma.smsCampaignLead.count({ where }),
    ])

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      leads: campaignLeads,
      total,
      page,
      totalPages,
    })
  } catch (error) {
    console.error('Error fetching campaign leads:', error)
    return NextResponse.json(
      { error: 'Failed to fetch campaign leads', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
