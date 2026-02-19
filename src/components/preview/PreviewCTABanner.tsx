'use client'

import { useState, useEffect } from 'react'

export default function PreviewCTABanner({ previewId }: { previewId: string }) {
  const [dismissed, setDismissed] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const wasDismissed = sessionStorage.getItem(`cta_dismissed_${previewId}`)
    if (wasDismissed) setDismissed(true)
  }, [previewId])

  useEffect(() => {
    if (submitted) {
      const timer = setTimeout(() => setDismissed(true), 5000)
      return () => clearTimeout(timer)
    }
  }, [submitted])

  const handleDismiss = () => {
    setDismissed(true)
    sessionStorage.setItem(`cta_dismissed_${previewId}`, '1')
  }

  const handleClick = async () => {
    if (loading || submitted) return
    setLoading(true)
    try {
      const res = await fetch('/api/preview/cta-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ previewId }),
      })
      if (res.ok) {
        setSubmitted(true)
      }
    } catch {
      // Silently fail — don't break the preview experience
    } finally {
      setLoading(false)
    }
  }

  if (dismissed) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0D7377] text-white shadow-lg">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-3 text-white/70 hover:text-white text-xl leading-none"
        aria-label="Dismiss"
      >
        &times;
      </button>

      {submitted ? (
        <div className="flex items-center justify-center gap-2 py-4 px-6">
          <svg className="w-5 h-5 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm sm:text-base font-medium">
            Thank you for your interest! A team member will reach out shortly.
          </span>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-3 px-6 pr-10">
          <span className="text-sm sm:text-base font-semibold text-center sm:text-left">
            Get This Site Live &mdash; $149/month
          </span>
          <button
            onClick={handleClick}
            disabled={loading}
            className="bg-white text-[#0D7377] font-semibold text-sm px-6 py-2 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-70 whitespace-nowrap"
          >
            {loading ? 'Sending...' : 'Get Started'}
          </button>
        </div>
      )}
    </div>
  )
}
