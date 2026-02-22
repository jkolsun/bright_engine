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

  const showDisposition = currentCall && ['COMPLETED', 'VOICEMAIL', 'NO_ANSWER', 'BUSY', 'FAILED'].includes(currentCall.status)

  return (
    <div className="p-6 space-y-4">
      <LeadInfo lead={lead} />
      <QuickStats lead={lead} />
      <div className="grid grid-cols-2 gap-4">
        <PreviewButton lead={lead} />
        <UpsellTags leadId={lead.id} />
      </div>
      <LiveFeed />
      {showDisposition && <DispositionTree />}
      <CallNotes />
    </div>
  )
}
