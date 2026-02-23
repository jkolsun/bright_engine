import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'
import bcrypt from 'bcryptjs'

// GET /api/users/[id] - Get user details with related data
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        assignedLeads: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyName: true,
            status: true,
            priority: true,
            industry: true,
            city: true,
            state: true,
            previewUrl: true,
            createdAt: true,
          },
        },
        commissions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        repTasks: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            lead: {
              select: { id: true, firstName: true, lastName: true, companyName: true },
            },
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
  }
}

// PATCH /api/users/[id] - Update user
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    // Admin-only access check - managing user accounts
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const data = await request.json()

    // If password reset requested, hash the new password
    let passwordHash: string | undefined
    if (data.password) {
      passwordHash = await bcrypt.hash(data.password, 10)
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(data.status && { status: data.status }),
        ...(data.name && { name: data.name }),
        ...(data.email && { email: data.email }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.role && { role: data.role }),
        ...(data.portalType && { portalType: data.portalType }),
        ...(data.commissionRate !== undefined && { commissionRate: data.commissionRate }),
        ...(data.dailyLeadCap !== undefined && { dailyLeadCap: data.dailyLeadCap }),
        ...(data.assignedDialerPhone !== undefined && { assignedDialerPhone: data.assignedDialerPhone }),
        ...(data.onboardingComplete !== undefined && { onboardingComplete: data.onboardingComplete }),
        ...(data.onboardingCompletedAt !== undefined && { onboardingCompletedAt: data.onboardingCompletedAt ? new Date(data.onboardingCompletedAt) : null }),
        ...(data.outboundVmUrl !== undefined && { outboundVmUrl: data.outboundVmUrl }),
        ...(data.outboundVmApproved !== undefined && { outboundVmApproved: data.outboundVmApproved }),
        ...(data.inboundVmUrl !== undefined && { inboundVmUrl: data.inboundVmUrl }),
        ...(data.inboundVmApproved !== undefined && { inboundVmApproved: data.inboundVmApproved }),
        ...(passwordHash && { passwordHash }),
      },
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

// DELETE /api/users/[id] - Soft delete (mark as INACTIVE)
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    // Admin-only access check
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const userId = id

    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // 1. Reassign active leads back to unassigned pool
    const terminalStatuses = ['CLOSED_LOST', 'DO_NOT_CONTACT', 'PAID']
    const reassigned = await prisma.lead.updateMany({
      where: {
        assignedToId: userId,
        status: { notIn: terminalStatuses as any },
      },
      data: { assignedToId: null },
    })

    // Also unassign owned leads
    const ownedReassigned = await prisma.lead.updateMany({
      where: {
        ownerRepId: userId,
        status: { notIn: terminalStatuses as any },
      },
      data: { ownerRepId: null },
    })

    const totalReassigned = reassigned.count + ownedReassigned.count

    // 2. End any active dialer sessions
    await prisma.dialerSessionNew.updateMany({
      where: { repId: userId, isActive: true },
      data: { isActive: false, endedAt: new Date() },
    })

    // 3. Soft delete: mark as INACTIVE
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { status: 'INACTIVE' },
    })

    // 4. Create admin notification
    await prisma.notification.create({
      data: {
        type: 'DAILY_AUDIT',
        title: 'Rep Deactivated',
        message: `Rep ${user.name} deactivated — ${totalReassigned} leads returned to unassigned pool`,
        metadata: { userId, repName: user.name, leadsReassigned: totalReassigned },
      },
    })

    return NextResponse.json({
      success: true,
      message: `User deactivated. ${totalReassigned} leads returned to unassigned pool.`,
      user: updated,
      leadsReassigned: totalReassigned,
    })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}
