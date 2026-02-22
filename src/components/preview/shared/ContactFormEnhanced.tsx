'use client'

import { useState } from 'react'
import type { TemplateTheme, IndustryConfig } from '../config/template-types'
import { brandGradientStyle } from './colorUtils'
import { Send, CheckCircle, Loader2 } from 'lucide-react'

interface ContactFormEnhancedProps {
  services?: string[]
  theme: TemplateTheme
  config: IndustryConfig
  previewId: string
  companyName: string
}

export default function ContactFormEnhanced({
  services,
  theme,
  config,
  previewId,
  companyName,
}: ContactFormEnhancedProps) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [service, setService] = useState('')
  const [timeline, setTimeline] = useState('')
  const [details, setDetails] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '')
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    try {
      await fetch('/api/preview/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          previewId,
          event: 'contact_form',
          data: { name, phone, email, service, timeline, details },
        }),
      })
      setSent(true)
    } catch {
      // silently handle
    } finally {
      setSending(false)
    }
  }

  const cardClass = {
    modern: 'bg-white border border-gray-100',
    bold: 'bg-gray-800/50 border border-gray-700/50',
    classic: 'bg-white border border-stone-100',
    premium: 'bg-gray-800/50 border border-gray-700/50',
  }[theme]

  const inputClass = {
    modern: 'border-gray-200 bg-white focus:ring-teal-500 text-gray-900',
    bold: 'border-gray-700 bg-gray-800 text-white focus:ring-orange-500 placeholder:text-gray-500',
    classic: 'border-stone-200 bg-white focus:ring-emerald-500 text-stone-900',
    premium: 'border-gray-700 bg-gray-800 text-white focus:ring-amber-500 placeholder:text-gray-500',
  }[theme]

  const labelColor = {
    modern: 'text-gray-500',
    bold: 'text-gray-400',
    classic: 'text-stone-500',
    premium: 'text-gray-400',
  }[theme]

  const buttonGradient = {
    modern: 'from-teal-500 to-cyan-500',
    bold: 'from-orange-500 to-red-500',
    classic: 'from-emerald-500 to-green-500',
    premium: 'from-amber-500 to-yellow-500',
  }[theme]

  const successTextColor = {
    modern: 'text-gray-700',
    bold: 'text-gray-200',
    classic: 'text-stone-700',
    premium: 'text-gray-200',
  }[theme]

  const successMutedColor = {
    modern: 'text-gray-500',
    bold: 'text-gray-400',
    classic: 'text-stone-500',
    premium: 'text-gray-400',
  }[theme]

  const successIconColor = {
    modern: 'text-teal-500',
    bold: 'text-orange-400',
    classic: 'text-emerald-500',
    premium: 'text-amber-400',
  }[theme]

  if (sent) {
    return (
      <div className={`rounded-2xl p-5 sm:p-6 md:p-8 text-center ${cardClass}`}>
        <CheckCircle className={`w-12 h-12 mx-auto ${successIconColor}`} />
        <p className={`text-xl font-bold mt-4 ${successTextColor}`}>Message Sent!</p>
        <p className={`text-sm mt-1 ${successMutedColor}`}>We&apos;ll get back to you shortly.</p>
      </div>
    )
  }

  const gradientStyle = brandGradientStyle(config)

  return (
    <form onSubmit={handleSubmit} className={`rounded-2xl p-5 sm:p-6 md:p-8 ${cardClass}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${labelColor}`}>
            Name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className={`rounded-lg px-4 py-3 text-sm w-full border focus:outline-none focus:ring-2 ${inputClass}`}
          />
        </div>
        <div>
          <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${labelColor}`}>
            Phone
          </label>
          <input
            type="tel"
            required
            value={phone}
            onChange={handlePhoneChange}
            placeholder="(555) 123-4567"
            className={`rounded-lg px-4 py-3 text-sm w-full border focus:outline-none focus:ring-2 ${inputClass}`}
          />
        </div>
      </div>

      <div className="mt-4">
        <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${labelColor}`}>
          Email
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className={`rounded-lg px-4 py-3 text-sm w-full border focus:outline-none focus:ring-2 ${inputClass}`}
        />
      </div>

      {services && services.length > 0 && (
        <div className="mt-4">
          <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${labelColor}`}>
            Service Needed
          </label>
          <select
            value={service}
            onChange={(e) => setService(e.target.value)}
            className={`rounded-lg px-4 py-3 text-sm w-full border focus:outline-none focus:ring-2 ${inputClass}`}
          >
            <option value="">Select a service...</option>
            {services.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mt-4">
        <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${labelColor}`}>
          Timeline
        </label>
        <select
          value={timeline}
          onChange={(e) => setTimeline(e.target.value)}
          className={`rounded-lg px-4 py-3 text-sm w-full border focus:outline-none focus:ring-2 ${inputClass}`}
        >
          <option value="">Select timeline...</option>
          <option value="asap">ASAP — Emergency</option>
          <option value="this-week">This Week</option>
          <option value="this-month">This Month</option>
          <option value="exploring">Just Exploring Options</option>
        </select>
      </div>

      <div className="mt-4">
        <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${labelColor}`}>
          Project Details
        </label>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={3}
          placeholder="Tell us about your project..."
          className={`rounded-lg px-4 py-3 text-sm w-full border focus:outline-none focus:ring-2 resize-none ${inputClass}`}
        />
      </div>

      <button
        type="submit"
        disabled={sending}
        className={`w-full mt-6 py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all duration-200 hover:opacity-90 disabled:opacity-60 ${
          gradientStyle ? '' : `bg-gradient-to-r ${buttonGradient}`
        }`}
        style={gradientStyle || undefined}
      >
        {sending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            Send Message
          </>
        )}
      </button>
    </form>
  )
}
