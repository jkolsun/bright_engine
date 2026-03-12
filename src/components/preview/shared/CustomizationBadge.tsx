'use client'

import { Sparkles } from 'lucide-react'
import ScrollReveal from './ScrollReveal'

interface CustomizationBadgeProps {
  accent: string
  isDark?: boolean
  companyName?: string
}

/**
 * Inline banner that appears between service cards.
 * Communicates to business owners that the team can customize the site further.
 */
export default function CustomizationBadge({ accent, isDark = false, companyName }: CustomizationBadgeProps) {
  return (
    <ScrollReveal animation="fade-up">
      <div
        className="relative overflow-hidden my-8 sm:my-12"
        style={{
          background: isDark
            ? `linear-gradient(135deg, rgba(255,255,255,0.03) 0%, ${accent}10 100%)`
            : `linear-gradient(135deg, ${accent}06 0%, ${accent}14 100%)`,
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : `${accent}20`}`,
          borderRadius: 16,
          padding: 'clamp(24px, 4vw, 40px)',
        }}
      >
        {/* Decorative corner accent */}
        <div
          className="absolute top-0 right-0 w-32 h-32"
          style={{
            background: `radial-gradient(circle at 100% 0%, ${accent}15 0%, transparent 70%)`,
          }}
        />

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Icon */}
          <div
            className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-xl"
            style={{
              background: isDark ? `${accent}20` : `${accent}15`,
            }}
          >
            <Sparkles size={22} style={{ color: accent }} />
          </div>

          {/* Text */}
          <div className="flex-1">
            <p
              className="text-base sm:text-lg font-semibold mb-1"
              style={{ color: isDark ? '#fff' : '#1a1a1a' }}
            >
              This is just the starting point
            </p>
            <p
              className="text-sm leading-relaxed"
              style={{ color: isDark ? 'rgba(255,255,255,0.5)' : '#666', maxWidth: 520 }}
            >
              Our design team will add your real photos, match your brand colors,
              and perfect every detail to make {companyName ? `${companyName}'s` : 'your'} site truly stunning.
            </p>
          </div>
        </div>
      </div>
    </ScrollReveal>
  )
}
