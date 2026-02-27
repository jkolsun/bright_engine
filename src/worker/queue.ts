import { Queue, QueueEvents } from 'bullmq'
import Redis from 'ioredis'

let connection: Redis | null = null
let isRedisAvailable = false
let connectionAttempted = false

// Export the connection for workers to use
export function getSharedConnection() {
  initializeRedisConnection()
  return connection
}

// Lazy initialization - only connect when first needed
function initializeRedisConnection() {
  if (connectionAttempted) {
    return // Already tried to initialize
  }
  connectionAttempted = true

  // Only attempt connection if Redis is explicitly configured
  // Don't connect if we're just using defaults (which happen during build)
  const hasRedisUrl = !!process.env.REDIS_URL
  const hasExplicitRedisHost = !!process.env.REDIS_HOST
  const hasExplicitRedisPort = !!process.env.REDIS_PORT

  // Skip connection during build/development unless explicitly configured
  if (!hasRedisUrl && !hasExplicitRedisHost && !hasExplicitRedisPort) {
    // No Redis configured - queuing will be unavailable but won't error
    return
  }

  try {
    if (hasRedisUrl) {
      // Use Railway's internal Redis URL with BullMQ-compatible settings
      connection = new Redis(process.env.REDIS_URL!, {
        maxRetriesPerRequest: null, // Required for BullMQ
        connectTimeout: 10000, // 10 seconds for Railway
        lazyConnect: false, // Connect immediately
        retryStrategy: (times) => Math.min(times * 50, 2000), // Retry with backoff
        enableReadyCheck: true,
      })
    } else if (hasExplicitRedisHost || hasExplicitRedisPort) {
      // Only connect if host or port are explicitly set
      connection = new Redis({
        host: process.env.REDIS_HOST!,
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: null,
        retryStrategy: () => null, // Don't retry, just fail fast
        connectTimeout: 1000,
      })
    }

    if (connection) {
      connection.on('error', (err) => {
        console.warn('[QUEUE] Redis connection error:', err.message)
        // Don't immediately set isRedisAvailable = false, let it retry
      })

      connection.on('connect', () => {
        console.log('[QUEUE] ✅ Redis connected successfully')
        isRedisAvailable = true
      })
      
      connection.on('ready', () => {
        console.log('[QUEUE] ✅ Redis connection ready for operations')
        isRedisAvailable = true
      })
      
      connection.on('close', () => {
        console.warn('[QUEUE] ⚠️ Redis connection closed')
      })
      
      connection.on('reconnecting', (ms) => {
        console.log(`[QUEUE] 🔄 Redis reconnecting in ${ms}ms`)
      })
    }
  } catch (err) {
    console.warn('Redis initialization failed (non-blocking):', err)
    connection = null
    isRedisAvailable = false
  }
}

// Lazy queue getters - initialize Redis connection on first use
let enrichmentQueue: Queue | null = null
let previewQueue: Queue | null = null
let personalizationQueue: Queue | null = null
let scriptQueue: Queue | null = null
let distributionQueue: Queue | null = null
let sequenceQueue: Queue | null = null
let importQueue: Queue | null = null
let monitoringQueue: Queue | null = null

let enrichmentEvents: QueueEvents | null = null
let previewEvents: QueueEvents | null = null
let personalizationEvents: QueueEvents | null = null
let scriptEvents: QueueEvents | null = null
let distributionEvents: QueueEvents | null = null
let sequenceEvents: QueueEvents | null = null
let monitoringEvents: QueueEvents | null = null

// Get or create queues (with lazy Redis initialization)
async function getQueues() {
  initializeRedisConnection()
  
  // Wait for connection to be ready before creating queues
  if (connection && !enrichmentQueue) {
    try {
      console.log('[QUEUE] Testing connection before creating queue...')
      const pong = await connection.ping() // Ensure connection is ready
      console.log('[QUEUE] Connection ping successful:', pong)
      
      // @ts-ignore bullmq has vendored ioredis that conflicts with root ioredis - compatible at runtime
      enrichmentQueue = new Queue('enrichment', { connection })
      // @ts-ignore bullmq has vendored ioredis that conflicts with root ioredis - compatible at runtime
      enrichmentEvents = new QueueEvents('enrichment', { connection })
      console.log('[QUEUE] ✅ Enrichment queue initialized with ready connection')
      console.log('[QUEUE] Queue connection status:', connection.status)
    } catch (err) {
      console.error('[QUEUE] ❌ Failed to initialize enrichment queue:', err)
    }
  }
  if (!previewQueue && connection) {
    // @ts-ignore bullmq has vendored ioredis that conflicts with root ioredis - compatible at runtime
    previewQueue = new Queue('preview', { connection })
    // @ts-ignore bullmq has vendored ioredis that conflicts with root ioredis - compatible at runtime
    previewEvents = new QueueEvents('preview', { connection })
  }
  if (!personalizationQueue && connection) {
    // @ts-ignore bullmq has vendored ioredis that conflicts with root ioredis - compatible at runtime
    personalizationQueue = new Queue('personalization', { connection })
    // @ts-ignore bullmq has vendored ioredis that conflicts with root ioredis - compatible at runtime
    personalizationEvents = new QueueEvents('personalization', { connection })
  }
  if (!scriptQueue && connection) {
    // @ts-ignore bullmq has vendored ioredis that conflicts with root ioredis - compatible at runtime
    scriptQueue = new Queue('scripts', { connection })
    // @ts-ignore bullmq has vendored ioredis that conflicts with root ioredis - compatible at runtime
    scriptEvents = new QueueEvents('scripts', { connection })
  }
  if (!distributionQueue && connection) {
    // @ts-ignore bullmq has vendored ioredis that conflicts with root ioredis - compatible at runtime
    distributionQueue = new Queue('distribution', { connection })
    // @ts-ignore bullmq has vendored ioredis that conflicts with root ioredis - compatible at runtime
    distributionEvents = new QueueEvents('distribution', { connection })
  }
  if (!sequenceQueue && connection) {
    // @ts-ignore bullmq has vendored ioredis that conflicts with root ioredis - compatible at runtime
    sequenceQueue = new Queue('sequence', { connection })
    // @ts-ignore bullmq has vendored ioredis that conflicts with root ioredis - compatible at runtime
    sequenceEvents = new QueueEvents('sequence', { connection })
  }
  if (!importQueue && connection) {
    // @ts-ignore bullmq has vendored ioredis that conflicts with root ioredis - compatible at runtime
    importQueue = new Queue('import', { connection })
  }
  if (!monitoringQueue && connection) {
    // @ts-ignore bullmq has vendored ioredis that conflicts with root ioredis - compatible at runtime
    monitoringQueue = new Queue('monitoring', { connection })
    // @ts-ignore bullmq has vendored ioredis that conflicts with root ioredis - compatible at runtime
    monitoringEvents = new QueueEvents('monitoring', { connection })
  }
}

// Export getters instead of direct references
export async function getEnrichmentQueue() {
  await getQueues()
  return enrichmentQueue
}

export async function getPreviewQueue() {
  await getQueues()
  return previewQueue
}

export async function getPersonalizationQueue() {
  await getQueues()
  return personalizationQueue
}

export async function getScriptQueue() {
  await getQueues()
  return scriptQueue
}

export async function getDistributionQueue() {
  await getQueues()
  return distributionQueue
}

export async function getSequenceQueue() {
  await getQueues()
  return sequenceQueue
}

export async function getImportQueue() {
  await getQueues()
  return importQueue
}

export async function getMonitoringQueue() {
  await getQueues()
  return monitoringQueue
}

export async function getEnrichmentEvents() {
  await getQueues()
  return enrichmentEvents
}

export async function getPreviewEvents() {
  await getQueues()
  return previewEvents
}

export async function getPersonalizationEvents() {
  await getQueues()
  return personalizationEvents
}

export async function getScriptEvents() {
  await getQueues()
  return scriptEvents
}

export async function getDistributionEvents() {
  await getQueues()
  return distributionEvents
}

export async function getSequenceEvents() {
  await getQueues()
  return sequenceEvents
}

export async function getMonitoringEvents() {
  await getQueues()
  return monitoringEvents
}

// Backward compatibility - legacy direct exports (now getters)
export const getEnrichmentQueueRef = () => enrichmentQueue
export const getPreviewQueueRef = () => previewQueue
export const getPersonalizationQueueRef = () => personalizationQueue
export const getScriptQueueRef = () => scriptQueue
export const getDistributionQueueRef = () => distributionQueue
export const getSequenceQueueRef = () => sequenceQueue
export const getMonitoringQueueRef = () => monitoringQueue

// Helper to add jobs - gracefully handle if Redis unavailable

// ── Delayed Message Job Types (fixes BUG 8.1, NEW-C1, NEW-C9) ──

export interface DelayedCloseEngineMessage {
  type: 'close-engine-message'
  options: {
    to: string
    toEmail?: string
    message: string
    leadId: string
    trigger: string
    aiGenerated?: boolean
    aiDelaySeconds?: number
    conversationType?: string
    sender?: string
    aiDecisionLog?: Record<string, unknown>
    emailSubject?: string
  }
  postSendTransition?: { conversationId: string; stage: string }
}

export interface DelayedSmsMessage {
  type: 'sms-message'
  options: {
    to: string
    message: string
    leadId?: string
    clientId?: string
    trigger: string
    aiGenerated?: boolean
    aiDelaySeconds?: number
    conversationType?: string
    sender?: string
    aiDecisionLog?: Record<string, unknown>
  }
}

export interface DelayedPaymentLink {
  type: 'payment-link'
  conversationId: string
}

export type DelayedMessageJobData =
  | DelayedCloseEngineMessage
  | DelayedSmsMessage
  | DelayedPaymentLink

/**
 * Queue a delayed message send via BullMQ instead of setTimeout.
 * On serverless (Vercel, Railway), setTimeout fires after the function returns
 * and the container shuts down — messages are silently dropped. BullMQ delayed
 * jobs persist in Redis and are processed by the worker regardless of the
 * original request lifecycle.
 */
export async function addDelayedMessageJob(data: DelayedMessageJobData, delayMs: number) {
  const queue = await getSequenceQueue()
  if (!queue || !isRedisAvailable) {
    console.warn('[QUEUE] Sequence queue unavailable for delayed message — message may be lost on serverless')
    return null
  }

  try {
    return await queue.add(
      'send-delayed-message',
      data,
      {
        delay: delayMs,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
      }
    )
  } catch (err) {
    console.error('[QUEUE] Failed to add delayed message job:', err)
    return null
  }
}

/**
 * Phase 2 Import Pipeline Job Functions
 * Order: Enrichment → Preview → Personalization → Scripts → Distribution
 */

export async function addEnrichmentJob(data: {
  leadId: string
  companyName: string
  city?: string
  state?: string
}) {
  try {
    // Use the shared queue (properly initialized) instead of fresh connections
    const queue = await getEnrichmentQueue()
    if (!queue) {
      console.error(`❌ No enrichment queue available for lead ${data.leadId}`)
      return null
    }
    
    console.log(`[QUEUE] Using shared queue for lead ${data.leadId}`)
    
    const job = await queue.add(
      'enrich-lead',
      data,
      {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      }
    )
    
    console.log(`✅ Enrichment job queued successfully for lead ${data.leadId}, job ID: ${job.id}`)
    
    return job
  } catch (err) {
    console.error(`❌ Failed to queue enrichment job for lead ${data.leadId}:`, err)
    return null
  }
}

export async function addPreviewGenerationJob(data: {
  leadId: string
  clientId?: string
}) {
  const queue = await getPreviewQueue()
  if (!queue) {
    console.warn('Preview queue unavailable, skipping job for lead:', data.leadId)
    return null
  }
  
  try {
    if (connection) {
      await connection.ping()
    }
    
    const job = await queue.add(
      'generate-preview',
      data,
      {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      }
    )
    console.log(`✅ Preview job queued for lead ${data.leadId}`)
    return job
  } catch (err) {
    console.warn('Failed to add preview generation job:', err)
    return null
  }
}

export async function addPersonalizationJob(data: { leadId: string }) {
  const queue = await getPersonalizationQueue()
  if (!queue || !isRedisAvailable) {
    console.warn('Personalization queue unavailable, skipping job for lead:', data.leadId)
    return null
  }
  
  try {
    return await queue.add(
      'personalize-lead',
      data,
      {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      }
    )
  } catch (err) {
    console.warn('Failed to add personalization job:', err)
    return null
  }
}

export async function addScriptGenerationJob(data: { leadId: string }) {
  const queue = await getScriptQueue()
  if (!queue || !isRedisAvailable) {
    console.warn('Script queue unavailable, skipping job for lead:', data.leadId)
    return null
  }
  
  try {
    return await queue.add(
      'generate-script',
      data,
      {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      }
    )
  } catch (err) {
    console.warn('Failed to add script generation job:', err)
    return null
  }
}

export async function addDistributionJob(data: {
  leadId: string
  channel: 'INSTANTLY' | 'REP_QUEUE' | 'BOTH'
}) {
  const queue = await getDistributionQueue()
  if (!queue || !isRedisAvailable) {
    console.warn('Distribution queue unavailable, skipping job for lead:', data.leadId)
    return null
  }
  
  try {
    return await queue.add(
      'distribute-lead',
      data,
      {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    )
  } catch (err) {
    console.warn('Failed to add distribution job:', err)
    return null
  }
}

export async function addSequenceJob(
  type: string,
  data: any,
  delayMs?: number
) {
  const queue = await getSequenceQueue()
  if (!queue || !isRedisAvailable) {
    console.warn('Sequence queue unavailable, skipping job:', type)
    return null
  }
  
  try {
    return await queue.add(
      type,
      data,
      {
        delay: delayMs,
        attempts: 2,
        removeOnComplete: true,
      }
    )
  } catch (err) {
    console.warn('Failed to add sequence job:', err)
    return null
  }
}

export async function scheduleHotLeadMonitoring() {
  const queue = await getMonitoringQueue()
  if (!queue || !isRedisAvailable) {
    console.warn('Monitoring queue unavailable, skipping hot leads check')
    return null
  }

  try {
    // Run every 15 minutes
    return await queue.add(
      'hot-leads-check',
      {},
      {
        repeat: {
          every: 15 * 60 * 1000, // 15 minutes in ms
        },
      }
    )
  } catch (err) {
    console.warn('Failed to schedule hot lead monitoring:', err)
    return null
  }
}

// ── Close Engine Scheduling ──

export async function scheduleCloseEngineStallCheck() {
  const queue = await getMonitoringQueue()
  if (!queue || !isRedisAvailable) {
    console.warn('Monitoring queue unavailable, skipping close engine stall check')
    return null
  }

  try {
    return await queue.add(
      'close-engine-stall-check',
      {},
      {
        repeat: {
          every: 15 * 60 * 1000, // Every 15 minutes
        },
      }
    )
  } catch (err) {
    console.warn('Failed to schedule close engine stall check:', err)
    return null
  }
}

export async function scheduleCloseEnginePaymentFollowUp() {
  const queue = await getMonitoringQueue()
  if (!queue || !isRedisAvailable) {
    console.warn('Monitoring queue unavailable, skipping close engine payment follow-up')
    return null
  }

  try {
    return await queue.add(
      'close-engine-payment-followup',
      {},
      {
        repeat: {
          every: 60 * 60 * 1000, // Every hour
        },
      }
    )
  } catch (err) {
    console.warn('Failed to schedule close engine payment follow-up:', err)
    return null
  }
}

export async function scheduleCloseEngineExpireStalled() {
  const queue = await getMonitoringQueue()
  if (!queue || !isRedisAvailable) {
    console.warn('Monitoring queue unavailable, skipping close engine expire stalled')
    return null
  }

  try {
    return await queue.add(
      'close-engine-expire-stalled',
      {},
      {
        repeat: {
          pattern: '0 2 * * *', // Daily at 2 AM UTC (~9 PM EST)
        },
      }
    )
  } catch (err) {
    console.warn('Failed to schedule close engine expire stalled:', err)
    return null
  }
}

export async function schedulePendingStateEscalation() {
  const queue = await getMonitoringQueue()
  if (!queue || !isRedisAvailable) {
    console.warn('Monitoring queue unavailable, skipping pending state escalation')
    return null
  }

  try {
    return await queue.add(
      'pending-state-escalation',
      {},
      {
        repeat: {
          every: 2 * 60 * 60 * 1000, // Every 2 hours
        },
      }
    )
  } catch (err) {
    console.warn('Failed to schedule pending state escalation:', err)
    return null
  }
}

// BUG P.2: Schedule daily notification cleanup
export async function scheduleNotificationCleanup() {
  const queue = await getMonitoringQueue()
  if (!queue || !isRedisAvailable) {
    console.warn('Monitoring queue unavailable, skipping notification cleanup')
    return null
  }

  try {
    return await queue.add(
      'notification-cleanup',
      {},
      {
        repeat: {
          every: 24 * 60 * 60 * 1000, // Once per day
        },
      }
    )
  } catch (err) {
    console.warn('Failed to schedule notification cleanup:', err)
    return null
  }
}

// NEW-L23: Schedule failed webhook retry every 30 minutes
export async function scheduleFailedWebhookRetry() {
  const queue = await getMonitoringQueue()
  if (!queue || !isRedisAvailable) {
    console.warn('Monitoring queue unavailable, skipping failed webhook retry')
    return null
  }

  try {
    return await queue.add(
      'failed-webhook-retry',
      {},
      {
        repeat: {
          every: 30 * 60 * 1000, // Every 30 minutes
        },
      }
    )
  } catch (err) {
    console.warn('Failed to schedule webhook retry:', err)
    return null
  }
}

export async function scheduleUrgencyCheck() {
  const queue = await getMonitoringQueue()
  if (!queue || !isRedisAvailable) {
    console.warn('Monitoring queue unavailable, skipping urgency check')
    return null
  }

  try {
    return await queue.add(
      'urgency-check',
      {},
      {
        repeat: {
          every: 24 * 60 * 60 * 1000, // Once per day
        },
      }
    )
  } catch (err) {
    console.warn('Failed to schedule urgency check:', err)
    return null
  }
}

// Schedule stale edit reminder — finds forgotten edit requests sitting in review
export async function scheduleStaleEditReminder() {
  const queue = await getMonitoringQueue()
  if (!queue || !isRedisAvailable) {
    console.warn('Monitoring queue unavailable, skipping stale edit reminder')
    return null
  }

  try {
    return await queue.add(
      'stale-edit-reminder',
      {},
      {
        repeat: {
          every: 6 * 60 * 60 * 1000, // Every 6 hours
        },
      }
    )
  } catch (err) {
    console.warn('Failed to schedule stale edit reminder:', err)
    return null
  }
}

export async function addImportProcessingJob(data: {
  jobId: string
  leadIds: string[]
  options: { enrichment: boolean; preview: boolean; personalization: boolean }
}) {
  const queue = await getImportQueue()
  if (!queue) {
    console.warn('Import queue unavailable, cannot process import')
    return null
  }

  try {
    return await queue.add(
      'process-import',
      data,
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
      }
    )
  } catch (err) {
    console.warn('Failed to add import processing job:', err)
    return null
  }
}

export async function removeImportProcessingJob(jobId: string) {
  const queue = await getImportQueue()
  if (!queue) return

  try {
    // Only remove waiting/delayed jobs — never touch active (locked) jobs
    // Active jobs will complete or be cleaned up by BullMQ stall detection
    const jobs = await queue.getJobs(['waiting', 'delayed'])
    for (const job of jobs) {
      if (job.data?.jobId === jobId) {
        await job.remove()
        console.log(`[QUEUE] Removed waiting import job with jobId ${jobId}`)
        return
      }
    }
    console.log(`[QUEUE] Import job ${jobId} not found in waiting/delayed (may be active — will finish naturally)`)
  } catch (err) {
    console.warn('[QUEUE] Failed to remove import processing job:', err)
  }
}

export async function addSessionAnalysisJob(data: { sessionId: string }) {
  const queue = await getSequenceQueue()
  if (!queue || !isRedisAvailable) {
    console.warn('[QUEUE] Sequence queue unavailable for session analysis')
    return null
  }

  try {
    return await queue.add('session-analysis', data, {
      attempts: 2,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
    })
  } catch (err) {
    console.warn('Failed to add session analysis job:', err)
    return null
  }
}