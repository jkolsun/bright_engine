import { NextRequest, NextResponse } from 'next/server'
import { calculateEngagementScore } from '@/lib/engagement-scoring'

export async function GET(request: NextRequest) {
  const leadId = request.nextUrl.searchParams.get('leadId')

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