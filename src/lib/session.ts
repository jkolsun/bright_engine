import crypto from 'crypto'

const SESSION_SECRET = process.env.SESSION_SECRET || 'CHANGE-ME-IN-PRODUCTION-' + crypto.randomBytes(16).toString('hex')

export function signSession(data: object): string {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url')
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex')
  return `${payload}.${sig}`
}

export function verifySession(cookie: string): any | null {
  if (!cookie || !cookie.includes('.')) return null
  const [payload, sig] = cookie.split('.')
  if (!payload || !sig) return null
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex')
  if (!crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))) return null
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString())
  } catch {
    return null
  }
}
