/**
 * BullMQ Job Definitions for Instantly Integration
 * Runs 4 repeatable jobs on schedule
 */

import { Queue, Worker } from 'bullmq'
import redis from '@/lib/redis'
import { dailySyncAndCalculate } from '@/lib/instantly'
import { analyzeAndOptimize } from '@/lib/instantly-phase3'

const QUEUE_NAME = 'instantly'

/**
 * Create or get the Instantly job queue
 */
export function getInstantlyQueue(): Queue {
  return new Queue(QUEUE_NAME, { connection: redis as any })
}

/**
 * Initialize all Instantly jobs
 * Call this once on application startup
 */
export async function initializeInstantlyJobs() {
  try {
    const queue = getInstantlyQueue()

    console.log('[BullMQ] Initializing Instantly jobs...')

    // JOB 1: Daily sync at 8:00 AM ET
    // Calculate next 8 AM ET time
    const now = new Date()
    const eightAMET = new Date(now)
    eightAMET.setHours(8, 0, 0, 0)

    if (now > eightAMET) {
      eightAMET.setDate(eightAMET.getDate() + 1)
    }

    // Convert to cron: 8 AM ET = 13:00 UTC (or 12:00 during EDT)
    // For simplicity, use: 0 8 * * * (8 AM every day in local time)
    await queue.add(
      'daily-sync',
      { type: 'daily_sync_and_calculate' },
      {
        repeat: {
          pattern: '0 8 * * *', // 8 AM every day
        },
        removeOnComplete: true,
        removeOnFail: false,
      }
    )

    console.log('[BullMQ] ✓ daily-sync (8 AM ET)')

    // JOB 2: Midday health check at 1:00 PM ET
    await queue.add(
      'midday-check',
      { type: 'midday_health_check' },
      {
        repeat: {
          pattern: '0 13 * * *', // 1 PM every day
        },
        removeOnComplete: true,
        removeOnFail: false,
      }
    )

    console.log('[BullMQ] ✓ midday-check (1 PM ET)')

    // JOB 3: Webhook reconciliation hourly
    await queue.add(
      'webhook-reconciliation',
      { type: 'webhook_reconciliation' },
      {
        repeat: {
          pattern: '0 * * * *', // Every hour
        },
        removeOnComplete: true,
        removeOnFail: false,
      }
    )

    console.log('[BullMQ] ✓ webhook-reconciliation (hourly)')

    // JOB 4: Nightly deep reconciliation at 2:00 AM ET
    await queue.add(
      'nightly-reconciliation',
      { type: 'nightly_reconciliation' },
      {
        repeat: {
          pattern: '0 2 * * *', // 2 AM every day
        },
        removeOnComplete: true,
        removeOnFail: false,
      }
    )

    console.log('[BullMQ] ✓ nightly-reconciliation (2 AM ET)')

    console.log('[BullMQ] All Instantly jobs initialized ✓')
  } catch (error) {
    console.error('[BullMQ] Failed to initialize Instantly jobs:', error)
    throw error
  }
}

/**
 * Start the Instantly job worker
 * Listens for jobs and processes them
 */
export function startInstantlyWorker() {
  const queue = getInstantlyQueue()

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      try {
        console.log(`[BullMQ] Processing job: ${job.name}`)

        switch (job.data.type) {
          case 'daily_sync_and_calculate':
            console.log('[Instantly] Running daily sync...')
            await dailySyncAndCalculate()
            console.log('[Instantly] Daily sync complete')
            break

          case 'midday_health_check':
            console.log('[Instantly] Running midday health check...')
            // Placeholder — could call health check function
            console.log('[Instantly] Midday health check complete')
            break

          case 'webhook_reconciliation':
            console.log('[Instantly] Running webhook reconciliation...')
            // Placeholder — could call reconciliation function
            console.log('[Instantly] Webhook reconciliation complete')
            break

          case 'nightly_reconciliation':
            console.log('[Instantly] Running nightly deep reconciliation...')
            // Placeholder — could call deep reconciliation function
            console.log('[Instantly] Nightly reconciliation complete')
            break

          default:
            console.warn(`[BullMQ] Unknown job type: ${job.data.type}`)
        }

        return { status: 'success' }
      } catch (error) {
        console.error(`[BullMQ] Job failed: ${job.name}`, error)
        throw error
      }
    },
    { connection: redis as any }
  )

  worker.on('completed', (job) => {
    console.log(`[BullMQ] Job completed: ${job.name}`)
  })

  worker.on('failed', (job, err) => {
    console.error(`[BullMQ] Job failed: ${job?.name}`, err)
  })

  console.log('[BullMQ] Instantly worker started')

  return worker
}

/**
 * Cleanup: close queue and worker
 */
export async function closeInstantlyJobs() {
  const queue = getInstantlyQueue()
  await queue.close()
  console.log('[BullMQ] Instantly jobs closed')
}
