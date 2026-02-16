import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Bright Engine',
  description: 'AI-powered lead management platform',
}

// Initialize worker on app startup
async function initializeWorker() {
  try {
    if (process.env.REDIS_URL) {
      const { startWorkers } = await import('@/worker')
      await startWorkers()
      console.log('[Layout] Workers initialized on startup')
    }
  } catch (error) {
    console.error('[Layout] Worker init failed:', error)
    // Continue without worker - it can be started via /api/worker-init
  }
}

// Trigger initialization once per process
initializeWorker().catch(console.error)

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head />
      <body>{children}</body>
    </html>
  )
}
