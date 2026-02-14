import { prisma } from './db'
import { logActivity } from './logging'

/**
 * Profit Systems
 * 4 automated revenue engines: Urgency, Annual Hosting, Upsells, Referrals
 */

/**
 * PROFIT SYSTEM 1: PREVIEW URGENCY
 * Send urgency texts on Days 3, 5, 6, 7, 8, 10, 14 after preview generation
 * ~$20-30 ARPU per text campaign
 */
export async function generateUrgencyMessages(previewCreatedDaysAgo: number) {
  const urgencyDays = [3, 5, 6, 7, 8, 10, 14]
  if (!urgencyDays.includes(previewCreatedDaysAgo)) {
    return null
  }

  // Templates by day
  const templates: Record<number, string> = {
    3: '🔥 Hey {name}, previews expire in 11 days. Let\'s finalize your site so it goes live. Reply YES.',
    5: '⏰ {name}, 9 days left on your preview. Don\'t want to miss your window. Can we schedule a call?',
    6: '⚡ Quick question {name} - is time the only thing holding you back from launching?',
    7: '🚨 {name}, 7 days left. We\'re holding your spot, but can\'t wait forever. Ready to move forward?',
    8: 'Last chance to save your spot at this price, {name}. Preview expires in 6 days.',
    10: 'Your preview from {date} is ending soon. We can have you live TODAY if you say yes.',
    14: '{name}, your preview is ending in 24 hours! This is your final notice.',
  }

  return templates[previewCreatedDaysAgo] || null
}

/**
 * PROFIT SYSTEM 2: ANNUAL HOSTING PITCH
 * Send annual plan pitch at checkout + on Month 3 (upsell from monthly to annual)
 * +$300-600 per customer
 */
export async function shouldPitchAnnualHosting(
  clientId: string,
  eventType: 'AT_CHECKOUT' | 'MONTH_3'
): Promise<boolean> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      revenue: true,
    },
  })

  if (!client) return false

  // Check if already has annual plan (check product field or other markers)
  const hasAnnual = client.revenue.some(
    (r) => r.product && r.product.includes('annual')
  )
  if (hasAnnual) return false

  // AT_CHECKOUT: Always pitch
  if (eventType === 'AT_CHECKOUT') return true

  // MONTH_3: Only if still on monthly
  if (eventType === 'MONTH_3') {
    const createdAt = new Date(client.createdAt)
    const now = new Date()
    const monthsActive = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30)
    return monthsActive >= 2.5 && monthsActive <= 3.5 // Between month 2.5 and 3.5
  }

  return false
}

/**
 * PROFIT SYSTEM 3: UPSELLS
 * Pitch premium features: GBP, Social, Review Widget, SEO
 * Triggered by: engagement signals + page performance + customer lifetime value
 */
export async function recommendUpsells(clientId: string): Promise<string[]> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      lead: {
        include: {
          events: true,
        },
      },
      revenue: true,
    },
  })

  if (!client) return []

  const recommendations: string[] = []
  const monthlyValue = client.revenue.reduce((sum, r) => sum + r.amount, 0) / 12

  // GBP: High-intent + local search industry
  if (
    client.lead?.industry &&
    ['RESTORATION', 'ROOFING', 'PLUMBING', 'HVAC', 'PAINTING', 'LANDSCAPING'].includes(
      client.lead.industry
    )
  ) {
    recommendations.push('GBP_OPTIMIZATION')
  }

  // Social: E-commerce or high-engagement verticals
  const hasEngagement = client.lead?.events.filter((e) =>
    ['PREVIEW_CTA_CLICKED', 'PREVIEW_RETURN_VISIT'].includes(e.eventType)
  ).length ?? 0
  if (hasEngagement > 2) {
    recommendations.push('SOCIAL_MANAGEMENT')
  }

  // Review Widget: Service-based (high review reliance)
  if (
    client.lead?.enrichedReviews &&
    client.lead.enrichedReviews > 10
  ) {
    recommendations.push('REVIEW_WIDGET')
  }

  // SEO: Any business with competitive keywords
  if (monthlyValue > 500) {
    recommendations.push('SEO_OPTIMIZATION')
  }

  return recommendations
}

/**
 * PROFIT SYSTEM 4: REFERRAL SYSTEM
 * Offer rewards for referred clients: free month, cash, or credits
 * Triggered after 3 months of active service
 */
export async function generateReferralReward(
  clientId: string,
  referredByUserId: string
): Promise<{
  success: boolean
  rewardAmount?: number
  rewardType?: string
}> {
  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        revenue: true,
      },
    })

    if (!client) {
      return { success: false }
    }

    // Referral reward: 1 month of client's current plan value (max $500)
    const monthlyValue = client.revenue
      .filter((r) => !r.product?.startsWith('referral_reward'))
      .reduce((sum, r) => sum + r.amount, 0) / 12

    const rewardAmount = Math.min(monthlyValue, 500)

    // Create reward record (store as UPSELL type with product identifier)
    const reward = await prisma.revenue.create({
      data: {
        clientId: referredByUserId, // Assign reward to referrer
        type: 'UPSELL',
        amount: rewardAmount,
        product: `referral_reward_${client.id}`,
        status: 'PAID',
      },
    })

    // Log activity
    await logActivity(
      'UPSELL_PITCH',
      `Generated referral reward: ${rewardAmount} for referring ${client.companyName}`,
      {
        clientId,
        repId: referredByUserId,
        metadata: {
          rewardAmount,
          rewardType: 'ACCOUNT_CREDIT',
        },
      }
    )

    return {
      success: true,
      rewardAmount,
      rewardType: 'ACCOUNT_CREDIT',
    }
  } catch (error) {
    console.error('Referral reward error:', error)
    return { success: false }
  }
}

/**
 * Check if client qualifies for any profit system action
 */
export async function checkProfitSystemTriggers(clientId: string) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      lead: {
        include: {
          events: true,
        },
      },
    },
  })

  if (!client || !client.leadId) return {}

  const triggers: Record<string, any> = {}

  // Check urgency
  const previewCreatedDate = client.lead?.previewExpiresAt
    ? new Date(
        new Date(client.lead.previewExpiresAt).getTime() -
        30 * 24 * 60 * 60 * 1000
      ) // 30 days prior
    : null

  if (previewCreatedDate) {
    const daysAgo = Math.floor(
      (new Date().getTime() - previewCreatedDate.getTime()) /
      (1000 * 60 * 60 * 24)
    )
    const urgencyMsg = await generateUrgencyMessages(daysAgo)
    if (urgencyMsg) {
      triggers.urgency = {
        daysAgo,
        message: urgencyMsg.replace('{name}', client.lead?.firstName || 'there'),
      }
    }
  }

  // Check annual hosting upsell (at month 3)
  const monthsActive = Math.floor(
    (new Date().getTime() - new Date(client.createdAt).getTime()) /
    (1000 * 60 * 60 * 24 * 30)
  )
  if (monthsActive === 3) {
    const shouldPitch = await shouldPitchAnnualHosting(clientId, 'MONTH_3')
    if (shouldPitch) {
      triggers.annualHosting = {
        message:
          'You\'ve been live for 3 months! Save 15% with our annual plan.',
      }
    }
  }

  // Check general upsells
  const upsells = await recommendUpsells(clientId)
  if (upsells.length > 0) {
    triggers.upsells = upsells
  }

  return triggers
}
