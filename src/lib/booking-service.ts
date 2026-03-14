/**
 * Booking Service
 * Handles Cal.com booking lifecycle: created, cancelled, rescheduled.
 * Matches leads, updates pipeline status, stops drips, pushes SSE events.
 */

import { prisma } from '@/lib/db'
import { pushToAllAdmins, pushToRep } from '@/lib/dialer-events'
import { pushToMessages } from '@/lib/messages-v2-events'
import type { Lead } from '@prisma/client'

// --- Booking URL cache ---
let cachedBookingUrl: string | null = null
let cachedBookingUrlAt = 0
const BOOKING_URL_TTL = 5 * 60 * 1000 // 5 minutes

// --- Phone normalization ---
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  const withCountry = digits.length === 10 ? `1${digits}` : digits
  return `+${withCountry}`
}

// --- Date formatting ---
function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

// --- Drip stop helper ---
async function stopDripsForLead(leadId: string, reason: string): Promise<void> {
  const activeDrips = await prisma.smsCampaignLead.findMany({
    where: {
      leadId,
      funnelStage: {
        notIn: ['OPTED_OUT', 'ARCHIVED', 'CLOSED'],
      },
    },
  })

  for (const drip of activeDrips) {
    await prisma.smsCampaignLead.update({
      where: { id: drip.id },
      data: {
        funnelStage: 'CLOSED',
        archivedAt: new Date(),
        archiveReason: reason,
      },
    })
  }
}

// ============================================================
// Function 1: getBookingLink
// ============================================================

interface BookingLead {
  id: string
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  phone?: string | null
  companyName?: string | null
}

export async function getBookingLink(lead: BookingLead): Promise<string> {
  // Check cache
  const now = Date.now()
  if (!cachedBookingUrl || now - cachedBookingUrlAt > BOOKING_URL_TTL) {
    // Try DB Settings first
    const setting = await prisma.settings.findUnique({
      where: { key: 'booking_url' },
    })
    const dbUrl = setting?.value as string | null
    const envUrl = process.env.BOOKING_URL

    if (dbUrl) {
      cachedBookingUrl = typeof dbUrl === 'string' ? dbUrl : String(dbUrl)
    } else if (envUrl) {
      cachedBookingUrl = envUrl
    } else {
      cachedBookingUrl = ''
      console.warn('[booking-service] No booking URL configured in Settings or BOOKING_URL env')
    }
    cachedBookingUrlAt = now
  }

  if (!cachedBookingUrl) return ''

  // Build query params
  const params = new URLSearchParams()
  const name = [lead.firstName, lead.lastName].filter(Boolean).join(' ')
  if (name) params.set('name', name)
  if (lead.email) params.set('email', lead.email)
  if (lead.phone) params.set('phone', lead.phone)
  if (lead.companyName) params.set('company', lead.companyName)
  if (lead.id) params.set('metadata[leadId]', lead.id)

  const qs = params.toString()
  if (!qs) return cachedBookingUrl

  const sep = cachedBookingUrl.includes('?') ? '&' : '?'
  return `${cachedBookingUrl}${sep}${qs}`
}

// ============================================================
// Function 2: handleBookingCreated
// ============================================================

interface BookingCreatedPayload {
  email?: string
  phone?: string
  name?: string
  bookingId: string
  startTime: string | Date
  meetingUrl?: string
}

export async function handleBookingCreated(payload: BookingCreatedPayload): Promise<void> {
  const { email, phone, name, bookingId, startTime, meetingUrl } = payload

  // --- Match lead ---
  let lead: Lead | null = null
  let matchedBy = ''

  if (phone) {
    const normalized = normalizePhone(phone)
    lead = await prisma.lead.findFirst({ where: { phone: normalized } })
    if (lead) matchedBy = 'phone'
  }

  if (!lead && email) {
    lead = await prisma.lead.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    })
    if (lead) matchedBy = 'email'
  }

  if (!lead) {
    await prisma.notification.create({
      data: {
        title: 'Booking: No Lead Match',
        message: `Booking ${bookingId} could not be matched. Name: ${name || 'N/A'}, Email: ${email || 'N/A'}, Phone: ${phone || 'N/A'}`,
        type: 'SYSTEM_ALERT',
        metadata: { bookingId, email, phone, name },
      },
    })
    return
  }

  const bookedDate = new Date(startTime)

  // --- Update lead ---
  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      pipelineStatus: 'MEETING_BOOKED',
      meetingBookedAt: bookedDate,
      meetingUrl: meetingUrl || null,
      bookingId,
      dripActive: false,
      priority: 'HOT',
    },
  })

  // --- Create LeadEvent ---
  await prisma.leadEvent.create({
    data: {
      leadId: lead.id,
      eventType: 'MEETING_BOOKED',
      metadata: {
        bookingId,
        startTime: String(startTime),
        meetingUrl: meetingUrl || null,
        source: 'cal.com',
        matchedBy,
      },
    },
  })

  // --- Create Notification ---
  await prisma.notification.create({
    data: {
      title: 'Meeting Booked',
      message: `Meeting Booked: ${lead.companyName} on ${formatDate(bookedDate)}`,
      type: 'HOT_LEAD',
      metadata: { leadId: lead.id, bookingId, companyName: lead.companyName },
    },
  })

  // --- Stop all active drips for this lead ---
  await stopDripsForLead(lead.id, 'meeting_booked')

  // --- Company-wide stop ---
  if (lead.companyName && lead.city) {
    const companyLeads = await prisma.lead.findMany({
      where: {
        id: { not: lead.id },
        companyName: { equals: lead.companyName, mode: 'insensitive' },
        city: { equals: lead.city, mode: 'insensitive' },
      },
    })

    for (const companyLead of companyLeads) {
      await stopDripsForLead(companyLead.id, 'meeting_booked')

      await prisma.leadEvent.create({
        data: {
          leadId: companyLead.id,
          eventType: 'PIPELINE_STATUS_CHANGE',
          metadata: {
            reason: 'company_wide_booking_stop',
            triggerLeadId: lead.id,
            triggerCompanyName: lead.companyName,
          },
        },
      })
    }
  }

  // --- Push SSE ---
  const ts = new Date().toISOString()

  pushToAllAdmins({
    type: 'HOT_LEAD',
    data: { leadId: lead.id, companyName: lead.companyName, bookingId },
    timestamp: ts,
  })

  pushToMessages({
    type: 'LEAD_UPDATE',
    data: { leadId: lead.id, companyName: lead.companyName, pipelineStatus: 'MEETING_BOOKED' },
    timestamp: ts,
  })

  if (lead.assignedToId) {
    pushToRep(lead.assignedToId, {
      type: 'HOT_LEAD',
      data: { leadId: lead.id, companyName: lead.companyName, bookingId },
      timestamp: ts,
    })
  }
}

// ============================================================
// Function 3: handleBookingCancelled
// ============================================================

interface BookingCancelledPayload {
  bookingId: string
}

export async function handleBookingCancelled(payload: BookingCancelledPayload): Promise<void> {
  const { bookingId } = payload

  const lead = await prisma.lead.findFirst({ where: { bookingId } })
  if (!lead) {
    console.warn(`[booking-service] handleBookingCancelled: no lead found for bookingId=${bookingId}`)
    return
  }

  // Update lead — noShow=true, do NOT change pipelineStatus
  await prisma.lead.update({
    where: { id: lead.id },
    data: { noShow: true },
  })

  // Create LeadEvent
  await prisma.leadEvent.create({
    data: {
      leadId: lead.id,
      eventType: 'MEETING_CANCELLED',
      metadata: { bookingId },
    },
  })

  // Create Notification
  await prisma.notification.create({
    data: {
      title: 'Meeting Cancelled',
      message: `Meeting Cancelled: ${lead.companyName}. Manual follow-up needed.`,
      type: 'HOT_LEAD',
      metadata: { leadId: lead.id, bookingId, companyName: lead.companyName },
    },
  })
}

// ============================================================
// Function 4: handleBookingRescheduled
// ============================================================

interface BookingRescheduledPayload {
  bookingId: string
  newStartTime: string | Date
}

export async function handleBookingRescheduled(payload: BookingRescheduledPayload): Promise<void> {
  const { bookingId, newStartTime } = payload

  const lead = await prisma.lead.findFirst({ where: { bookingId } })
  if (!lead) {
    console.warn(`[booking-service] handleBookingRescheduled: no lead found for bookingId=${bookingId}`)
    return
  }

  const newDate = new Date(newStartTime)

  // Update lead
  await prisma.lead.update({
    where: { id: lead.id },
    data: { meetingBookedAt: newDate },
  })

  // Create LeadEvent
  await prisma.leadEvent.create({
    data: {
      leadId: lead.id,
      eventType: 'MEETING_BOOKED',
      metadata: {
        bookingId,
        rescheduled: true,
        newTime: String(newStartTime),
      },
    },
  })

  // Create Notification
  await prisma.notification.create({
    data: {
      title: 'Meeting Rescheduled',
      message: `Meeting Rescheduled: ${lead.companyName} moved to ${formatDate(newDate)}`,
      type: 'HOT_LEAD',
      metadata: { leadId: lead.id, bookingId, companyName: lead.companyName },
    },
  })
}
