export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

const SETTINGS_KEY = 'messages_v2_preferences'

const DEFAULT_SETTINGS = {
  autoPushBuilds: true,
  showAiConversations: true,
  showArchivedLeads: false,
  showDncLeads: false,
  compactMode: false,
  sidebarDefaultOpen: true,
  soundNotifications: false,
  sortBy: 'newest',
  defaultAiMode: 'FULL_AUTO',
}

/**
 * GET /api/messages-v2/settings — Fetch Messages V2 preferences
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const setting = await prisma.settings.findUnique({ where: { key: SETTINGS_KEY } })
    const value = setting?.value ?? DEFAULT_SETTINGS

    return NextResponse.json({ key: SETTINGS_KEY, value })
  } catch (error) {
    console.error('Messages V2 settings fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/messages-v2/settings — Update Messages V2 preferences
 * Body: partial settings object to merge with existing
 */
export async function PUT(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const updates = await request.json()

    // Fetch existing and merge
    const existing = await prisma.settings.findUnique({ where: { key: SETTINGS_KEY } })
    const currentValue = (existing?.value as Record<string, unknown>) ?? DEFAULT_SETTINGS
    const merged = { ...DEFAULT_SETTINGS, ...currentValue, ...updates }

    await prisma.settings.upsert({
      where: { key: SETTINGS_KEY },
      create: { key: SETTINGS_KEY, value: merged },
      update: { value: merged },
    })

    return NextResponse.json({ success: true, key: SETTINGS_KEY, value: merged })
  } catch (error) {
    console.error('Messages V2 settings update error:', error)
    return NextResponse.json(
      { error: 'Failed to update settings', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
