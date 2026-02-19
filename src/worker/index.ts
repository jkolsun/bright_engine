import { Worker } from 'bullmq'
import Redis from 'ioredis'
import { enrichLead } from '../lib/serpapi'
import { fetchSerperResearch } from '../lib/serper'
import { generatePersonalization } from '../lib/personalization'
import { generatePreview } from '../lib/preview-generator'
import { generateRepScript } from '../lib/rep-scripts'
import { distributeLead } from '../lib/distribution'
import { calculateEngagementScore } from '../lib/engagement-scoring'
import { generateRetentionMessage } from '../lib/retention-messages'
import { prisma } from '../lib/db'
import { sendSMS } from '../lib/twilio'
import { sendEmail, getEmailTemplate, triggerReferralSequence } from '../lib/resend'
import { routeAndSend } from '../lib/channel-router'
import { canSendMessage } from '../lib/utils'
import { addPreviewGenerationJob, addPersonalizationJob, addScriptGenerationJob, addDistributionJob, getSharedConnection } from './queue'

async function startWorkers() {
  try {
    // Test Redis connection with timeout
    const testConnection = new Redis(process.env.REDIS_URL || process.env.REDIS_HOST || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
      connectTimeout: 5000,
      lazyConnect: true,
    })

    try {
      await testConnection.connect()
      await testConnection.ping()
      await testConnection.quit()
      console.log('Redis connected. Starting workers...')
    } catch (err) {
      console.warn('Redis unavailable, skipping worker initialization:', err instanceof Error ? err.message : String(err))
      return // Exit gracefully if Redis not available
    }

    // Use shared Redis connection from queue.ts to avoid connection mismatch
    const connection = getSharedConnection()
    console.log('[WORKER-INIT] Shared connection status:', {
      exists: !!connection,
      status: connection?.status,
      readyState: connection?.options?.connectTimeout
    })
    
    if (!connection) {
      console.error('[WORKER-INIT] No shared Redis connection available, workers cannot start')
      return
    }
    
    console.log('[WORKER-INIT] Using shared Redis connection for workers, testing connection...')
    
    try {
      const pong = await connection.ping()
      console.log('[WORKER-INIT] Connection test successful:', pong)
    } catch (err) {
      console.error('[WORKER-INIT] Connection test failed:', err)
      return
    }

    // Enrichment worker
    console.log('[WORKER-INIT] Creating enrichment worker with connection...')
    const enrichmentWorker = new Worker(
      'enrichment',
      async (job) => {
        console.log(`🚀 [ENRICHMENT] Processing job ${job.id} for lead ${job.data.leadId}`)
        const { leadId } = job.data
        
        await enrichLead(leadId)
        
        console.log(`✅ [ENRICHMENT] Completed job ${job.id} for lead ${leadId}`)
        return { success: true }
      },
      // @ts-ignore bullmq has vendored ioredis that conflicts with root ioredis - compatible at runtime
      { connection }
    )
    
    console.log('[WORKER-INIT] Enrichment worker created successfully')
    
    // Add enrichment worker event listeners
    enrichmentWorker.on('ready', () => {
      console.log('🟢 [ENRICHMENT] Worker is ready and listening for jobs')
    })
    
    enrichmentWorker.on('active', (job) => {
      console.log(`🏃 [ENRICHMENT] Job ${job.id} started processing`)
    })

    // Preview worker
    const previewWorker = new Worker(
      'preview',
      async (job) => {
        console.log(`Processing preview job: ${job.id}`)
        const { leadId } = job.data
        return await generatePreview({ leadId })
      },
      // @ts-ignore bullmq has vendored ioredis that conflicts with root ioredis - compatible at runtime
      { connection }
    )

    // Personalization worker
    const personalizationWorker = new Worker(
      'personalization',
      async (job) => {
        console.log(`Processing personalization job: ${job.id}`)
        const { leadId } = job.data
        // Step 1: Serper web research (enhances quality, non-fatal if fails)
        try { await fetchSerperResearch(leadId) } catch (e) { console.warn('Serper research failed, continuing:', e) }
        // Step 2: AI personalization (required)
        const result = await generatePersonalization(leadId)
        return { success: true, result }
      },
      // @ts-ignore bullmq has vendored ioredis that conflicts with root ioredis - compatible at runtime
      { connection }
    )

    // Script worker
    const scriptWorker = new Worker(
      'scripts',
      async (job) => {
        console.log(`Processing script job: ${job.id}`)
        const { leadId } = job.data
        const script = await generateRepScript(leadId)
        return { success: !!script }
      },
      // @ts-ignore bullmq has vendored ioredis that conflicts with root ioredis - compatible at runtime
      { connection }
    )

    // Distribution worker
    const distributionWorker = new Worker(
      'distribution',
      async (job) => {
        console.log(`Processing distribution job: ${job.id}`)
        const { leadId, channel } = job.data
        return await distributeLead({ leadId, channel: channel || 'BOTH' })
      },
      // @ts-ignore bullmq has vendored ioredis that conflicts with root ioredis - compatible at runtime
      { connection }
    )

    // Chain: enrichment → preview → personalization → scripts → distribution
    enrichmentWorker.on('completed', async (job) => {
      if (job?.data?.leadId) await addPreviewGenerationJob({ leadId: job.data.leadId })
    })

    previewWorker.on('completed', async (job) => {
      if (job?.data?.leadId) await addPersonalizationJob({ leadId: job.data.leadId })
    })

    personalizationWorker.on('completed', async (job) => {
      if (job?.data?.leadId) await addScriptGenerationJob({ leadId: job.data.leadId })
    })

    scriptWorker.on('completed', async (job) => {
      if (job?.data?.leadId) await addDistributionJob({ leadId: job.data.leadId, channel: 'BOTH' })
    })

    // After distribution completes, calculate engagement score
    distributionWorker.on('completed', async (job) => {
      if (job?.data?.leadId) {
        try { await calculateEngagementScore(job.data.leadId) } catch (e) { console.warn('Engagement calc failed:', e) }
      }
    })

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

          // ── Email Sequences ───────────────────────────
          case 'onboarding-welcome-email':
            await sendOnboardingWelcomeEmail(job.data.clientId)
            break
          case 'onboarding-nudge-email':
            await sendOnboardingNudgeEmail(job.data.clientId)
            break
          case 'post-launch-day-3-email':
            await sendPostLaunchDay3Email(job.data.clientId)
            break
          case 'post-launch-day-7-email':
            await sendPostLaunchDay7Email(job.data.clientId)
            break
          case 'post-launch-day-14-email':
            await sendPostLaunchDay14Email(job.data.clientId)
            break
          case 'post-launch-day-21-email':
            await sendPostLaunchDay21Email(job.data.clientId)
            break
          case 'post-launch-day-28-email':
            await sendPostLaunchDay28Email(job.data.clientId)
            break
          case 'win-back-day-7-email':
            await sendWinBackDay7Email(job.data.clientId)
            break
          case 'win-back-day-14-email':
            await sendWinBackDay14Email(job.data.clientId)
            break
          case 'win-back-day-30-email':
            await sendWinBackDay30Email(job.data.clientId)
            break
          case 'referral-day-45-email':
            await sendReferralDay45Email(job.data.clientId)
            break
          case 'referral-day-90-email':
            await sendReferralDay90Email(job.data.clientId)
            break
          case 'referral-day-180-email':
            await sendReferralDay180Email(job.data.clientId)
            break

          default:
            console.log(`Unknown sequence: ${job.name}`)
        }
        
        return { success: true }
      },
      // @ts-ignore bullmq has vendored ioredis that conflicts with root ioredis - compatible at runtime
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

          case 'close-engine-stall-check':
            await closeEngineStallCheck()
            break

          case 'close-engine-payment-followup':
            await closeEnginePaymentFollowUp()
            break

          case 'close-engine-expire-stalled':
            await closeEngineExpireStalled()
            break

          default:
            console.log(`Unknown monitoring job: ${job.name}`)
        }
        
        return { success: true }
      },
      // @ts-ignore bullmq has vendored ioredis that conflicts with root ioredis - compatible at runtime
      { connection }
    )

    // Error handlers
    enrichmentWorker.on('failed', (job, err) => {
      console.error(`Enrichment job ${job?.id} failed:`, err)
    })

    previewWorker.on('failed', (job, err) => {
      console.error(`Preview job ${job?.id} failed:`, err)
    })

    personalizationWorker.on('failed', (job, err) => {
      console.error(`Personalization job ${job?.id} failed:`, err)
    })

    scriptWorker.on('failed', (job, err) => {
      console.error(`Script job ${job?.id} failed:`, err)
    })

    distributionWorker.on('failed', (job, err) => {
      console.error(`Distribution job ${job?.id} failed:`, err)
    })

    sequenceWorker.on('failed', (job, err) => {
      console.error(`Sequence job ${job?.id} failed:`, err)
    })

    monitoringWorker.on('failed', (job, err) => {
      console.error(`Monitoring job ${job?.id} failed:`, err)
    })

    console.log('Workers started successfully')
    console.log('- Enrichment worker')
    console.log('- Preview worker')
    console.log('- Personalization worker')
    console.log('- Script worker')
    console.log('- Distribution worker')
    console.log('- Sequence worker')
    console.log('- Monitoring worker')

    // Graceful shutdown
    const gracefulShutdown = async () => {
      console.log('Shutting down workers gracefully...')
      
      await enrichmentWorker.close()
      await previewWorker.close()
      await personalizationWorker.close()
      await scriptWorker.close()
      await distributionWorker.close()
      await sequenceWorker.close()
      await monitoringWorker.close()
      // Don't quit shared connection - other parts of system may use it
      // await connection?.quit()
      
      console.log('Workers shut down successfully')
      process.exit(0)
    }

    process.on('SIGTERM', gracefulShutdown)
    process.on('SIGINT', gracefulShutdown)

    console.log('All workers started successfully')
  } catch (error) {
    console.warn('Redis not available. Workers not started. Pipeline runs synchronously.', error)
    process.exit(0)
  }
}

// ============================================
// SEQUENCE FUNCTIONS
// ============================================

// Generic AI-powered touchpoint sender (routes via channel router)
async function sendAdaptiveTouchpoint(clientId: string, touchpointDay: number, nextTouchpoint?: string, nextDaysOffset?: number) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { lead: true },
  })

  if (!client || !client.lead) return

  if (!canSendMessage(client.lead.timezone || 'America/New_York')) return

  try {
    // Load custom guidance from settings if available
    const settings = await prisma.settings.findFirst({ where: { key: 'client_sequences' } })
    const clientSeq = settings?.value
      ? (typeof settings.value === 'string' ? JSON.parse(settings.value as string) : settings.value)
      : null
    const guidance = clientSeq?.touchpointGuidance?.[touchpointDay] || undefined

    const { message } = await generateRetentionMessage(clientId, touchpointDay, guidance)

    await routeAndSend({
      clientId: client.id,
      trigger: `post_launch_day_${touchpointDay}`,
      messageContent: message,
      to: client.lead.phone,
      toEmail: client.lead.email || client.email || undefined,
      sender: 'system',
    })
  } catch (error) {
    console.error(`[RETENTION] AI message failed for day ${touchpointDay}:`, error)
  }

  if (nextTouchpoint && nextDaysOffset) {
    await prisma.client.update({
      where: { id: clientId },
      data: { nextTouchpoint, nextTouchpointDate: new Date(Date.now() + nextDaysOffset * 24 * 60 * 60 * 1000) },
    })
  }
}

// AI-enhanced version: sends a pre-generated message instead of calling generateRetentionMessage
async function sendAdaptiveTouchpointWithMessage(clientId: string, message: string, nextTouchpoint?: string, nextDaysOffset?: number) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { lead: true },
  })

  if (!client || !client.lead) return

  if (!canSendMessage(client.lead.timezone || 'America/New_York')) return

  try {
    await routeAndSend({
      clientId: client.id,
      trigger: 'post_launch_ai_touchpoint',
      messageContent: message,
      to: client.lead.phone,
      toEmail: client.lead.email || client.email || undefined,
      sender: 'system',
    })
  } catch (error) {
    console.error('[RETENTION] AI touchpoint send failed:', error)
  }

  if (nextTouchpoint && nextDaysOffset) {
    await prisma.client.update({
      where: { id: clientId },
      data: { nextTouchpoint, nextTouchpointDate: new Date(Date.now() + nextDaysOffset * 24 * 60 * 60 * 1000) },
    })
  }
}

async function sendPostLaunchDay3(clientId: string) {
  try {
    const { generateTouchpointMessage } = await import('../lib/post-client-engine')
    const aiMessage = await generateTouchpointMessage(clientId, 'post_launch_day_3')
    if (aiMessage) {
      await sendAdaptiveTouchpointWithMessage(clientId, aiMessage, 'day_7', 4)
      return
    }
  } catch { /* fall through to default */ }
  await sendAdaptiveTouchpoint(clientId, 3, 'day_7', 4)
}

async function sendPostLaunchDay7(clientId: string) {
  try {
    const { generateTouchpointMessage } = await import('../lib/post-client-engine')
    const aiMessage = await generateTouchpointMessage(clientId, 'post_launch_day_7')
    if (aiMessage) {
      await sendAdaptiveTouchpointWithMessage(clientId, aiMessage, 'day_14', 7)
      return
    }
  } catch { /* fall through to default */ }
  await sendAdaptiveTouchpoint(clientId, 7, 'day_14', 7)
}

async function sendPostLaunchDay28(clientId: string) {
  try {
    const { generateTouchpointMessage } = await import('../lib/post-client-engine')
    const aiMessage = await generateTouchpointMessage(clientId, 'post_launch_day_28')
    if (aiMessage) {
      await sendAdaptiveTouchpointWithMessage(clientId, aiMessage)
    } else {
      await sendAdaptiveTouchpoint(clientId, 30)
    }
  } catch {
    await sendAdaptiveTouchpoint(clientId, 30)
  }
  // Also notify for upsell conversation
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

  await routeAndSend({
    clientId: client.id,
    trigger: 'win_back_day_7',
    messageContent: `Your hosting was cancelled. ${client.companyName}'s site goes offline in 7 days. Reply "keep it" to reactivate.`,
    urgency: 'high',
    to: client.lead.phone,
    toEmail: client.lead.email || client.email || undefined,
    sender: 'system',
  })
}

async function sendReferralDay45(clientId: string) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { lead: true },
  })

  if (!client || !client.lead) return

  let messageContent = `Know a business owner who needs a site? Refer them, you both get a free month of hosting.`

  try {
    const { generateTouchpointMessage } = await import('../lib/post-client-engine')
    const aiMessage = await generateTouchpointMessage(clientId, 'referral_day_45')
    if (aiMessage) messageContent = aiMessage
  } catch { /* use default */ }

  await routeAndSend({
    clientId: client.id,
    trigger: 'referral_day_45',
    messageContent,
    to: client.lead.phone,
    toEmail: client.lead.email || client.email || undefined,
    sender: 'system',
  })
}

// ============================================
// EMAIL SEQUENCE FUNCTIONS
// ============================================

async function sendOnboardingWelcomeEmail(clientId: string) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { lead: true },
  })
  if (!client || !client.lead || !client.lead.email) return

  const template = await getEmailTemplate('onboarding_welcome', {
    first_name: client.lead.firstName,
    company_name: client.companyName,
  })
  if (!template) return

  await sendEmail({
    to: client.lead.email,
    subject: template.subject,
    html: template.body,
    clientId: client.id,
    trigger: 'onboarding_welcome',
  })
}

async function sendOnboardingNudgeEmail(clientId: string) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { lead: true },
  })
  if (!client || !client.lead || !client.lead.email) return

  const template = await getEmailTemplate('onboarding_nudge', {
    first_name: client.lead.firstName,
    company_name: client.companyName,
  })
  if (!template) return

  await sendEmail({
    to: client.lead.email,
    subject: template.subject,
    html: template.body,
    clientId: client.id,
    trigger: 'onboarding_nudge',
  })
}

async function sendPostLaunchDay3Email(clientId: string) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { lead: true },
  })
  if (!client || !client.lead || !client.lead.email) return

  const template = await getEmailTemplate('post_launch_day_3', {
    first_name: client.lead.firstName,
    company_name: client.companyName,
  })
  if (!template) return

  await sendEmail({
    to: client.lead.email,
    subject: template.subject,
    html: template.body,
    clientId: client.id,
    trigger: 'post_launch_day_3',
  })
}

async function sendPostLaunchDay7Email(clientId: string) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { lead: true, analytics: true },
  })
  if (!client || !client.lead || !client.lead.email) return

  const analytics = client.analytics
  const template = await getEmailTemplate('post_launch_day_7', {
    first_name: client.lead.firstName,
    company_name: client.companyName,
    visits: String(analytics?.totalVisits ?? '—'),
    forms: String(analytics?.totalForms ?? '—'),
  })
  if (!template) return

  await sendEmail({
    to: client.lead.email,
    subject: template.subject,
    html: template.body,
    clientId: client.id,
    trigger: 'post_launch_day_7',
  })
}

async function sendPostLaunchDay14Email(clientId: string) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { lead: true, analytics: true },
  })
  if (!client || !client.lead || !client.lead.email) return

  const source = client.analytics?.topTrafficSource || 'Google'
  const template = await getEmailTemplate('post_launch_day_14', {
    first_name: client.lead.firstName,
    company_name: client.companyName,
    source,
  })
  if (!template) return

  await sendEmail({
    to: client.lead.email,
    subject: template.subject,
    html: template.body,
    clientId: client.id,
    trigger: 'post_launch_day_14',
  })
}

async function sendPostLaunchDay21Email(clientId: string) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { lead: true, analytics: true },
  })
  if (!client || !client.lead || !client.lead.email) return

  const analytics = client.analytics
  const avgTime = analytics?.avgResponseTime
    ? `${analytics.avgResponseTime} minutes`
    : 'over an hour'
  const template = await getEmailTemplate('post_launch_day_21', {
    first_name: client.lead.firstName,
    company_name: client.companyName,
    leads: String(analytics?.totalForms ?? '—'),
    time: avgTime,
  })
  if (!template) return

  await sendEmail({
    to: client.lead.email,
    subject: template.subject,
    html: template.body,
    clientId: client.id,
    trigger: 'post_launch_day_21',
  })
}

async function sendPostLaunchDay28Email(clientId: string) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { lead: true, analytics: true },
  })
  if (!client || !client.lead || !client.lead.email) return

  const analytics = client.analytics
  const template = await getEmailTemplate('post_launch_day_28', {
    first_name: client.lead.firstName,
    company_name: client.companyName,
    visits: String(analytics?.totalVisits ?? '—'),
    forms: String(analytics?.totalForms ?? '—'),
    calls: String(analytics?.totalCalls ?? '—'),
  })
  if (!template) return

  await sendEmail({
    to: client.lead.email,
    subject: template.subject,
    html: template.body,
    clientId: client.id,
    trigger: 'post_launch_day_28',
  })

  // Kick off referral sequence after day-28 email
  await triggerReferralSequence(clientId)
}

async function sendWinBackDay7Email(clientId: string) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { lead: true },
  })
  if (!client || !client.lead || !client.lead.email) return

  const template = await getEmailTemplate('win_back_day_7', {
    first_name: client.lead.firstName,
    company_name: client.companyName,
  })
  if (!template) return

  await sendEmail({
    to: client.lead.email,
    subject: template.subject,
    html: template.body,
    clientId: client.id,
    trigger: 'win_back_day_7',
  })
}

async function sendWinBackDay14Email(clientId: string) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { lead: true },
  })
  if (!client || !client.lead || !client.lead.email) return

  const template = await getEmailTemplate('win_back_day_14', {
    first_name: client.lead.firstName,
    company_name: client.companyName,
  })
  if (!template) return

  await sendEmail({
    to: client.lead.email,
    subject: template.subject,
    html: template.body,
    clientId: client.id,
    trigger: 'win_back_day_14',
  })
}

async function sendWinBackDay30Email(clientId: string) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { lead: true },
  })
  if (!client || !client.lead || !client.lead.email) return

  const template = await getEmailTemplate('win_back_day_30', {
    first_name: client.lead.firstName,
    company_name: client.companyName,
  })
  if (!template) return

  await sendEmail({
    to: client.lead.email,
    subject: template.subject,
    html: template.body,
    clientId: client.id,
    trigger: 'win_back_day_30',
  })
}

async function sendReferralDay45Email(clientId: string) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { lead: true },
  })
  if (!client || !client.lead || !client.lead.email) return

  const template = await getEmailTemplate('referral_day_45', {
    first_name: client.lead.firstName,
    company_name: client.companyName,
  })
  if (!template) return

  await sendEmail({
    to: client.lead.email,
    subject: template.subject,
    html: template.body,
    clientId: client.id,
    trigger: 'referral_day_45',
  })
}

async function sendReferralDay90Email(clientId: string) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { lead: true },
  })
  if (!client || !client.lead || !client.lead.email) return

  const template = await getEmailTemplate('referral_day_90', {
    first_name: client.lead.firstName,
    company_name: client.companyName,
    industry: client.industry,
  })
  if (!template) return

  await sendEmail({
    to: client.lead.email,
    subject: template.subject,
    html: template.body,
    clientId: client.id,
    trigger: 'referral_day_90',
  })
}

async function sendReferralDay180Email(clientId: string) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { lead: true, analytics: true },
  })
  if (!client || !client.lead || !client.lead.email) return

  const template = await getEmailTemplate('referral_day_180', {
    first_name: client.lead.firstName,
    company_name: client.companyName,
    leads: String(client.analytics?.totalForms ?? '—'),
  })
  if (!template) return

  await sendEmail({
    to: client.lead.email,
    subject: template.subject,
    html: template.body,
    clientId: client.id,
    trigger: 'referral_day_180',
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

// ============================================
// CLOSE ENGINE WORKER FUNCTIONS
// ============================================

async function closeEngineStallCheck() {
  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000)
  const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000)

  const activeStages = ['QUALIFYING', 'COLLECTING_INFO', 'PREVIEW_SENT', 'EDIT_LOOP']

  const conversations = await prisma.closeEngineConversation.findMany({
    where: {
      stage: { in: activeStages },
    },
    include: {
      lead: true,
    },
  })

  for (const conv of conversations) {
    // Find last inbound message
    const lastInbound = await prisma.message.findFirst({
      where: { leadId: conv.leadId, direction: 'INBOUND' },
      orderBy: { createdAt: 'desc' },
    })

    if (!lastInbound) continue

    // Check if we already sent a nudge recently (last 4 hours)
    const lastNudge = await prisma.message.findFirst({
      where: {
        leadId: conv.leadId,
        direction: 'OUTBOUND',
        trigger: { startsWith: 'close_engine_nudge' },
        createdAt: { gte: fourHoursAgo },
      },
    })
    if (lastNudge) continue

    // Respect timezone: only nudge 8 AM - 9 PM
    if (!canSendMessage(conv.lead.timezone || 'America/New_York')) continue

    if (lastInbound.createdAt < seventyTwoHoursAgo) {
      // 72+ hours — mark STALLED
      await prisma.closeEngineConversation.update({
        where: { id: conv.id },
        data: { stage: 'STALLED', stalledAt: new Date() },
      })
      await prisma.notification.create({
        data: {
          type: 'CLOSE_ENGINE',
          title: 'Close Engine — Lead Stalled',
          message: `${conv.lead.firstName} at ${conv.lead.companyName} hasn't responded in 72+ hours`,
          metadata: { conversationId: conv.id, leadId: conv.leadId },
        },
      })
    } else if (lastInbound.createdAt < fourHoursAgo) {
      // 4-72 hours — send nudge via Close Engine processor
      try {
        const { processCloseEngineInbound } = await import('../lib/close-engine-processor')
        await processCloseEngineInbound(conv.id, '[SYSTEM: Lead has not responded in 4+ hours. Send a friendly follow-up nudge.]')
      } catch (err) {
        console.error(`[Worker] Nudge failed for ${conv.id}:`, err)
      }
    }
  }
}

async function closeEnginePaymentFollowUp() {
  const conversations = await prisma.closeEngineConversation.findMany({
    where: { stage: 'PAYMENT_SENT' },
    include: { lead: true },
  })

  for (const conv of conversations) {
    if (!conv.paymentLinkSentAt) continue

    const hoursSinceSent = (Date.now() - conv.paymentLinkSentAt.getTime()) / (1000 * 60 * 60)

    // Get follow-up message for this time threshold
    const { getPaymentFollowUpMessage } = await import('../lib/close-engine-payment')
    const followUpMsg = getPaymentFollowUpMessage(hoursSinceSent, conv.lead.firstName)

    if (!followUpMsg) continue // Too soon

    // Determine which threshold we're at
    const threshold = hoursSinceSent >= 72 ? '72h' : hoursSinceSent >= 48 ? '48h' : hoursSinceSent >= 24 ? '24h' : '4h'

    // Check if we already sent this threshold's follow-up
    const existingFollowUp = await prisma.message.findFirst({
      where: {
        leadId: conv.leadId,
        trigger: `close_engine_payment_followup_${threshold}`,
      },
    })
    if (existingFollowUp) continue // Already sent

    // Respect timezone
    if (!canSendMessage(conv.lead.timezone || 'America/New_York')) continue

    // Send
    try {
      const { sendSMSViaProvider } = await import('../lib/sms-provider')
      await sendSMSViaProvider({
        to: conv.lead.phone,
        message: followUpMsg,
        leadId: conv.leadId,
        trigger: `close_engine_payment_followup_${threshold}`,
        aiGenerated: true,
        conversationType: 'pre_client',
        sender: 'clawdbot',
      })
    } catch (smsErr) {
      console.error(`[Worker] Payment follow-up SMS failed for ${conv.id}:`, smsErr)
      continue
    }

    // At 72h+, also mark STALLED
    if (hoursSinceSent >= 72) {
      await prisma.closeEngineConversation.update({
        where: { id: conv.id },
        data: { stage: 'STALLED', stalledAt: new Date() },
      })
    }
  }
}

async function closeEngineExpireStalled() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const stalled = await prisma.closeEngineConversation.findMany({
    where: {
      stage: 'STALLED',
      stalledAt: { lt: sevenDaysAgo },
    },
    include: { lead: true },
  })

  for (const conv of stalled) {
    await prisma.closeEngineConversation.update({
      where: { id: conv.id },
      data: {
        stage: 'CLOSED_LOST',
        closedLostAt: new Date(),
        closedLostReason: 'No response after 7 days',
      },
    })
    await prisma.lead.update({
      where: { id: conv.leadId },
      data: { status: 'CLOSED_LOST' },
    })
  }

  if (stalled.length > 0) {
    await prisma.notification.create({
      data: {
        type: 'CLOSE_ENGINE',
        title: 'Close Engine — Expired Conversations',
        message: `${stalled.length} conversation(s) expired after 7 days of no response`,
        metadata: { count: stalled.length, leadIds: stalled.map(s => s.leadId) },
      },
    })
  }
}

export { startWorkers }

// Only auto-start when run directly via `npm run worker` (tsx src/worker/index.ts)
// Do NOT start when imported by Next.js API routes (causes SIGSEGV in web process)
if (process.argv[1]?.includes('worker/index')) {
  startWorkers()
}