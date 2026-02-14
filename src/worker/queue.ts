import { Queue, Worker, QueueEvents } from 'bullmq'
import Redis from 'ioredis'

let connection: Redis | null = null
let isRedisAvailable = false
let connectionAttempted = false

// Lazy initialization - only connect when first needed
function initializeRedisConnection() {
  if (connectionAttempted) {
    return // Already tried to initialize
  }
  connectionAttempted = true

  // Only attempt connection in runtime environments, not during build
  if (process.env.NODE_ENV === 'production' || process.env.REDIS_URL || process.env.REDIS_HOST) {
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
  }
}

// Lazy queue getters - initialize Redis connection on first use
let enrichmentQueue: Queue | null = null
let previewQueue: Queue | null = null
let personalizationQueue: Queue | null = null
let scriptQueue: Queue | null = null
let distributionQueue: Queue | null = null
let sequenceQueue: Queue | null = null
let monitoringQueue: Queue | null = null

let enrichmentEvents: QueueEvents | null = null
let previewEvents: QueueEvents | null = null
let personalizationEvents: QueueEvents | null = null
let scriptEvents: QueueEvents | null = null
let distributionEvents: QueueEvents | null = null
let sequenceEvents: QueueEvents | null = null
let monitoringEvents: QueueEvents | null = null

// Get or create queues (with lazy Redis initialization)
function getQueues() {
  initializeRedisConnection()
  
  if (!enrichmentQueue && connection) {
    // @ts-ignore bullmq has vendored ioredis that conflicts with root ioredis - compatible at runtime
    enrichmentQueue = new Queue('enrichment', { connection })
    // @ts-ignore bullmq has vendored ioredis that conflicts with root ioredis - compatible at runtime
    enrichmentEvents = new QueueEvents('enrichment', { connection })
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
  if (!monitoringQueue && connection) {
    // @ts-ignore bullmq has vendored ioredis that conflicts with root ioredis - compatible at runtime
    monitoringQueue = new Queue('monitoring', { connection })
    // @ts-ignore bullmq has vendored ioredis that conflicts with root ioredis - compatible at runtime
    monitoringEvents = new QueueEvents('monitoring', { connection })
  }
}

// Export getters instead of direct references
export function getEnrichmentQueue() {
  getQueues()
  return enrichmentQueue
}

export function getPreviewQueue() {
  getQueues()
  return previewQueue
}

export function getPersonalizationQueue() {
  getQueues()
  return personalizationQueue
}

export function getScriptQueue() {
  getQueues()
  return scriptQueue
}

export function getDistributionQueue() {
  getQueues()
  return distributionQueue
}

export function getSequenceQueue() {
  getQueues()
  return sequenceQueue
}

export function getMonitoringQueue() {
  getQueues()
  return monitoringQueue
}

export function getEnrichmentEvents() {
  getQueues()
  return enrichmentEvents
}

export function getPreviewEvents() {
  getQueues()
  return previewEvents
}

export function getPersonalizationEvents() {
  getQueues()
  return personalizationEvents
}

export function getScriptEvents() {
  getQueues()
  return scriptEvents
}

export function getDistributionEvents() {
  getQueues()
  return distributionEvents
}

export function getSequenceEvents() {
  getQueues()
  return sequenceEvents
}

export function getMonitoringEvents() {
  getQueues()
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
  const queue = getEnrichmentQueue()
  if (!queue || !isRedisAvailable) {
    console.warn('Enrichment queue unavailable, skipping job for lead:', data.leadId)
    return null
  }
  
  try {
    return await queue.add(
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
  const queue = getPreviewQueue()
  if (!queue || !isRedisAvailable) {
    console.warn('Preview queue unavailable, skipping job for lead:', data.leadId)
    return null
  }
  
  try {
    return await queue.add(
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
  } catch (err) {
    console.warn('Failed to add preview generation job:', err)
    return null
  }
}

export async function addPersonalizationJob(data: { leadId: string }) {
  const queue = getPersonalizationQueue()
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
  const queue = getScriptQueue()
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
  const queue = getDistributionQueue()
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
  const queue = getSequenceQueue()
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
  const queue = getMonitoringQueue()
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