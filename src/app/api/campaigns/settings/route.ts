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

    // Build response with defaults for missing keys
    const result: Record<string, unknown> = {}
    for (const key of keys) {
      const found = settings.find((s) => s.key === key)
      result[key] = found ? found.value : SMS_SETTING_KEYS[key]
    }

    return NextResponse.json({ settings: result })
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
    const validKeys = Object.keys(SMS_SETTING_KEYS)

    // Filter to only valid SMS setting keys
    const updates: { key: string; value: unknown }[] = []
    for (const key of validKeys) {
      if (key in body && body[key] !== undefined) {
        updates.push({ key, value: body[key] })
      }
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No valid settings provided. Valid keys: ' + validKeys.join(', ') },
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

    // Return updated settings
    const allSettings = await prisma.settings.findMany({
      where: { key: { in: validKeys } },
    })

    const result: Record<string, unknown> = {}
    for (const key of validKeys) {
      const found = allSettings.find((s) => s.key === key)
      result[key] = found ? found.value : SMS_SETTING_KEYS[key]
    }

    return NextResponse.json({ settings: result })
  } catch (error) {
    console.error('Error updating campaign settings:', error)
    return NextResponse.json(
      { error: 'Failed to update settings', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
