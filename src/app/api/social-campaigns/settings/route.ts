import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

const SETTINGS_KEY = 'social_outreach_settings'

const DEFAULT_SETTINGS = {
  bookingLink: '',
  webhookSecret: '',
  instagram: {
    connected: false,
    phantombusterApiKey: '',
    phantombusterAgentId: '',
    dailyLimit: 20,
    sendWindowStart: 9,
    sendWindowEnd: 17,
  },
  linkedin: {
    connected: false,
    expandiApiKey: '',
    expandiCampaignId: '',
    dailyLimit: 20,
    sendWindowStart: 9,
    sendWindowEnd: 17,
  },
}

// GET /api/social-campaigns/settings
export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')?.value
  const session = sessionCookie ? await verifySession(sessionCookie) : null
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin required' }, { status: 403 })
  }

  const setting = await prisma.settings.findUnique({ where: { key: SETTINGS_KEY } })
  const config = (setting?.value as Record<string, any>) ?? DEFAULT_SETTINGS

  return NextResponse.json({ settings: maskApiKeys(config) })
}

// PUT /api/social-campaigns/settings
export async function PUT(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')?.value
  const session = sessionCookie ? await verifySession(sessionCookie) : null
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin required' }, { status: 403 })
  }

  try {
    const body = await request.json()

    // Get existing settings to merge (don't overwrite masked fields)
    const existing = await prisma.settings.findUnique({ where: { key: SETTINGS_KEY } })
    const current = (existing?.value as Record<string, any>) ?? DEFAULT_SETTINGS

    // Deep merge — if field is '****' (masked placeholder), keep existing value
    const merged = deepMergeSettings(current, body)

    await prisma.settings.upsert({
      where: { key: SETTINGS_KEY },
      create: { key: SETTINGS_KEY, value: merged },
      update: { value: merged },
    })

    return NextResponse.json({ settings: maskApiKeys(merged) })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}

function maskApiKeys(config: Record<string, any>): Record<string, any> {
  const clone = JSON.parse(JSON.stringify(config))
  if (clone.instagram?.phantombusterApiKey?.length > 4) {
    clone.instagram.phantombusterApiKey = '****' + clone.instagram.phantombusterApiKey.slice(-4)
  }
  if (clone.linkedin?.expandiApiKey?.length > 4) {
    clone.linkedin.expandiApiKey = '****' + clone.linkedin.expandiApiKey.slice(-4)
  }
  if (clone.webhookSecret?.length > 4) {
    clone.webhookSecret = '****' + clone.webhookSecret.slice(-4)
  }
  return clone
}

function deepMergeSettings(current: Record<string, any>, incoming: Record<string, any>): Record<string, any> {
  const result = { ...current }
  for (const key of Object.keys(incoming)) {
    if (typeof incoming[key] === 'object' && incoming[key] !== null && !Array.isArray(incoming[key])) {
      result[key] = deepMergeSettings(current[key] || {}, incoming[key])
    } else if (typeof incoming[key] === 'string' && incoming[key].startsWith('****')) {
      // Masked — keep existing
      result[key] = current[key]
    } else {
      result[key] = incoming[key]
    }
  }
  return result
}
