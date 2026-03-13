import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

const SETTINGS_KEY = 'social_outreach_settings'

// POST /api/social-campaigns/settings/test-linkedin
// Pings Expandi API with the stored key to verify connection
export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')?.value
  const session = sessionCookie ? await verifySession(sessionCookie) : null
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin required' }, { status: 403 })
  }

  try {
    const setting = await prisma.settings.findUnique({ where: { key: SETTINGS_KEY } })
    const config = setting?.value as Record<string, any> | null

    const apiKey = config?.linkedin?.expandiApiKey
    if (!apiKey) {
      return NextResponse.json({ connected: false, error: 'No Expandi API key configured' })
    }

    // Ping Expandi API to validate the key
    const res = await fetch('https://api.expandi.io/api/v1/user/me', {
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    if (res.ok) {
      // Update connected status in settings
      const updated = {
        ...config,
        linkedin: { ...config?.linkedin, connected: true },
      }
      await prisma.settings.update({
        where: { key: SETTINGS_KEY },
        data: { value: updated },
      })
      return NextResponse.json({ connected: true })
    }

    return NextResponse.json({ connected: false, error: `Expandi returned ${res.status}` })
  } catch (error) {
    console.error('LinkedIn test connection error:', error)
    return NextResponse.json({ connected: false, error: 'Connection test failed' })
  }
}
