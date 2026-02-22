import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'
import { pushEditToBuildQueue } from '@/lib/edit-request-handler'

export const dynamic = 'force-dynamic'

/**
 * POST /api/edit-requests/[id]/complete
 *
 * Marks an edit request as complete and pushes to build queue.
 * Used after admin manually edits the site in the site editor.
 */
export async function POST(
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

    const editRequest = await prisma.editRequest.findUnique({
      where: { id },
      include: { client: true },
    })
    if (!editRequest) {
      return NextResponse.json({ error: 'Edit request not found' }, { status: 404 })
    }

    // Ensure leadId is set
    const leadId = editRequest.leadId || editRequest.client?.leadId
    if (!leadId) {
      return NextResponse.json({ error: 'No lead linked to this edit request' }, { status: 400 })
    }

    // If leadId wasn't set on the edit request, set it now
    if (!editRequest.leadId) {
      await prisma.editRequest.update({
        where: { id },
        data: { leadId },
      })
    }

    // Mark as approved by admin
    await prisma.editRequest.update({
      where: { id },
      data: {
        status: 'approved',
        editFlowState: 'confirmed',
        approvedBy: session.email || 'admin',
        approvedAt: new Date(),
      },
    })

    // Push to build queue (updates build step, notifies client)
    await pushEditToBuildQueue(id)

    return NextResponse.json({ success: true, message: 'Edit completed and pushed to build queue' })
  } catch (error) {
    console.error('Error completing edit request:', error)
    return NextResponse.json({ error: 'Failed to complete edit request' }, { status: 500 })
  }
}
