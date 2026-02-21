'use client'

import { ArrowLeft } from 'lucide-react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  /** Tailwind bg class for the banner, e.g. 'bg-emerald-800' */
  bgClass: string
  /** Tailwind text class for the title, e.g. 'text-white' */
  titleClass?: string
  /** Tailwind text class for subtitle/back link, e.g. 'text-emerald-200' */
  subtitleClass?: string
  /** Accent color class for hover/decoration, e.g. 'text-emerald-300' */
  accentClass?: string
  onBackClick: () => void
}

export default function PageHeader({
  title,
  subtitle,
  bgClass,
  titleClass = 'text-white',
  subtitleClass = 'text-white/60',
  accentClass = 'text-white/80',
  onBackClick,
}: PageHeaderProps) {
  return (
    <div className={`${bgClass} pt-28 pb-12 sm:pt-32 sm:pb-16 px-4 sm:px-6 md:px-8`}>
      <div className="max-w-7xl mx-auto">
        <button
          onClick={onBackClick}
          className={`inline-flex items-center gap-2 text-sm font-medium ${subtitleClass} hover:${accentClass} transition-colors mb-4`}
        >
          <ArrowLeft size={16} />
          Back to Home
        </button>
        <h1 className={`font-display text-3xl sm:text-4xl md:text-5xl font-light tracking-tight ${titleClass}`}>
          {title}
        </h1>
        {subtitle && (
          <p className={`mt-3 text-base sm:text-lg ${subtitleClass} max-w-2xl`}>{subtitle}</p>
        )}
      </div>
    </div>
  )
}
