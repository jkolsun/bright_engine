export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { verifySession } from '@/lib/session'
import {
  addRepConnection,
  removeRepConnection,
  startHeartbeat,
} from '@/lib/dialer-events'

/**
 * GET /api/dialer/events — Rep SSE stream
 * Real-time events for the dialer UI (call status, preview tracking, recommendations, etc.)
 */
export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')?.value
  const session = sessionCookie ? await verifySession(sessionCookie) : null
  if (!session || !['ADMIN', 'REP'].includes(session.role)) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const repId = session.userId

  // Ensure heartbeat is running
  startHeartbeat()

  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()

  // Register connection
  addRepConnection(repId, writer)

  // Send initial connected event
  const encoder = new TextEncoder()
  writer.write(
    encoder.encode(
      `event: SESSION_UPDATE\ndata: ${JSON.stringify({ connected: true, repId })}\n\n`
    )
  )

  // Cleanup on disconnect
  request.signal.addEventListener('abort', () => {
    removeRepConnection(repId)
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
