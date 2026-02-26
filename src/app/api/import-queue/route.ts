import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * GET /api/import-queue
 * List all import batches: pending/processing ordered by position, plus last 20 completed.
 * For PROCESSING batches with a jobId, reads Redis for live progress.
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const [activeBatches, completedBatches] = await Promise.all([
      prisma.importBatch.findMany({
        where: { status: { in: ['PENDING', 'PROCESSING'] } },
        orderBy: { position: 'asc' },
      }),
      prisma.importBatch.findMany({
        where: { status: { in: ['COMPLETED', 'FAILED'] } },
        orderBy: { completedAt: 'desc' },
        take: 20,
      }),
    ])

    // For PROCESSING batches, try to read live progress from Redis
    const enrichedActive = await Promise.all(
      activeBatches.map(async (batch) => {
        if (batch.status === 'PROCESSING' && batch.jobId) {
          try {
            const Redis = (await import('ioredis')).default
            const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
              maxRetriesPerRequest: 1,
              connectTimeout: 2000,
            })
            const data = await redis.get(`import:${batch.jobId}`)
            await redis.quit()
            if (data) {
              const progress = JSON.parse(data)
              return {
                ...batch,
                processedLeads: progress.processed ?? batch.processedLeads,
                redisStatus: progress.status,
              }
            }
          } catch { /* fall back to DB values */ }
        }
        return batch
      })
    )

    return NextResponse.json({
      batches: [...enrichedActive, ...completedBatches],
    })
  } catch (error) {
    console.error('Import queue list error:', error)
    return NextResponse.json(
      { error: 'Failed to list import queue', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

/**
 * POST /api/import-queue
 * Create a new import batch in the queue.
 * Body: { batchName, leadIds, folderId?, assignToId?, options }
 */
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const { batchName, leadIds, folderId, assignToId, options } = await request.json() as {
      batchName: string
      leadIds: string[]
      folderId?: string
      assignToId?: string
      options: { enrichment: boolean; preview: boolean; personalization: boolean }
    }

    if (!batchName || !batchName.trim()) {
      return NextResponse.json({ error: 'batchName is required' }, { status: 400 })
    }
    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ error: 'leadIds array is required' }, { status: 400 })
    }

    // Find highest position among active batches
    const maxPositionBatch = await prisma.importBatch.findFirst({
      where: { status: { in: ['PENDING', 'PROCESSING'] } },
      orderBy: { position: 'desc' },
      select: { position: true },
    })
    const nextPosition = (maxPositionBatch?.position ?? 0) + 1

    // Create the batch
    const batch = await prisma.importBatch.create({
      data: {
        batchName: batchName.trim(),
        status: 'PENDING',
        folderId: folderId || null,
        assignToId: assignToId || null,
        options: options || {},
        totalLeads: leadIds.length,
        position: nextPosition,
      },
    })

    // Link leads to this batch
    await prisma.lead.updateMany({
      where: { id: { in: leadIds } },
      data: { importBatchId: batch.id },
    })

    return NextResponse.json({ batch })
  } catch (error) {
    console.error('Import queue create error:', error)
    return NextResponse.json(
      { error: 'Failed to create import batch', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
