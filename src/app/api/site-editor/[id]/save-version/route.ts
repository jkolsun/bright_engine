import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { saveSiteVersion } from '@/lib/site-versioning'

export const dynamic = 'force-dynamic'

/**
 * POST /api/site-editor/[id]/save-version
 * Saves a versioned backup of siteHtml (called before regenerate, rebuild, etc.)
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const { id } = await context.params
    const { html, source } = await request.json()

    if (!html || typeof html !== 'string' || html.length < 100) {
      return NextResponse.json({ error: 'Valid HTML required (min 100 chars)' }, { status: 400 })
    }

    const validSources = ['manual_save', 'pre_regenerate', 'pre_rebuild', 'ai_edit']
    const safeSource = validSources.includes(source) ? source : 'manual_save'

    const version = await saveSiteVersion(id, html, safeSource)

    return NextResponse.json({ success: true, version })
  } catch (error) {
    console.error('[SaveVersion] Error:', error)
    return NextResponse.json({ error: 'Failed to save version' }, { status: 500 })
  }
}
