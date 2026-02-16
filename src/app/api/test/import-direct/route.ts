import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { parseCSV } from '@/lib/csv-parser'
import { logActivity } from '@/lib/logging'
import { getTimezoneFromState } from '@/lib/utils'

export const dynamic = 'force-dynamic'

/**
 * POST /api/test/import-direct
 * Test endpoint for E2E testing - inserts CSV data directly
 * Requires: test-token query param
 * 
 * Security: Only accepts specific test token for live testing
 */
export async function POST(request: NextRequest) {
  try {
    // Check test token
    const testToken = request.nextUrl.searchParams.get('test-token')
    if (testToken !== 'e2e-test-live-pipeline-2026') {
      return NextResponse.json({ error: 'Invalid or missing test token' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Read and parse CSV
    const csvContent = await file.text()
    const { leads: parsedLeads, validCount, totalRows } = parseCSV(csvContent)

    // Filter valid leads
    const validRows = parsedLeads
      .map((parsed, i) => ({ parsed, index: i + 2 }))
      .filter(row => row.parsed.isValid)

    // Insert into database
    const createdLeads: any[] = []

    if (validRows.length > 0) {
      const results = await prisma.$transaction(
        validRows.map(row =>
          prisma.lead.create({
            data: {
              firstName: row.parsed.firstName,
              lastName: row.parsed.lastName,
              email: row.parsed.email,
              phone: row.parsed.phone,
              companyName: row.parsed.companyName,
              industry: row.parsed.industry as any,
              city: row.parsed.city,
              state: row.parsed.state,
              website: row.parsed.website,
              status: 'NEW',
              source: 'COLD_EMAIL',
              sourceDetail: 'E2E Live Test',
              priority: 'COLD',
              timezone: getTimezoneFromState(row.parsed.state || '') || 'America/New_York',
            },
          })
        )
      )
      createdLeads.push(...results)
    }

    // Log activity
    await logActivity(
      'IMPORT',
      `E2E Test: Imported ${createdLeads.length} leads from CSV (direct test endpoint)`,
      {
        metadata: {
          testType: 'LIVE_PIPELINE',
          totalProcessed: totalRows,
          validCount,
          createdCount: createdLeads.length,
        },
      }
    )

    return NextResponse.json(
      {
        success: true,
        message: `Successfully imported ${createdLeads.length} leads`,
        summary: {
          totalProcessed: totalRows,
          validCount,
          invalidCount: totalRows - validCount,
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
          status: l.status,
        })),
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Test import error:', error)
    return NextResponse.json(
      {
        error: 'Import failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
