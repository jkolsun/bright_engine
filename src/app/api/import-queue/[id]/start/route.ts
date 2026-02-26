import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'
import { addImportProcessingJob } from '@/worker/queue'
import { v4 as uuidv4 } from 'uuid'

export const dynamic = 'force-dynamic'

/**
 * POST /api/import-queue/[id]/start
 * Start processing a specific batch. Creates BullMQ job and writes Redis progress.
 */
export async function POST(
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
      return NextResponse.json({ error: 'Batch is not PENDING' }, { status: 400 })
    }

    // Get all lead IDs linked to this batch
    const leads = await prisma.lead.findMany({
      where: { importBatchId: id },
      select: { id: true },
    })
    const leadIds = leads.map(l => l.id)

    if (leadIds.length === 0) {
      return NextResponse.json({ error: 'No leads linked to this batch' }, { status: 400 })
    }

    const jobId = uuidv4()
    const options = (batch.options as any) || { enrichment: true, preview: true, personalization: true }

    // Write initial progress to Redis (same pattern as /api/leads/import/process)
    try {
      const Redis = (await import('ioredis')).default
      const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
        maxRetriesPerRequest: 3,
        connectTimeout: 5000,
      })
      await redis.set(
        `import:${jobId}`,
        JSON.stringify({
          status: 'queued',
          processed: 0,
          total: leadIds.length,
          failed: 0,
          errors: [] as string[],
          results: {} as Record<string, any>,
        }),
        'EX',
        3600
      )
      await redis.quit()
    } catch (err) {
      console.error('[ImportQueue Start] Failed to store progress in Redis:', err)
    }

    // Queue the BullMQ job
    const job = await addImportProcessingJob({
      jobId,
      leadIds,
      options: {
        enrichment: options.enrichment ?? true,
        preview: options.preview ?? true,
        personalization: options.personalization ?? true,
      },
    })

    if (!job) {
      return NextResponse.json(
        { error: 'Failed to queue processing job. Redis may be unavailable.' },
        { status: 503 }
      )
    }

    // Update batch to PROCESSING with jobId
    await prisma.importBatch.update({
      where: { id },
      data: { status: 'PROCESSING', jobId },
    })

    return NextResponse.json({
      jobId,
      totalLeads: leadIds.length,
    })
  } catch (error) {
    console.error('Import queue start error:', error)
    return NextResponse.json(
      { error: 'Failed to start batch processing', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
