import { Phone, MapPin, Star, Shield, Clock, CheckCircle, ArrowRight, Award, Users, Zap, Mail, ChevronRight } from 'lucide-react'
import type { TemplateProps } from '../config/template-types'
import DisclaimerBanner from '../shared/DisclaimerBanner'

export default function ModernTemplate({ lead, config, onCTAClick, onCallClick }: TemplateProps) {
  const services = lead.enrichedServices || []
  const photos = lead.enrichedPhotos || []
  const industryLabel = lead.industry.toLowerCase().replace(/_/g, ' ')
  const location = [lead.city, lead.state].filter(Boolean).join(', ')
  const hasRating = lead.enrichedRating && lead.enrichedRating > 0

  return (
    <div className="min-h-screen bg-white">
      <DisclaimerBanner variant="modern" companyName={lead.companyName} />

      {/* ─── Sticky Nav ─── */}
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="text-lg font-bold text-gray-900 tracking-tight">{lead.companyName}</span>
          <div className="flex items-center gap-3">
            {lead.phone && (
              <a href={`tel:${lead.phone}`} onClick={onCallClick} className="hidden sm:inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                <Phone size={14} />
                {lead.phone}
              </a>
            )}
            <button onClick={onCTAClick} className="bg-gray-900 text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-gray-800 transition-colors">
              Get a Quote
            </button>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative py-24 md:py-32 px-4 bg-white overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-blue-50 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative max-w-5xl mx-auto text-center">
          {hasRating && (
            <div className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-4 py-2 mb-8">
              <div className="flex">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} size={14} className={i < Math.floor(lead.enrichedRating!) ? 'text-yellow-500 fill-current' : 'text-gray-300'} />
                ))}
              </div>
              <span className="text-sm font-medium text-gray-700">{lead.enrichedRating} stars</span>
              {lead.enrichedReviews && <span className="text-sm text-gray-400">({lead.enrichedReviews} reviews)</span>}
            </div>
          )}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 tracking-tight leading-[1.1]">
            {lead.companyName}
          </h1>
          <div className="w-20 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 mx-auto mb-6 rounded-full" />
          <p className="text-xl md:text-2xl text-gray-500 mb-4 max-w-2xl mx-auto leading-relaxed">{config.tagline}</p>
          {location && (
            <p className="text-gray-400 mb-10 flex items-center justify-center gap-1.5">
              <MapPin size={16} />
              Serving {location} and surrounding areas
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={`tel:${lead.phone}`}
              onClick={onCallClick}
              className="inline-flex items-center justify-center gap-2 bg-gray-900 text-white px-10 py-4 rounded-full font-semibold text-lg hover:bg-gray-800 transition-all hover:shadow-lg"
            >
              <Phone size={20} />
              Call Now
            </a>
            <button
              onClick={onCTAClick}
              className="inline-flex items-center justify-center gap-2 border-2 border-gray-200 text-gray-700 px-10 py-4 rounded-full font-semibold text-lg hover:border-gray-900 hover:text-gray-900 transition-all"
            >
              {config.ctaText}
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* ─── Trust Bar ─── */}
      <section className="py-10 px-4 border-y border-gray-100 bg-gray-50/50">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
              <Shield size={22} className="text-blue-600" />
            </div>
            <p className="font-semibold text-gray-900">Licensed & Insured</p>
            <p className="text-sm text-gray-500">Full coverage for your peace of mind</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
              <Award size={22} className="text-green-600" />
            </div>
            <p className="font-semibold text-gray-900">Top Rated</p>
            <p className="text-sm text-gray-500">{hasRating ? `${lead.enrichedRating}-star average rating` : 'Consistently 5-star service'}</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center">
              <Clock size={22} className="text-purple-600" />
            </div>
            <p className="font-semibold text-gray-900">Fast Response</p>
            <p className="text-sm text-gray-500">Quick turnaround on every project</p>
          </div>
        </div>
      </section>

      {/* ─── Services ─── */}
      {services.length > 0 && (
        <section className="py-20 px-4 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-2">What We Offer</p>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Our Services</h2>
              <p className="text-gray-500 max-w-xl mx-auto">Professional {industryLabel} services tailored to your specific needs and budget.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.slice(0, 6).map((service, i) => (
                <div key={i} className="group bg-white rounded-2xl border border-gray-100 p-7 hover:shadow-xl hover:border-gray-200 transition-all duration-300">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                    <CheckCircle size={22} className="text-white" />
                  </div>
                  <h3 className="font-bold text-lg text-gray-900 mb-2">{service}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">Expert {service.toLowerCase()} solutions delivered with precision, quality materials, and attention to detail.</p>
                  <div className="mt-4 flex items-center gap-1 text-blue-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Learn more <ChevronRight size={14} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── How It Works ─── */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-2">Simple Process</p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">How It Works</h2>
            <p className="text-gray-500">Three simple steps to get your project started.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Get in Touch', desc: `Call us or request a quote online. We'll discuss your ${industryLabel} needs and schedule a time that works for you.` },
              { step: '2', title: 'Free Consultation', desc: `Our team will assess your project, provide expert recommendations, and deliver a transparent, no-obligation estimate.` },
              { step: '3', title: 'We Get to Work', desc: `Once approved, our skilled professionals handle everything from start to finish with quality craftsmanship guaranteed.` },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-16 h-16 rounded-full bg-gray-900 text-white text-2xl font-bold flex items-center justify-center mx-auto mb-5">
                  {item.step}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── About ─── */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
            <div className="lg:col-span-3">
              <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-2">About Us</p>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">Your Trusted {industryLabel.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Professionals</h2>
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  At {lead.companyName}, we believe every client deserves exceptional {industryLabel} service delivered with integrity and professionalism.
                  {location ? ` Based in ${location}, we've built our reputation on honest work, transparent pricing, and results that speak for themselves.` : ' We\'ve built our reputation on honest work, transparent pricing, and results that speak for themselves.'}
                </p>
                <p>
                  Our team of experienced professionals is fully licensed and insured, bringing deep expertise to every project — no matter the size.
                  From initial consultation to final walkthrough, we keep you informed and ensure complete satisfaction.
                </p>
                <p>
                  We use quality materials sourced from trusted suppliers and stand behind every job we complete.
                  When you choose {lead.companyName}, you&apos;re choosing a partner who cares about your property as much as you do.
                </p>
              </div>
              <div className="mt-8 flex flex-wrap gap-6">
                <div>
                  <p className="text-3xl font-bold text-gray-900">{hasRating ? lead.enrichedRating : '5.0'}</p>
                  <p className="text-sm text-gray-500">Star Rating</p>
                </div>
                {lead.enrichedReviews && (
                  <div>
                    <p className="text-3xl font-bold text-gray-900">{lead.enrichedReviews}+</p>
                    <p className="text-sm text-gray-500">Reviews</p>
                  </div>
                )}
                <div>
                  <p className="text-3xl font-bold text-gray-900">100%</p>
                  <p className="text-sm text-gray-500">Satisfaction</p>
                </div>
              </div>
            </div>
            <div className="lg:col-span-2">
              <div className="bg-gray-50 rounded-2xl border border-gray-100 p-8 sticky top-24">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Contact Us</h3>
                <div className="space-y-4">
                  {lead.phone && (
                    <a href={`tel:${lead.phone}`} onClick={onCallClick} className="flex items-center gap-3 text-gray-600 hover:text-gray-900 transition-colors">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <Phone size={18} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Phone</p>
                        <p className="font-medium">{lead.phone}</p>
                      </div>
                    </a>
                  )}
                  {lead.email && (
                    <a href={`mailto:${lead.email}`} className="flex items-center gap-3 text-gray-600 hover:text-gray-900 transition-colors">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <Mail size={18} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Email</p>
                        <p className="font-medium">{lead.email}</p>
                      </div>
                    </a>
                  )}
                  {lead.enrichedAddress && (
                    <div className="flex items-start gap-3 text-gray-600">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <MapPin size={18} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Address</p>
                        <p className="font-medium">{lead.enrichedAddress}</p>
                      </div>
                    </div>
                  )}
                </div>
                <button onClick={onCTAClick} className="w-full mt-6 bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors">
                  {config.ctaText}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Photo Gallery ─── */}
      {photos.length > 0 && (
        <section className="py-20 px-4 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-2">Portfolio</p>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Our Recent Work</h2>
              <p className="text-gray-500">See the quality and craftsmanship we bring to every project.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.slice(0, 8).map((photo, i) => (
                <div key={i} className="group aspect-square bg-gray-200 rounded-2xl overflow-hidden">
                  <img src={photo} alt={`${lead.companyName} project ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Service Area ─── */}
      {location && (
        <section className="py-20 px-4 bg-white">
          <div className="max-w-4xl mx-auto text-center">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-6">
              <MapPin size={28} className="text-blue-600" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Serving {location}</h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto mb-8">
              {lead.companyName} proudly serves {lead.city} and the greater {lead.state} area.
              We&apos;re your local {industryLabel} experts — always nearby and ready to help.
            </p>
            <div className="inline-flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-full px-6 py-3">
              <Users size={18} className="text-blue-600" />
              <span className="text-gray-700 font-medium">Locally owned and operated</span>
            </div>
          </div>
        </section>
      )}

      {/* ─── Final CTA ─── */}
      <section className={`py-20 px-4 bg-gradient-to-br ${config.gradient}`}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to Get Started?</h2>
          <p className="text-xl text-white/80 mb-10 max-w-xl mx-auto">
            Get a free estimate on your project today. No obligation, no pressure — just honest advice from local professionals.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={`tel:${lead.phone}`}
              onClick={onCallClick}
              className="inline-flex items-center justify-center gap-2 bg-white text-gray-900 px-10 py-4 rounded-full font-bold text-lg hover:bg-gray-100 transition-colors shadow-lg"
            >
              <Phone size={20} />
              {lead.phone || 'Call Now'}
            </a>
            <button
              onClick={onCTAClick}
              className="inline-flex items-center justify-center gap-2 border-2 border-white text-white px-10 py-4 rounded-full font-bold text-lg hover:bg-white hover:text-gray-900 transition-colors"
            >
              {config.ctaText}
            </button>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="bg-gray-900 py-14 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
            <div>
              <h3 className="text-white font-bold text-lg mb-3">{lead.companyName}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Professional {industryLabel} services{location ? ` in ${location}` : ''}.
                Quality workmanship, honest pricing, and customer satisfaction guaranteed.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Quick Links</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-center gap-1.5"><Zap size={12} className="text-blue-400" /> Our Services</li>
                <li className="flex items-center gap-1.5"><Zap size={12} className="text-blue-400" /> About Us</li>
                <li className="flex items-center gap-1.5"><Zap size={12} className="text-blue-400" /> Contact</li>
                <li className="flex items-center gap-1.5"><Zap size={12} className="text-blue-400" /> Free Estimate</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Contact</h4>
              <div className="space-y-2 text-sm text-gray-400">
                {lead.phone && <p className="flex items-center gap-2"><Phone size={14} /> {lead.phone}</p>}
                {lead.email && <p className="flex items-center gap-2"><Mail size={14} /> {lead.email}</p>}
                {lead.enrichedAddress && <p className="flex items-center gap-2"><MapPin size={14} /> {lead.enrichedAddress}</p>}
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">&copy; {new Date().getFullYear()} {lead.companyName}. All rights reserved.</p>
            {location && <p className="text-gray-600 text-xs">Professional {industryLabel} services in {location}</p>}
          </div>
        </div>
      </footer>
    </div>
  )
}
