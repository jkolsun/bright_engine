import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * GET /api/leads/staging
 * Returns count + list of all IMPORT_STAGING leads.
 * Used by the import page to detect abandoned uploads.
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const [leads, count] = await Promise.all([
      prisma.lead.findMany({
        where: { status: 'IMPORT_STAGING' },
        select: { id: true, firstName: true, companyName: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.lead.count({ where: { status: 'IMPORT_STAGING' } }),
    ])

    return NextResponse.json({ count, leads })
  } catch (error) {
    console.error('Staging leads fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch staging leads', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
