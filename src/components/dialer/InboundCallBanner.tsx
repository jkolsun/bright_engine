'use client'
import { useState, useEffect } from 'react'
import { useDialer } from './DialerProvider'
import { Phone, PhoneOff, PhoneIncoming } from 'lucide-react'
import type { DialerCall } from '@/types/dialer'

export function InboundCallBanner() {
  const { sse, twilioDevice, currentCall, setCurrentCall, timer, queue } = useDialer()
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

  // Only block accept when rep is actively CONNECTED (talking to someone)
  const isConnected = !!currentCall && currentCall.status === 'CONNECTED'
  // Outbound is ringing but not yet answered — can accept inbound and cancel outbound
  const isRinging = !!currentCall && ['INITIATED', 'RINGING'].includes(currentCall.status)

  const accept = () => {
    // If outbound is only ringing (not connected), cancel it to free the line
    if (isRinging && currentCall) {
      // Kill browser's SDK connection to the outbound
      if (twilioDevice.device) {
        try { twilioDevice.device.disconnectAll() } catch {}
      }
      // End the outbound on the server + auto-disposition as NO_ANSWER
      fetch('/api/dialer/call/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId: currentCall.id }),
      }).catch(() => {})
      fetch('/api/dialer/call/auto-disposition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId: currentCall.id, result: 'NO_ANSWER' }),
      }).catch(() => {})
      setCurrentCall(null)
      timer.stop()
    }

    // Build the inbound DialerCall object
    const inboundDialerCall: DialerCall = {
      id: inboundCall.callId || `inbound-${Date.now()}`,
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

    // Accept via Twilio SDK
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

      // Always set currentCall so DispositionTree renders and rep sees on-call UI
      setCurrentCall(inboundDialerCall)
      timer.reset()
      timer.start()
    }

    // Inject inbound caller into queue so LeadCard can find them
    if (inboundCall.leadId) {
      fetch(`/api/dialer/lead/${inboundCall.leadId}`)
        .then(r => r.json())
        .then(data => {
          if (data.lead) {
            queue.injectLead(data.lead)
            queue.setSelectedLeadId(inboundCall.leadId)
            queue.setActiveTab('fresh')
          }
        })
        .catch(() => {
          // Even if fetch fails, set selection so at least we try to show something
          queue.setSelectedLeadId(inboundCall.leadId)
        })
    }

    fetch('/api/dialer/inbound/accept', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ callId: inboundCall.callId, callSid: inboundCall.callSid }) }).catch(err => console.warn('[InboundCall] Accept API failed:', err))
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
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-300 px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center animate-pulse">
            <PhoneIncoming className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">Incoming Call</div>
            <div className="text-xs text-gray-600">
              {inboundCall.companyName || inboundCall.contactName || inboundCall.from || 'Unknown'}
              {inboundCall.isDNC && <span className="ml-2 text-red-600 font-medium">DNC</span>}
            </div>
            {isConnected && (
              <div className="text-xs text-amber-600 font-medium mt-0.5">
                Finish your current call to accept this one.
              </div>
            )}
            {isRinging && (
              <div className="text-xs text-blue-600 font-medium mt-0.5">
                Accepting will cancel your outgoing call.
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={accept}
            disabled={isConnected}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              isConnected
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-green-500 text-white hover:bg-green-600 shadow-sm'
            }`}
          >
            <Phone className="w-4 h-4" /> Accept
          </button>
          <button
            onClick={decline}
            className="flex items-center gap-1.5 px-4 py-2 bg-red-500 text-white rounded-lg font-medium text-sm hover:bg-red-600 shadow-sm transition-colors"
          >
            <PhoneOff className="w-4 h-4" /> Decline
          </button>
        </div>
      </div>
    </div>
  )
}
