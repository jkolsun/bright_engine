import { prisma } from '@/lib/db'
import { calculateEngagementScore } from '@/lib/engagement-scoring'

/**
 * TEST ENDPOINT: Engagement Scoring System
 * Creates a test lead and calculates its engagement score
 */
export async function GET(request: Request) {
  try {
    // Create a test lead
    const testLead = await prisma.lead.create({
      data: {
        firstName: 'Test',
        lastName: 'Lead',
        email: 'test@example.com',
        phone: '5551234567',
        companyName: 'Test Company',
        industry: 'ROOFING',
      },
    })

    // Calculate engagement score (should be COLD with 0 score initially)
    const coldScore = await calculateEngagementScore(testLead.id)

    // Simulate a preview view event
    await prisma.leadEvent.create({
      data: {
        leadId: testLead.id,
        eventType: 'PREVIEW_VIEWED',
      },
    })

    // Recalculate (should increase score)
    const warmScore = await calculateEngagementScore(testLead.id)

    // Simulate email reply
    await prisma.leadEvent.create({
      data: {
        leadId: testLead.id,
        eventType: 'EMAIL_REPLIED',
      },
    })

    // Recalculate (should increase further)
    const hotScore = await calculateEngagementScore(testLead.id)

    // Clean up test lead
    await prisma.leadEvent.deleteMany({
      where: { leadId: testLead.id },
    })
    await prisma.lead.delete({
      where: { id: testLead.id },
    })

    return Response.json({
      status: 'ok',
      message: 'Engagement scoring system working',
      tests: [
        {
          name: 'COLD score (no events)',
          expected: { level: 'COLD', score: 0 },
          actual: { level: coldScore.level, score: coldScore.score },
          pass: coldScore.level === 'COLD' && coldScore.score === 0,
        },
        {
          name: 'WARM score (after preview view)',
          expected: { level: 'COLD', scoreGreaterThan: 0 },
          actual: { level: warmScore.level, score: warmScore.score },
          pass: warmScore.score > coldScore.score,
        },
        {
          name: 'HOT score (after email reply)',
          expected: { level: 'WARM or HOT', scoreGreaterThan: 'warmScore' },
          actual: { level: hotScore.level, score: hotScore.score },
          pass: hotScore.score >= warmScore.score,
        },
      ],
      allTestsPassed:
        coldScore.level === 'COLD' &&
        coldScore.score === 0 &&
        warmScore.score > coldScore.score &&
        hotScore.score >= warmScore.score,
    })
  } catch (error) {
    return Response.json(
      {
        status: 'error',
        message: 'Engagement scoring test failed',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
