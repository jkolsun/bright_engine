import { NextRequest, NextResponse } from 'next/server'
import { enrichLead } from '@/lib/enrichment'
import { prisma } from '@/lib/db'

/**
 * TEST ENDPOINT: Direct enrichment without Redis queue
 * POST /api/test/enrich-direct?leadId=...
 */
export async function POST(request: NextRequest) {
  const leadId = request.nextUrl.searchParams.get('leadId')
  
  if (!leadId) {
    return NextResponse.json(
      { error: 'leadId required' },
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

    // Enrich directly (bypass queue)
    const enrichedData = await enrichLead(leadId, lead.companyName, lead.city, lead.state)

    if (!enrichedData) {
      return NextResponse.json(
        { error: 'Enrichment failed', lead },
        { status: 500 }
      )
    }

    // Update lead with enriched data
    const updated = await prisma.lead.update({
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

    return NextResponse.json({
      success: true,
      lead: updated,
      enrichedData
    })
  } catch (error) {
    console.error('Direct enrichment error:', error)
    return NextResponse.json(
      { error: 'Enrichment failed', details: String(error) },
      { status: 500 }
    )
  }
}
