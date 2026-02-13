import { NextRequest, NextResponse } from 'next/server'
import { enrichLead } from '@/lib/enrichment'
import { generatePersonalization } from '@/lib/personalization'
import { prisma } from '@/lib/db'

/**
 * TEST: COMPLETE PIPELINE
 * POST /api/test/run-pipeline?leadId=...
 * Runs enrichment → personalization → updates lead directly
 * NO Redis queue - synchronous execution
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
      where: { id: leadId },
      include: { events: true }
    })

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    console.log(`[PIPELINE] Starting for: ${lead.companyName}`)

    // Step 1: Enrich
    console.log(`[PIPELINE] Enriching...`)
    const enrichedData = await enrichLead(leadId, lead.companyName, lead.city, lead.state)

    if (enrichedData) {
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          enrichedAddress: enrichedData.address,
          enrichedHours: enrichedData.hours as any,
          enrichedServices: enrichedData.services,
          enrichedRating: enrichedData.rating,
          enrichedReviews: enrichedData.reviews,
          enrichedPhotos: enrichedData.photos,
        }
      })
      console.log(`[PIPELINE] Enrichment OK`)
    } else {
      console.log(`[PIPELINE] Enrichment returned null`)
    }

    // Step 2: Personalize
    console.log(`[PIPELINE] Personalizing...`)
    const personalization = await generatePersonalization(leadId)

    if (personalization) {
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          personalization: personalization as any,
          previewGeneratedAt: new Date(),
        }
      })
      console.log(`[PIPELINE] Personalization OK`)
    } else {
      console.log(`[PIPELINE] Personalization returned null`)
    }

    // Fetch final state
    const finalLead = await prisma.lead.findUnique({
      where: { id: leadId }
    })

    return NextResponse.json({
      success: true,
      lead: finalLead
    })
  } catch (error) {
    console.error('[PIPELINE] Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: String(error)
      },
      { status: 500 }
    )
  }
}
