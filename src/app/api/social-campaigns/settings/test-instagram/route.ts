import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

const SETTINGS_KEY = 'social_outreach_settings'

// POST /api/social-campaigns/settings/test-instagram
// Pings PhantomBuster API with the stored key to verify connection
export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')?.value
  const session = sessionCookie ? await verifySession(sessionCookie) : null
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin required' }, { status: 403 })
  }

  try {
    const setting = await prisma.settings.findUnique({ where: { key: SETTINGS_KEY } })
    const config = setting?.value as Record<string, any> | null

    const apiKey = config?.instagram?.phantombusterApiKey
    if (!apiKey) {
      return NextResponse.json({ connected: false, error: 'No PhantomBuster API key configured' })
    }

    // Ping PhantomBuster /user endpoint to validate the key
    const res = await fetch('https://api.phantombuster.com/api/v2/user', {
      headers: { 'X-Phantombuster-Key': apiKey },
    })

    if (res.ok) {
      // Update connected status in settings
      const updated = {
        ...config,
        instagram: { ...config?.instagram, connected: true },
      }
      await prisma.settings.update({
        where: { key: SETTINGS_KEY },
        data: { value: updated },
      })
      return NextResponse.json({ connected: true })
    }

    // Mark as disconnected on failure
    if (config) {
      const updated = { ...config, instagram: { ...config.instagram, connected: false } }
      await prisma.settings.update({ where: { key: SETTINGS_KEY }, data: { value: updated } }).catch(() => {})
    }
    return NextResponse.json({ connected: false, error: `PhantomBuster returned ${res.status}` })
  } catch (error) {
    console.error('Instagram test connection error:', error)
    return NextResponse.json({ connected: false, error: 'Connection test failed' })
  }
}
