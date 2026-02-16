import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { logActivity } from '@/lib/logging'

export const dynamic = 'force-dynamic'

/**
 * POST /api/test/create-leads
 * Test endpoint for E2E testing - creates leads from JSON
 * Requires: test-token query param
 * 
 * Body: { leads: [{ firstName, lastName, companyName, email, phone, industry, city, state }] }
 */
export async function POST(request: NextRequest) {
  try {
    // Check test token
    const testToken = request.nextUrl.searchParams.get('test-token')
    if (testToken !== 'e2e-test-live-pipeline-2026') {
      return NextResponse.json({ error: 'Invalid or missing test token' }, { status: 403 })
    }

    const { leads: incomingLeads } = await request.json()

    if (!incomingLeads || !Array.isArray(incomingLeads)) {
      return NextResponse.json({ error: 'Missing leads array in request body' }, { status: 400 })
    }

    // Insert leads into database
    const createdLeads: any[] = []

    for (const lead of incomingLeads) {
      try {
        const created = await prisma.lead.create({
          data: {
            firstName: lead.firstName,
            lastName: lead.lastName || 'Unknown',
            email: lead.email,
            phone: lead.phone,
            companyName: lead.companyName,
            industry: lead.industry || 'GENERAL_CONTRACTING',
            city: lead.city,
            state: lead.state,
            website: lead.website,
            status: 'NEW',
            source: 'COLD_EMAIL',
            sourceDetail: 'E2E Live Test - JSON API',
            priority: 'COLD',
            timezone: 'America/New_York',
          },
        })
        createdLeads.push(created)
      } catch (err) {
        console.error(`Failed to create lead ${lead.firstName}:`, err)
      }
    }

    // Log activity
    await logActivity(
      'IMPORT',
      `E2E Test: Imported ${createdLeads.length} leads from JSON (direct test endpoint)`,
      {
        metadata: {
          testType: 'LIVE_PIPELINE',
          totalRequested: incomingLeads.length,
          createdCount: createdLeads.length,
        },
      }
    )

    return NextResponse.json(
      {
        success: true,
        message: `Successfully created ${createdLeads.length} leads`,
        summary: {
          totalRequested: incomingLeads.length,
          createdCount: createdLeads.length,
        },
        leads: createdLeads.map(l => ({
          id: l.id,
          firstName: l.firstName,
          lastName: l.lastName,
          companyName: l.companyName,
          email: l.email,
          phone: l.phone,
          industry: l.industry,
          city: l.city,
          state: l.state,
          status: l.status,
        })),
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Test create-leads error:', error)
    return NextResponse.json(
      {
        error: 'Failed to create leads',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
