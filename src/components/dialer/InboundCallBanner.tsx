'use client'
import { useState, useEffect } from 'react'
import { useDialer } from './DialerProvider'
import { Phone, PhoneOff } from 'lucide-react'
import type { DialerCall } from '@/types/dialer'

export function InboundCallBanner() {
  const { sse, twilioDevice, currentCall, setCurrentCall, timer } = useDialer()
  const [inboundCall, setInboundCall] = useState<any>(null)

  useEffect(() => {
    if (!sse.connected) return
    return sse.on('INBOUND_CALL', (data: any) => {
      setInboundCall(data)
    })
  }, [sse.connected])

  // Auto-dismiss after 30s
  useEffect(() => {
    if (!inboundCall) return
    const t = setTimeout(() => setInboundCall(null), 30000)
    return () => clearTimeout(t)
  }, [inboundCall])

  if (!inboundCall) return null

  const isOnActiveCall = !!currentCall && ['INITIATED', 'RINGING', 'CONNECTED'].includes(currentCall.status)

  const accept = () => {
    // Build the inbound DialerCall object
    const inboundDialerCall: DialerCall = {
      id: inboundCall.callId || '',
      leadId: inboundCall.leadId || '',
      repId: '',
      status: 'CONNECTED',
      direction: 'INBOUND',
      startedAt: new Date().toISOString(),
      wasRecommended: false,
      previewSentDuringCall: false,
      previewOpenedDuringCall: false,
      ctaClickedDuringCall: false,
      vmDropped: false,
    } as DialerCall

    const call = twilioDevice.activeCall
    if (call) {
      call.accept()

      // Wire disconnect listener so currentCall status updates when call ends
      call.on('disconnect', () => {
        setCurrentCall({ ...inboundDialerCall, status: 'COMPLETED' } as DialerCall)
        timer.stop()
      })
      call.on('cancel', () => {
        setCurrentCall({ ...inboundDialerCall, status: 'COMPLETED' } as DialerCall)
        timer.stop()
      })
    }

    // Set currentCall so DispositionTree renders and rep can disposition the inbound call
    if (inboundCall.callId) {
      setCurrentCall(inboundDialerCall)
      timer.reset()
      timer.start()
    }

    fetch('/api/dialer/inbound/accept', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ callId: inboundCall.callId }) }).catch(err => console.warn('[InboundCall] Accept API failed:', err))
    setInboundCall(null)
  }

  const decline = () => {
    if (twilioDevice.activeCall) {
      twilioDevice.activeCall.reject()
    }
    fetch('/api/dialer/inbound/decline', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ callId: inboundCall.callId, callSid: inboundCall.callSid }) }).catch(err => console.warn('[InboundCall] Decline API failed:', err))
    setInboundCall(null)
  }

  return (
    <div className="bg-blue-50 border-b border-blue-200 px-6 py-3 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
            <Phone className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">Incoming Call</div>
            <div className="text-xs text-gray-600">
              {inboundCall.companyName || inboundCall.contactName || inboundCall.from || 'Unknown'}
              {inboundCall.isDNC && <span className="ml-2 text-red-600 font-medium">DNC</span>}
            </div>
            {isOnActiveCall && (
              <div className="text-xs text-amber-600 font-medium mt-0.5">
                Finish your current call to accept this one.
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={accept}
            disabled={isOnActiveCall}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-medium text-sm ${
              isOnActiveCall
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
          >
            <Phone className="w-4 h-4" /> Accept
          </button>
          <button onClick={decline} className="flex items-center gap-1.5 px-4 py-2 bg-red-500 text-white rounded-lg font-medium text-sm hover:bg-red-600">
            <PhoneOff className="w-4 h-4" /> Decline
          </button>
        </div>
      </div>
    </div>
  )
}
