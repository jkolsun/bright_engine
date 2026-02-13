import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

/**
 * DELETE /api/clients/delete
 * Soft delete clients (mark deleted, preserve audit trail)
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
    const { clientIds, all } = body

    if (!clientIds && !all) {
      return NextResponse.json(
        { error: 'Provide clientIds array or all: true' },
        { status: 400 }
      )
    }

    const where = all ? {} : { id: { in: clientIds } }

    // Hard delete for now (no soft delete field on Client model)
    // TODO: Add deletedAt field to Client model for audit trail
    const result = await prisma.client.deleteMany({
      where
    })

    return NextResponse.json({
      message: 'Clients deleted successfully',
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
    const session = sessionCookie ? verifySession(sessionCookie) : null
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

    // Hard delete for now
    await prisma.client.delete({
      where: { id: clientId }
    })

    return NextResponse.json({
      message: 'Client deleted successfully',
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
