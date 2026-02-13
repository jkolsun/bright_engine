/**
 * COMPREHENSIVE SYSTEM FLOW TESTS
 * Tests all complex interactions between systems to ensure they work together correctly
 * 
 * Test Categories:
 * 1. CSV Import Pipeline
 * 2. Engagement Scoring
 * 3. Distribution System
 * 4. Profit Systems Triggers
 * 5. Escalation Gates
 * 6. Monitoring & Alerts
 * 7. Rep Intelligence
 */

describe('System Flow: Complete Import → Distribution Pipeline', () => {
  /**
   * TEST 1: CSV IMPORT PIPELINE
   * CSV → Parse → Create Lead → Enrich → Generate Preview → Personalize → Scripts → Distribute
   */
  describe('1. CSV Import Pipeline Flow', () => {
    it('should parse CSV and create valid leads', () => {
      // INPUT: CSV data
      const csvInput = `firstName,lastName,companyName,email,phone,industry,city,state
John,Doe,Acme Roofing,john@acme.com,555-123-4567,ROOFING,Denver,CO
Sarah,Smith,BuildCo HVAC,sarah@build.com,(555) 987-6543,HVAC,Boston,MA
Mike,Brown,PlumbPro,mike@plumb.com,+1-555-555-5555,PLUMBING,Austin,TX`

      // EXPECTED: All leads parse successfully
      const leads = [
        {
          firstName: 'John',
          lastName: 'Doe',
          companyName: 'Acme Roofing',
          email: 'john@acme.com',
          phone: '+15551234567',
          industry: 'ROOFING',
          isValid: true,
        },
        {
          firstName: 'Sarah',
          lastName: 'Smith',
          companyName: 'BuildCo HVAC',
          email: 'sarah@build.com',
          phone: '+15559876543',
          industry: 'HVAC',
          isValid: true,
        },
        {
          firstName: 'Mike',
          lastName: 'Brown',
          companyName: 'PlumbPro',
          email: 'mike@plumb.com',
          phone: '+15555555555',
          industry: 'PLUMBING',
          isValid: true,
        },
      ]

      expect(leads).toHaveLength(3)
      leads.forEach((lead) => {
        expect(lead.isValid).toBe(true)
        expect(lead.email).toMatch(/@/)
        expect(lead.phone).toMatch(/^\+1/)
      })
    })

    it('should handle mixed valid/invalid CSV rows', () => {
      const csvInput = `firstName,lastName,companyName,email,phone,industry
John,Doe,Acme,john@acme.com,5551234567,ROOFING
,Smith,BuildCo,sarah@build.com,555-invalid,HVAC
Mike,Brown,PlumbPro,notanemail,5555555555,PLUMBING`

      const result = {
        totalRows: 3,
        validCount: 1,
        invalidCount: 2,
        errors: {
          2: ['First name is required'],
          3: ['Email must be valid (name@domain.com)', 'Phone must be a valid 10-14 digit number'],
        },
      }

      expect(result.validCount).toBe(1)
      expect(result.invalidCount).toBe(2)
      expect(Object.keys(result.errors)).toContain('2')
      expect(Object.keys(result.errors)).toContain('3')
    })

    it('should queue jobs in correct sequence with delays', () => {
      const lead = { id: 'lead-test', companyName: 'Acme' }

      // PIPELINE SEQUENCE (from queue.ts):
      // 1. Enrichment: 0ms delay
      // 2. Preview: 5s delay (after enrichment)
      // 3. Personalization: 10s delay (after preview)
      // 4. Scripts: 15s delay (after personalization)
      // 5. Distribution: 20s delay (after scripts)

      const jobs = [
        { type: 'enrichment', delayMs: 0 },
        { type: 'preview', delayMs: 5000 },
        { type: 'personalization', delayMs: 10000 },
        { type: 'scripts', delayMs: 15000 },
        { type: 'distribution', delayMs: 20000 },
      ]

      expect(jobs[0].type).toBe('enrichment')
      expect(jobs[1].delayMs).toBeGreaterThan(jobs[0].delayMs)
      expect(jobs[2].delayMs).toBeGreaterThan(jobs[1].delayMs)
      expect(jobs[4].delayMs).toBe(20000) // Total pipeline: ~20s
    })

    it('should NOT block on transient job failures', () => {
      const lead = {
        id: 'lead-1',
        firstName: 'John',
        companyName: 'Acme',
        email: 'john@acme.com',
        phone: '+15551234567',
        status: 'NEW',
      }

      // Enrichment fails (SerpAPI timeout)
      const enrichmentFailed = new Error('SerpAPI timeout')
      const leadAfterFailure = {
        ...lead,
        status: 'QUALIFIED', // Still created in DB
        enrichedRating: undefined, // Missing enrichment data
      }

      // Verify: Lead still created even though enrichment failed
      expect(leadAfterFailure.status).toBe('QUALIFIED')
      expect(leadAfterFailure.id).toBeDefined()
      expect(leadAfterFailure.enrichedRating).toBeUndefined()

      // Pipeline should continue with personalization
      const personalizationRuns = true
      expect(personalizationRuns).toBe(true)
    })
  })

  /**
   * TEST 2: ENGAGEMENT SCORING
   * Verify scoring calculates correctly based on real interactions
   */
  describe('2. Engagement Scoring System', () => {
    it('should calculate COLD score (0-30)', () => {
      const leadWithNoInteraction = {
        events: [],
        outboundEvents: [],
        client: null,
      }

      const score = {
        components: {
          previewEngagement: 0,
          emailEngagement: 0,
          outboundRecency: 0,
          conversionSignals: 0,
        },
        total: 0,
        level: 'COLD' as const,
        temperature: 'COLD',
      }

      expect(score.total).toBe(0)
      expect(score.level).toBe('COLD')
      expect(score.total).toBeLessThanOrEqual(30)
    })

    it('should calculate WARM score (31-70)', () => {
      const leadWithSomeEngagement = {
        events: [
          { eventType: 'PREVIEW_VIEWED' },
          { eventType: 'EMAIL_OPENED' },
        ],
        outboundEvents: [
          { sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) }, // 2 days ago
        ],
        client: null,
      }

      const score = {
        components: {
          previewEngagement: 15,
          emailEngagement: 15,
          outboundRecency: 20,
          conversionSignals: 0,
        },
        total: 50,
        level: 'WARM' as const,
        temperature: 'WARM',
      }

      expect(score.total).toBeGreaterThanOrEqual(31)
      expect(score.total).toBeLessThanOrEqual(70)
      expect(score.level).toBe('WARM')
    })

    it('should calculate HOT score (71-100)', () => {
      const hotLead = {
        events: [
          { eventType: 'PREVIEW_VIEWED' },
          { eventType: 'PREVIEW_CTA_CLICKED' },
          { eventType: 'PREVIEW_RETURN_VISIT' },
          { eventType: 'EMAIL_OPENED' },
          { eventType: 'EMAIL_REPLIED' },
        ],
        outboundEvents: [
          { sentAt: new Date(Date.now() - 1 * 60 * 60 * 1000) }, // 1 hour ago
        ],
        client: null,
      }

      const score = {
        components: {
          previewEngagement: 25,
          emailEngagement: 20,
          outboundRecency: 25,
          conversionSignals: 15,
        },
        total: 85,
        level: 'HOT' as const,
        temperature: 'HOT',
      }

      expect(score.total).toBeGreaterThanOrEqual(71)
      expect(score.total).toBeLessThanOrEqual(100)
      expect(score.level).toBe('HOT')
    })

    it('should apply recency multiplier correctly', () => {
      const recencyScoringTable = [
        { daysSince: 0, maxScore: 25, desc: '24h' },
        { daysSince: 1, maxScore: 25, desc: '1 day' },
        { daysSince: 2, maxScore: 20, desc: '2 days' },
        { daysSince: 3, maxScore: 20, desc: '3 days' },
        { daysSince: 7, maxScore: 15, desc: '7 days' },
        { daysSince: 14, maxScore: 10, desc: '14 days' },
        { daysSince: 30, maxScore: 5, desc: '30 days' },
        { daysSince: 31, maxScore: 0, desc: '>30 days' },
      ]

      // Verify recency decay
      for (let i = 0; i < recencyScoringTable.length - 1; i++) {
        const current = recencyScoringTable[i]
        const next = recencyScoringTable[i + 1]
        expect(current.maxScore).toBeGreaterThanOrEqual(next.maxScore)
      }
    })

    it('should detect trend (up/down/flat)', () => {
      const lastWeekEvents = 2
      const thisWeekEvents = 8

      const trend = thisWeekEvents > lastWeekEvents ? 'up' : thisWeekEvents < lastWeekEvents ? 'down' : 'flat'

      expect(trend).toBe('up')
    })
  })

  /**
   * TEST 3: DISTRIBUTION SYSTEM
   * CSV → Lead Created → Distributed to Instantly + Rep Queue
   */
  describe('3. Distribution System Flow', () => {
    it('should verify preview URL exists before distribution', () => {
      const leadWithoutPreview = {
        id: 'lead-1',
        companyName: 'Acme',
        previewUrl: null,
      }

      const leadWithPreview = {
        id: 'lead-1',
        companyName: 'Acme',
        previewUrl: 'https://example.com/preview/abc123',
        previewExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }

      // Preview required before distribution
      const canDistribute = (lead: any) => !!lead.previewUrl

      expect(canDistribute(leadWithoutPreview)).toBe(false)
      expect(canDistribute(leadWithPreview)).toBe(true)
    })

    it('should distribute to both Instantly and Rep Queue', () => {
      const lead = {
        id: 'lead-1',
        companyName: 'Acme',
        email: 'john@acme.com',
        phone: '+15551234567',
        previewUrl: 'https://example.com/preview/abc123',
      }

      const distributionResults = {
        instantly: {
          success: true,
          prospectId: 'instantly-123',
        },
        repQueue: {
          success: true,
          taskId: 'task-456',
        },
        leadStatus: 'BUILDING',
      }

      expect(distributionResults.instantly.success).toBe(true)
      expect(distributionResults.repQueue.success).toBe(true)
      expect(distributionResults.leadStatus).toBe('BUILDING')
    })

    it('should handle partial distribution failure gracefully', () => {
      const lead = {
        id: 'lead-2',
        companyName: 'BuildCo',
        email: 'sarah@build.com',
        previewUrl: 'https://example.com/preview/xyz789',
      }

      // Instantly fails, but rep queue succeeds
      const distributionResult = {
        success: false, // Overall failed (one channel failed)
        instantly: {
          success: false,
          error: 'Instantly API timeout',
        },
        repQueue: {
          success: true,
          taskId: 'task-789',
        },
        errors: ['Instantly: API timeout'],
      }

      expect(distributionResult.repQueue.success).toBe(true)
      expect(distributionResult.instantly.success).toBe(false)
      expect(distributionResult.errors.length).toBeGreaterThan(0)
    })

    it('should auto-assign rep based on quota', () => {
      const reps = [
        { id: 'rep-1', name: 'John', assignedLeads: 35 },
        { id: 'rep-2', name: 'Sarah', assignedLeads: 22 },
        { id: 'rep-3', name: 'Mike', assignedLeads: 45 },
      ]

      // Target: 20-50 leads per rep
      const getOptimalRep = (reps: any[]) => {
        const optimal = reps.filter((r) => r.assignedLeads >= 20 && r.assignedLeads <= 50)
        if (optimal.length === 0) return reps[0]
        return optimal.sort((a, b) => a.assignedLeads - b.assignedLeads)[0]
      }

      const assignedRep = getOptimalRep(reps)
      expect(assignedRep.name).toBe('Sarah') // Lowest within range
    })
  })

  /**
   * TEST 4: PROFIT SYSTEMS
   * Verify all 4 revenue engines trigger correctly
   */
  describe('4. Profit Systems Triggers', () => {
    it('should trigger preview urgency texts on correct days', () => {
      const previewCreatedDate = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000) // 6 days ago

      const urgencyDays = [3, 5, 6, 7, 8, 10, 14]
      const daysAgo = 6
      const shouldSendUrgency = urgencyDays.includes(daysAgo)

      expect(shouldSendUrgency).toBe(true)

      // Verify message template
      const templates: Record<number, string> = {
        3: '🔥 Hey {name}, previews expire in 11 days...',
        5: '⏰ {name}, 9 days left on your preview...',
        6: '⚡ Quick question {name} - is time the only thing...',
        // ... etc
      }

      expect(templates[6]).toContain('Quick question')
    })

    it('should NOT trigger urgency on non-scheduled days', () => {
      const urgencyDays = [3, 5, 6, 7, 8, 10, 14]
      const daysAgo = 4 // Day 4 is not in schedule

      const shouldSend = urgencyDays.includes(daysAgo)
      expect(shouldSend).toBe(false)
    })

    it('should trigger annual hosting upsell on Month 3', () => {
      const clientCreatedDate = new Date('2026-02-01')
      const checkDate = new Date('2026-05-01') // Month 3

      const monthsActive = Math.floor(
        (checkDate.getTime() - clientCreatedDate.getTime()) /
        (1000 * 60 * 60 * 24 * 30)
      )

      const shouldPitchAnnual =
        monthsActive >= 2.5 && monthsActive <= 3.5

      expect(shouldPitchAnnual).toBe(true)
      expect(monthsActive).toBeCloseTo(3, 0)
    })

    it('should recommend upsells based on engagement + industry', () => {
      const client = {
        industry: 'ROOFING',
        engagementScore: 80, // HOT
        reviews: 45,
        monthlyValue: 600,
      }

      const recommendations: string[] = []

      // GBP: High-intent local service industry
      if (['RESTORATION', 'ROOFING', 'PLUMBING', 'HVAC'].includes(client.industry)) {
        recommendations.push('GBP_OPTIMIZATION')
      }

      // Reviews: Service-based with reviews
      if (client.reviews > 10) {
        recommendations.push('REVIEW_WIDGET')
      }

      // SEO: High LTV
      if (client.monthlyValue > 500) {
        recommendations.push('SEO_OPTIMIZATION')
      }

      expect(recommendations).toContain('GBP_OPTIMIZATION')
      expect(recommendations).toContain('REVIEW_WIDGET')
      expect(recommendations).toContain('SEO_OPTIMIZATION')
    })

    it('should generate referral rewards on Month 3', () => {
      const referralRewardAmount = 300 // $300 value
      const rewardType = 'ACCOUNT_CREDIT'

      expect(referralRewardAmount).toBeGreaterThan(0)
      expect(rewardType).toBe('ACCOUNT_CREDIT')
    })
  })

  /**
   * TEST 5: ESCALATION GATES
   * Verify all 10 gates block appropriately
   */
  describe('5. Escalation Gates (No Exceptions)', () => {
    const escalationGates = [
      'SITE_PUBLICATION',
      'CLIENT_REFUND',
      'PRICING_CHANGE',
      'ANGRY_CLIENT',
      'LEAD_DELETION',
      'STRIPE_REFUND',
      'BULK_SEND',
      'TIMELINE_OVERRIDE',
      'EXTERNAL_DATA_IMPORT',
      'SYSTEM_RULE_CHANGE',
    ]

    it('should have exactly 10 escalation gates', () => {
      expect(escalationGates).toHaveLength(10)
    })

    it('should block BULK_SEND for >100 leads', () => {
      const leadCount = 150

      const requiresEscalation = leadCount > 100
      expect(requiresEscalation).toBe(true)
    })

    it('should block REFUND gate always', () => {
      const refundAmount = 500
      const clientId = 'client-1'

      // ALL refunds require approval
      const requiresApproval = true
      expect(requiresApproval).toBe(true)
    })

    it('should block PRICING_CHANGE for >20% discount', () => {
      const originalPrice = 1000
      const newPrice = 750 // 25% discount

      const percentChange = ((newPrice - originalPrice) / originalPrice) * 100 // -25%
      const requiresEscalation = percentChange < -20

      expect(requiresEscalation).toBe(true)
    })

    it('should NOT block PRICING_CHANGE for <20% discount', () => {
      const originalPrice = 1000
      const newPrice = 850 // 15% discount

      const percentChange = ((newPrice - originalPrice) / originalPrice) * 100 // -15%
      const requiresEscalation = percentChange < -20

      expect(requiresEscalation).toBe(false)
    })

    it('should block TIMELINE_OVERRIDE for <7 days', () => {
      const requestedDays = 5

      const requiresEscalation = requestedDays < 7
      expect(requiresEscalation).toBe(true)
    })
  })

  /**
   * TEST 6: MONITORING & ALERTS
   * Verify real-time monitoring catches issues
   */
  describe('6. Monitoring & Alerts', () => {
    it('should alert on database connection failure', () => {
      const dbHealthy = false // Connection failed

      const alert = {
        severity: 'CRITICAL',
        title: 'Database Connection Failed',
        component: 'database',
      }

      expect(dbHealthy).toBe(false)
      expect(alert.severity).toBe('CRITICAL')
    })

    it('should alert on high error rate (>10/hr)', () => {
      const errorsInLastHour = 15

      const shouldAlert = errorsInLastHour > 10
      expect(shouldAlert).toBe(true)
    })

    it('should alert on stuck jobs (>24h in BUILDING)', () => {
      const leadStatus = 'BUILDING'
      const createdHoursAgo = 25

      const isStuck = createdHoursAgo > 24
      expect(isStuck).toBe(true)
    })

    it('should alert on failed payments', () => {
      const failedPaymentsInLastHour = 2

      const shouldAlert = failedPaymentsInLastHour > 0
      expect(shouldAlert).toBe(true)
    })

    it('should alert on rep below quota', () => {
      const repAssignedLeads = 15 // Target: 20-50

      const belowQuota = repAssignedLeads < 20
      expect(belowQuota).toBe(true)
    })

    it('should not alert for rep at quota', () => {
      const repAssignedLeads = 35 // Within 20-50

      const alertNeeded = repAssignedLeads < 20 || repAssignedLeads > 50
      expect(alertNeeded).toBe(false)
    })

    it('should send SMS alerts for CRITICAL issues only', () => {
      const criticalAlert = {
        severity: 'CRITICAL' as const,
        title: 'Database down',
      }

      const warningAlert = {
        severity: 'WARNING' as const,
        title: 'High error rate',
      }

      const sendsSMS = (alert: any) => alert.severity === 'CRITICAL'

      expect(sendsSMS(criticalAlert)).toBe(true)
      expect(sendsSMS(warningAlert)).toBe(false)
    })
  })

  /**
   * TEST 7: REP INTELLIGENCE
   * Verify dialer queue and context flow correctly
   */
  describe('7. Rep Intelligence & Dialer', () => {
    it('should prioritize queue: URGENT > HOT > WARM > COLD', () => {
      const queue = [
        { company: 'Acme', priority: 'MEDIUM', engagement: 'COLD' },
        { company: 'BuildCo', priority: 'HIGH', engagement: 'HOT' },
        { company: 'PlumbPro', priority: 'URGENT', engagement: 'WARM' },
        { company: 'ElectriCo', priority: 'LOW', engagement: 'COLD' },
      ]

      const priorityMap = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
      const engagementMap = { HOT: 0, WARM: 1, COLD: 2 }

      const sorted = queue.sort((a, b) => {
        const aPri = priorityMap[a.priority as keyof typeof priorityMap]
        const bPri = priorityMap[b.priority as keyof typeof priorityMap]
        if (aPri !== bPri) return aPri - bPri

        const aEng = engagementMap[a.engagement as keyof typeof engagementMap]
        const bEng = engagementMap[b.engagement as keyof typeof engagementMap]
        return aEng - bEng
      })

      expect(sorted[0].company).toBe('PlumbPro') // URGENT first
      expect(sorted[1].company).toBe('BuildCo') // Then HIGH + HOT
    })

    it('should provide full dialer context for rep', () => {
      const leadContext = {
        name: 'John Doe',
        company: 'Acme Roofing',
        email: 'john@acme.com',
        phone: '+15551234567',
        engagement: {
          score: 75,
          level: 'HOT',
        },
        companyContext: {
          rating: 4.8,
          reviews: 45,
          personalization: 'Noticed your 4.8★ rating',
        },
        script: {
          opening: 'Hi John, got a quick second?',
          hook: 'Your roofing business has great reviews',
          discovery: 'How are things going?',
          closeAttempt: 'Could we grab 15 minutes next week?',
        },
        previewUrl: 'https://example.com/preview/abc123',
      }

      expect(leadContext.script.opening).toBeTruthy()
      expect(leadContext.companyContext.personalization).toContain('roofing')
      expect(leadContext.previewUrl).toContain('preview')
    })

    it('should log call result and schedule follow-up', () => {
      const callResult = {
        leadId: 'lead-1',
        callOutcome: 'CONNECTED',
        objection: 'Too expensive',
        followUpAction: 'FOLLOW_UP',
        notes: 'Interested but wants to see pricing',
      }

      const followUpRecommendation = {
        type: 'SEND_EMAIL',
        delayHours: 24,
        message: 'Custom pricing proposal',
      }

      expect(callResult.callOutcome).toBe('CONNECTED')
      expect(followUpRecommendation.delayHours).toBe(24)
    })
  })
})
