import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { parseCSV } from '@/lib/csv-parser'
import { getTimezoneFromState } from '@/lib/utils'
import { verifySession } from '@/lib/session'
import { logActivity } from '@/lib/logging'

export const dynamic = 'force-dynamic'

/**
 * POST /api/leads/import-create
 * Create leads from CSV without processing - returns lead IDs for step-by-step processing
 */
export async function POST(request: NextRequest) {
  try {
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

    const csvContent = await file.text()
    const { leads: parsedLeads, validCount } = parseCSV(csvContent)

    if (validCount === 0) {
      return NextResponse.json({ error: 'No valid leads found in CSV' }, { status: 400 })
    }

    const validRows = parsedLeads.filter(p => p.isValid)
    const created: { id: string; name: string; company: string }[] = []
    let skipped = 0
    const batchPhones = new Set<string>()

    for (const row of validRows) {
      // Normalize phone for comparison (last 10 digits)
      const normalizedPhone = row.phone?.replace(/\D/g, '').slice(-10) || ''

      // Check intra-batch duplicate
      if (normalizedPhone && batchPhones.has(normalizedPhone)) {
        skipped++
        continue
      }

      // Build phone variants for broader matching
      const phoneVariants: string[] = []
      if (row.phone) {
        phoneVariants.push(row.phone)
        if (normalizedPhone.length === 10) {
          phoneVariants.push(`+1${normalizedPhone}`)
          phoneVariants.push(`1${normalizedPhone}`)
          phoneVariants.push(normalizedPhone)
        }
      }

      // Check for duplicates in database
      const existing = await prisma.lead.findFirst({
        where: {
          OR: [
            ...(row.email ? [{ email: row.email }] : []),
            ...(phoneVariants.length > 0 ? [{ phone: { in: phoneVariants } }] : []),
          ],
          // Exclude terminal-status leads so deleted/closed leads don't block reimport
          status: { notIn: ['CLOSED_LOST', 'DO_NOT_CONTACT', 'PAID'] },
        },
      })

      if (existing) {
        skipped++
        continue
      }

      if (normalizedPhone) batchPhones.add(normalizedPhone)

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
          sourceDetail: campaign || 'CSV Import',
          campaign: campaign || undefined,
          assignedToId: assignTo,
          priority: 'COLD',
          timezone: getTimezoneFromState(row.state || '') || 'America/New_York',
        },
      })

      created.push({
        id: lead.id,
        name: `${lead.firstName} ${lead.lastName}`.trim(),
        company: lead.companyName || '',
      })
    }

    // Log activity with lead IDs for history lookup
    await logActivity(
      'IMPORT',
      `CSV import: ${created.length} created, ${skipped} skipped`,
      {
        metadata: {
          mode: 'CSV_IMPORT',
          created: created.length,
          skipped,
          totalProcessed: validRows.length,
          leadIds: created.map(l => l.id),
          campaign,
        },
      }
    )

    return NextResponse.json({
      success: true,
      created,
      skipped,
      total: validRows.length,
    })
  } catch (error) {
    console.error('Import create error:', error)
    return NextResponse.json(
      { error: 'Import failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}