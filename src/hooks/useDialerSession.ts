'use client'
import { useState, useCallback } from 'react'
import type { DialerSession } from '@/types/dialer'

export function useDialerSession() {
  const [session, setSession] = useState<DialerSession | null>(null)
  const [sessionRecap, setSessionRecap] = useState<DialerSession | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchCurrent = useCallback(async () => {
    try {
      const res = await fetch('/api/dialer/session/current')
      const data = await res.json()
      setSession(data.session || null)
    } catch { setSession(null) }
  }, [])

  const startSession = useCallback(async (autoDialEnabled = false) => {
    setLoading(true)
    try {
      const res = await fetch('/api/dialer/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoDialEnabled }),
      })
      const data = await res.json()
      setSession(data)
      return data
    } finally { setLoading(false) }
  }, [])

  const endSession = useCallback(async () => {
    if (!session) return
    setLoading(true)
    try {
      const res = await fetch('/api/dialer/session/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id }),
      })
      const data = await res.json()
      // Store the response for the recap screen instead of discarding
      setSessionRecap(data)
      setSession(null)
    } finally { setLoading(false) }
  }, [session])

  const clearRecap = useCallback(() => {
    setSessionRecap(null)
    setSession(null)
  }, [])

  const toggleAutoDial = useCallback(async (enabled: boolean) => {
    if (!session) return
    const res = await fetch('/api/dialer/session/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: session.id, autoDialEnabled: enabled }),
    })
    const data = await res.json()
    setSession(prev => prev ? { ...prev, autoDialEnabled: enabled } : null)
  }, [session])

  return { session, setSession, sessionRecap, clearRecap, loading, fetchCurrent, startSession, endSession, toggleAutoDial }
}
