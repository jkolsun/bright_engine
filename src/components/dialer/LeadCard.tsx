'use client'
import { useState, useEffect } from 'react'
import { useDialer } from './DialerProvider'
import { LeadInfo } from './LeadInfo'
import { QuickStats } from './QuickStats'
import { LiveFeed } from './LiveFeed'
import { PreviewButton } from './PreviewButton'
import { DispositionTree } from './DispositionTree'
import { CallNotes } from './CallNotes'
import { UpsellTags } from './UpsellTags'

const DISPOSITION_COLORS: Record<string, string> = {
  WANTS_TO_MOVE_FORWARD: 'bg-green-100 text-green-700',
  CALLBACK: 'bg-teal-100 text-teal-700',
  WANTS_CHANGES: 'bg-blue-100 text-blue-700',
  WILL_LOOK_LATER: 'bg-amber-100 text-amber-700',
  NOT_INTERESTED: 'bg-gray-100 text-gray-600',
  VOICEMAIL: 'bg-gray-100 text-gray-600',
  NO_ANSWER: 'bg-gray-100 text-gray-600',
  DNC: 'bg-red-100 text-red-700',
  WRONG_NUMBER: 'bg-red-100 text-red-700',
}

export function LeadCard() {
  const { queue, currentCall } = useDialer()
  const lead = queue.selectedLead
  const [callHistory, setCallHistory] = useState<{ calls: any[]; nextCallback: any } | null>(null)

  // Fetch call history when lead changes
  useEffect(() => {
    if (!lead?.id) { setCallHistory(null); return }
    fetch(`/api/dialer/call/history?leadId=${lead.id}`)
      .then(r => r.ok ? r.json() : { calls: [], nextCallback: null })
      .then(setCallHistory)
      .catch(() => setCallHistory(null))
  }, [lead?.id])

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

  const lastCall = callHistory?.calls?.[0]

  return (
    <div className="p-6 space-y-4 overflow-y-auto">
      <LeadInfo lead={lead} />
      <QuickStats lead={lead} />

      {/* Last Call summary — shows when lead has previous calls */}
      {lastCall && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase">Last Call</span>
              <span className="text-xs text-slate-400">
                {new Date(lastCall.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
              {lastCall.rep?.name && <span className="text-xs text-slate-400">by {lastCall.rep.name}</span>}
            </div>
            <div className="flex items-center gap-2">
              {lastCall.connectedAt && lastCall.duration && (
                <span className="text-xs text-slate-400">{Math.floor(lastCall.duration / 60)}:{String(lastCall.duration % 60).padStart(2, '0')}</span>
              )}
              {lastCall.dispositionResult && (
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${DISPOSITION_COLORS[lastCall.dispositionResult] || 'bg-gray-100 text-gray-600'}`}>
                  {lastCall.dispositionResult.replace(/_/g, ' ')}
                </span>
              )}
            </div>
          </div>
          {callHistory?.nextCallback && (
            <p className="text-xs text-teal-600 font-medium mt-1.5">
              Callback scheduled: {new Date(callHistory.nextCallback.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
      )}

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
