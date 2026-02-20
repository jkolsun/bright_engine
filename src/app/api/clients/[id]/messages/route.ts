import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

// DELETE /api/clients/[id]/messages - Delete all messages for a client
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const clientId = params.id

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, companyName: true }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const deleted = await prisma.message.deleteMany({
      where: { clientId }
    })

    return NextResponse.json({
      success: true,
      message: `Deleted ${deleted.count} messages for ${client.companyName}`,
      count: deleted.count,
    })
  } catch (error) {
    console.error('Error deleting client messages:', error)
    return NextResponse.json(
      { error: 'Failed to delete messages' },
      { status: 500 }
    )
  }
}
