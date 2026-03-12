import { CheckCircle2, Clock, XCircle, AlertTriangle } from 'lucide-react'

// ─── Types ───
export type ViewMode = 'overview' | 'list' | 'billing' | 'profile'

export const ONBOARDING_STEP_LABELS: Record<number, string> = {
  0: 'Not Started', 1: 'Welcome', 2: 'Domain', 3: 'Content Review',
  4: 'Domain Setup', 5: 'DNS Verify', 6: 'Go-Live', 7: 'Complete',
}

// ─── Health Score Logic ───
export function getHealthScore(client: any) {
  let score = 0
  if (client.hostingStatus === 'ACTIVE') score += 30
  else if (client.hostingStatus === 'GRACE_PERIOD') score += 15
  if (client.lastInteraction) {
    const days = Math.floor((Date.now() - new Date(client.lastInteraction).getTime()) / (1000 * 60 * 60 * 24))
    if (days <= 30) score += 20
    else if (days <= 60) score += 10
  }
  if (client._count?.editRequests > 0) score += 15
  if (client.analytics?.totalVisits > 0) score += 10
  if (client.upsells && Array.isArray(client.upsells) && client.upsells.length > 0) score += 10
  if (client._count?.messages > 0) score += 15
  return Math.min(100, score)
}

export function getHealthBadge(score: number) {
  if (score >= 80) return { label: 'Healthy', color: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400', icon: '🟢' }
  if (score >= 50) return { label: 'Monitor', color: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400', icon: '🟡' }
  return { label: 'At Risk', color: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400', icon: '🔴' }
}

export function getClientStage(client: any) {
  // Meeting-close clients that haven't launched yet show as "Pending Launch" instead of "Deactivated"
  if (client.clientTrack === 'MEETING_CLOSE' && client.hostingStatus === 'DEACTIVATED') return { label: 'Pending Launch', color: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400', icon: Clock }
  if (client.hostingStatus === 'DEACTIVATED') return { label: 'Deactivated', color: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400', icon: Clock }
  if (client.hostingStatus === 'CANCELLED') return { label: 'Cancelled', color: 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300', icon: XCircle }
  if (client.hostingStatus === 'FAILED_PAYMENT') return { label: 'Payment Failed', color: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400', icon: AlertTriangle }
  if (client.hostingStatus === 'GRACE_PERIOD') return { label: 'Grace Period', color: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400', icon: Clock }
  if (client.onboardingStep > 0 && client.onboardingStep < 7) {
    const stepLabel = ONBOARDING_STEP_LABELS[client.onboardingStep] || 'Onboarding'
    return { label: `Onboarding (${stepLabel}/${7})`, color: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400', icon: Clock }
  }
  if (!client.siteUrl && !client.siteLiveDate) return { label: 'Onboarding', color: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400', icon: Clock }
  if (client.churnRiskScore >= 70) return { label: 'At Risk', color: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400', icon: AlertTriangle }
  if (client.siteLiveDate) {
    const daysSinceLive = Math.floor((Date.now() - new Date(client.siteLiveDate).getTime()) / (1000 * 60 * 60 * 24))
    if (daysSinceLive <= 30) return { label: 'New Client', color: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400', icon: CheckCircle2 }
  }
  return { label: 'Active', color: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400', icon: CheckCircle2 }
}

export function getDaysSince(date: string | null) {
  if (!date) return null
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24))
}
