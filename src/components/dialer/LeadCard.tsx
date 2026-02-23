'use client'
import { useDialer } from './DialerProvider'
import { LeadInfo } from './LeadInfo'
import { QuickStats } from './QuickStats'
import { LiveFeed } from './LiveFeed'
import { PreviewButton } from './PreviewButton'
import { DispositionTree } from './DispositionTree'
import { CallNotes } from './CallNotes'
import { UpsellTags } from './UpsellTags'

export function LeadCard() {
  const { queue, currentCall } = useDialer()
  const lead = queue.selectedLead

  if (!lead) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        Select a lead from the queue to get started
      </div>
    )
  }

  // Show disposition during active call AND after call ends
  const isOnCall = !!currentCall && ['INITIATED', 'RINGING', 'CONNECTED'].includes(currentCall.status)
  const callEnded = !!currentCall && ['COMPLETED', 'VOICEMAIL', 'NO_ANSWER', 'BUSY', 'FAILED'].includes(currentCall.status)
  const showDisposition = isOnCall || callEnded

  return (
    <div className="p-6 space-y-4 overflow-y-auto">
      <LeadInfo lead={lead} />
      <QuickStats lead={lead} />
      <div className="grid grid-cols-2 gap-4">
        <PreviewButton lead={lead} />
        <UpsellTags leadId={lead.id} />
      </div>

      {/* Notes — ALWAYS visible (before, during, after call) */}
      <CallNotes />

      {/* Disposition — visible during and after call */}
      {showDisposition && <DispositionTree />}

      {/* Live Feed — always visible */}
      <LiveFeed />
    </div>
  )
}
