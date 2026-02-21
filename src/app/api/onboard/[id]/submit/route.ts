import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkAndTransitionToQA } from '@/lib/build-readiness'
import { addEnrichmentJob } from '@/worker/queue'

export const dynamic = 'force-dynamic'

/**
 * POST /api/onboard/[id]/submit
 * Final form submission. Maps onboarding form fields to the Lead model,
 * merges qualification data, marks onboarding as completed, and triggers
 * downstream pipeline jobs (QA transition + enrichment).
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    // Fetch the lead with current onboardingData, qualificationData, and existing photos
    const lead = await prisma.lead.findUnique({
      where: { id },
      select: {
        id: true,
        companyName: true,
        city: true,
        state: true,
        onboardingData: true,
        qualificationData: true,
        enrichedPhotos: true,
      },
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    const formData = (lead.onboardingData as Record<string, any>) ?? {}

    // Build the direct-field updates from the form data
    const directUpdates: Record<string, any> = {}

    if (formData.companyName !== undefined) directUpdates.companyName = formData.companyName
    if (formData.phone !== undefined) directUpdates.phone = formData.phone
    if (formData.email !== undefined) directUpdates.email = formData.email
    if (formData.city !== undefined) directUpdates.city = formData.city
    if (formData.state !== undefined) directUpdates.state = formData.state
    if (formData.website !== undefined) directUpdates.website = formData.website
    if (formData.services !== undefined) directUpdates.services = formData.services
    // Map logoUrl → logo, handle both field names
    if (formData.logoUrl !== undefined) directUpdates.logo = formData.logoUrl
    else if (formData.logo !== undefined) directUpdates.logo = formData.logo
    // Sync photos to BOTH photos and enrichedPhotos — all templates read enrichedPhotos
    if (formData.photos !== undefined) {
      const formPhotos = Array.isArray(formData.photos) ? formData.photos : []
      const existingEnriched = Array.isArray(lead.enrichedPhotos) ? (lead.enrichedPhotos as string[]) : []
      // Merge: existing enriched photos + new form photos (deduplicated)
      const allPhotos = [...new Set([...existingEnriched, ...formPhotos])]
      directUpdates.photos = formPhotos
      directUpdates.enrichedPhotos = allPhotos
    }
    if (formData.hours !== undefined) directUpdates.hours = formData.hours

    // Merge qualification-related fields into existing qualificationData
    const existingQualData = (lead.qualificationData as Record<string, any>) ?? {}
    const qualificationFields: Record<string, any> = {}

    if (formData.aboutStory !== undefined) qualificationFields.aboutStory = formData.aboutStory
    if (formData.differentiator !== undefined) qualificationFields.differentiator = formData.differentiator
    if (formData.yearsInBusiness !== undefined) qualificationFields.yearsInBusiness = formData.yearsInBusiness
    if (formData.serviceArea !== undefined) qualificationFields.serviceArea = formData.serviceArea
    // Map testimonialQuote → testimonial, handle both field names
    if (formData.testimonialQuote !== undefined) qualificationFields.testimonial = formData.testimonialQuote
    else if (formData.testimonial !== undefined) qualificationFields.testimonial = formData.testimonial
    if (formData.testimonialName !== undefined) qualificationFields.reviewerName = formData.testimonialName
    if (formData.certifications !== undefined) qualificationFields.certifications = formData.certifications

    const mergedQualData = { ...existingQualData, ...qualificationFields }

    // Update the lead with all mapped fields
    const updated = await prisma.lead.update({
      where: { id },
      data: {
        ...directUpdates,
        qualificationData: mergedQualData,
        onboardingStatus: 'COMPLETED',
      },
      select: {
        id: true,
        companyName: true,
        city: true,
        state: true,
        onboardingStatus: true,
      },
    })

    // Trigger downstream pipeline: QA check and enrichment job
    try {
      await checkAndTransitionToQA(id)
    } catch (err) {
      console.error('[Onboard Submit] QA transition failed (non-fatal):', err)
    }

    try {
      await addEnrichmentJob({
        leadId: id,
        companyName: updated.companyName || '',
        city: updated.city || undefined,
        state: updated.state || undefined,
      })
    } catch (err) {
      console.error('[Onboard Submit] Enrichment job failed (non-fatal):', err)
    }

    return NextResponse.json({
      success: true,
      leadId: id,
      onboardingStatus: 'COMPLETED',
    })
  } catch (error) {
    console.error('[Onboard Submit] Error:', error)
    return NextResponse.json(
      { error: 'Failed to submit onboarding', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
