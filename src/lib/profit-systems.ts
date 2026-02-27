import { prisma } from './db'
import { logActivity } from './logging'

/**
 * Profit Systems
 * 4 automated revenue engines: Urgency, Annual Hosting, Upsells, Referrals
 */

/**
 * Check if a lead has viewed their preview at least once.
 * Used to gate urgency texts — no point texting if they never opened it.
 */
export async function hasLeadViewedPreview(leadId: string): Promise<boolean> {
  const viewCount = await prisma.leadEvent.count({
    where: {
      leadId,
      eventType: 'PREVIEW_VIEWED',
    },
  })
  return viewCount > 0
}

/**
 * PROFIT SYSTEM 1: PREVIEW URGENCY
 * Send urgency texts on Days 3, 5, 6, 7, 8, 10, 14 after preview generation
 * ~$20-30 ARPU per text campaign
 */

const DEFAULT_URGENCY_DAYS = [3, 5, 6, 7, 8, 10, 14]
const DEFAULT_URGENCY_TEMPLATES: Record<number, string> = {
  3: '🔥 Hey {name}, your preview expires in {days_left} days. Take another look: {preview_url}',
  5: '⏰ {name}, {days_left} days left on your preview. Don\'t want to miss your window. Can we schedule a call?',
  6: '⚡ Quick question {name} — is time the only thing holding you back from launching?',
  7: '🚨 {name}, {days_left} days left. We\'re holding your spot but can\'t wait forever. Ready to move forward?',
  8: 'Last chance to save your spot at this price, {name}. Preview expires in {days_left} days: {preview_url}',
  10: 'Your {company} preview is ending soon. We can have you live TODAY if you say yes: {preview_url}',
  14: '{name}, your preview is gone in 24 hours. This is your final notice: {preview_url}',
}

// 60-second cache for sequence settings (same pattern as automated-messages.ts)
let cachedSequences: { urgencyDays: number[]; urgencyTemplates: Record<number, string> } | null = null
let sequenceCacheTime = 0
const SEQUENCE_CACHE_TTL = 60_000

async function getSequenceSettings(): Promise<{ urgencyDays: number[]; urgencyTemplates: Record<number, string> }> {
  const now = Date.now()
  if (cachedSequences && (now - sequenceCacheTime) < SEQUENCE_CACHE_TTL) return cachedSequences

  try {
    const setting = await prisma.settings.findUnique({ where: { key: 'sequences' } })
    if (setting?.value && typeof setting.value === 'object') {
      const val = setting.value as Record<string, any>
      cachedSequences = {
        urgencyDays: Array.isArray(val.urgencyDays) && val.urgencyDays.length > 0
          ? val.urgencyDays
          : DEFAULT_URGENCY_DAYS,
        urgencyTemplates: val.urgencyTemplates && typeof val.urgencyTemplates === 'object'
          ? { ...DEFAULT_URGENCY_TEMPLATES, ...val.urgencyTemplates }
          : DEFAULT_URGENCY_TEMPLATES,
      }
      sequenceCacheTime = now
      return cachedSequences
    }
  } catch (err) {
    console.error('[ProfitSystems] Failed to load sequence settings:', err)
  }
  return { urgencyDays: DEFAULT_URGENCY_DAYS, urgencyTemplates: DEFAULT_URGENCY_TEMPLATES }
}

export async function generateUrgencyMessages(
  previewCreatedDaysAgo: number,
  lead?: {
    firstName?: string
    companyName?: string
    previewUrl?: string
    previewExpiresAt?: Date | null
    previewCreatedAt?: Date | null
  }
) {
  const { urgencyDays, urgencyTemplates: templates } = await getSequenceSettings()

  if (!urgencyDays.includes(previewCreatedDaysAgo)) {
    return null
  }

  let message = templates[previewCreatedDaysAgo]
  if (!message) return null

  // Calculate days_left from expiration date
  let daysLeft = '0'
  if (lead?.previewExpiresAt) {
    const msLeft = new Date(lead.previewExpiresAt).getTime() - Date.now()
    daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24))).toString()
  }

  // Format preview created date
  let dateStr = ''
  if (lead?.previewCreatedAt) {
    dateStr = new Date(lead.previewCreatedAt).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    })
  }

  // Replace all template variables
  message = message
    .replace(/\{name\}/g, lead?.firstName || '')
    .replace(/\{company\}/g, lead?.companyName || 'your company')
    .replace(/\{date\}/g, dateStr)
    .replace(/\{preview_url\}/g, lead?.previewUrl || '')
    .replace(/\{days_left\}/g, daysLeft)

  // Clean up artifacts from empty variable substitution
  message = message
    .replace(/\s+/g, ' ')
    .replace(/,\s*([!?.])/g, '$1')
    .replace(/\s([!?,.])/g, '$1')
    .trim()

  return message
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
 * PROFIT SYSTEM 3: UPSELLS (Dynamic DB-driven)
 * Pulls active products from UpsellProduct table, applies eligibility filters.
 */
export async function recommendUpsells(clientId: string): Promise<{
  productId: string
  name: string
  price: number
  recurring: boolean
  aiProductSummary: string | null
  aiPitchInstructions: string | null
  stripeLink: string | null
}[]> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { lead: true }
  })
  if (!client) return []

  // Only get NON-CORE active products (core product is not an upsell)
  const products = await prisma.upsellProduct.findMany({
    where: { active: true, isCore: false, deletedAt: null },
    orderBy: { sortOrder: 'asc' },
  })

  // Get all existing pitches for this client
  const existingPitches = await prisma.upsellPitch.findMany({
    where: { clientId },
  })

  const clientAgeDays = Math.floor(
    (Date.now() - new Date(client.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  )
  const clientIndustry = client.industry || client.lead?.industry || ''

  const recommendations: {
    productId: string
    name: string
    price: number
    recurring: boolean
    aiProductSummary: string | null
    aiPitchInstructions: string | null
    stripeLink: string | null
  }[] = []

  for (const product of products) {
    // Check min client age
    if (product.minClientAgeDays && clientAgeDays < product.minClientAgeDays) continue

    // Check industry eligibility (empty array = all industries eligible)
    if (product.eligibleIndustries.length > 0 &&
        !product.eligibleIndustries.includes(clientIndustry)) continue

    // Check max pitch attempts
    const pitchCount = existingPitches.filter(p => p.productId === product.id).length
    if (pitchCount >= product.maxPitchesPerClient) continue

    // Skip if client already paid for this product
    const alreadyPaid = existingPitches.some(
      p => p.productId === product.id && p.status === 'paid'
    )
    if (alreadyPaid) continue

    recommendations.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      recurring: product.recurring,
      aiProductSummary: product.aiProductSummary,
      aiPitchInstructions: product.aiPitchInstructions,
      stripeLink: product.stripeLink,
    })
  }

  return recommendations
}

/**
 * Build upsell context for AI prompts.
 * Called by Close Engine and Post-Client AI.
 * Returns a formatted text block the AI uses to understand available upsells.
 */
export async function buildUpsellContextForAI(clientId: string): Promise<string> {
  const recommendations = await recommendUpsells(clientId)

  if (recommendations.length === 0) {
    return 'No upsell products are currently recommended for this client.'
  }

  let context = '## Available Upsells for This Client\n\n'
  context += 'You may mention these products if the conversation naturally leads to them, '
  context += 'or if the client asks about additional services. Never hard-sell.\n\n'

  for (const rec of recommendations) {
    context += `### ${rec.name} — $${rec.price}${rec.recurring ? '/mo' : ''}${rec.stripeLink ? '' : ' (no payment link yet)'}\n`
    if (rec.aiProductSummary) {
      context += `Summary: ${rec.aiProductSummary}\n`
    }
    if (rec.aiPitchInstructions) {
      context += `Pitch guidance: ${rec.aiPitchInstructions}\n`
    }
    if (rec.stripeLink) {
      context += `Payment link: ${rec.stripeLink}\n`
    }
    context += '\n'
  }

  return context
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

    const rewardAmount = Math.round(Math.min(monthlyValue, 500) * 100) / 100

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

  // Check urgency — skip if lead is in active Close Engine conversation
  if (client.leadId) {
    const activeCloseConv = await prisma.closeEngineConversation.findUnique({
      where: { leadId: client.leadId },
    })
    if (activeCloseConv && !['COMPLETED', 'CLOSED_LOST'].includes(activeCloseConv.stage)) {
      console.log(`[URGENCY] Skipping — lead ${client.leadId} is in active Close Engine conversation`)
      return triggers
    }
  }

  // Check urgency — only if lead has actually viewed the preview
  const hasViewedPreview = client.lead?.events.some(
    (e) => e.eventType === 'PREVIEW_VIEWED'
  )

  if (!hasViewedPreview) {
    // Never opened preview — skip urgency text, don't waste Twilio credit
    console.log(`[URGENCY] Skipping for ${client.lead?.companyName || clientId} — no preview views`)
  } else if (client.lead?.previewExpiresAt && new Date(client.lead.previewExpiresAt) < new Date()) {
    // Preview already expired — link is dead, skip
    console.log(`[URGENCY] Skipping for ${client.lead?.companyName || clientId} — preview expired`)
  } else {
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
      const urgencyMsg = await generateUrgencyMessages(daysAgo, {
        firstName: client.lead?.firstName || undefined,
        companyName: client.lead?.companyName || client.companyName,
        previewUrl: client.lead?.previewUrl || undefined,
        previewExpiresAt: client.lead?.previewExpiresAt,
        previewCreatedAt: previewCreatedDate,
      })
      if (urgencyMsg) {
        triggers.urgency = {
          daysAgo,
          message: urgencyMsg,
        }
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
    triggers.upsells = upsells.map(u => u.name)
  }

  return triggers
}
