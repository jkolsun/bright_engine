let workerInitialized = false

export async function GET() {
  // Auto-initialize worker on first health check (ensures worker is running on app startup)
  if (!workerInitialized) {
    try {
      if (process.env.REDIS_URL) {
        const { startWorkers } = await import('@/worker')
        await startWorkers()
        workerInitialized = true
        console.log('[Health] Workers auto-initialized on health check')
      }
    } catch (error) {
      console.error('[Health] Worker auto-init failed:', error)
      // Continue - worker can be manually started via /api/worker-init
    }
  }

  return Response.json({
    status: 'ok',
    timestamp: Date.now(),
  })
}
