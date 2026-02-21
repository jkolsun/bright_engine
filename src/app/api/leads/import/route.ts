import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { parseCSV } from '@/lib/csv-parser'
import { addEnrichmentJob } from '@/worker/queue'
import { logActivity } from '@/lib/logging'
import { getTimezoneFromState, generatePreviewId } from '@/lib/utils'
import { dispatchWebhook, WebhookEvents } from '@/lib/webhook-dispatcher'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * POST /api/leads/import
 * Bulk import leads from CSV file
 * Admin-only access (sensitive data operation)
 * 
 * Form data:
 * - file: CSV file
 * - assignTo?: rep user ID
 * - campaign?: campaign name
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

    // Create leads in database with transaction for consistency
    const createdLeads: any[] = []
    const skippedLeads: any[] = []
    const failedRows: any[] = []
    const jobsToQueue: Array<{ leadId: string; companyName: string; city?: string; state?: string }> = []

    // Separate valid and invalid rows
    const validRows = parsedLeads.map((parsed, i) => ({
      parsed,
      index: i + 2, // +2 because header is row 1
    })).filter(row => {
      if (!row.parsed.isValid) {
        failedRows.push({
          index: row.index,
          errors: row.parsed.errors,
        })
        return false
      }
      return true
    })

    // Deduplicate: check for existing leads by email or phone
    if (validRows.length > 0) {
      const emails = validRows.map(r => r.parsed.email).filter(Boolean)
      const phones = validRows.map(r => r.parsed.phone).filter(Boolean)

      const existingLeads = await prisma.lead.findMany({
        where: {
          OR: [
            ...(emails.length > 0 ? [{ email: { in: emails } }] : []),
            ...(phones.length > 0 ? [{ phone: { in: phones } }] : []),
          ],
        },
        select: { email: true, phone: true },
      })

      const existingEmails = new Set(existingLeads.map(l => l.email?.toLowerCase()).filter(Boolean))
      const existingPhones = new Set(existingLeads.map(l => l.phone).filter(Boolean))

      // Filter out duplicates
      const newRows = validRows.filter(row => {
        const isDuplicate = (row.parsed.email && existingEmails.has(row.parsed.email.toLowerCase())) ||
                           (row.parsed.phone && existingPhones.has(row.parsed.phone))
        if (isDuplicate) {
          skippedLeads.push({ firstName: row.parsed.firstName, companyName: row.parsed.companyName, email: row.parsed.email, reason: 'Already exists' })
        }
        return !isDuplicate
      })

      // Use transaction for all new lead creation to ensure consistency
      if (newRows.length > 0) {
        try {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.BASE_URL || 'https://preview.brightautomations.org'
          const transactionResults = await prisma.$transaction(
            newRows.map((row) => {
              const previewId = generatePreviewId()
              return prisma.lead.create({
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
                  sourceDetail: campaign || 'CSV Import',
                  campaign: campaign || undefined,
                  assignedToId: assignTo,
                  priority: 'COLD',
                  timezone: getTimezoneFromState(row.parsed.state || '') || 'America/New_York',
                  previewId,
                  previewUrl: `${baseUrl}/preview/${previewId}`,
                  previewExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                },
              })
            })
          )

          // Collect jobs to queue
          transactionResults.forEach((lead) => {
            createdLeads.push(lead)
            jobsToQueue.push({
              leadId: lead.id,
              companyName: lead.companyName,
              city: lead.city || undefined,
              state: lead.state || undefined,
            })
          })
        } catch (err) {
          throw new Error(
            `Transaction failed during lead creation: ${err instanceof Error ? err.message : 'Unknown error'}`
          )
        }

        // Queue enrichment jobs after successful transaction (fire-and-forget, non-blocking)
        jobsToQueue.forEach((job) => {
          addEnrichmentJob(job).catch(err =>
            console.error(`Pipeline job queueing failed for lead ${job.leadId}:`, err)
          )
        })
      }
    }

    // Log activity
    await logActivity(
      'IMPORT',
      `Imported ${createdLeads.length} leads from CSV, skipped ${skippedLeads.length} duplicates (${campaign || 'unknown campaign'})`,
      {
        metadata: {
          totalProcessed: parsedLeads.length,
          validCount,
          invalidCount,
          createdCount: createdLeads.length,
          skippedCount: skippedLeads.length,
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
        message: `Successfully imported ${createdLeads.length} leads${skippedLeads.length > 0 ? `, skipped ${skippedLeads.length} duplicates` : ''}`,
        summary: {
          totalProcessed: parsedLeads.length,
          validCount,
          invalidCount,
          createdCount: createdLeads.length,
          skippedCount: skippedLeads.length,
          skippedLeads: skippedLeads.slice(0, 20), // Show first 20 skipped for transparency
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
