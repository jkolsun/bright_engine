import { Phone, MapPin, Star, Shield, Zap, CheckCircle, ArrowRight, Mail, Flame, Wrench, ThumbsUp } from 'lucide-react'
import type { TemplateProps } from '../config/template-types'
import DisclaimerBanner from '../shared/DisclaimerBanner'

export default function BoldBTemplate({ lead, config, onCTAClick, onCallClick, websiteCopy }: TemplateProps) {
  const services = lead.enrichedServices || []
  const photos = lead.enrichedPhotos || []
  const industryLabel = lead.industry.toLowerCase().replace(/_/g, ' ')
  const location = [lead.city, lead.state].filter(Boolean).join(', ')
  const hasRating = lead.enrichedRating && lead.enrichedRating > 0
  const wc = websiteCopy

  return (
    <div className="preview-template min-h-screen bg-gray-950">
      <DisclaimerBanner variant="bold" companyName={lead.companyName} />

      {/* ─── Sticky Nav ─── */}
      <nav className="sticky top-0 z-40 glass-dark border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-[72px] flex items-center justify-between">
          <span className="font-display text-xl font-black text-white tracking-tight uppercase">{lead.companyName}</span>
          <div className="flex items-center gap-4">
            {lead.phone && (
              <a href={`tel:${lead.phone}`} onClick={onCallClick} className="hidden md:inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors font-medium">
                <Phone size={15} />
                {lead.phone}
              </a>
            )}
            <button onClick={onCTAClick} className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:from-blue-600 hover:to-cyan-600 transition-all shadow-md hover:shadow-lg animate-cta-glow">
              Free Quote
            </button>
          </div>
        </div>
      </nav>

      {/* ─── Hero — dramatic full-bleed ─── */}
      <section className="relative min-h-[80vh] flex items-center overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient}`} />
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/30 to-transparent" />
        <div className="absolute inset-0 bg-mesh-dark" />

        {/* Decorative glows */}
        <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-cyan-500/10 rounded-full translate-y-1/2 blur-3xl" />
        <div className="absolute top-1/2 left-0 w-[300px] h-[300px] bg-indigo-500/8 rounded-full -translate-x-1/2 blur-3xl" />

        <div className="relative max-w-6xl mx-auto w-full px-4 sm:px-6 py-28">
          {hasRating && (
            <div className="inline-flex items-center gap-2.5 bg-white/10 backdrop-blur-md border border-white/10 rounded-full px-5 py-2.5 mb-8">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} size={15} className={i < Math.floor(lead.enrichedRating!) ? 'text-blue-400 fill-current' : 'text-white/20'} />
                ))}
              </div>
              <span className="text-sm font-bold text-white">{lead.enrichedRating}</span>
              {lead.enrichedReviews && <span className="text-sm text-white/50">({lead.enrichedReviews} reviews)</span>}
            </div>
          )}

          <h1 className="font-display text-5xl md:text-7xl lg:text-[6.5rem] font-black text-white mb-8 tracking-tight leading-[0.95]">
            {lead.companyName}
          </h1>

          <p className={`text-xl md:text-2xl text-white/60 max-w-2xl leading-relaxed ${wc?.heroSubheadline ? 'mb-3' : 'mb-12'}`}>{wc?.heroHeadline || config.tagline}</p>
          {wc?.heroSubheadline && <p className="text-lg text-white/50 mb-12 max-w-xl leading-relaxed">{wc.heroSubheadline}</p>}

          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href={`tel:${lead.phone}`}
              onClick={onCallClick}
              className="inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-10 py-5 rounded-xl font-black text-lg hover:from-blue-600 hover:to-cyan-600 transition-all shadow-2xl animate-cta-glow"
            >
              <Phone size={22} />
              Call Now
            </a>
            <button
              onClick={onCTAClick}
              className="inline-flex items-center justify-center gap-2.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white px-10 py-5 rounded-xl font-bold text-lg hover:bg-white hover:text-gray-900 transition-all"
            >
              {config.ctaText}
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </section>

      {/* ─── Stats Row ─── */}
      <section className="py-16 px-4 sm:px-6 bg-gray-900/80 border-y border-white/5">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {hasRating && (
            <div className="group">
              <p className="font-display text-5xl md:text-6xl font-black text-gradient-electric mb-2">{lead.enrichedRating}</p>
              <div className="flex justify-center mb-3 gap-0.5">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} size={14} className={i < Math.floor(lead.enrichedRating!) ? 'text-blue-400 fill-current' : 'text-gray-700'} />
                ))}
              </div>
              <p className="text-xs text-gray-500 uppercase tracking-[0.2em] font-semibold">Star Rating</p>
            </div>
          )}
          {lead.enrichedReviews && (
            <div>
              <p className="font-display text-5xl md:text-6xl font-black text-gradient-electric mb-2">{lead.enrichedReviews}+</p>
              <p className="text-xs text-gray-500 uppercase tracking-[0.2em] font-semibold mt-3">Reviews</p>
            </div>
          )}
          <div>
            <p className="font-display text-5xl md:text-6xl font-black text-white mb-2">100%</p>
            <p className="text-xs text-gray-500 uppercase tracking-[0.2em] font-semibold mt-3">Licensed & Insured</p>
          </div>
          <div>
            <p className="font-display text-5xl md:text-6xl font-black text-white mb-2">24/7</p>
            <p className="text-xs text-gray-500 uppercase tracking-[0.2em] font-semibold mt-3">Available</p>
          </div>
        </div>
      </section>

      {/* ─── Services ─── */}
      {services.length > 0 && (
        <section className="py-24 px-4 sm:px-6 bg-gray-950">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-400 rounded-full px-4 py-1.5 text-sm font-bold mb-4 border border-blue-500/20">
                <Wrench size={14} />
                Our Expertise
              </div>
              <h2 className="font-display text-4xl md:text-5xl font-black text-white mb-4">What We Do</h2>
              <p className="text-gray-400 max-w-xl mx-auto text-lg">Expert {industryLabel} services — done right, on time, every time.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {services.slice(0, 6).map((service, i) => (
                <div key={i} className="group bg-gray-900/50 border border-gray-800/50 rounded-2xl p-8 card-lift card-lift-dark hover:border-blue-500/30">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center mb-6 shadow-lg shadow-blue-500/10 group-hover:shadow-blue-500/20 transition-shadow">
                    <Wrench size={24} className="text-white" />
                  </div>
                  <h3 className="font-display font-bold text-xl text-white mb-3">{service}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed mb-4">{wc?.serviceDescriptions?.[service] || `Professional ${service.toLowerCase()} with guaranteed quality and competitive pricing.`}</p>
                  <div className="flex items-center gap-1.5 text-blue-400 text-sm font-bold opacity-0 group-hover:opacity-100 transition-all duration-300">
                    Get a quote <ArrowRight size={14} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Why Choose Us ─── */}
      <section className="py-24 px-4 sm:px-6 bg-gray-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-400 rounded-full px-4 py-1.5 text-sm font-bold mb-4 border border-blue-500/20">
              The Difference
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-black text-white mb-4">Why Choose {lead.companyName}?</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Flame, title: wc?.valueProps?.[0]?.title || 'Fast Response', desc: wc?.valueProps?.[0]?.description || `We understand urgency. ${lead.companyName} responds quickly and gets to work fast — because your time matters.` },
              { icon: Shield, title: wc?.valueProps?.[1]?.title || 'Quality Guaranteed', desc: wc?.valueProps?.[1]?.description || 'Every project is backed by our satisfaction guarantee. We use premium materials and expert techniques on every job.' },
              { icon: ThumbsUp, title: wc?.valueProps?.[2]?.title || 'Fair & Transparent', desc: wc?.valueProps?.[2]?.description || 'No hidden fees, no surprises. You get honest pricing upfront with a detailed estimate before any work begins.' },
            ].map((item, i) => (
              <div key={i} className="bg-gray-950/80 border border-gray-800/50 rounded-2xl p-10 text-center card-lift card-lift-dark">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/15">
                  <item.icon size={32} className="text-white" />
                </div>
                <h3 className="font-display text-xl font-bold text-white mb-4">{item.title}</h3>
                <p className="text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── About ─── */}
      <section className="py-24 px-4 sm:px-6 bg-gray-950">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-400 rounded-full px-4 py-1.5 text-sm font-bold mb-4 border border-blue-500/20">
              About Us
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-black text-white mb-8">Built on Hard Work & Results</h2>
            <div className="space-y-5 text-gray-400 leading-relaxed text-lg">
              <p>
                {wc?.aboutParagraph1 || `${lead.companyName} isn't just another ${industryLabel} company.${location ? ` We're a team of dedicated professionals based in ${location} who take pride in every single job.` : ` We're a team of dedicated professionals who take pride in every single job.`}`}
              </p>
              <p>
                {wc?.aboutParagraph2 || `From emergency calls to planned projects, we bring the same level of intensity and commitment. Our crew shows up on time, works efficiently, and doesn't leave until the job is done right.`}
              </p>
              <p>
                Fully licensed, fully insured, and fully committed to your satisfaction.
                That&apos;s the {lead.companyName} promise.
              </p>
            </div>
            <a
              href={`tel:${lead.phone}`}
              onClick={onCallClick}
              className="inline-flex items-center gap-2.5 mt-10 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-10 py-4 rounded-xl font-bold text-lg hover:from-blue-600 hover:to-cyan-600 transition-all shadow-lg animate-cta-glow"
            >
              <Phone size={20} />
              Call Us Now
            </a>
          </div>
          <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-10">
            <h3 className="font-display text-2xl font-bold text-white mb-8">Get In Touch</h3>
            <div className="space-y-5">
              {lead.phone && (
                <a href={`tel:${lead.phone}`} onClick={onCallClick} className="flex items-center gap-4 text-gray-300 hover:text-white transition-colors p-3 rounded-xl hover:bg-white/5">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/10">
                    <Phone size={22} className="text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-[0.15em] font-semibold">Phone</p>
                    <p className="font-bold text-lg text-white">{lead.phone}</p>
                  </div>
                </a>
              )}
              {lead.email && (
                <a href={`mailto:${lead.email}`} className="flex items-center gap-4 text-gray-300 hover:text-white transition-colors p-3 rounded-xl hover:bg-white/5">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/10">
                    <Mail size={22} className="text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-[0.15em] font-semibold">Email</p>
                    <p className="font-bold text-white">{lead.email}</p>
                  </div>
                </a>
              )}
              {lead.enrichedAddress && (
                <div className="flex items-start gap-4 text-gray-300 p-3 rounded-xl">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-cyan-500/10">
                    <MapPin size={22} className="text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-[0.15em] font-semibold">Location</p>
                    <p className="font-bold text-white">{lead.enrichedAddress}</p>
                  </div>
                </div>
              )}
            </div>
            <button onClick={onCTAClick} className="w-full mt-8 bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-4 rounded-xl font-bold text-lg hover:from-blue-600 hover:to-cyan-600 transition-all shadow-lg">
              {config.ctaText}
            </button>
          </div>
        </div>
      </section>

      {/* ─── Photo Gallery ─── */}
      {photos.length > 0 && (
        <section className="py-24 px-4 sm:px-6 bg-gray-900/50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-400 rounded-full px-4 py-1.5 text-sm font-bold mb-4 border border-blue-500/20">
                Our Work
              </div>
              <h2 className="font-display text-4xl md:text-5xl font-black text-white mb-4">Results Speak Louder</h2>
              <p className="text-gray-400 text-lg">See what {lead.companyName} can do for you.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {photos.slice(0, 8).map((photo, i) => (
                <div key={i} className="group aspect-square bg-gray-800 rounded-xl overflow-hidden border border-gray-700/50 hover:border-blue-500/40 transition-all duration-500 hover:shadow-xl hover:shadow-blue-500/5">
                  <img src={photo} alt={`${lead.companyName} project ${i + 1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Emergency / Fast Response Strip ─── */}
      <section className="relative py-12 px-4 sm:px-6 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 overflow-hidden">
        <div className="absolute inset-0 bg-noise opacity-10" />
        <div className="relative max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 animate-bounce-gentle">
              <Zap size={30} className="text-white" />
            </div>
            <div>
              <p className="text-2xl font-display font-black text-white">Need Help Fast?</p>
              <p className="text-white/80 text-lg">We respond quickly — call us anytime for fast, reliable service.</p>
            </div>
          </div>
          <a
            href={`tel:${lead.phone}`}
            onClick={onCallClick}
            className="inline-flex items-center gap-2.5 bg-white text-gray-900 px-10 py-4 rounded-xl font-black text-lg hover:bg-gray-100 transition-all shadow-xl flex-shrink-0"
          >
            <Phone size={20} />
            {lead.phone || 'Call Now'}
          </a>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="relative py-24 px-4 sm:px-6 overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient}`} />
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0 bg-mesh-dark" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h2 className="font-display text-4xl md:text-6xl font-black text-white mb-6">{wc?.closingHeadline || 'Ready to Get Started?'}</h2>
          <p className="text-xl text-white/60 mb-12 max-w-xl mx-auto leading-relaxed">
            {wc?.closingBody || `Don't wait — contact ${lead.companyName} today for a free, no-obligation estimate.`}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={`tel:${lead.phone}`}
              onClick={onCallClick}
              className="inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-10 py-5 rounded-xl font-black text-lg hover:from-blue-600 hover:to-cyan-600 transition-all shadow-2xl animate-cta-glow"
            >
              <Phone size={22} />
              {lead.phone || 'Call Now'}
            </a>
            <button
              onClick={onCTAClick}
              className="inline-flex items-center justify-center gap-2.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white px-10 py-5 rounded-xl font-bold text-lg hover:bg-white hover:text-gray-900 transition-all"
            >
              {config.ctaText}
            </button>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="bg-black py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
            <div>
              <h3 className="font-display text-white font-black text-xl uppercase tracking-wider mb-4">{lead.companyName}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Professional {industryLabel} services{location ? ` serving ${location}` : ''}.
                Licensed, insured, and committed to delivering results.
              </p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Services</h4>
              <ul className="space-y-3 text-sm text-gray-500">
                {services.slice(0, 4).map((s, i) => (
                  <li key={i} className="flex items-center gap-2 hover:text-white transition-colors">
                    <CheckCircle size={12} className="text-blue-500" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Contact</h4>
              <div className="space-y-3 text-sm text-gray-500">
                {lead.phone && <p className="flex items-center gap-2.5 hover:text-white transition-colors"><Phone size={14} className="text-blue-500" /> {lead.phone}</p>}
                {lead.email && <p className="flex items-center gap-2.5 hover:text-white transition-colors"><Mail size={14} className="text-blue-500" /> {lead.email}</p>}
                {lead.enrichedAddress && <p className="flex items-center gap-2.5"><MapPin size={14} className="text-blue-500" /> {lead.enrichedAddress}</p>}
              </div>
            </div>
          </div>
          <div className="border-t border-gray-900 pt-10 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-600 text-sm">&copy; {new Date().getFullYear()} {lead.companyName}. All rights reserved.</p>
            {location && <p className="text-gray-700 text-xs">Professional {industryLabel} services in {location}</p>}
          </div>
        </div>
      </footer>
    </div>
  )
}
