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
    <div className="relative border-t border-gray-200/60 bg-white/95 backdrop-blur-sm px-6 py-4 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
      {/* Top row: session stats ticker */}
      <div className="flex items-center justify-center flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-400 mb-3 font-medium">
        <span className="text-gray-500 font-semibold">{session.session?.totalCalls || 0} dials</span>
        <span className="text-gray-300">|</span>
        <span className="text-gray-500 font-semibold">{session.session?.connectedCalls || 0} connected</span>
        {(() => {
          const DISPOSITION_DISPLAY: { field: string; label: string; color: string }[] = [
            { field: 'wantsToMoveForwardCount', label: 'move fwd', color: 'text-green-600' },
            { field: 'callbackCount', label: 'callback', color: 'text-teal-600' },
            { field: 'interestedVerbalCount', label: 'verbal int', color: 'text-green-500' },
            { field: 'wantsChangesCount', label: 'changes', color: 'text-blue-600' },
            { field: 'willLookLaterCount', label: 'look later', color: 'text-amber-600' },
            { field: 'notInterestedCount', label: 'not int', color: 'text-gray-500' },
            { field: 'voicemails', label: 'VM', color: 'text-gray-400' },
            { field: 'noAnswers', label: 'no ans', color: 'text-gray-400' },
            { field: 'wrongNumberCount', label: 'wrong #', color: 'text-red-500' },
            { field: 'disconnectedCount', label: 'disconn', color: 'text-red-500' },
            { field: 'dncCount', label: 'DNC', color: 'text-red-600' },
          ]
          return DISPOSITION_DISPLAY.map(({ field, label, color }) => {
            const count = (session.session as any)?.[field] || 0
            return count > 0 ? <span key={field}><span className="text-gray-300">|</span> <span className={`${color} font-semibold`}>{count} {label}</span></span> : null
          })
        })()}
      </div>

      <div className="flex items-center justify-between">
        {/* Left: Auto-dial status */}
        <div className="flex items-center gap-2.5 min-w-[160px]">
          <button
            onClick={() => session.toggleAutoDial(!isAutoDialOn)}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all duration-200 ${
              isAutoDialOn
                ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
            }`}
          >
            {isAutoDialOn ? (
              <><Pause className="w-3.5 h-3.5" />Pause</>
            ) : (
              <><Play className="w-3.5 h-3.5" />Resume</>
            )}
          </button>
          <span className={`text-[11px] font-bold tracking-wider ${isAutoDialOn ? 'text-green-500' : 'text-amber-500'}`}>
            {isAutoDialOn ? 'AUTO' : 'PAUSED'}
          </span>
        </div>

        {/* Center: Call controls */}
        <div className="flex items-center gap-3">
          {isOnCall ? (
            <>
              <button
                onClick={() => twilioDevice.toggleMute()}
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 ${
                  twilioDevice.isMuted
                    ? 'bg-red-100 text-red-600 ring-2 ring-red-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={twilioDevice.isMuted ? 'Unmute (M)' : 'Mute (M)'}
              >
                {twilioDevice.isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {isVoicemail && (
                <button
                  onClick={handleVmDrop}
                  disabled={vmDropping || currentCall.vmDropped}
                  className="w-11 h-11 rounded-xl flex items-center justify-center bg-purple-100 text-purple-600 hover:bg-purple-200 disabled:opacity-50 transition-all duration-200"
                  title="Drop Voicemail (V)"
                >
                  <Voicemail className="w-5 h-5" />
                </button>
              )}

              <button
                onClick={() => setShowKeypad(prev => !prev)}
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 ${
                  showKeypad ? 'bg-teal-100 text-teal-600 ring-2 ring-teal-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title="Keypad"
              >
                <Grid3X3 className="w-5 h-5" />
              </button>

              {showKeypad && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-white rounded-2xl shadow-2xl border border-gray-200/80 p-4 z-50">
                  <div className="grid grid-cols-3 gap-2.5">
                    {DTMF_KEYS.map(({ digit, letters }) => (
                      <button
                        key={digit}
                        onClick={() => handleDTMF(digit)}
                        className={`w-14 h-14 rounded-xl border flex flex-col items-center justify-center transition-all duration-100 ${
                          pressedDigit === digit ? 'bg-teal-100 border-teal-300 scale-95' : 'bg-gray-50 border-gray-200 hover:bg-teal-50 hover:border-teal-200'
                        }`}
                      >
                        <span className="text-lg font-bold text-gray-900">{digit}</span>
                        {letters && <span className="text-[8px] text-gray-400 leading-none font-medium">{letters}</span>}
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

              <div className="bg-gray-50 rounded-xl px-5 py-2 min-w-[80px] text-center">
                <div className="text-xl font-mono font-bold text-gray-900 tracking-tight">
                  {timer.formatted}
                </div>
              </div>

              <button
                onClick={hangup}
                className="w-12 h-12 rounded-xl bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/25 flex items-center justify-center transition-all duration-200 hover:scale-105"
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
                className="flex items-center gap-2.5 px-8 py-3.5 gradient-primary text-white rounded-2xl font-bold text-sm hover:opacity-90 shadow-lg shadow-teal-500/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-200"
                title={isCalledTab ? 'Cannot dial from Called tab' : 'Dial (Space)'}
              >
                <Phone className="w-5 h-5" />
                Dial
              </button>

              <button
                onClick={() => setShowManualDial(!showManualDial)}
                className={`flex items-center gap-2 px-5 py-3.5 rounded-2xl font-bold text-sm transition-all duration-200 ${
                  showManualDial
                    ? 'bg-teal-50 text-teal-700 border border-teal-200 ring-2 ring-teal-100'
                    : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 hover:border-gray-300'
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
                    className="w-44 px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all"
                  />
                  <button
                    onClick={handleManualDial}
                    disabled={manualDialing || !manualDialPhone.trim()}
                    className="px-5 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-bold hover:bg-teal-700 disabled:opacity-50 transition-all duration-200 shadow-sm"
                  >
                    {manualDialing ? 'Calling...' : 'Call'}
                  </button>
                </div>
              )}

              {/* Device status — show when dialer has a problem */}
              {twilioDevice.deviceState === 'error' && (
                <span className="text-xs text-red-500 max-w-[200px] truncate font-medium" title={twilioDevice.errorMessage || 'Dialer error'}>
                  Dialer error — contact admin
                </span>
              )}
              {twilioDevice.deviceState === 'registering' && (
                <span className="text-xs text-amber-500 animate-pulse font-medium">Connecting dialer...</span>
              )}
              {twilioDevice.deviceState === 'unregistered' && (
                <span className="text-xs text-gray-400 font-medium">Dialer not connected</span>
              )}

              <button
                onClick={() => queue.selectNext()}
                className="w-11 h-11 rounded-xl bg-gray-50 border border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700 hover:border-gray-300 flex items-center justify-center transition-all duration-200"
                title="Skip / Next"
              >
                <SkipForward className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* Right: Info + End session */}
        <div className="flex items-center gap-2.5 min-w-[160px] justify-end">
          {/* Info tooltip */}
          <div className="relative">
            <button
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              className="p-1.5 text-gray-300 hover:text-gray-500 transition-colors"
            >
              <Info className="w-4 h-4" />
            </button>
            {showTooltip && (
              <div className="absolute bottom-full right-0 mb-2 w-64 px-4 py-3 bg-gray-900 text-white text-xs rounded-xl shadow-xl z-50 leading-relaxed">
                Auto-dial calls the next lead automatically when you finish a call. Saves 30-60 minutes per 200 calls. Pause anytime to take a break.
                <div className="absolute bottom-0 right-4 transform translate-y-1 rotate-45 w-2 h-2 bg-gray-900" />
              </div>
            )}
          </div>

          <button
            onClick={() => endSessionFull()}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-red-600 border border-red-200 rounded-xl hover:bg-red-50 hover:border-red-300 transition-all duration-200"
          >
            <Power className="w-3.5 h-3.5" />
            End Session
          </button>
        </div>
      </div>
    </div>
  )
}
