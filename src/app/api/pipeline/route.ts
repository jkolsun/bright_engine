import { NextRequest, NextResponse } from 'next/server'
import { enrichLead } from '@/lib/enrichment'
import { generatePersonalization } from '@/lib/personalization'
import { prisma } from '@/lib/db'

/**
 * GET /api/pipeline?leadId=xxx
 * GET /api/pipeline?leadId=xxx (POST equivalent)
 * Executes enrichment → personalization pipeline synchronously
 */
async function runPipeline(request: NextRequest) {
  const leadId = request.nextUrl.searchParams.get('leadId')
  if (!leadId) {
    return NextResponse.json({ error: 'leadId required' }, { status: 400 })
  }

  try {
    // Get lead
    const lead = await prisma.lead.findUnique({ where: { id: leadId } })
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Step 1: Enrich
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
    }

    // Step 2: Personalize
    const personalization = await generatePersonalization(leadId)
    if (personalization) {
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          personalization: personalization as any,
          previewGeneratedAt: new Date(),
        }
      })
    }

    // Get final state
    const final = await prisma.lead.findUnique({ where: { id: leadId } })

    return NextResponse.json({
      success: true,
      lead: final,
      enrichment: enrichedData ? 'success' : 'failed',
      personalization: personalization ? 'success' : 'failed'
    })
  } catch (error) {
    console.error('Pipeline error:', error)
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  return runPipeline(request)
}

export async function GET(request: NextRequest) {
  return runPipeline(request)
}
