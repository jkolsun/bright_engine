/**
 * Build step state machine.
 * Validates transitions, provides auto-advance triggers,
 * and syncs lead.status when buildStep changes.
 */

import { prisma } from './db'

// Valid build step transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  ENRICHMENT: ['PREVIEW'],
  PREVIEW: ['PERSONALIZATION'],
  PERSONALIZATION: ['SCRIPTS', 'QA_REVIEW'],
  SCRIPTS: ['DISTRIBUTION', 'QA_REVIEW'],
  DISTRIBUTION: ['COMPLETE', 'QA_REVIEW'],
  COMPLETE: ['QA_REVIEW'],
  BUILDING: ['QA_REVIEW'],
  QA_REVIEW: ['EDITING', 'QA_APPROVED'],
  EDITING: ['QA_REVIEW'],
  QA_APPROVED: ['CLIENT_REVIEW'],
  CLIENT_REVIEW: ['CLIENT_APPROVED', 'EDITING'],
  CLIENT_APPROVED: ['LAUNCHING'],
  LAUNCHING: ['LIVE', 'LAUNCHED'],
  LAUNCHED: ['LIVE'],
  LIVE: [],
}

// Maps buildStep → the lead.status it should be consistent with
const BUILD_STEP_STATUS_SYNC: Record<string, string> = {
  ENRICHMENT: 'QUALIFIED',
  PREVIEW: 'QUALIFIED',
  PERSONALIZATION: 'QUALIFIED',
  SCRIPTS: 'QUALIFIED',
  DISTRIBUTION: 'QUALIFIED',
  COMPLETE: 'QUALIFIED',
  BUILDING: 'QUALIFIED',
  QA_REVIEW: 'CLIENT_REVIEW',
  EDITING: 'CLIENT_REVIEW',
  QA_APPROVED: 'CLIENT_REVIEW',
  CLIENT_REVIEW: 'CLIENT_REVIEW',
  CLIENT_APPROVED: 'CLIENT_REVIEW',
  LAUNCHING: 'CLIENT_REVIEW',
  LAUNCHED: 'PAID',
  LIVE: 'PAID',
}

/**
 * Advance a lead's buildStep with transition validation.
 * Also syncs lead.status if it diverges from what the buildStep expects.
 * Returns true if the transition was applied, false if rejected.
 */
export async function advanceBuildStep(
  leadId: string,
  toStep: string,
  options?: { force?: boolean }
): Promise<boolean> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { buildStep: true, companyName: true, status: true },
  })
  if (!lead) return false

  const currentStep = lead.buildStep || ''

  // If already at or past the target step, skip
  if (currentStep === toStep) return true

  // Validate the transition unless forced
  if (!options?.force) {
    const allowed = VALID_TRANSITIONS[currentStep]
    if (allowed && !allowed.includes(toStep)) {
      console.warn(`[BuildStep] Invalid transition: ${currentStep} → ${toStep} for ${lead.companyName} (${leadId})`)
      return false
    }
  }

  // Determine if lead.status needs syncing
  const expectedStatus = BUILD_STEP_STATUS_SYNC[toStep]
  const updateData: Record<string, unknown> = { buildStep: toStep }

  if (expectedStatus && lead.status !== expectedStatus) {
    // Don't downgrade from PAID/ACTIVE to a lesser status
    const noDowngrade = ['PAID', 'CLOSED_LOST', 'DO_NOT_CONTACT']
    if (!noDowngrade.includes(lead.status || '')) {
      updateData.status = expectedStatus
      console.log(`[BuildStep] Syncing status: ${lead.status} → ${expectedStatus} for ${lead.companyName}`)
    }
  }

  await prisma.lead.update({
    where: { id: leadId },
    data: updateData,
  })

  console.log(`[BuildStep] ${lead.companyName}: ${currentStep} → ${toStep}`)
  return true
}
