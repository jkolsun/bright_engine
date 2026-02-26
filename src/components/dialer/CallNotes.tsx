'use client'
import { useState, useEffect, useRef } from 'react'
import { useDialer } from './DialerProvider'

export function CallNotes() {
  const { currentCall, queue, recentCallId, isViewingRecentLead } = useDialer()
  const [notes, setNotes] = useState('')
  const [previousNotes, setPreviousNotes] = useState<Array<{ text: string; date: string; actor?: string }>>([])
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const leadId = queue.selectedLead?.id
  const effectiveCallId = isViewingRecentLead ? recentCallId : currentCall?.id

  // Load previous notes when lead changes
  useEffect(() => {
    if (!leadId) { setPreviousNotes([]); return }
    fetch(`/api/dialer/call/notes?leadId=${leadId}`)
      .then(r => r.ok ? r.json() : { notes: [] })
      .then(data => setPreviousNotes(data.notes || []))
      .catch(() => setPreviousNotes([]))
  }, [leadId])

  // Reset/load current notes when lead changes
  useEffect(() => {
    if (isViewingRecentLead && recentCallId) {
      fetch(`/api/dialer/call/notes?callId=${recentCallId}`)
        .then(r => r.ok ? r.json() : { callNotes: '' })
        .then(data => setNotes(data.callNotes || ''))
        .catch(() => setNotes(''))
    } else {
      setNotes('')
    }
  }, [leadId, isViewingRecentLead, recentCallId])

  // Auto-save with 2s debounce
  useEffect(() => {
    if (!notes.trim()) return
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(async () => {
      if (effectiveCallId) {
        // Save to call record (works for both active call and recent call)
        await fetch('/api/dialer/call/note', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callId: effectiveCallId, notes }),
        }).catch(err => console.warn('[CallNotes] Save to call failed:', err))
      } else if (leadId) {
        // Save to lead as a LeadEvent (pre-call or post-disposition note)
        await fetch('/api/dialer/call/note', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leadId, notes }),
        }).catch(err => console.warn('[CallNotes] Save to lead failed:', err))
      }
    }, 2000)
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }
  }, [notes, effectiveCallId, leadId])

  if (!leadId) return null

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Call Notes</h3>
        {(currentCall || effectiveCallId) && (
          <span className="text-[10px] text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-full">Auto-saving</span>
        )}
      </div>

      {/* Previous notes */}
      {previousNotes.length > 0 && (
        <div className="px-4 py-2.5 bg-gray-50/30 border-b border-gray-100 max-h-28 overflow-y-auto">
          {previousNotes.slice(0, 5).map((note, i) => (
            <div key={i} className="text-xs text-gray-500 py-1.5 border-b border-gray-100/60 last:border-0">
              <span className="text-gray-400 font-medium">{note.date}</span>
              {note.actor && <span className="text-gray-400"> · {note.actor}</span>}
              {' — '}
              {note.text}
            </div>
          ))}
        </div>
      )}

      {/* Current notes textarea */}
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Type notes for this call..."
        className="w-full h-24 text-sm p-4 resize-none focus:outline-none focus:ring-0 border-0 placeholder:text-gray-300"
      />
    </div>
  )
}
