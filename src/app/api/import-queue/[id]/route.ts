import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * GET /api/import-queue/[id]
 * Get batch detail + linked leads (for loading the feed view on a PROCESSING batch).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const { id } = await params

    const batch = await prisma.importBatch.findUnique({ where: { id } })
    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }

    const leads = await prisma.lead.findMany({
      where: { importBatchId: id },
      select: { id: true, firstName: true, companyName: true },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ batch, leads })
  } catch (error) {
    console.error('Import queue detail error:', error)
    return NextResponse.json(
      { error: 'Failed to get batch detail', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/import-queue/[id]
 * Reorder a batch (swap positions). Only works on PENDING batches.
 * Body: { position: number } — the target position to swap with
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const { id } = await params
    const { position: targetPosition } = await request.json()

    const batch = await prisma.importBatch.findUnique({ where: { id } })
    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }
    if (batch.status !== 'PENDING') {
      return NextResponse.json({ error: 'Can only reorder PENDING batches' }, { status: 400 })
    }

    // Find the batch at the target position
    const targetBatch = await prisma.importBatch.findFirst({
      where: { position: targetPosition, status: { in: ['PENDING', 'PROCESSING'] } },
    })

    if (targetBatch) {
      // Swap positions
      await prisma.$transaction([
        prisma.importBatch.update({ where: { id: batch.id }, data: { position: targetPosition } }),
        prisma.importBatch.update({ where: { id: targetBatch.id }, data: { position: batch.position } }),
      ])
    } else {
      // No batch at target, just move this one
      await prisma.importBatch.update({ where: { id }, data: { position: targetPosition } })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Import queue reorder error:', error)
    return NextResponse.json(
      { error: 'Failed to reorder batch', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/import-queue/[id]
 * Cancel a pending batch. Deletes linked staging leads and the batch record.
 * Only works on PENDING batches.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const { id } = await params

    const batch = await prisma.importBatch.findUnique({ where: { id } })
    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }
    if (batch.status !== 'PENDING') {
      return NextResponse.json({ error: 'Can only cancel PENDING batches' }, { status: 400 })
    }

    // Delete linked staging leads (only those still in IMPORT_STAGING)
    const deleteResult = await prisma.lead.deleteMany({
      where: { importBatchId: id, status: 'IMPORT_STAGING' },
    })

    // Delete the batch record
    await prisma.importBatch.delete({ where: { id } })

    return NextResponse.json({ deleted: true, leadsDeleted: deleteResult.count })
  } catch (error) {
    console.error('Import queue cancel error:', error)
    return NextResponse.json(
      { error: 'Failed to cancel batch', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
