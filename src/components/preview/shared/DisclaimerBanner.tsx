'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import type { TemplateVariant } from '../config/template-types'

const variantStyles: Record<TemplateVariant, { wrapper: string; text: string; bold: string; close: string }> = {
  modern: {
    wrapper: 'bg-white border-b border-gray-200 shadow-sm',
    text: 'text-gray-600',
    bold: 'text-gray-900',
    close: 'text-gray-400 hover:text-gray-600',
  },
  bold: {
    wrapper: 'bg-gray-950 border-b border-gray-800',
    text: 'text-gray-400',
    bold: 'text-white',
    close: 'text-gray-500 hover:text-gray-300',
  },
  classic: {
    wrapper: 'bg-amber-50 border-b border-amber-200',
    text: 'text-stone-600',
    bold: 'text-stone-900',
    close: 'text-stone-400 hover:text-stone-600',
  },
  premium: {
    wrapper: 'bg-gray-950 border-b border-amber-500/20',
    text: 'text-gray-400',
    bold: 'text-amber-400',
    close: 'text-gray-500 hover:text-gray-300',
  },
  'modern-b': {
    wrapper: 'bg-white border-b border-gray-200 shadow-sm',
    text: 'text-gray-600',
    bold: 'text-gray-900',
    close: 'text-gray-400 hover:text-gray-600',
  },
  'bold-b': {
    wrapper: 'bg-gray-950 border-b border-gray-800',
    text: 'text-gray-400',
    bold: 'text-white',
    close: 'text-gray-500 hover:text-gray-300',
  },
  'classic-b': {
    wrapper: 'bg-green-50 border-b border-green-200',
    text: 'text-stone-600',
    bold: 'text-stone-900',
    close: 'text-stone-400 hover:text-stone-600',
  },
  'premium-b': {
    wrapper: 'bg-gray-950 border-b border-sky-500/20',
    text: 'text-gray-400',
    bold: 'text-sky-400',
    close: 'text-gray-500 hover:text-gray-300',
  },
  'premium-c': {
    wrapper: 'bg-stone-50 border-b border-emerald-200',
    text: 'text-stone-600',
    bold: 'text-emerald-700',
    close: 'text-stone-400 hover:text-stone-600',
  },
}

export default function DisclaimerBanner({ variant, companyName }: { variant: TemplateVariant; companyName: string }) {
  const [visible, setVisible] = useState(true)
  if (!visible) return null

  const s = variantStyles[variant]

  return (
    <div className={`${s.wrapper} py-3 px-4 sticky top-0 z-50`}>
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        <p className={`${s.text} text-sm text-center flex-1`}>
          This is a personalized preview of what we can build for{' '}
          <span className={`${s.bold} font-semibold`}>{companyName}</span>.
          Our dev team will work directly with you to customize every detail.{' '}
          <span className={`${s.bold} font-bold`}>$149 to go live</span> • Expires in 7 days
        </p>
        <button onClick={() => setVisible(false)} className={`${s.close} flex-shrink-0 transition-colors`} aria-label="Dismiss">
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
