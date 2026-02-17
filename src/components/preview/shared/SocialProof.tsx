import { Star, Shield, Award } from 'lucide-react'
import type { TemplateVariant } from '../config/template-types'

interface SocialProofProps {
  variant: TemplateVariant
  rating?: number
  reviewCount?: number
  city: string
  state: string
}

export default function SocialProof({ variant, rating, reviewCount, city, state }: SocialProofProps) {
  const hasRating = rating && rating > 0
  const location = [city, state].filter(Boolean).join(', ')

  if (variant === 'modern') {
    return (
      <section className="py-12 px-4 border-y border-gray-100">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-8 md:gap-16">
          {hasRating && (
            <div className="flex items-center gap-2">
              <div className="flex">{renderStars(rating, 'text-yellow-500')}</div>
              <span className="text-2xl font-bold text-gray-900">{rating}</span>
              {reviewCount && <span className="text-gray-500">({reviewCount} reviews)</span>}
            </div>
          )}
          {location && (
            <div className="flex items-center gap-2">
              <Shield size={20} className="text-blue-500" />
              <span className="text-gray-700">Trusted in {location}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Award size={20} className="text-blue-500" />
            <span className="text-gray-700">Licensed & Insured</span>
          </div>
        </div>
      </section>
    )
  }

  if (variant === 'bold') {
    return (
      <section className="py-16 px-4 bg-gray-900">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          {hasRating && (
            <div>
              <div className="flex justify-center mb-2">{renderStars(rating, 'text-yellow-500')}</div>
              <p className="text-4xl font-black text-white mb-1">{rating}</p>
              <p className="text-gray-400">{reviewCount ? `${reviewCount} Reviews` : 'Star Rating'}</p>
            </div>
          )}
          <div>
            <Shield size={32} className="text-emerald-500 mx-auto mb-2" />
            <p className="text-4xl font-black text-white mb-1">100%</p>
            <p className="text-gray-400">Licensed & Insured</p>
          </div>
          {location && (
            <div>
              <Award size={32} className="text-amber-500 mx-auto mb-2" />
              <p className="text-lg font-bold text-white mb-1">Serving {location}</p>
              <p className="text-gray-400">& Surrounding Areas</p>
            </div>
          )}
        </div>
      </section>
    )
  }

  if (variant === 'premium') {
    return (
      <section className="py-14 px-4 bg-gray-950 border-t border-amber-500/10">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-10 md:gap-16">
          {hasRating && (
            <div className="text-center">
              <div className="flex justify-center mb-1">{renderStars(rating, 'text-amber-400')}</div>
              <p className="text-3xl font-light text-white">{rating}</p>
              {reviewCount && <p className="text-sm text-gray-500">{reviewCount} reviews</p>}
            </div>
          )}
          <div className="hidden md:block w-px h-12 bg-amber-500/20" />
          {location && (
            <div className="text-center">
              <p className="text-sm uppercase tracking-widest text-amber-400/70 mb-1">Serving</p>
              <p className="text-lg text-white">{location}</p>
            </div>
          )}
          <div className="hidden md:block w-px h-12 bg-amber-500/20" />
          <div className="text-center">
            <p className="text-sm uppercase tracking-widest text-amber-400/70 mb-1">Commitment</p>
            <p className="text-lg text-white">Licensed & Insured</p>
          </div>
        </div>
      </section>
    )
  }

  // classic (default)
  return (
    <section className="py-14 px-4 bg-stone-50">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold text-stone-900 text-center mb-8">Why Choose Us</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {hasRating && (
            <div className="bg-white rounded-lg border border-stone-200 p-6 text-center">
              <div className="flex justify-center mb-3">{renderStars(rating, 'text-yellow-500')}</div>
              <p className="text-2xl font-bold text-stone-900">{rating} Stars</p>
              {reviewCount && <p className="text-stone-500">{reviewCount} Google Reviews</p>}
            </div>
          )}
          <div className="bg-white rounded-lg border border-stone-200 p-6 text-center">
            <Shield size={32} className="text-stone-700 mx-auto mb-3" />
            <p className="text-lg font-bold text-stone-900">Licensed & Insured</p>
            <p className="text-stone-500">Full coverage for your peace of mind</p>
          </div>
          {location && (
            <div className="bg-white rounded-lg border border-stone-200 p-6 text-center">
              <Award size={32} className="text-stone-700 mx-auto mb-3" />
              <p className="text-lg font-bold text-stone-900">Local Experts</p>
              <p className="text-stone-500">Proudly serving {location}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function renderStars(rating: number, colorClass: string) {
  const full = Math.floor(rating)
  return Array.from({ length: 5 }, (_, i) => (
    <Star
      key={i}
      size={18}
      className={i < full ? `${colorClass} fill-current` : 'text-gray-300'}
    />
  ))
}
