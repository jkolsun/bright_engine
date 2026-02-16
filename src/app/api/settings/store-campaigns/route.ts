export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * POST /api/settings/store-campaigns
 * Manually store campaign IDs in Settings table
 * Body: { campaign_a: '<ID>', campaign_b: '<ID>' }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { campaign_a, campaign_b } = body

    if (!campaign_a || !campaign_b) {
      return NextResponse.json(
        { error: 'Both campaign_a and campaign_b IDs required' },
        { status: 400 }
      )
    }

    // Store in Settings table
    await prisma.settings.upsert({
      where: { key: 'instantly_campaigns' },
      create: {
        key: 'instantly_campaigns',
        value: {
          campaign_a,
          campaign_b,
        },
      },
      update: {
        value: {
          campaign_a,
          campaign_b,
        },
      },
    })

    return NextResponse.json({
      status: 'success',
      message: 'Campaign IDs stored successfully',
      stored: {
        campaign_a,
        campaign_b,
      },
    })
  } catch (error) {
    console.error('Store campaigns error:', error)
    return NextResponse.json(
      {
        error: 'Failed to store campaign IDs',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/settings/store-campaigns
 * Retrieve stored campaign IDs
 */
export async function GET(request: NextRequest) {
  try {
    const settings = await prisma.settings.findUnique({
      where: { key: 'instantly_campaigns' },
    })

    if (!settings) {
      return NextResponse.json(
        { error: 'Campaign IDs not configured' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      status: 'success',
      campaigns: settings.value,
    })
  } catch (error) {
    console.error('Get campaigns error:', error)
    return NextResponse.json(
      {
        error: 'Failed to retrieve campaign IDs',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
