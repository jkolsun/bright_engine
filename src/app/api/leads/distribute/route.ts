export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

/**
 * POST /api/leads/distribute
 * Route leads to Instantly campaigns based on website status
 * Campaign A: No website (websiteUrl is null/empty)
 * Campaign B: Has website (websiteUrl exists)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin auth
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const body = await request.json()
    const { leadIds = [] } = body

    // Get campaign IDs from Settings
    const settings = await prisma.settings.findUnique({
      where: { key: 'instantly_campaigns' }
    })

    if (!settings || !settings.value) {
      return NextResponse.json(
        { error: 'Campaign IDs not configured in Settings' },
        { status: 400 }
      )
    }

    const { campaign_a, campaign_b } = settings.value as any

    if (!campaign_a || !campaign_b) {
      return NextResponse.json(
        { error: 'Invalid campaign configuration' },
        { status: 400 }
      )
    }

    // Fetch leads to distribute
    const query: any = {
      where: {
        status: { in: ['NEW', 'HOT_LEAD', 'QUALIFIED'] }, // Only distribute active leads
        ...(leadIds.length > 0 && { id: { in: leadIds } })
      }
    }

    const leads = await prisma.lead.findMany(query)

    if (leads.length === 0) {
      return NextResponse.json({
        status: 'success',
        message: 'No leads to distribute',
        distributed: 0
      })
    }

    const apiKey = process.env.INSTANTLY_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'INSTANTLY_API_KEY not configured' },
        { status: 500 }
      )
    }

    // Route leads to campaigns and track results
    const results = {
      total: leads.length,
      distributed: 0,
      failed: 0,
      campaignA: 0,
      campaignB: 0,
      errors: [] as any[]
    }

    // Process each lead
    for (const lead of leads) {
      try {
        // Determine which campaign based on website presence
        const hasWebsite = lead.website && lead.website.trim().length > 0
        const targetCampaign = hasWebsite ? campaign_b : campaign_a
        const campaignLabel = hasWebsite ? 'Campaign B (Bad Site)' : 'Campaign A (No Site)'

        // Prepare lead data for Instantly API
        const leadData = {
          first_name: lead.firstName || '',
          last_name: lead.lastName || '',
          email: lead.email || '',
          phone: lead.phone || '',
          company_name: lead.companyName || '',
          website: lead.website || '',
          city: lead.city || '',
          state: lead.state || '',
          industry: lead.industry || ''
        }

        // Call Instantly API to add lead to campaign
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)

        let response
        try {
          response = await fetch(
            `https://api.instantly.ai/api/v2/campaigns/${targetCampaign}/leads`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(leadData),
              signal: controller.signal
            }
          )
        } finally {
          clearTimeout(timeoutId)
        }

        if (!response.ok) {
          throw new Error(`Instantly API error: ${response.status}`)
        }

        // Mark lead as distributed
        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            status: 'BUILDING',
            campaign: targetCampaign
          }
        })

        results.distributed++
        if (hasWebsite) {
          results.campaignB++
        } else {
          results.campaignA++
        }
      } catch (error) {
        results.failed++
        results.errors.push({
          leadId: lead.id,
          leadName: `${lead.firstName} ${lead.lastName}`,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }

    return NextResponse.json({
      status: 'success',
      message: `Distributed ${results.distributed} leads`,
      results
    })
  } catch (error) {
    console.error('Distribution error:', error)
    return NextResponse.json(
      {
        error: 'Failed to distribute leads',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/leads/distribute?status=BUILDING
 * Get distribution statistics
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin auth
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const status = request.nextUrl.searchParams.get('status') || 'BUILDING'

    const distributedLeads = await prisma.lead.findMany({
      where: { status: status as any }
    })

    const campaignStats = {
      total: distributedLeads.length,
      with_website: distributedLeads.filter(l => l.website).length,
      without_website: distributedLeads.filter(l => !l.website).length,
      with_campaign: distributedLeads.filter(l => l.campaign).length
    }

    return NextResponse.json({
      status: 'success',
      distribution: campaignStats,
      leads: distributedLeads
    })
  } catch (error) {
    console.error('Get distribution error:', error)
    return NextResponse.json(
      { error: 'Failed to get distribution stats' },
      { status: 500 }
    )
  }
}
