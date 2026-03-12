import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateEngagementScore } from '@/lib/engagement-scoring'

// GET /api/preview/[id] - Get preview data
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    // Only select fields needed for preview rendering — this is a public endpoint
    const previewSelect = {
      id: true,
      companyName: true,
      industry: true,
      city: true,
      state: true,
      phone: true,
      email: true,
      website: true,
      previewId: true,
      previewExpiresAt: true,
      enrichedRating: true,
      enrichedReviews: true,
      enrichedAddress: true,
      enrichedServices: true,
      enrichedPhotos: true,
      logo: true,
      colorPrefs: true,
      stockPhotos: true,
      personalization: true,
      selectedTemplate: true,
    }

    // Try previewId first, fall back to lead id (matches preview page behavior)
    let lead = await prisma.lead.findUnique({
      where: { previewId: id },
      select: previewSelect,
    })

    if (!lead) {
      lead = await prisma.lead.findUnique({
        where: { id },
        select: previewSelect,
      })
    }

    if (!lead) {
      return NextResponse.json(
        { error: 'Preview not found' },
        { status: 404 }
      )
    }

    // Check if expired
    if (lead.previewExpiresAt && new Date() > lead.previewExpiresAt) {
      return NextResponse.json(
        { error: 'Preview expired', expired: true },
        { status: 410 }
      )
    }

    // Log preview view
    await prisma.leadEvent.create({
      data: {
        leadId: lead.id,
        eventType: 'PREVIEW_VIEWED',
        actor: 'client',
      }
    })

    // Recalculate engagement score (persists score + derives priority)
    try { await calculateEngagementScore(lead.id) } catch (e) { console.warn('[Preview] Score calc failed:', e) }

    // Return only public-safe fields (no internal status, notes, buildStep, siteHtml, etc.)
    const { previewExpiresAt, ...publicLead } = lead
    return NextResponse.json({ lead: publicLead })
  } catch (error) {
    console.error('Error fetching preview:', error)
    return NextResponse.json(
      { error: 'Failed to fetch preview' },
      { status: 500 }
    )
  }
}
