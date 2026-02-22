'use client'
import { useState, useEffect, useRef } from 'react'
import { useDialer } from './DialerProvider'

export function CallNotes() {
  const { currentCall } = useDialer()
  const [notes, setNotes] = useState('')
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-save with 2s debounce
  useEffect(() => {
    if (!currentCall?.id || !notes) return
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(async () => {
      await fetch('/api/dialer/call/note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId: currentCall.id, notes }),
      }).catch(() => {})
    }, 2000)
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }
  }, [notes, currentCall?.id])

  // Reset when call changes
  useEffect(() => { setNotes('') }, [currentCall?.id])

  if (!currentCall) return null

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-2">Call Notes</h3>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Type notes during the call..."
        className="w-full h-20 text-sm border border-gray-200 rounded-lg p-2 resize-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
      />
    </div>
  )
}
