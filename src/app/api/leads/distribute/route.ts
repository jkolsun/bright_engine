export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

/**
 * POST /api/leads/distribute
 * Route leads to Instantly campaigns based on website status
 * Campaign A: Has website (websiteUrl exists) - BAD WEBSITE
 * Campaign B: No website (websiteUrl is null/empty)
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

    // Track successful leads for batch DB update
    const campaignALeadIds: string[] = []
    const campaignBLeadIds: string[] = []

    // Process each lead (API calls must be sequential for rate limiting)
    for (const lead of leads) {
      try {
        const hasWebsite = lead.website && lead.website.trim().length > 0
        const targetCampaign = hasWebsite ? campaign_a : campaign_b

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

        // Track success for batch update
        if (hasWebsite) {
          campaignALeadIds.push(lead.id)
          results.campaignA++
        } else {
          campaignBLeadIds.push(lead.id)
          results.campaignB++
        }
        results.distributed++
      } catch (error) {
        results.failed++
        results.errors.push({
          leadId: lead.id,
          leadName: `${lead.firstName} ${lead.lastName}`,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }

    // Batch update all successful leads (2 queries instead of N)
    if (campaignALeadIds.length > 0 || campaignBLeadIds.length > 0) {
      await prisma.$transaction([
        ...(campaignALeadIds.length > 0 ? [
          prisma.lead.updateMany({
            where: { id: { in: campaignALeadIds } },
            data: { status: 'BUILDING', campaign: campaign_a },
          }),
        ] : []),
        ...(campaignBLeadIds.length > 0 ? [
          prisma.lead.updateMany({
            where: { id: { in: campaignBLeadIds } },
            data: { status: 'BUILDING', campaign: campaign_b },
          }),
        ] : []),
      ])
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
 * GET /api/leads/distribute
 * Preview leads ready for distribution without actually sending them
 * Query param: preview=true (shows distribution plan)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin auth
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const preview = request.nextUrl.searchParams.get('preview') === 'true'

    // Get all leads ready for distribution
    const leadsToDistribute = await prisma.lead.findMany({
      where: {
        status: { in: ['NEW', 'HOT_LEAD', 'QUALIFIED'] }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        companyName: true,
        website: true,
        city: true,
        state: true,
        status: true
      }
    })

    // Build distribution plan
    const plan = leadsToDistribute.map(lead => {
      const hasWebsite = lead.website && lead.website.trim().length > 0
      return {
        id: lead.id,
        name: `${lead.firstName} ${lead.lastName}`,
        email: lead.email,
        company: lead.companyName,
        website: lead.website || 'NONE',
        campaign: hasWebsite ? 'Campaign A (Bad Website)' : 'Campaign B (No Website)',
        campaignId: hasWebsite ? 'cb463064-c7b4-4252-b1f0-07283ba16329' : '5d41542d-31ce-456b-b820-8eba32544eba',
        status: lead.status
      }
    })

    // Summary stats
    const campaignA = plan.filter(p => p.campaign.includes('Campaign A')).length
    const campaignB = plan.filter(p => p.campaign.includes('Campaign B')).length

    return NextResponse.json({
      status: 'success',
      preview: preview,
      summary: {
        total: plan.length,
        campaign_a_count: campaignA,
        campaign_b_count: campaignB
      },
      leads: plan
    })
  } catch (error) {
    console.error('Get distribution error:', error)
    return NextResponse.json(
      { error: 'Failed to get distribution plan' },
      { status: 500 }
    )
  }
}
