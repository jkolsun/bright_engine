'use client'

import ScrollReveal from './ScrollReveal'
import type { TemplateTheme, IndustryConfig } from '../config/template-types'
import { brandGradientStyle } from './colorUtils'
import { ArrowRight, CheckCircle } from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Theme color mapping                                                */
/* ------------------------------------------------------------------ */

const themeColors = {
  modern: {
    accent: 'bg-teal-500',
    accentText: 'text-teal-500',
    accentBorder: 'border-teal-500',
    accentRing: 'ring-teal-500/30',
    bg: 'bg-white',
    text: 'text-gray-800',
    textMuted: 'text-gray-600',
    cardBg: 'bg-gray-50',
    cardBorder: 'border-gray-200',
    heading: 'text-gray-900',
    badgeBg: 'bg-teal-50',
    badgeText: 'text-teal-700',
    lineColor: 'bg-teal-500/30',
  },
  bold: {
    accent: 'bg-orange-500',
    accentText: 'text-orange-500',
    accentBorder: 'border-orange-500',
    accentRing: 'ring-orange-500/30',
    bg: 'bg-gray-950',
    text: 'text-gray-200',
    textMuted: 'text-gray-400',
    cardBg: 'bg-gray-900',
    cardBorder: 'border-gray-800',
    heading: 'text-white',
    badgeBg: 'bg-orange-500/10',
    badgeText: 'text-orange-400',
    lineColor: 'bg-orange-500/30',
  },
  classic: {
    accent: 'bg-emerald-500',
    accentText: 'text-emerald-600',
    accentBorder: 'border-emerald-500',
    accentRing: 'ring-emerald-500/30',
    bg: 'bg-white',
    text: 'text-stone-800',
    textMuted: 'text-stone-600',
    cardBg: 'bg-stone-50',
    cardBorder: 'border-stone-200',
    heading: 'text-stone-900',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    lineColor: 'bg-emerald-500/30',
  },
  premium: {
    accent: 'bg-amber-500',
    accentText: 'text-amber-500',
    accentBorder: 'border-amber-500',
    accentRing: 'ring-amber-500/30',
    bg: 'bg-gray-950',
    text: 'text-gray-300',
    textMuted: 'text-gray-400',
    cardBg: 'bg-gray-900',
    cardBorder: 'border-gray-800',
    heading: 'text-white',
    badgeBg: 'bg-amber-500/10',
    badgeText: 'text-amber-400',
    lineColor: 'bg-amber-500/30',
  },
} as const

/* ------------------------------------------------------------------ */
/*  1. ServiceHero                                                     */
/* ------------------------------------------------------------------ */

interface ServiceHeroProps {
  service: string
  description?: string
  photo?: string
  theme: TemplateTheme
  onCTAClick: () => void
  config: IndustryConfig
}

export function ServiceHero({ service, description, photo, theme, onCTAClick, config }: ServiceHeroProps) {
  const colors = themeColors[theme]

  return (
    <section className={`${colors.bg} py-12 sm:py-16 md:py-20 px-4 sm:px-6 md:px-8`}>
      <ScrollReveal animation="zoom-in">
        <div className="max-w-6xl mx-auto">
          {photo ? (
            <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-center">
              {/* Photo — left on desktop, top on mobile */}
              <div className="w-full md:w-1/2">
                <img
                  src={photo}
                  alt={service}
                  className="w-full aspect-[4/3] object-cover rounded-xl"
                />
              </div>

              {/* Text content — right on desktop, bottom on mobile */}
              <div className="w-full md:w-1/2 flex flex-col gap-4">
                <h2 className={`text-2xl sm:text-3xl font-bold ${colors.heading}`}>
                  {service}
                </h2>
                {description && (
                  <p className={`${colors.textMuted} text-base sm:text-lg leading-relaxed`}>
                    {description}
                  </p>
                )}
                <button
                  onClick={onCTAClick}
                  className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white font-semibold
                    min-h-[44px] min-w-[44px] transition-all duration-300 hover:shadow-lg w-fit
                    ${config.primaryHex ? '' : colors.accent}`}
                  style={config.primaryHex ? { backgroundColor: config.primaryHex } : undefined}
                >
                  Get a Free Estimate
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* No photo — full-width text with subtle gradient accent background */
            <div
              className={`rounded-xl p-8 sm:p-12 ${config.primaryHex ? '' : `${colors.badgeBg}`}`}
              style={config.primaryHex ? brandGradientStyle(config, 'to right') ?? { backgroundColor: `${config.primaryHex}10` } : undefined}
            >
              <div className="max-w-3xl">
                <h2 className={`text-2xl sm:text-3xl font-bold ${colors.heading}`}>
                  {service}
                </h2>
                {description && (
                  <p className={`${colors.textMuted} text-base sm:text-lg leading-relaxed mt-4`}>
                    {description}
                  </p>
                )}
                <button
                  onClick={onCTAClick}
                  className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white font-semibold
                    min-h-[44px] min-w-[44px] transition-all duration-300 hover:shadow-lg mt-6
                    ${config.primaryHex ? '' : colors.accent}`}
                  style={config.primaryHex ? { backgroundColor: config.primaryHex } : undefined}
                >
                  Get a Free Estimate
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </ScrollReveal>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  2. ServiceGrid                                                     */
/* ------------------------------------------------------------------ */

interface ServiceGridProps {
  services: string[]
  descriptions?: Record<string, string>
  photos?: string[]
  theme: TemplateTheme
}

export function ServiceGrid({ services, descriptions, photos, theme }: ServiceGridProps) {
  const colors = themeColors[theme]

  return (
    <section className={`${colors.bg} py-12 sm:py-16 md:py-20 px-4 sm:px-6 md:px-8`}>
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {services.map((service, i) => {
            const hasPhotoStrip = i % 3 === 0 && photos && photos[Math.floor(i / 3)]
            const photoSrc = hasPhotoStrip ? photos![Math.floor(i / 3)] : null
            const number = String(i + 1).padStart(2, '0')

            return (
              <ScrollReveal
                key={`${service}-${i}`}
                animation={i % 2 === 0 ? 'fade-left' : 'fade-right'}
                delay={i * 80}
              >
                <div
                  className={`${colors.cardBg} border ${colors.cardBorder} rounded-xl
                    hover:-translate-y-1 hover:shadow-lg transition-all duration-300
                    overflow-hidden relative`}
                >
                  {/* Photo strip for every 3rd card */}
                  {photoSrc && (
                    <img
                      src={photoSrc}
                      alt={service}
                      className="w-full aspect-[3/1] object-cover rounded-t-xl"
                    />
                  )}

                  <div className="p-5 sm:p-6 relative">
                    {/* Numbered accent in the corner */}
                    <span
                      className={`absolute top-4 right-4 text-xs font-bold ${colors.accentText} opacity-40`}
                    >
                      {number}
                    </span>

                    <h3 className={`text-lg font-semibold ${colors.heading} pr-8`}>
                      {service}
                    </h3>
                    {descriptions?.[service] && (
                      <p className={`text-sm ${colors.textMuted} mt-2 leading-relaxed`}>
                        {descriptions[service]}
                      </p>
                    )}
                  </div>
                </div>
              </ScrollReveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  3. ProcessTimeline                                                 */
/* ------------------------------------------------------------------ */

interface ProcessTimelineProps {
  steps?: Array<{ title: string; description: string }>
  theme: TemplateTheme
  config: IndustryConfig
}

const defaultSteps = [
  { title: 'Free Consultation', description: 'Tell us about your project and we\'ll provide a detailed estimate at no cost.' },
  { title: 'Custom Plan', description: 'We design a tailored approach that fits your timeline, budget, and goals.' },
  { title: 'Expert Execution', description: 'Our skilled team completes the work with attention to every detail.' },
  { title: 'Final Walkthrough', description: 'We walk through the finished project together to ensure your satisfaction.' },
]

export function ProcessTimeline({ steps, theme, config }: ProcessTimelineProps) {
  const colors = themeColors[theme]
  const resolvedSteps = steps && steps.length > 0 ? steps : defaultSteps

  return (
    <section className={`${colors.bg} py-12 sm:py-16 md:py-20 px-4 sm:px-6 md:px-8`}>
      <div className="max-w-5xl mx-auto">
        {/* Section badge + heading */}
        <div className="text-center mb-10 sm:mb-14">
          <span
            className={`inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase mb-4
              ${config.primaryHex ? '' : `${colors.badgeBg} ${colors.badgeText}`}`}
            style={config.primaryHex ? { backgroundColor: `${config.primaryHex}15`, color: config.primaryHex } : undefined}
          >
            Our Process
          </span>
          <h2 className={`text-2xl sm:text-3xl font-bold ${colors.heading}`}>
            How We Work
          </h2>
        </div>

        {/* Mobile: Vertical timeline */}
        <div className="md:hidden flex flex-col gap-0">
          {resolvedSteps.map((step, i) => (
            <ScrollReveal key={i} animation="fade-up" delay={i * 120}>
              <div className="flex gap-4 relative">
                {/* Left column: circle + connecting line */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold
                      flex-shrink-0 ${config.primaryHex ? '' : colors.accent}`}
                    style={config.primaryHex ? { backgroundColor: config.primaryHex } : undefined}
                  >
                    {i + 1}
                  </div>
                  {i < resolvedSteps.length - 1 && (
                    <div
                      className={`w-0.5 flex-1 min-h-[40px] ${config.primaryHex ? '' : colors.lineColor}`}
                      style={config.primaryHex ? { backgroundColor: `${config.primaryHex}4D` } : undefined}
                    />
                  )}
                </div>

                {/* Right column: text */}
                <div className="pb-8">
                  <h3 className={`font-semibold ${colors.heading}`}>{step.title}</h3>
                  <p className={`text-sm ${colors.textMuted} mt-1 leading-relaxed`}>
                    {step.description}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* Desktop: Horizontal timeline */}
        <div className="hidden md:block">
          <div className={`grid grid-cols-${resolvedSteps.length} gap-0 relative`}
            style={{ gridTemplateColumns: `repeat(${resolvedSteps.length}, minmax(0, 1fr))` }}
          >
            {/* Connecting line across all circles */}
            <div className="absolute top-5 left-0 right-0 flex items-center px-12">
              <div
                className={`h-0.5 w-full ${config.primaryHex ? '' : colors.lineColor}`}
                style={config.primaryHex ? { backgroundColor: `${config.primaryHex}4D` } : undefined}
              />
            </div>

            {resolvedSteps.map((step, i) => (
              <ScrollReveal key={i} animation="fade-up" delay={i * 120}>
                <div className="flex flex-col items-center text-center relative z-10">
                  {/* Numbered circle */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold
                      ${config.primaryHex ? '' : colors.accent}`}
                    style={config.primaryHex ? { backgroundColor: config.primaryHex } : undefined}
                  >
                    {i + 1}
                  </div>

                  {/* Title + description */}
                  <h3 className={`font-semibold ${colors.heading} mt-4`}>{step.title}</h3>
                  <p className={`text-sm ${colors.textMuted} mt-1 leading-relaxed max-w-[200px]`}>
                    {step.description}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  4. WhyChooseUs                                                     */
/* ------------------------------------------------------------------ */

interface WhyChooseUsProps {
  items?: Array<{ title: string; description: string }>
  photo?: string
  companyName: string
  theme: TemplateTheme
  config: IndustryConfig
}

const defaultWhyItems = [
  { title: 'Licensed & Insured', description: 'Full coverage and credentials you can verify.' },
  { title: 'Satisfaction Guaranteed', description: 'We don\'t consider the job done until you\'re happy.' },
  { title: 'Transparent Pricing', description: 'Honest quotes with no surprise fees or hidden costs.' },
]

export function WhyChooseUs({ items, photo, companyName, theme, config }: WhyChooseUsProps) {
  const colors = themeColors[theme]
  const resolvedItems = items ?? defaultWhyItems

  return (
    <section className={`${colors.bg} py-12 sm:py-16 md:py-20 px-4 sm:px-6 md:px-8`}>
      <div className="max-w-6xl mx-auto">
        {/* Section badge + heading */}
        <div className="text-center mb-10 sm:mb-14">
          <span
            className={`inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase mb-4
              ${config.primaryHex ? '' : `${colors.badgeBg} ${colors.badgeText}`}`}
            style={config.primaryHex ? { backgroundColor: `${config.primaryHex}15`, color: config.primaryHex } : undefined}
          >
            Why Us
          </span>
          <h2 className={`text-2xl sm:text-3xl font-bold ${colors.heading}`}>
            Why Choose {companyName}
          </h2>
        </div>

        {photo ? (
          /* With photo: mobile stacked, desktop 50/50 */
          <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-center">
            {/* Photo — top on mobile, right on desktop */}
            <div className="w-full md:w-1/2 md:order-2">
              <ScrollReveal animation="fade-right">
                <img
                  src={photo}
                  alt={`Why choose ${companyName}`}
                  className="w-full aspect-[4/3] object-cover rounded-xl"
                />
              </ScrollReveal>
            </div>

            {/* Items — bottom on mobile, left on desktop */}
            <div className="w-full md:w-1/2 md:order-1">
              <ScrollReveal animation="fade-left">
                <div className="flex flex-col gap-6">
                  {resolvedItems.map((item, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <CheckCircle
                        className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.primaryHex ? '' : colors.accentText}`}
                        style={config.primaryHex ? { color: config.primaryHex } : undefined}
                      />
                      <div>
                        <h3 className={`font-semibold ${colors.heading}`}>{item.title}</h3>
                        <p className={`text-sm ${colors.textMuted} mt-1 leading-relaxed`}>
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollReveal>
            </div>
          </div>
        ) : (
          /* No photo: full-width grid of items */
          <ScrollReveal animation="fade-left">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {resolvedItems.map((item, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <CheckCircle
                    className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.primaryHex ? '' : colors.accentText}`}
                    style={config.primaryHex ? { color: config.primaryHex } : undefined}
                  />
                  <div>
                    <h3 className={`font-semibold ${colors.heading}`}>{item.title}</h3>
                    <p className={`text-sm ${colors.textMuted} mt-1 leading-relaxed`}>
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollReveal>
        )}
      </div>
    </section>
  )
}
