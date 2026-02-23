'use client'
import { useState, useEffect, useRef } from 'react'
import { useDialer } from './DialerProvider'

export function CallNotes() {
  const { currentCall, queue } = useDialer()
  const [notes, setNotes] = useState('')
  const [previousNotes, setPreviousNotes] = useState<Array<{ text: string; date: string; actor?: string }>>([])
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const leadId = queue.selectedLead?.id

  // Load previous notes when lead changes
  useEffect(() => {
    if (!leadId) { setPreviousNotes([]); return }
    fetch(`/api/dialer/call/notes?leadId=${leadId}`)
      .then(r => r.ok ? r.json() : { notes: [] })
      .then(data => setPreviousNotes(data.notes || []))
      .catch(() => setPreviousNotes([]))
  }, [leadId])

  // Reset current notes when lead changes
  useEffect(() => { setNotes('') }, [leadId])

  // Auto-save with 2s debounce
  useEffect(() => {
    if (!notes.trim()) return
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(async () => {
      if (currentCall?.id) {
        // Save to call record (existing endpoint, uses updateCallNotes in dialer-service.ts)
        await fetch('/api/dialer/call/note', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callId: currentCall.id, notes }),
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
  }, [notes, currentCall?.id, leadId])

  if (!leadId) return null

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Call Notes</h3>
        {currentCall && (
          <span className="text-[10px] text-green-600 font-medium">Auto-saving to call</span>
        )}
      </div>

      {/* Previous notes */}
      {previousNotes.length > 0 && (
        <div className="px-4 py-2 bg-gray-50/50 border-b border-gray-100 max-h-24 overflow-y-auto">
          {previousNotes.slice(0, 5).map((note, i) => (
            <div key={i} className="text-xs text-gray-500 py-1 border-b border-gray-50 last:border-0">
              <span className="text-gray-400">{note.date}</span>
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
        placeholder="Type notes..."
        className="w-full h-20 text-sm p-3 resize-none focus:outline-none focus:ring-0 border-0"
      />
    </div>
  )
}
