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
    question: 'What are the top 3 services {companyName} offers that you want highlighted on your site?',
    dataField: 'services',
    required: true,
  },
  {
    id: 'Q2_HOURS',
    question: 'What are your business hours? {hoursContext}',
    dataField: 'hours',
    required: false, // Enriched data may have this
  },
  {
    id: 'Q3_PHOTOS',
    question: "Do you have a logo and any photos you'd like on the site? You can text them right to this number.",
    dataField: 'photos',
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

  // No photos from any source
  if (!lead.enrichedPhotos?.length && !collectedData?.photos?.length && !lead.photos?.length) {
    followUps.push({
      id: 'DYNAMIC_PHOTOS',
      question: 'Do you have any project photos or team pictures? Sites with real photos convert 2x better than stock images.',
    })
  }

  // Legal industry
  if (
    lead.industry?.toUpperCase().includes('LAW') ||
    lead.industry?.toUpperCase().includes('LEGAL') ||
    lead.industry?.toUpperCase().includes('ATTORNEY')
  ) {
    followUps.push({
      id: 'DYNAMIC_PRACTICE_AREAS',
      question: 'What practice areas should we highlight? (e.g., personal injury, family law, criminal defense)',
    })
  }

  // Restoration industry
  if (
    lead.industry?.toUpperCase().includes('RESTORATION') ||
    lead.industry?.toUpperCase().includes('WATER_DAMAGE')
  ) {
    followUps.push({
      id: 'DYNAMIC_SERVICE_AREA',
      question: "What's your primary service area? And do you offer 24/7 emergency service we should highlight?",
    })
  }

  // No existing website
  if (!lead.website) {
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

  return followUps.slice(0, 3) // Max 3 dynamic follow-ups
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
      let question = q.question.replace('{companyName}', lead.companyName || 'your company')

      // Add hours context for Q2
      if (q.id === 'Q2_HOURS' && lead.enrichedHours) {
        question = question.replace('{hoursContext}', '(We found some hours online — just confirm or correct them)')
      } else {
        question = question.replace('{hoursContext}', '')
      }

      return { id: q.id, question: question.trim() }
    }
  }

  // Then dynamic follow-ups (max 6 total = 3 core + 3 dynamic)
  if (questionsAsked.length < 6) {
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
  // Minimum: must have at least one service
  const services = collectedData?.services || lead.enrichedServices || lead.services
  if (!services || (Array.isArray(services) && services.length === 0)) {
    return false
  }
  return true // Everything else has fallbacks
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
    about: collectedData?.about || null, // AI will generate if null
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
