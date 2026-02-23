'use client'
import { createContext, useContext, useEffect, useCallback, useState, type ReactNode } from 'react'
import { useCallTimer } from '@/hooks/useCallTimer'
import { useDialerSession } from '@/hooks/useDialerSession'
import { useTwilioDevice } from '@/hooks/useTwilioDevice'
import { useDialerSSE } from '@/hooks/useDialerSSE'
import { useDialerQueue } from '@/hooks/useDialerQueue'
import type { DialerCall } from '@/types/dialer'

interface DialerContextValue {
  // Session
  session: ReturnType<typeof useDialerSession>
  // Device
  twilioDevice: ReturnType<typeof useTwilioDevice>
  // SSE
  sse: ReturnType<typeof useDialerSSE>
  // Queue
  queue: ReturnType<typeof useDialerQueue>
  // Timer
  timer: ReturnType<typeof useCallTimer>
  // Active call state
  currentCall: DialerCall | null
  setCurrentCall: (call: DialerCall | null) => void
  // Actions
  dial: (leadId: string, phone?: string) => Promise<void>
  hangup: () => Promise<void>
}

const DialerContext = createContext<DialerContextValue | null>(null)
export const useDialer = () => {
  const ctx = useContext(DialerContext)
  if (!ctx) throw new Error('useDialer must be used within DialerProvider')
  return ctx
}

export function DialerProvider({ children }: { children: ReactNode }) {
  const sessionHook = useDialerSession()
  const twilioDevice = useTwilioDevice()
  const sse = useDialerSSE(!!sessionHook.session)
  const queue = useDialerQueue()
  const timer = useCallTimer()
  const [currentCall, setCurrentCall] = useState<DialerCall | null>(null)

  // Initialize on mount
  useEffect(() => {
    sessionHook.fetchCurrent()
  }, [])

  // Initialize Twilio device when session starts
  useEffect(() => {
    if (sessionHook.session && twilioDevice.deviceState === 'unregistered') {
      twilioDevice.initialize()
    }
  }, [sessionHook.session])

  // Load queue when session starts
  useEffect(() => {
    if (sessionHook.session) {
      queue.refresh()
    }
  }, [sessionHook.session?.id])

  // SSE listeners for call status updates
  useEffect(() => {
    if (!sse.connected) return
    const unsub = sse.on('CALL_STATUS', (data: any) => {
      if (currentCall && data.callId === currentCall.id) {
        setCurrentCall(prev => prev ? { ...prev, status: data.status, amdResult: data.amdResult } : null)
        if (data.status === 'CONNECTED' && !timer.isRunning) timer.start()
        if (['COMPLETED', 'FAILED', 'NO_ANSWER', 'BUSY'].includes(data.status)) timer.stop()
      }
    })
    return unsub
  }, [sse.connected, currentCall?.id])

  const dial = useCallback(async (leadId: string, phone?: string) => {
    if (!sessionHook.session) return
    // Call API to initiate
    const res = await fetch('/api/dialer/call/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId, sessionId: sessionHook.session.id, phone }),
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error)

    setCurrentCall({ id: data.callId, leadId, repId: '', status: 'INITIATED', direction: 'OUTBOUND', startedAt: new Date().toISOString(), wasRecommended: false, previewSentDuringCall: false, previewOpenedDuringCall: false, ctaClickedDuringCall: false, vmDropped: false } as any)

    // Connect via Twilio SDK
    await twilioDevice.makeCall({ To: data.phoneToCall, leadId, callId: data.callId })
    timer.reset()
  }, [sessionHook.session, twilioDevice])

  const hangup = useCallback(async () => {
    twilioDevice.hangup()
    timer.stop()
    if (currentCall) {
      await fetch('/api/dialer/call/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId: currentCall.id }),
      }).catch(err => console.warn('[DialerProvider] Call end API failed:', err))
    }
  }, [currentCall, twilioDevice])

  return (
    <DialerContext.Provider value={{ session: sessionHook, twilioDevice, sse, queue, timer, currentCall, setCurrentCall, dial, hangup }}>
      {children}
    </DialerContext.Provider>
  )
}
