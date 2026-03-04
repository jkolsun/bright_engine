import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * POST /api/webhooks/fullenrich
 * Receives FullEnrich bulk enrichment results.
 * Writes email + emailEnrichmentSource to each lead, updates Redis import counters.
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.FULLENRICH_API_KEY
    const incomingSignature = request.headers.get('x-fullenrich-signature')
    const rawBody = await request.text()

    // Verify HMAC signature
    if (apiKey && incomingSignature) {
      const crypto = await import('crypto')
      const expectedSig = crypto.createHmac('sha1', apiKey).update(rawBody).digest('hex')
      if (incomingSignature !== expectedSig) {
        console.warn('[FullEnrich Webhook] Invalid signature')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    } else if (!apiKey) {
      console.warn('[FullEnrich Webhook] FULLENRICH_API_KEY not set — skipping signature check')
    }

    const body = JSON.parse(rawBody)

    // Handle non-success statuses
    if (body.status === 'lacks_credits' || body.status === 'canceled') {
      console.warn('[FullEnrich Webhook] Batch status:', body.status)
      return NextResponse.json({ received: 0 }, { status: 200 })
    }

    const items = body.datas ?? []
    let found = 0
    let notFound = 0

    for (const item of items) {
      try {
        const leadId = item.custom?.lead_id
        if (!leadId) continue

        const emails = item.contact?.emails ?? []
        const bestEmail = emails[0] ?? null
        const emailUsable = bestEmail !== null && (bestEmail.verification === 'valid' || bestEmail.verification === 'catch_all')

        const lead = await prisma.lead.findUnique({
          where: { id: leadId },
          select: { id: true, email: true, importBatchId: true },
        })
        if (!lead) continue
        if (lead.email && lead.email.length > 0) continue // never overwrite existing email

        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            email: emailUsable ? bestEmail.email : undefined,
            emailEnrichmentSource: emailUsable ? 'FULLENRICH' : 'NOT_FOUND',
          },
        })

        if (emailUsable) found++
        else notFound++

        // Delete pending Redis key
        try {
          const Redis = (await import('ioredis')).default
          const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: 1, connectTimeout: 2000 })
          await redis.del('enrichment:' + lead.id)
          await redis.quit()
        } catch { /* non-fatal */ }

        // Update import progress counters
        if (lead.importBatchId) {
          try {
            const batch = await prisma.importBatch.findUnique({ where: { id: lead.importBatchId }, select: { jobId: true } })
            if (batch?.jobId) {
              const Redis = (await import('ioredis')).default
              const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: 1, connectTimeout: 2000 })
              const raw = await redis.get('import:' + batch.jobId)
              if (raw) {
                const progress = JSON.parse(raw)
                if (emailUsable) progress.emailEnriched = (progress.emailEnriched ?? 0) + 1
                else progress.emailNotFound = (progress.emailNotFound ?? 0) + 1
                await redis.set('import:' + batch.jobId, JSON.stringify(progress), 'EX', 7200)
              }
              await redis.quit()
            }
          } catch { /* non-fatal — key may have expired */ }
        }

        // Log cost
        await prisma.apiCost.create({
          data: { service: 'fullenrich', operation: 'email_enrichment', cost: emailUsable ? 0.053 : 0 },
        }).catch(() => {})

      } catch (err) {
        console.error('[FullEnrich Webhook] Error processing lead ' + (item.custom?.lead_id ?? 'unknown') + ':', err)
      }
    }

    console.log(`[FullEnrich Webhook] Processed ${items.length} items: ${found} found, ${notFound} not found`)
    return NextResponse.json({ received: items.length }, { status: 200 })
  } catch (error) {
    console.error('[FullEnrich Webhook] Error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
