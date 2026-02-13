import { Queue, Worker, QueueEvents } from 'bullmq'
import Redis from 'ioredis'

let connection: Redis | null = null
let isRedisAvailable = false

// Try to connect to Redis, but don't fail if it's not available
try {
  if (process.env.REDIS_URL) {
    // Use Railway's internal Redis URL
    connection = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      retryStrategy: () => null, // Don't retry, just fail fast
      connectTimeout: 1000,
    })
  } else {
    // Fallback to localhost (for local development)
    connection = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null,
      retryStrategy: () => null, // Don't retry, just fail fast
      connectTimeout: 1000,
    })
  }
  
  connection.on('error', (err) => {
    console.warn('Redis connection error (non-blocking):', err.message)
    isRedisAvailable = false
  })

  connection.on('connect', () => {
    console.log('Redis connected')
    isRedisAvailable = true
  })
} catch (err) {
  console.warn('Redis initialization failed (non-blocking):', err)
  connection = null
  isRedisAvailable = false
}

// Define queues (will only work if Redis is available)
// @ts-ignore bullmq has vendored ioredis that conflicts with root ioredis - compatible at runtime
export const enrichmentQueue = connection ? new Queue('enrichment', { connection }) : null
// @ts-ignore bullmq has vendored ioredis that conflicts with root ioredis - compatible at runtime
export const previewQueue = connection ? new Queue('preview', { connection }) : null
// @ts-ignore bullmq has vendored ioredis that conflicts with root ioredis - compatible at runtime
export const personalizationQueue = connection ? new Queue('personalization', { connection }) : null
// @ts-ignore bullmq has vendored ioredis that conflicts with root ioredis - compatible at runtime
export const scriptQueue = connection ? new Queue('scripts', { connection }) : null
// @ts-ignore bullmq has vendored ioredis that conflicts with root ioredis - compatible at runtime
export const distributionQueue = connection ? new Queue('distribution', { connection }) : null
// @ts-ignore bullmq has vendored ioredis that conflicts with root ioredis - compatible at runtime
export const sequenceQueue = connection ? new Queue('sequence', { connection }) : null
// @ts-ignore bullmq has vendored ioredis that conflicts with root ioredis - compatible at runtime
export const monitoringQueue = connection ? new Queue('monitoring', { connection }) : null

// Queue events for monitoring (only if Redis available)
// @ts-ignore bullmq has vendored ioredis that conflicts with root ioredis - compatible at runtime
export const enrichmentEvents = connection ? new QueueEvents('enrichment', { connection }) : null
// @ts-ignore bullmq has vendored ioredis that conflicts with root ioredis - compatible at runtime
export const previewEvents = connection ? new QueueEvents('preview', { connection }) : null
// @ts-ignore bullmq has vendored ioredis that conflicts with root ioredis - compatible at runtime
export const personalizationEvents = connection ? new QueueEvents('personalization', { connection }) : null
// @ts-ignore bullmq has vendored ioredis that conflicts with root ioredis - compatible at runtime
export const scriptEvents = connection ? new QueueEvents('scripts', { connection }) : null
// @ts-ignore bullmq has vendored ioredis that conflicts with root ioredis - compatible at runtime
export const distributionEvents = connection ? new QueueEvents('distribution', { connection }) : null
// @ts-ignore bullmq has vendored ioredis that conflicts with root ioredis - compatible at runtime
export const sequenceEvents = connection ? new QueueEvents('sequence', { connection }) : null
// @ts-ignore bullmq has vendored ioredis that conflicts with root ioredis - compatible at runtime
export const monitoringEvents = connection ? new QueueEvents('monitoring', { connection }) : null

// Helper to add jobs - gracefully handle if Redis unavailable

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
  if (!enrichmentQueue || !isRedisAvailable) {
    console.warn('Enrichment queue unavailable, skipping job for lead:', data.leadId)
    return null
  }
  
  try {
    return await enrichmentQueue.add(
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
  } catch (err) {
    console.warn('Failed to add enrichment job:', err)
    return null
  }
}

export async function addPreviewGenerationJob(data: {
  leadId: string
  clientId?: string
}) {
  if (!previewQueue || !isRedisAvailable) {
    console.warn('Preview queue unavailable, skipping job for lead:', data.leadId)
    return null
  }
  
  try {
    // Delay by 5 seconds to allow enrichment to complete
    return await previewQueue.add(
      'generate-preview',
      data,
      {
        delay: 5000,
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      }
    )
  } catch (err) {
    console.warn('Failed to add preview generation job:', err)
    return null
  }
}

export async function addPersonalizationJob(data: { leadId: string }) {
  if (!personalizationQueue || !isRedisAvailable) {
    console.warn('Personalization queue unavailable, skipping job for lead:', data.leadId)
    return null
  }
  
  try {
    // Delay by 10 seconds to allow preview generation to complete
    return await personalizationQueue.add(
      'personalize-lead',
      data,
      {
        delay: 10000,
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
  if (!scriptQueue || !isRedisAvailable) {
    console.warn('Script queue unavailable, skipping job for lead:', data.leadId)
    return null
  }
  
  try {
    // Delay by 15 seconds to allow personalization to complete
    return await scriptQueue.add(
      'generate-script',
      data,
      {
        delay: 15000,
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
  if (!distributionQueue || !isRedisAvailable) {
    console.warn('Distribution queue unavailable, skipping job for lead:', data.leadId)
    return null
  }
  
  try {
    // Delay by 20 seconds to allow all prep to complete
    return await distributionQueue.add(
      'distribute-lead',
      data,
      {
        delay: 20000,
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
  if (!sequenceQueue || !isRedisAvailable) {
    console.warn('Sequence queue unavailable, skipping job:', type)
    return null
  }
  
  try {
    return await sequenceQueue.add(
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
  if (!monitoringQueue || !isRedisAvailable) {
    console.warn('Monitoring queue unavailable, skipping hot leads check')
    return null
  }
  
  try {
    // Run every 15 minutes
    return await monitoringQueue.add(
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

// Worker initialization (only if Redis available)
export async function initWorkers() {
  if (!isRedisAvailable || !connection) {
    console.warn('Redis not available, workers not initialized')
    return
  }

  try {
    // Enrichment worker
    // @ts-ignore bullmq has vendored ioredis that conflicts with root ioredis - compatible at runtime
    const enrichmentWorker = new Worker(
      'enrichment',
      async (job) => {
        console.log('Processing enrichment for lead:', job.data.leadId)
        // TODO: Implement enrichment logic
        return { success: true }
      },
      // @ts-ignore bullmq has vendored ioredis that conflicts with root ioredis - compatible at runtime
      { connection }
    )

    // Personalization worker
    // @ts-ignore bullmq has vendored ioredis that conflicts with root ioredis - compatible at runtime
    const personalizationWorker = new Worker(
      'personalization',
      async (job) => {
        console.log('Processing personalization for lead:', job.data.leadId)
        // TODO: Implement personalization logic
        return { success: true }
      },
      // @ts-ignore bullmq has vendored ioredis that conflicts with root ioredis - compatible at runtime
      { connection }
    )

    console.log('Workers initialized')
  } catch (err) {
    console.warn('Failed to initialize workers:', err)
  }
}
