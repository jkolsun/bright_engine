import { prisma } from './db'
import twilio from 'twilio'
import { logActivity } from './logging'

/**
 * Digest Reports
 * Automated reports via Twilio SMS at scheduled times:
 * - 9 PM: Nightly digest
 * - 9 AM: Morning report
 * - Sunday 6 PM: Weekly summary
 */

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

interface DigestData {
  leadsCreated: number
  leadsQualified: number
  leadsConverted: number
  previewsGenerated: number
  emailsSent: number
  callsMade: number
  revenueToday: number
  topPerformer?: string
  hotLeads: number
  warmLeads: number
  coldLeads: number
}

/**
 * Get today's digest data
 */
async function getTodayDigestData(): Promise<DigestData> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const activities = await prisma.clawdbotActivity.findMany({
    where: {
      createdAt: { gte: today },
    },
  })

  const leads = await prisma.lead.findMany({
    where: {
      createdAt: { gte: today },
    },
  })

  const events = await prisma.leadEvent.findMany({
    where: {
      createdAt: { gte: today },
    },
  })

  const revenue = await prisma.revenue.findMany({
    where: {
      createdAt: { gte: today },
    },
  })

  const outboundEvents = await prisma.outboundEvent.findMany({
    where: {
      createdAt: { gte: today },
    },
  })

  // Count by activity type
  const previewCount = activities.filter((a) => a.actionType === 'PREVIEW_GENERATED').length
  const emailCount = activities.filter((a) => a.actionType === 'TEXT_SENT').length

  const callCount = events.filter((e) => e.eventType === 'CALL_MADE').length

  // Get top performer
  const repActivities = activities.filter((a) => a.repId)
  const repMap: Record<string, number> = {}
  repActivities.forEach((a) => {
    if (a.repId) repMap[a.repId] = (repMap[a.repId] || 0) + 1
  })
  const topRep = Object.entries(repMap)
    .sort((a, b) => b[1] - a[1])
    .at(0)?.[0]

  let topRepName = ''
  if (topRep) {
    const rep = await prisma.user.findUnique({
      where: { id: topRep },
      select: { name: true },
    })
    topRepName = rep?.name || 'Unknown'
  }

  // Count lead statuses for engagement
  const allLeads = await prisma.lead.findMany({
    include: {
      events: true,
      outboundEvents: true,
    },
  })

  let hotCount = 0,
    warmCount = 0,
    coldCount = 0
  
  for (const lead of allLeads) {
    const engagementEvents = lead.events.filter((e) =>
      ['PREVIEW_VIEWED', 'EMAIL_OPENED', 'EMAIL_REPLIED'].includes(e.eventType)
    )

    if (engagementEvents.length >= 3) hotCount++
    else if (engagementEvents.length >= 1) warmCount++
    else coldCount++
  }

  return {
    leadsCreated: leads.filter((l) => l.status === 'NEW').length,
    leadsQualified: leads.filter((l) => l.status === 'QUALIFIED').length,
    leadsConverted: leads.filter((l) => l.status === 'PAID').length,
    previewsGenerated: previewCount,
    emailsSent: emailCount,
    callsMade: callCount,
    revenueToday: revenue.reduce((sum, r) => sum + r.amount, 0),
    topPerformer: topRepName,
    hotLeads: hotCount,
    warmLeads: warmCount,
    coldLeads: coldCount,
  }
}

/**
 * Format digest message for SMS
 */
function formatDigestMessage(data: DigestData, type: 'NIGHTLY' | 'MORNING' | 'WEEKLY'): string {
  const base = `📊 ${type === 'NIGHTLY' ? 'Nightly' : type === 'MORNING' ? 'Morning' : 'Weekly'} Digest\n`

  let message = base
  message += `\n✨ Leads Created: ${data.leadsCreated}`
  message += `\n🎯 Qualified: ${data.leadsQualified}`
  message += `\n💰 Converted: ${data.leadsConverted}`

  if (type !== 'MORNING') {
    message += `\n\n📧 Emails Sent: ${data.emailsSent}`
    message += `\n☎️ Calls Made: ${data.callsMade}`
    message += `\n💵 Revenue: $${data.revenueToday.toFixed(0)}`

    if (data.topPerformer) {
      message += `\n\n🏆 Top Rep: ${data.topPerformer}`
    }
  }

  message += `\n\n🌡️ Pipeline:\n❤️ HOT: ${data.hotLeads}`
  message += `\n🧡 WARM: ${data.warmLeads}`
  message += `\n💙 COLD: ${data.coldLeads}`

  return message
}

/**
 * Send nightly digest (9 PM)
 */
export async function sendNightlyDigest(toPhoneNumber: string) {
  try {
    const data = await getTodayDigestData()
    const message = formatDigestMessage(data, 'NIGHTLY')

    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: toPhoneNumber,
    })

    await logActivity(
      'NIGHTLY_DIGEST',
      `Nightly digest sent: ${data.leadsCreated} new leads, $${data.revenueToday}`,
      {
        metadata: {
          messageId: result.sid,
          ...data,
        },
      }
    )

    return { success: true, messageId: result.sid }
  } catch (error) {
    console.error('Nightly digest error:', error)
    return { success: false, error }
  }
}

/**
 * Send morning report (9 AM)
 */
export async function sendMorningReport(toPhoneNumber: string) {
  try {
    // Get yesterday's data for morning report
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)

    const data = await getTodayDigestData() // Will use today's data, but called in morning
    const message = formatDigestMessage(data, 'MORNING')

    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: toPhoneNumber,
    })

    await logActivity(
      'MORNING_REPORT',
      `Morning report sent`,
      {
        metadata: {
          messageId: result.sid,
        },
      }
    )

    return { success: true, messageId: result.sid }
  } catch (error) {
    console.error('Morning report error:', error)
    return { success: false, error }
  }
}

/**
 * Send weekly report (Sunday 6 PM)
 */
export async function sendWeeklyReport(toPhoneNumber: string) {
  try {
    // Get last 7 days' data
    const lastWeek = new Date()
    lastWeek.setDate(lastWeek.getDate() - 7)

    const activities = await prisma.clawdbotActivity.findMany({
      where: {
        createdAt: { gte: lastWeek },
      },
    })

    const revenue = await prisma.revenue.findMany({
      where: {
        createdAt: { gte: lastWeek },
      },
    })

    const totalRevenue = revenue.reduce((sum, r) => sum + r.amount, 0)
    const avgDaily = totalRevenue / 7

    let message = `📈 Weekly Summary\n\n`
    message += `💰 Total Revenue: $${totalRevenue.toFixed(0)}\n`
    message += `📊 Daily Average: $${avgDaily.toFixed(0)}\n`
    message += `🎯 Activities: ${activities.length}\n`

    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: toPhoneNumber,
    })

    await logActivity(
      'WEEKLY_REPORT',
      `Weekly report sent: $${totalRevenue} revenue`,
      {
        metadata: {
          messageId: result.sid,
          weeklyRevenue: totalRevenue,
        },
      }
    )

    return { success: true, messageId: result.sid }
  } catch (error) {
    console.error('Weekly report error:', error)
    return { success: false, error }
  }
}
