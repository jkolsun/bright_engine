const SESSION_SECRET = process.env.SESSION_SECRET || 'build-placeholder-do-not-use-in-production'

function validateSessionSecret() {
  if (SESSION_SECRET === 'build-placeholder-do-not-use-in-production') {
    throw new Error('SESSION_SECRET environment variable is required and not set')
  }
}

async function hmacSign(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message))
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function signSession(data: object): Promise<string> {
  validateSessionSecret()
  const payload = btoa(JSON.stringify(data))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
  const sig = await hmacSign(payload, SESSION_SECRET)
  return `${payload}.${sig}`
}

export async function verifySession(cookie: string): Promise<any | null> {
  validateSessionSecret()
  if (!cookie || !cookie.includes('.')) return null

  const lastDot = cookie.lastIndexOf('.')
  const payload = cookie.substring(0, lastDot)
  const sig = cookie.substring(lastDot + 1)

  if (!payload || !sig) return null

  const expected = await hmacSign(payload, SESSION_SECRET)
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
