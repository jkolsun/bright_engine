import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// PATCH /api/users/[id] - Update user
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json()

    const user = await prisma.user.update({
      where: { id: params.id },
      data: {
        ...(data.status && { status: data.status }),
        ...(data.name && { name: data.name }),
        ...(data.email && { email: data.email }),
        ...(data.phone && { phone: data.phone }),
        ...(data.role && { role: data.role })
      }
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
