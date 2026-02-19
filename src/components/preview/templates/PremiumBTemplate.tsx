import { Phone, MapPin, Star, Shield, ArrowRight, Mail, CheckCircle, Target, Briefcase, Scale, Handshake } from 'lucide-react'
import type { TemplateProps } from '../config/template-types'
import DisclaimerBanner from '../shared/DisclaimerBanner'

export default function PremiumBTemplate({ lead, config, onCTAClick, onCallClick, websiteCopy }: TemplateProps) {
  const services = lead.enrichedServices || []
  const photos = lead.enrichedPhotos || []
  const industryLabel = lead.industry.toLowerCase().replace(/_/g, ' ')
  const location = [lead.city, lead.state].filter(Boolean).join(', ')
  const hasRating = lead.enrichedRating && lead.enrichedRating > 0
  const wc = websiteCopy

  return (
    <div className="preview-template min-h-screen bg-slate-950">
      <DisclaimerBanner variant="premium" companyName={lead.companyName} />

      {/* ─── Sticky Dark Glass Nav ─── */}
      <nav className="sticky top-0 z-40 glass-dark border-b border-sky-400/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-[72px] flex items-center justify-between">
          <span className="font-display text-xl font-light text-white tracking-wide">{lead.companyName}</span>
          <div className="flex items-center gap-4">
            {lead.phone && (
              <a href={`tel:${lead.phone}`} onClick={onCallClick} className="hidden md:inline-flex items-center gap-2 text-sm text-slate-400 hover:text-sky-400 transition-colors duration-300 font-medium">
                <Phone size={15} />
                {lead.phone}
              </a>
            )}
            <button onClick={onCTAClick} className="bg-gradient-to-r from-sky-500 to-blue-500 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:from-sky-400 hover:to-blue-400 transition-all duration-300 shadow-md hover:shadow-lg animate-cta-glow">
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* ─── Full-Width Centered Hero ─── */}
      <section className="relative overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient}`} />
        <div className="absolute inset-0 bg-mesh-dark" />

        {/* Floating blue decorative circles */}
        <div className="absolute top-20 left-[10%] w-72 h-72 bg-sky-500/8 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-[15%] w-96 h-96 bg-blue-500/6 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-sky-400/3 rounded-full blur-3xl" />
        <div className="absolute top-32 right-[20%] w-4 h-4 bg-sky-400/30 rounded-full" />
        <div className="absolute bottom-40 left-[25%] w-6 h-6 bg-blue-400/20 rounded-full" />
        <div className="absolute top-[60%] right-[10%] w-3 h-3 bg-sky-300/25 rounded-full" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-32 md:py-44 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-sky-400/50 mb-8 font-medium">Premium {industryLabel}</p>
          <h1 className="font-display text-5xl md:text-6xl lg:text-8xl font-light text-white mb-8 tracking-tight leading-[1.05]">
            {lead.companyName}
          </h1>
          <div className="w-24 h-0.5 bg-gradient-to-r from-sky-400 to-blue-500 mx-auto mb-8" />
          <p className="text-lg md:text-xl text-slate-300 leading-relaxed max-w-2xl mx-auto mb-4">{wc?.heroHeadline || config.tagline}</p>
          {wc?.heroSubheadline && <p className="text-base text-slate-400 leading-relaxed max-w-xl mx-auto mb-8">{wc.heroSubheadline}</p>}

          {hasRating && (
            <div className="inline-flex items-center gap-3 glass-dark border border-sky-400/15 rounded-full px-6 py-3 mb-10">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} size={14} className={i < Math.floor(lead.enrichedRating!) ? 'text-sky-400 fill-current' : 'text-slate-700'} />
                ))}
              </div>
              <span className="text-sky-400 font-semibold text-sm">{lead.enrichedRating}-Star Rated</span>
              {lead.enrichedReviews && <span className="text-slate-500 text-sm">({lead.enrichedReviews} reviews)</span>}
            </div>
          )}

          {!hasRating && location && (
            <p className="text-slate-500 flex items-center justify-center gap-2.5 text-base mb-12">
              <MapPin size={16} className="text-sky-400/50" />
              Serving {location} and surrounding areas
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={`tel:${lead.phone}`}
              onClick={onCallClick}
              className="inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-sky-500 to-blue-500 text-white px-10 py-4 rounded-xl font-semibold text-lg hover:from-sky-400 hover:to-blue-400 transition-all duration-300 shadow-lg animate-cta-glow"
            >
              <Phone size={20} />
              Call Now — Free Consultation
            </a>
            <button
              onClick={onCTAClick}
              className="inline-flex items-center justify-center gap-2.5 border border-sky-400/30 text-sky-400 px-10 py-4 rounded-xl font-semibold text-lg hover:bg-sky-500 hover:text-white transition-all duration-300"
            >
              {config.ctaText}
              <ArrowRight size={18} />
            </button>
          </div>
          <p className="mt-4 text-sm text-slate-600">No obligation &bull; Free consultation &bull; Same-day response</p>
        </div>
      </section>

      {/* ─── Floating Glass Service Cards — Staggered 3-Column Grid ─── */}
      {services.length > 0 && (
        <section className="py-24 px-4 sm:px-6 bg-slate-900/40">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-sm uppercase tracking-[0.25em] text-sky-400/60 mb-3 font-medium">What We Do</p>
              <h2 className="font-display text-4xl md:text-5xl font-light text-white mb-4">Our Services</h2>
              <p className="text-slate-400 max-w-xl mx-auto text-lg">Comprehensive {industryLabel} solutions with a modern approach.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.slice(0, 6).map((service, i) => (
                <div
                  key={i}
                  className={`group glass-dark border border-slate-700/30 rounded-2xl p-8 hover:border-sky-400/30 transition-all duration-500 hover:shadow-xl hover:shadow-sky-500/5 ${
                    i % 2 === 1 ? 'lg:translate-y-6' : ''
                  }`}
                >
                  <div className="w-14 h-14 rounded-xl bg-sky-500/10 flex items-center justify-center mb-6 group-hover:bg-sky-500/20 transition-colors duration-300">
                    <Scale size={24} className="text-sky-400" />
                  </div>
                  <h3 className="font-display text-xl font-medium text-white mb-3">{service}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{wc?.serviceDescriptions?.[service] || `Expert ${service.toLowerCase()} delivered with precision and modern techniques.`}</p>
                  <ArrowRight size={16} className="text-sky-500/0 group-hover:text-sky-400 transition-all duration-300 mt-4" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Asymmetric About Section ─── */}
      <section className="py-24 px-4 sm:px-6 bg-slate-950">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-16 items-start">
          {/* Left — Wide About Text */}
          <div className="lg:col-span-2">
            <p className="text-sm uppercase tracking-[0.25em] text-sky-400/60 mb-3 font-medium">About</p>
            <h2 className="font-display text-4xl md:text-5xl font-light text-white mb-10">{lead.companyName}</h2>
            <div className="space-y-6 text-slate-400 leading-relaxed text-lg">
              <p>
                {wc?.aboutParagraph1 || `${lead.companyName} represents a commitment to excellence in ${industryLabel}.${location ? ` Serving ${location} and the surrounding region, we` : ' We'} combine deep expertise with a client-first philosophy to deliver results that consistently exceed expectations.`}
              </p>
              <p>
                {wc?.aboutParagraph2 || `Our team of seasoned professionals brings a wealth of knowledge and meticulous attention to detail to every engagement. We understand that each client\u2019s needs are unique, which is why we take the time to develop customized solutions rather than one-size-fits-all approaches.`}
              </p>
              <p>
                From initial consultation through project completion, we maintain the highest standards of professionalism,
                communication, and craftsmanship that our clients have come to expect.
              </p>
            </div>

            {/* Value Props */}
            <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-8">
              {[
                { icon: Target, title: wc?.valueProps?.[0]?.title || 'Consultation', desc: wc?.valueProps?.[0]?.description || `We begin with understanding your ${industryLabel} needs and developing a tailored strategy.` },
                { icon: Briefcase, title: wc?.valueProps?.[1]?.title || 'Expert Execution', desc: wc?.valueProps?.[1]?.description || 'Our skilled professionals execute with meticulous attention to detail.' },
                { icon: Handshake, title: wc?.valueProps?.[2]?.title || 'Lasting Results', desc: wc?.valueProps?.[2]?.description || 'We deliver results that exceed expectations and stand the test of time.' },
              ].map((item, i) => (
                <div key={i} className="group">
                  <div className="w-12 h-12 rounded-xl border border-sky-400/15 flex items-center justify-center mb-4 group-hover:border-sky-400/30 group-hover:bg-sky-500/5 transition-all duration-300">
                    <item.icon size={22} className="text-sky-400" />
                  </div>
                  <h3 className="font-display text-base font-medium text-white mb-2">{item.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Stacked Stat Numbers */}
          <div className="lg:col-span-1 flex flex-col gap-10 lg:pt-16">
            <div className="text-center lg:text-left">
              <p className="font-display text-6xl font-light text-gradient-blue">{hasRating ? lead.enrichedRating : '5.0'}</p>
              <div className="flex gap-0.5 mt-2 justify-center lg:justify-start">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} size={14} className={i < Math.floor(lead.enrichedRating || 5) ? 'text-sky-400 fill-current' : 'text-slate-700'} />
                ))}
              </div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mt-2 font-medium">Star Rating</p>
            </div>
            {lead.enrichedReviews && (
              <div className="text-center lg:text-left">
                <p className="font-display text-6xl font-light text-gradient-blue">{lead.enrichedReviews}+</p>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mt-2 font-medium">Verified Reviews</p>
              </div>
            )}
            <div className="text-center lg:text-left">
              <p className="font-display text-6xl font-light text-gradient-blue">100%</p>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mt-2 font-medium">Satisfaction Rate</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Horizontal Scrolling Gallery with Hover CTAs ─── */}
      {photos.length > 0 && (
        <section className="py-24 px-4 sm:px-6 bg-slate-900/40">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-sm uppercase tracking-[0.25em] text-sky-400/60 mb-3 font-medium">Portfolio</p>
              <h2 className="font-display text-4xl md:text-5xl font-light text-white mb-4">Our Work</h2>
              <p className="text-slate-400 text-lg">Scroll to explore our recent projects.</p>
            </div>
          </div>
          <div className="max-w-7xl mx-auto overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4">
            <div className="flex gap-4 px-4 sm:px-6 w-max">
              {photos.slice(0, 10).map((photo, i) => (
                <div key={i} className="group w-72 md:w-80 flex-shrink-0 snap-center">
                  <div className="relative aspect-[4/3] bg-slate-900 rounded-2xl overflow-hidden border border-slate-800/50 hover:border-sky-400/30 transition-all duration-500 hover:shadow-xl hover:shadow-sky-500/5">
                    <img src={photo} alt={`${lead.companyName} project ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
                      <button onClick={onCTAClick} className="bg-sky-400/90 text-white text-xs font-semibold px-4 py-2 rounded-full backdrop-blur-sm">
                        Get a Free Quote
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Full-Width Social Proof ─── */}
      <section className="py-24 px-4 sm:px-6 bg-slate-950 border-y border-sky-400/5">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm uppercase tracking-[0.25em] text-sky-400/60 mb-10 font-medium">Client Testimonial</p>
          <div className="flex justify-center mb-8 gap-1">
            {Array.from({ length: 5 }, (_, i) => (
              <Star key={i} size={24} className="text-sky-400 fill-current" />
            ))}
          </div>
          <p className="text-xl md:text-2xl text-slate-300 leading-relaxed italic font-light mb-10">
            &ldquo;Working with {lead.companyName} was an exceptional experience. Their attention to detail,
            professionalism, and commitment to excellence truly set them apart. The results exceeded
            our expectations in every way.&rdquo;
          </p>
          <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-sky-400/30 to-transparent mx-auto mb-5" />
          <p className="text-slate-500 text-sm tracking-wide font-medium">Satisfied Client{location ? ` \u2014 ${lead.city}` : ''}</p>
          {hasRating && (
            <div className="mt-8 flex items-center justify-center gap-6 text-sm text-slate-500">
              <span className="flex items-center gap-1.5"><Shield size={14} className="text-sky-400/60" /> Licensed &amp; Insured</span>
              {lead.enrichedReviews && <span>{lead.enrichedReviews}+ verified reviews</span>}
            </div>
          )}
        </div>
      </section>

      {/* ─── Contained CTA Card ─── */}
      <section className="py-24 px-4 sm:px-6 bg-slate-900/40">
        <div className="max-w-2xl mx-auto">
          <div className="border border-sky-400/15 rounded-3xl p-12 md:p-16 bg-slate-950/80 backdrop-blur-sm text-center shadow-2xl shadow-sky-500/5">
            <p className="text-sm uppercase tracking-[0.25em] text-sky-400/60 mb-4 font-medium">Get Started</p>
            <h2 className="font-display text-3xl md:text-4xl font-light text-white mb-6">{wc?.closingHeadline || 'Begin Your Project Today'}</h2>
            <p className="text-slate-400 text-lg mb-12 leading-relaxed">
              {wc?.closingBody || `Schedule a complimentary consultation with ${lead.companyName}. Let us show you why discerning clients trust us with their most important projects.`}
            </p>
            <div className="flex flex-col gap-4">
              <a
                href={`tel:${lead.phone}`}
                onClick={onCallClick}
                className="inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-sky-500 to-blue-500 text-white px-10 py-4 rounded-xl font-semibold text-lg hover:from-sky-400 hover:to-blue-400 transition-all duration-300 shadow-lg animate-cta-glow"
              >
                <Phone size={20} />
                Call Now — It&apos;s Free
              </a>
              <button
                onClick={onCTAClick}
                className="inline-flex items-center justify-center gap-2.5 border border-sky-400/30 text-sky-400 px-10 py-4 rounded-xl font-semibold text-lg hover:bg-sky-500 hover:text-white transition-all duration-300"
              >
                {config.ctaText}
                <ArrowRight size={18} />
              </button>
            </div>
            <p className="mt-4 text-sm text-slate-600">No obligation &bull; Free consultation &bull; Satisfaction guaranteed</p>
          </div>
        </div>
      </section>

      {/* ─── Floating Contact Sidebar (Desktop) ─── */}
      <div className="hidden lg:flex fixed right-0 top-1/2 -translate-y-1/2 z-30 flex-col gap-3 pr-4">
        {lead.phone && (
          <a
            href={`tel:${lead.phone}`}
            onClick={onCallClick}
            className="w-12 h-12 rounded-xl glass-dark border border-sky-400/15 flex items-center justify-center text-sky-400 hover:bg-sky-500 hover:text-white hover:border-sky-500 transition-all duration-300 shadow-lg"
            title="Call us"
          >
            <Phone size={18} />
          </a>
        )}
        {lead.email && (
          <a
            href={`mailto:${lead.email}`}
            className="w-12 h-12 rounded-xl glass-dark border border-sky-400/15 flex items-center justify-center text-sky-400 hover:bg-sky-500 hover:text-white hover:border-sky-500 transition-all duration-300 shadow-lg"
            title="Email us"
          >
            <Mail size={18} />
          </a>
        )}
        {location && (
          <div
            className="w-12 h-12 rounded-xl glass-dark border border-sky-400/15 flex items-center justify-center text-sky-400/60 shadow-lg"
            title={location}
          >
            <MapPin size={18} />
          </div>
        )}
      </div>

      {/* ─── Sticky Mobile CTA Bar ─── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden glass-dark border-t border-sky-400/15 shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
        <div className="flex items-center gap-3 px-4 py-3">
          <a
            href={`tel:${lead.phone}`}
            onClick={onCallClick}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-slate-800 text-white py-3 rounded-xl font-semibold text-sm border border-slate-700"
          >
            <Phone size={16} />
            Call Now
          </a>
          <button
            onClick={onCTAClick}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-sky-500 to-blue-500 text-white py-3 rounded-xl font-semibold text-sm shadow-md"
          >
            Free Quote
          </button>
        </div>
      </div>

      {/* ─── Footer ─── */}
      <footer className="bg-slate-950 py-16 px-4 sm:px-6 border-t border-sky-400/10 pb-28 md:pb-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
            <div>
              <h3 className="font-display text-sky-400/70 font-light text-xl tracking-wide mb-4">{lead.companyName}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Premium {industryLabel} services{location ? ` in ${location}` : ''}.
                Modern solutions delivered with precision and care.
              </p>
              {hasRating && (
                <div className="flex items-center gap-2 mt-4">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} size={12} className={i < Math.floor(lead.enrichedRating!) ? 'text-sky-400 fill-current' : 'text-slate-800'} />
                    ))}
                  </div>
                  <span className="text-slate-600 text-xs">{lead.enrichedRating} Stars{lead.enrichedReviews ? ` (${lead.enrichedReviews} reviews)` : ''}</span>
                </div>
              )}
            </div>
            <div>
              <h4 className="text-sm uppercase tracking-[0.2em] text-sky-400/50 mb-5 font-medium">Services</h4>
              <ul className="space-y-3 text-sm text-slate-500">
                {services.slice(0, 4).map((s, i) => (
                  <li key={i} className="flex items-center gap-2.5 hover:text-white transition-colors duration-300">
                    <CheckCircle size={12} className="text-sky-500/40" />
                    {s}
                  </li>
                ))}
                {services.length === 0 && (
                  <li>Professional {industryLabel} services</li>
                )}
              </ul>
            </div>
            <div>
              <h4 className="text-sm uppercase tracking-[0.2em] text-sky-400/50 mb-5 font-medium">Contact</h4>
              <div className="space-y-3 text-sm text-slate-500">
                {lead.phone && <p className="flex items-center gap-2.5 hover:text-white transition-colors duration-300"><Phone size={14} className="text-sky-500/40" /> {lead.phone}</p>}
                {lead.email && <p className="flex items-center gap-2.5 hover:text-white transition-colors duration-300"><Mail size={14} className="text-sky-500/40" /> {lead.email}</p>}
                {lead.enrichedAddress && <p className="flex items-center gap-2.5"><MapPin size={14} className="text-sky-500/40" /> {lead.enrichedAddress}</p>}
              </div>
            </div>
          </div>
          <div className="border-t border-slate-800/50 pt-10 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-slate-700 text-sm">&copy; {new Date().getFullYear()} {lead.companyName}</p>
            {location && <p className="text-slate-800 text-xs">{location} &bull; {industryLabel}</p>}
          </div>
        </div>
      </footer>
    </div>
  )
}
