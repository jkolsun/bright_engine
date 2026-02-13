import { NextRequest, NextResponse } from 'next/server'
import { enrichLead } from '@/lib/enrichment'
import { generatePersonalization } from '@/lib/personalization'
import { prisma } from '@/lib/db'

/**
 * COMPLETE PIPELINE ENDPOINT
 * POST /api/leads/complete-pipeline?leadId=...
 * Runs enrichment → personalization → updates lead
 * Direct execution (synchronous, no queue)
 */
export async function POST(request: NextRequest) {
  const leadId = request.nextUrl.searchParams.get('leadId')
  
  if (!leadId) {
    return NextResponse.json(
      { error: 'leadId query parameter required' },
      { status: 400 }
    )
  }

  try {
    // Fetch lead
    const lead = await prisma.lead.findUnique({
      where: { id: leadId }
    })

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    console.log(`[PIPELINE] Starting for lead: ${lead.companyName}`)

    // STEP 1: ENRICHMENT
    console.log(`[PIPELINE] Step 1: Enriching ${lead.companyName}...`)
    const enrichedData = await enrichLead(leadId, lead.companyName, lead.city, lead.state)

    if (enrichedData) {
      // Update lead with enriched data
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          enrichedAddress: enrichedData.address,
          enrichedHours: enrichedData.hours as any,
          enrichedServices: enrichedData.services,
          enrichedRating: enrichedData.rating,
          enrichedReviews: enrichedData.reviews,
          enrichedPhotos: enrichedData.photos,
          phone: enrichedData.phone || lead.phone,
          website: enrichedData.website || lead.website,
        }
      })
      console.log(`[PIPELINE] ✅ Enrichment complete`)
    } else {
      console.warn(`[PIPELINE] ⚠️ Enrichment returned no data (check SERPAPI_KEY)`)
    }

    // STEP 2: PERSONALIZATION
    console.log(`[PIPELINE] Step 2: Generating personalization...`)
    const personalization = await generatePersonalization(leadId)

    if (personalization) {
      // Update lead with personalization
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          personalization: personalization as any,
          previewGeneratedAt: new Date(),
        }
      })
      console.log(`[PIPELINE] ✅ Personalization complete`)
    } else {
      console.warn(`[PIPELINE] ⚠️ Personalization returned no data (check ANTHROPIC_API_KEY)`)
    }

    // Fetch final lead state
    const finalLead = await prisma.lead.findUnique({
      where: { id: leadId }
    })

    return NextResponse.json({
      success: true,
      message: 'Pipeline completed',
      lead: finalLead,
      enrichment: enrichedData ? 'success' : 'skipped',
      personalization: personalization ? 'success' : 'skipped'
    })
  } catch (error) {
    console.error('[PIPELINE] Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Pipeline failed',
        details: String(error)
      },
      { status: 500 }
    )
  }
}
