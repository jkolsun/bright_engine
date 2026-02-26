'use client'

import { useState, useEffect } from 'react'

export default function PreviewCTABanner({ previewId }: { previewId: string }) {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [bannerPrice, setBannerPrice] = useState<number>(188)

  useEffect(() => {
    fetch('/api/settings/pricing').then(r => r.ok ? r.json() : null).then(d => { if (d?.firstMonthTotal) setBannerPrice(d.firstMonthTotal) }).catch(err => console.warn('[PreviewCTA] Pricing fetch failed:', err))
  }, [previewId])

  const handleClick = async () => {
    if (loading || submitted) return
    setLoading(true)
    try {
      const selectedTemplate = (window as any).__brightSelectedTemplate || null
      const res = await fetch('/api/preview/cta-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ previewId, selectedTemplate }),
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

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0D7377] text-white shadow-lg">
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
        <div className="flex flex-col items-center gap-2 py-3 px-6">
          <span className="text-sm sm:text-base font-semibold text-center">
            Get This Site Live &mdash; ${bannerPrice}
          </span>
          <button
            onClick={handleClick}
            disabled={loading}
            className="bg-white text-[#0D7377] font-semibold text-sm px-8 py-2.5 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-70 whitespace-nowrap"
          >
            {loading ? 'Sending...' : 'Get Started'}
          </button>
        </div>
      )}
    </div>
  )
}
