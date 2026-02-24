'use client'
import { useState } from 'react'
import { useDialer } from './DialerProvider'
import { Phone, PhoneOff, Mic, MicOff, Voicemail, SkipForward, Power, Pause, Play, Info } from 'lucide-react'

export function CallControls() {
  const { session, twilioDevice, timer, currentCall, dial, hangup, queue, endSessionFull } = useDialer()
  const [vmDropping, setVmDropping] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)

  const isOnCall = !!currentCall && ['INITIATED', 'RINGING', 'CONNECTED'].includes(currentCall.status)
  const isVoicemail = currentCall?.amdResult?.startsWith('machine') || currentCall?.status === 'VOICEMAIL'
  const canDial = !isOnCall && !!queue.selectedLead && twilioDevice.deviceState === 'registered'
  const isAutoDialOn = session.session?.autoDialEnabled || false
  const isCalledTab = queue.activeTab === 'called'

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
    <div className="border-t border-gray-200 bg-white px-6 py-3 shadow-[0_-1px_3px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-between">
        {/* Left: Session stats + status */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>{session.session?.totalCalls || 0} dials</span>
          <span>{session.session?.connectedCalls || 0} connected</span>
          <span>{session.session?.interestedCount || 0} interested</span>
          <span className={`font-semibold ${isAutoDialOn ? 'text-green-600' : 'text-amber-600'}`}>
            {isAutoDialOn ? 'AUTO-DIAL ON' : 'PAUSED'}
          </span>
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
                disabled={!canDial || isCalledTab}
                className="flex items-center gap-2 px-6 py-3 gradient-primary text-white rounded-xl font-semibold text-sm hover:opacity-90 shadow-teal disabled:opacity-50 disabled:cursor-not-allowed"
                title={isCalledTab ? 'Cannot dial from Called tab' : 'Dial (Space)'}
              >
                <Phone className="w-4 h-4" />
                Dial
              </button>

              {/* Device status — show when dialer has a problem */}
              {twilioDevice.deviceState === 'error' && (
                <span className="text-xs text-red-500 max-w-[200px] truncate" title={twilioDevice.errorMessage || 'Dialer error'}>
                  Dialer error — contact admin
                </span>
              )}
              {twilioDevice.deviceState === 'registering' && (
                <span className="text-xs text-amber-500 animate-pulse">Connecting dialer...</span>
              )}
              {twilioDevice.deviceState === 'unregistered' && (
                <span className="text-xs text-gray-400">Dialer not connected</span>
              )}

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

        {/* Right: Pause/Resume toggle + Info + End session */}
        <div className="flex items-center gap-2">
          {/* Pause/Resume toggle */}
          <button
            onClick={() => session.toggleAutoDial(!isAutoDialOn)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              isAutoDialOn
                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {isAutoDialOn ? (
              <><Pause className="w-3.5 h-3.5" />Pause</>
            ) : (
              <><Play className="w-3.5 h-3.5" />Resume</>
            )}
          </button>

          {/* Info tooltip */}
          <div className="relative">
            <button
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
            {showTooltip && (
              <div className="absolute bottom-full right-0 mb-2 w-64 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-50">
                Auto-dial calls the next lead automatically when you finish a call. Saves 30-60 minutes per 200 calls. Pause anytime to take a break.
                <div className="absolute bottom-0 right-4 transform translate-y-1 rotate-45 w-2 h-2 bg-gray-900" />
              </div>
            )}
          </div>

          <button
            onClick={() => endSessionFull()}
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
