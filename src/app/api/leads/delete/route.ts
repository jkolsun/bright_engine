import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * POST /api/leads/delete
 * Hard delete leads (permanently removes from database)
 * Accepts: { leadIds: string[] } for batch deletion
 * Or: { status?: string } to delete all leads with specific status
 */
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const body = await request.json()
    const { leadIds, status, all } = body

    if (!leadIds && !status && !all) {
      return NextResponse.json(
        { error: 'Provide leadIds array, status filter, or all: true' },
        { status: 400 }
      )
    }

    let where: any = {}

    if (all) {
      where = {}
    } else if (leadIds && Array.isArray(leadIds)) {
      where = { id: { in: leadIds } }
    } else if (status) {
      where = { status }
    }

    // Find the lead IDs that will be deleted (needed for orphan cleanup)
    const leadsToDelete = await prisma.lead.findMany({ where, select: { id: true } })
    const idsToDelete = leadsToDelete.map(l => l.id)

    // Transaction: clean up non-FK orphan tables, then delete leads (cascades the rest)
    const orphanWhere = idsToDelete.length > 0 ? { leadId: { in: idsToDelete } } : {}
    const [,, result] = await prisma.$transaction([
      prisma.approval.deleteMany({ where: orphanWhere }),
      prisma.channelDecision.deleteMany({ where: orphanWhere }),
      prisma.lead.deleteMany({ where }),
    ])

    return NextResponse.json({
      message: 'Leads permanently deleted',
      deletedCount: result.count,
      leadIds,
      status
    })
  } catch (error) {
    console.error('Delete leads error:', error)
    return NextResponse.json(
      { error: 'Failed to delete leads', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/leads/delete?leadId=xxx
 * Delete single lead by ID
 */
export async function DELETE(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const leadId = request.nextUrl.searchParams.get('leadId')

    if (!leadId) {
      return NextResponse.json(
        { error: 'leadId query parameter required' },
        { status: 400 }
      )
    }

    // Transaction: clean up non-FK orphan tables, then delete lead (cascades the rest)
    await prisma.$transaction([
      prisma.approval.deleteMany({ where: { leadId } }),
      prisma.channelDecision.deleteMany({ where: { leadId } }),
      prisma.lead.delete({ where: { id: leadId } }),
    ])

    return NextResponse.json({
      message: 'Lead permanently deleted',
      leadId
    })
  } catch (error) {
    console.error('Delete lead error:', error)
    return NextResponse.json(
      { error: 'Failed to delete lead', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}