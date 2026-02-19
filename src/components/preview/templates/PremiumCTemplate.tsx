import { Phone, MapPin, Star, Shield, ArrowRight, Mail, CheckCircle, Target, Briefcase, Scale, Leaf, Clock } from 'lucide-react'
import type { TemplateProps } from '../config/template-types'
import DisclaimerBanner from '../shared/DisclaimerBanner'

export default function PremiumCTemplate({ lead, config, onCTAClick, onCallClick, websiteCopy }: TemplateProps) {
  const services = lead.enrichedServices || []
  const photos = lead.enrichedPhotos || []
  const industryLabel = lead.industry.toLowerCase().replace(/_/g, ' ')
  const location = [lead.city, lead.state].filter(Boolean).join(', ')
  const hasRating = lead.enrichedRating && lead.enrichedRating > 0
  const wc = websiteCopy

  return (
    <div className="preview-template min-h-screen bg-stone-50">
      <DisclaimerBanner variant="premium" companyName={lead.companyName} />

      {/* ─── Sticky Cream Nav ─── */}
      <nav className="sticky top-0 z-40 bg-stone-50/95 backdrop-blur-md border-b border-stone-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-[72px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-700 flex items-center justify-center">
              <Leaf size={16} className="text-white" />
            </div>
            <span className="font-display text-xl font-medium text-stone-900 tracking-wide">{lead.companyName}</span>
          </div>
          <div className="flex items-center gap-4">
            {lead.phone && (
              <a href={`tel:${lead.phone}`} onClick={onCallClick} className="hidden md:inline-flex items-center gap-2 text-sm text-stone-600 hover:text-emerald-700 transition-colors duration-300 font-medium">
                <Phone size={15} />
                {lead.phone}
              </a>
            )}
            <button onClick={onCTAClick} className="bg-emerald-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-600 transition-all duration-300 shadow-md hover:shadow-lg">
              Schedule Consultation
            </button>
          </div>
        </div>
      </nav>

      {/* ─── Grand Centered Hero ─── */}
      <section className="relative overflow-hidden bg-stone-50">
        {/* Subtle emerald blob decorations */}
        <div className="absolute top-10 right-[10%] w-64 h-64 bg-emerald-100/60 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-[5%] w-80 h-80 bg-emerald-50 rounded-full blur-3xl" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-28 md:py-40 text-center">
          <h1 className="font-display text-5xl md:text-6xl lg:text-8xl font-light text-stone-900 mb-8 tracking-tight leading-[1.05]">
            {lead.companyName}
          </h1>
          <div className="w-24 h-1 bg-gradient-to-r from-emerald-600 to-emerald-400 mx-auto mb-8 rounded-full" />
          <p className="text-lg md:text-xl text-stone-600 leading-relaxed max-w-2xl mx-auto mb-4">{wc?.heroHeadline || config.tagline}</p>
          {wc?.heroSubheadline && <p className="text-base text-stone-500 leading-relaxed max-w-xl mx-auto mb-8">{wc.heroSubheadline}</p>}

          {/* Rating Badge */}
          {hasRating && (
            <div className="inline-flex items-center gap-3 bg-white border border-stone-200 rounded-full px-6 py-3 shadow-sm mb-10">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} size={16} className={i < Math.floor(lead.enrichedRating!) ? 'text-emerald-500 fill-current' : 'text-stone-300'} />
                ))}
              </div>
              <span className="text-emerald-700 font-semibold">{lead.enrichedRating}</span>
              {lead.enrichedReviews && <span className="text-stone-400 text-sm">({lead.enrichedReviews} reviews)</span>}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={`tel:${lead.phone}`}
              onClick={onCallClick}
              className="inline-flex items-center justify-center gap-2.5 bg-emerald-700 text-white px-10 py-4 rounded-xl font-semibold text-lg hover:bg-emerald-600 transition-all duration-300 shadow-lg shadow-emerald-700/20"
            >
              <Phone size={20} />
              Call Now
            </a>
            <button
              onClick={onCTAClick}
              className="inline-flex items-center justify-center gap-2.5 border-2 border-emerald-700/30 text-emerald-700 px-10 py-4 rounded-xl font-semibold text-lg hover:bg-emerald-700 hover:text-white hover:border-emerald-700 transition-all duration-300"
            >
              {config.ctaText}
              <ArrowRight size={18} />
            </button>
          </div>
        </div>

        {/* Thin emerald gradient line below hero */}
        <div className="h-1 bg-gradient-to-r from-emerald-800 via-emerald-500 to-emerald-800" />
      </section>

      {/* ─── Trust Indicators — White bg ─── */}
      <section className="py-8 px-4 sm:px-6 bg-white border-b border-stone-200">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-6 md:gap-0">
          {hasRating && (
            <>
              <div className="flex items-center gap-2.5 px-6">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} size={13} className={i < Math.floor(lead.enrichedRating!) ? 'text-emerald-500 fill-current' : 'text-stone-300'} />
                  ))}
                </div>
                <span className="text-emerald-700 font-semibold text-sm">{lead.enrichedRating} Rating</span>
              </div>
              <div className="hidden md:block w-px h-8 bg-emerald-600/15" />
            </>
          )}
          {lead.enrichedReviews && (
            <>
              <div className="flex items-center gap-2 px-6">
                <span className="text-stone-800 font-semibold text-sm">{lead.enrichedReviews}+</span>
                <span className="text-stone-500 text-sm">Reviews</span>
              </div>
              <div className="hidden md:block w-px h-8 bg-emerald-600/15" />
            </>
          )}
          <div className="flex items-center gap-2 px-6">
            <Shield size={15} className="text-emerald-600/70" />
            <span className="text-stone-600 text-sm">Licensed &amp; Insured</span>
          </div>
          {location && (
            <>
              <div className="hidden md:block w-px h-8 bg-emerald-600/15" />
              <div className="flex items-center gap-2 px-6">
                <MapPin size={15} className="text-emerald-600/70" />
                <span className="text-stone-600 text-sm">{location}</span>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ─── Services Grid — 3-Column Cards ─── */}
      {services.length > 0 && (
        <section className="py-24 px-4 sm:px-6 bg-stone-50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-sm uppercase tracking-[0.25em] text-emerald-600/60 mb-3 font-medium">Our Expertise</p>
              <h2 className="font-display text-4xl md:text-5xl font-light text-stone-900 mb-4">Services</h2>
              <p className="text-stone-500 max-w-xl mx-auto text-lg">Comprehensive {industryLabel} solutions delivered with precision and care.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.slice(0, 6).map((service, i) => (
                <div key={i} className="group bg-white border border-stone-200 rounded-2xl p-8 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-900/5 transition-all duration-300">
                  <div className="w-14 h-14 rounded-xl bg-emerald-50 flex items-center justify-center mb-6 group-hover:bg-emerald-100 transition-colors duration-300">
                    <Scale size={24} className="text-emerald-600" />
                  </div>
                  <h3 className="font-display text-xl font-medium text-stone-900 mb-3">{service}</h3>
                  <p className="text-stone-500 text-sm leading-relaxed mb-4">{wc?.serviceDescriptions?.[service] || `Expert ${service.toLowerCase()} tailored to your requirements.`}</p>
                  <ArrowRight size={16} className="text-emerald-600/0 group-hover:text-emerald-600 transition-all duration-300" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Full-Width Emerald Approach Section ─── */}
      <section className="py-24 px-4 sm:px-6 bg-emerald-800 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-400 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-300 rounded-full translate-y-1/2 -translate-x-1/3 blur-3xl" />
        </div>

        <div className="relative max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm uppercase tracking-[0.25em] text-emerald-300/60 mb-3 font-medium">How We Work</p>
            <h2 className="font-display text-4xl md:text-5xl font-light text-white mb-4">Our Approach</h2>
            <p className="text-emerald-100/70 text-lg">A refined process designed to deliver exceptional outcomes.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              { icon: Target, step: '01', title: wc?.valueProps?.[0]?.title || 'Consultation', desc: wc?.valueProps?.[0]?.description || `We begin with a thorough consultation to understand your vision, assess your ${industryLabel} needs, and develop a tailored strategy.` },
              { icon: Briefcase, step: '02', title: wc?.valueProps?.[1]?.title || 'Expert Execution', desc: wc?.valueProps?.[1]?.description || 'Our skilled professionals execute your project with meticulous attention to detail, using only premium materials and proven techniques.' },
              { icon: CheckCircle, step: '03', title: wc?.valueProps?.[2]?.title || 'Lasting Results', desc: wc?.valueProps?.[2]?.description || 'We deliver results that exceed expectations and stand the test of time, backed by our commitment to your complete satisfaction.' },
            ].map((item, i) => (
              <div key={i} className="text-center group">
                <div className="relative w-20 h-20 rounded-full border border-emerald-400/25 bg-emerald-700/50 flex items-center justify-center mx-auto mb-8 group-hover:border-emerald-400/50 group-hover:bg-emerald-700/70 transition-all duration-300">
                  <item.icon size={30} className="text-emerald-200" />
                  <span className="absolute -top-2 -right-2 text-xs font-bold text-emerald-300/70 bg-emerald-900 px-2 py-0.5 rounded-full border border-emerald-600/30">{item.step}</span>
                </div>
                <h3 className="font-display text-xl font-medium text-white mb-4">{item.title}</h3>
                <p className="text-emerald-100/60 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── About with Contact Sidebar — 3/5 + 2/5 ─── */}
      <section className="py-24 px-4 sm:px-6 bg-stone-50">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-16">
          <div className="lg:col-span-3">
            <p className="text-sm uppercase tracking-[0.25em] text-emerald-600/60 mb-3 font-medium">About</p>
            <h2 className="font-display text-4xl md:text-5xl font-light text-stone-900 mb-10">{lead.companyName}</h2>
            <div className="space-y-6 text-stone-600 leading-relaxed text-lg">
              <p>
                {wc?.aboutParagraph1 || `${lead.companyName} represents a commitment to excellence in ${industryLabel}.${location ? ` Serving ${location} and the surrounding region, we` : ' We'} combine deep expertise with a client-first philosophy to deliver results that consistently exceed expectations.`}
              </p>
              <p>
                {wc?.aboutParagraph2 || `Our team of seasoned professionals brings a wealth of knowledge and meticulous attention to detail to every engagement. We understand that each client\u0027s needs are unique, which is why we take the time to develop customized solutions rather than one-size-fits-all approaches.`}
              </p>
              <p>
                From initial consultation through project completion, we maintain the highest standards of professionalism,
                communication, and craftsmanship. Our reputation has been built on decades of trusted service.
              </p>
            </div>
            <div className="mt-12 flex flex-wrap gap-12">
              <div>
                <p className="font-display text-4xl font-light text-emerald-700">{hasRating ? lead.enrichedRating : '5.0'}</p>
                <p className="text-xs uppercase tracking-[0.2em] text-stone-500 mt-2 font-medium">Star Rating</p>
              </div>
              {lead.enrichedReviews && (
                <div>
                  <p className="font-display text-4xl font-light text-emerald-700">{lead.enrichedReviews}+</p>
                  <p className="text-xs uppercase tracking-[0.2em] text-stone-500 mt-2 font-medium">Client Reviews</p>
                </div>
              )}
              <div>
                <p className="font-display text-4xl font-light text-emerald-700">100%</p>
                <p className="text-xs uppercase tracking-[0.2em] text-stone-500 mt-2 font-medium">Satisfaction</p>
              </div>
            </div>
          </div>

          {/* Contact Sidebar */}
          <div className="lg:col-span-2">
            <div className="border border-stone-200 rounded-3xl p-10 bg-white shadow-lg shadow-stone-900/5 sticky top-24">
              <h3 className="font-display text-2xl font-light text-stone-900 mb-8">Contact</h3>
              <div className="space-y-5">
                {lead.phone && (
                  <a href={`tel:${lead.phone}`} onClick={onCallClick} className="flex items-center gap-4 text-stone-600 hover:text-emerald-700 transition-colors duration-300 p-3 rounded-xl hover:bg-emerald-50/50">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                      <Phone size={20} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.15em] text-stone-400 font-medium">Phone</p>
                      <p className="font-medium text-stone-900 text-lg">{lead.phone}</p>
                    </div>
                  </a>
                )}
                {lead.email && (
                  <a href={`mailto:${lead.email}`} className="flex items-center gap-4 text-stone-600 hover:text-emerald-700 transition-colors duration-300 p-3 rounded-xl hover:bg-emerald-50/50">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                      <Mail size={20} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.15em] text-stone-400 font-medium">Email</p>
                      <p className="font-medium text-stone-900">{lead.email}</p>
                    </div>
                  </a>
                )}
                {lead.enrichedAddress && (
                  <div className="flex items-start gap-4 text-stone-600 p-3 rounded-xl">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                      <MapPin size={20} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.15em] text-stone-400 font-medium">Address</p>
                      <p className="font-medium text-stone-900">{lead.enrichedAddress}</p>
                    </div>
                  </div>
                )}
                {location && (
                  <div className="flex items-center gap-4 text-stone-600 p-3 rounded-xl">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                      <Clock size={20} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.15em] text-stone-400 font-medium">Availability</p>
                      <p className="font-medium text-stone-900">Mon - Sat</p>
                    </div>
                  </div>
                )}
              </div>
              <button onClick={onCTAClick} className="w-full mt-10 bg-emerald-700 text-white py-4 rounded-xl font-semibold text-lg hover:bg-emerald-600 transition-all duration-300 shadow-lg shadow-emerald-700/20">
                {config.ctaText}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Photo Gallery — White bg ─── */}
      {photos.length > 0 && (
        <section className="py-24 px-4 sm:px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-sm uppercase tracking-[0.25em] text-emerald-600/60 mb-3 font-medium">Portfolio</p>
              <h2 className="font-display text-4xl md:text-5xl font-light text-stone-900 mb-4">Our Work</h2>
              <p className="text-stone-500 text-lg">A selection of recent projects showcasing our commitment to excellence.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {photos.slice(0, 8).map((photo, i) => (
                <div key={i} className="group aspect-square bg-stone-100 rounded-2xl overflow-hidden border border-stone-200 hover:border-emerald-500/40 transition-all duration-500 hover:shadow-xl hover:shadow-emerald-900/10">
                  <img src={photo} alt={`${lead.companyName} project ${i + 1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Testimonial — Cream bg ─── */}
      <section className="py-24 px-4 sm:px-6 bg-stone-100/60">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm uppercase tracking-[0.25em] text-emerald-600/60 mb-10 font-medium">Client Testimonial</p>
          <div className="flex justify-center mb-8 gap-1">
            {Array.from({ length: 5 }, (_, i) => (
              <Star key={i} size={24} className="text-emerald-500 fill-current" />
            ))}
          </div>
          <p className="text-xl md:text-2xl text-stone-700 leading-relaxed italic font-light mb-10">
            &ldquo;Working with {lead.companyName} was an exceptional experience. Their attention to detail,
            professionalism, and commitment to excellence truly set them apart. The results exceeded
            our expectations in every way.&rdquo;
          </p>
          <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent mx-auto mb-5" />
          <p className="text-stone-500 text-sm tracking-wide font-medium">Satisfied Client{location ? ` \u2014 ${lead.city}` : ''}</p>
        </div>
      </section>

      {/* ─── Emerald Gradient CTA Section ─── */}
      <section className="py-24 px-4 sm:px-6 bg-gradient-to-br from-emerald-800 to-emerald-700 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/2 w-[500px] h-[500px] bg-emerald-300 rounded-full -translate-y-1/2 -translate-x-1/2 blur-3xl" />
          <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-emerald-400 rounded-full translate-y-1/3 translate-x-1/4 blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <p className="text-sm uppercase tracking-[0.25em] text-emerald-300/60 mb-4 font-medium">Get Started</p>
          <h2 className="font-display text-4xl md:text-5xl font-light text-white mb-6">{wc?.closingHeadline || 'Begin Your Project Today'}</h2>
          <p className="text-emerald-100/70 text-lg max-w-xl mx-auto mb-12 leading-relaxed">
            {wc?.closingBody || `Schedule a complimentary consultation with ${lead.companyName}. Let us show you why discerning clients trust us with their most important projects.`}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={`tel:${lead.phone}`}
              onClick={onCallClick}
              className="inline-flex items-center justify-center gap-2.5 bg-white text-emerald-800 px-10 py-4 rounded-xl font-semibold text-lg hover:bg-stone-100 transition-all duration-300 shadow-lg"
            >
              <Phone size={20} />
              {lead.phone || 'Call Now'}
            </a>
            <button
              onClick={onCTAClick}
              className="inline-flex items-center justify-center gap-2.5 border-2 border-white/30 text-white px-10 py-4 rounded-xl font-semibold text-lg hover:bg-white hover:text-emerald-800 transition-all duration-300"
            >
              {config.ctaText}
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* ─── Emerald-900 Footer ─── */}
      <footer className="bg-emerald-900 py-16 px-4 sm:px-6 border-t border-emerald-700/50">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
            <div>
              <h3 className="font-display text-emerald-300/80 font-light text-xl tracking-wide mb-4">{lead.companyName}</h3>
              <p className="text-emerald-100/40 text-sm leading-relaxed">
                Premium {industryLabel} services{location ? ` in ${location}` : ''}.
                Excellence in every detail, satisfaction with every engagement.
              </p>
            </div>
            <div>
              <h4 className="text-sm uppercase tracking-[0.2em] text-emerald-400/50 mb-5 font-medium">Services</h4>
              <ul className="space-y-3 text-sm text-emerald-100/40">
                {services.slice(0, 4).map((s, i) => (
                  <li key={i} className="flex items-center gap-2.5 hover:text-white transition-colors duration-300">
                    <CheckCircle size={12} className="text-emerald-500/50" />
                    {s}
                  </li>
                ))}
                {services.length === 0 && (
                  <li>Professional {industryLabel} services</li>
                )}
              </ul>
            </div>
            <div>
              <h4 className="text-sm uppercase tracking-[0.2em] text-emerald-400/50 mb-5 font-medium">Contact</h4>
              <div className="space-y-3 text-sm text-emerald-100/40">
                {lead.phone && <p className="flex items-center gap-2.5 hover:text-white transition-colors duration-300"><Phone size={14} className="text-emerald-500/50" /> {lead.phone}</p>}
                {lead.email && <p className="flex items-center gap-2.5 hover:text-white transition-colors duration-300"><Mail size={14} className="text-emerald-500/50" /> {lead.email}</p>}
                {lead.enrichedAddress && <p className="flex items-center gap-2.5"><MapPin size={14} className="text-emerald-500/50" /> {lead.enrichedAddress}</p>}
              </div>
            </div>
          </div>
          <div className="border-t border-emerald-800/50 pt-10 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-emerald-100/30 text-sm">&copy; {new Date().getFullYear()} {lead.companyName}</p>
            {location && <p className="text-emerald-100/20 text-xs">{location} &bull; {industryLabel}</p>}
          </div>
        </div>
      </footer>
    </div>
  )
}
