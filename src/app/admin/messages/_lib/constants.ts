import React from 'react'

// ─── Types ───

export type ViewMode = 'inbox' | 'conversation' | 'settings'
export type InboxTab = 'pre_client' | 'post_client' | 'all'

// ─── Badge Constants ───

export const ENTRY_POINT_BADGES: Record<string, { label: string; color: string }> = {
  SMS_REPLY: { label: 'SMS', color: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' },
  REP_CLOSE: { label: 'Rep', color: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400' },
  PREVIEW_CTA: { label: 'CTA', color: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400' },
}

export const STAGE_BADGES: Record<string, { label: string; color: string; pulse?: boolean }> = {
  INITIATED: { label: 'Initiated', color: 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300' },
  QUALIFYING: { label: 'Qualifying', color: 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400' },
  COLLECTING_INFO: { label: 'Collecting Info', color: 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400' },
  BUILDING: { label: 'Building', color: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400' },
  PREVIEW_SENT: { label: 'Preview Sent', color: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400' },
  EDIT_LOOP: { label: 'Edit Loop', color: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400' },
  PAYMENT_SENT: { label: 'Payment Sent', color: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' },
  STALLED: { label: 'Stalled', color: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400' },
  PENDING_APPROVAL: { label: 'Needs Approval', color: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400', pulse: true },
  COMPLETED: { label: 'Completed', color: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' },
  CLOSED_LOST: { label: 'Closed', color: 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400' },
}

// ─── Badge Components ───

export function EntryPointBadge({ entryPoint }: { entryPoint: string }) {
  const badge = ENTRY_POINT_BADGES[entryPoint]
  if (!badge) return null
  return React.createElement('span', { className: `inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}` }, badge.label)
}

export function StageBadge({ stage }: { stage: string }) {
  const badge = STAGE_BADGES[stage] || { label: stage, color: 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300' }
  return React.createElement('span', { className: `inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.color} ${badge.pulse ? 'animate-pulse' : ''}` }, badge.label)
}

// ─── Utility Functions ───

export function timeSince(date: string): string {
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60))
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function linkifyText(text: string): React.ReactNode {
  if (!text) return text
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const parts = text.split(urlRegex)
  if (parts.length === 1) return text
  return parts.map((part, i) => {
    if (urlRegex.test(part)) {
      // Reset lastIndex since we reuse the regex
      urlRegex.lastIndex = 0
      return React.createElement('a', { key: i, href: part, target: '_blank', rel: 'noopener noreferrer', className: 'text-blue-600 underline break-all' }, part)
    }
    return part
  })
}
