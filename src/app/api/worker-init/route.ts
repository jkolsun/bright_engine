export const dynamic = 'force-dynamic'

import { startWorkers } from '@/worker/index'

let initialized = false

export async function GET() {
  if (!initialized) {
    try {
      await startWorkers()
      initialized = true
      return Response.json({ status: 'Worker started' })
    } catch (error) {
      return Response.json(
        { status: 'Worker failed', error: String(error) },
        { status: 500 }
      )
    }
  }
  return Response.json({ status: 'Already running' })
}
