import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'
import { pushEditToBuildQueue } from '@/lib/edit-request-handler'

export const dynamic = 'force-dynamic'

/**
 * PUT /api/edit-requests/[id] — Update edit request
 *
 * When status='approved': applies the edit + pushes to build queue + syncs everything
 * When status='live': marks as pushed live
 * When status='rejected': rejects and reverts HTML if needed
 */
export async function PUT(
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

    const data = await request.json()

    // Load the current edit request
    const editRequest = await prisma.editRequest.findUnique({
      where: { id },
      include: { client: { include: { lead: true } } },
    })
    if (!editRequest) {
      return NextResponse.json({ error: 'Edit request not found' }, { status: 404 })
    }

    // ── APPROVE: push edit to build queue ──
    if (data.status === 'approved') {
      // Update the edit request
      await prisma.editRequest.update({
        where: { id },
        data: {
          status: 'approved',
          editFlowState: 'confirmed',
          approvedBy: session.email || 'admin',
          approvedAt: new Date(),
        },
      })

      // Push to build queue (updates site HTML, build step, notifies client)
      await pushEditToBuildQueue(id)

      const updated = await prisma.editRequest.findUnique({ where: { id } })
      return NextResponse.json({ editRequest: updated })
    }

    // ── REJECT: revert HTML if AI had applied changes ──
    if (data.status === 'rejected') {
      // Revert site HTML if we have a pre-edit snapshot
      if (editRequest.preEditHtml && editRequest.leadId) {
        await prisma.lead.update({
          where: { id: editRequest.leadId },
          data: { siteHtml: editRequest.preEditHtml },
        })
      }

      const updated = await prisma.editRequest.update({
        where: { id },
        data: {
          status: 'rejected',
          editFlowState: 'failed',
        },
      })

      return NextResponse.json({ editRequest: updated })
    }

    // ── Generic field updates ──
    const updateData: Record<string, unknown> = {}
    if (data.status) updateData.status = data.status
    if (data.aiInterpretation) updateData.aiInterpretation = data.aiInterpretation
    if (data.complexityTier) updateData.complexityTier = data.complexityTier
    if (data.stagingSnapshotUrl) updateData.stagingSnapshotUrl = data.stagingSnapshotUrl

    if (data.status === 'live') {
      updateData.pushedLiveAt = new Date()
      updateData.editFlowState = 'confirmed'
    }

    const updated = await prisma.editRequest.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ editRequest: updated })
  } catch (error) {
    console.error('Error updating edit request:', error)
    return NextResponse.json({ error: 'Failed to update edit request' }, { status: 500 })
  }
}

// DELETE /api/edit-requests/[id]
export async function DELETE(
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

    await prisma.editRequest.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting edit request:', error)
    return NextResponse.json({ error: 'Failed to delete edit request' }, { status: 500 })
  }
}
