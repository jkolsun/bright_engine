/**
 * Close Engine Qualification Flow
 *
 * Helper module for qualification logic: tracking questions,
 * determining data completeness, suggesting dynamic follow-ups,
 * and formatting collected data for the site builder.
 */

import { prisma } from './db'

// ============================================
// Core Questions (Always Asked)
// ============================================

export const CORE_QUESTIONS = [
  {
    id: 'Q1_SERVICES',
    question: 'What are the top services {companyName} offers that you want highlighted on your site?',
    dataField: 'services',
    required: true,
  },
  {
    id: 'Q2_ABOUT',
    question: 'In a sentence or two, what would you want people to know about {companyName}?',
    dataField: 'aboutStory',
    required: true,
  },
  {
    id: 'Q3_DIFFERENTIATOR',
    question: 'What sets you apart from other {industryLabel} companies in the area?',
    dataField: 'differentiator',
    required: true,
  },
  {
    id: 'Q4_SERVICE_AREA',
    question: 'What areas do you serve? {areaContext}',
    dataField: 'serviceArea',
    required: false,
  },
  {
    id: 'Q5_YEARS',
    question: 'How long has {companyName} been in business?',
    dataField: 'yearsInBusiness',
    required: false,
  },
]

// ============================================
// getDynamicFollowUps()
// ============================================

export function getDynamicFollowUps(
  lead: any,
  collectedData: any
): Array<{ id: string; question: string }> {
  const followUps: Array<{ id: string; question: string }> = []

  // Logo (separated from photos for clarity)
  if (!lead.logo && !collectedData?.logo) {
    followUps.push({
      id: 'Q6_LOGO',
      question: 'Do you have a logo you can text us? It goes right on the site header.',
    })
  }

  // Photos — skip if enrichment already has 3+
  const enrichedPhotos = Array.isArray(lead.enrichedPhotos) ? lead.enrichedPhotos : []
  const clientPhotos = Array.isArray(lead.photos) ? lead.photos : []
  const collectedPhotos = Array.isArray(collectedData?.photos) ? collectedData.photos : []
  if (enrichedPhotos.length < 3 && clientPhotos.length < 1 && collectedPhotos.length < 1) {
    followUps.push({
      id: 'Q7_PHOTOS',
      question: 'Any project photos or team pics you can text us? Sites with real photos convert way better.',
    })
  }

  // Testimonial
  if (!collectedData?.testimonial) {
    followUps.push({
      id: 'Q8_TESTIMONIAL',
      question: 'Got a favorite customer review or quote we can put on the site? Even just one.',
    })
  }

  // Industry-specific questions
  const industryUpper = (lead.industry || '').toUpperCase()
  if (industryUpper.includes('LAW') || industryUpper.includes('LEGAL') || industryUpper.includes('ATTORNEY')) {
    followUps.push({
      id: 'Q9_INDUSTRY',
      question: 'What practice areas should we highlight? (e.g., personal injury, family law, criminal defense)',
    })
  } else if (industryUpper.includes('RESTORATION') || industryUpper.includes('WATER_DAMAGE') || industryUpper.includes('EMERGENCY')) {
    followUps.push({
      id: 'Q9_INDUSTRY',
      question: 'Do you offer 24/7 emergency service? That\'s a huge selling point we\'d want on the site.',
    })
  } else if (industryUpper.includes('ROOFING') || industryUpper.includes('PLUMBING') || industryUpper.includes('HVAC') || industryUpper.includes('ELECTRIC') || industryUpper.includes('CONTRACTOR')) {
    followUps.push({
      id: 'Q9_INDUSTRY',
      question: 'Any certifications or licenses we should showcase? (BBB, bonded & insured, manufacturer certified, etc.)',
    })
  } else if (industryUpper.includes('HEALTH') || industryUpper.includes('DENTAL') || industryUpper.includes('MEDICAL') || industryUpper.includes('CHIRO')) {
    followUps.push({
      id: 'Q9_INDUSTRY',
      question: 'What insurance plans do you accept? Patients always look for that.',
    })
  } else {
    // Generic for other industries
    followUps.push({
      id: 'Q9_INDUSTRY',
      question: 'Any certifications, awards, or memberships we should show on the site?',
    })
  }

  // Hours (moved to dynamic — less important for site quality)
  if (!collectedData?.hours && !lead.enrichedHours) {
    followUps.push({
      id: 'Q10_HOURS',
      question: 'What are your business hours?',
    })
  }

  // Style / brand preferences
  if (!lead.website && !collectedData?.colorPrefs) {
    followUps.push({
      id: 'DYNAMIC_STYLE',
      question: "Any specific colors or style you like? We'll design from scratch to match your brand.",
    })
  }

  // Has existing website
  if (lead.website) {
    followUps.push({
      id: 'DYNAMIC_KEEP_OR_FRESH',
      question: 'Anything from your current site you want to keep? Or would you prefer a completely fresh start?',
    })
  }

  return followUps.slice(0, 5) // Max 5 dynamic follow-ups
}

// ============================================
// getNextQuestion()
// ============================================

export function getNextQuestion(
  questionsAsked: string[],
  collectedData: any,
  lead: any
): { id: string; question: string } | null {
  // Check core questions first
  for (const q of CORE_QUESTIONS) {
    if (!questionsAsked.includes(q.id)) {
      const industryLabel = (lead.industry || 'local service').toLowerCase().replace(/_/g, ' ')
      let question = q.question
        .replace(/\{companyName\}/g, lead.companyName || 'your company')
        .replace(/\{industryLabel\}/g, industryLabel)

      // Add service area context for Q4
      if (q.id === 'Q4_SERVICE_AREA' && (lead.enrichedAddress || lead.city)) {
        const knownLocation = lead.city || lead.enrichedAddress?.split(',')[0] || ''
        question = question.replace('{areaContext}', `We see you're in ${knownLocation} — do you serve surrounding areas too?`)
      } else {
        question = question.replace('{areaContext}', 'Just the main cities or counties.')
      }

      return { id: q.id, question: question.trim() }
    }
  }

  // Then dynamic follow-ups (max 10 total questions)
  if (questionsAsked.length < 10) {
    const dynamics = getDynamicFollowUps(lead, collectedData)
    for (const d of dynamics) {
      if (!questionsAsked.includes(d.id)) {
        return d
      }
    }
  }

  return null // All questions asked or limit reached
}

// ============================================
// isReadyToBuild()
// ============================================

export function isReadyToBuild(collectedData: any, lead: any): boolean {
  // Must have at least one service
  const services = collectedData?.services || lead.enrichedServices || lead.services
  if (!services || (Array.isArray(services) && services.length === 0)) {
    return false
  }

  // Must have at least one of aboutStory or differentiator for quality
  const hasStory = !!collectedData?.aboutStory
  const hasDiff = !!collectedData?.differentiator
  if (!hasStory && !hasDiff) {
    return false
  }

  return true
}

// ============================================
// formatForSiteBuilder()
// ============================================

export function formatForSiteBuilder(lead: any, collectedData: any): Record<string, any> {
  return {
    companyName: lead.companyName,
    industry: lead.industry,
    phone: lead.phone,
    email: lead.email,
    // Collected data takes priority over enriched
    services: collectedData?.services || lead.enrichedServices || lead.services || [],
    hours: collectedData?.hours || lead.enrichedHours || null,
    photos: [
      ...(collectedData?.photos || []),
      ...(lead.enrichedPhotos || []),
      ...(lead.photos || []),
    ],
    logo: lead.logo || null,
    colorPrefs: collectedData?.colorPrefs || lead.colorPrefs || null,
    about: collectedData?.aboutStory || collectedData?.about || null,
    differentiator: collectedData?.differentiator || null,
    yearsInBusiness: collectedData?.yearsInBusiness || null,
    serviceArea: collectedData?.serviceArea || null,
    testimonial: collectedData?.testimonial || null,
    certifications: collectedData?.certifications || null,
    address: lead.enrichedAddress || `${lead.city || ''}, ${lead.state || ''}`.trim() || null,
    rating: lead.enrichedRating || null,
    reviews: lead.enrichedReviews || null,
    specialRequests: collectedData?.specialRequests || null,
  }
}

// ============================================
// trackQuestionAsked() — DB call
// ============================================

export async function trackQuestionAsked(conversationId: string, questionId: string): Promise<void> {
  const conversation = await prisma.closeEngineConversation.findUnique({
    where: { id: conversationId },
  })
  const asked = (conversation?.questionsAsked as string[]) || []
  if (!asked.includes(questionId)) {
    asked.push(questionId)
    await prisma.closeEngineConversation.update({
      where: { id: conversationId },
      data: { questionsAsked: asked },
    })
  }
}
