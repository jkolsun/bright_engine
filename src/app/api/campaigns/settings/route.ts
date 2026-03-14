import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

// All SMS campaign setting keys with their defaults
const SMS_SETTING_KEYS: Record<string, unknown> = {
  sms_cold_template:
    'Hey {firstName}, I built a free website for {companyName} — check it out: {previewUrl}',
  sms_drip_templates: [],
  sms_send_window: { startHour: 9, endHour: 11, days: ['tue', 'wed', 'thu'] },
  sms_daily_limit: 200,
  sms_from_number: '',
  sms_throttle_per_minute: 10,
  booking_url: '',
}

// Default drip templates used when none are configured
const DEFAULT_DRIP_TEMPLATES = [
  { body: "Hey {firstName}, great chatting with our team! Here's your link to book a free strategy call with Andrew: {bookingLink}. He'll walk you through everything we can do for {companyName}.", dayOffset: 1 },
  { body: "Hey {firstName}, other {industry} businesses in {state} are already getting more customers online. Let's get {companyName} set up too: {bookingLink}", dayOffset: 3 },
  { body: "Hi {firstName}, your custom site is ready to go — just need 15 min to finalize the plan with you: {bookingLink}", dayOffset: 7 },
  { body: "Hey {firstName}, last few spots this week for free strategy calls. Grab yours here: {bookingLink}", dayOffset: 10 },
  { body: "Hi {firstName}, last check-in about your website for {companyName}. Link's always open if you want to chat: {bookingLink}. No pressure either way!", dayOffset: 14 },
]

/**
 * Convert DB settings (snake_case keys, compound JSON) to UI settings (camelCase, flat fields)
 */
function dbToUiSettings(dbSettings: Record<string, unknown>): Record<string, unknown> {
  const dripTemplates = (dbSettings.sms_drip_templates as Array<{ body: string; dayOffset: number }>) || DEFAULT_DRIP_TEMPLATES
  const sendWindow = (dbSettings.sms_send_window as { startHour: number; endHour: number; days: string[] }) || { startHour: 9, endHour: 11, days: ['tue', 'wed', 'thu'] }

  // Capitalize day names to match UI format (Mon, Tue, etc.)
  const capitalizedDays = (sendWindow.days || []).map((d: string) =>
    d.charAt(0).toUpperCase() + d.slice(1).toLowerCase()
  )

  return {
    coldTextTemplate: dbSettings.sms_cold_template || '',
    drip1Template: dripTemplates[0]?.body || '',
    drip1DayOffset: dripTemplates[0]?.dayOffset ?? 1,
    drip2Template: dripTemplates[1]?.body || '',
    drip2DayOffset: dripTemplates[1]?.dayOffset ?? 3,
    drip3Template: dripTemplates[2]?.body || '',
    drip3DayOffset: dripTemplates[2]?.dayOffset ?? 7,
    drip4Template: dripTemplates[3]?.body || '',
    drip4DayOffset: dripTemplates[3]?.dayOffset ?? 10,
    drip5Template: dripTemplates[4]?.body || '',
    drip5DayOffset: dripTemplates[4]?.dayOffset ?? 14,
    sendWindowStart: sendWindow.startHour ?? 9,
    sendWindowEnd: sendWindow.endHour ?? 11,
    sendDays: capitalizedDays,
    dailyLimit: dbSettings.sms_daily_limit ?? 200,
    messagesPerMinute: dbSettings.sms_throttle_per_minute ?? 10,
    smsFromNumber: dbSettings.sms_from_number || '',
    bookingUrl: dbSettings.booking_url || '',
  }
}

/**
 * Convert UI settings (camelCase, flat fields) to DB settings (snake_case keys, compound JSON)
 */
function uiToDbSettings(uiSettings: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  if ('coldTextTemplate' in uiSettings) {
    result.sms_cold_template = uiSettings.coldTextTemplate
  }

  if ('smsFromNumber' in uiSettings) {
    result.sms_from_number = uiSettings.smsFromNumber
  }

  if ('dailyLimit' in uiSettings) {
    result.sms_daily_limit = uiSettings.dailyLimit
  }

  if ('messagesPerMinute' in uiSettings) {
    result.sms_throttle_per_minute = uiSettings.messagesPerMinute
  }

  if ('bookingUrl' in uiSettings) {
    result.booking_url = uiSettings.bookingUrl
  }

  // Compose drip templates array from individual fields
  if ('drip1Template' in uiSettings) {
    result.sms_drip_templates = [1, 2, 3, 4, 5].map(n => ({
      body: (uiSettings[`drip${n}Template`] as string) || '',
      dayOffset: (uiSettings[`drip${n}DayOffset`] as number) ?? (n === 1 ? 1 : n === 2 ? 3 : n === 3 ? 7 : n === 4 ? 10 : 14),
    }))
  }

  // Compose send window object from individual fields
  if ('sendWindowStart' in uiSettings || 'sendWindowEnd' in uiSettings || 'sendDays' in uiSettings) {
    const days = (uiSettings.sendDays as string[]) || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
    result.sms_send_window = {
      startHour: (uiSettings.sendWindowStart as number) ?? 9,
      endHour: (uiSettings.sendWindowEnd as number) ?? 11,
      // Store days in lowercase to match backend expectations
      days: days.map(d => d.toLowerCase()),
    }
  }

  return result
}

// GET /api/campaigns/settings — Read SMS campaign settings
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
    }

    const keys = Object.keys(SMS_SETTING_KEYS)
    const settings = await prisma.settings.findMany({
      where: { key: { in: keys } },
    })

    // Build DB-level result with defaults for missing keys
    const dbResult: Record<string, unknown> = {}
    for (const key of keys) {
      const found = settings.find((s) => s.key === key)
      dbResult[key] = found ? found.value : SMS_SETTING_KEYS[key]
    }

    // Translate to UI-expected shape
    const uiResult = dbToUiSettings(dbResult)

    return NextResponse.json({ settings: uiResult })
  } catch (error) {
    console.error('Error fetching campaign settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

// PUT /api/campaigns/settings — Update SMS campaign settings
export async function PUT(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
    }

    const body = await request.json()

    // Translate UI camelCase keys to DB snake_case keys
    const dbSettings = uiToDbSettings(body)

    const validKeys = Object.keys(SMS_SETTING_KEYS)

    // Filter to only valid SMS setting keys
    const updates: { key: string; value: unknown }[] = []
    for (const key of validKeys) {
      if (key in dbSettings && dbSettings[key] !== undefined) {
        updates.push({ key, value: dbSettings[key] })
      }
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No valid settings provided' },
        { status: 400 }
      )
    }

    // Upsert each setting
    await Promise.all(
      updates.map((update) =>
        prisma.settings.upsert({
          where: { key: update.key },
          update: { value: update.value as any },
          create: { key: update.key, value: update.value as any },
        })
      )
    )

    // Return updated settings in UI format
    const allSettings = await prisma.settings.findMany({
      where: { key: { in: validKeys } },
    })

    const dbResult: Record<string, unknown> = {}
    for (const key of validKeys) {
      const found = allSettings.find((s) => s.key === key)
      dbResult[key] = found ? found.value : SMS_SETTING_KEYS[key]
    }

    const uiResult = dbToUiSettings(dbResult)

    return NextResponse.json({ settings: uiResult })
  } catch (error) {
    console.error('Error updating campaign settings:', error)
    return NextResponse.json(
      { error: 'Failed to update settings', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
