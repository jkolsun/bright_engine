import { Worker } from 'bullmq'
import Redis from 'ioredis'
import { enrichLead } from '../lib/serpapi'
import { generatePersonalization } from '../lib/serper'
import { prisma } from '../lib/db'
import { sendSMS } from '../lib/twilio'
import { canSendMessage } from '../lib/utils'

const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
})

// Enrichment worker
const enrichmentWorker = new Worker(
  'enrichment',
  async (job) => {
    console.log(`Processing enrichment job: ${job.id}`)
    const { leadId } = job.data
    
    await enrichLead(leadId)
    
    return { success: true }
  },
  { connection }
)

// Personalization worker
const personalizationWorker = new Worker(
  'personalization',
  async (job) => {
    console.log(`Processing personalization job: ${job.id}`)
    const { leadId } = job.data
    
    const personalization = await generatePersonalization(leadId)
    
    return { success: true, personalization }
  },
  { connection }
)

// Sequence worker (handles all automated messages)
const sequenceWorker = new Worker(
  'sequence',
  async (job) => {
    console.log(`Processing sequence job: ${job.name} - ${job.id}`)
    
    switch (job.name) {
      case 'post-launch-day-3':
        await sendPostLaunchDay3(job.data.clientId)
        break
        
      case 'post-launch-day-7':
        await sendPostLaunchDay7(job.data.clientId)
        break
        
      case 'post-launch-day-28':
        await sendPostLaunchDay28(job.data.clientId)
        break
        
      case 'win-back-day-7':
        await sendWinBackDay7(job.data.clientId)
        break
        
      case 'referral-day-45':
        await sendReferralDay45(job.data.clientId)
        break
        
      default:
        console.log(`Unknown sequence: ${job.name}`)
    }
    
    return { success: true }
  },
  { connection }
)

// Monitoring worker (hot leads + daily audit)
const monitoringWorker = new Worker(
  'monitoring',
  async (job) => {
    console.log(`Processing monitoring job: ${job.name}`)
    
    switch (job.name) {
      case 'hot-leads-check':
        await checkHotLeads()
        break
        
      case 'daily-audit':
        await runDailyAudit()
        break
        
      default:
        console.log(`Unknown monitoring job: ${job.name}`)
    }
    
    return { success: true }
  },
  { connection }
)

// ============================================
// SEQUENCE FUNCTIONS
// ============================================

async function sendPostLaunchDay3(clientId: string) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { lead: true },
  })

  if (!client || !client.lead) return

  const lead = client.lead
  
  if (!canSendMessage(lead.timezone || 'America/New_York')) {
    // Reschedule for next hour
    return
  }

  await sendSMS({
    to: lead.phone,
    message: `Quick tip: Add your site link to your Google Business Profile. That alone can double your local visibility.`,
    clientId: client.id,
    trigger: 'post_launch_day_3',
  })

  await prisma.client.update({
    where: { id: clientId },
    data: { nextTouchpoint: 'day_7', nextTouchpointDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000) },
  })
}

async function sendPostLaunchDay7(clientId: string) {
  // Get analytics and send stats
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { lead: true, analytics: true },
  })

  if (!client || !client.lead) return

  if (!canSendMessage(client.lead.timezone || 'America/New_York')) return

  const analytics = client.analytics
  
  if (analytics) {
    await sendSMS({
      to: client.lead.phone,
      message: `Your first week: ${analytics.totalVisits} visitors, ${analytics.totalForms} form submissions. Traffic picks up as Google indexes your pages.`,
      clientId: client.id,
      trigger: 'post_launch_day_7',
    })
  }
}

async function sendPostLaunchDay28(clientId: string) {
  // Hand off to Andrew for upsell conversation
  await prisma.notification.create({
    data: {
      type: 'DAILY_AUDIT',
      title: 'Day 30 Upsell Ready',
      message: `Client ready for upsell conversation`,
      metadata: { clientId },
    },
  })
}

async function sendWinBackDay7(clientId: string) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { lead: true },
  })

  if (!client || !client.lead) return

  await sendSMS({
    to: client.lead.phone,
    message: `Your hosting was cancelled. ${client.companyName}'s site goes offline in 7 days. Reply "keep it" to reactivate.`,
    clientId: client.id,
    trigger: 'win_back_day_7',
  })
}

async function sendReferralDay45(clientId: string) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { lead: true },
  })

  if (!client || !client.lead) return

  await sendSMS({
    to: client.lead.phone,
    message: `Know a business owner who needs a site? Refer them, you both get a free month of hosting.`,
    clientId: client.id,
    trigger: 'referral_day_45',
  })
}

// ============================================
// MONITORING FUNCTIONS
// ============================================

async function checkHotLeads() {
  // Check for preview engagement in last 15 minutes
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000)

  const hotEvents = await prisma.leadEvent.findMany({
    where: {
      createdAt: { gte: fifteenMinutesAgo },
      eventType: {
        in: ['PREVIEW_VIEWED', 'PREVIEW_CTA_CLICKED', 'PREVIEW_CALL_CLICKED', 'PREVIEW_RETURN_VISIT'],
      },
    },
    include: {
      lead: true,
    },
  })

  // Create notifications for each hot lead (prevent duplicates)
  for (const event of hotEvents) {
    // Check for existing notification in last hour (more conservative)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    
    const existing = await prisma.notification.findFirst({
      where: {
        type: 'HOT_LEAD',
        metadata: { path: ['leadId'], equals: event.leadId },
        createdAt: { gte: oneHourAgo },
      },
    })

    // Only create if not already notified recently
    if (!existing) {
      await prisma.notification.create({
        data: {
          type: 'HOT_LEAD',
          title: 'Hot Lead Alert',
          message: `${event.lead.firstName} at ${event.lead.companyName} just ${event.eventType.toLowerCase()} their preview`,
          metadata: { leadId: event.leadId, eventType: event.eventType, timestamp: Date.now() },
        },
      })
    }
  }
}

async function runDailyAudit() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Count activities
  const leadsImported = await prisma.lead.count({
    where: { createdAt: { gte: today } },
  })

  const qualified = await prisma.lead.count({
    where: { status: 'QUALIFIED', updatedAt: { gte: today } },
  })

  const paid = await prisma.lead.count({
    where: { status: 'PAID', updatedAt: { gte: today } },
  })

  const sitesLive = await prisma.client.count({
    where: { siteLiveDate: { gte: today } },
  })

  const revenue = await prisma.revenue.aggregate({
    where: { createdAt: { gte: today }, status: 'PAID' },
    _sum: { amount: true },
  })

  // Create audit notification
  await prisma.notification.create({
    data: {
      type: 'DAILY_AUDIT',
      title: 'Daily Audit',
      message: `Leads: ${leadsImported} | Qualified: ${qualified} | Closed: ${paid} | Live: ${sitesLive} | Revenue: $${revenue._sum.amount || 0}`,
      metadata: { leadsImported, qualified, paid, sitesLive, revenue: revenue._sum.amount },
    },
  })
}

// Error handlers
enrichmentWorker.on('failed', (job, err) => {
  console.error(`Enrichment job ${job?.id} failed:`, err)
})

personalizationWorker.on('failed', (job, err) => {
  console.error(`Personalization job ${job?.id} failed:`, err)
})

sequenceWorker.on('failed', (job, err) => {
  console.error(`Sequence job ${job?.id} failed:`, err)
})

monitoringWorker.on('failed', (job, err) => {
  console.error(`Monitoring job ${job?.id} failed:`, err)
})

console.log('Workers started successfully')
console.log('- Enrichment worker')
console.log('- Personalization worker')
console.log('- Sequence worker')
console.log('- Monitoring worker')

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('Shutting down workers gracefully...')
  
  await enrichmentWorker.close()
  await personalizationWorker.close()
  await sequenceWorker.close()
  await monitoringWorker.close()
  await connection.quit()
  
  console.log('Workers shut down successfully')
  process.exit(0)
}

process.on('SIGTERM', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)
