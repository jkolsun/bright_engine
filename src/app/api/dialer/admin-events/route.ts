export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { verifySession } from '@/lib/session'
import {
  addAdminConnection,
  removeAdminConnection,
  startHeartbeat,
} from '@/lib/dialer-events'

/**
 * GET /api/dialer/admin-events — Admin SSE stream
 * Real-time dialer events for admin dashboard (all rep activity).
 */
export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')?.value
  const session = sessionCookie ? await verifySession(sessionCookie) : null
  if (!session || session.role !== 'ADMIN') {
    return new Response(JSON.stringify({ error: 'Admin access required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const adminId = session.userId

  startHeartbeat()

  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()

  addAdminConnection(adminId, writer)

  const encoder = new TextEncoder()
  writer.write(
    encoder.encode(
      `event: SESSION_UPDATE\ndata: ${JSON.stringify({ connected: true, adminId })}\n\n`
    )
  )

  request.signal.addEventListener('abort', () => {
    removeAdminConnection(adminId)
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
