export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startWorkers } = await import('./worker/index')
    try {
      await startWorkers()
      console.log('[Boot] Workers auto-started')
    } catch (e) {
      console.warn('[Boot] Worker auto-start failed:', e)
    }
  }
}