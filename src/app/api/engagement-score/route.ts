import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * Engagement Score Calculation
 * Score breakdown:
 * - Email opened: +2 points
 * - Preview viewed: +3 points
 * - CTA clicked: +5 points
 * - Call connected: +7 points
 * - Text responded: +4 points
 * 
 * Temperature scale:
 * 0-5: COLD (blue)
 * 6-15: WARM (amber)
 * 16+: HOT (red)
 */

const EVENT_SCORES: Record<string, number> = {
  'email_opened': 2,
  'preview_viewed': 3,
  'cta_clicked': 5,
  'call_connected': 7,
  'text_responded': 4,
}

interface EngagementScore {
  leadId: string
  score: number
  temperature: 'COLD' | 'WARM' | 'HOT'
  breakdown: Record<string, number>
}

function getTemperature(score: number): 'COLD' | 'WARM' | 'HOT' {
  if (score >= 16) return 'HOT'
  if (score >= 6) return 'WARM'
  return 'COLD'
}

async function calculateEngagementScore(leadId: string): Promise<EngagementScore> {
  // Fetch all events for this lead
  const events = await prisma.leadEvent.findMany({
    where: { leadId },
  })

  // Group events by type and count
  const breakdown: Record<string, number> = {}
  let totalScore = 0

  for (const event of events) {
    const eventType = event.eventType.toLowerCase()
    const points = EVENT_SCORES[eventType] || 0
    
    if (points > 0) {
      breakdown[eventType] = (breakdown[eventType] || 0) + points
      totalScore += points
    }
  }

  const score = totalScore
  const temperature = getTemperature(score)

  return {
    leadId,
    score,
    temperature,
    breakdown,
  }
}

// GET /api/engagement-score
// ?leadId=<id> - Get score for a specific lead
// ?all=true - Get scores for all leads
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const leadId = searchParams.get('leadId')
    const all = searchParams.get('all') === 'true'

    if (leadId) {
      // Single lead
      const score = await calculateEngagementScore(leadId)
      return NextResponse.json(score)
    }

    if (all) {
      // All leads
      const leads = await prisma.lead.findMany({
        select: { id: true },
      })

      const scores: EngagementScore[] = await Promise.all(
        leads.map(lead => calculateEngagementScore(lead.id))
      )

      return NextResponse.json({ scores })
    }

    // Default: return scoring rules
    return NextResponse.json({
      eventScores: EVENT_SCORES,
      temperatureScale: {
        COLD: '0-5 points (blue)',
        WARM: '6-15 points (amber)',
        HOT: '16+ points (red)',
      },
    })
  } catch (error) {
    console.error('Error calculating engagement score:', error)
    return NextResponse.json(
      { error: 'Failed to calculate engagement score' },
      { status: 500 }
    )
  }
}
