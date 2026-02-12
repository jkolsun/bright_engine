import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { addEnrichmentJob, addPersonalizationJob } from '@/worker/queue'
import { generatePreviewId, getTimezoneFromState } from '@/lib/utils'

// POST /api/leads/import - Bulk CSV import
export async function POST(request: NextRequest) {
  try {
    const { leads } = await request.json()

    if (!Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json(
        { error: 'Invalid leads array' },
        { status: 400 }
      )
    }

    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[]
    }

    for (const leadData of leads) {
      try {
        // Validate required fields
        if (!leadData.firstName || !leadData.phone || !leadData.companyName) {
          results.skipped++
          results.errors.push(`Missing required fields for ${leadData.companyName}`)
          continue
        }

        // Check for duplicate by phone
        const existing = await prisma.lead.findFirst({
          where: { phone: leadData.phone }
        })

        if (existing) {
          results.skipped++
          results.errors.push(`Duplicate phone: ${leadData.phone}`)
          continue
        }

        const previewId = generatePreviewId()

        const lead = await prisma.lead.create({
          data: {
            firstName: leadData.firstName,
            lastName: leadData.lastName,
            email: leadData.email,
            phone: leadData.phone,
            companyName: leadData.companyName,
            industry: leadData.industry || 'GENERAL_CONTRACTING',
            city: leadData.city,
            state: leadData.state,
            timezone: leadData.timezone || getTimezoneFromState(leadData.state),
            website: leadData.website,
            source: leadData.source || 'COLD_EMAIL',
            sourceDetail: leadData.sourceDetail,
            previewId,
            previewUrl: `${process.env.BASE_URL}/preview/${previewId}`,
            previewExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          }
        })

        // Log event
        await prisma.leadEvent.create({
          data: {
            leadId: lead.id,
            eventType: 'STAGE_CHANGE',
            toStage: 'NEW',
            actor: 'system',
          }
        })

        // Queue enrichment and personalization
        await addEnrichmentJob(lead.id)
        await addPersonalizationJob(lead.id)

        results.imported++
      } catch (error) {
        results.skipped++
        results.errors.push(`Error importing ${leadData.companyName}: ${(error as Error).message}`)
      }
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Error importing leads:', error)
    return NextResponse.json(
      { error: 'Failed to import leads' },
      { status: 500 }
    )
  }
}
