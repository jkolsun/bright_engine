/**
 * Build Readiness Checker
 *
 * Scores a lead 0-100 on how ready their site content is for building.
 * Called after every AI info collection update. When score hits 70+,
 * auto-transitions to QA_REVIEW and creates a notification.
 */

import { prisma } from './db'

export interface ReadinessResult {
  score: number
  breakdown: Record<string, number>
  missing: string[]
}

/**
 * Calculate a lead's build readiness score (0-100).
 */
export function calculateReadinessScore(lead: {
  logo?: string | null
  photos?: unknown
  enrichedPhotos?: unknown
  services?: unknown
  enrichedServices?: unknown
  companyName?: string | null
  phone?: string | null
  city?: string | null
  state?: string | null
  personalization?: string | null
  qualificationData?: unknown
}): ReadinessResult {
  const breakdown: Record<string, number> = {}
  const missing: string[] = []

  // Logo: 20 points
  if (lead.logo) {
    breakdown.logo = 20
  } else {
    missing.push('logo')
  }

  // Photos (client-uploaded or enriched): 15 points
  const clientPhotos = Array.isArray(lead.photos) ? lead.photos : []
  const enrichedPhotos = Array.isArray(lead.enrichedPhotos) ? lead.enrichedPhotos : []
  if (clientPhotos.length > 0 || enrichedPhotos.length > 0) {
    breakdown.photos = 15
  } else {
    missing.push('photos')
  }

  // Services (at least 2): 20 points
  const clientServices = Array.isArray(lead.services) ? lead.services : []
  const enrichedServices = Array.isArray(lead.enrichedServices) ? lead.enrichedServices : []
  // Also check qualificationData.services
  let qualServices: string[] = []
  if (lead.qualificationData && typeof lead.qualificationData === 'object') {
    const qd = lead.qualificationData as Record<string, unknown>
    if (Array.isArray(qd.services)) qualServices = qd.services as string[]
  }
  const allServices = [...new Set([...clientServices, ...enrichedServices, ...qualServices])]
  if (allServices.length >= 2) {
    breakdown.services = 20
  } else if (allServices.length === 1) {
    breakdown.services = 10
    missing.push('more services (only 1 listed)')
  } else {
    missing.push('services')
  }

  // Company name: 15 points
  if (lead.companyName?.trim()) {
    breakdown.companyName = 15
  } else {
    missing.push('company name')
  }

  // Phone: 10 points
  if (lead.phone?.trim()) {
    breakdown.phone = 10
  } else {
    missing.push('phone number')
  }

  // Location: 5 points
  if (lead.city || lead.state) {
    breakdown.location = 5
  } else {
    missing.push('city/location')
  }

  // Website copy (AI-generated in personalization): 15 points
  let hasWebsiteCopy = false
  if (lead.personalization) {
    try {
      const parsed = typeof lead.personalization === 'string'
        ? JSON.parse(lead.personalization)
        : lead.personalization
      if (parsed?.websiteCopy?.heroHeadline) {
        hasWebsiteCopy = true
      }
    } catch { /* not valid JSON yet */ }
  }
  if (hasWebsiteCopy) {
    breakdown.websiteCopy = 15
  } else {
    missing.push('website copy')
  }

  const score = Object.values(breakdown).reduce((sum, v) => sum + v, 0)
  return { score, breakdown, missing }
}

/**
 * Run readiness check on a lead. If score >= 70 and lead is in
 * COLLECTING_INFO or BUILDING status, auto-transition to QA_REVIEW.
 */
export async function checkAndTransitionToQA(leadId: string): Promise<ReadinessResult | null> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: {
      id: true,
      status: true,
      buildStep: true,
      companyName: true,
      phone: true,
      city: true,
      state: true,
      logo: true,
      photos: true,
      enrichedPhotos: true,
      services: true,
      enrichedServices: true,
      personalization: true,
      qualificationData: true,
      buildReadinessScore: true,
    },
  })
  if (!lead) return null

  const result = calculateReadinessScore(lead)

  // Always update the score
  await prisma.lead.update({
    where: { id: leadId },
    data: { buildReadinessScore: result.score },
  })

  // Only auto-transition if score >= 70 and not already in site build pipeline
  const siteBuildSteps = ['QA_REVIEW', 'EDITING', 'QA_APPROVED', 'CLIENT_REVIEW', 'CLIENT_APPROVED', 'LAUNCHING', 'LIVE']
  const alreadyInSitePipeline = lead.buildStep && siteBuildSteps.includes(lead.buildStep)

  if (result.score >= 70 && !alreadyInSitePipeline) {
    // Only transition from relevant statuses
    const eligibleStatuses = ['BUILDING', 'INFO_COLLECTED', 'QUALIFIED']
    if (eligibleStatuses.includes(lead.status)) {
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          buildStep: 'QA_REVIEW',
          status: 'QA',
          buildReadinessScore: result.score,
        },
      })

      // Create notification
      const missingNote = result.missing.length > 0
        ? ` Missing: ${result.missing.join(', ')}.`
        : ' All content collected.'

      await prisma.notification.create({
        data: {
          type: 'CLOSE_ENGINE',
          title: 'Site Ready for Review',
          message: `${lead.companyName} scored ${result.score}/100.${missingNote}`,
          metadata: { leadId, score: result.score, missing: result.missing },
        },
      })
    }
  }

  return result
}
