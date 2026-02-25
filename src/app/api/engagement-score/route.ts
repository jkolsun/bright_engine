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

      // Process in chunks of 10 to avoid overwhelming DB connections
      const CHUNK_SIZE = 10
      const results: any[] = []
      for (let i = 0; i < leads.length; i += CHUNK_SIZE) {
        const chunk = leads.slice(i, i + CHUNK_SIZE)
        const scores = await Promise.allSettled(
          chunk.map(l => calculateEngagementScore(l.id))
        )
        for (const r of scores) {
          if (r.status === 'fulfilled') results.push(r.value)
        }
      }

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
