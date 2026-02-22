'use client'
import { useState, useEffect } from 'react'
import { useDialer } from './DialerProvider'
import { Phone, PhoneOff } from 'lucide-react'

export function InboundCallBanner() {
  const { sse, twilioDevice } = useDialer()
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

  const accept = () => {
    // The Twilio SDK handles incoming call acceptance
    if (twilioDevice.activeCall) {
      twilioDevice.activeCall.accept()
    }
    fetch('/api/dialer/inbound/accept', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ callId: inboundCall.callId }) }).catch(() => {})
    setInboundCall(null)
  }

  const decline = () => {
    if (twilioDevice.activeCall) {
      twilioDevice.activeCall.reject()
    }
    fetch('/api/dialer/inbound/decline', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ callId: inboundCall.callId, callSid: inboundCall.callSid }) }).catch(() => {})
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
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={accept} className="flex items-center gap-1.5 px-4 py-2 bg-green-500 text-white rounded-lg font-medium text-sm hover:bg-green-600">
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
