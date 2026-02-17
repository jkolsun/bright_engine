import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'
import bcrypt from 'bcryptjs'

// GET /api/users/[id] - Get user details with related data
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
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
  { params }: { params: { id: string } }
) {
  try {
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
      where: { id: params.id },
      data: {
        ...(data.status && { status: data.status }),
        ...(data.name && { name: data.name }),
        ...(data.email && { email: data.email }),
        ...(data.phone && { phone: data.phone }),
        ...(data.role && { role: data.role }),
        ...(data.commissionRate !== undefined && { commissionRate: data.commissionRate }),
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
  { params }: { params: { id: string } }
) {
  try {
    // Admin-only access check
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const userId = params.id

    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Soft delete: mark as INACTIVE
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        status: 'INACTIVE'
      }
    })

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
      user: updated
    })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}
