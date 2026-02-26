import { Worker } from 'bullmq'
import Redis from 'ioredis'
import http from 'http'
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
import { canSendMessage, getTimezoneFromState } from '../lib/utils'
import { addPreviewGenerationJob, addPersonalizationJob, addScriptGenerationJob, addDistributionJob, getSharedConnection, type DelayedMessageJobData } from './queue'

// ── Delayed Message Handler (fixes BUG 8.1, NEW-C1, NEW-C9) ──
async function handleDelayedMessage(data: DelayedMessageJobData) {
  switch (data.type) {
    case 'close-engine-message': {
      const { sendCloseEngineMessage } = await import('../lib/close-engine-processor')
      await sendCloseEngineMessage(data.options)
      if (data.postSendTransition) {
        const { transitionStage } = await import('../lib/close-engine')
        await transitionStage(data.postSendTransition.conversationId, data.postSendTransition.stage)
      }
      break
    }
    case 'sms-message': {
      const { sendSMSViaProvider } = await import('../lib/sms-provider')
      await sendSMSViaProvider(data.options)
      break
    }
    case 'payment-link': {
      const { sendPaymentLink } = await import('../lib/close-engine-payment')
      await sendPaymentLink(data.conversationId)
      break
    }
    default:
      console.error('[Worker] Unknown delayed message type:', (data as any).type)
  }
}

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
        const stepStart = Date.now()

        // Dedup: skip if already enriched (BUG 9.4)
        const existingLead = await prisma.lead.findUnique({
          where: { id: leadId },
          select: { enrichedAddress: true, enrichedRating: true, enrichedServices: true },
        })
        if (existingLead?.enrichedAddress || existingLead?.enrichedRating || (existingLead?.enrichedServices && Array.isArray(existingLead.enrichedServices) && (existingLead.enrichedServices as unknown[]).length > 0)) {
          console.log(`[ENRICHMENT] Lead ${leadId} already enriched — skipping`)
          return { success: true, skipped: true }
        }

        // Mark build started
        await prisma.lead.update({
          where: { id: leadId },
          data: { buildStep: 'ENRICHMENT', buildStartedAt: new Date(), buildError: null, buildCompletedAt: null },
        }).catch(err => console.error('[Worker] Build step update failed:', err))

        await enrichLead(leadId)

        // Record step timing
        await prisma.lead.update({
          where: { id: leadId },
          data: { buildEnrichmentMs: Date.now() - stepStart },
        }).catch(err => console.error('[Worker] Enrichment timing write failed:', err))

        console.log(`✅ [ENRICHMENT] Completed job ${job.id} for lead ${leadId}`)
        return { success: true }
      },
      // @ts-ignore bullmq has vendored ioredis that conflicts with root ioredis - compatible at runtime
      { connection, concurrency: 3 }
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
        const stepStart = Date.now()
        await prisma.lead.update({ where: { id: leadId }, data: { buildStep: 'PREVIEW' } }).catch(err => console.error('[Worker] Build step update failed:', err))
        const result = await generatePreview({ leadId })
        await prisma.lead.update({ where: { id: leadId }, data: { buildPreviewMs: Date.now() - stepStart } }).catch(err => console.error('[Worker] Preview timing write failed:', err))
        return result
      },
      // @ts-ignore bullmq has vendored ioredis that conflicts with root ioredis - compatible at runtime
      { connection, concurrency: 3 }
    )

    // Personalization worker
    const personalizationWorker = new Worker(
      'personalization',
      async (job) => {
        console.log(`Processing personalization job: ${job.id}`)
        const { leadId } = job.data
        const stepStart = Date.now()
        await prisma.lead.update({ where: { id: leadId }, data: { buildStep: 'PERSONALIZATION' } }).catch(err => console.error('[Worker] Build step update failed:', err))
        // Step 1: Serper web research (enhances quality, non-fatal if fails)
        try { await fetchSerperResearch(leadId) } catch (e) { console.warn('Serper research failed, continuing:', e) }
        // Step 2: AI personalization (required)
        const result = await generatePersonalization(leadId)
        await prisma.lead.update({ where: { id: leadId }, data: { buildPersonalizationMs: Date.now() - stepStart } }).catch(err => console.error('[Worker] Personalization timing write failed:', err))
        return { success: true, result }
      },
      // @ts-ignore bullmq has vendored ioredis that conflicts with root ioredis - compatible at runtime
      { connection, concurrency: 3 }
    )

    // Script worker
    const scriptWorker = new Worker(
      'scripts',
      async (job) => {
        console.log(`Processing script job: ${job.id}`)
        const { leadId } = job.data
        const stepStart = Date.now()
        await prisma.lead.update({ where: { id: leadId }, data: { buildStep: 'SCRIPTS' } }).catch(err => console.error('[Worker] Build step update failed:', err))
        const script = await generateRepScript(leadId)
        await prisma.lead.update({ where: { id: leadId }, data: { buildScriptsMs: Date.now() - stepStart } }).catch(err => console.error('[Worker] Scripts timing write failed:', err))
        return { success: !!script }
      },
      // @ts-ignore bullmq has vendored ioredis that conflicts with root ioredis - compatible at runtime
      { connection, concurrency: 2 }
    )

    // Distribution worker
    const distributionWorker = new Worker(
      'distribution',
      async (job) => {
        console.log(`Processing distribution job: ${job.id}`)
        const { leadId, channel } = job.data
        const stepStart = Date.now()
        await prisma.lead.update({ where: { id: leadId }, data: { buildStep: 'DISTRIBUTION' } }).catch(err => console.error('[Worker] Build step update failed:', err))
        const result = await distributeLead({ leadId, channel: channel || 'BOTH' })
        await prisma.lead.update({ where: { id: leadId }, data: { buildDistributionMs: Date.now() - stepStart } }).catch(err => console.error('[Worker] Distribution timing write failed:', err))
        return result
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
      if (!job?.data?.leadId) return
      const leadId = job.data.leadId

      // Check if this is a close-engine lead (has active conversation)
      // Close-engine leads skip scripts/distribution — they go straight to QA
      const closeConvo = await prisma.closeEngineConversation.findUnique({
        where: { leadId },
        select: { id: true },
      }).catch(() => null)

      if (closeConvo) {
        // Close-engine lead: skip scripts/distribution, mark complete, auto-transition to QA
        console.log(`[WORKER] Close-engine lead ${leadId} — skipping scripts/distribution, transitioning to QA`)
        await prisma.lead.update({
          where: { id: leadId },
          data: { buildStep: 'COMPLETE', buildCompletedAt: new Date() },
        }).catch(err => console.error('[Worker] Build complete update failed:', err))

        // Run readiness check — with enrichment + personalization done, score should be 70+
        try {
          const { checkAndTransitionToQA } = await import('../lib/build-readiness')
          const readiness = await checkAndTransitionToQA(leadId)
          console.log(`[WORKER] Close-engine lead ${leadId} readiness: ${readiness?.score}/100`)
        } catch (e) {
          console.warn(`[WORKER] Readiness check failed for ${leadId}:`, e)
        }
      } else {
        // Import lead: continue to scripts as normal
        await addScriptGenerationJob({ leadId })
      }
    })

    scriptWorker.on('completed', async (job) => {
      if (job?.data?.leadId) await addDistributionJob({ leadId: job.data.leadId, channel: 'BOTH' })
    })

    // After distribution completes, mark build done + calculate engagement score + readiness check
    distributionWorker.on('completed', async (job) => {
      if (job?.data?.leadId) {
        const leadId = job.data.leadId
        await prisma.lead.update({
          where: { id: leadId },
          data: { buildStep: 'COMPLETE', buildCompletedAt: new Date() },
        }).catch(err => console.error('[Worker] Build complete update failed:', err))
        try { await calculateEngagementScore(leadId) } catch (e) { console.warn('Engagement calc failed:', e) }

        // Run readiness check for import leads too — auto-transition to QA if ready
        try {
          const { checkAndTransitionToQA } = await import('../lib/build-readiness')
          await checkAndTransitionToQA(leadId)
        } catch (e) {
          console.warn(`[WORKER] Readiness check failed for ${leadId}:`, e)
        }
      }
    })

    // Import processing worker (processes leads in background after CSV upload)
    const IMPORT_LOCK_DURATION = 600_000 // 10 minutes — prevents BullMQ stall detection from killing long imports
    const importWorker = new Worker(
      'import',
      async (job) => {
        const { jobId, leadIds, options } = job.data as {
          jobId: string
          leadIds: string[]
          options: { enrichment: boolean; preview: boolean; personalization: boolean }
        }
        console.log(`[IMPORT] Processing ${leadIds.length} leads for job ${jobId}`)

        const redisConn = getSharedConnection()

        // Checkpoint/resume: check if a previous attempt already processed some leads
        let existingProgress: any = null
        if (redisConn) {
          try {
            const existing = await redisConn.get(`import:${jobId}`)
            if (existing) existingProgress = JSON.parse(existing)
          } catch { /* start fresh */ }
        }

        const progress: {
          status: string
          processed: number
          total: number
          failed: number
          errors: string[]
          results: Record<string, { enrichment?: boolean; preview?: boolean; personalization?: boolean }>
          rateLimitHit?: boolean
          rateLimitMessage?: string
        } = {
          status: 'processing',
          processed: existingProgress?.processed || 0,
          total: leadIds.length,
          failed: existingProgress?.failed || 0,
          errors: (existingProgress?.errors || []) as string[],
          results: (existingProgress?.results || {}) as Record<string, { enrichment?: boolean; preview?: boolean; personalization?: boolean }>,
        }

        // Rate limit flag — when SerpAPI daily limit is hit, skip enrichment for all remaining leads
        let skipEnrichment = existingProgress?.rateLimitHit || false

        // Determine where to resume from (skip already-processed leads on retry)
        const startIndex = existingProgress?.processed || 0
        if (startIndex > 0) {
          console.log(`[IMPORT] Resuming job ${jobId} from lead ${startIndex}/${leadIds.length}`)
        }

        const updateProgress = async () => {
          if (redisConn) {
            await redisConn.set(`import:${jobId}`, JSON.stringify(progress), 'EX', 7200).catch(err => console.error('[Worker] Redis progress write failed:', err))
          }
        }

        // Batch size: read from env, default 5, clamp 1-10
        const batchSize = Math.max(1, Math.min(10, parseInt(process.env.IMPORT_BATCH_SIZE || '5', 10) || 5))
        console.log(`[IMPORT] Using batch size ${batchSize} for ${leadIds.length - startIndex} remaining leads`)

        for (let batchStart = startIndex; batchStart < leadIds.length; batchStart += batchSize) {
          const batchEnd = Math.min(batchStart + batchSize, leadIds.length)
          const batchLeadIds = leadIds.slice(batchStart, batchEnd)

          // Extend the BullMQ lock before each batch to prevent stall detection
          try {
            await job.extendLock(job.token!, IMPORT_LOCK_DURATION)
          } catch (lockErr) {
            console.warn(`[IMPORT] Lock extension failed at batch ${batchStart}:`, lockErr)
          }

          // Process all leads in this batch simultaneously
          const batchPromises = batchLeadIds.map(async (leadId) => {
            const leadResult: { enrichment?: boolean; preview?: boolean; personalization?: boolean } = {}

            const lead = await prisma.lead.findUnique({ where: { id: leadId } })
            if (!lead) {
              return { leadId, success: false as const, error: 'Lead not found' }
            }

            // Enrichment
            if (options.enrichment && !skipEnrichment) {
              try {
                await enrichLead(leadId)
                leadResult.enrichment = true
              } catch (err) {
                const errMsg = err instanceof Error ? err.message : String(err)
                if (errMsg === 'SERPAPI_DAILY_LIMIT_REACHED') {
                  skipEnrichment = true
                  leadResult.enrichment = false
                  progress.rateLimitHit = true
                  progress.rateLimitMessage = 'SerpAPI daily limit reached. Enrichment paused. Remaining leads will process without enrichment or can be retried tomorrow.'
                  console.warn(`[IMPORT] SerpAPI daily limit reached at lead ${leadId}. Skipping enrichment for remaining leads.`)
                } else {
                  leadResult.enrichment = false
                  console.warn(`[IMPORT] Enrichment failed for ${leadId}:`, err)
                }
              }
            } else if (options.enrichment && skipEnrichment) {
              // Rate limit hit earlier — skip enrichment for this lead
              leadResult.enrichment = false
            }

            // Preview generation
            if (options.preview) {
              try {
                await generatePreview({ leadId })
                leadResult.preview = true
              } catch (err) {
                leadResult.preview = false
                console.warn(`[IMPORT] Preview failed for ${leadId}:`, err)
              }
            }

            // Personalization
            if (options.personalization) {
              try {
                try { await fetchSerperResearch(leadId) } catch { /* non-fatal */ }
                const result = await generatePersonalization(leadId)
                leadResult.personalization = !!result
              } catch (err) {
                leadResult.personalization = false
                console.warn(`[IMPORT] Personalization failed for ${leadId}:`, err)
              }
            }

            // Graduation check: if all selected steps succeeded, graduate from IMPORT_STAGING to NEW
            const enrichmentOk = !options.enrichment || skipEnrichment || leadResult.enrichment === true
            const previewOk = !options.preview || leadResult.preview === true
            const personalizationOk = !options.personalization || leadResult.personalization === true

            if (enrichmentOk && previewOk && personalizationOk) {
              try {
                await prisma.lead.update({
                  where: { id: leadId, status: 'IMPORT_STAGING' },
                  data: { status: 'NEW' },
                })
              } catch (gradErr) {
                // Safety: if lead was already graduated or doesn't exist, this is a no-op
                console.warn(`[IMPORT] Graduation update failed for ${leadId}:`, gradErr)
              }
            }

            return { leadId, success: true as const, result: leadResult }
          })

          const batchResults = await Promise.allSettled(batchPromises)

          // Process batch results
          for (const settled of batchResults) {
            if (settled.status === 'fulfilled') {
              if (settled.value.success) {
                progress.results[settled.value.leadId] = settled.value.result
              } else {
                progress.failed++
                progress.errors.push(`Lead ${settled.value.leadId}: ${settled.value.error}`)
              }
            } else {
              progress.failed++
              progress.errors.push(settled.reason instanceof Error ? settled.reason.message : String(settled.reason))
            }
            progress.processed++
          }

          await updateProgress()
        }

        // Mark complete
        progress.status = 'completed'
        await updateProgress()

        // Mark ImportBatch as COMPLETED (no-op if no batch has this jobId)
        try {
          await prisma.importBatch.updateMany({
            where: { jobId },
            data: {
              status: 'COMPLETED',
              completedAt: new Date(),
              processedLeads: progress.processed,
              failedLeads: progress.failed,
            },
          })
        } catch (batchErr) {
          console.warn('[IMPORT] Failed to update ImportBatch completion:', batchErr)
        }

        // Create notification
        await prisma.notification.create({
          data: {
            type: 'DAILY_AUDIT',
            title: 'Import Processing Complete',
            message: `Processed ${progress.processed} leads: ${progress.processed - progress.failed} succeeded, ${progress.failed} failed`,
            metadata: { jobId, total: progress.total, failed: progress.failed },
          },
        }).catch(err => console.error('[Worker] Import notification create failed:', err))

        console.log(`[IMPORT] Job ${jobId} complete: ${progress.processed}/${progress.total}, ${progress.failed} failed`)
        return { success: true }
      },
      // @ts-ignore bullmq has vendored ioredis that conflicts with root ioredis - compatible at runtime
      { connection, concurrency: 1, lockDuration: IMPORT_LOCK_DURATION }
    )

    importWorker.on('failed', (job, err) => {
      console.error(`[IMPORT] Job ${job?.id} failed:`, err)
    })

    // Sequence worker (handles all automated messages)
    const sequenceWorker = new Worker(
      'sequence',
      async (job) => {
        console.log(`Processing sequence job: ${job.name} - ${job.id}`)

        // Gate post-launch sequences behind onboarding completion
        const ONBOARDING_GATED_JOBS = new Set([
          'post-launch-day-3', 'post-launch-day-7', 'post-launch-day-28',
          'win-back-day-7', 'referral-day-45',
          'post-launch-day-3-email', 'post-launch-day-7-email', 'post-launch-day-14-email',
          'post-launch-day-21-email', 'post-launch-day-28-email',
          'win-back-day-7-email', 'win-back-day-14-email', 'win-back-day-30-email',
          'referral-day-45-email', 'referral-day-90-email', 'referral-day-180-email',
        ])
        if (ONBOARDING_GATED_JOBS.has(job.name) && job.data.clientId) {
          try {
            const gateClient = await prisma.client.findUnique({
              where: { id: job.data.clientId },
              select: { onboardingStep: true },
            })
            if (gateClient && gateClient.onboardingStep > 0 && gateClient.onboardingStep < 7) {
              console.log(`[Sequence] Skipping ${job.name} — client onboarding not complete (step ${gateClient.onboardingStep}/7)`)
              return { success: true, skipped: true, reason: 'onboarding_incomplete' }
            }
          } catch (err) {
            console.warn(`[Sequence] Onboarding gate check failed (column may not exist yet), proceeding with job:`, err instanceof Error ? err.message : String(err))
          }
        }

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

          // ── Delayed message sends (BullMQ replaces setTimeout — serverless-safe) ──
          case 'send-delayed-message':
            await handleDelayedMessage(job.data as DelayedMessageJobData)
            break

          // ── Onboarding sequences ──
          case 'onboarding-advance-to-domain':
            await handleOnboardingAdvanceToDomain(job.data.clientId)
            break
          case 'onboarding-gbp-prompt':
            await handleOnboardingGbpPrompt(job.data.clientId)
            break
          case 'onboarding-dns-check':
            await handleOnboardingDnsCheck(job.data.clientId)
            break

          // ── Session Analysis (AI recommendation after session ends) ──
          case 'session-analysis': {
            const { generateSessionAnalysis } = await import('../lib/session-analysis')
            await generateSessionAnalysis(job.data.sessionId)
            break
          }

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

          case 'pending-state-escalation':
            await pendingStateEscalation()
            break

          case 'notification-cleanup':
            await cleanupOldNotifications()
            break

          case 'failed-webhook-retry':
            await retryFailedWebhooks()
            break

          default:
            console.log(`Unknown monitoring job: ${job.name}`)
        }
        
        return { success: true }
      },
      // @ts-ignore bullmq has vendored ioredis that conflicts with root ioredis - compatible at runtime
      { connection }
    )

    // Error handlers — record buildError on the lead for pipeline visibility
    enrichmentWorker.on('failed', async (job, err) => {
      console.error(`Enrichment job ${job?.id} failed:`, err)
      if (job?.data?.leadId) {
        await prisma.lead.update({ where: { id: job.data.leadId }, data: { buildError: `ENRICHMENT: ${err.message}` } }).catch(e => console.error('[Worker] Build error write failed:', e))
      }
    })

    previewWorker.on('failed', async (job, err) => {
      console.error(`Preview job ${job?.id} failed:`, err)
      if (job?.data?.leadId) {
        await prisma.lead.update({ where: { id: job.data.leadId }, data: { buildError: `PREVIEW: ${err.message}` } }).catch(e => console.error('[Worker] Build error write failed:', e))
      }
    })

    personalizationWorker.on('failed', async (job, err) => {
      console.error(`Personalization job ${job?.id} failed:`, err)
      if (job?.data?.leadId) {
        await prisma.lead.update({ where: { id: job.data.leadId }, data: { buildError: `PERSONALIZATION: ${err.message}` } }).catch(e => console.error('[Worker] Build error write failed:', e))
      }
    })

    scriptWorker.on('failed', async (job, err) => {
      console.error(`Script job ${job?.id} failed:`, err)
      if (job?.data?.leadId) {
        await prisma.lead.update({ where: { id: job.data.leadId }, data: { buildError: `SCRIPTS: ${err.message}` } }).catch(e => console.error('[Worker] Build error write failed:', e))
      }
    })

    distributionWorker.on('failed', async (job, err) => {
      console.error(`Distribution job ${job?.id} failed:`, err)
      if (job?.data?.leadId) {
        await prisma.lead.update({ where: { id: job.data.leadId }, data: { buildError: `DISTRIBUTION: ${err.message}` } }).catch(e => console.error('[Worker] Build error write failed:', e))
      }
    })

    sequenceWorker.on('failed', (job, err) => {
      console.error(`Sequence job ${job?.id} failed:`, err)
    })

    monitoringWorker.on('failed', (job, err) => {
      console.error(`Monitoring job ${job?.id} failed:`, err)
    })

    // BUG 9.6: Redis disconnect alert
    connection.on('error', async (err) => {
      console.error('[Worker] Redis connection error:', err)
      await prisma.notification.create({
        data: {
          type: 'DAILY_AUDIT',
          title: 'Redis Connection Error',
          message: `Worker Redis disconnected: ${err.message}`,
          metadata: { timestamp: Date.now() },
        },
      }).catch(() => {})
    })

    // Schedule recurring monitoring jobs
    const { schedulePendingStateEscalation, scheduleNotificationCleanup, scheduleFailedWebhookRetry } = await import('./queue')
    await schedulePendingStateEscalation()
    await scheduleNotificationCleanup()
    await scheduleFailedWebhookRetry()

    // BUG 9.5: Worker health check endpoint
    const healthPort = parseInt(process.env.WORKER_HEALTH_PORT || '3001', 10)
    const healthServer = http.createServer((req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
          status: 'ok',
          workers: 7,
          uptime: process.uptime(),
          redis: connection?.status || 'unknown',
        }))
      } else {
        res.writeHead(404)
        res.end()
      }
    })
    healthServer.listen(healthPort, () => {
      console.log(`[Worker] Health check endpoint listening on port ${healthPort}`)
    })

    console.log('Workers started successfully')
    console.log('- Enrichment worker (concurrency: 3)')
    console.log('- Preview worker (concurrency: 3)')
    console.log('- Personalization worker (concurrency: 3)')
    console.log('- Script worker (concurrency: 2)')
    console.log('- Distribution worker')
    console.log('- Sequence worker')
    console.log('- Monitoring worker (+ pending state escalation every 2h)')

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

  // BUG S.1: Skip post-launch messages if site isn't actually live yet
  if (client.hostingStatus !== 'ACTIVE') {
    console.log(`[Sequence] Skipping day ${touchpointDay} — client ${clientId} hostingStatus is ${client.hostingStatus}, not ACTIVE`)
    return
  }

  // Re-check DNC status right before sending (may have changed since job was queued)
  const freshLead = await prisma.lead.findUnique({ where: { id: client.lead.id }, select: { dncAt: true } })
  if (freshLead?.dncAt) {
    console.log(`[Sequence] Skipping day ${touchpointDay} — lead ${client.lead.id} is now DNC`)
    return
  }

  if (!canSendMessage(client.lead.timezone || getTimezoneFromState(client.lead.state || '') || 'America/New_York')) return

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

  // BUG S.1: Skip post-launch messages if site isn't actually live yet
  if (client.hostingStatus !== 'ACTIVE') {
    console.log(`[Sequence] Skipping AI touchpoint — client ${clientId} hostingStatus is ${client.hostingStatus}, not ACTIVE`)
    return
  }

  // Re-check DNC status right before sending (may have changed since job was queued)
  const freshLead = await prisma.lead.findUnique({ where: { id: client.lead.id }, select: { dncAt: true } })
  if (freshLead?.dncAt) {
    console.log(`[Sequence] Skipping AI touchpoint — lead ${client.lead.id} is now DNC`)
    return
  }

  if (!canSendMessage(client.lead.timezone || getTimezoneFromState(client.lead.state || '') || 'America/New_York')) return

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

  // BUG S.3: Skip win-back if client has reactivated
  if (client.hostingStatus === 'ACTIVE') {
    console.log(`[Sequence] Skipping win-back — client ${clientId} has reactivated (status: ACTIVE)`)
    return
  }

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

  // BUG S.3: Skip win-back if client has reactivated
  if (client.hostingStatus === 'ACTIVE') {
    console.log(`[Sequence] Skipping win-back email day 7 — client ${clientId} reactivated`)
    return
  }

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

  // BUG S.3: Skip win-back if client has reactivated
  if (client.hostingStatus === 'ACTIVE') {
    console.log(`[Sequence] Skipping win-back email day 14 — client ${clientId} reactivated`)
    return
  }

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

  // BUG S.3: Skip win-back if client has reactivated
  if (client.hostingStatus === 'ACTIVE') {
    console.log(`[Sequence] Skipping win-back email day 30 — client ${clientId} reactivated`)
    return
  }

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
    select: { leadId: true },
  })

  // Deduplicate by leadId and recalculate engagement scores
  // The scoring engine handles notifications + SMS when crossing HOT threshold
  const uniqueLeadIds = [...new Set(hotEvents.map(e => e.leadId))]
  for (const leadId of uniqueLeadIds) {
    try { await calculateEngagementScore(leadId) } catch (e) { console.warn('[Worker] Score calc failed for lead:', leadId, e) }
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
    if (!canSendMessage(conv.lead.timezone || getTimezoneFromState(conv.lead.state || '') || 'America/New_York')) continue

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
    if (!canSendMessage(conv.lead.timezone || getTimezoneFromState(conv.lead.state || '') || 'America/New_York')) continue

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

// ============================================
// PENDING STATE ESCALATION
// ============================================

async function pendingStateEscalation() {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000)

  // 1. Stale Approvals (PENDING > 24h → reminder, > 72h → critical)
  // Wrapped in try/catch — approvals table may not exist yet if migration hasn't been applied
  let pendingApprovals: any[] = []
  try {
    pendingApprovals = await prisma.approval.findMany({
      where: { status: 'PENDING', createdAt: { lt: twentyFourHoursAgo } },
    })
  } catch (err) {
    console.warn('[PendingEscalation] Skipping approvals check — table may not exist yet:', err instanceof Error ? err.message : String(err))
  }

  for (const approval of pendingApprovals) {
    const isCritical = approval.createdAt < seventyTwoHoursAgo
    const hoursStale = Math.round((Date.now() - approval.createdAt.getTime()) / (1000 * 60 * 60))
    // Approval doesn't have a relation to Lead — look up by leadId
    let companyName = 'Unknown'
    if (approval.leadId) {
      const lead = await prisma.lead.findUnique({ where: { id: approval.leadId }, select: { companyName: true } })
      if (lead) companyName = lead.companyName
    }
    const title = isCritical ? 'CRITICAL: Approval Stalled' : 'Approval Pending 24h+'
    const message = `${companyName} — ${approval.gate} approval pending for ${hoursStale}h`

    // Dedup: skip if we already notified in the last 12h for this approval
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000)
    const existing = await prisma.notification.findFirst({
      where: {
        type: isCritical ? 'ESCALATION' : 'DAILY_AUDIT',
        metadata: { path: ['approvalId'], equals: approval.id },
        createdAt: { gte: twelveHoursAgo },
      },
    })
    if (existing) continue

    await prisma.notification.create({
      data: {
        type: isCritical ? 'ESCALATION' : 'DAILY_AUDIT',
        title,
        message,
        metadata: { approvalId: approval.id, gate: approval.gate, hoursStale },
      },
    })

    if (isCritical) {
      const { notifyAdmin } = await import('../lib/notifications')
      await notifyAdmin('escalation', title, message)
    }
  }

  // 2. Stale EditRequests (status 'new' > 24h)
  let staleEdits: any[] = []
  try {
    staleEdits = await prisma.editRequest.findMany({
      where: { status: 'new', createdAt: { lt: twentyFourHoursAgo } },
      include: { client: { select: { companyName: true } } },
    })
  } catch (err) {
    console.warn('[PendingEscalation] Skipping edit requests check:', err instanceof Error ? err.message : String(err))
  }

  for (const edit of staleEdits) {
    const isCritical = edit.createdAt < seventyTwoHoursAgo
    const hoursStale = Math.round((Date.now() - edit.createdAt.getTime()) / (1000 * 60 * 60))

    const existing = await prisma.notification.findFirst({
      where: {
        type: isCritical ? 'ESCALATION' : 'DAILY_AUDIT',
        metadata: { path: ['editRequestId'], equals: edit.id },
        createdAt: { gte: new Date(Date.now() - 12 * 60 * 60 * 1000) },
      },
    })
    if (existing) continue

    const title = isCritical ? 'CRITICAL: Edit Request Stalled' : 'Edit Request Pending 24h+'
    const message = `${edit.client?.companyName || 'Unknown'} — "${edit.requestText.slice(0, 80)}" unprocessed for ${hoursStale}h`

    await prisma.notification.create({
      data: {
        type: isCritical ? 'ESCALATION' : 'DAILY_AUDIT',
        title,
        message,
        metadata: { editRequestId: edit.id, hoursStale },
      },
    })

    if (isCritical) {
      const { notifyAdmin } = await import('../lib/notifications')
      await notifyAdmin('escalation', title, message)
    }
  }

  // 3. Stale PendingActions (status 'PENDING' > 24h)
  let stalePending: any[] = []
  try {
    stalePending = await prisma.pendingAction.findMany({
      where: { status: 'PENDING', createdAt: { lt: twentyFourHoursAgo } },
      include: { lead: { select: { companyName: true } } },
    })
  } catch (err) {
    console.warn('[PendingEscalation] Skipping pending actions check:', err instanceof Error ? err.message : String(err))
  }

  for (const action of stalePending) {
    const isCritical = action.createdAt < seventyTwoHoursAgo
    const hoursStale = Math.round((Date.now() - action.createdAt.getTime()) / (1000 * 60 * 60))

    const existing = await prisma.notification.findFirst({
      where: {
        type: isCritical ? 'ESCALATION' : 'DAILY_AUDIT',
        metadata: { path: ['pendingActionId'], equals: action.id },
        createdAt: { gte: new Date(Date.now() - 12 * 60 * 60 * 1000) },
      },
    })
    if (existing) continue

    const title = isCritical ? 'CRITICAL: Pending Action Stalled' : 'Pending Action 24h+'
    const message = `${action.lead?.companyName || 'Unknown'} — ${action.type} action pending for ${hoursStale}h`

    await prisma.notification.create({
      data: {
        type: isCritical ? 'ESCALATION' : 'DAILY_AUDIT',
        title,
        message,
        metadata: { pendingActionId: action.id, type: action.type, hoursStale },
      },
    })

    if (isCritical) {
      const { notifyAdmin } = await import('../lib/notifications')
      await notifyAdmin('escalation', title, message)
    }
  }

  const total = pendingApprovals.length + staleEdits.length + stalePending.length
  if (total > 0) {
    console.log(`[PendingEscalation] Found ${pendingApprovals.length} stale approvals, ${staleEdits.length} stale edits, ${stalePending.length} stale actions`)
  }
}

// ══════════════════════════════════════════════
// ONBOARDING WORKER HANDLERS
// ══════════════════════════════════════════════

/**
 * Advance client from Welcome (step 1) to Domain Collection (step 2).
 * Sends the domain question SMS.
 */
async function handleOnboardingAdvanceToDomain(clientId: string) {
  const { getOnboarding, advanceOnboarding, ONBOARDING_STEPS, getOnboardingFlowSettings, interpolateTemplate } = await import('../lib/onboarding')
  const onboarding = await getOnboarding(clientId)
  if (!onboarding || onboarding.onboardingStep !== ONBOARDING_STEPS.WELCOME) {
    console.log(`[Onboarding] Skipping domain advance — client ${clientId} not at step 1 (current: ${onboarding?.onboardingStep})`)
    return
  }

  await advanceOnboarding(clientId, ONBOARDING_STEPS.DOMAIN_COLLECTION)

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { lead: true },
  })
  if (!client?.lead?.phone) return

  const { sendSMSViaProvider } = await import('../lib/sms-provider')
  const firstName = client.lead.firstName || 'there'
  const companyName = client.companyName

  // Use onboarding flow settings from Post-AQ settings
  const flowSettings = await getOnboardingFlowSettings()
  const domainMessage = interpolateTemplate(flowSettings.domainQuestion, { firstName, companyName })

  await sendSMSViaProvider({
    to: client.lead.phone,
    message: domainMessage,
    clientId,
    sender: 'clawdbot',
    trigger: 'onboarding_domain_question',
    conversationType: 'post_client',
  })

  // Queue GBP prompt 30 minutes after domain question
  const { addSequenceJob } = await import('./queue')
  await addSequenceJob('onboarding-gbp-prompt', { clientId }, 30 * 60 * 1000)

  console.log(`[Onboarding] Domain question sent to ${client.lead.phone} for ${companyName}`)
}

/**
 * Send the Google Business Profile prompt to the client.
 * Fires ~30 minutes after the domain question.
 */
async function handleOnboardingGbpPrompt(clientId: string) {
  const { getOnboarding, getOnboardingFlowSettings, interpolateTemplate } = await import('../lib/onboarding')
  const onboarding = await getOnboarding(clientId)

  // Only send if still at domain collection step (haven't moved past it yet)
  if (!onboarding || onboarding.onboardingStep !== 2) {
    console.log(`[Onboarding] Skipping GBP prompt — client ${clientId} not at step 2`)
    return
  }

  // NEW-M14: Dedup — skip if GBP prompt already sent for this client
  const alreadySent = await prisma.message.findFirst({
    where: { clientId, trigger: 'onboarding_gbp_prompt' },
  })
  if (alreadySent) {
    console.log(`[Onboarding] GBP prompt already sent for client ${clientId} — skipping`)
    return
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { lead: true },
  })
  if (!client?.lead?.phone) return

  const flowSettings = await getOnboardingFlowSettings()
  if (!flowSettings.gbpPrompt) return // Empty = disabled

  const { sendSMSViaProvider } = await import('../lib/sms-provider')
  const firstName = client.lead.firstName || 'there'
  const companyName = client.companyName

  const gbpMessage = interpolateTemplate(flowSettings.gbpPrompt, { firstName, companyName })

  await sendSMSViaProvider({
    to: client.lead.phone,
    message: gbpMessage,
    clientId,
    sender: 'clawdbot',
    trigger: 'onboarding_gbp_prompt',
    conversationType: 'post_client',
  })

  console.log(`[Onboarding] GBP prompt sent to ${client.lead.phone} for ${companyName}`)
}

/**
 * Check DNS propagation for clients at step 5 (DNS Verification).
 * If verified, advance to Go-Live Confirmation and send the go-live SMS.
 * If not, re-queue the check and send nudges at 24h/48h.
 */
async function handleOnboardingDnsCheck(clientId: string) {
  const { getOnboarding, updateOnboarding, advanceOnboarding, ONBOARDING_STEPS } = await import('../lib/onboarding')
  const onboarding = await getOnboarding(clientId)

  if (!onboarding || onboarding.onboardingStep !== ONBOARDING_STEPS.DNS_VERIFICATION) {
    console.log(`[Onboarding] Skipping DNS check — client ${clientId} not at step 5`)
    return
  }
  if (!onboarding.customDomain) {
    console.log(`[Onboarding] Skipping DNS check — no custom domain for ${clientId}`)
    return
  }

  // Maximum retry count — stop infinite DNS check loops
  const dnsCheckCount = (onboarding.data.dnsCheckCount as number) || 0
  if (dnsCheckCount >= 20) {
    console.log(`[Onboarding] DNS check limit reached (${dnsCheckCount}) for ${clientId}`)
    const { notifyAdmin } = await import('../lib/notifications')
    await notifyAdmin('escalation', 'DNS Setup Stalled', `${onboarding.companyName} — DNS not configured after ${dnsCheckCount} checks. Manual intervention needed.`)
    return
  }
  await updateOnboarding(clientId, { dnsCheckCount: dnsCheckCount + 1 })

  const { checkDomain, verifyDomain } = await import('../lib/vercel')
  const domainStatus = await checkDomain(onboarding.customDomain)

  if (domainStatus.configured && domainStatus.verified) {
    // DNS verified — advance to go-live confirmation
    const verifyResult = await verifyDomain(onboarding.customDomain)
    if (verifyResult.verified || domainStatus.verified) {
      await updateOnboarding(clientId, { dnsVerified: true })
      await advanceOnboarding(clientId, ONBOARDING_STEPS.GO_LIVE_CONFIRMATION)

      await prisma.client.update({
        where: { id: clientId },
        data: {
          siteUrl: `https://${onboarding.customDomain}`,
          domainStatus: 'verified',
        },
      })

      // Update buildStep to LAUNCHED if not already past it
      const clientForBuild = await prisma.client.findUnique({
        where: { id: clientId },
        select: { leadId: true },
      })
      if (clientForBuild?.leadId) {
        const leadForStep = await prisma.lead.findUnique({
          where: { id: clientForBuild.leadId },
          select: { buildStep: true },
        })
        if (leadForStep?.buildStep !== 'LAUNCHED' && leadForStep?.buildStep !== 'LIVE') {
          await prisma.lead.update({
            where: { id: clientForBuild.leadId },
            data: { buildStep: 'LAUNCHED' },
          })
          console.log(`[Onboarding] Updated buildStep to LAUNCHED for lead ${clientForBuild.leadId}`)
        }
      }

      // Send go-live SMS
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        include: { lead: true },
      })
      if (client?.lead?.phone) {
        const { sendSMSViaProvider } = await import('../lib/sms-provider')
        await sendSMSViaProvider({
          to: client.lead.phone,
          message: `Your site is live! 🚀\n\nCheck it out: https://${onboarding.customDomain}\n\nEverything is set up — SSL security, mobile optimization, and SEO basics. How does it look?`,
          clientId,
          sender: 'clawdbot',
          trigger: 'site_go_live',
          conversationType: 'post_client',
        })
      }

      const { notifyAdmin } = await import('../lib/notifications')
      await notifyAdmin('payment', 'Site Live', `${onboarding.companyName} is live at https://${onboarding.customDomain}`)

      console.log(`[Onboarding] DNS verified — ${onboarding.companyName} is live at ${onboarding.customDomain}`)
      return
    }
  }

  // DNS not ready — re-queue check in 15 minutes
  const { addSequenceJob } = await import('./queue')
  await addSequenceJob('onboarding-dns-check', { clientId }, 15 * 60 * 1000)

  // Send nudges at 24h and 48h
  const data = onboarding.data as Record<string, any>
  const nudgesSent = (data.nudgesSent as number) || 0
  const instructionsSentAt = data.dnsInstructionsSentAt as string | undefined

  if (instructionsSentAt) {
    const hoursSince = (Date.now() - new Date(instructionsSentAt).getTime()) / (1000 * 60 * 60)

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: { lead: true },
    })

    if (hoursSince > 24 && nudgesSent === 0 && client?.lead?.phone) {
      const { sendSMSViaProvider } = await import('../lib/sms-provider')
      await sendSMSViaProvider({
        to: client.lead.phone,
        message: `Hey ${client.lead.firstName || 'there'}, just checking in — have you had a chance to update your DNS settings for ${onboarding.customDomain}? If you need help, just text me the name of your domain registrar (like GoDaddy or Namecheap) and I'll walk you through it.`,
        clientId,
        sender: 'clawdbot',
        trigger: 'dns_nudge',
        conversationType: 'post_client',
      })
      await updateOnboarding(clientId, { nudgesSent: 1 })
    }

    if (hoursSince > 48 && nudgesSent === 1 && client?.lead?.phone) {
      const { sendSMSViaProvider } = await import('../lib/sms-provider')
      await sendSMSViaProvider({
        to: client.lead.phone,
        message: `Hey ${client.lead.firstName || 'there'}, your site for ${onboarding.companyName} is ready to go live — we just need your DNS updated. Want us to hop on a quick call and walk you through it? Takes about 5 minutes.`,
        clientId,
        sender: 'clawdbot',
        trigger: 'dns_nudge_2',
        conversationType: 'post_client',
      })
      await updateOnboarding(clientId, { nudgesSent: 2 })

      const { notifyAdmin } = await import('../lib/notifications')
      await notifyAdmin('escalation', 'DNS Help Needed', `${onboarding.companyName} hasn't set up DNS after 48hrs. May need a call.`)
    }
  }

  console.log(`[Onboarding] DNS not verified for ${onboarding.customDomain} — re-queued check`)
}

// ============================================
// BUG P.2: NOTIFICATION AUTO-CLEANUP
// Deletes read notifications older than 30 days
// Keeps unread notifications for 90 days
// ============================================

// NEW-L23: Retry failed webhooks (max 3 retries, last 24h)
async function retryFailedWebhooks() {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const failedWebhooks = await prisma.failedWebhook.findMany({
    where: {
      retryCount: { lt: 3 },
      createdAt: { gte: twentyFourHoursAgo },
    },
    orderBy: { createdAt: 'asc' },
    take: 20,
  })

  if (failedWebhooks.length === 0) return

  let retried = 0
  let succeeded = 0

  for (const webhook of failedWebhooks) {
    try {
      const payload = webhook.payload as Record<string, any>

      // Re-dispatch webhook based on source type
      if (webhook.source.startsWith('stripe')) {
        const { dispatchWebhook, WebhookEvents } = await import('../lib/webhook-dispatcher')
        await dispatchWebhook(WebhookEvents.PAYMENT_RECEIVED(
          payload.leadId,
          payload.clientId,
          payload.amount || 0,
          'stripe_retry'
        ))
      } else if (webhook.source === 'resend') {
        // Resend webhooks are informational — just log and clear
        console.log(`[WebhookRetry] Clearing resend webhook ${webhook.id} — informational only`)
      } else {
        console.warn(`[WebhookRetry] Unknown webhook source: ${webhook.source}, incrementing retry`)
      }

      // Success — delete the failed record
      await prisma.failedWebhook.delete({ where: { id: webhook.id } })
      succeeded++
    } catch (err) {
      // Increment retry count
      await prisma.failedWebhook.update({
        where: { id: webhook.id },
        data: {
          retryCount: webhook.retryCount + 1,
          error: err instanceof Error ? err.message : String(err),
        },
      })
    }
    retried++
  }

  if (retried > 0) {
    console.log(`[WebhookRetry] Retried ${retried} webhooks: ${succeeded} succeeded, ${retried - succeeded} failed`)

    // Notify admin if any failed after 3 retries
    const exhausted = await prisma.failedWebhook.count({
      where: { retryCount: { gte: 3 }, createdAt: { gte: twentyFourHoursAgo } },
    })
    if (exhausted > 0) {
      await prisma.notification.create({
        data: {
          type: 'ESCALATION',
          title: 'Failed Webhooks — Retries Exhausted',
          message: `${exhausted} webhook(s) failed after 3 retries. Manual intervention needed.`,
          metadata: { exhaustedCount: exhausted },
        },
      })
    }
  }
}

async function cleanupOldNotifications() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

  // Delete read notifications older than 30 days
  const deletedRead = await prisma.notification.deleteMany({
    where: {
      read: true,
      createdAt: { lt: thirtyDaysAgo },
    },
  })

  // Delete unread notifications older than 90 days
  const deletedUnread = await prisma.notification.deleteMany({
    where: {
      read: false,
      createdAt: { lt: ninetyDaysAgo },
    },
  })

  const total = deletedRead.count + deletedUnread.count
  if (total > 0) {
    console.log(`[NotificationCleanup] Deleted ${deletedRead.count} read (30d+) and ${deletedUnread.count} unread (90d+) notifications`)
  }
}

export { startWorkers }

// Only auto-start when run directly via `npm run worker` (tsx src/worker/index.ts)
// Do NOT start when imported by Next.js API routes (causes SIGSEGV in web process)
if (process.argv[1]?.includes('worker/index')) {
  startWorkers()
}