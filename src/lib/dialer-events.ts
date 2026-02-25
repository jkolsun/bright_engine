/**
 * SSE Event System for Power Dialer
 * In-memory connection management for real-time push to rep browsers and admin dashboards.
 * Bug 5: Memory leak prevention — close prev connection from same ID, heartbeat cleanup.
 */

export type DialerEventType =
  | 'CALL_STATUS'
  | 'PREVIEW_SENT'
  | 'PREVIEW_OPENED'
  | 'CTA_CLICKED'
  | 'RECOMMENDATION_UPDATE'
  | 'QUEUE_UPDATE'
  | 'INBOUND_CALL'
  | 'SESSION_UPDATE'
  | 'VM_DROP_COMPLETE'
  | 'DISPOSITION_LOGGED'

export interface DialerEvent {
  type: DialerEventType
  data: Record<string, unknown>
  timestamp: string
}

interface SSEConnection {
  writer: WritableStreamDefaultWriter
  connectedAt: number
}

const repConnections = new Map<string, SSEConnection>()
const adminConnections = new Map<string, SSEConnection>()

let heartbeatInterval: ReturnType<typeof setInterval> | null = null

function formatSSE(event: DialerEvent): string {
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

// --- Rep connections ---

export function addRepConnection(repId: string, writer: WritableStreamDefaultWriter): void {
  // Bug 5: Close previous connection from same rep
  const existing = repConnections.get(repId)
  if (existing) {
    try { existing.writer.close() } catch { /* already closed */ }
    repConnections.delete(repId)
  }
  repConnections.set(repId, { writer, connectedAt: Date.now() })
}

export function removeRepConnection(repId: string): void {
  const conn = repConnections.get(repId)
  if (conn) {
    try { conn.writer.close() } catch { /* already closed */ }
    repConnections.delete(repId)
  }
  // Stop heartbeat when no connections remain
  if (repConnections.size === 0 && adminConnections.size === 0) stopHeartbeat()
}

export function pushToRep(repId: string, event: DialerEvent): void {
  const conn = repConnections.get(repId)
  if (!conn) return
  const ok = safeWrite(conn.writer, formatSSE(event))
  if (!ok) {
    repConnections.delete(repId)
  }
}

export function pushToAllReps(event: DialerEvent): void {
  const data = formatSSE(event)
  for (const [repId, conn] of repConnections) {
    const ok = safeWrite(conn.writer, data)
    if (!ok) repConnections.delete(repId)
  }
}

// --- Admin connections ---

export function addAdminConnection(adminId: string, writer: WritableStreamDefaultWriter): void {
  const existing = adminConnections.get(adminId)
  if (existing) {
    try { existing.writer.close() } catch { /* already closed */ }
    adminConnections.delete(adminId)
  }
  adminConnections.set(adminId, { writer, connectedAt: Date.now() })
}

export function removeAdminConnection(adminId: string): void {
  const conn = adminConnections.get(adminId)
  if (conn) {
    try { conn.writer.close() } catch { /* already closed */ }
    adminConnections.delete(adminId)
  }
  // Stop heartbeat when no connections remain
  if (repConnections.size === 0 && adminConnections.size === 0) stopHeartbeat()
}

export function pushToAllAdmins(event: DialerEvent): void {
  const data = formatSSE(event)
  for (const [adminId, conn] of adminConnections) {
    const ok = safeWrite(conn.writer, data)
    if (!ok) adminConnections.delete(adminId)
  }
}

// --- Heartbeat ---

export function startHeartbeat(): void {
  if (heartbeatInterval) return
  heartbeatInterval = setInterval(() => {
    const heartbeat = `: heartbeat\n\n`
    const encoder = new TextEncoder()
    const encoded = encoder.encode(heartbeat)

    for (const [id, conn] of repConnections) {
      try { conn.writer.write(encoded) } catch { repConnections.delete(id) }
    }
    for (const [id, conn] of adminConnections) {
      try { conn.writer.write(encoded) } catch { adminConnections.delete(id) }
    }
  }, 15000)
}

export function stopHeartbeat(): void {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval)
    heartbeatInterval = null
  }
}

// --- Stats (for admin live view) ---

export function getConnectionStats() {
  return {
    repConnections: repConnections.size,
    adminConnections: adminConnections.size,
    connectedRepIds: Array.from(repConnections.keys()),
  }
}
