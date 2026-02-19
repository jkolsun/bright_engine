export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

/**
 * POST /api/instantly/sync-campaigns
 * Fetch ALL campaigns from Instantly API and store selected ones in Settings table
 * If body contains { campaigns: { key: id } }, it saves those directly.
 * If no body, it fetches from Instantly and returns the list for the UI to pick from.
 */
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const apiKey = process.env.INSTANTLY_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'INSTANTLY_API_KEY not configured' },
        { status: 500 }
      )
    }

    // Fetch all campaigns from Instantly V2 API
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    let response
    try {
      response = await fetch('https://api.instantly.ai/api/v2/campaigns?limit=100', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeoutId)
    }

    if (!response.ok) {
      const errBody = await response.text()
      console.error('[Sync Campaigns] Instantly API error:', response.status, errBody)
      return NextResponse.json(
        { error: 'Failed to fetch campaigns from Instantly', status: response.status, details: errBody.substring(0, 300) },
        { status: 500 }
      )
    }

    const data = (await response.json()) as any
    // V2 API returns { data: [...] } or { items: [...] }
    const remoteCampaigns = data.data || data.items || data.campaigns || []

    console.log('[Sync Campaigns] Fetched', remoteCampaigns.length, 'campaigns from Instantly')

    // Return the full list so the UI can display them
    return NextResponse.json({
      status: 'success',
      campaigns: remoteCampaigns.map((c: any) => ({
        id: c.id,
        name: c.name,
        status: c.status,
      })),
    })
  } catch (error) {
    console.error('Sync campaigns error:', error)
    return NextResponse.json(
      {
        error: 'Failed to sync campaigns',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
