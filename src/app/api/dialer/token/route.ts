export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import twilio from 'twilio'

/**
 * POST /api/dialer/token — Generate Twilio WebRTC access token
 * Returns a token that the frontend @twilio/voice-sdk uses to connect.
 */
export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')?.value
  const session = sessionCookie ? await verifySession(sessionCookie) : null
  if (!session || !['ADMIN', 'REP'].includes(session.role)) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const apiKeySid = process.env.TWILIO_API_KEY_SID
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET
  const twimlAppSid = process.env.TWILIO_TWIML_APP_SID

  if (!accountSid || !apiKeySid || !apiKeySecret || !twimlAppSid) {
    return NextResponse.json(
      { error: 'Twilio credentials not fully configured' },
      { status: 500 }
    )
  }

  try {
    const identity = `rep-${session.userId}`

    const accessToken = new twilio.jwt.AccessToken(
      accountSid,
      apiKeySid,
      apiKeySecret,
      { identity, ttl: 3600 }
    )

    const voiceGrant = new twilio.jwt.AccessToken.VoiceGrant({
      outgoingApplicationSid: twimlAppSid,
      incomingAllow: true,
    })

    accessToken.addGrant(voiceGrant)

    return NextResponse.json({
      token: accessToken.toJwt(),
      identity,
    })
  } catch (err) {
    console.error('[Dialer Token] Error generating token:', err)
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 })
  }
}
