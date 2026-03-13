import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

interface ImportRow {
  leadId?: string
  companyName?: string
  phone?: string
  instagramHandle?: string
  linkedinUrl?: string
}

interface ImportResult {
  matched: number
  updated: number
  skipped: number
  errors: string[]
}

// POST /api/leads/social-import
export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')?.value
  const session = sessionCookie ? await verifySession(sessionCookie) : null
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin required' }, { status: 403 })
  }

  try {
    const { rows, source = 'csv_import' }: { rows: ImportRow[]; source: string } = await request.json()

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No rows provided' }, { status: 400 })
    }

    if (rows.length > 5000) {
      return NextResponse.json({ error: 'Max 5000 rows per import' }, { status: 400 })
    }

    const result: ImportResult = { matched: 0, updated: 0, skipped: 0, errors: [] }

    for (const row of rows) {
      try {
        // Must have at least one social handle
        if (!row.instagramHandle && !row.linkedinUrl) {
          result.skipped++
          continue
        }

        // Find lead by leadId, phone, or companyName
        let lead: { id: string } | null = null

        if (row.leadId) {
          lead = await prisma.lead.findUnique({ where: { id: row.leadId }, select: { id: true } })
        } else if (row.phone) {
          lead = await prisma.lead.findFirst({ where: { phone: row.phone }, select: { id: true } })
        } else if (row.companyName) {
          lead = await prisma.lead.findFirst({
            where: { companyName: { contains: row.companyName, mode: 'insensitive' } },
            select: { id: true },
          })
        }

        if (!lead) {
          result.skipped++
          continue
        }

        result.matched++

        // Normalize Instagram handle
        let cleanHandle = row.instagramHandle
        if (cleanHandle) {
          cleanHandle = cleanHandle
            .replace(/^@/, '')
            .replace(/.*instagram\.com\//, '')
            .replace(/\/$/, '')
            .trim()
        }

        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            instagramHandle: cleanHandle || undefined,
            linkedinUrl: row.linkedinUrl || undefined,
            socialEnrichedAt: new Date(),
            socialEnrichSource: source,
          },
        })

        result.updated++
      } catch (rowErr) {
        result.errors.push(`Row error: ${rowErr instanceof Error ? rowErr.message : 'unknown'}`)
      }
    }

    return NextResponse.json({ result })
  } catch (error) {
    console.error('Social import error:', error)
    return NextResponse.json({ error: 'Import failed' }, { status: 500 })
  }
}
