'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { TemplateVariant } from '../config/template-types'

export default function DisclaimerBanner({ variant, companyName }: { variant: TemplateVariant; companyName: string }) {
  const [visible, setVisible] = useState(true)
  const [bannerText, setBannerText] = useState('$188 to get started')

  useEffect(() => {
    fetch('/api/settings/pricing').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.previewBannerText) setBannerText(d.previewBannerText)
      else if (d?.firstMonthTotal) setBannerText(`$${d.firstMonthTotal} to get started`)
    }).catch(err => console.warn('[DisclaimerBanner] Pricing fetch failed:', err))
  }, [])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-300">
        <button
          onClick={() => setVisible(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <div className="text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-2">Preview for {companyName}</h2>
          <p className="text-gray-600 text-sm leading-relaxed mb-4">
            This is a personalized preview of what we can build for your business.
            Our dev team will work directly with you to customize every detail.
          </p>
          <p className="text-gray-900 font-bold text-lg mb-5">
            {bannerText} <span className="text-gray-400 font-normal text-sm">• Expires in 7 days</span>
          </p>

          <button
            onClick={() => setVisible(false)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
          >
            View My Preview
          </button>
        </div>
      </div>
    </div>
  )
}
