import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

/**
 * DELETE /api/leads/delete
 * Soft delete leads (mark deleted, preserve audit trail)
 * Accepts: { leadIds: string[] } for batch deletion
 * Or: { status?: string } to delete all leads with specific status
 */
export async function POST(request: NextRequest) {
  try {
    // Admin-only access check
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? verifySession(sessionCookie) : null
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
      // Delete ALL leads (careful!)
      where = {}
    } else if (leadIds && Array.isArray(leadIds)) {
      // Delete specific leads
      where = { id: { in: leadIds } }
    } else if (status) {
      // Delete by status (e.g., all CLOSED_LOST)
      where = { status }
    }

    // Soft delete: mark as CLOSED_LOST instead of removing (preserves audit trail)
    const result = await prisma.lead.updateMany({
      where,
      data: {
        status: 'CLOSED_LOST', // Soft delete via status
        updatedAt: new Date(),
      }
    })

    return NextResponse.json({
      message: 'Leads deleted successfully',
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
    // Admin-only access check
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? verifySession(sessionCookie) : null
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

    await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: 'CLOSED_LOST',
        updatedAt: new Date(),
      }
    })

    return NextResponse.json({
      message: 'Lead deleted successfully',
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
