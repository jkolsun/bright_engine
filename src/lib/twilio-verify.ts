/**
 * Twilio webhook signature verification utility.
 * Bug 9: All Twilio webhook routes must verify X-Twilio-Signature.
 * Skips verification in development mode.
 */

import twilio from 'twilio'

export async function verifyTwilioSignature(
  request: Request,
  publicUrl: string
): Promise<boolean> {
  // Skip in development
  if (process.env.NODE_ENV !== 'production') {
    return true
  }

  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (!authToken) {
    console.error('[TwilioVerify] TWILIO_AUTH_TOKEN not set')
    return false
  }

  const signature = request.headers.get('x-twilio-signature')
  if (!signature) {
    console.warn('[TwilioVerify] Missing X-Twilio-Signature header')
    return false
  }

  try {
    const clonedRequest = request.clone()
    const formData = await clonedRequest.formData()
    const params: Record<string, string> = {}
    formData.forEach((value, key) => {
      params[key] = String(value)
    })

    return twilio.validateRequest(authToken, signature, publicUrl, params)
  } catch (err) {
    console.error('[TwilioVerify] Signature validation error:', err)
    return false
  }
}
