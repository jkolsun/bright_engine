import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

// PUT /api/edit-requests/[id] - Update edit request (approve, reject, etc.)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const data = await request.json()
    const updateData: any = {}

    if (data.status) updateData.status = data.status
    if (data.aiInterpretation) updateData.aiInterpretation = data.aiInterpretation
    if (data.complexityTier) updateData.complexityTier = data.complexityTier
    if (data.stagingSnapshotUrl) updateData.stagingSnapshotUrl = data.stagingSnapshotUrl

    if (data.status === 'approved') {
      updateData.approvedBy = session.email || 'admin'
      updateData.approvedAt = new Date()
    }

    if (data.status === 'live') {
      updateData.pushedLiveAt = new Date()
    }

    const editRequest = await prisma.editRequest.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json({ editRequest })
  } catch (error) {
    console.error('Error updating edit request:', error)
    return NextResponse.json({ error: 'Failed to update edit request' }, { status: 500 })
  }
}

// DELETE /api/edit-requests/[id]
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

    await prisma.editRequest.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting edit request:', error)
    return NextResponse.json({ error: 'Failed to delete edit request' }, { status: 500 })
  }
}