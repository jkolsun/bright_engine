import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/test/check-leads
 * Check lead enrichment status - shows recent leads with enrichment data
 */
export async function GET(request: NextRequest) {
  try {
    const testToken = request.nextUrl.searchParams.get('test-token')
    if (testToken !== 'e2e-test-live-pipeline-2026') {
      return NextResponse.json({ error: 'Invalid test token' }, { status: 403 })
    }

    // Get recent leads created in the last 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
    
    const recentLeads = await prisma.lead.findMany({
      where: {
        createdAt: { gte: tenMinutesAgo }
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        companyName: true,
        email: true,
        phone: true,
        city: true,
        state: true,
        industry: true,
        status: true,
        createdAt: true,
        // Enrichment fields
        website: true,
        businessAddress: true,
        businessPhone: true,
        googleRating: true,
        googleReviews: true,
        facebookUrl: true,
        linkedinUrl: true,
        estimatedRevenue: true,
        employeeCount: true,
        lastEnriched: true,
        enrichmentStatus: true
      }
    })

    return NextResponse.json({
      success: true,
      count: recentLeads.length,
      leads: recentLeads.map(lead => ({
        id: lead.id,
        name: `${lead.firstName} ${lead.lastName}`,
        company: lead.companyName,
        email: lead.email,
        phone: lead.phone,
        location: `${lead.city}, ${lead.state}`,
        industry: lead.industry,
        status: lead.status,
        createdAt: lead.createdAt,
        // Enrichment status
        enriched: {
          website: lead.website || null,
          businessAddress: lead.businessAddress || null, 
          businessPhone: lead.businessPhone || null,
          googleRating: lead.googleRating || null,
          googleReviews: lead.googleReviews || null,
          facebookUrl: lead.facebookUrl || null,
          linkedinUrl: lead.linkedinUrl || null,
          estimatedRevenue: lead.estimatedRevenue || null,
          employeeCount: lead.employeeCount || null,
          lastEnriched: lead.lastEnriched || null,
          enrichmentStatus: lead.enrichmentStatus || null
        }
      }))
    })
  } catch (error) {
    console.error('Check leads error:', error)
    return NextResponse.json(
      {
        error: 'Failed to check leads',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}