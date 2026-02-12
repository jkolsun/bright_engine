import { Queue, Worker, QueueEvents } from 'bullmq'
import Redis from 'ioredis'

let connection: Redis | null = null
let isRedisAvailable = false

// Try to connect to Redis, but don't fail if it's not available
try {
  connection = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
    retryStrategy: () => null, // Don't retry, just fail fast
    connectTimeout: 1000,
  })
  
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
export const enrichmentQueue = connection ? new Queue('enrichment', { connection }) : null
export const personalizationQueue = connection ? new Queue('personalization', { connection }) : null
export const sequenceQueue = connection ? new Queue('sequence', { connection }) : null
export const monitoringQueue = connection ? new Queue('monitoring', { connection }) : null

// Queue events for monitoring (only if Redis available)
export const enrichmentEvents = connection ? new QueueEvents('enrichment', { connection }) : null
export const personalizationEvents = connection ? new QueueEvents('personalization', { connection }) : null
export const sequenceEvents = connection ? new QueueEvents('sequence', { connection }) : null
export const monitoringEvents = connection ? new QueueEvents('monitoring', { connection }) : null

// Helper to add jobs - gracefully handle if Redis unavailable
export async function addEnrichmentJob(leadId: string) {
  if (!enrichmentQueue || !isRedisAvailable) {
    console.warn('Enrichment queue unavailable, skipping job for lead:', leadId)
    return null
  }
  
  try {
    return await enrichmentQueue.add(
      'enrich-lead',
      { leadId },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    )
  } catch (err) {
    console.warn('Failed to add enrichment job:', err)
    return null
  }
}

export async function addPersonalizationJob(leadId: string) {
  if (!personalizationQueue || !isRedisAvailable) {
    console.warn('Personalization queue unavailable, skipping job for lead:', leadId)
    return null
  }
  
  try {
    return await personalizationQueue.add(
      'personalize-lead',
      { leadId },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    )
  } catch (err) {
    console.warn('Failed to add personalization job:', err)
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
    const enrichmentWorker = new Worker(
      'enrichment',
      async (job) => {
        console.log('Processing enrichment for lead:', job.data.leadId)
        // TODO: Implement enrichment logic
        return { success: true }
      },
      { connection }
    )

    // Personalization worker
    const personalizationWorker = new Worker(
      'personalization',
      async (job) => {
        console.log('Processing personalization for lead:', job.data.leadId)
        // TODO: Implement personalization logic
        return { success: true }
      },
      { connection }
    )

    console.log('Workers initialized')
  } catch (err) {
    console.warn('Failed to initialize workers:', err)
  }
}
