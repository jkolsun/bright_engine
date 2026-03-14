import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { prisma } from '@/lib/db'
import {
  handleBookingCreated,
  handleBookingCancelled,
  handleBookingRescheduled,
} from '@/lib/booking-service'

export const dynamic = 'force-dynamic'

interface ExtractedBooking {
  email: string | null
  name: string | null
  phone: string | null
  bookingId: string | null
  startTime: string | null
  meetingUrl: string | null
  provider: 'calcom' | 'calendly' | 'unknown'
  rawPayload: any
}

type BookingEventType = 'created' | 'cancelled' | 'rescheduled' | 'unknown'

function verifySignature(rawBody: string, secret: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) return false
  const computed = createHmac('sha256', secret).update(rawBody).digest('hex')
  return computed === signatureHeader
}

function normalizeEventType(payload: any): { eventType: BookingEventType; provider: 'calcom' | 'calendly' | 'unknown' } {
  // Cal.com: triggerEvent field
  if (payload.triggerEvent) {
    const trigger = payload.triggerEvent as string
    if (trigger === 'BOOKING_CREATED') return { eventType: 'created', provider: 'calcom' }
    if (trigger === 'BOOKING_CANCELLED') return { eventType: 'cancelled', provider: 'calcom' }
    if (trigger === 'BOOKING_RESCHEDULED') return { eventType: 'rescheduled', provider: 'calcom' }
    return { eventType: 'unknown', provider: 'calcom' }
  }

  // Calendly: event field
  if (payload.event) {
    const event = payload.event as string
    if (event === 'invitee.created') return { eventType: 'created', provider: 'calendly' }
    if (event === 'invitee.canceled') return { eventType: 'cancelled', provider: 'calendly' }
    return { eventType: 'unknown', provider: 'calendly' }
  }

  return { eventType: 'unknown', provider: 'unknown' }
}

function extractBookingData(payload: any, provider: 'calcom' | 'calendly' | 'unknown'): ExtractedBooking {
  if (provider === 'calcom') {
    const attendee = payload.payload?.attendees?.[0]
    return {
      email: attendee?.email || null,
      name: attendee?.name || null,
      phone: attendee?.phone || null,
      bookingId: payload.payload?.uid || null,
      startTime: payload.payload?.startTime || null,
      meetingUrl: payload.payload?.metadata?.videoCallUrl || null,
      provider,
      rawPayload: payload,
    }
  }

  if (provider === 'calendly') {
    const invitee = payload.payload?.invitee
    return {
      email: invitee?.email || null,
      name: invitee?.name || null,
      phone: null,
      bookingId: payload.payload?.event?.uri || null,
      startTime: payload.payload?.event?.start_time || null,
      meetingUrl: null,
      provider,
      rawPayload: payload,
    }
  }

  return {
    email: null,
    name: null,
    phone: null,
    bookingId: null,
    startTime: null,
    meetingUrl: null,
    provider: 'unknown',
    rawPayload: payload,
  }
}

// POST /api/webhooks/booking - Handle booking provider webhooks (Cal.com, Calendly)
export async function POST(request: NextRequest) {
  let rawBody = ''

  try {
    // 1. Read raw body for signature verification
    rawBody = await request.text()

    // 2. Verify webhook signature
    const secret = process.env.BOOKING_WEBHOOK_SECRET
    if (secret) {
      const calSignature = request.headers.get('x-cal-signature-256')
      const calendlySignature = request.headers.get('Calendly-Webhook-Signature')
      const signature = calSignature || calendlySignature

      const isValid = verifySignature(rawBody, secret, signature)
      if (!isValid) {
        console.error('[Booking Webhook] Invalid signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    } else {
      console.warn('[Booking Webhook] BOOKING_WEBHOOK_SECRET not set — skipping signature verification (dev mode)')
    }

    // 3. Parse JSON body
    const payload = JSON.parse(rawBody)

    // 4. Determine event type and provider
    const { eventType, provider } = normalizeEventType(payload)

    // 5. Extract booking data
    const extracted = extractBookingData(payload, provider)

    // 6. Route to handler (convert null→undefined for type compat)
    const toUndef = (v: string | null) => v ?? undefined
    switch (eventType) {
      case 'created':
        await handleBookingCreated({
          email: toUndef(extracted.email),
          phone: toUndef(extracted.phone),
          name: toUndef(extracted.name),
          bookingId: extracted.bookingId || '',
          startTime: extracted.startTime || new Date().toISOString(),
          meetingUrl: toUndef(extracted.meetingUrl),
        })
        break
      case 'cancelled':
        await handleBookingCancelled({
          bookingId: extracted.bookingId || '',
        })
        break
      case 'rescheduled':
        await handleBookingRescheduled({
          bookingId: extracted.bookingId || '',
          newStartTime: extracted.startTime || new Date().toISOString(),
        })
        break
      case 'unknown':
        console.log(`[Booking Webhook] Unknown event type from ${provider}:`, JSON.stringify(payload).substring(0, 500))
        break
    }
  } catch (error: any) {
    console.error('[Booking Webhook] Error processing webhook:', error)

    // 7. Log to FailedWebhook
    try {
      await prisma.failedWebhook.create({
        data: {
          source: 'booking',
          payload: rawBody ? JSON.parse(rawBody) : { raw: rawBody },
          error: error.message || 'Unknown error',
        },
      })
    } catch (logErr) {
      console.error('[Booking Webhook] Failed to log to FailedWebhook:', logErr)
    }
  }

  // 8. Always return 200
  return NextResponse.json({ received: true })
}
