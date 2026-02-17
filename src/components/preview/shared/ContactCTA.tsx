import { Phone, Mail } from 'lucide-react'
import type { TemplateVariant } from '../config/template-types'

interface ContactCTAProps {
  variant: TemplateVariant
  phone: string
  email: string
  ctaText: string
  gradient: string
  onCTAClick: () => Promise<void>
  onCallClick: () => Promise<void>
}

export default function ContactCTA({ variant, phone, email, ctaText, gradient, onCTAClick, onCallClick }: ContactCTAProps) {

  if (variant === 'modern') {
    return (
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Ready to Get Started?</h2>
          <p className="text-gray-500 mb-8">Contact us today for a free estimate on your project</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={`tel:${phone}`} onClick={onCallClick} className="inline-flex items-center justify-center gap-2 bg-gray-900 text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-gray-800 transition-colors">
              <Phone size={20} />
              {phone || 'Call Now'}
            </a>
            <button onClick={onCTAClick} className="inline-flex items-center justify-center gap-2 border-2 border-gray-900 text-gray-900 px-8 py-4 rounded-full font-semibold text-lg hover:bg-gray-900 hover:text-white transition-colors">
              {ctaText}
            </button>
          </div>
        </div>
      </section>
    )
  }

  if (variant === 'bold') {
    return (
      <section className={`py-16 px-4 bg-gradient-to-br ${gradient}`}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-black text-white mb-3">Ready to Get Started?</h2>
          <p className="text-white/70 text-lg mb-8">Contact us today — we respond fast</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={`tel:${phone}`} onClick={onCallClick} className="inline-flex items-center justify-center gap-2 bg-white text-gray-900 px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition-colors">
              <Phone size={20} />
              {phone || 'Call Now'}
            </a>
            {email && (
              <a href={`mailto:${email}`} className="inline-flex items-center justify-center gap-2 border-2 border-white text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white hover:text-gray-900 transition-colors">
                <Mail size={20} />
                Email Us
              </a>
            )}
          </div>
        </div>
      </section>
    )
  }

  if (variant === 'premium') {
    return (
      <section className="py-16 px-4 bg-gray-950">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm uppercase tracking-widest text-amber-400/70 mb-2">Get in Touch</p>
          <h2 className="text-3xl font-light text-white mb-8">Start Your Project Today</h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={`tel:${phone}`} onClick={onCallClick} className="inline-flex items-center justify-center gap-2 bg-amber-500 text-black px-8 py-4 rounded-lg font-semibold text-lg hover:bg-amber-400 transition-colors">
              <Phone size={20} />
              {phone || 'Call Now'}
            </a>
            <button onClick={onCTAClick} className="inline-flex items-center justify-center gap-2 border border-amber-500/50 text-amber-400 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-amber-500 hover:text-black transition-colors">
              {ctaText}
            </button>
          </div>
        </div>
      </section>
    )
  }

  // classic
  return (
    <section className={`py-16 px-4 bg-gradient-to-br ${gradient} text-white`}>
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-3">Ready to Get Started?</h2>
        <p className="text-lg text-white/80 mb-8">Contact us today for a free estimate on your project</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href={`tel:${phone}`} onClick={onCallClick} className="inline-flex items-center justify-center gap-2 bg-white text-gray-900 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors">
            <Phone size={20} />
            {phone || 'Call Now'}
          </a>
          {email && (
            <a href={`mailto:${email}`} className="inline-flex items-center justify-center gap-2 border-2 border-white text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white hover:text-gray-900 transition-colors">
              <Mail size={20} />
              Email Us
            </a>
          )}
        </div>
      </div>
    </section>
  )
}
