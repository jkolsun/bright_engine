'use client'
import { useState } from 'react'
import { useDialer } from './DialerProvider'
import { Phone, PhoneOff, Mic, MicOff, Voicemail, SkipForward, Power } from 'lucide-react'

export function CallControls() {
  const { session, twilioDevice, timer, currentCall, dial, hangup, queue } = useDialer()
  const [vmDropping, setVmDropping] = useState(false)

  const isOnCall = !!currentCall && ['INITIATED', 'RINGING', 'CONNECTED'].includes(currentCall.status)
  const isVoicemail = currentCall?.amdResult?.startsWith('machine') || currentCall?.status === 'VOICEMAIL'
  const canDial = !isOnCall && !!queue.selectedLead && twilioDevice.deviceState === 'registered'

  const handleDial = async () => {
    if (!queue.selectedLead) return
    try {
      await dial(queue.selectedLead.id, queue.selectedLead.phone)
    } catch (err: any) {
      console.error('[CallControls] Dial error:', err.message)
    }
  }

  const handleVmDrop = async () => {
    if (!currentCall) return
    setVmDropping(true)
    try {
      await fetch('/api/dialer/call/vm-drop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId: currentCall.id }),
      })
    } catch (err) {
      console.error('[CallControls] VM drop error:', err)
    } finally { setVmDropping(false) }
  }

  return (
    <div className="border-t border-gray-200 bg-white px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Left: Session stats */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>{session.session?.totalCalls || 0} dials</span>
          <span>{session.session?.connectedCalls || 0} connected</span>
          <span>{session.session?.interestedCount || 0} interested</span>
        </div>

        {/* Center: Call controls */}
        <div className="flex items-center gap-3">
          {isOnCall ? (
            <>
              <button
                onClick={() => twilioDevice.toggleMute()}
                className={`p-3 rounded-full transition-colors ${twilioDevice.isMuted ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                title={twilioDevice.isMuted ? 'Unmute (M)' : 'Mute (M)'}
              >
                {twilioDevice.isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {isVoicemail && (
                <button
                  onClick={handleVmDrop}
                  disabled={vmDropping || currentCall.vmDropped}
                  className="p-3 rounded-full bg-purple-100 text-purple-600 hover:bg-purple-200 disabled:opacity-50"
                  title="Drop Voicemail (V)"
                >
                  <Voicemail className="w-5 h-5" />
                </button>
              )}

              <div className="text-lg font-mono font-semibold text-gray-900 mx-4 min-w-[60px] text-center">
                {timer.formatted}
              </div>

              <button
                onClick={hangup}
                className="p-3 rounded-full bg-red-500 text-white hover:bg-red-600 shadow-lg"
                title="Hang Up (Space)"
              >
                <PhoneOff className="w-5 h-5" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleDial}
                disabled={!canDial}
                className="flex items-center gap-2 px-6 py-3 gradient-primary text-white rounded-xl font-semibold text-sm hover:opacity-90 shadow-teal disabled:opacity-50 disabled:cursor-not-allowed"
                title="Dial (Space)"
              >
                <Phone className="w-4 h-4" />
                Dial
              </button>

              <button
                onClick={() => queue.selectNext()}
                className="p-3 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
                title="Skip / Next"
              >
                <SkipForward className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* Right: Auto-dial toggle + End session */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
            <input
              type="checkbox"
              checked={session.session?.autoDialEnabled || false}
              onChange={(e) => session.toggleAutoDial(e.target.checked)}
              className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            Auto-dial
          </label>
          <button
            onClick={() => session.endSession()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
          >
            <Power className="w-3.5 h-3.5" />
            End Session
          </button>
        </div>
      </div>
    </div>
  )
}
