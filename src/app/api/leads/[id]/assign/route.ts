import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

/**
 * PUT /api/leads/[id]/assign
 * Assign lead to a rep (admin-only)
 * Body: { repId: string }
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Admin-only — lead assignment is an admin action
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const { id } = await context.params
    const { repId } = await request.json()

    if (!repId) {
      return NextResponse.json(
        { error: 'repId required' },
        { status: 400 }
      )
    }

    // Verify rep exists
    const rep = await prisma.user.findUnique({
      where: { id: repId }
    })

    if (!rep) {
      return NextResponse.json(
        { error: 'Rep not found' },
        { status: 404 }
      )
    }

    // Assign lead to rep
    const lead = await prisma.lead.update({
      where: { id },
      data: {
        assignedToId: repId,
        updatedAt: new Date(),
      },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    return NextResponse.json({
      status: 'ok',
      message: `Lead assigned to ${rep.name}`,
      lead
    })
  } catch (error) {
    console.error('Assign lead error:', error)
    return NextResponse.json(
      { error: 'Failed to assign lead', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
