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
 * Remove a batch from the queue. Works on ANY status.
 * - PENDING: deletes staging leads + batch record
 * - PROCESSING: cancels BullMQ job, unlinks leads, deletes batch
 * - COMPLETED/FAILED: unlinks leads from batch, deletes batch record
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

    let leadsDeleted = 0

    if (batch.status === 'PENDING') {
      // Delete staging leads that haven't been processed yet
      const deleteResult = await prisma.lead.deleteMany({
        where: { importBatchId: id, status: 'IMPORT_STAGING' },
      })
      leadsDeleted = deleteResult.count
    }

    if (batch.status === 'PROCESSING' && batch.jobId) {
      // Try to remove the BullMQ job and clean up Redis progress
      try {
        const { removeImportProcessingJob } = await import('@/worker/queue')
        await removeImportProcessingJob(batch.jobId)
      } catch (err) {
        console.warn('[ImportQueue Delete] Failed to remove BullMQ job:', err)
      }
      try {
        const Redis = (await import('ioredis')).default
        const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
          maxRetriesPerRequest: 1,
          connectTimeout: 2000,
        })
        await redis.del(`import:${batch.jobId}`)
        await redis.quit()
      } catch { /* non-fatal */ }
    }

    // Unlink leads from this batch (don't delete processed leads)
    await prisma.lead.updateMany({
      where: { importBatchId: id },
      data: { importBatchId: null },
    })

    // Delete the batch record
    await prisma.importBatch.delete({ where: { id } })

    return NextResponse.json({ deleted: true, leadsDeleted })
  } catch (error) {
    console.error('Import queue cancel error:', error)
    return NextResponse.json(
      { error: 'Failed to cancel batch', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
