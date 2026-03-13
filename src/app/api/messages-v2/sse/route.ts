export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { verifySession } from '@/lib/session'
import {
  addMessagesConnection,
  removeMessagesConnection,
  startHeartbeat,
} from '@/lib/messages-v2-events'

/**
 * GET /api/messages-v2/sse — Messages V2 SSE stream
 * Real-time events for the Messages V2 UI (new messages, lead updates, preview clicks, hot leads)
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

  const sessionId = `${session.userId}-${Date.now()}`

  // Ensure heartbeat is running
  startHeartbeat()

  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()

  // Register connection
  addMessagesConnection(sessionId, writer)

  // Send initial connected event
  const encoder = new TextEncoder()
  writer.write(
    encoder.encode(
      `event: CONNECTED\ndata: ${JSON.stringify({ connected: true, sessionId, userId: session.userId })}\n\n`
    )
  )

  // Cleanup on disconnect
  request.signal.addEventListener('abort', () => {
    removeMessagesConnection(sessionId)
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
