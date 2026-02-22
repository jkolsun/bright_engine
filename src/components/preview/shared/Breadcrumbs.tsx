'use client'

import type { TemplateTheme } from '../config/template-types'

interface BreadcrumbsProps {
  currentPage: string
  theme: TemplateTheme
  onNavigateHome: () => void
}

export default function Breadcrumbs({ currentPage, theme, onNavigateHome }: BreadcrumbsProps) {
  const homeColor = {
    modern: 'text-teal-600',
    bold: 'text-orange-400',
    classic: 'text-emerald-600',
    premium: 'text-amber-400',
  }[theme]

  const separatorColor = {
    modern: 'text-gray-300',
    bold: 'text-gray-600',
    classic: 'text-stone-300',
    premium: 'text-gray-600',
  }[theme]

  const currentColor = {
    modern: 'text-gray-500',
    bold: 'text-gray-400',
    classic: 'text-stone-500',
    premium: 'text-gray-400',
  }[theme]

  const displayName = currentPage.charAt(0).toUpperCase() + currentPage.slice(1)

  return (
    <nav className="px-4 sm:px-6 md:px-8 py-2">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-2 text-xs sm:text-sm">
          <span
            onClick={onNavigateHome}
            className={`cursor-pointer hover:underline ${homeColor}`}
          >
            Home
          </span>
          <span className={separatorColor}>/</span>
          <span className={currentColor}>{displayName}</span>
        </div>
      </div>
    </nav>
  )
}
