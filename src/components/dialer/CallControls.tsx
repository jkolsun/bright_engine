'use client'
import { useState, useEffect } from 'react'
import { useDialer } from './DialerProvider'
import { Phone, PhoneOff, Mic, MicOff, Voicemail, SkipForward, Power, Pause, Play, Info, Grid3X3, PhoneOutgoing } from 'lucide-react'

const DTMF_KEYS = [
  { digit: '1', letters: '' }, { digit: '2', letters: 'ABC' }, { digit: '3', letters: 'DEF' },
  { digit: '4', letters: 'GHI' }, { digit: '5', letters: 'JKL' }, { digit: '6', letters: 'MNO' },
  { digit: '7', letters: 'PQRS' }, { digit: '8', letters: 'TUV' }, { digit: '9', letters: 'WXYZ' },
  { digit: '*', letters: '' }, { digit: '0', letters: '' }, { digit: '#', letters: '' },
]

export function CallControls() {
  const { session, twilioDevice, timer, currentCall, dial, hangup, queue, endSessionFull, activeCallerId, manualDialState, startManualDial } = useDialer()
  const [vmDropping, setVmDropping] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const [showKeypad, setShowKeypad] = useState(false)
  const [pressedDigit, setPressedDigit] = useState<string | null>(null)
  const [showManualDial, setShowManualDial] = useState(false)
  const [manualDialPhone, setManualDialPhone] = useState('')
  const [manualDialing, setManualDialing] = useState(false)

  const formatCallerId = (num: string) => {
    const digits = num.replace(/\D/g, '')
    if (digits.length === 11 && digits[0] === '1') {
      const d = digits.slice(1)
      return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
    }
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
    }
    return num
  }

  const normalizePhone = (input: string): string | null => {
    const digits = input.replace(/\D/g, '')
    if (digits.length === 10) return `+1${digits}`
    if (digits.length === 11 && digits[0] === '1') return `+${digits}`
    return null
  }

  // Auto-close keypad when call disconnects
  useEffect(() => {
    if (!currentCall || currentCall.status !== 'CONNECTED') setShowKeypad(false)
  }, [currentCall?.status])

  const handleDTMF = (digit: string) => {
    twilioDevice.activeCall?.sendDigits(digit)
    setPressedDigit(digit)
    setTimeout(() => setPressedDigit(null), 150)
  }

  if (currentCall) console.log('[CallControls] render — activeCallerId:', activeCallerId, 'callStatus:', currentCall.status)

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

  const handleManualDial = async () => {
    const normalized = normalizePhone(manualDialPhone)
    if (!normalized) return
    setManualDialing(true)
    try {
      await startManualDial(normalized)
      setShowManualDial(false)
      setManualDialPhone('')
    } catch (err: any) {
      console.error('[CallControls] Manual dial error:', err.message)
    } finally {
      setManualDialing(false)
    }
  }

  return (
    <div className="relative border-t border-gray-200 bg-white px-6 py-3 shadow-[0_-1px_3px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-between">
        {/* Left: Session stats + status */}
        <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
          <span>{session.session?.totalCalls || 0} dials</span>
          <span>{session.session?.connectedCalls || 0} connected</span>
          {(() => {
            const DISPOSITION_DISPLAY: { field: string; label: string; color: string }[] = [
              { field: 'wantsToMoveForwardCount', label: 'move fwd', color: 'text-green-700' },
              { field: 'callbackCount', label: 'callback', color: 'text-teal-700' },
              { field: 'interestedVerbalCount', label: 'verbal int', color: 'text-green-600' },
              { field: 'wantsChangesCount', label: 'changes', color: 'text-blue-700' },
              { field: 'willLookLaterCount', label: 'look later', color: 'text-amber-700' },
              { field: 'notInterestedCount', label: 'not int', color: 'text-gray-600' },
              { field: 'voicemails', label: 'VM', color: 'text-gray-500' },
              { field: 'noAnswers', label: 'no ans', color: 'text-gray-500' },
              { field: 'wrongNumberCount', label: 'wrong #', color: 'text-red-600' },
              { field: 'disconnectedCount', label: 'disconn', color: 'text-red-600' },
              { field: 'dncCount', label: 'DNC', color: 'text-red-700' },
            ]
            return DISPOSITION_DISPLAY.map(({ field, label, color }) => {
              const count = (session.session as any)?.[field] || 0
              return count > 0 ? <span key={field} className={color}>{count} {label}</span> : null
            })
          })()}
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

              <button
                onClick={() => setShowKeypad(prev => !prev)}
                className={`p-3 rounded-full transition-colors ${showKeypad ? 'bg-teal-100 text-teal-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                title="Keypad"
              >
                <Grid3X3 className="w-5 h-5" />
              </button>

              {showKeypad && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white rounded-xl shadow-lg border border-gray-200 p-3 z-50">
                  <div className="grid grid-cols-3 gap-2">
                    {DTMF_KEYS.map(({ digit, letters }) => (
                      <button
                        key={digit}
                        onClick={() => handleDTMF(digit)}
                        className={`w-12 h-12 rounded-lg border flex flex-col items-center justify-center transition-all ${
                          pressedDigit === digit ? 'bg-teal-200 scale-95' : 'bg-gray-50 hover:bg-teal-50'
                        }`}
                      >
                        <span className="text-lg font-semibold text-gray-900">{digit}</span>
                        {letters && <span className="text-[8px] text-gray-400 leading-none">{letters}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeCallerId && (
                <span className="text-xs text-gray-400 font-medium">
                  From: <span className="text-gray-600">{formatCallerId(activeCallerId)}</span>
                </span>
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

              <button
                onClick={() => setShowManualDial(!showManualDial)}
                className={`flex items-center gap-1.5 px-4 py-3 rounded-xl font-semibold text-sm transition-colors ${
                  showManualDial ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title="Manual Dial"
              >
                <PhoneOutgoing className="w-4 h-4" />
                Manual
              </button>

              {showManualDial && (
                <div className="flex items-center gap-2">
                  <input
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={manualDialPhone}
                    onChange={(e) => setManualDialPhone(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleManualDial(); if (e.key === 'Escape') setShowManualDial(false) }}
                    autoFocus
                    className="w-40 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                  />
                  <button
                    onClick={handleManualDial}
                    disabled={manualDialing || !manualDialPhone.trim()}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 disabled:opacity-50"
                  >
                    {manualDialing ? 'Calling...' : 'Call'}
                  </button>
                </div>
              )}

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
