'use client'

import type { TemplateTheme, IndustryConfig } from '../config/template-types'
import ScrollReveal from './ScrollReveal'

interface VideoPlaceholderProps {
  photo?: string
  theme: TemplateTheme
  onCTAClick: () => void
  config: IndustryConfig
}

const badgeStyles: Record<TemplateTheme, { pill: string; heading: string; accent: string; gradient: string }> = {
  modern: {
    pill: 'bg-teal-50 text-teal-700 border border-teal-200',
    heading: 'text-gray-900',
    accent: 'text-teal-500',
    gradient: 'from-gray-100 to-gray-200',
  },
  bold: {
    pill: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
    heading: 'text-white',
    accent: 'text-orange-500',
    gradient: 'from-gray-800 to-gray-900',
  },
  classic: {
    pill: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    heading: 'text-stone-900',
    accent: 'text-emerald-600',
    gradient: 'from-stone-100 to-stone-200',
  },
  premium: {
    pill: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    heading: 'text-white',
    accent: 'text-amber-500',
    gradient: 'from-gray-800 to-gray-900',
  },
}

export default function VideoPlaceholder({
  photo,
  theme,
  onCTAClick,
  config,
}: VideoPlaceholderProps) {
  const styles = badgeStyles[theme]

  return (
    <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 md:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Section heading */}
        <div className="text-center mb-8">
          <span
            className={`inline-block px-4 py-1.5 rounded-full text-sm font-medium mb-4 ${styles.pill}`}
          >
            Our Work
          </span>
          <h2 className={`text-2xl sm:text-3xl font-bold ${styles.heading}`}>
            See Our Work in Action
          </h2>
        </div>

        {/* Video container */}
        <ScrollReveal animation="zoom-in">
          <div
            className="relative rounded-2xl overflow-hidden cursor-pointer group aspect-[16/9]"
            onClick={onCTAClick}
          >
            {/* Background */}
            {photo ? (
              <img
                src={photo}
                alt="Project showcase"
                className="object-cover w-full h-full"
              />
            ) : (
              <div className={`w-full h-full bg-gradient-to-br ${styles.gradient}`} />
            )}

            {/* Dark overlay */}
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors" />

            {/* Center play button */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/90 group-hover:bg-white group-hover:scale-110 transition-all duration-300 flex items-center justify-center">
                {/* Play triangle */}
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className={`w-7 h-7 sm:w-8 sm:h-8 ${styles.accent} ml-1`}
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
