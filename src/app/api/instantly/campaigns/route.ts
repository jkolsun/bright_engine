import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

// GET /api/instantly/campaigns — Fetch available campaigns from Instantly API
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const apiKey = process.env.INSTANTLY_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'INSTANTLY_API_KEY not configured' }, { status: 500 })
    }

    const response = await fetch('https://api.instantly.ai/api/v2/campaigns?limit=100', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    })

    if (!response.ok) {
      const errBody = await response.text()
      return NextResponse.json(
        { error: 'Failed to fetch campaigns from Instantly', details: errBody.substring(0, 200) },
        { status: 500 },
      )
    }

    const data = await response.json()
    const campaigns = (data.data || data.campaigns || data.items || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      status: c.status,
    }))

    return NextResponse.json({ campaigns })
  } catch (error) {
    console.error('Fetch Instantly campaigns error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch campaigns', details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
