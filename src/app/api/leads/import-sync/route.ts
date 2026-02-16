import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { parseCSV } from '@/lib/csv-parser'
import { enrichLead } from '@/lib/serpapi'
import { logActivity } from '@/lib/logging'
import { getTimezoneFromState } from '@/lib/utils'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * POST /api/leads/import-sync
 * SYNCHRONOUS lead import with immediate enrichment - no queues
 * Admin-only access
 */
export async function POST(request: NextRequest) {
  try {
    // Admin-only access check
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const assignTo = formData.get('assignTo') as string | null
    const campaign = formData.get('campaign') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Read and parse CSV
    const csvContent = await file.text()
    const { leads: parsedLeads, validCount, invalidCount } = parseCSV(csvContent)

    if (validCount === 0) {
      return NextResponse.json({ error: 'No valid leads found in CSV' }, { status: 400 })
    }

    // Create leads and process synchronously
    const results = {
      created: 0,
      enriched: 0,
      failed: 0,
      errors: [] as string[]
    }

    const validRows = parsedLeads.filter(p => p.isValid)

    for (const row of validRows) {
      try {
        // 1. Create lead in database
        const lead = await prisma.lead.create({
          data: {
            firstName: row.firstName,
            lastName: row.lastName,
            email: row.email,
            phone: row.phone,
            companyName: row.companyName,
            industry: row.industry as any,
            city: row.city,
            state: row.state,
            website: row.website,
            status: 'NEW',
            source: 'COLD_EMAIL',
            sourceDetail: campaign || 'CSV Import (Sync)',
            campaign: campaign || undefined,
            assignedToId: assignTo,
            priority: 'COLD',
            timezone: getTimezoneFromState(row.state || '') || 'America/New_York',
          },
        })

        results.created++
        console.log(`[SYNC-IMPORT] Created lead ${lead.id}: ${lead.firstName} ${lead.lastName} at ${lead.companyName}`)

        // 2. Immediately enrich the lead (synchronous)
        try {
          await enrichLead(lead.id)
          results.enriched++
          console.log(`[SYNC-IMPORT] ✅ Enriched lead ${lead.id}`)
        } catch (enrichErr) {
          console.error(`[SYNC-IMPORT] ❌ Enrichment failed for lead ${lead.id}:`, enrichErr)
          results.errors.push(`Enrichment failed for ${lead.firstName} ${lead.lastName}: ${enrichErr instanceof Error ? enrichErr.message : String(enrichErr)}`)
        }

      } catch (createErr) {
        results.failed++
        console.error(`[SYNC-IMPORT] Failed to create lead ${row.firstName} ${row.lastName}:`, createErr)
        results.errors.push(`Failed to create ${row.firstName} ${row.lastName}: ${createErr instanceof Error ? createErr.message : String(createErr)}`)
      }
    }

    // Log activity
    await logActivity(
      'IMPORT',
      `Synchronous import: ${results.created} leads created, ${results.enriched} enriched`,
      {
        metadata: {
          mode: 'SYNCHRONOUS',
          totalProcessed: validRows.length,
          created: results.created,
          enriched: results.enriched,
          failed: results.failed,
          campaign,
        },
      }
    )

    return NextResponse.json({
      success: true,
      mode: 'SYNCHRONOUS',
      summary: {
        totalRequested: validRows.length,
        created: results.created,
        enriched: results.enriched,
        failed: results.failed,
        successRate: `${Math.round((results.enriched / results.created) * 100)}%`
      },
      errors: results.errors,
      message: `✅ Synchronously processed ${results.created} leads with ${results.enriched} enrichments`
    })

  } catch (error) {
    console.error('Sync import error:', error)
    return NextResponse.json(
      {
        error: 'Synchronous import failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}