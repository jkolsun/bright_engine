'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2, Check, ChevronRight, ChevronLeft, Mic, MicOff,
  Volume2, AlertTriangle, SkipForward, CheckCircle, Upload,
  Headphones, Wifi, Chrome, Eye,
} from 'lucide-react'
import AudioRecorder from './AudioRecorder'

// ════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════

interface StepStatus {
  equipment: boolean
  microphone: boolean
  outboundVm: boolean | 'skipped'
  inboundVm: boolean | 'skipped'
  training: boolean
}

// ════════════════════════════════════════════════════════════
// MAIN WIZARD
// ════════════════════════════════════════════════════════════

export default function RepOnboardingWizard({ userId: initialUserId, onComplete }: { userId?: string; onComplete?: () => void } = {}) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  // Track what was completed vs skipped
  const [status, setStatus] = useState<StepStatus>({
    equipment: false,
    microphone: false,
    outboundVm: false,
    inboundVm: false,
    training: false,
  })

  // Load user data + determine resume point
  useEffect(() => {
    async function init() {
      try {
        const res = await fetch('/api/auth/me')
        if (!res.ok) return
        const { user } = await res.json()
        setUserId(user.id)

        // Already completed — redirect
        if (user.onboardingCompletedAt) {
          router.replace('/reps')
          return
        }

        // Resume logic: skip steps that are already done
        const newStatus = { ...status }
        let resumeStep = 0

        if (user.outboundVmUrl) {
          newStatus.equipment = true
          newStatus.microphone = true
          newStatus.outboundVm = true
          resumeStep = 3 // jump to inbound VM
        }
        if (user.inboundVmUrl) {
          newStatus.inboundVm = true
          if (resumeStep <= 3) resumeStep = 4 // jump to training
        }

        setStatus(newStatus)
        if (resumeStep > 0) setStep(resumeStep)
      } catch {
        console.error('Failed to load user data')
      } finally {
        setLoading(false)
      }
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const goNext = () => setStep(prev => Math.min(prev + 1, 5))
  const goBack = () => setStep(prev => Math.max(prev - 1, 0))

  const handleComplete = async () => {
    setCompleting(true)
    setError(null)
    try {
      const res = await fetch('/api/reps/onboarding/complete', { method: 'POST' })
      if (res.ok) {
        router.replace('/reps')
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to complete onboarding')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setCompleting(false)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-3" />
          <p className="text-gray-500">Loading setup...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-white overflow-y-auto">
      <div className="min-h-screen flex flex-col">
        {/* Progress bar */}
        <div className="bg-gray-100 h-1.5">
          <div
            className="h-full bg-teal-500 transition-all duration-500"
            style={{ width: `${((step + 1) / 6) * 100}%` }}
          />
        </div>

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-teal-100 rounded-xl flex items-center justify-center">
                <span className="text-sm font-bold text-teal-700">B</span>
              </div>
              <p className="text-sm text-gray-500">Step {step + 1} of 6</p>
            </div>
            <div className="flex gap-1.5">
              {[0, 1, 2, 3, 4, 5].map(i => (
                <div key={i} className={`w-2 h-2 rounded-full ${i <= step ? 'bg-teal-500' : 'bg-gray-300'}`} />
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-start justify-center p-6 pt-8">
          <div className="w-full max-w-2xl">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            {step === 0 && (
              <StepEquipment
                onNext={() => { setStatus(s => ({ ...s, equipment: true })); goNext() }}
                onSkip={() => { setStatus(s => ({ ...s, equipment: false })); goNext() }}
              />
            )}
            {step === 1 && (
              <StepMicrophone
                onNext={() => { setStatus(s => ({ ...s, microphone: true })); goNext() }}
                onSkip={() => { setStatus(s => ({ ...s, microphone: false })); goNext() }}
                onBack={goBack}
              />
            )}
            {step === 2 && (
              <StepRecordVM
                type="outbound"
                userId={userId}
                onNext={() => { setStatus(s => ({ ...s, outboundVm: true })); goNext() }}
                onSkip={() => { setStatus(s => ({ ...s, outboundVm: 'skipped' })); goNext() }}
                onBack={goBack}
              />
            )}
            {step === 3 && (
              <StepRecordVM
                type="inbound"
                userId={userId}
                onNext={() => { setStatus(s => ({ ...s, inboundVm: true })); goNext() }}
                onSkip={() => { setStatus(s => ({ ...s, inboundVm: 'skipped' })); goNext() }}
                onBack={goBack}
              />
            )}
            {step === 4 && (
              <StepTraining
                onNext={() => { setStatus(s => ({ ...s, training: true })); goNext() }}
                onSkip={() => { setStatus(s => ({ ...s, training: false })); goNext() }}
                onBack={goBack}
              />
            )}
            {step === 5 && (
              <StepConfirmation
                status={status}
                completing={completing}
                onComplete={handleComplete}
                onBack={goBack}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// STEP 1: WELCOME + EQUIPMENT CHECK
// ════════════════════════════════════════════════════════════

function StepEquipment({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const [browserWarning, setBrowserWarning] = useState<string | null>(null)

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent
      if (/Chrome/.test(ua) && !/Edg|OPR/.test(ua)) {
        // Chrome detected — good
      } else if (/Edg/.test(ua)) {
        setBrowserWarning('Microsoft Edge')
      } else if (/Firefox/.test(ua)) {
        setBrowserWarning('Firefox')
      } else if (/Safari/.test(ua)) {
        setBrowserWarning('Safari')
      } else {
        setBrowserWarning('your current browser')
      }
    }
  }, [])

  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <span className="text-2xl font-bold text-teal-700">B</span>
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-3">Welcome to Bright Automations</h1>
      <p className="text-gray-500 mb-8 text-lg">
        Before you start dialing, we need to set up a few things.<br />
        This takes about 5 minutes.
      </p>

      <div className="max-w-md mx-auto text-left mb-8">
        <p className="text-sm font-semibold text-gray-700 mb-3">You&apos;ll need:</p>
        <div className="space-y-3">
          {[
            { icon: Headphones, text: 'A headset or earbuds with a microphone' },
            { icon: Wifi, text: 'A stable internet connection (ethernet preferred)' },
            { icon: Chrome, text: 'Google Chrome browser' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <item.icon size={20} className="text-teal-600 flex-shrink-0" />
              <span className="text-sm text-gray-700">{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {browserWarning && (
        <div className="max-w-md mx-auto mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            We recommend Chrome for the best call quality. You&apos;re currently using <strong>{browserWarning}</strong>. You can continue, but audio quality may vary.
          </p>
        </div>
      )}

      <button
        onClick={onNext}
        className="px-8 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors inline-flex items-center gap-2"
      >
        I Have Everything <ChevronRight size={18} />
      </button>

      <div className="mt-4">
        <button onClick={onSkip} className="text-sm text-gray-400 hover:text-gray-600 transition-colors inline-flex items-center gap-1">
          <SkipForward size={14} /> Skip
        </button>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// STEP 2: MICROPHONE PERMISSION
// ════════════════════════════════════════════════════════════

function StepMicrophone({ onNext, onSkip, onBack }: { onNext: () => void; onSkip: () => void; onBack: () => void }) {
  const [micState, setMicState] = useState<'idle' | 'granted' | 'denied' | 'error'>('idle')
  const [toneState, setToneState] = useState<'idle' | 'playing' | 'heard' | 'not_heard'>('idle')
  const streamRef = useRef<MediaStream | null>(null)

  const requestMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      setMicState('granted')
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMicState('denied')
      } else {
        setMicState('error')
      }
    }
  }

  const playTestTone = () => {
    setToneState('playing')
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = 440
      osc.type = 'sine'
      gain.gain.value = 0.3
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      setTimeout(() => {
        osc.stop()
        ctx.close()
        setToneState('idle')
      }, 1000)
    } catch {
      setToneState('idle')
    }
  }

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }
    }
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Microphone Access</h1>
      <p className="text-gray-500 mb-6">Calls happen through your browser. We need microphone access to connect you.</p>

      <div className="bg-gray-50 rounded-xl p-8 text-center mb-6">
        {micState === 'idle' && (
          <>
            <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mic size={28} className="text-teal-600" />
            </div>
            <button
              onClick={requestMic}
              className="px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors inline-flex items-center gap-2"
            >
              <Mic size={18} /> Allow Microphone Access
            </button>
            <p className="text-xs text-gray-400 mt-3">Chrome will show a popup asking for permission</p>
          </>
        )}

        {micState === 'granted' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={28} className="text-green-600" />
            </div>
            <p className="text-green-700 font-semibold mb-4">Microphone connected</p>

            {toneState !== 'heard' && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-3">Let&apos;s test your audio output:</p>
                <button
                  onClick={playTestTone}
                  disabled={toneState === 'playing'}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors inline-flex items-center gap-2"
                >
                  <Volume2 size={16} /> {toneState === 'playing' ? 'Playing...' : 'Play Test Beep'}
                </button>
                {toneState === 'idle' && (
                  <div className="flex items-center justify-center gap-3 mt-4">
                    <p className="text-sm text-gray-500">Did you hear a beep?</p>
                    <button onClick={() => setToneState('heard')} className="px-4 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors">
                      Yes
                    </button>
                    <button onClick={() => setToneState('not_heard')} className="px-4 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors">
                      No
                    </button>
                  </div>
                )}
                {toneState === 'not_heard' && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 text-left">
                    <p className="font-medium mb-1">Troubleshooting:</p>
                    <ul className="list-disc ml-4 space-y-1">
                      <li>Check that your headset is plugged in</li>
                      <li>Make sure it&apos;s selected as the audio output in your system settings</li>
                      <li>Try adjusting the volume</li>
                    </ul>
                    <button onClick={playTestTone} className="mt-2 text-blue-600 font-medium hover:underline">
                      Try Again
                    </button>
                  </div>
                )}
              </div>
            )}
            {toneState === 'heard' && (
              <p className="text-green-600 text-sm font-medium mt-2">Audio output confirmed</p>
            )}
          </>
        )}

        {micState === 'denied' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MicOff size={28} className="text-red-600" />
            </div>
            <p className="text-red-700 font-semibold mb-3">Microphone access was denied</p>
            <div className="text-sm text-gray-600 text-left bg-white rounded-lg p-4 border border-gray-200 max-w-sm mx-auto">
              <p className="mb-2">To enable it:</p>
              <ol className="list-decimal ml-4 space-y-1">
                <li>Click the <strong>lock icon</strong> in the address bar</li>
                <li>Go to <strong>Site settings</strong></li>
                <li>Set <strong>Microphone</strong> to <strong>Allow</strong></li>
                <li>Reload this page</li>
              </ol>
            </div>
            <button onClick={requestMic} className="mt-4 px-5 py-2.5 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors">
              Try Again
            </button>
          </>
        )}

        {micState === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={28} className="text-red-600" />
            </div>
            <p className="text-red-700 font-semibold mb-2">Could not access microphone</p>
            <p className="text-sm text-gray-500 mb-4">Make sure no other app is using your microphone and try again.</p>
            <button onClick={requestMic} className="px-5 py-2.5 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors">
              Try Again
            </button>
          </>
        )}
      </div>

      <div className="flex justify-between items-center">
        <button onClick={onBack} className="px-6 py-2.5 text-gray-600 hover:text-gray-800 font-medium inline-flex items-center gap-1">
          <ChevronLeft size={18} /> Back
        </button>
        <div className="flex items-center gap-3">
          <button onClick={onSkip} className="text-sm text-gray-400 hover:text-gray-600 transition-colors inline-flex items-center gap-1">
            <SkipForward size={14} /> Skip
          </button>
          <button
            onClick={onNext}
            disabled={micState !== 'granted'}
            className="px-8 py-2.5 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
          >
            Continue <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// STEPS 3 & 4: RECORD VM (OUTBOUND / INBOUND)
// ════════════════════════════════════════════════════════════

const VM_SCRIPTS = {
  outbound: {
    title: 'Record Your Outbound Voicemail',
    subtitle: 'When you call a lead and they don\'t pick up, this message plays on their voicemail. The preview link is texted to them automatically at the same time.',
    script: '"Hey, this is [YOUR NAME] with Bright Automations. I put together a website for your company — texting you the link right now so you can check it out. Let me know what you think. Talk soon."',
  },
  inbound: {
    title: 'Record Your Inbound Voicemail',
    subtitle: 'When a lead calls you back and you\'re busy or offline, this plays.',
    script: '"Hey, you\'ve reached [YOUR NAME] with Bright Automations. I can\'t get to the phone right now but leave a message and I\'ll get back to you. Thanks!"',
  },
}

function StepRecordVM({
  type,
  userId,
  onNext,
  onSkip,
  onBack,
}: {
  type: 'outbound' | 'inbound'
  userId: string | null
  onNext: () => void
  onSkip: () => void
  onBack: () => void
}) {
  const [recording, setRecording] = useState<Blob | null>(null)
  const [duration, setDuration] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [durationWarning, setDurationWarning] = useState<string | null>(null)

  const config = VM_SCRIPTS[type]

  const handleRecordingComplete = (blob: Blob, dur: number) => {
    setRecording(blob)
    setDuration(dur)
    setUploadError(null)
    if (dur > 25) {
      setDurationWarning(`Your recording is ${Math.round(dur)} seconds. Try to keep it under 20 seconds for best results.`)
    } else {
      setDurationWarning(null)
    }
  }

  const handleUpload = async () => {
    if (!recording || !userId) return
    setUploading(true)
    setUploadError(null)
    try {
      const formData = new FormData()
      formData.append('audio', recording, `${type}-vm.webm`)
      formData.append('type', type)

      const res = await fetch('/api/reps/onboarding/vm-upload', {
        method: 'POST',
        body: formData,
      })
      if (res.ok) {
        setUploaded(true)
      } else {
        const data = await res.json()
        setUploadError(data.error || 'Upload failed. Please try again.')
      }
    } catch {
      setUploadError('Network error. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">{config.title}</h1>
      <p className="text-gray-500 mb-6">{config.subtitle}</p>

      {/* Script box */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-4">
        <p className="text-sm text-gray-500 font-medium mb-2">Here&apos;s what to say (in your own words, keep it under 20 seconds):</p>
        <p className="text-gray-800 italic leading-relaxed">{config.script}</p>
      </div>

      {/* Tips */}
      <div className="grid grid-cols-2 gap-2 mb-6">
        {[
          'Sound natural, not scripted',
          'Smile when you talk',
          'Keep it under 20 seconds',
          'Record in a quiet room',
        ].map((tip, i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
            <div className="w-1 h-1 rounded-full bg-teal-400 flex-shrink-0" />
            {tip}
          </div>
        ))}
      </div>

      {/* Recorder */}
      {!uploaded ? (
        <>
          <AudioRecorder
            onRecordingComplete={handleRecordingComplete}
            maxDurationSec={30}
            minDurationSec={5}
          />

          {durationWarning && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 flex items-start gap-2">
              <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
              {durationWarning}
            </div>
          )}

          {uploadError && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {uploadError}
            </div>
          )}

          {recording && duration >= 5 && (
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="mt-4 w-full py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-2"
            >
              {uploading ? (
                <><Loader2 size={18} className="animate-spin" /> Uploading...</>
              ) : (
                <><Upload size={18} /> Upload &amp; Continue</>
              )}
            </button>
          )}
        </>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <CheckCircle size={32} className="text-green-600 mx-auto mb-3" />
          <p className="text-green-800 font-semibold">Uploaded!</p>
          <p className="text-green-600 text-sm mt-1">Andrew will review and approve your recording before your first session.</p>
        </div>
      )}

      <div className="flex justify-between items-center mt-6">
        <button onClick={onBack} className="px-6 py-2.5 text-gray-600 hover:text-gray-800 font-medium inline-flex items-center gap-1">
          <ChevronLeft size={18} /> Back
        </button>
        <div className="flex items-center gap-3">
          {!uploaded && (
            <button onClick={onSkip} className="text-sm text-gray-400 hover:text-gray-600 transition-colors inline-flex items-center gap-1">
              <SkipForward size={14} /> Skip
            </button>
          )}
          {uploaded && (
            <button
              onClick={onNext}
              className="px-8 py-2.5 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors inline-flex items-center gap-2"
            >
              Continue <ChevronRight size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// STEP 5: HOW THE DIALER WORKS
// ════════════════════════════════════════════════════════════

const TRAINING_SECTIONS = [
  {
    title: 'CALLS',
    content: 'Calls happen through your browser. The system automatically detects voicemail, no answer, and bad numbers — you don\'t log these manually.',
  },
  {
    title: 'PREVIEWS',
    content: 'During a call, click "Text Preview" to send the lead their personalized website preview. You\'ll see in real-time when they open it and click "Get Started."',
  },
  {
    title: 'CLOSING',
    content: 'When a lead says yes: say "Expect a text from our team in the next few minutes." Then log the result and move to your next call. Our AI handles everything after that.',
  },
  {
    title: 'LOGGING RESULTS',
    content: 'After each call, the system recommends an outcome based on what happened. If it\'s right, tap it once. If not, use the yes/no questions to find the right one.',
  },
  {
    title: 'UPSELLS',
    content: 'The call guide shows products you can pitch. If a lead wants one, tap "+ Add" to tag it. This records their interest — it doesn\'t send them anything.',
  },
  {
    title: 'DNC',
    content: 'If someone says "don\'t call me again," click the DNC button. This is permanent. Only use it when explicitly asked.',
  },
  {
    title: 'COMMISSION',
    content: 'First contact with a lead = you own it. If that lead converts, you earn commission. Paid weekly on Fridays via Wise.',
  },
]

function TrainingSectionItem({
  section,
  index,
  viewed,
  onView,
}: {
  section: { title: string; content: string }
  index: number
  viewed: boolean
  onView: (index: number) => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <button
      type="button"
      onClick={() => {
        setExpanded(!expanded)
        onView(index)
      }}
      className={`w-full text-left rounded-xl border transition-colors ${
        viewed
          ? 'bg-teal-50/50 border-teal-200'
          : 'bg-white border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          {viewed ? (
            <CheckCircle size={16} className="text-teal-500" />
          ) : (
            <Eye size={16} className="text-gray-400" />
          )}
          <span className="font-semibold text-sm text-gray-900">{section.title}</span>
        </div>
        <ChevronRight size={16} className={`text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </div>
      {expanded && (
        <div className="px-4 pb-3 pt-0">
          <p className="text-sm text-gray-600 leading-relaxed">{section.content}</p>
        </div>
      )}
    </button>
  )
}

function StepTraining({ onNext, onSkip, onBack }: { onNext: () => void; onSkip: () => void; onBack: () => void }) {
  const [viewedSections, setViewedSections] = useState<Set<number>>(new Set())
  const [elapsedSec, setElapsedSec] = useState(0)
  const timerRef = useRef<NodeJS.Timeout>()

  const allViewed = viewedSections.size >= TRAINING_SECTIONS.length
  const canContinue = allViewed || elapsedSec >= 30

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsedSec(prev => prev + 1)
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  const handleView = useCallback((index: number) => {
    setViewedSections(prev => {
      const next = new Set(prev)
      next.add(index)
      return next
    })
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">How the Power Dialer Works</h1>
      <p className="text-gray-500 mb-6">Key information you need before your first session. Click each section to expand.</p>

      <div className="space-y-2 mb-6">
        {TRAINING_SECTIONS.map((section, i) => (
          <TrainingSectionItem
            key={i}
            section={section}
            index={i}
            viewed={viewedSections.has(i)}
            onView={handleView}
          />
        ))}
      </div>

      {!canContinue && (
        <p className="text-xs text-gray-400 text-center mb-4">
          Read all sections to continue ({viewedSections.size}/{TRAINING_SECTIONS.length} viewed)
        </p>
      )}

      <div className="flex justify-between items-center">
        <button onClick={onBack} className="px-6 py-2.5 text-gray-600 hover:text-gray-800 font-medium inline-flex items-center gap-1">
          <ChevronLeft size={18} /> Back
        </button>
        <div className="flex items-center gap-3">
          <button onClick={onSkip} className="text-sm text-gray-400 hover:text-gray-600 transition-colors inline-flex items-center gap-1">
            <SkipForward size={14} /> Skip
          </button>
          <button
            onClick={onNext}
            disabled={!canContinue}
            className="px-8 py-2.5 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
          >
            Continue <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// STEP 6: CONFIRMATION + COMPLETE
// ════════════════════════════════════════════════════════════

function StepConfirmation({
  status,
  completing,
  onComplete,
  onBack,
}: {
  status: StepStatus
  completing: boolean
  onComplete: () => void
  onBack: () => void
}) {
  const items = [
    {
      label: 'Equipment confirmed',
      done: status.equipment,
    },
    {
      label: 'Microphone connected',
      done: status.microphone,
    },
    {
      label: 'Outbound voicemail',
      done: status.outboundVm,
      detail: status.outboundVm === true ? 'Recorded — pending approval' : status.outboundVm === 'skipped' ? 'Skipped' : 'Not completed',
    },
    {
      label: 'Inbound voicemail',
      done: status.inboundVm,
      detail: status.inboundVm === true ? 'Recorded — pending approval' : status.inboundVm === 'skipped' ? 'Skipped' : 'Not completed',
    },
    {
      label: 'Dialer training reviewed',
      done: status.training,
    },
  ]

  const hasVMs = status.outboundVm === true || status.inboundVm === true
  const skippedVMs = status.outboundVm === 'skipped' || status.inboundVm === 'skipped' || !status.outboundVm || !status.inboundVm

  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <CheckCircle size={32} className="text-green-600" />
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">You&apos;re All Set!</h1>
      <p className="text-gray-500 mb-8">Here&apos;s where you stand:</p>

      <div className="max-w-md mx-auto space-y-2 mb-8 text-left">
        {items.map((item, i) => (
          <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${
            item.done === true ? 'bg-green-50 border border-green-200' :
            item.done === 'skipped' ? 'bg-gray-50 border border-gray-200' :
            'bg-gray-50 border border-gray-200'
          }`}>
            {item.done === true ? (
              <CheckCircle size={18} className="text-green-500 flex-shrink-0" />
            ) : (
              <SkipForward size={18} className="text-gray-400 flex-shrink-0" />
            )}
            <div>
              <p className="text-sm font-medium text-gray-900">{item.label}</p>
              {item.detail && <p className="text-xs text-gray-500">{item.detail}</p>}
            </div>
          </div>
        ))}
      </div>

      {hasVMs && (
        <div className="max-w-md mx-auto mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
          <p>Waiting for Andrew to approve your voicemail recordings. You&apos;ll get a notification when you&apos;re cleared to start dialing.</p>
        </div>
      )}

      {skippedVMs && (
        <div className="max-w-md mx-auto mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <p>You can record your voicemails anytime in your profile settings.</p>
        </div>
      )}

      <p className="text-gray-500 text-sm mb-6">
        In the meantime, you can explore your dashboard and review your assigned leads.
      </p>

      <div className="flex justify-between items-center">
        <button onClick={onBack} className="px-6 py-2.5 text-gray-600 hover:text-gray-800 font-medium inline-flex items-center gap-1">
          <ChevronLeft size={18} /> Back
        </button>
        <button
          onClick={onComplete}
          disabled={completing}
          className="px-8 py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 disabled:opacity-50 transition-colors inline-flex items-center gap-2 text-lg"
        >
          {completing ? (
            <><Loader2 size={18} className="animate-spin" /> Finishing...</>
          ) : (
            <>Go to Dashboard <ChevronRight size={18} /></>
          )}
        </button>
      </div>
    </div>
  )
}
