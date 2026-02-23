/**
 * Client onboarding state machine.
 * Manages the 7-step post-payment lifecycle from welcome to live site.
 */

import { prisma } from './db'

// ── Onboarding flow settings (from Settings > Communication > Post-AQ) ──
export interface OnboardingFlowSettings {
  welcome: string
  domainQuestion: string
  gbpPrompt: string
  stageTemplate: string
}

const DEFAULT_ONBOARDING_FLOW: OnboardingFlowSettings = {
  welcome: "Welcome aboard! Let's get {companyName} live.",
  domainQuestion: "Do you already have a domain you'd like to use, or would you like us to help pick one?",
  gbpPrompt: "Do you have a Google Business Profile? If so, we can connect it to your site for better local visibility.",
  stageTemplate: '',
}

let _cachedFlow: OnboardingFlowSettings | null = null
let _cacheTime = 0
const CACHE_TTL = 60_000 // 1 min

/**
 * Load onboarding flow settings from the DB (Settings > Communication > Post-AQ).
 * Cached for 1 minute. Returns defaults if nothing saved.
 */
export async function getOnboardingFlowSettings(): Promise<OnboardingFlowSettings> {
  if (_cachedFlow && Date.now() - _cacheTime < CACHE_TTL) return _cachedFlow

  try {
    const setting = await prisma.settings.findUnique({ where: { key: 'onboarding_flow' } })
    const saved = setting?.value as Record<string, string> | null
    _cachedFlow = {
      welcome: saved?.welcome || DEFAULT_ONBOARDING_FLOW.welcome,
      domainQuestion: saved?.domainQuestion || DEFAULT_ONBOARDING_FLOW.domainQuestion,
      gbpPrompt: saved?.gbpPrompt || DEFAULT_ONBOARDING_FLOW.gbpPrompt,
      stageTemplate: saved?.stageTemplate || DEFAULT_ONBOARDING_FLOW.stageTemplate,
    }
    _cacheTime = Date.now()
    return _cachedFlow
  } catch {
    return DEFAULT_ONBOARDING_FLOW
  }
}

/**
 * Interpolate variables like {firstName}, {companyName} into a template string.
 */
export function interpolateTemplate(template: string, vars: Record<string, string>): string {
  let result = template
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
  }
  return result
}

// ── Step constants ──
export const ONBOARDING_STEPS = {
  NOT_STARTED: 0,
  WELCOME: 1,
  DOMAIN_COLLECTION: 2,
  CONTENT_REVIEW: 3,
  DOMAIN_SETUP: 4,
  DNS_VERIFICATION: 5,
  GO_LIVE_CONFIRMATION: 6,
  COMPLETE: 7,
} as const

export const STEP_LABELS: Record<number, string> = {
  0: 'Not Started',
  1: 'Welcome',
  2: 'Domain Collection',
  3: 'Content Review',
  4: 'Domain Setup',
  5: 'DNS Verification',
  6: 'Go-Live Confirmation',
  7: 'Complete',
}

// ── Get onboarding state ──
export async function getOnboarding(clientId: string) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      companyName: true,
      onboardingStep: true,
      onboardingData: true,
      customDomain: true,
      domainStatus: true,
      siteUrl: true,
      stagingUrl: true,
      siteLiveDate: true,
      hostingStatus: true,
    },
  })
  if (!client) return null

  return {
    ...client,
    stepLabel: STEP_LABELS[client.onboardingStep] || 'Unknown',
    data: (client.onboardingData || {}) as Record<string, unknown>,
  }
}

// ── Update onboarding data (merge partial JSON) ──
export async function updateOnboarding(
  clientId: string,
  dataUpdates: Record<string, unknown>
) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { onboardingData: true },
  })
  const existing = (client?.onboardingData || {}) as Record<string, unknown>
  const merged = { ...existing, ...dataUpdates }

  return prisma.client.update({
    where: { id: clientId },
    data: {
      onboardingData: merged as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    },
  })
}

// ── Advance onboarding step ──
export async function advanceOnboarding(clientId: string, toStep?: number) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { onboardingStep: true, companyName: true, leadId: true },
  })
  if (!client) throw new Error('Client not found')

  const nextStep = toStep ?? client.onboardingStep + 1
  if (nextStep < 0 || nextStep > 7) throw new Error(`Invalid step: ${nextStep}`)
  if (nextStep <= client.onboardingStep && toStep === undefined) return client

  const updated = await prisma.client.update({
    where: { id: clientId },
    data: { onboardingStep: nextStep },
  })

  // Log timeline event
  if (client.leadId) {
    await prisma.leadEvent.create({
      data: {
        leadId: client.leadId,
        eventType: 'STAGE_CHANGE',
        actor: 'system',
        metadata: {
          type: 'onboarding_step',
          fromStep: client.onboardingStep,
          toStep: nextStep,
          stepLabel: STEP_LABELS[nextStep],
        },
      },
    }).catch(err => console.error('[Onboarding] Non-critical write failed:', err))
  }

  // When reaching COMPLETE, set siteLiveDate and trigger post-launch sequences
  if (nextStep === ONBOARDING_STEPS.COMPLETE) {
    await prisma.client.update({
      where: { id: clientId },
      data: { siteLiveDate: updated.siteLiveDate || new Date() },
    })

    try {
      const { triggerPostLaunchSequence } = await import('./resend')
      await triggerPostLaunchSequence(clientId)
    } catch (err) {
      console.error('[Onboarding] Failed to trigger post-launch sequences:', err)
    }
  }

  return updated
}

// ── Create onboarding approval ──
export async function createOnboardingApproval(params: {
  gate: string
  title: string
  description: string
  clientId: string
  draftContent?: string
  priority?: string
  metadata?: Record<string, unknown>
}) {
  return prisma.approval.create({
    data: {
      gate: params.gate,
      title: params.title,
      description: params.description,
      draftContent: params.draftContent || null,
      clientId: params.clientId,
      requestedBy: 'system',
      priority: params.priority || 'NORMAL',
      metadata: (params.metadata || undefined) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    },
  })
}
