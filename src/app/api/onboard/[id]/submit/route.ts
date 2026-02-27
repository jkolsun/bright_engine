import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkAndTransitionToQA } from '@/lib/build-readiness'
import { addEnrichmentJob } from '@/worker/queue'

export const dynamic = 'force-dynamic'

/**
 * POST /api/onboard/[id]/submit
 * Final form submission. Maps onboarding form fields to the Lead model,
 * syncs BuildStatus checklist flags, marks onboarding as completed,
 * kicks off the build pipeline (ENRICHMENT), and triggers QA transition.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    // Fetch the lead with current data
    const lead = await prisma.lead.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        buildStep: true,
        companyName: true,
        city: true,
        state: true,
        onboardingData: true,
        qualificationData: true,
        enrichedPhotos: true,
        enrichedServices: true,
      },
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    const formData = (lead.onboardingData as Record<string, any>) ?? {}

    // ── 1. Build direct-field updates for the Lead record ──
    const directUpdates: Record<string, any> = {}

    if (formData.companyName !== undefined) directUpdates.companyName = formData.companyName
    if (formData.phone !== undefined) directUpdates.phone = formData.phone
    if (formData.email !== undefined) directUpdates.email = formData.email
    if (formData.city !== undefined) directUpdates.city = formData.city
    if (formData.state !== undefined) directUpdates.state = formData.state
    if (formData.website !== undefined) directUpdates.website = formData.website
    if (formData.services !== undefined) {
      directUpdates.services = formData.services
      // Also sync to enrichedServices — personalization ONLY reads enrichedServices
      const formSvc = Array.isArray(formData.services) ? formData.services : []
      const existingSvc = Array.isArray(lead.enrichedServices) ? (lead.enrichedServices as string[]) : []
      directUpdates.enrichedServices = [...new Set([...existingSvc, ...formSvc])]
    }
    // Map logoUrl → logo, handle both field names
    if (formData.logoUrl !== undefined) directUpdates.logo = formData.logoUrl
    else if (formData.logo !== undefined) directUpdates.logo = formData.logo
    // Sync photos to BOTH photos and enrichedPhotos — all templates read enrichedPhotos
    if (formData.photos !== undefined) {
      const formPhotos = Array.isArray(formData.photos) ? formData.photos : []
      const existingEnriched = Array.isArray(lead.enrichedPhotos) ? (lead.enrichedPhotos as string[]) : []
      const allPhotos = [...new Set([...existingEnriched, ...formPhotos])]
      directUpdates.photos = formPhotos
      directUpdates.enrichedPhotos = allPhotos
    }
    if (formData.hours !== undefined) directUpdates.hours = formData.hours
    if (formData.colorPrefs !== undefined) directUpdates.colorPrefs = formData.colorPrefs

    // ── 2. Merge qualification-related fields into qualificationData ──
    const existingQualData = (lead.qualificationData as Record<string, any>) ?? {}
    const qualificationFields: Record<string, any> = {}

    if (formData.aboutStory !== undefined) qualificationFields.aboutStory = formData.aboutStory
    if (formData.differentiator !== undefined) qualificationFields.differentiator = formData.differentiator
    if (formData.yearsInBusiness !== undefined) qualificationFields.yearsInBusiness = formData.yearsInBusiness
    if (formData.serviceArea !== undefined) qualificationFields.serviceArea = formData.serviceArea
    if (formData.testimonialQuote !== undefined) qualificationFields.testimonial = formData.testimonialQuote
    else if (formData.testimonial !== undefined) qualificationFields.testimonial = formData.testimonial
    if (formData.testimonialName !== undefined) qualificationFields.reviewerName = formData.testimonialName
    if (formData.certifications !== undefined) qualificationFields.certifications = formData.certifications
    // Testimonials array (multi-testimonial support)
    if (Array.isArray(formData.testimonials) && formData.testimonials.length > 0) {
      qualificationFields.testimonials = formData.testimonials
    }
    // Social media links
    const socialMedia: Record<string, string> = {}
    if (formData.socialFacebook) socialMedia.facebook = formData.socialFacebook
    if (formData.socialInstagram) socialMedia.instagram = formData.socialInstagram
    if (formData.socialGoogle) socialMedia.google = formData.socialGoogle
    if (Object.keys(socialMedia).length > 0) {
      qualificationFields.socialMedia = socialMedia
    }

    const mergedQualData = { ...existingQualData, ...qualificationFields }

    // ── 3. Determine build pipeline status ──
    // If lead isn't already in the site build pipeline, kick it off
    const siteBuildSteps = ['QA_REVIEW', 'EDITING', 'QA_APPROVED', 'CLIENT_REVIEW', 'CLIENT_APPROVED', 'LAUNCHING', 'LIVE']
    const alreadyInPipeline = lead.buildStep && siteBuildSteps.includes(lead.buildStep)

    const pipelineUpdates: Record<string, any> = {}
    if (!alreadyInPipeline) {
      pipelineUpdates.status = 'BUILDING'
      pipelineUpdates.buildStep = 'ENRICHMENT'
      pipelineUpdates.buildStartedAt = new Date()
      pipelineUpdates.buildError = null
    }

    // ── 4. Update the Lead record with everything ──
    const updated = await prisma.lead.update({
      where: { id },
      data: {
        ...directUpdates,
        ...pipelineUpdates,
        qualificationData: mergedQualData,
        onboardingStatus: 'COMPLETED',
      },
      select: {
        id: true,
        firstName: true,
        companyName: true,
        phone: true,
        city: true,
        state: true,
        onboardingStatus: true,
      },
    })

    // ── 5. Sync BuildStatus checklist flags (drives the UI checkmarks) ──
    try {
      const bsUpdate: Record<string, unknown> = {}

      // Services
      const services = formData.services
      if (Array.isArray(services) && services.length > 0) {
        bsUpdate.servicesCollected = true
        bsUpdate.servicesData = services
      }

      // Hours
      if (formData.hours) {
        bsUpdate.hoursCollected = true
        bsUpdate.hoursData = typeof formData.hours === 'string'
          ? formData.hours
          : JSON.stringify(formData.hours)
      }

      // Logo
      const logoUrl = formData.logoUrl || formData.logo
      if (logoUrl) {
        bsUpdate.logoCollected = true
        bsUpdate.logoUrl = logoUrl
      }

      // Photos
      const photos = formData.photos
      if (Array.isArray(photos) && photos.length > 0) {
        bsUpdate.photosCollected = true
        bsUpdate.photosData = photos
      }

      // Company Name
      if (formData.companyName?.trim()) {
        bsUpdate.companyNameConfirmed = true
        bsUpdate.companyNameOverride = formData.companyName
      }

      // Color Preferences
      if (formData.colorPrefs || formData.colors) {
        bsUpdate.colorPrefsCollected = true
      }

      // Set build status to 'building' if we're kicking off the pipeline
      if (!alreadyInPipeline) {
        bsUpdate.status = 'building'
      }

      if (Object.keys(bsUpdate).length > 0) {
        await prisma.buildStatus.upsert({
          where: { leadId: id },
          create: { leadId: id, ...bsUpdate },
          update: bsUpdate,
        })
      }
    } catch (err) {
      console.error('[Onboard Submit] BuildStatus sync failed (non-fatal):', err)
    }

    // ── 6. Recalculate readiness score + auto-transition to QA if >= 70 ──
    try {
      await checkAndTransitionToQA(id)
    } catch (err) {
      console.error('[Onboard Submit] QA transition failed (non-fatal):', err)
    }

    // ── 7. Start enrichment pipeline ──
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

    // ── 8. Notify admin ──
    try {
      await prisma.notification.create({
        data: {
          type: 'CLOSE_ENGINE',
          title: 'Onboarding Form Submitted',
          message: `${updated.companyName || 'A lead'} completed the onboarding form. Build pipeline started.`,
          metadata: { leadId: id },
        },
      })
    } catch (err) {
      console.error('[Onboard Submit] Notification failed (non-fatal):', err)
    }

    // ── 9. Auto thank-you SMS to the client ──
    if (updated.phone) {
      try {
        const { sendSMSViaProvider } = await import('@/lib/sms-provider')
        const { getSystemMessage } = await import('@/lib/system-messages')
        const firstName = updated.firstName || ''
        const { text: thankYouMsg, enabled } = await getSystemMessage('form_thank_you', { firstName })
        if (!enabled) { console.log('[Onboard Submit] form_thank_you disabled, skipping SMS'); } else {

        await sendSMSViaProvider({
          to: updated.phone,
          message: thankYouMsg,
          leadId: id,
          sender: 'clawdbot',
          trigger: 'form_submission_thank_you',
          aiGenerated: false,
        })

        console.log(`[Onboard Submit] Thank-you SMS sent to ${updated.phone}`)
        }
      } catch (err) {
        console.error('[Onboard Submit] Thank-you SMS failed (non-fatal):', err)
      }
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
