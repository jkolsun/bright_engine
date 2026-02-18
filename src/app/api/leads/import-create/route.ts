import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { parseCSV } from '@/lib/csv-parser'
import { getTimezoneFromState } from '@/lib/utils'
import { verifySession } from '@/lib/session'

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

    for (const row of validRows) {
      // Check for duplicates
      const existing = await prisma.lead.findFirst({
        where: {
          OR: [
            ...(row.email ? [{ email: row.email }] : []),
            ...(row.phone ? [{ phone: row.phone }] : []),
          ],
        },
      })

      if (existing) {
        skipped++
        continue
      }

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