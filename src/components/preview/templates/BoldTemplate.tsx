import { Phone, MapPin, Star, Shield, Clock, Zap, CheckCircle, ArrowRight, Award, Mail, Flame, Wrench, ThumbsUp } from 'lucide-react'
import type { TemplateProps } from '../config/template-types'
import DisclaimerBanner from '../shared/DisclaimerBanner'

export default function BoldTemplate({ lead, config, onCTAClick, onCallClick }: TemplateProps) {
  const services = lead.enrichedServices || []
  const photos = lead.enrichedPhotos || []
  const industryLabel = lead.industry.toLowerCase().replace(/_/g, ' ')
  const location = [lead.city, lead.state].filter(Boolean).join(', ')
  const hasRating = lead.enrichedRating && lead.enrichedRating > 0

  return (
    <div className="min-h-screen bg-gray-950">
      <DisclaimerBanner variant="bold" companyName={lead.companyName} />

      {/* ─── Sticky Nav ─── */}
      <nav className="sticky top-0 z-40 bg-gray-950/95 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="text-lg font-black text-white tracking-tight uppercase">{lead.companyName}</span>
          <div className="flex items-center gap-3">
            {lead.phone && (
              <a href={`tel:${lead.phone}`} onClick={onCallClick} className="hidden sm:inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
                <Phone size={14} />
                {lead.phone}
              </a>
            )}
            <button onClick={onCTAClick} className="bg-white text-gray-900 px-5 py-2 rounded-lg text-sm font-bold hover:bg-gray-100 transition-colors">
              Free Quote
            </button>
          </div>
        </div>
      </nav>

      {/* ─── Hero — dramatic full-bleed ─── */}
      <section className={`relative min-h-[70vh] flex items-center bg-gradient-to-br ${config.gradient} px-4`}>
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent" />
        <div className="relative max-w-6xl mx-auto w-full py-24">
          {hasRating && (
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-6">
              <div className="flex">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} size={14} className={i < Math.floor(lead.enrichedRating!) ? 'text-yellow-400 fill-current' : 'text-white/30'} />
                ))}
              </div>
              <span className="text-sm font-bold text-white">{lead.enrichedRating}</span>
              {lead.enrichedReviews && <span className="text-sm text-white/60">({lead.enrichedReviews} reviews)</span>}
            </div>
          )}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white mb-6 tracking-tight leading-[0.95]">
            {lead.companyName}
          </h1>
          <p className="text-xl md:text-2xl text-white/70 mb-10 max-w-2xl leading-relaxed">{config.tagline}</p>
          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href={`tel:${lead.phone}`}
              onClick={onCallClick}
              className="inline-flex items-center justify-center gap-2 bg-white text-gray-900 px-10 py-5 rounded-lg font-black text-lg hover:bg-gray-100 transition-all shadow-2xl"
            >
              <Phone size={22} />
              Call Now
            </a>
            <button
              onClick={onCTAClick}
              className="inline-flex items-center justify-center gap-2 border-2 border-white text-white px-10 py-5 rounded-lg font-bold text-lg hover:bg-white hover:text-gray-900 transition-all"
            >
              {config.ctaText}
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </section>

      {/* ─── Stats Row ─── */}
      <section className="py-14 px-4 bg-gray-900 border-y border-gray-800">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {hasRating && (
            <div>
              <p className="text-4xl md:text-5xl font-black text-white mb-1">{lead.enrichedRating}</p>
              <div className="flex justify-center mb-2">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} size={14} className={i < Math.floor(lead.enrichedRating!) ? 'text-yellow-500 fill-current' : 'text-gray-600'} />
                ))}
              </div>
              <p className="text-sm text-gray-500 uppercase tracking-wider">Star Rating</p>
            </div>
          )}
          {lead.enrichedReviews && (
            <div>
              <p className="text-4xl md:text-5xl font-black text-white mb-1">{lead.enrichedReviews}+</p>
              <p className="text-sm text-gray-500 uppercase tracking-wider mt-3">Reviews</p>
            </div>
          )}
          <div>
            <p className="text-4xl md:text-5xl font-black text-white mb-1">100%</p>
            <p className="text-sm text-gray-500 uppercase tracking-wider mt-3">Licensed & Insured</p>
          </div>
          <div>
            <p className="text-4xl md:text-5xl font-black text-white mb-1">24/7</p>
            <p className="text-sm text-gray-500 uppercase tracking-wider mt-3">Available</p>
          </div>
        </div>
      </section>

      {/* ─── Services ─── */}
      {services.length > 0 && (
        <section className="py-20 px-4 bg-gray-950">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <p className="text-sm font-bold text-orange-500 uppercase tracking-wider mb-2">Our Expertise</p>
              <h2 className="text-3xl md:text-4xl font-black text-white mb-3">What We Do</h2>
              <p className="text-gray-400 max-w-xl mx-auto">Expert {industryLabel} services — done right, on time, every time.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {services.slice(0, 6).map((service, i) => (
                <div key={i} className="group bg-gray-900 border border-gray-800 rounded-xl p-7 hover:border-orange-500/50 transition-all duration-300">
                  <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center mb-5 group-hover:bg-orange-500/20 transition-colors">
                    <Wrench size={22} className="text-orange-500" />
                  </div>
                  <h3 className="font-bold text-lg text-white mb-2">{service}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">Professional {service.toLowerCase()} with guaranteed quality and competitive pricing.</p>
                  <div className="mt-4 flex items-center gap-1 text-orange-500 text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                    Get a quote <ArrowRight size={14} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Why Choose Us ─── */}
      <section className="py-20 px-4 bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-bold text-orange-500 uppercase tracking-wider mb-2">The Difference</p>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-3">Why Choose {lead.companyName}?</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Flame, title: 'Fast Response', desc: `We understand urgency. ${lead.companyName} responds quickly and gets to work fast — because your time matters.` },
              { icon: Shield, title: 'Quality Guaranteed', desc: 'Every project is backed by our satisfaction guarantee. We use premium materials and expert techniques on every job.' },
              { icon: ThumbsUp, title: 'Fair & Transparent', desc: 'No hidden fees, no surprises. You get honest pricing upfront with a detailed estimate before any work begins.' },
            ].map((item, i) => (
              <div key={i} className="bg-gray-950 border border-gray-800 rounded-xl p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mx-auto mb-5">
                  <item.icon size={28} className="text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                <p className="text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── About ─── */}
      <section className="py-20 px-4 bg-gray-950">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-sm font-bold text-orange-500 uppercase tracking-wider mb-2">About Us</p>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-6">Built on Hard Work & Results</h2>
            <div className="space-y-4 text-gray-400 leading-relaxed">
              <p>
                {lead.companyName} isn&apos;t just another {industryLabel} company.
                {location ? ` We're a team of dedicated professionals based in ${location} who take pride in every single job.` : ` We're a team of dedicated professionals who take pride in every single job.`}
              </p>
              <p>
                From emergency calls to planned projects, we bring the same level of intensity and commitment.
                Our crew shows up on time, works efficiently, and doesn&apos;t leave until the job is done right.
              </p>
              <p>
                Fully licensed, fully insured, and fully committed to your satisfaction.
                That&apos;s the {lead.companyName} promise.
              </p>
            </div>
            <a
              href={`tel:${lead.phone}`}
              onClick={onCallClick}
              className="inline-flex items-center gap-2 mt-8 bg-white text-gray-900 px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition-colors"
            >
              <Phone size={20} />
              Call Us Now
            </a>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
            <h3 className="text-xl font-bold text-white mb-6">Get In Touch</h3>
            <div className="space-y-5">
              {lead.phone && (
                <a href={`tel:${lead.phone}`} onClick={onCallClick} className="flex items-center gap-4 text-gray-300 hover:text-white transition-colors">
                  <div className="w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0">
                    <Phone size={20} className="text-orange-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Phone</p>
                    <p className="font-bold text-lg">{lead.phone}</p>
                  </div>
                </a>
              )}
              {lead.email && (
                <a href={`mailto:${lead.email}`} className="flex items-center gap-4 text-gray-300 hover:text-white transition-colors">
                  <div className="w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0">
                    <Mail size={20} className="text-orange-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Email</p>
                    <p className="font-bold">{lead.email}</p>
                  </div>
                </a>
              )}
              {lead.enrichedAddress && (
                <div className="flex items-start gap-4 text-gray-300">
                  <div className="w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0">
                    <MapPin size={20} className="text-orange-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Location</p>
                    <p className="font-bold">{lead.enrichedAddress}</p>
                  </div>
                </div>
              )}
            </div>
            <button onClick={onCTAClick} className="w-full mt-6 bg-orange-500 text-white py-4 rounded-lg font-bold text-lg hover:bg-orange-600 transition-colors">
              {config.ctaText}
            </button>
          </div>
        </div>
      </section>

      {/* ─── Photo Gallery ─── */}
      {photos.length > 0 && (
        <section className="py-20 px-4 bg-gray-900">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <p className="text-sm font-bold text-orange-500 uppercase tracking-wider mb-2">Our Work</p>
              <h2 className="text-3xl md:text-4xl font-black text-white mb-3">Results Speak Louder</h2>
              <p className="text-gray-400">See what {lead.companyName} can do for you.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {photos.slice(0, 8).map((photo, i) => (
                <div key={i} className="group aspect-square bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-orange-500/50 transition-colors">
                  <img src={photo} alt={`${lead.companyName} project ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Emergency / Fast Response Strip ─── */}
      <section className="py-10 px-4 bg-orange-500">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <Zap size={28} className="text-white" />
            </div>
            <div>
              <p className="text-xl font-black text-white">Need Help Fast?</p>
              <p className="text-white/80">We respond quickly — call us anytime for fast, reliable service.</p>
            </div>
          </div>
          <a
            href={`tel:${lead.phone}`}
            onClick={onCallClick}
            className="inline-flex items-center gap-2 bg-white text-gray-900 px-8 py-4 rounded-lg font-black text-lg hover:bg-gray-100 transition-colors flex-shrink-0"
          >
            <Phone size={20} />
            {lead.phone || 'Call Now'}
          </a>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className={`py-20 px-4 bg-gradient-to-br ${config.gradient}`}>
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-black text-white mb-4">Ready to Get Started?</h2>
          <p className="text-xl text-white/70 mb-10 max-w-xl mx-auto">
            Don&apos;t wait — contact {lead.companyName} today for a free, no-obligation estimate.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={`tel:${lead.phone}`}
              onClick={onCallClick}
              className="inline-flex items-center justify-center gap-2 bg-white text-gray-900 px-10 py-5 rounded-lg font-black text-lg hover:bg-gray-100 transition-colors shadow-2xl"
            >
              <Phone size={22} />
              {lead.phone || 'Call Now'}
            </a>
            <button
              onClick={onCTAClick}
              className="inline-flex items-center justify-center gap-2 border-2 border-white text-white px-10 py-5 rounded-lg font-bold text-lg hover:bg-white hover:text-gray-900 transition-colors"
            >
              {config.ctaText}
            </button>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="bg-black py-14 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
            <div>
              <h3 className="text-white font-black text-lg uppercase tracking-wider mb-3">{lead.companyName}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Professional {industryLabel} services{location ? ` serving ${location}` : ''}.
                Licensed, insured, and committed to delivering results.
              </p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-3">Services</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                {services.slice(0, 4).map((s, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <CheckCircle size={12} className="text-orange-500" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-3">Contact</h4>
              <div className="space-y-2 text-sm text-gray-500">
                {lead.phone && <p className="flex items-center gap-2"><Phone size={14} className="text-orange-500" /> {lead.phone}</p>}
                {lead.email && <p className="flex items-center gap-2"><Mail size={14} className="text-orange-500" /> {lead.email}</p>}
                {lead.enrichedAddress && <p className="flex items-center gap-2"><MapPin size={14} className="text-orange-500" /> {lead.enrichedAddress}</p>}
              </div>
            </div>
          </div>
          <div className="border-t border-gray-900 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-600 text-sm">&copy; {new Date().getFullYear()} {lead.companyName}. All rights reserved.</p>
            {location && <p className="text-gray-700 text-xs">Professional {industryLabel} services in {location}</p>}
          </div>
        </div>
      </footer>
    </div>
  )
}
