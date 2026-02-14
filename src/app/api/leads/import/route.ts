import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { parseCSV } from '@/lib/csv-parser'
import { addEnrichmentJob } from '@/worker/queue'
import { logActivity } from '@/lib/logging'
import { getTimezoneFromState } from '@/lib/utils'
import { dispatchWebhook, WebhookEvents } from '@/lib/webhook-dispatcher'

/**
 * POST /api/leads/import
 * Bulk import leads from CSV file
 * 
 * Form data:
 * - file: CSV file
 * - assignTo?: rep user ID
 * - campaign?: campaign name
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const assignTo = formData.get('assignTo') as string | null
    const campaign = formData.get('campaign') as string | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Read file
    const csvContent = await file.text()

    // Parse CSV
    const { leads: parsedLeads, validCount, invalidCount, errors } = parseCSV(
      csvContent
    )

    if (validCount === 0) {
      return NextResponse.json(
        {
          error: 'No valid leads found in CSV',
          totalRows: parsedLeads.length,
          invalidCount,
          rowErrors: Array.from(errors.entries()).map(([row, errs]) => ({
            row,
            errors: errs,
          })),
        },
        { status: 400 }
      )
    }

    // Create leads in database
    const createdLeads: any[] = []
    const failedRows: any[] = []

    for (let i = 0; i < parsedLeads.length; i++) {
      const parsed = parsedLeads[i]

      if (!parsed.isValid) {
        failedRows.push({
          index: i + 2, // +2 because header is row 1
          errors: parsed.errors,
        })
        continue
      }

      try {
        const lead = await prisma.lead.create({
          data: {
            firstName: parsed.firstName,
            lastName: parsed.lastName,
            email: parsed.email,
            phone: parsed.phone,
            companyName: parsed.companyName,
            industry: parsed.industry as any,
            city: parsed.city,
            state: parsed.state,
            website: parsed.website,
            status: 'NEW',
            source: 'COLD_EMAIL',
            sourceDetail: campaign || 'CSV Import',
            assignedToId: assignTo,
            priority: 'COLD',
            timezone: getTimezoneFromState(parsed.state || '') || 'America/New_York',
          },
        })

        createdLeads.push(lead)

        // Queue Phase 2 import pipeline (non-blocking, chained)
        // Order: Enrichment → Preview → Personalization → Scripts → Distribution
        try {
          // 1. Enrichment (SerpAPI) - triggers the entire pipeline via event chaining
          await addEnrichmentJob({
            leadId: lead.id,
            companyName: lead.companyName,
            city: lead.city || undefined,
            state: lead.state || undefined,
          })
        } catch (err) {
          console.error(`Pipeline job queueing failed for lead ${lead.id}:`, err)
        }
      } catch (err) {
        failedRows.push({
          index: i + 2,
          errors: [
            `Database error: ${err instanceof Error ? err.message : 'Unknown error'}`,
          ],
        })
      }
    }

    // Log activity
    await logActivity(
      'IMPORT',
      `Imported ${createdLeads.length} leads from CSV (${campaign || 'unknown campaign'})`,
      {
        metadata: {
          totalProcessed: parsedLeads.length,
          validCount,
          invalidCount,
          createdCount: createdLeads.length,
          campaign,
        },
      }
    )

    // 🚀 Dispatch webhook for immediate lead import processing
    if (createdLeads.length > 0) {
      await dispatchWebhook(WebhookEvents.LEAD_IMPORTED(
        createdLeads.map(l => l.id),
        campaign || 'CSV Import',
        { totalProcessed: parsedLeads.length, validCount }
      ))
    }

    return NextResponse.json(
      {
        success: true,
        message: `Successfully imported ${createdLeads.length} leads`,
        summary: {
          totalProcessed: parsedLeads.length,
          validCount,
          invalidCount,
          createdCount: createdLeads.length,
          failedRows,
        },
        leads: createdLeads.map((l) => ({
          id: l.id,
          firstName: l.firstName,
          companyName: l.companyName,
          email: l.email,
          phone: l.phone,
        })),
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      {
        error: 'Import failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
