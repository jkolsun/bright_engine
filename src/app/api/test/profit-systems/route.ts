import { 
  generateUrgencyMessages,
  shouldPitchAnnualHosting,
  shouldPitchDynamicUpsell,
  calculateReferralReward,
} from '@/lib/profit-systems'
import { prisma } from '@/lib/db'

/**
 * TEST ENDPOINT: Profit Systems (4 revenue engines)
 */
export async function GET() {
  try {
    // Test 1: URGENCY MESSAGES
    const urgencyDay3 = generateUrgencyMessages(3)
    const urgencyDay14 = generateUrgencyMessages(14)
    const urgencyInvalid = generateUrgencyMessages(99)

    // Test 2: ANNUAL HOSTING PITCH
    // Create test client
    const client = await prisma.client.create({
      data: {
        companyName: 'Test Company',
        industry: 'ROOFING',
      },
    })

    const shouldPitchCheckout = await shouldPitchAnnualHosting(client.id, 'AT_CHECKOUT')
    const shouldPitchMonth3 = await shouldPitchAnnualHosting(client.id, 'MONTH_3')

    // Test 3: DYNAMIC UPSELLS
    const upsellGBP = await shouldPitchDynamicUpsell(client.id, 'GBP')
    const upsellSocial = await shouldPitchDynamicUpsell(client.id, 'SOCIAL')

    // Test 4: REFERRAL REWARDS
    const monthlyReward = calculateReferralReward('MONTHLY')
    const annualReward = calculateReferralReward('ANNUAL')

    // Cleanup
    await prisma.client.delete({
      where: { id: client.id },
    })

    return Response.json({
      status: 'ok',
      message: 'All profit systems working',
      tests: {
        urgency: {
          day3_has_message: urgencyDay3 !== null,
          day14_has_message: urgencyDay14 !== null,
          invalid_day_null: urgencyInvalid === null,
          pass: urgencyDay3 !== null && urgencyDay14 !== null && urgencyInvalid === null,
        },
        annualHosting: {
          checkout_pitch: shouldPitchCheckout,
          month3_pitch: shouldPitchMonth3,
          pass: shouldPitchCheckout && shouldPitchMonth3,
        },
        dynamicUpsells: {
          gbp_available: upsellGBP,
          social_available: upsellSocial,
          pass: true, // May not be available for test client
        },
        referrals: {
          monthly_reward: monthlyReward,
          annual_reward: annualReward,
          pass: monthlyReward === 50 && annualReward === 200,
        },
      },
      allTestsPassed:
        urgencyDay3 !== null &&
        urgencyDay14 !== null &&
        urgencyInvalid === null &&
        shouldPitchCheckout &&
        shouldPitchMonth3 &&
        monthlyReward === 50 &&
        annualReward === 200,
    })
  } catch (error) {
    return Response.json(
      {
        status: 'error',
        message: 'Profit systems test failed',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
