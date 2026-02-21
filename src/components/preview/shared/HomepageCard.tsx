'use client'

import type { ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'

interface HomepageCardProps {
  title: string
  description: string
  icon: ReactNode
  onClick: () => void
  /** Tailwind accent class for icon bg, e.g. 'bg-emerald-50' */
  iconBgClass?: string
  /** Tailwind accent class for icon color, e.g. 'text-emerald-600' */
  iconColorClass?: string
  /** Tailwind accent class for arrow hover, e.g. 'group-hover:text-emerald-600' */
  arrowHoverClass?: string
  children?: ReactNode
}

export default function HomepageCard({
  title,
  description,
  icon,
  onClick,
  iconBgClass = 'bg-emerald-50',
  iconColorClass = 'text-emerald-600',
  arrowHoverClass = 'group-hover:text-emerald-600',
  children,
}: HomepageCardProps) {
  return (
    <button
      onClick={onClick}
      className="group bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 text-left hover:border-stone-300 hover:shadow-lg transition-all duration-300 w-full"
    >
      <div className={`w-12 h-12 rounded-xl ${iconBgClass} flex items-center justify-center mb-4 border border-stone-100`}>
        <span className={iconColorClass}>{icon}</span>
      </div>
      <h3 className="text-lg font-medium text-stone-800 mb-2">{title}</h3>
      <p className="text-sm text-stone-500 leading-relaxed mb-4">{description}</p>
      {children}
      <div className={`inline-flex items-center gap-1.5 text-sm font-medium text-stone-400 ${arrowHoverClass} transition-colors`}>
        Learn More
        <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
      </div>
    </button>
  )
}
