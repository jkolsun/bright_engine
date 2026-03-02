import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * POST /api/scraper/dedup-results
 * Post-scrape phone matching — checks which scraped phones already exist in leads table.
 */
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const { phones } = await request.json() as { phones: string[] }
    if (!phones || phones.length === 0) {
      return NextResponse.json({ matches: {} })
    }

    // Normalize all phones to last 10 digits + build variants
    const phoneVariants: string[] = []
    for (const p of phones) {
      const digits = p.replace(/\D/g, '')
      phoneVariants.push(p)
      if (digits.length >= 10) {
        phoneVariants.push(`+1${digits.slice(-10)}`)
        phoneVariants.push(`1${digits.slice(-10)}`)
        phoneVariants.push(digits.slice(-10))
      }
    }
    const uniqueVariants = [...new Set(phoneVariants)]

    const existingLeads = await prisma.lead.findMany({
      where: {
        phone: { in: uniqueVariants },
        status: { notIn: ['CLOSED_LOST', 'DO_NOT_CONTACT'] },
      },
      select: { id: true, phone: true, companyName: true, createdAt: true },
    })

    // Build match map keyed by normalized phone (last 10 digits)
    const matches: Record<string, { leadId: string; companyName: string; importedAt: string }> = {}
    for (const lead of existingLeads) {
      const normalized = lead.phone.replace(/\D/g, '').slice(-10)
      if (normalized && !matches[normalized]) {
        matches[normalized] = {
          leadId: lead.id,
          companyName: lead.companyName,
          importedAt: lead.createdAt.toISOString(),
        }
      }
    }

    return NextResponse.json({ matches })
  } catch (error) {
    console.error('Dedup results error:', error)
    return NextResponse.json(
      { error: 'Failed to check duplicates', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
