import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

// GET /api/clients/[id] - Get client detail
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Admin-only access check - sensitive client/financial data
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const client = await prisma.client.findUnique({
      where: { id: params.id },
      include: {
        lead: true,
        analytics: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 50
        },
        commissions: {
          include: {
            rep: {
              select: { id: true, name: true, email: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 50
        },
        revenue: {
          orderBy: { createdAt: 'desc' },
          take: 50
        }
      }
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ client })
  } catch (error) {
    console.error('Error fetching client:', error)
    return NextResponse.json(
      { error: 'Failed to fetch client' },
      { status: 500 }
    )
  }
}

// PUT /api/clients/[id] - Update client
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Admin-only access check
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const data = await request.json()

    const client = await prisma.client.update({
      where: { id: params.id },
      data: {
        ...data,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({ client })
  } catch (error) {
    console.error('Error updating client:', error)
    return NextResponse.json(
      { error: 'Failed to update client' },
      { status: 500 }
    )
  }
}

// DELETE /api/clients/[id] - Delete client
// ?hard=true → permanently delete from database (cascades to messages, commissions, revenue, etc.)
// default → soft delete (mark as CANCELLED)
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
    const { searchParams } = new URL(request.url)
    const hard = searchParams.get('hard') === 'true'

    const client = await prisma.client.findUnique({
      where: { id: clientId }
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    if (hard) {
      // Hard delete: remove from database entirely
      // Prisma cascade will delete: messages, commissions, revenue, analytics, editRequests, sequenceProgress, referrals, siteAnalytics
      // ClawdbotActivity clientId will be set to null (onDelete: SetNull)
      await prisma.client.delete({ where: { id: clientId } })

      return NextResponse.json({
        success: true,
        message: `Client "${client.companyName}" permanently deleted`,
      })
    }

    // Soft delete: mark as CANCELLED
    const updated = await prisma.client.update({
      where: { id: clientId },
      data: { hostingStatus: 'CANCELLED' }
    })

    return NextResponse.json({
      success: true,
      message: 'Client cancelled successfully',
      client: updated
    })
  } catch (error) {
    console.error('Error deleting client:', error)
    return NextResponse.json(
      { error: 'Failed to delete client' },
      { status: 500 }
    )
  }
}
