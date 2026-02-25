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

    // Step A: Collect all emails and phone variants from the batch
    const allEmails: string[] = []
    const allPhoneVariants: string[] = []
    const phoneVariantSet = new Set<string>()

    for (const row of validRows) {
      if (row.email) allEmails.push(row.email.toLowerCase())
      if (row.phone) {
        const norm = row.phone.replace(/\D/g, '').slice(-10)
        const variants = [row.phone]
        if (norm.length === 10) {
          variants.push(`+1${norm}`, `1${norm}`, norm)
        }
        for (const v of variants) {
          if (!phoneVariantSet.has(v)) {
            phoneVariantSet.add(v)
            allPhoneVariants.push(v)
          }
        }
      }
    }

    // Step B: Single batch duplicate query
    const orConditions = [
      ...(allEmails.length > 0 ? [{ email: { in: allEmails } }] : []),
      ...(allPhoneVariants.length > 0 ? [{ phone: { in: allPhoneVariants } }] : []),
    ]

    const existingLeads = orConditions.length > 0
      ? await prisma.lead.findMany({
          where: {
            OR: orConditions,
            status: { notIn: ['CLOSED_LOST', 'DO_NOT_CONTACT', 'PAID'] },
          },
          select: { email: true, phone: true },
        })
      : []

    // Step C: Build duplicate Sets in memory
    const existingEmails = new Set(
      existingLeads.map(l => l.email?.toLowerCase()).filter((e): e is string => !!e)
    )
    const existingPhones = new Set(
      existingLeads.map(l => l.phone?.replace(/\D/g, '').slice(-10)).filter((p): p is string => !!p && p.length === 10)
    )

    // Step D: Filter duplicates in memory
    const batchPhones = new Set<string>()
    const newRows: typeof validRows = []
    let skipped = 0

    for (const row of validRows) {
      const normEmail = row.email?.toLowerCase() || ''
      const normPhone = row.phone?.replace(/\D/g, '').slice(-10) || ''

      if (normEmail && existingEmails.has(normEmail)) { skipped++; continue }
      if (normPhone && existingPhones.has(normPhone)) { skipped++; continue }
      if (normPhone && batchPhones.has(normPhone)) { skipped++; continue }

      if (normPhone) batchPhones.add(normPhone)
      newRows.push(row)
    }

    // Step E: Batch create in chunked transactions (50 per batch to avoid Railway timeouts)
    let created: { id: string; name: string; company: string }[] = []

    if (newRows.length > 0) {
      const CHUNK_SIZE = 50
      for (let i = 0; i < newRows.length; i += CHUNK_SIZE) {
        const chunk = newRows.slice(i, i + CHUNK_SIZE)
        const chunkResults = await prisma.$transaction(
          chunk.map(row =>
            prisma.lead.create({
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
          )
        )

        // Step F: Build response array
        for (const lead of chunkResults) {
          created.push({
            id: lead.id,
            name: `${lead.firstName} ${lead.lastName}`.trim(),
            company: lead.companyName || '',
          })
        }
      }
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