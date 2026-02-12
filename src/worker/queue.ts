import { Queue, Worker, QueueEvents } from 'bullmq'
import Redis from 'ioredis'

const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
})

// Define queues
export const enrichmentQueue = new Queue('enrichment', { connection })
export const personalizationQueue = new Queue('personalization', { connection })
export const sequenceQueue = new Queue('sequence', { connection })
export const monitoringQueue = new Queue('monitoring', { connection })

// Queue events for monitoring
export const enrichmentEvents = new QueueEvents('enrichment', { connection })
export const personalizationEvents = new QueueEvents('personalization', { connection })
export const sequenceEvents = new QueueEvents('sequence', { connection })
export const monitoringEvents = new QueueEvents('monitoring', { connection })

// Helper to add jobs
export async function addEnrichmentJob(leadId: string) {
  return enrichmentQueue.add(
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
}

export async function addPersonalizationJob(leadId: string) {
  return personalizationQueue.add(
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
}

export async function addSequenceJob(
  type: string,
  data: any,
  delayMs?: number
) {
  return sequenceQueue.add(
    type,
    data,
    {
      delay: delayMs,
      attempts: 2,
      removeOnComplete: true,
    }
  )
}

export async function scheduleHotLeadMonitoring() {
  // Run every 15 minutes
  return monitoringQueue.add(
    'hot-leads-check',
    {},
    {
      repeat: {
        every: 15 * 60 * 1000, // 15 minutes in ms
      },
    }
  )
}

export async function scheduleDailyAudit() {
  // Run daily at 9 PM EST
  return monitoringQueue.add(
    'daily-audit',
    {},
    {
      repeat: {
        pattern: '0 21 * * *', // Cron: 9 PM every day
        tz: 'America/New_York',
      },
    }
  )
}

export default {
  enrichmentQueue,
  personalizationQueue,
  sequenceQueue,
  monitoringQueue,
}
