import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/lead-events - Get lead events (audit log)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const limit = parseInt(searchParams.get('limit') || '50')
  const leadId = searchParams.get('leadId')

  try {
    const where: any = {}
    if (leadId) where.leadId = leadId

    const events = await prisma.leadEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        lead: {
          select: { id: true, firstName: true, lastName: true, companyName: true }
        }
      }
    })

    return NextResponse.json({ events })
  } catch (error) {
    console.error('Error fetching lead events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lead events' },
      { status: 500 }
    )
  }
}
