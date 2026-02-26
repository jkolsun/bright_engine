'use client'
import { useState, useEffect, useCallback } from 'react'
import { useDialer } from './DialerProvider'
import { Phone, Voicemail, PhoneMissed, Ban, ArrowLeft, Bot } from 'lucide-react'
import type { Recommendation } from '@/types/dialer'

type Layer1 = 'connected' | 'voicemail' | 'no_answer' | 'bad_number'

export function DispositionTree() {
  const { currentCall, queue, setCurrentCall, session, autoDialState, handleAutoDialNext, handleSwapToNewCall } = useDialer()
  const [layer, setLayer] = useState<'L1' | 'L2'>('L1')
  const [l1Choice, setL1Choice] = useState<Layer1 | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [callbackDate, setCallbackDate] = useState('')
  const [callbackTime, setCallbackTime] = useState('09:00')
  const [allDay, setAllDay] = useState(false)
  const [dncChecked, setDncChecked] = useState(false)
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [queuedDisposition, setQueuedDisposition] = useState<{ result: string; extra?: Record<string, unknown> } | null>(null)
  const [lastClicked, setLastClicked] = useState<string | null>(null)

  const isOnCall = !!currentCall && ['INITIATED', 'RINGING', 'CONNECTED'].includes(currentCall.status)
  const callEnded = !!currentCall && ['COMPLETED', 'VOICEMAIL', 'NO_ANSWER', 'BUSY', 'FAILED'].includes(currentCall.status)

  // Fetch AI recommendations (uses existing /api/dialer/recommendation endpoint)
  useEffect(() => {
    if (!currentCall?.id || !queue.selectedLeadId) return
    fetch(`/api/dialer/recommendation?callId=${currentCall.id}&leadId=${queue.selectedLeadId}`)
      .then(r => r.ok ? r.json() : { recommendations: [] })
      .then(data => setRecommendations(data.recommendations || []))
      .catch(() => setRecommendations([]))
  }, [currentCall?.id, queue.selectedLeadId])

  // Reset when call changes
  useEffect(() => {
    setLayer('L1')
    setL1Choice(null)
    setCallbackDate('')
    setCallbackTime('09:00')
    setAllDay(false)
    setDncChecked(false)
    setQueuedDisposition(null)
  }, [currentCall?.id])

  // If disposition was queued during call and call just ended, auto-submit
  useEffect(() => {
    if (callEnded && queuedDisposition) {
      submitDisposition(queuedDisposition.result, queuedDisposition.extra)
    }
  }, [callEnded, queuedDisposition])

  const submitDisposition = useCallback(async (result: string, extra?: Record<string, unknown>) => {
    if (!currentCall) return
    setSubmitting(true)
    try {
      const isRecommended = recommendations.some(r => r.outcome === result)

      // 1. Submit disposition to existing endpoint (uses logDisposition in dialer-service.ts)
      await fetch('/api/dialer/disposition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callId: currentCall.id,
          result,
          wasRecommended: isRecommended,
        }),
      })

      // 1b. Increment session stats optimistically (per-disposition + backward-compat aggregates)
      const DISPOSITION_STAT_MAP: Record<string, string> = {
        WANTS_TO_MOVE_FORWARD: 'wantsToMoveForwardCount',
        CALLBACK: 'callbackCount',
        INTERESTED_VERBAL: 'interestedVerbalCount',
        WANTS_CHANGES: 'wantsChangesCount',
        WILL_LOOK_LATER: 'willLookLaterCount',
        DNC: 'dncCount',
        VOICEMAIL: 'voicemails',
        NO_ANSWER: 'noAnswers',
        WRONG_NUMBER: 'wrongNumberCount',
        DISCONNECTED: 'disconnectedCount',
      }
      const INTERESTED_RESULTS = ['WANTS_TO_MOVE_FORWARD', 'CALLBACK', 'INTERESTED_VERBAL', 'WANTS_CHANGES']
      const NOT_INTERESTED_RESULTS = ['NOT_INTERESTED', 'DNC']

      // Increment specific disposition field (NOT_INTERESTED uses notInterestedCount as its
      // per-disposition field AND its aggregate, so it's handled below to avoid double-increment)
      const statField = DISPOSITION_STAT_MAP[result]
      if (statField) session.incrementStat(statField)
      // Increment backward-compat aggregates
      if (INTERESTED_RESULTS.includes(result)) session.incrementStat('interestedCount')
      if (NOT_INTERESTED_RESULTS.includes(result) && result !== 'NOT_INTERESTED') session.incrementStat('notInterestedCount')
      // NOT_INTERESTED doesn't have a separate per-disposition field — notInterestedCount IS its field
      if (result === 'NOT_INTERESTED') session.incrementStat('notInterestedCount')
      // Increment connected calls if the call was connected
      if (l1Choice === 'connected') session.incrementStat('connectedCalls')

      // 2. If CALLBACK with date, also schedule the callback (existing endpoint)
      if (result === 'CALLBACK' && extra?.callbackAt) {
        await fetch('/api/dialer/callback/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leadId: currentCall.leadId,
            scheduledAt: extra.callbackAt,
            callId: currentCall.id,
            isAllDay: extra.isAllDay || false,
          }),
        }).catch(err => console.warn('[Disposition] Callback schedule failed:', err))
      }

      // 3. Move lead between queue tabs based on disposition
      queue.moveLeadAfterDisposition(currentCall.leadId, result)

      // 4. Clear call state — skip setCurrentCall(null) when auto-dial will overwrite it
      //    to prevent React batching null+newCall causing components to unmount
      setQueuedDisposition(null)
      const autoDialWillTakeOver = autoDialState === 'CONNECTED_PENDING_SWAP' || !!session.session?.autoDialEnabled
      if (!autoDialWillTakeOver) {
        setCurrentCall(null)
      }

      // 5. Auto-dial: if a pending call is already connected, swap to it.
      //    If waiting for disposition, fire the next auto-dial.
      //    Otherwise just advance the queue manually.
      if (autoDialState === 'CONNECTED_PENDING_SWAP') {
        handleSwapToNewCall()
      } else {
        queue.selectNext()
        // Fire auto-dial after disposition (non-blocking)
        handleAutoDialNext()
      }
    } finally {
      setSubmitting(false)
    }
  }, [currentCall, recommendations, queue, autoDialState, handleAutoDialNext, handleSwapToNewCall])

  const handleDisposition = useCallback((result: string, extra?: Record<string, unknown>) => {
    if (isOnCall) {
      // Call still active — queue the disposition (preserve extra for callbacks)
      setQueuedDisposition({ result, extra })
    } else {
      // Call ended — submit immediately
      submitDisposition(result, extra)
    }
  }, [isOnCall, submitDisposition])

  const flashButton = (id: string) => {
    setLastClicked(id)
    setTimeout(() => setLastClicked(null), 600)
  }

  const handleL1 = (choice: Layer1) => {
    flashButton(choice)
    // Single-click outcomes
    if (choice === 'voicemail') { handleDisposition('VOICEMAIL'); return }
    if (choice === 'no_answer') { handleDisposition('NO_ANSWER'); return }
    if (choice === 'bad_number') { handleDisposition('WRONG_NUMBER'); return }
    // Connected → show Layer 2
    setL1Choice(choice)
    setLayer('L2')
  }

  const handleL2 = (result: string) => {
    flashButton(result)
    if (result === 'NOT_INTERESTED') {
      handleDisposition(dncChecked ? 'DNC' : 'NOT_INTERESTED')
      return
    }
    handleDisposition(result)
  }

  const handleCallbackSubmit = () => {
    if (!callbackDate) return
    const callbackAt = allDay
      ? new Date(`${callbackDate}T00:00:00`).toISOString()
      : new Date(`${callbackDate}T${callbackTime}:00`).toISOString()
    handleDisposition('CALLBACK', { callbackAt, ...(allDay ? { isAllDay: true } : {}) })
  }

  if (submitting) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
        <div className="text-sm text-gray-500 animate-pulse">Logging outcome...</div>
      </div>
    )
  }

  // Top recommendation (Recommendation type verified: { outcome: string, confidence: number, reason: string })
  const topRec = recommendations[0]

  return (
    <div className="space-y-3">
      {/* AI RECOMMENDATION BOX — separate from disposition */}
      {topRec && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <Bot size={14} className="text-purple-600" />
            <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">AI Suggestion</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-medium text-purple-900">
                {topRec.outcome.replace(/_/g, ' ')}
              </div>
              <div className="text-xs text-purple-600 mt-0.5 truncate">{topRec.reason}</div>
            </div>
            <button
              onClick={() => handleDisposition(topRec.outcome)}
              disabled={submitting}
              className="px-4 py-2 bg-purple-600 text-white text-xs font-semibold rounded-lg hover:bg-purple-700 transition-all duration-150 whitespace-nowrap flex-shrink-0 active:scale-[0.95]"
            >
              Use This
            </button>
          </div>
          {queuedDisposition?.result === topRec.outcome && isOnCall && (
            <div className="mt-2 text-xs text-purple-500 font-medium">Queued — will submit when call ends</div>
          )}
        </div>
      )}

      {/* DISPOSITION BOX */}
      <div className="bg-white rounded-xl border border-gray-200 p-3">
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            {layer === 'L1' ? 'What happened?' : 'How\'d it go?'}
          </h3>
          {layer === 'L2' && (
            <button
              onClick={() => { setLayer('L1'); setL1Choice(null) }}
              className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
            >
              <ArrowLeft size={12} /> Back
            </button>
          )}
        </div>

        {/* Queued indicator */}
        {queuedDisposition && isOnCall && (
          <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
            <span className="text-xs text-amber-700 font-medium">
              Queued: {queuedDisposition.result.replace(/_/g, ' ')}
            </span>
            <button
              onClick={() => setQueuedDisposition(null)}
              className="text-xs text-amber-500 hover:text-amber-700"
            >
              Cancel
            </button>
          </div>
        )}

        {/* LAYER 1: What happened? */}
        {layer === 'L1' && (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleL1('connected')}
              className={`flex flex-col items-center gap-1 px-3 py-3 rounded-xl border-2 transition-all duration-150 font-medium text-sm active:scale-[0.95] ${
                lastClicked === 'connected'
                  ? 'border-green-400 bg-green-200 text-green-800 scale-[1.03] ring-2 ring-green-300 ring-offset-1'
                  : 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:border-green-300'
              }`}
            >
              <Phone size={20} />
              Connected
            </button>
            <button
              onClick={() => handleL1('voicemail')}
              className={`flex flex-col items-center gap-1 px-3 py-3 rounded-xl border-2 transition-all duration-150 font-medium text-sm active:scale-[0.95] ${
                lastClicked === 'voicemail'
                  ? 'border-orange-400 bg-orange-200 text-orange-800 scale-[1.03] ring-2 ring-orange-300 ring-offset-1'
                  : 'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 hover:border-orange-300'
              }`}
            >
              <Voicemail size={20} />
              Voicemail
            </button>
            <button
              onClick={() => handleL1('no_answer')}
              className={`flex flex-col items-center gap-1 px-3 py-3 rounded-xl border-2 transition-all duration-150 font-medium text-sm active:scale-[0.95] ${
                lastClicked === 'no_answer'
                  ? 'border-gray-400 bg-gray-200 text-gray-800 scale-[1.03] ring-2 ring-gray-300 ring-offset-1'
                  : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:border-gray-300'
              }`}
            >
              <PhoneMissed size={20} />
              No Answer
            </button>
            <button
              onClick={() => handleL1('bad_number')}
              className={`flex flex-col items-center gap-1 px-3 py-3 rounded-xl border-2 transition-all duration-150 font-medium text-sm active:scale-[0.95] ${
                lastClicked === 'bad_number'
                  ? 'border-red-400 bg-red-200 text-red-800 scale-[1.03] ring-2 ring-red-300 ring-offset-1'
                  : 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-300'
              }`}
            >
              <Ban size={20} />
              Bad Number
            </button>
          </div>
        )}

        {/* LAYER 2: Connected — How'd it go? */}
        {layer === 'L2' && l1Choice === 'connected' && (
          <div className="space-y-2">
            {/* Move Forward */}
            <button
              onClick={() => handleL2('WANTS_TO_MOVE_FORWARD')}
              disabled={submitting}
              className={`w-full px-3 py-2.5 rounded-xl border-2 transition-all duration-150 font-semibold text-sm text-left disabled:opacity-50 active:scale-[0.97] ${
                lastClicked === 'WANTS_TO_MOVE_FORWARD'
                  ? 'border-green-400 bg-green-200 text-green-900 scale-[1.02] ring-2 ring-green-300 ring-offset-1 shadow-md'
                  : queuedDisposition?.result === 'WANTS_TO_MOVE_FORWARD'
                    ? 'border-green-400 bg-green-100 text-green-800 ring-1 ring-green-300'
                    : 'border-green-300 bg-green-50 text-green-800 hover:bg-green-100'
              }`}
            >
              Wants to Move Forward
              <span className="block text-xs font-normal text-green-600 mt-0.5">Ready to buy — triggers payment link flow</span>
            </button>

            {/* Callback */}
            <div>
              <button
                onClick={() => { flashButton('CALLBACK'); if (callbackDate) { setCallbackDate(''); setAllDay(false) } else { setCallbackDate(new Date().toISOString().split('T')[0]) } }}
                className={`w-full px-3 py-2.5 rounded-xl border-2 transition-all duration-150 font-semibold text-sm text-left active:scale-[0.97] ${
                  lastClicked === 'CALLBACK'
                    ? 'border-teal-400 bg-teal-200 text-teal-900 scale-[1.02] ring-2 ring-teal-300 ring-offset-1 shadow-md'
                    : queuedDisposition?.result === 'CALLBACK'
                      ? 'border-teal-400 bg-teal-100 text-teal-800 ring-1 ring-teal-300'
                      : 'border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100'
                }`}
              >
                Interested — Callback
                <span className="block text-xs font-normal text-teal-600 mt-0.5">Schedule a follow-up call</span>
              </button>
              {callbackDate && (
                <div className="mt-2 ml-4 space-y-2">
                  <div className="flex gap-2 items-center">
                    <input
                      type="date"
                      value={callbackDate}
                      onChange={(e) => setCallbackDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 flex-1"
                    />
                    {!allDay && (
                      <input
                        type="time"
                        value={callbackTime}
                        onChange={(e) => setCallbackTime(e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 w-24"
                      />
                    )}
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allDay}
                      onChange={(e) => setAllDay(e.target.checked)}
                      className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-xs text-teal-700 font-medium">All Day</span>
                  </label>
                  <button
                    onClick={handleCallbackSubmit}
                    disabled={submitting}
                    className="w-full py-2 bg-teal-600 text-white text-xs font-semibold rounded-lg hover:bg-teal-700 disabled:opacity-50 active:scale-[0.97] transition-all duration-150"
                  >
                    Schedule & Log
                  </button>
                </div>
              )}
            </div>

            {/* Wants Changes */}
            <button
              onClick={() => handleL2('WANTS_CHANGES')}
              disabled={submitting}
              className={`w-full px-3 py-2.5 rounded-xl border-2 transition-all duration-150 font-semibold text-sm text-left disabled:opacity-50 active:scale-[0.97] ${
                lastClicked === 'WANTS_CHANGES'
                  ? 'border-blue-400 bg-blue-200 text-blue-900 scale-[1.02] ring-2 ring-blue-300 ring-offset-1 shadow-md'
                  : queuedDisposition?.result === 'WANTS_CHANGES'
                    ? 'border-blue-400 bg-blue-100 text-blue-800 ring-1 ring-blue-300'
                    : 'border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100'
              }`}
            >
              Wants Changes
              <span className="block text-xs font-normal text-blue-600 mt-0.5">Likes it but wants edits to preview</span>
            </button>

            {/* Will Look Later */}
            <button
              onClick={() => handleL2('WILL_LOOK_LATER')}
              disabled={submitting}
              className={`w-full px-3 py-2.5 rounded-xl border-2 transition-all duration-150 font-semibold text-sm text-left disabled:opacity-50 active:scale-[0.97] ${
                lastClicked === 'WILL_LOOK_LATER'
                  ? 'border-amber-400 bg-amber-200 text-amber-900 scale-[1.02] ring-2 ring-amber-300 ring-offset-1 shadow-md'
                  : queuedDisposition?.result === 'WILL_LOOK_LATER'
                    ? 'border-amber-400 bg-amber-100 text-amber-800 ring-1 ring-amber-300'
                    : 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              Will Look Later
              <span className="block text-xs font-normal text-amber-600 mt-0.5">Soft interest — will review preview on their own</span>
            </button>

            {/* Not Interested */}
            <div>
              <button
                onClick={() => handleL2('NOT_INTERESTED')}
                disabled={submitting}
                className={`w-full px-3 py-2.5 rounded-xl border-2 transition-all duration-150 font-medium text-sm text-left disabled:opacity-50 active:scale-[0.97] ${
                  lastClicked === 'NOT_INTERESTED'
                    ? 'border-gray-400 bg-gray-200 text-gray-900 scale-[1.02] ring-2 ring-gray-300 ring-offset-1 shadow-md'
                    : queuedDisposition?.result === 'NOT_INTERESTED' || queuedDisposition?.result === 'DNC'
                      ? 'border-gray-400 bg-gray-100 text-gray-700 ring-1 ring-gray-300'
                      : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                Not Interested
              </button>
              <label className="flex items-center gap-2 mt-2 ml-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dncChecked}
                  onChange={(e) => setDncChecked(e.target.checked)}
                  className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span className="text-xs text-red-600 font-medium">Mark as Do Not Contact</span>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
