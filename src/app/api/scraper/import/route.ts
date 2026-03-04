import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'
import { getTimezoneFromState, generatePreviewId } from '@/lib/utils'
import { addImportProcessingJob } from '@/worker/queue'

export const dynamic = 'force-dynamic'

/**
 * POST /api/scraper/import
 * Import selected scraped leads into the pipeline.
 * Creates leads → graduates → creates ImportBatch → starts processing.
 */
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const body = await request.json()
    const {
      runId,
      selectedLeads,
      batchName,
      folderId,
      assignToId,
      processOptions,
      skipProcessing,
    } = body as {
      runId: string
      selectedLeads: Array<{
        companyName: string
        phone: string
        city: string
        state: string
        industry: string
        rating: number
        reviews: number
        address: string
      }>
      batchName: string
      folderId?: string
      assignToId?: string
      processOptions?: { enrichment: boolean; preview: boolean; personalization: boolean }
      skipProcessing?: boolean
    }

    if (!selectedLeads || selectedLeads.length === 0) {
      return NextResponse.json({ error: 'No leads selected' }, { status: 400 })
    }

    if (!batchName?.trim()) {
      return NextResponse.json({ error: 'Batch name is required' }, { status: 400 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.BASE_URL || 'https://preview.brightautomations.org'

    // Resolve ICP from ScraperRun
    const scraperRun = runId
      ? await prisma.scraperRun.findUnique({ where: { id: runId }, select: { icpId: true } }).catch(() => null)
      : null
    const resolvedIcpId = scraperRun?.icpId ?? null

    // Phone dedup against existing leads
    const allPhones = selectedLeads.map(l => l.phone).filter(Boolean)
    const phoneVariants: string[] = []
    for (const p of allPhones) {
      const digits = p.replace(/\D/g, '')
      phoneVariants.push(p)
      if (digits.length >= 10) {
        phoneVariants.push(`+1${digits.slice(-10)}`)
        phoneVariants.push(`1${digits.slice(-10)}`)
        phoneVariants.push(digits.slice(-10))
      }
    }

    const existingLeads = await prisma.lead.findMany({
      where: {
        phone: { in: [...new Set(phoneVariants)] },
        status: { notIn: ['CLOSED_LOST', 'DO_NOT_CONTACT', 'PAID'] },
      },
      select: { phone: true },
    })

    const existingPhones = new Set(
      existingLeads.map(l => l.phone.replace(/\D/g, '').slice(-10)).filter(Boolean)
    )
    const batchPhones = new Set<string>()

    // Filter out duplicates
    const newLeads = selectedLeads.filter(lead => {
      const normalized = lead.phone.replace(/\D/g, '').slice(-10)
      if (!normalized) return false
      if (existingPhones.has(normalized) || batchPhones.has(normalized)) return false
      batchPhones.add(normalized)
      return true
    })

    if (newLeads.length === 0) {
      return NextResponse.json({
        created: [],
        skipped: selectedLeads.length,
        message: 'All selected leads are duplicates',
      })
    }

    // Create leads in batches of 50 (to avoid Railway timeouts)
    const createdLeads: Array<{ id: string; companyName: string }> = []
    const CHUNK_SIZE = 50

    for (let i = 0; i < newLeads.length; i += CHUNK_SIZE) {
      const chunk = newLeads.slice(i, i + CHUNK_SIZE)

      const results = await prisma.$transaction(
        chunk.map(lead => {
          const previewId = generatePreviewId()
          // Normalize phone to +1XXXXXXXXXX format
          const digits = lead.phone.replace(/\D/g, '')
          const normalizedPhone = digits.length === 10 ? `+1${digits}` : digits.length === 11 && digits.startsWith('1') ? `+${digits}` : lead.phone

          return prisma.lead.create({
            data: {
              firstName: '',
              lastName: '',
              email: null,
              phone: normalizedPhone,
              companyName: lead.companyName,
              industry: (lead.industry || 'GENERAL_CONTRACTING') as any,
              city: lead.city || null,
              state: lead.state || null,
              website: null,
              status: 'IMPORT_STAGING',
              source: 'GBP_SCRAPE' as any,
              sourceDetail: 'GBP Scraper',
              icpId: resolvedIcpId as any,
              scraperRunId: (runId || null) as any,
              campaign: batchName.trim(),
              priority: 'COLD',
              timezone: getTimezoneFromState(lead.state || '') || 'America/New_York',
              folderId: folderId || null,
              assignedToId: assignToId || null,
              previewId,
              previewUrl: `${baseUrl}/preview/${previewId}`,
              previewExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              notes: `Scraped: ${lead.rating}★ (${lead.reviews} reviews) — ${lead.address || 'no address'}`,
            },
          })
        })
      )

      for (const lead of results) {
        createdLeads.push({ id: lead.id, companyName: lead.companyName })
      }
    }

    const leadIds = createdLeads.map(l => l.id)

    // Graduate leads from IMPORT_STAGING to NEW
    await prisma.lead.updateMany({
      where: { id: { in: leadIds }, status: 'IMPORT_STAGING' },
      data: {
        status: 'NEW',
        sourceDetail: 'GBP Scraper',
        campaign: batchName.trim(),
      },
    })

    let batchId: string | null = null
    let importJobId: string | null = null

    if (!skipProcessing && processOptions) {
      // Create ImportBatch
      const maxPositionBatch = await prisma.importBatch.findFirst({
        where: { status: { in: ['PENDING', 'PROCESSING'] } },
        orderBy: { position: 'desc' },
        select: { position: true },
      })

      const batch = await prisma.importBatch.create({
        data: {
          batchName: batchName.trim(),
          status: 'PENDING',
          folderId: folderId || null,
          assignToId: assignToId || null,
          options: processOptions as any,
          totalLeads: leadIds.length,
          position: (maxPositionBatch?.position ?? 0) + 1,
        },
      })
      batchId = batch.id

      // Link leads to batch
      await prisma.lead.updateMany({
        where: { id: { in: leadIds } },
        data: { importBatchId: batch.id },
      })

      // Start processing
      const { v4: uuidv4 } = await import('uuid')
      const jobId = uuidv4()

      // Write initial progress to Redis
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
            errors: [],
            results: {},
          }),
          'EX',
          7200
        )
        await redis.quit()
      } catch (err) {
        console.error('[Scraper Import] Failed to write Redis progress:', err)
      }

      const job = await addImportProcessingJob({
        jobId,
        leadIds,
        options: {
          enrichment: processOptions.enrichment ?? true,
          preview: processOptions.preview ?? true,
          personalization: processOptions.personalization ?? true,
        },
      })

      if (job) {
        importJobId = jobId
        await prisma.importBatch.update({
          where: { id: batch.id },
          data: { status: 'PROCESSING', jobId },
        })
      }
    }

    // Update ScraperRun imported count
    if (runId) {
      await prisma.scraperRun.update({
        where: { id: runId },
        data: { importedLeads: createdLeads.length },
      }).catch(() => {})
    }

    return NextResponse.json({
      created: createdLeads,
      skipped: selectedLeads.length - newLeads.length,
      batchId,
      importJobId,
    })
  } catch (error) {
    console.error('Scraper import error:', error)
    return NextResponse.json(
      { error: 'Failed to import leads', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
