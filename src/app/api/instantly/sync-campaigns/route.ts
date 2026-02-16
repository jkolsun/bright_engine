export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * POST /api/instantly/sync-campaigns
 * Fetch campaigns from Instantly API and store IDs in Settings table
 * One-time setup endpoint (public for convenience)
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.INSTANTLY_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'INSTANTLY_API_KEY not configured' },
        { status: 500 }
      )
    }

    // Fetch campaigns from Instantly API
    const response = await fetch('https://api.instantly.ai/api/v2/campaigns', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch campaigns from Instantly', status: response.status },
        { status: 500 }
      )
    }

    const data = (await response.json()) as any
    const campaigns = data.campaigns || []

    // Find campaigns by name
    const campaignA = campaigns.find(
      (c: any) => c.name.toLowerCase().includes('campaign a') || c.name.toLowerCase().includes('bad website')
    )
    const campaignB = campaigns.find(
      (c: any) => c.name.toLowerCase().includes('campaign b') || c.name.toLowerCase().includes('no website')
    )

    if (!campaignA || !campaignB) {
      return NextResponse.json({
        error: 'Could not find Campaign A and Campaign B',
        found: {
          campaign_a: campaignA?.id || null,
          campaign_b: campaignB?.id || null,
        },
        all_campaigns: campaigns.map((c: any) => ({ name: c.name, id: c.id })),
      }, { status: 400 })
    }

    // Store in Settings table
    await prisma.settings.upsert({
      where: { key: 'instantly_campaigns' },
      create: {
        key: 'instantly_campaigns',
        value: {
          campaign_a: campaignA.id,
          campaign_b: campaignB.id,
        },
      },
      update: {
        value: {
          campaign_a: campaignA.id,
          campaign_b: campaignB.id,
        },
      },
    })

    return NextResponse.json({
      status: 'success',
      campaigns_stored: {
        campaign_a: {
          name: campaignA.name,
          id: campaignA.id,
        },
        campaign_b: {
          name: campaignB.name,
          id: campaignB.id,
        },
      },
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
