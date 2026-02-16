import type { Metadata } from 'next'
import { Providers } from './providers'

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
      console.log('[Layout] Workers initialized')
    }
  } catch (error) {
    console.error('[Layout] Worker init failed:', error)
    // Continue without worker
  }
}

// Call on server startup
initializeWorker()

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
