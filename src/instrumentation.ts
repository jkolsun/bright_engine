/**
 * instrumentation.ts
 * Runs automatically on Next.js startup
 * Initialize worker and queues here
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[Instrumentation] Starting worker initialization...')

    try {
      const { startWorkers } = await import('./worker')
      await startWorkers()
      console.log('[Instrumentation] Workers initialized successfully')
    } catch (error) {
      console.error('[Instrumentation] Failed to initialize workers:', error)
      // Don't throw - let app continue even if worker fails
    }
  }
}
