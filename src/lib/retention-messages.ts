import { prisma } from './db'
import { Anthropic } from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// ============================================
// ADAPTIVE RETENTION MESSAGE GENERATOR
// ============================================

// Default guidance per touchpoint day — tells Claude what angle to take
export const DEFAULT_TOUCHPOINT_GUIDANCE: Record<number, { goal: string; angle: string }> = {
  7: {
    goal: 'Check-in + quick win',
    angle: 'Use their site stats to show early traction. Suggest one actionable thing (Google Business Profile, share link on social) based on what their data is missing.',
  },
  14: {
    goal: 'Performance report + engagement',
    angle: 'Share real numbers (visits, forms, calls). If traffic is low, suggest how to drive it. If traffic is good, celebrate it. If bounce rate is high, mention mobile optimization.',
  },
  30: {
    goal: 'Month milestone + first upsell',
    angle: 'Celebrate 1 month. Use their actual data to recommend ONE upsell that would help the most: low traffic → SEO, no reviews → Review Widget, no social presence → Social Media Management.',
  },
  60: {
    goal: 'Growth opportunity',
    angle: 'Compare their current stats to their first month. Identify the biggest growth lever based on data: more calls needed → call tracking, high bounce → site speed/UX, good traffic but low conversions → CTA optimization.',
  },
  90: {
    goal: 'Quarterly review + strategic upsell',
    angle: 'Full quarter review. Use data to pitch the upsell that makes the most sense for their situation. Frame it as ROI — "X more visitors could mean Y more jobs per month."',
  },
  180: {
    goal: 'Half-year check + retention',
    angle: 'Celebrate their consistency. Share cumulative stats (total visits, total leads generated). Suggest a refresh or seasonal update. If they haven\'t purchased any upsells, make a tailored pitch.',
  },
  365: {
    goal: 'Anniversary + expansion',
    angle: 'Happy anniversary. Total year stats. Ask about their goals for next year. Suggest premium plan or additional services based on what their data says they need most.',
  },
}

const SYSTEM_PROMPT = `You write a single SMS retention message for a home service business client. The message is from their web provider checking in with real performance data.

RULES:
1. Use the client's REAL data — actual numbers, not made up. If a stat is 0, acknowledge it and suggest how to improve.
2. Keep it under 160 characters if possible, max 320 characters. SMS-friendly.
3. Sound human and casual — not corporate. Like a text from someone who genuinely cares about their business.
4. Include ONE specific, actionable suggestion based on their data.
5. Use their first name if available. If name is empty or "(none)", write naturally without addressing by name.
6. NEVER use: impressive, amazing, incredible, outstanding, excellent, fantastic, great, awesome, cutting-edge, world-class
7. If recommending an upsell, frame it as solving a specific problem their data reveals — not a generic pitch.
8. Numbers are powerful — use them. "47 visitors last month" beats "some visitors."

OUTPUT: Just the message text, nothing else. No quotes, no labels.`

interface ClientData {
  id: string
  companyName: string
  contactName: string | null
  industry: string
  location: string | null
  siteUrl: string | null
  plan: string
  monthlyRevenue: number
  siteLiveDate: Date | null
  upsells: any
  analytics: {
    totalVisits: number
    uniqueVisitors: number
    totalForms: number
    totalCalls: number
    avgTimeOnSite: number | null
    bounceRate: number | null
    topTrafficSource: string | null
    missedCalls: number
  } | null
}

export async function generateRetentionMessage(
  clientId: string,
  touchpointDay: number,
  customGuidance?: string
): Promise<{ message: string; cost: number }> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      lead: { select: { firstName: true, phone: true, timezone: true } },
      analytics: true,
    },
  })

  if (!client) throw new Error('Client not found')

  const firstName = client.lead?.firstName || client.contactName?.split(' ')[0] || ''
  const analytics = client.analytics
  const daysSinceLive = client.siteLiveDate
    ? Math.floor((Date.now() - new Date(client.siteLiveDate).getTime()) / (1000 * 60 * 60 * 24))
    : touchpointDay

  // Get guidance for this touchpoint
  const guidance = customGuidance || DEFAULT_TOUCHPOINT_GUIDANCE[touchpointDay]?.angle || 'Check in on their site performance and suggest one improvement.'
  const goal = DEFAULT_TOUCHPOINT_GUIDANCE[touchpointDay]?.goal || 'Check-in'

  // Get existing upsells so we don't pitch what they already have
  const activeUpsells = Array.isArray(client.upsells) ? (client.upsells as any[]).map(u => u.key || u.name) : []

  // Build context prompt with real data
  const parts: string[] = []
  parts.push(`CLIENT: ${firstName} (${client.companyName})`)
  parts.push(`INDUSTRY: ${client.industry.toLowerCase().replace(/_/g, ' ')}`)
  if (client.location) parts.push(`LOCATION: ${client.location}`)
  parts.push(`PLAN: ${client.plan} ($${client.monthlyRevenue}/mo)`)
  parts.push(`DAYS SINCE SITE LIVE: ${daysSinceLive}`)
  parts.push(`TOUCHPOINT: Day ${touchpointDay} — Goal: ${goal}`)

  if (analytics) {
    parts.push(`\n--- SITE STATS ---`)
    parts.push(`Total Visits: ${analytics.totalVisits}`)
    parts.push(`Unique Visitors: ${analytics.uniqueVisitors}`)
    parts.push(`Form Submissions: ${analytics.totalForms}`)
    parts.push(`Phone Calls: ${analytics.totalCalls}`)
    parts.push(`Missed Calls: ${analytics.missedCalls}`)
    if (analytics.avgTimeOnSite) parts.push(`Avg Time on Site: ${Math.round(analytics.avgTimeOnSite)}s`)
    if (analytics.bounceRate !== null && analytics.bounceRate !== undefined) parts.push(`Bounce Rate: ${Math.round(analytics.bounceRate * 100)}%`)
    if (analytics.topTrafficSource) parts.push(`Top Traffic Source: ${analytics.topTrafficSource}`)
  } else {
    parts.push(`\n--- SITE STATS ---`)
    parts.push(`No analytics data yet — site may be too new or tracking not set up.`)
  }

  if (activeUpsells.length > 0) {
    parts.push(`\nALREADY HAS: ${activeUpsells.join(', ')}`)
  }

  // Available upsells from settings
  const settings = await prisma.settings.findFirst({ where: { key: 'client_sequences' } })
  const upsellProducts = settings?.value
    ? (typeof settings.value === 'string' ? JSON.parse(settings.value) : settings.value)?.upsellProducts || []
    : []

  const availableUpsells = upsellProducts.filter((p: any) => !activeUpsells.includes(p.key))
  if (availableUpsells.length > 0) {
    parts.push(`\nAVAILABLE UPSELLS (only pitch if data supports it):`)
    for (const u of availableUpsells) {
      parts.push(`  - ${u.name}: ${u.price}`)
    }
  }

  parts.push(`\nGUIDANCE: ${guidance}`)
  parts.push(`\nWrite a personalized SMS for ${firstName}. Use their actual stats. Be specific, not generic.`)

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: parts.join('\n') }],
    })

    const message = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
    const cost = (response.usage.input_tokens + response.usage.output_tokens) * 0.0000008

    // Log API cost
    await prisma.apiCost.create({
      data: { service: 'anthropic', operation: 'retention_message', cost },
    }).catch(err => console.error('[Retention] API cost write failed:', err))

    return { message, cost }
  } catch (error) {
    console.error('[RETENTION] Claude error:', error)
    // Fallback to a simple template
    const fallback = analytics && analytics.totalVisits > 0
      ? `Hey${firstName ? ` ${firstName}` : ''}! Your ${client.companyName} site has ${analytics.totalVisits} visits so far. Want me to pull a full report?`
      : `Hey${firstName ? ` ${firstName}` : ''}! Quick check-in on your ${client.companyName} site. Everything looking good? Reply if you need anything.`
    return { message: fallback, cost: 0 }
  }
}

// Generate a preview message (for settings page preview)
export async function previewRetentionMessage(
  clientId: string,
  touchpointDay: number,
  customGuidance?: string
): Promise<{ message: string; cost: number }> {
  return generateRetentionMessage(clientId, touchpointDay, customGuidance)
}
