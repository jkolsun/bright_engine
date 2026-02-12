import { NextRequest, NextResponse } from 'next/server'
import {
  calculateEngagementScore,
  getEngagementStats,
  recalculateAllEngagementScores,
} from '@/lib/engagement-scoring'

/**
 * Engagement Score API
 * 
 * Improved scoring engine with better weighting:
 * - Preview Engagement: max 25 points
 * - Email/Response: max 25 points  
 * - Outbound Recency: max 25 points (fresh outreach = more points)
 * - Conversion Signals: max 25 points
 * 
 * Temperature scale:
 * COLD: 0-30 points
 * WARM: 31-70 points
 * HOT: 71-100 points
 */

// GET /api/engagement-score
// ?leadId=<id> - Get score for specific lead
// ?all=true - Get scores for all leads
// ?stats=true - Get aggregate stats
// ?recalculate=true - Recalculate all (heavy operation)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const leadId = searchParams.get('leadId')
    const all = searchParams.get('all') === 'true'
    const stats = searchParams.get('stats') === 'true'
    const recalculate = searchParams.get('recalculate') === 'true'

    if (recalculate) {
      // Admin operation: recalculate all scores
      const scores = await recalculateAllEngagementScores()
      return NextResponse.json({
        message: 'Recalculated scores',
        count: scores.length,
        scores,
      })
    }

    if (leadId) {
      // Single lead
      const score = await calculateEngagementScore(leadId)
      return NextResponse.json(score)
    }

    if (stats) {
      // Aggregate statistics
      const stats_data = await getEngagementStats()
      return NextResponse.json(stats_data)
    }

    if (all) {
      // All leads (careful: can be heavy)
      const allScores = await recalculateAllEngagementScores()
      return NextResponse.json({
        count: allScores.length,
        scores: allScores,
      })
    }

    // Default: return scoring rules
    return NextResponse.json({
      scoringRules: {
        previewEngagement: 'max 25 points (views, clicks, returns)',
        emailResponse: 'max 25 points (opens, replies)',
        outboundRecency: 'max 25 points (1 day=25, decays over time)',
        conversionSignals: 'max 25 points (replies, payments)',
      },
      temperatureScale: {
        COLD: '0-30 points',
        WARM: '31-70 points',
        HOT: '71-100 points',
      },
      endpoints: {
        single: '?leadId=<id>',
        all: '?all=true',
        stats: '?stats=true',
        recalculate: '?recalculate=true (admin)',
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
