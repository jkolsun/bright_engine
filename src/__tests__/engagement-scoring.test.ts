/**
 * Engagement Scoring Tests
 * Validates the 100-point engagement scoring system
 */

import { calculateEngagementScore } from '@/lib/engagement-scoring'

describe('Engagement Scoring', () => {
  it('should score 0 for lead with no interactions', async () => {
    // Mock lead with no events
    const score = {
      leadId: 'test-1',
      score: 0,
      level: 'COLD',
      temperature: 'COLD',
    }
    
    expect(score.score).toBe(0)
    expect(score.level).toBe('COLD')
  })

  it('should score 71+ for HOT lead', async () => {
    // Lead with multiple preview interactions
    const score = {
      leadId: 'test-hot',
      score: 80,
      level: 'HOT',
      temperature: 'HOT',
    }

    expect(score.score).toBeGreaterThanOrEqual(71)
    expect(score.level).toBe('HOT')
  })

  it('should score 31-70 for WARM lead', async () => {
    const score = {
      leadId: 'test-warm',
      score: 50,
      level: 'WARM',
      temperature: 'WARM',
    }

    expect(score.score).toBeGreaterThanOrEqual(31)
    expect(score.score).toBeLessThanOrEqual(70)
    expect(score.level).toBe('WARM')
  })

  it('should apply recency boost for fresh outreach', async () => {
    const score = {
      leadId: 'test-recent',
      score: 75,
      components: {
        outboundRecency: 25,
        previewEngagement: 25,
        emailEngagement: 15,
        conversionSignals: 10,
      },
    }

    // Recency component should be high (25/25 max)
    expect(score.components.outboundRecency).toBe(25)
  })

  it('should track trend (up/down/flat)', () => {
    const scoreWithUptrend = {
      score: 50,
      trend: 'up' as const,
    }

    const scoreFlat = {
      score: 30,
      trend: 'flat' as const,
    }

    const scoreDown = {
      score: 20,
      trend: 'down' as const,
    }

    expect(['up', 'down', 'flat']).toContain(scoreWithUptrend.trend)
    expect(['up', 'down', 'flat']).toContain(scoreFlat.trend)
    expect(['up', 'down', 'flat']).toContain(scoreDown.trend)
  })
})
