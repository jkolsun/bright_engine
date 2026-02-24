'use client'
import { createContext, useContext, useEffect, useCallback, useState, useRef, type ReactNode } from 'react'
import { useCallTimer } from '@/hooks/useCallTimer'
import { useDialerSession } from '@/hooks/useDialerSession'
import { useTwilioDevice } from '@/hooks/useTwilioDevice'
import { useDialerSSE } from '@/hooks/useDialerSSE'
import { useDialerQueue } from '@/hooks/useDialerQueue'
import type { DialerCall } from '@/types/dialer'

// Auto-dial state machine
export type AutoDialState = 'IDLE' | 'WAITING_FOR_DISPOSITION' | 'DIALING_NEXT' | 'CHAINING' | 'CONNECTED_PENDING_SWAP'

export interface AutoDialBanner {
  type: 'dialing' | 'connected' | 'chaining'
  leadName: string
  leadId: string
  nextLeadName?: string
}

interface PendingCall {
  callId: string
  leadId: string
  leadName: string
  status: string
}

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
  // Auto-dial
  autoDialState: AutoDialState
  autoDialBanner: AutoDialBanner | null
  bannerUrgent: boolean
  handleAutoDialNext: () => Promise<void>
  handleSwapToNewCall: () => void
  endSessionFull: () => Promise<void>
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

  // Auto-dial state
  const [autoDialState, setAutoDialState] = useState<AutoDialState>('IDLE')
  const [pendingCall, setPendingCall] = useState<PendingCall | null>(null)
  const [autoDialBanner, setAutoDialBanner] = useState<AutoDialBanner | null>(null)
  const [bannerUrgent, setBannerUrgent] = useState(false)
  const graceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastCalledLeadIdRef = useRef<string | null>(null)
  // Track ALL leads called/dispositioned in this session to prevent re-dialing
  const calledLeadIdsRef = useRef<Set<string>>(new Set())
  // Guard against duplicate autoDispositionAndChain calls for the same callId
  const processedCallIdsRef = useRef<Set<string>>(new Set())
  const dialRef = useRef<((leadId: string, phone?: string) => Promise<void>) | null>(null)
  const wasConnectedRef = useRef(false)
  const autoDispositionAndChainRef = useRef<((callId: string, leadId: string, result: string) => Promise<void>) | null>(null)

  // Refs for accessing latest state in callbacks
  const currentCallRef = useRef<DialerCall | null>(null)
  useEffect(() => { currentCallRef.current = currentCall }, [currentCall])

  const pendingCallRef = useRef<PendingCall | null>(null)
  useEffect(() => { pendingCallRef.current = pendingCall }, [pendingCall])

  const autoDialStateRef = useRef<AutoDialState>('IDLE')
  useEffect(() => { autoDialStateRef.current = autoDialState }, [autoDialState])

  const sessionRef = useRef(sessionHook.session)
  useEffect(() => { sessionRef.current = sessionHook.session }, [sessionHook.session])

  const queueRef = useRef(queue)
  useEffect(() => { queueRef.current = queue }, [queue])

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

  // Load queue when session starts — reset tracking sets for fresh session
  useEffect(() => {
    if (sessionHook.session) {
      calledLeadIdsRef.current = new Set()
      processedCallIdsRef.current = new Set()
      queue.refresh()
    }
  }, [sessionHook.session?.id])

  // SSE listeners for call status updates — subscribe ONCE, use ref for current state
  useEffect(() => {
    const unsub = sse.on('CALL_STATUS', (data: any) => {
      const call = currentCallRef.current
      const pending = pendingCallRef.current

      // Update currentCall if it matches
      if (call && data.callId === call.id) {
        // Preserve existing values when AMD callback omits status (human detection sends status: undefined)
        const updatedStatus = data.status ?? call.status
        const updatedAmdResult = data.amdResult ?? call.amdResult
        setCurrentCall(prev => prev ? { ...prev, status: updatedStatus, amdResult: updatedAmdResult } : null)
        currentCallRef.current = { ...call, status: updatedStatus, amdResult: updatedAmdResult }

        if (updatedStatus === 'CONNECTED' && call.status !== 'CONNECTED') {
          wasConnectedRef.current = true
          timer.start()
        }

        // AMD detected voicemail — auto-skip if auto-dial is enabled
        // This is the CORE power dialer feature: VM detected → end call → disposition → dial next
        if (data.isMachine && sessionRef.current?.autoDialEnabled) {
          console.log('[AutoDial] AMD voicemail detected — auto-skipping call', call.id, 'vmAutoDropped:', data.vmAutoDropped)
          // Only end call if server didn't already auto-drop VM (dropVoicemail hangs up the parent)
          if (!data.vmAutoDropped) {
            fetch('/api/dialer/call/end', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ callId: call.id }),
            }).catch(() => {})
          }
          calledLeadIdsRef.current.add(call.leadId)
          setCurrentCall(null)
          currentCallRef.current = null
          wasConnectedRef.current = false
          timer.stop()
          autoDispositionAndChainRef.current?.(call.id, call.leadId, 'VOICEMAIL')
          return
        }

        if (['COMPLETED', 'FAILED', 'NO_ANSWER', 'BUSY'].includes(updatedStatus)) {
          timer.stop()

          // Auto-skip for non-overlap: if auto-dial is ON and rep never connected, auto-disposition and chain
          if (
            sessionRef.current?.autoDialEnabled &&
            !wasConnectedRef.current
          ) {
            console.log('[AutoDial] Non-overlap auto-skip:', updatedStatus, 'for call', call.id)
            calledLeadIdsRef.current.add(call.leadId)
            setCurrentCall(null)
            currentCallRef.current = null
            wasConnectedRef.current = false
            autoDispositionAndChainRef.current?.(call.id, call.leadId, 'NO_ANSWER')
          }
        }
      }

      // Update pendingCall if it matches (auto-dial overlap)
      if (pending && data.callId === pending.callId) {
        const newStatus = (data.status ?? pending.status) as string
        setPendingCall(prev => prev ? { ...prev, status: newStatus } : null)

        // AMD detected voicemail on pending (background) call — auto-skip to next
        if (data.isMachine) {
          console.log('[AutoDial] AMD voicemail on pending call — auto-skipping', pending.callId, 'vmAutoDropped:', data.vmAutoDropped)
          if (!data.vmAutoDropped) {
            fetch('/api/dialer/call/end', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ callId: pending.callId }),
            }).catch(() => {})
          }
          calledLeadIdsRef.current.add(pending.leadId)
          setPendingCall(null)
          pendingCallRef.current = null
          autoDispositionAndChainRef.current?.(pending.callId, pending.leadId, 'VOICEMAIL')
          return
        }

        if (newStatus === 'CONNECTED') {
          // Someone picked up the background call
          setAutoDialState('CONNECTED_PENDING_SWAP')
          setAutoDialBanner({
            type: 'connected',
            leadName: pending.leadName,
            leadId: pending.leadId,
          })
          // Start grace timer — after 10s, escalate banner urgency (do NOT auto-swap)
          setBannerUrgent(false)
          if (graceTimerRef.current) clearTimeout(graceTimerRef.current)
          graceTimerRef.current = setTimeout(() => {
            if (autoDialStateRef.current === 'CONNECTED_PENDING_SWAP') {
              setBannerUrgent(true)
            }
          }, 10000)
        } else if (['NO_ANSWER', 'FAILED', 'BUSY', 'COMPLETED'].includes(newStatus)) {
          // Background call didn't connect — auto-disposition and chain to next (use ref to avoid stale closure)
          calledLeadIdsRef.current.add(pending.leadId)
          autoDispositionAndChainRef.current?.(pending.callId, pending.leadId, newStatus === 'BUSY' ? 'NO_ANSWER' : newStatus === 'COMPLETED' ? 'NO_ANSWER' : newStatus)
        }
      }
    })
    return unsub
  }, [])  // Empty deps — subscribe once on mount

  // Get next lead to dial from queue (Fresh first, then Retry)
  const getNextLeadToDial = useCallback(() => {
    const q = queueRef.current
    const currentId = currentCallRef.current?.leadId
    const pendingId = pendingCallRef.current?.leadId
    const called = calledLeadIdsRef.current

    // Search Fresh leads first
    for (const lead of q.freshLeads) {
      if (lead.id !== currentId && lead.id !== pendingId && !called.has(lead.id)) {
        return lead
      }
    }
    // Then Retry leads
    for (const lead of q.retryLeads) {
      if (lead.id !== currentId && lead.id !== pendingId && !called.has(lead.id)) {
        return lead
      }
    }
    return null
  }, [])

  // Auto-disposition a skipped call and chain to next
  const autoDispositionAndChain = useCallback(async (callId: string, leadId: string, result: string) => {
    // Guard: prevent duplicate firings for the same callId (SSE can fire multiple events)
    if (callId && processedCallIdsRef.current.has(callId)) {
      return
    }
    if (callId) processedCallIdsRef.current.add(callId)

    // Track this lead as called BEFORE getNextLeadToDial so it's excluded
    calledLeadIdsRef.current.add(leadId)

    // Fire auto-disposition API (non-blocking for UX)
    fetch('/api/dialer/call/auto-disposition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callId, result: result === 'FAILED' ? 'NO_ANSWER' : result }),
    }).catch(err => console.warn('[AutoDial] Auto-disposition failed:', err))

    // Move lead in queue
    queueRef.current.moveLeadAfterDisposition(leadId, result === 'FAILED' ? 'NO_ANSWER' : result)

    // Chain — dial next
    setAutoDialState('CHAINING')
    const nextLead = getNextLeadToDial()
    if (nextLead) {
      setAutoDialBanner({
        type: 'chaining',
        leadName: nextLead.companyName || 'Unknown',
        leadId: nextLead.id,
      })
      // Small delay for visual feedback before dialing next
      setTimeout(() => {
        handleAutoDialNextInternal(nextLead)
      }, 500)
    } else {
      // Queue empty
      setAutoDialState('IDLE')
      setPendingCall(null)
      setAutoDialBanner(null)
      setBannerUrgent(false)
    }
  }, [getNextLeadToDial])

  // Internal: dial the next lead in auto-dial mode
  const handleAutoDialNextInternal = useCallback(async (lead?: { id: string; companyName: string; phone: string }) => {
    const targetLead = lead || getNextLeadToDial()
    if (!targetLead || !sessionRef.current) {
      setAutoDialState('IDLE')
      setPendingCall(null)
      setAutoDialBanner(null)
      setBannerUrgent(false)
      return
    }

    setAutoDialState('DIALING_NEXT')
    setAutoDialBanner({
      type: 'dialing',
      leadName: targetLead.companyName || 'Unknown',
      leadId: targetLead.id,
    })

    // Select lead immediately so LeadCard swaps before the API roundtrip
    queueRef.current.setSelectedLeadId(targetLead.id)

    // NON-OVERLAP: No active LIVE call → use dial() which sets currentCall properly
    // This gives the rep the full active call UI (hangup, notes, disposition)
    // Check if the current call is actually live (not a stale completed call from manual disposition)
    const currentCallIsLive = currentCallRef.current &&
      ['INITIATED', 'RINGING', 'CONNECTED'].includes(currentCallRef.current.status)
    if (!currentCallIsLive) {
      // Clear stale completed call reference so dial() starts fresh
      if (currentCallRef.current) {
        calledLeadIdsRef.current.add(currentCallRef.current.leadId)
        setCurrentCall(null)
        currentCallRef.current = null
      }
      if (!dialRef.current) {
        console.error('[AutoDial] dialRef.current is null — dial function not initialized')
        setAutoDialState('IDLE')
        setAutoDialBanner(null)
        setBannerUrgent(false)
        return
      }
      try {
        console.log('[AutoDial] NON-OVERLAP: calling dial() for', targetLead.companyName, targetLead.id)
        await dialRef.current(targetLead.id, targetLead.phone)
        // dial() succeeded — clear auto-dial banner, call is now the active currentCall
        setAutoDialState('IDLE')
        setAutoDialBanner(null)
        setBannerUrgent(false)
      } catch (err) {
        console.error('[AutoDial] Non-overlap dial failed:', err)
        setAutoDialState('IDLE')
        setAutoDialBanner(null)
        setBannerUrgent(false)
      }
      return
    }

    // OVERLAP: Active call exists → background dial into pendingCall
    try {
      const res = await fetch('/api/dialer/call/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: targetLead.id,
          sessionId: sessionRef.current.id,
          phone: targetLead.phone,
        }),
      })
      const data = await res.json()
      if (data.error) {
        console.warn('[AutoDial] Initiate failed:', data.error)
        autoDispositionAndChain(data.callId || '', targetLead.id, 'FAILED')
        return
      }

      const newPending: PendingCall = {
        callId: data.callId,
        leadId: targetLead.id,
        leadName: targetLead.companyName || 'Unknown',
        status: 'INITIATED',
      }
      setPendingCall(newPending)

      const call = await twilioDevice.makeCall({ To: data.phoneToCall, leadId: targetLead.id, callId: data.callId, callerId: data.callerId })

      if (call) {
        const updatePendingStatus = (status: string) => {
          setPendingCall(prev => {
            if (!prev || prev.callId !== data.callId) return prev
            return { callId: prev.callId, leadId: prev.leadId, leadName: prev.leadName, status }
          })
        }
        call.on('accept', () => updatePendingStatus('CONNECTED'))
        call.on('disconnect', () => updatePendingStatus('COMPLETED'))
        call.on('cancel', () => updatePendingStatus('FAILED'))
      }
    } catch (err) {
      console.error('[AutoDial] Failed to dial next:', err)
      setAutoDialState('IDLE')
      setPendingCall(null)
      setAutoDialBanner(null)
      setBannerUrgent(false)
    }
  }, [getNextLeadToDial, twilioDevice, autoDispositionAndChain])

  // Public: trigger auto-dial for the next lead (called from DispositionTree)
  const handleAutoDialNext = useCallback(async () => {
    if (!sessionRef.current?.autoDialEnabled) {
      setAutoDialState('IDLE')
      return
    }
    await handleAutoDialNextInternal()
  }, [handleAutoDialNextInternal])

  // Internal swap logic
  const handleSwapToNewCallInternal = useCallback(() => {
    const pending = pendingCallRef.current
    if (!pending) return

    if (graceTimerRef.current) {
      clearTimeout(graceTimerRef.current)
      graceTimerRef.current = null
    }

    // Track previous lead so getNextLeadToDial skips it
    const prevLeadId = currentCallRef.current?.leadId
    if (prevLeadId) {
      lastCalledLeadIdRef.current = prevLeadId
      calledLeadIdsRef.current.add(prevLeadId)
    }

    // Promote pending call to current call
    setCurrentCall({
      id: pending.callId,
      leadId: pending.leadId,
      repId: '',
      status: 'CONNECTED',
      direction: 'OUTBOUND',
      startedAt: new Date().toISOString(),
      wasRecommended: false,
      previewSentDuringCall: false,
      previewOpenedDuringCall: false,
      ctaClickedDuringCall: false,
      vmDropped: false,
    } as any)

    // Select the lead and start timer
    queueRef.current.setSelectedLeadId(pending.leadId)
    timer.reset()
    timer.start()

    // Clear auto-dial state
    setPendingCall(null)
    setAutoDialState('IDLE')
    setAutoDialBanner(null)
    setBannerUrgent(false)
  }, [timer])

  // Public: swap to the new connected call (called from banner click or DispositionTree)
  const handleSwapToNewCall = useCallback(() => {
    handleSwapToNewCallInternal()
  }, [handleSwapToNewCallInternal])

  const dial = useCallback(async (leadId: string, phone?: string) => {
    if (!sessionHook.session) return
    // Clear ref immediately so SSE listener doesn't match old call events during transition
    currentCallRef.current = null
    // Call API to initiate
    const res = await fetch('/api/dialer/call/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId, sessionId: sessionHook.session.id, phone }),
    })
    const data = await res.json()
    console.log('[DialerProvider] dial() initiate response:', data.error ? `ERROR: ${data.error}` : `OK callId=${data.callId}`)
    if (data.error) throw new Error(data.error)

    const newCall = { id: data.callId, leadId, repId: '', status: 'INITIATED', direction: 'OUTBOUND', startedAt: new Date().toISOString(), wasRecommended: false, previewSentDuringCall: false, previewOpenedDuringCall: false, ctaClickedDuringCall: false, vmDropped: false } as any
    setCurrentCall(newCall)
    currentCallRef.current = newCall  // Sync ref immediately for SSE listener
    wasConnectedRef.current = false   // Reset connected tracker for new call
    console.log('[DialerProvider] dial() setCurrentCall called, callId:', data.callId)

    // Increment totalCalls stat optimistically
    sessionHook.incrementStat('totalCalls')

    // Connect via Twilio SDK — makeCall returns the Call object (verified in useTwilioDevice.ts)
    const call = await twilioDevice.makeCall({ To: data.phoneToCall, leadId, callId: data.callId, callerId: data.callerId })
    timer.reset()

    // Fallback: start timer from local Twilio SDK events (instant, no server roundtrip)
    if (call) {
      call.on('accept', () => {
        setCurrentCall(prev => prev ? { ...prev, status: 'CONNECTED' } : null)
        if (currentCallRef.current) currentCallRef.current = { ...currentCallRef.current, status: 'CONNECTED' }
        wasConnectedRef.current = true
        timer.start()
      })
      call.on('disconnect', () => {
        setCurrentCall(prev => prev ? { ...prev, status: 'COMPLETED' } : null)
        if (currentCallRef.current) currentCallRef.current = { ...currentCallRef.current, status: 'COMPLETED' }
        timer.stop()
      })
      call.on('cancel', () => {
        setCurrentCall(prev => prev ? { ...prev, status: 'FAILED' } : null)
        if (currentCallRef.current) currentCallRef.current = { ...currentCallRef.current, status: 'FAILED' }
        timer.stop()
      })
    }
  }, [sessionHook.session, twilioDevice])

  // Keep refs in sync so SSE listener and handleAutoDialNextInternal avoid stale closures
  useEffect(() => { dialRef.current = dial }, [dial])
  useEffect(() => { autoDispositionAndChainRef.current = autoDispositionAndChain }, [autoDispositionAndChain])

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

  // Full session teardown: kill SDK calls, clear all state, then end backend session
  const endSessionFull = useCallback(async () => {
    // 0. Auto-disposition any active/pending calls so leads don't get orphaned
    //    (fire-and-forget — don't block session teardown)
    if (currentCallRef.current?.id) {
      fetch('/api/dialer/call/auto-disposition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId: currentCallRef.current.id, result: 'NO_ANSWER' }),
      }).catch(() => {})
    }
    if (pendingCallRef.current?.callId) {
      fetch('/api/dialer/call/auto-disposition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId: pendingCallRef.current.callId, result: 'NO_ANSWER' }),
      }).catch(() => {})
    }
    // 1. Kill any active Twilio SDK call
    twilioDevice.hangup()
    if (twilioDevice.device) {
      try { twilioDevice.device.disconnectAll() } catch {}
    }
    // 2. Stop timer
    timer.stop()
    // 3. Clear grace timer
    if (graceTimerRef.current) {
      clearTimeout(graceTimerRef.current)
      graceTimerRef.current = null
    }
    // 4. Reset auto-dial state
    setAutoDialState('IDLE')
    setAutoDialBanner(null)
    setBannerUrgent(false)
    // 5. Clear call state
    setCurrentCall(null)
    currentCallRef.current = null
    setPendingCall(null)
    pendingCallRef.current = null
    wasConnectedRef.current = false
    lastCalledLeadIdRef.current = null
    calledLeadIdsRef.current = new Set()
    processedCallIdsRef.current = new Set()
    // 6. End backend session (sets session to null → triggers recap screen)
    await sessionHook.endSession()
  }, [twilioDevice, timer, sessionHook])

  // Cleanup grace timer on unmount
  useEffect(() => {
    return () => {
      if (graceTimerRef.current) clearTimeout(graceTimerRef.current)
    }
  }, [])

  return (
    <DialerContext.Provider value={{
      session: sessionHook, twilioDevice, sse, queue, timer,
      currentCall, setCurrentCall, dial, hangup,
      autoDialState, autoDialBanner, bannerUrgent, handleAutoDialNext, handleSwapToNewCall, endSessionFull,
    }}>
      {children}
    </DialerContext.Provider>
  )
}
