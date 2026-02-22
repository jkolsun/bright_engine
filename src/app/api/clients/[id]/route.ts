import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

// GET /api/clients/[id] - Get client detail
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // Admin-only access check - sensitive client/financial data
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const client = await prisma.client.findUnique({
      where: { id },
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // Admin-only access check
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const data = await request.json()

    const client = await prisma.client.update({
      where: { id },
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
// default → soft delete (sets deletedAt timestamp)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

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
      // Hard delete: clean up non-FK orphan tables, then delete client (cascades the rest)
      await prisma.$transaction([
        prisma.approval.deleteMany({ where: { clientId } }),
        prisma.channelDecision.deleteMany({ where: { clientId } }),
        prisma.upsellPitch.deleteMany({ where: { clientId } }),
        prisma.client.delete({ where: { id: clientId } }),
      ])

      return NextResponse.json({
        success: true,
        message: `Client "${client.companyName}" permanently deleted`,
      })
    }

    // Soft delete: set deletedAt timestamp + clean up non-FK orphan data
    await prisma.$transaction([
      prisma.approval.deleteMany({ where: { clientId } }),
      prisma.channelDecision.deleteMany({ where: { clientId } }),
      prisma.upsellPitch.deleteMany({ where: { clientId } }),
      // Cascade-delete all FK-linked records so stats are cleared
      prisma.message.deleteMany({ where: { clientId } }),
      prisma.commission.deleteMany({ where: { clientId } }),
      prisma.revenue.deleteMany({ where: { clientId } }),
      prisma.siteAnalytic.deleteMany({ where: { clientId } }),
      prisma.sequenceProgress.deleteMany({ where: { clientId } }),
      prisma.referral.deleteMany({ where: { referrerClientId: clientId } }),
      prisma.clientAnalytics.deleteMany({ where: { clientId } }),
      prisma.editRequest.deleteMany({ where: { clientId } }),
      prisma.clawdbotActivity.deleteMany({ where: { clientId } }),
      prisma.client.update({
        where: { id: clientId },
        data: { deletedAt: new Date() }
      }),
    ])

    return NextResponse.json({
      success: true,
      message: 'Client deleted successfully — all related data removed',
    })
  } catch (error) {
    console.error('Error deleting client:', error)
    return NextResponse.json(
      { error: 'Failed to delete client' },
      { status: 500 }
    )
  }
}