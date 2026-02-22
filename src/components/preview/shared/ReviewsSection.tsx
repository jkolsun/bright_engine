'use client'

import type { TemplateTheme, IndustryConfig } from '../config/template-types'
import ScrollReveal from './ScrollReveal'
import { Star } from 'lucide-react'

interface ReviewsSectionProps {
  testimonials: Array<{ quote: string; author: string }>
  theme: TemplateTheme
  config: IndustryConfig
  location?: string
}

export default function ReviewsSection({ testimonials, theme, config, location }: ReviewsSectionProps) {
  const headingColor = {
    modern: 'text-gray-900',
    bold: 'text-white',
    classic: 'text-stone-900',
    premium: 'text-white',
  }[theme]

  const badgeClass = {
    modern: 'bg-teal-50 text-teal-700 border border-teal-200',
    bold: 'bg-orange-500/10 text-orange-400 border border-orange-500/30',
    classic: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    premium: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
  }[theme]

  const cardClass = {
    modern: 'bg-white border border-gray-100',
    bold: 'bg-gray-800/50 border border-gray-700/50',
    classic: 'bg-white border border-stone-100',
    premium: 'bg-gray-800/50 border border-gray-700/50',
  }[theme]

  const quoteColor = {
    modern: 'text-gray-600',
    bold: 'text-gray-300',
    classic: 'text-stone-600',
    premium: 'text-gray-300',
  }[theme]

  const authorColor = {
    modern: 'text-gray-900',
    bold: 'text-white',
    classic: 'text-stone-900',
    premium: 'text-white',
  }[theme]

  const locationColor = {
    modern: 'text-gray-400',
    bold: 'text-gray-500',
    classic: 'text-stone-400',
    premium: 'text-gray-500',
  }[theme]

  const accentBg = {
    modern: 'bg-teal-500',
    bold: 'bg-orange-500',
    classic: 'bg-emerald-500',
    premium: 'bg-amber-500',
  }[theme]

  return (
    <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 md:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center">
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${badgeClass}`}>
            Reviews
          </span>
          <h2 className={`text-2xl sm:text-3xl font-bold mt-3 ${headingColor}`}>
            What Our Customers Say
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-8 sm:mt-10">
          {testimonials.map((testimonial, i) => (
            <ScrollReveal key={i} animation="fade-up" delay={i * 100}>
              <div
                className={`rounded-xl p-5 sm:p-6 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 ${cardClass}`}
              >
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} size={14} className="fill-current text-amber-400" />
                  ))}
                </div>

                <p className={`italic text-sm sm:text-base mt-3 ${quoteColor}`}>
                  &ldquo;{testimonial.quote}&rdquo;
                </p>

                <div className="flex items-center gap-3 mt-4">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${accentBg}`}
                  >
                    {testimonial.author.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className={`font-semibold text-sm ${authorColor}`}>{testimonial.author}</p>
                    {location && (
                      <p className={`text-xs ${locationColor}`}>{location}</p>
                    )}
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
