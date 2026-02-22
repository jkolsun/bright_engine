'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
// Note: @twilio/voice-sdk needs to be dynamically imported in browser only

export function useTwilioDevice() {
  const [device, setDevice] = useState<any>(null)
  const [activeCall, setActiveCall] = useState<any>(null)
  const [deviceState, setDeviceState] = useState<'unregistered' | 'registering' | 'registered' | 'error'>('unregistered')
  const [isMuted, setIsMuted] = useState(false)
  const deviceRef = useRef<any>(null)

  const initialize = useCallback(async () => {
    try {
      setDeviceState('registering')
      // Fetch token
      const tokenRes = await fetch('/api/dialer/token', { method: 'POST' })
      const { token } = await tokenRes.json()

      // Dynamic import (client-side only)
      const { Device } = await import('@twilio/voice-sdk')

      const newDevice = new Device(token, {
        codecPreferences: ['opus', 'pcmu'] as any,
        closeProtection: true,
      })

      newDevice.on('registered', () => setDeviceState('registered'))
      newDevice.on('error', (err: any) => {
        console.error('[TwilioDevice] Error:', err)
        setDeviceState('error')
      })
      newDevice.on('incoming', (call: any) => {
        // Handled by SSE inbound events
        setActiveCall(call)
      })

      await newDevice.register()
      deviceRef.current = newDevice
      setDevice(newDevice)
    } catch (err) {
      console.error('[TwilioDevice] Init failed:', err)
      setDeviceState('error')
    }
  }, [])

  const makeCall = useCallback(async (params: { To: string; leadId?: string; callId?: string }) => {
    if (!deviceRef.current) throw new Error('Device not initialized')
    const call = await deviceRef.current.connect({ params })
    call.on('disconnect', () => setActiveCall(null))
    call.on('cancel', () => setActiveCall(null))
    setActiveCall(call)
    return call
  }, [])

  const hangup = useCallback(() => {
    if (activeCall) {
      activeCall.disconnect()
      setActiveCall(null)
    }
  }, [activeCall])

  const toggleMute = useCallback(() => {
    if (activeCall) {
      const newMuted = !isMuted
      activeCall.mute(newMuted)
      setIsMuted(newMuted)
    }
  }, [activeCall, isMuted])

  const destroy = useCallback(() => {
    if (deviceRef.current) {
      deviceRef.current.destroy()
      deviceRef.current = null
      setDevice(null)
      setDeviceState('unregistered')
    }
  }, [])

  useEffect(() => {
    return () => { destroy() }
  }, [destroy])

  return {
    device, activeCall, deviceState, isMuted,
    initialize, makeCall, hangup, toggleMute, destroy,
  }
}
