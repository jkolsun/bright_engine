import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * GET /api/settings — Fetch settings
 * ?key=company_info → fetch single setting
 * No key → fetch ALL settings as { [key]: value }
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const key = request.nextUrl.searchParams.get('key')

    if (key) {
      const setting = await prisma.settings.findUnique({ where: { key } })
      return NextResponse.json({ key, value: setting?.value ?? null })
    }

    // Fetch all settings
    const allSettings = await prisma.settings.findMany()
    const settingsMap: Record<string, any> = {}
    for (const s of allSettings) {
      settingsMap[s.key] = s.value
    }

    return NextResponse.json({ settings: settingsMap })
  } catch (error) {
    console.error('Settings fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

/**
 * POST /api/settings — Upsert a setting
 * Body: { key: string, value: any }
 */
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const { key, value } = await request.json()

    if (!key || typeof key !== 'string') {
      return NextResponse.json({ error: 'key is required' }, { status: 400 })
    }

    await prisma.settings.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    })

    return NextResponse.json({ success: true, key })
  } catch (error) {
    console.error('Settings save error:', error)
    return NextResponse.json(
      { error: 'Failed to save setting', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
