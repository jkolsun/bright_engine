import { NextResponse } from 'next/server'

export async function GET() {
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN
  const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER

  const connected = !!(twilioAccountSid && twilioAuthToken && twilioPhoneNumber)

  return NextResponse.json({
    connected,
    phoneNumber: connected ? twilioPhoneNumber : null,
    message: connected 
      ? 'Twilio is configured and ready' 
      : 'Twilio credentials not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to environment variables.'
  })
}
