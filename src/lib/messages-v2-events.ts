/**
 * SSE Event System for Messages V2
 * In-memory connection management for real-time push to admin/rep browsers.
 * Single connection map (no rep/admin split). Broadcasts to all connected sessions.
 */

export type MessagesEventType =
  | 'NEW_MESSAGE'
  | 'LEAD_UPDATE'
  | 'PREVIEW_CLICK'
  | 'HOT_LEAD'

export interface MessagesEvent {
  type: MessagesEventType
  data: Record<string, unknown>
  timestamp: string
}

interface SSEConnection {
  writer: WritableStreamDefaultWriter
  connectedAt: number
}

const connections = new Map<string, SSEConnection>()

let heartbeatInterval: ReturnType<typeof setInterval> | null = null

function formatSSE(event: MessagesEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`
}

function safeWrite(writer: WritableStreamDefaultWriter, data: string): boolean {
  try {
    const encoder = new TextEncoder()
    writer.write(encoder.encode(data))
    return true
  } catch {
    return false
  }
}

// --- Connection management ---

export function addMessagesConnection(sessionId: string, writer: WritableStreamDefaultWriter): void {
  // Close previous connection from same session
  const existing = connections.get(sessionId)
  if (existing) {
    try { existing.writer.close() } catch { /* already closed */ }
    connections.delete(sessionId)
  }
  connections.set(sessionId, { writer, connectedAt: Date.now() })
}

export function removeMessagesConnection(sessionId: string): void {
  const conn = connections.get(sessionId)
  if (conn) {
    try { conn.writer.close() } catch { /* already closed */ }
    connections.delete(sessionId)
  }
  // Stop heartbeat when no connections remain
  if (connections.size === 0) stopHeartbeat()
}

// --- Push to all connections ---

export function pushToMessages(event: MessagesEvent): void {
  const data = formatSSE(event)
  for (const [id, conn] of connections) {
    const ok = safeWrite(conn.writer, data)
    if (!ok) connections.delete(id)
  }
}

// --- Heartbeat ---

export function startHeartbeat(): void {
  if (heartbeatInterval) return
  heartbeatInterval = setInterval(() => {
    const heartbeat = `: heartbeat\n\n`
    const encoder = new TextEncoder()
    const encoded = encoder.encode(heartbeat)

    for (const [id, conn] of connections) {
      try { conn.writer.write(encoded) } catch { connections.delete(id) }
    }
  }, 15000)
}

export function stopHeartbeat(): void {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval)
    heartbeatInterval = null
  }
}

// --- Stats ---

export function getMessagesConnectionStats() {
  return {
    connections: connections.size,
    connectedSessionIds: Array.from(connections.keys()),
  }
}
