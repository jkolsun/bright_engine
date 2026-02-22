'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Loader2, Check, ExternalLink, ChevronRight, ChevronLeft } from 'lucide-react'

interface RepOnboardingWizardProps {
  userId: string
  onComplete: () => void
}

interface AvailableDay {
  start: string | null
  end: string | null
  active: boolean
}

type AvailableHours = Record<string, AvailableDay>

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_LABELS: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
  friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
}

const TIME_OPTIONS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00',
]

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern (ET)' },
  { value: 'America/Chicago', label: 'Central (CT)' },
  { value: 'America/Denver', label: 'Mountain (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific (PT)' },
  { value: 'America/Anchorage', label: 'Alaska (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (HT)' },
]

const DEFAULT_HOURS: AvailableHours = {
  monday: { start: '09:00', end: '17:00', active: true },
  tuesday: { start: '09:00', end: '17:00', active: true },
  wednesday: { start: '09:00', end: '17:00', active: true },
  thursday: { start: '09:00', end: '17:00', active: true },
  friday: { start: '09:00', end: '17:00', active: true },
  saturday: { start: null, end: null, active: false },
  sunday: { start: null, end: null, active: false },
}

export default function RepOnboardingWizard({ userId, onComplete }: RepOnboardingWizardProps) {
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 2: Profile
  const [name, setName] = useState('')
  const [personalPhone, setPersonalPhone] = useState('')
  const [timezone, setTimezone] = useState('America/New_York')
  const [availableHours, setAvailableHours] = useState<AvailableHours>(DEFAULT_HOURS)

  // Step 3: Stripe
  const [commissionRate, setCommissionRate] = useState(0.5)
  const [stripeStatus, setStripeStatus] = useState<string>('not_started')
  const [stripeDetailsSubmitted, setStripeDetailsSubmitted] = useState(false)
  const [connectingStripe, setConnectingStripe] = useState(false)
  const pollingRef = useRef<NodeJS.Timeout>()

  // Step 5: Acknowledgments
  const [checks, setChecks] = useState([false, false, false, false])

  // Load onboarding data on mount
  useEffect(() => {
    loadOnboardingData()
    return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadOnboardingData = async () => {
    try {
      const res = await fetch(`/api/users/${userId}/onboarding`)
      if (res.ok) {
        const data = await res.json()
        setName(data.name || '')
        setPersonalPhone(data.personalPhone || '')
        setTimezone(data.timezone || 'America/New_York')
        if (data.availableHours) setAvailableHours(data.availableHours)
        setCommissionRate(data.commissionRate ?? 0.5)
        setStripeStatus(data.stripeConnectStatus || 'not_started')
        setStripeDetailsSubmitted(data.stripeConnectStatus === 'active')

        // Resume from last incomplete step
        if (data.personalPhone && data.availableHours) {
          if (data.agreedToTermsAt) {
            setStep(4) // Go to acknowledgment
          } else {
            setStep(3) // Go to training (Stripe is optional, skip past it)
          }
        }
      }
    } catch {
      console.error('Failed to load onboarding data')
    } finally {
      setLoading(false)
    }
  }

  // Stripe status polling
  const startPolling = useCallback(() => {
    if (pollingRef.current) clearInterval(pollingRef.current)
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/stripe/connect/status?userId=${userId}`)
        if (res.ok) {
          const data = await res.json()
          setStripeStatus(data.status)
          setStripeDetailsSubmitted(data.detailsSubmitted)
          if (data.detailsSubmitted) {
            if (pollingRef.current) clearInterval(pollingRef.current)
          }
        }
      } catch { /* ignore polling errors */ }
    }, 3000)
  }, [userId])

  const handleConnectStripe = async () => {
    setConnectingStripe(true)
    setError(null)
    try {
      const endpoint = stripeStatus === 'not_started' || !stripeStatus
        ? '/api/stripe/connect/create'
        : '/api/stripe/connect/refresh'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      const data = await res.json()
      if (res.ok && data.url) {
        window.open(data.url, '_blank')
        startPolling()
      } else {
        setError(data.error || 'Failed to connect Stripe')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setConnectingStripe(false)
    }
  }

  const saveProfile = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/users/${userId}/onboarding`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, personalPhone, timezone, availableHours }),
      })
      const data = await res.json()
      if (res.ok) {
        setStep(2)
      } else {
        setError(data.error || 'Failed to save profile')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const finishOnboarding = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/users/${userId}/onboarding`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agreedToTermsAt: new Date().toISOString(),
          onboardingComplete: true,
        }),
      })
      if (res.ok) {
        onComplete()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to complete onboarding')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Validation
  const profileValid = name.trim().length > 0
    && personalPhone.replace(/\D/g, '').length >= 10
    && timezone.length > 0
    && DAYS.some(d => availableHours[d]?.active)

  const allChecked = checks.every(Boolean)

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
            style={{ width: `${((step + 1) / 5) * 100}%` }}
          />
        </div>

        {/* Step indicator */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <p className="text-sm text-gray-500">Step {step + 1} of 5</p>
            <div className="flex gap-1.5">
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} className={`w-2 h-2 rounded-full ${i <= step ? 'bg-teal-500' : 'bg-gray-300'}`} />
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-2xl">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            {step === 0 && <StepWelcome onNext={() => setStep(1)} />}
            {step === 1 && (
              <StepProfile
                name={name} setName={setName}
                personalPhone={personalPhone} setPersonalPhone={setPersonalPhone}
                timezone={timezone} setTimezone={setTimezone}
                availableHours={availableHours} setAvailableHours={setAvailableHours}
                valid={profileValid}
                saving={saving}
                onBack={() => setStep(0)}
                onNext={saveProfile}
              />
            )}
            {step === 2 && (
              <StepPayment
                commissionRate={commissionRate}
                stripeStatus={stripeStatus}
                stripeDetailsSubmitted={stripeDetailsSubmitted}
                connecting={connectingStripe}
                onConnect={handleConnectStripe}
                onBack={() => { if (pollingRef.current) clearInterval(pollingRef.current); setStep(1) }}
                onNext={() => { if (pollingRef.current) clearInterval(pollingRef.current); setStep(3) }}
              />
            )}
            {step === 3 && <StepTraining onBack={() => setStep(2)} onNext={() => setStep(4)} />}
            {step === 4 && (
              <StepAcknowledge
                checks={checks} setChecks={setChecks}
                allChecked={allChecked}
                saving={saving}
                onBack={() => setStep(3)}
                onFinish={finishOnboarding}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Step 1: Welcome ───────────────────────────────────────

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <span className="text-2xl font-bold text-teal-700">B</span>
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-3">Welcome to Bright Automations</h1>
      <p className="text-gray-500 mb-8 text-lg">You&apos;re about to start closing deals. Here&apos;s how it works:</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto mb-10 text-left">
        {[
          { icon: '&#x1F4CB;', text: 'We give you leads with pre-built websites' },
          { icon: '&#x1F4DE;', text: 'You call them using the power dialer' },
          { icon: '&#x1F4F1;', text: 'You text them the preview link' },
          { icon: '&#x1F4B0;', text: 'They pay $149 \u2192 you earn commission' },
        ].map((item, i) => (
          <div key={i} className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
            <span className="text-xl flex-shrink-0" dangerouslySetInnerHTML={{ __html: item.icon }} />
            <span className="text-sm text-gray-700">{item.text}</span>
          </div>
        ))}
      </div>

      <p className="text-gray-400 text-sm mb-6">Let&apos;s get you set up. Takes about 2 minutes.</p>

      <button
        onClick={onNext}
        className="px-8 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors inline-flex items-center gap-2"
      >
        Get Started <ChevronRight size={18} />
      </button>
    </div>
  )
}

// ─── Step 2: Profile ───────────────────────────────────────

interface StepProfileProps {
  name: string; setName: (v: string) => void
  personalPhone: string; setPersonalPhone: (v: string) => void
  timezone: string; setTimezone: (v: string) => void
  availableHours: AvailableHours; setAvailableHours: (v: AvailableHours) => void
  valid: boolean
  saving: boolean
  onBack: () => void
  onNext: () => void
}

function StepProfile(props: StepProfileProps) {
  const { name, setName, personalPhone, setPersonalPhone, timezone, setTimezone, availableHours, setAvailableHours, valid, saving, onBack, onNext } = props

  const toggleDay = (day: string) => {
    setAvailableHours({
      ...availableHours,
      [day]: {
        ...availableHours[day],
        active: !availableHours[day]?.active,
        start: !availableHours[day]?.active ? '09:00' : null,
        end: !availableHours[day]?.active ? '17:00' : null,
      },
    })
  }

  const setDayTime = (day: string, field: 'start' | 'end', value: string) => {
    setAvailableHours({
      ...availableHours,
      [day]: { ...availableHours[day], [field]: value },
    })
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Confirm Your Info</h1>
      <p className="text-gray-500 mb-6">We need a few details to get you started.</p>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Personal Phone *</label>
          <input
            type="tel"
            value={personalPhone}
            onChange={e => setPersonalPhone(e.target.value)}
            placeholder="(555) 123-4567"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
          <p className="text-xs text-gray-400 mt-1">For admin contact only. Calls to leads come from the company Twilio number.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Your Timezone *</label>
          <select
            value={timezone}
            onChange={e => setTimezone(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
          >
            {TIMEZONES.map(tz => (
              <option key={tz.value} value={tz.value}>{tz.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">When are you available to dial? *</label>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {DAYS.map(day => (
              <div key={day} className={`flex items-center gap-3 px-4 py-2.5 ${day !== 'sunday' ? 'border-b border-gray-100' : ''}`}>
                <button
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    availableHours[day]?.active ? 'bg-teal-500 border-teal-500' : 'border-gray-300'
                  }`}
                >
                  {availableHours[day]?.active && <Check size={12} className="text-white" />}
                </button>
                <span className="w-10 text-sm font-medium text-gray-700">{DAY_LABELS[day]}</span>
                {availableHours[day]?.active ? (
                  <div className="flex items-center gap-2 text-sm">
                    <select
                      value={availableHours[day]?.start || '09:00'}
                      onChange={e => setDayTime(day, 'start', e.target.value)}
                      className="px-2 py-1 border border-gray-200 rounded bg-white text-sm"
                    >
                      {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <span className="text-gray-400">to</span>
                    <select
                      value={availableHours[day]?.end || '17:00'}
                      onChange={e => setDayTime(day, 'end', e.target.value)}
                      className="px-2 py-1 border border-gray-200 rounded bg-white text-sm"
                    >
                      {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                ) : (
                  <span className="text-sm text-gray-400">&mdash;</span>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1">Select at least 1 day you&apos;re available.</p>
        </div>
      </div>

      <div className="flex justify-between mt-8">
        <button onClick={onBack} className="px-6 py-2.5 text-gray-600 hover:text-gray-800 font-medium inline-flex items-center gap-1">
          <ChevronLeft size={18} /> Back
        </button>
        <button
          onClick={onNext}
          disabled={!valid || saving}
          className="px-8 py-2.5 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
        >
          {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : <>Continue <ChevronRight size={18} /></>}
        </button>
      </div>
    </div>
  )
}

// ─── Step 3: Payment ───────────────────────────────────────

interface StepPaymentProps {
  commissionRate: number
  stripeStatus: string
  stripeDetailsSubmitted: boolean
  connecting: boolean
  onConnect: () => void
  onBack: () => void
  onNext: () => void
}

function StepPayment(props: StepPaymentProps) {
  const { commissionRate, stripeStatus, stripeDetailsSubmitted, connecting, onConnect, onBack, onNext } = props
  const commission = (149 * commissionRate).toFixed(2)

  const statusBadge = () => {
    if (stripeStatus === 'active' || stripeDetailsSubmitted) {
      return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium"><Check size={14} /> Connected</span>
    }
    if (stripeStatus === 'pending') {
      return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-sm font-medium"><Loader2 size={14} className="animate-spin" /> Pending</span>
    }
    if (stripeStatus === 'restricted') {
      return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-700 text-sm font-medium">Restricted</span>
    }
    return <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-sm">Not Connected</span>
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">How You Get Paid</h1>
      <p className="text-gray-500 mb-6">Connect your bank account to receive commission payouts.</p>

      <div className="bg-teal-50 border border-teal-200 rounded-xl p-6 mb-6">
        <div className="text-center">
          <p className="text-sm text-teal-700 font-medium mb-1">Your Commission: {Math.round(commissionRate * 100)}% per close</p>
          <p className="text-2xl font-bold text-teal-900">Client pays $149 &rarr; You earn ${commission}</p>
          <p className="text-sm text-teal-600 mt-2">Payouts: Weekly on Fridays via Stripe</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <div className="text-center space-y-4">
          <p className="text-sm text-gray-600">
            To receive payouts, connect your bank account through Stripe. It&apos;s secure and takes 2 minutes.
          </p>

          <div className="flex justify-center">
            {statusBadge()}
          </div>

          {!stripeDetailsSubmitted && stripeStatus !== 'active' && (
            <button
              onClick={onConnect}
              disabled={connecting}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors inline-flex items-center gap-2"
            >
              {connecting ? (
                <><Loader2 size={16} className="animate-spin" /> Connecting...</>
              ) : (
                <><ExternalLink size={16} /> {stripeStatus === 'pending' || stripeStatus === 'restricted' ? 'Complete Stripe Setup' : 'Connect with Stripe'}</>
              )}
            </button>
          )}

          {stripeStatus === 'pending' && !stripeDetailsSubmitted && (
            <p className="text-xs text-gray-400">Waiting for you to complete Stripe setup in the other tab...</p>
          )}

          <p className="text-xs text-gray-400">
            You&apos;ll be redirected to Stripe to enter your banking details. You&apos;ll come right back here.
          </p>
        </div>
      </div>

      <div className="flex justify-between items-center mt-8">
        <button onClick={onBack} className="px-6 py-2.5 text-gray-600 hover:text-gray-800 font-medium inline-flex items-center gap-1">
          <ChevronLeft size={18} /> Back
        </button>
        <div className="flex items-center gap-3">
          {!stripeDetailsSubmitted && stripeStatus !== 'active' && (
            <span className="text-xs text-gray-400">You can set this up later</span>
          )}
          <button
            onClick={onNext}
            className="px-8 py-2.5 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors inline-flex items-center gap-2"
          >
            {!stripeDetailsSubmitted && stripeStatus !== 'active' ? 'Skip for Now' : 'Continue'} <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Step 4: Training ──────────────────────────────────────

function StepTraining({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const cards = [
    { icon: '&#x1F4CB;', title: 'LEADS', desc: 'We load your queue daily' },
    { icon: '&#x1F4DE;', title: 'CALL', desc: 'Dialer auto-calls through the list' },
    { icon: '&#x1F4F1;', title: 'PREVIEW', desc: 'One tap sends them a preview of their new site' },
    { icon: '&#x1F3AF;', title: 'PITCH', desc: 'Follow the script on screen' },
    { icon: '&#x1F4B3;', title: 'CLOSE', desc: 'They pay $149 through the preview' },
    { icon: '&#x1F4B0;', title: 'EARN', desc: 'You get commission deposited every Friday' },
  ]

  const rules = [
    'Follow the script \u2014 it works',
    'Send previews via text, not email',
    'Never discuss pricing changes or discounts',
    'If someone asks for a refund or gets angry, the system will auto-escalate to management',
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">How the Dialer Works</h1>
      <p className="text-gray-500 mb-6">Here&apos;s the process from start to finish.</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
        {cards.map((card, i) => (
          <div key={i} className="bg-gray-50 rounded-xl p-4 text-center">
            <span className="text-2xl block mb-2" dangerouslySetInnerHTML={{ __html: card.icon }} />
            <p className="font-bold text-xs text-gray-900 tracking-wider mb-1">{card.title}</p>
            <p className="text-xs text-gray-500">{card.desc}</p>
          </div>
        ))}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <h3 className="font-semibold text-gray-900 mb-2 text-sm">Key Rules</h3>
        <ul className="space-y-2">
          {rules.map((rule, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="text-amber-500 mt-0.5">&#x2022;</span>
              {rule}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex justify-between mt-8">
        <button onClick={onBack} className="px-6 py-2.5 text-gray-600 hover:text-gray-800 font-medium inline-flex items-center gap-1">
          <ChevronLeft size={18} /> Back
        </button>
        <button
          onClick={onNext}
          className="px-8 py-2.5 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors inline-flex items-center gap-2"
        >
          Continue <ChevronRight size={18} />
        </button>
      </div>
    </div>
  )
}

// ─── Step 5: Acknowledge ───────────────────────────────────

interface StepAcknowledgeProps {
  checks: boolean[]; setChecks: (v: boolean[]) => void
  allChecked: boolean
  saving: boolean
  onBack: () => void
  onFinish: () => void
}

function StepAcknowledge(props: StepAcknowledgeProps) {
  const { checks, setChecks, allChecked, saving, onBack, onFinish } = props

  const toggleCheck = (i: number) => {
    const next = [...checks]
    next[i] = !next[i]
    setChecks(next)
  }

  const items = [
    'I understand this is a commission-only position \u2014 I earn when I close deals',
    'I will follow the provided call scripts and not make unauthorized promises',
    'I will not share lead data, client info, or internal tools with anyone outside the company',
    'I understand the escalation system \u2014 if a lead gets upset, the system handles it automatically',
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Almost There</h1>
      <p className="text-gray-500 mb-6">Please confirm the following:</p>

      <div className="space-y-3 mb-8">
        {items.map((item, i) => (
          <button
            key={i}
            type="button"
            onClick={() => toggleCheck(i)}
            className={`w-full flex items-start gap-3 p-4 rounded-xl border text-left transition-colors ${
              checks[i] ? 'bg-teal-50 border-teal-200' : 'bg-white border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
              checks[i] ? 'bg-teal-500 border-teal-500' : 'border-gray-300'
            }`}>
              {checks[i] && <Check size={12} className="text-white" />}
            </div>
            <span className="text-sm text-gray-700">{item}</span>
          </button>
        ))}
      </div>

      <div className="flex justify-between">
        <button onClick={onBack} className="px-6 py-2.5 text-gray-600 hover:text-gray-800 font-medium inline-flex items-center gap-1">
          <ChevronLeft size={18} /> Back
        </button>
        <button
          onClick={onFinish}
          disabled={!allChecked || saving}
          className="px-8 py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2 text-lg"
        >
          {saving ? <><Loader2 size={18} className="animate-spin" /> Finishing...</> : <>Start Dialing &#x1F680;</>}
        </button>
      </div>
    </div>
  )
}
