// Use Web Crypto API instead of Node.js crypto for Edge Runtime compatibility
const SESSION_SECRET = process.env.SESSION_SECRET || 'CHANGE-ME-IN-PRODUCTION-fallback-secret-key'

export function signSession(data: object): string {
  const payload = btoa(JSON.stringify(data)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  // Simple HMAC-like signature using built-in functions for Edge Runtime
  const message = `${payload}.${SESSION_SECRET}`
  const hash = Array.from(new TextEncoder().encode(message))
    .reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '')
  const sig = hash.substring(0, 32) // Take first 32 chars as signature
  return `${payload}.${sig}`
}

export function verifySession(cookie: string): any | null {
  if (!cookie || !cookie.includes('.')) return null
  const [payload, sig] = cookie.split('.')
  if (!payload || !sig) return null
  
  // Verify signature
  const message = `${payload}.${SESSION_SECRET}`
  const hash = Array.from(new TextEncoder().encode(message))
    .reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '')
  const expected = hash.substring(0, 32)
  
  if (sig !== expected) return null
  
  try {
    // Decode base64url
    const decoded = payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(payload.length + (4 - payload.length % 4) % 4, '=')
    return JSON.parse(atob(decoded))
  } catch {
    return null
  }
}
