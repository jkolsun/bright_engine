export const dynamic = 'force-dynamic'

import { startWorkers } from '@/worker/index'

let initialized = false
let initializationInProgress = false

export async function GET() {
  // If already initialized, return immediately
  if (initialized) {
    return Response.json({ status: 'ok', redis: true, reason: 'Already initialized' })
  }

  // If initialization is already in progress, don't retry
  if (initializationInProgress) {
    return Response.json({ status: 'ok', redis: false, reason: 'Initialization in progress' })
  }

  initializationInProgress = true

  try {
    // Wrap startWorkers with a timeout promise
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Worker initialization timeout after 5s')), 5000)
    )

    await Promise.race([startWorkers(), timeoutPromise])
    initialized = true
    initializationInProgress = false
    return Response.json({ status: 'ok', redis: true, reason: 'Worker started' })
  } catch (error) {
    initializationInProgress = false
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.warn('Worker init failed:', errorMsg)
    // Return success with warning - app is functional without worker
    return Response.json({
      status: 'ok',
      redis: false,
      reason: errorMsg,
      note: 'App functional without Redis - enrichment/personalization disabled'
    })
  }
}
