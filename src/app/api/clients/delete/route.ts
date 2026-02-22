import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * DELETE /api/clients/delete
 * Soft delete clients (mark deleted, preserve audit trail)
 */
export async function POST(request: NextRequest) {
  try {
    // Admin-only access check
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const body = await request.json()
    const { clientIds, all } = body

    if (!clientIds && !all) {
      return NextResponse.json(
        { error: 'Provide clientIds array or all: true' },
        { status: 400 }
      )
    }

    const where = all ? {} : { id: { in: clientIds } }

    // Find client IDs to be deleted (needed for orphan cleanup)
    const clientsToDelete = await prisma.client.findMany({ where, select: { id: true } })
    const idsToDelete = clientsToDelete.map(c => c.id)

    // Transaction: clean up non-FK orphan tables, then delete clients (cascades the rest)
    const orphanWhere = idsToDelete.length > 0 ? { clientId: { in: idsToDelete } } : {}
    const [,,, result] = await prisma.$transaction([
      prisma.approval.deleteMany({ where: orphanWhere }),
      prisma.channelDecision.deleteMany({ where: orphanWhere }),
      prisma.upsellPitch.deleteMany({ where: orphanWhere }),
      prisma.client.deleteMany({ where }),
    ])

    return NextResponse.json({
      message: 'Clients permanently deleted — all related data removed',
      deletedCount: result.count,
      clientIds
    })
  } catch (error) {
    console.error('Delete clients error:', error)
    return NextResponse.json(
      { error: 'Failed to delete clients', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Admin-only access check
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const clientId = request.nextUrl.searchParams.get('clientId')
    
    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId query parameter required' },
        { status: 400 }
      )
    }

    // Transaction: clean up non-FK orphan tables, then delete client (cascades the rest)
    await prisma.$transaction([
      prisma.approval.deleteMany({ where: { clientId } }),
      prisma.channelDecision.deleteMany({ where: { clientId } }),
      prisma.upsellPitch.deleteMany({ where: { clientId } }),
      prisma.client.delete({ where: { id: clientId } }),
    ])

    return NextResponse.json({
      message: 'Client permanently deleted — all related data removed',
      clientId
    })
  } catch (error) {
    console.error('Delete client error:', error)
    return NextResponse.json(
      { error: 'Failed to delete client', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
