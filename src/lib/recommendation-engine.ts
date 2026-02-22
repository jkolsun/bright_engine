/**
 * AI Disposition Recommendation Engine
 * Signal-weighted scoring from spec 09 — analyzes real-time call signals
 * to recommend the most likely disposition outcomes.
 */

import { prisma } from './db'

// ============================================
// Types
// ============================================

export interface Recommendation {
  outcome: string
  confidence: number
  reason: string
}

export interface RecommendationResult {
  recommendations: Recommendation[]
  signals: Record<string, boolean | number>
}

// ============================================
// Signal Weights (from spec 09)
// ============================================

const SIGNAL_WEIGHTS: Record<string, number> = {
  CTA_CLICKED: 0.50,
  PREVIEW_OPENED_LONG_CALL: 0.35,
  UPSELLS_TAGGED: 0.25,
  PREVIEW_SENT_NOT_OPENED_LONG: 0.20,
  PREVIOUS_CALLBACK: 0.15,
  PREVIOUS_NOT_INTERESTED: -0.10,
  HIGH_CALL_COUNT_NO_CONVERSION: -0.15,
}

// Minimum confidence threshold to show a recommendation
const MIN_CONFIDENCE = 0.15

// ============================================
// Main Function
// ============================================

export async function calculateRecommendation(
  callId: string,
  leadId: string
): Promise<RecommendationResult> {
  // Load current call + lead data in parallel
  const [call, lead, previousCalls, upsellTags, callbacks] = await Promise.all([
    prisma.dialerCall.findUnique({
      where: { id: callId },
      select: {
        connectedAt: true,
        startedAt: true,
        previewSentDuringCall: true,
        previewOpenedDuringCall: true,
        ctaClickedDuringCall: true,
        duration: true,
      },
    }),
    prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true, status: true },
    }),
    prisma.dialerCall.findMany({
      where: { leadId, dispositionResult: { not: null } },
      select: { dispositionResult: true },
      orderBy: { startedAt: 'desc' },
      take: 10,
    }),
    prisma.upsellTag.findMany({
      where: { leadId, removedAt: null },
      select: { id: true },
    }),
    prisma.callbackSchedule.findMany({
      where: { leadId, status: 'COMPLETED' },
      select: { id: true },
    }),
  ])

  if (!call || !lead) {
    return { recommendations: [], signals: {} }
  }

  // Calculate current call duration in seconds
  const now = new Date()
  const callDurationSec = call.connectedAt
    ? Math.round((now.getTime() - call.connectedAt.getTime()) / 1000)
    : call.duration || 0

  // Detect signals
  const signals: Record<string, boolean | number> = {
    ctaClicked: !!call.ctaClickedDuringCall,
    previewOpenedLongCall: !!call.previewOpenedDuringCall && callDurationSec > 120,
    upsellsTagged: upsellTags.length > 0,
    previewSentNotOpenedLong: !!call.previewSentDuringCall && !call.previewOpenedDuringCall && callDurationSec > 60,
    previousCallback: callbacks.length > 0,
    previousNotInterested: previousCalls.some((c) => c.dispositionResult === 'NOT_INTERESTED'),
    highCallCountNoConversion:
      previousCalls.length > 3 &&
      !previousCalls.some((c) =>
        ['WANTS_TO_MOVE_FORWARD', 'INTERESTED_VERBAL', 'WANTS_CHANGES'].includes(c.dispositionResult || '')
      ),
    callDuration: callDurationSec,
    totalPreviousCalls: previousCalls.length,
  }

  // Calculate outcome scores
  const outcomes: Record<string, { score: number; reasons: string[] }> = {
    WANTS_TO_MOVE_FORWARD: { score: 0, reasons: [] },
    INTERESTED_VERBAL: { score: 0, reasons: [] },
    CALLBACK: { score: 0, reasons: [] },
    WANTS_CHANGES: { score: 0, reasons: [] },
    WILL_LOOK_LATER: { score: 0, reasons: [] },
    NOT_INTERESTED: { score: 0, reasons: [] },
  }

  // CTA clicked → strong signal for WANTS_TO_MOVE_FORWARD
  if (signals.ctaClicked) {
    outcomes.WANTS_TO_MOVE_FORWARD.score += SIGNAL_WEIGHTS.CTA_CLICKED
    outcomes.WANTS_TO_MOVE_FORWARD.reasons.push('CTA clicked during call')
  }

  // Preview opened + long call → interested
  if (signals.previewOpenedLongCall) {
    outcomes.WANTS_TO_MOVE_FORWARD.score += SIGNAL_WEIGHTS.PREVIEW_OPENED_LONG_CALL * 0.6
    outcomes.WANTS_TO_MOVE_FORWARD.reasons.push('Preview opened + long call')
    outcomes.INTERESTED_VERBAL.score += SIGNAL_WEIGHTS.PREVIEW_OPENED_LONG_CALL
    outcomes.INTERESTED_VERBAL.reasons.push('Preview opened + long call')
    outcomes.WANTS_CHANGES.score += SIGNAL_WEIGHTS.PREVIEW_OPENED_LONG_CALL * 0.5
    outcomes.WANTS_CHANGES.reasons.push('Preview opened + long call')
  }

  // Upsells tagged → interested
  if (signals.upsellsTagged) {
    outcomes.WANTS_TO_MOVE_FORWARD.score += SIGNAL_WEIGHTS.UPSELLS_TAGGED
    outcomes.WANTS_TO_MOVE_FORWARD.reasons.push('Upsell products tagged')
    outcomes.INTERESTED_VERBAL.score += SIGNAL_WEIGHTS.UPSELLS_TAGGED * 0.8
    outcomes.INTERESTED_VERBAL.reasons.push('Upsell products tagged')
  }

  // Preview sent but not opened + some call time → might look later
  if (signals.previewSentNotOpenedLong) {
    outcomes.WILL_LOOK_LATER.score += SIGNAL_WEIGHTS.PREVIEW_SENT_NOT_OPENED_LONG
    outcomes.WILL_LOOK_LATER.reasons.push('Preview sent, not opened yet')
    outcomes.CALLBACK.score += SIGNAL_WEIGHTS.PREVIEW_SENT_NOT_OPENED_LONG * 0.7
    outcomes.CALLBACK.reasons.push('Preview sent, not opened yet')
  }

  // Previous callback → likely callback again or interested
  if (signals.previousCallback) {
    outcomes.CALLBACK.score += SIGNAL_WEIGHTS.PREVIOUS_CALLBACK
    outcomes.CALLBACK.reasons.push('Previous callback completed')
    outcomes.INTERESTED_VERBAL.score += SIGNAL_WEIGHTS.PREVIOUS_CALLBACK * 0.5
    outcomes.INTERESTED_VERBAL.reasons.push('Previous callback completed')
  }

  // Previous not interested → negative signal
  if (signals.previousNotInterested) {
    outcomes.WANTS_TO_MOVE_FORWARD.score += SIGNAL_WEIGHTS.PREVIOUS_NOT_INTERESTED
    outcomes.NOT_INTERESTED.score += Math.abs(SIGNAL_WEIGHTS.PREVIOUS_NOT_INTERESTED)
    outcomes.NOT_INTERESTED.reasons.push('Previously marked not interested')
  }

  // High call count with no conversion → negative signal
  if (signals.highCallCountNoConversion) {
    outcomes.WANTS_TO_MOVE_FORWARD.score += SIGNAL_WEIGHTS.HIGH_CALL_COUNT_NO_CONVERSION
    outcomes.NOT_INTERESTED.score += Math.abs(SIGNAL_WEIGHTS.HIGH_CALL_COUNT_NO_CONVERSION)
    outcomes.NOT_INTERESTED.reasons.push('Many calls without conversion')
  }

  // Call duration bonus — longer calls tend toward positive outcomes
  if (callDurationSec > 180) {
    outcomes.WANTS_TO_MOVE_FORWARD.score += 0.15
    outcomes.WANTS_TO_MOVE_FORWARD.reasons.push('Long call (3+ min)')
    outcomes.INTERESTED_VERBAL.score += 0.10
  } else if (callDurationSec > 60) {
    outcomes.INTERESTED_VERBAL.score += 0.10
    outcomes.INTERESTED_VERBAL.reasons.push('Moderate call length')
    outcomes.CALLBACK.score += 0.05
  }

  // Build sorted recommendations above threshold
  const recommendations: Recommendation[] = Object.entries(outcomes)
    .filter(([, data]) => data.score >= MIN_CONFIDENCE)
    .sort(([, a], [, b]) => b.score - a.score)
    .slice(0, 3)
    .map(([outcome, data]) => ({
      outcome,
      confidence: Math.min(data.score, 1.0),
      reason: data.reasons[0] || 'Based on call signals',
    }))

  return { recommendations, signals }
}
