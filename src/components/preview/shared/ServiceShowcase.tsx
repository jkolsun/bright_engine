import { Check, Wrench, ArrowRight } from 'lucide-react'
import type { TemplateVariant } from '../config/template-types'

interface ServiceShowcaseProps {
  variant: TemplateVariant
  services: string[]
}

export default function ServiceShowcase({ variant, services }: ServiceShowcaseProps) {
  if (services.length === 0) return null
  const items = services.slice(0, 6)

  if (variant === 'modern') {
    return (
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">Our Services</h2>
          <p className="text-gray-500 text-center mb-10">What we bring to the table</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((service, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                <div className="h-1 bg-gradient-to-r from-blue-500 to-purple-500" />
                <div className="p-6">
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">{service}</h3>
                  <p className="text-gray-500 text-sm">Professional and reliable service tailored to your needs.</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (variant === 'bold') {
    return (
      <section className="py-16 px-4 bg-gray-950">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-2 text-center">What We Do</h2>
          <p className="text-gray-400 text-center mb-10">Services you can count on</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((service, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-lg p-6 hover:border-gray-600 transition-colors">
                <div className="flex items-start gap-3">
                  <Wrench size={20} className="text-orange-500 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-bold text-white mb-1">{service}</h3>
                    <p className="text-gray-400 text-sm">Expert service, guaranteed results.</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (variant === 'premium') {
    return (
      <section className="py-16 px-4 bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <p className="text-sm uppercase tracking-widest text-amber-400/70 text-center mb-2">Our Expertise</p>
          <h2 className="text-3xl font-light text-white mb-10 text-center">Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((service, i) => (
              <div key={i} className="flex items-center gap-4 bg-gray-950/50 border border-gray-800 rounded-lg p-5 hover:border-amber-500/30 transition-colors">
                <ArrowRight size={16} className="text-amber-400 flex-shrink-0" />
                <span className="text-white">{service}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  // classic
  return (
    <section className="py-16 px-4 bg-stone-50">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-stone-900 mb-8 text-center">Our Services</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((service, i) => (
            <div key={i} className="bg-white rounded-lg border border-stone-200 p-5 flex items-start gap-3">
              <Check size={20} className="text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-stone-900 mb-1">{service}</h3>
                <p className="text-stone-500 text-sm">Professional and reliable service.</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
