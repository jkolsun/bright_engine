'use client'

import type { TemplateTheme, IndustryConfig } from '../config/template-types'
import AnimatedCounter from './AnimatedCounter'
import ScrollReveal from './ScrollReveal'
import { Star, Shield, Clock } from 'lucide-react'

interface TrustBadgesProps {
  rating?: number
  reviewCount?: number
  yearsBadge?: string
  theme: TemplateTheme
  config: IndustryConfig
}

const themeStyles: Record<TemplateTheme, { icon: string; card: string; text: string; label: string }> = {
  modern: {
    icon: 'text-teal-500',
    card: 'bg-gray-50 rounded-xl',
    text: 'text-gray-900',
    label: 'text-gray-500',
  },
  bold: {
    icon: 'text-orange-500',
    card: 'bg-gray-800/50 border border-gray-700/50 rounded-xl',
    text: 'text-white',
    label: 'text-gray-400',
  },
  classic: {
    icon: 'text-emerald-600',
    card: 'bg-stone-50 rounded-xl',
    text: 'text-stone-900',
    label: 'text-stone-500',
  },
  premium: {
    icon: 'text-amber-500',
    card: 'bg-gray-800/50 border border-gray-700/50 rounded-xl',
    text: 'text-gray-100',
    label: 'text-gray-400',
  },
}

export default function TrustBadges({
  rating,
  reviewCount,
  theme,
}: TrustBadgesProps) {
  const styles = themeStyles[theme]

  const badges: Array<{
    icon: React.ReactNode
    content: React.ReactNode
    label: string
  }> = []

  if (rating && rating > 0) {
    badges.push({
      icon: <Star size={28} className={`${styles.icon} fill-current`} />,
      content: (
        <AnimatedCounter
          value={rating}
          className={`text-2xl font-bold ${styles.text}`}
        />
      ),
      label: 'Star Rated',
    })
  }

  if (reviewCount && reviewCount > 0) {
    badges.push({
      icon: <Star size={28} className={styles.icon} />,
      content: (
        <AnimatedCounter
          value={reviewCount}
          suffix="+"
          className={`text-2xl font-bold ${styles.text}`}
        />
      ),
      label: 'Reviews',
    })
  }

  badges.push({
    icon: <Shield size={28} className={styles.icon} />,
    content: (
      <span className={`text-lg font-bold ${styles.text}`}>Licensed &amp; Insured</span>
    ),
    label: '',
  })

  badges.push({
    icon: <Clock size={28} className={styles.icon} />,
    content: (
      <span className={`text-lg font-bold ${styles.text}`}>Same-Day Response</span>
    ),
    label: '',
  })

  // Show at most 4
  const visibleBadges = badges.slice(0, 4)

  return (
    <section className="py-10 sm:py-12 px-4 sm:px-6 md:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {visibleBadges.map((badge, i) => (
            <ScrollReveal key={i} animation="fade-up" delay={i * 100}>
              <div className={`${styles.card} p-5 sm:p-6 text-center flex flex-col items-center gap-2`}>
                {badge.icon}
                <div>{badge.content}</div>
                {badge.label && (
                  <p className={`text-sm ${styles.label}`}>{badge.label}</p>
                )}
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
