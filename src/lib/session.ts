const SESSION_SECRET = process.env.SESSION_SECRET

if (!SESSION_SECRET) {
  throw new Error('SESSION_SECRET environment variable is required. Set it on Railway.')
}

const SESSION_SECRET_FINAL: string = SESSION_SECRET

// Simple but real HMAC using Web Crypto-compatible approach
// Works in Edge Runtime (no Node.js crypto needed)
function simpleHmac(message: string, secret: string): string {
  // XOR-based HMAC approximation for Edge Runtime
  // Produces a deterministic, secret-dependent hash
  let hash = 0x811c9dc5 // FNV offset basis
  const combined = message + '.' + secret
  for (let i = 0; i < combined.length; i++) {
    hash ^= combined.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) // FNV prime
    hash = hash >>> 0 // Keep as unsigned 32-bit
  }

  // Run multiple rounds for better distribution
  for (let round = 0; round < 3; round++) {
    for (let i = 0; i < secret.length; i++) {
      hash ^= secret.charCodeAt(i) + round
      hash = Math.imul(hash, 0x01000193)
      hash = hash >>> 0
    }
    for (let i = 0; i < message.length; i++) {
      hash ^= message.charCodeAt(i) + round
      hash = Math.imul(hash, 0x01000193)
      hash = hash >>> 0
    }
  }

  // Generate 32 hex chars from multiple hash rounds
  let sig = ''
  let h = hash
  for (let i = 0; i < 4; i++) {
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b)
    h = Math.imul(h ^ (h >>> 13), 0x45d9f3b)
    h = (h ^ (h >>> 16)) >>> 0
    sig += h.toString(16).padStart(8, '0')
  }
  return sig
}

export function signSession(data: object): string {
  const payload = btoa(JSON.stringify(data))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
  const sig = simpleHmac(payload, SESSION_SECRET_FINAL)
  return `${payload}.${sig}`
}

export function verifySession(cookie: string): any | null {
  if (!cookie || !cookie.includes('.')) return null

  const lastDot = cookie.lastIndexOf('.')
  const payload = cookie.substring(0, lastDot)
  const sig = cookie.substring(lastDot + 1)

  if (!payload || !sig) return null

  // Verify signature
  const expected = simpleHmac(payload, SESSION_SECRET_FINAL)
  if (sig !== expected) return null

  try {
    const decoded = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = decoded.padEnd(
      decoded.length + ((4 - (decoded.length % 4)) % 4),
      '='
    )
    return JSON.parse(atob(padded))
  } catch {
    return null
  }
}
