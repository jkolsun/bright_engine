import {
  Eye, Pencil, CheckCircle, Send, Rocket, Globe,
} from 'lucide-react'

// ============================================
// Site Build Pipeline Steps
// ============================================

export const SITE_STEPS = ['QA_REVIEW', 'EDITING', 'QA_APPROVED', 'CLIENT_REVIEW', 'CLIENT_APPROVED', 'LAUNCHING', 'LIVE'] as const

export const SITE_STEP_CONFIG: Record<string, { label: string; icon: any; color: string; bgColor: string }> = {
  QA_REVIEW: { label: 'QA Review', icon: Eye, color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/40' },
  EDITING: { label: 'Editing', icon: Pencil, color: 'text-amber-600', bgColor: 'bg-amber-100 dark:bg-amber-900/40' },
  QA_APPROVED: { label: 'Awaiting Andrew', icon: Send, color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/40' },
  CLIENT_REVIEW: { label: 'Client Review', icon: Eye, color: 'text-indigo-600', bgColor: 'bg-indigo-100 dark:bg-indigo-900/40' },
  CLIENT_APPROVED: { label: 'Client Approved', icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/40' },
  LAUNCHING: { label: 'Launching', icon: Rocket, color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/40' },
  LIVE: { label: 'Live', icon: Globe, color: 'text-emerald-600', bgColor: 'bg-emerald-100 dark:bg-emerald-900/40' },
}

// Worker pipeline steps (secondary tab)
export const WORKER_STEPS = ['ENRICHMENT', 'PREVIEW', 'PERSONALIZATION', 'SCRIPTS', 'DISTRIBUTION'] as const
export const WORKER_CONFIG: Record<string, { label: string; short: string; color: string }> = {
  ENRICHMENT: { label: 'Enrichment', short: 'E', color: 'bg-blue-500' },
  PREVIEW: { label: 'Preview', short: 'P', color: 'bg-purple-500' },
  PERSONALIZATION: { label: 'Personalization', short: 'A', color: 'bg-amber-500' },
  SCRIPTS: { label: 'Scripts', short: 'S', color: 'bg-teal-500' },
  DISTRIBUTION: { label: 'Distribution', short: 'D', color: 'bg-green-500' },
}

export function formatTimeAgo(date: string): string {
  const ms = Date.now() - new Date(date).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function formatDuration(ms: number | null | undefined): string {
  if (!ms) return '--'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

export function formatTimeSince(dateStr: string | null) {
  if (!dateStr) return ''
  const hours = Math.round((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60) * 10) / 10
  if (hours < 1) return `${Math.round(hours * 60)}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}
