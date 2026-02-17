import { NextRequest, NextResponse } from 'next/server'
import { calculateEngagementScore } from '@/lib/engagement-scoring'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const leadId = request.nextUrl.searchParams.get('leadId')
  const all = request.nextUrl.searchParams.get('all')

  // Bulk mode: return scores for all active leads
  if (all === 'true') {
    try {
      const leads = await prisma.lead.findMany({
        where: { NOT: { status: 'CLOSED_LOST' } },
        select: { id: true },
        take: 200,
        orderBy: { updatedAt: 'desc' },
      })

      const scores = await Promise.allSettled(
        leads.map(l => calculateEngagementScore(l.id))
      )

      const results = scores
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
        .map(r => r.value)

      return NextResponse.json({ scores: results })
    } catch (error) {
      console.error('Bulk engagement score failed:', error)
      return NextResponse.json({ error: 'Failed to calculate scores' }, { status: 500 })
    }
  }

  if (!leadId) {
    return NextResponse.json({ error: 'Missing leadId parameter' }, { status: 400 })
  }

  try {
    const engagementScore = await calculateEngagementScore(leadId)
    return NextResponse.json(engagementScore)
  } catch (error) {
    console.error('Engagement score calculation failed:', error)
    return NextResponse.json({ error: 'Failed to calculate engagement score' }, { status: 500 })
  }
}
