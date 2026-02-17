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

      {/* ─── Slim Nav ─── */}
      <nav className="sticky top-0 z-40 glass-dark border-b border-sky-400/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-[72px] flex items-center justify-between">
          <span className="font-display text-xl font-light text-white tracking-wide">{lead.companyName}</span>
          <div className="flex items-center gap-4">
            {lead.phone && (
              <a href={`tel:${lead.phone}`} onClick={onCallClick} className="hidden md:inline-flex items-center gap-2 text-sm text-slate-400 hover:text-sky-400 transition-colors font-medium">
                <Phone size={15} />
                {lead.phone}
              </a>
            )}
            <button onClick={onCTAClick} className="bg-gradient-to-r from-sky-500 to-blue-500 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:from-sky-400 hover:to-blue-400 transition-all shadow-md hover:shadow-lg animate-cta-glow">
              Schedule Consultation
            </button>
          </div>
        </div>
      </nav>

      {/* ─── Hero — elegant split layout ─── */}
      <section className="relative overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient}`} />
        <div className="absolute inset-0 bg-mesh-dark" />

        {/* Decorative ice-blue accents */}
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-sky-500/5 rounded-full -translate-y-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/3 rounded-full translate-y-1/2 -translate-x-1/4 blur-3xl" />
        <div className="absolute top-1/3 right-0 w-[300px] h-[300px] bg-indigo-500/3 rounded-full translate-x-1/3 blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-28 md:py-40">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            {/* Left — branding */}
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-sky-400/50 mb-6 font-medium">Welcome to</p>
              <h1 className="font-display text-4xl md:text-5xl lg:text-7xl font-light text-white mb-8 tracking-tight leading-[1.08]">
                {lead.companyName}
              </h1>
              <div className="w-20 h-0.5 bg-gradient-to-r from-sky-400 to-blue-500 mb-8" />
              <p className="text-lg md:text-xl text-slate-300 leading-relaxed mb-3">{wc?.heroHeadline || config.tagline}</p>
              {wc?.heroSubheadline && <p className="text-base text-slate-400 leading-relaxed mb-6">{wc.heroSubheadline}</p>}
              {location && (
                <p className="text-slate-500 flex items-center gap-2.5 text-base">
                  <MapPin size={16} className="text-sky-400/50" />
                  Serving {location} and surrounding areas
                </p>
              )}
            </div>

            {/* Right — CTA card */}
            <div className="border border-sky-400/15 rounded-3xl p-10 md:p-12 bg-slate-950/60 backdrop-blur-md shadow-2xl shadow-sky-500/5">
              {hasRating && (
                <div className="flex items-center gap-3 mb-8">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} size={18} className={i < Math.floor(lead.enrichedRating!) ? 'text-sky-400 fill-current' : 'text-slate-700'} />
                    ))}
                  </div>
                  <span className="text-sky-400 font-semibold">{lead.enrichedRating}</span>
                  {lead.enrichedReviews && <span className="text-slate-500 text-sm">({lead.enrichedReviews} reviews)</span>}
                </div>
              )}
              <h2 className="font-display text-2xl md:text-3xl font-light text-white mb-4">Let&apos;s Discuss Your Needs</h2>
              <p className="text-slate-400 mb-10 leading-relaxed text-lg">
                Schedule a complimentary consultation with our team. We&apos;ll provide personalized recommendations tailored to your specific requirements.
              </p>
              <div className="flex flex-col gap-4">
                <a
                  href={`tel:${lead.phone}`}
                  onClick={onCallClick}
                  className="inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-sky-500 to-blue-500 text-white px-8 py-4.5 rounded-xl font-semibold text-lg hover:from-sky-400 hover:to-blue-400 transition-all shadow-lg animate-cta-glow"
                >
                  <Phone size={20} />
                  Call Now
                </a>
                <button
                  onClick={onCTAClick}
                  className="inline-flex items-center justify-center gap-2.5 border border-sky-400/30 text-sky-400 px-8 py-4.5 rounded-xl font-semibold text-lg hover:bg-sky-500 hover:text-white transition-all"
                >
                  {config.ctaText}
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Trust Indicators ─── */}
      <section className="py-16 px-4 sm:px-6 bg-slate-950 border-y border-sky-400/10">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-10 md:gap-20">
          {hasRating && (
            <>
              <div className="text-center">
                <p className="font-display text-4xl font-light text-gradient-blue">{lead.enrichedRating}</p>
                <div className="flex justify-center mt-2 mb-2 gap-0.5">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} size={12} className={i < Math.floor(lead.enrichedRating!) ? 'text-sky-400 fill-current' : 'text-slate-700'} />
                  ))}
                </div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-medium">Rating</p>
              </div>
              <div className="hidden md:block w-px h-16 bg-sky-400/10" />
            </>
          )}
          {lead.enrichedReviews && (
            <>
              <div className="text-center">
                <p className="font-display text-4xl font-light text-gradient-blue">{lead.enrichedReviews}+</p>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-medium mt-2">Reviews</p>
              </div>
              <div className="hidden md:block w-px h-16 bg-sky-400/10" />
            </>
          )}
          <div className="text-center">
            <div className="flex items-center gap-2 mb-1">
              <Shield size={18} className="text-sky-400/70" />
              <p className="text-lg text-white font-light">{wc?.valueProps?.[0]?.title || 'Licensed & Insured'}</p>
            </div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-medium">{wc?.valueProps?.[0]?.description || 'Full Coverage'}</p>
          </div>
          <div className="hidden md:block w-px h-16 bg-sky-400/10" />
          {location && (
            <div className="text-center">
              <div className="flex items-center gap-2 mb-1">
                <MapPin size={18} className="text-sky-400/70" />
                <p className="text-lg text-white font-light">{location}</p>
              </div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-medium">Service Area</p>
            </div>
          )}
        </div>
      </section>

      {/* ─── Services ─── */}
      {services.length > 0 && (
        <section className="py-24 px-4 sm:px-6 bg-slate-900/50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-sm uppercase tracking-[0.25em] text-sky-400/60 mb-3 font-medium">Our Expertise</p>
              <h2 className="font-display text-4xl md:text-5xl font-light text-white mb-4">Services</h2>
              <p className="text-slate-400 max-w-xl mx-auto text-lg">Comprehensive {industryLabel} solutions delivered with precision and care.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {services.slice(0, 6).map((service, i) => (
                <div key={i} className="group flex items-center gap-5 bg-slate-950/60 border border-slate-800/30 rounded-2xl p-7 card-lift card-lift-dark hover:border-sky-400/20">
                  <div className="w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-sky-500/20 transition-colors">
                    <Scale size={20} className="text-sky-400" />
                  </div>
                  <div>
                    <h3 className="font-display font-medium text-white text-lg mb-1">{service}</h3>
                    <p className="text-slate-500 text-sm">{wc?.serviceDescriptions?.[service] || `Expert ${service.toLowerCase()} tailored to your requirements.`}</p>
                  </div>
                  <ArrowRight size={16} className="text-sky-500/0 group-hover:text-sky-500/60 transition-all ml-auto flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Our Approach ─── */}
      <section className="py-24 px-4 sm:px-6 bg-slate-950">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm uppercase tracking-[0.25em] text-sky-400/60 mb-3 font-medium">How We Work</p>
            <h2 className="font-display text-4xl md:text-5xl font-light text-white mb-4">Our Approach</h2>
            <p className="text-slate-400 text-lg">A refined process designed to deliver exceptional outcomes.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              { icon: Target, title: wc?.valueProps?.[0]?.title || 'Consultation', desc: wc?.valueProps?.[0]?.description || `We begin with a thorough consultation to understand your vision, assess your ${industryLabel} needs, and develop a tailored strategy.` },
              { icon: Briefcase, title: wc?.valueProps?.[1]?.title || 'Expert Execution', desc: wc?.valueProps?.[1]?.description || 'Our skilled professionals execute your project with meticulous attention to detail, using only premium materials and proven techniques.' },
              { icon: Handshake, title: wc?.valueProps?.[2]?.title || 'Lasting Results', desc: wc?.valueProps?.[2]?.description || 'We deliver results that exceed expectations and stand the test of time, backed by our commitment to your complete satisfaction.' },
            ].map((item, i) => (
              <div key={i} className="text-center group">
                <div className="w-20 h-20 rounded-2xl border border-sky-400/20 flex items-center justify-center mx-auto mb-8 group-hover:border-sky-400/40 group-hover:bg-sky-500/5 transition-all">
                  <item.icon size={30} className="text-sky-400" />
                </div>
                <h3 className="font-display text-xl font-medium text-white mb-4">{item.title}</h3>
                <p className="text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── About ─── */}
      <section className="py-24 px-4 sm:px-6 bg-slate-900/50">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-16">
          <div className="lg:col-span-3">
            <p className="text-sm uppercase tracking-[0.25em] text-sky-400/60 mb-3 font-medium">About</p>
            <h2 className="font-display text-4xl md:text-5xl font-light text-white mb-10">{lead.companyName}</h2>
            <div className="space-y-6 text-slate-400 leading-relaxed text-lg">
              <p>
                {wc?.aboutParagraph1 || `${lead.companyName} represents a commitment to excellence in ${industryLabel}.${location ? ` Serving ${location} and the surrounding region, we` : ' We'} combine deep expertise with a client-first philosophy to deliver results that consistently exceed expectations.`}
              </p>
              <p>
                {wc?.aboutParagraph2 || 'Our team of seasoned professionals brings a wealth of knowledge and meticulous attention to detail to every engagement. We understand that each client\u2019s needs are unique, which is why we take the time to develop customized solutions rather than one-size-fits-all approaches.'}
              </p>
              <p>
                From initial consultation through project completion, we maintain the highest standards of professionalism,
                communication, and craftsmanship.
              </p>
            </div>
            <div className="mt-12 flex flex-wrap gap-12">
              <div>
                <p className="font-display text-4xl font-light text-gradient-blue">{hasRating ? lead.enrichedRating : '5.0'}</p>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mt-2 font-medium">Star Rating</p>
              </div>
              {lead.enrichedReviews && (
                <div>
                  <p className="font-display text-4xl font-light text-gradient-blue">{lead.enrichedReviews}+</p>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mt-2 font-medium">Client Reviews</p>
                </div>
              )}
              <div>
                <p className="font-display text-4xl font-light text-gradient-blue">100%</p>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mt-2 font-medium">Satisfaction</p>
              </div>
            </div>
          </div>
          <div className="lg:col-span-2">
            <div className="border border-sky-400/15 rounded-3xl p-10 bg-slate-950/60 backdrop-blur-sm sticky top-24">
              <h3 className="font-display text-2xl font-light text-white mb-8">Contact</h3>
              <div className="space-y-5">
                {lead.phone && (
                  <a href={`tel:${lead.phone}`} onClick={onCallClick} className="flex items-center gap-4 text-slate-400 hover:text-sky-400 transition-colors p-3 rounded-xl hover:bg-white/5">
                    <div className="w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center flex-shrink-0">
                      <Phone size={20} className="text-sky-400" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.15em] text-slate-600 font-medium">Phone</p>
                      <p className="font-medium text-white text-lg">{lead.phone}</p>
                    </div>
                  </a>
                )}
                {lead.email && (
                  <a href={`mailto:${lead.email}`} className="flex items-center gap-4 text-slate-400 hover:text-sky-400 transition-colors p-3 rounded-xl hover:bg-white/5">
                    <div className="w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center flex-shrink-0">
                      <Mail size={20} className="text-sky-400" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.15em] text-slate-600 font-medium">Email</p>
                      <p className="font-medium text-white">{lead.email}</p>
                    </div>
                  </a>
                )}
                {lead.enrichedAddress && (
                  <div className="flex items-start gap-4 text-slate-400 p-3 rounded-xl">
                    <div className="w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center flex-shrink-0">
                      <MapPin size={20} className="text-sky-400" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.15em] text-slate-600 font-medium">Address</p>
                      <p className="font-medium text-white">{lead.enrichedAddress}</p>
                    </div>
                  </div>
                )}
              </div>
              <button onClick={onCTAClick} className="w-full mt-10 bg-gradient-to-r from-sky-500 to-blue-500 text-white py-4.5 rounded-xl font-semibold text-lg hover:from-sky-400 hover:to-blue-400 transition-all shadow-lg">
                {config.ctaText}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Photo Portfolio ─── */}
      {photos.length > 0 && (
        <section className="py-24 px-4 sm:px-6 bg-slate-950">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-sm uppercase tracking-[0.25em] text-sky-400/60 mb-3 font-medium">Portfolio</p>
              <h2 className="font-display text-4xl md:text-5xl font-light text-white mb-4">Our Work</h2>
              <p className="text-slate-400 text-lg">A selection of recent projects showcasing our commitment to excellence.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {photos.slice(0, 8).map((photo, i) => (
                <div key={i} className="group aspect-square bg-slate-900 rounded-2xl overflow-hidden border border-slate-800/50 hover:border-sky-400/20 transition-all duration-500 hover:shadow-xl hover:shadow-sky-500/5">
                  <img src={photo} alt={`${lead.companyName} project ${i + 1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Testimonial ─── */}
      <section className="py-24 px-4 sm:px-6 bg-slate-900/50">
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
          <p className="text-slate-500 text-sm tracking-wide font-medium">Satisfied Client{location ? ` — ${lead.city}` : ''}</p>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="py-24 px-4 sm:px-6 bg-slate-950 border-t border-sky-400/10 relative overflow-hidden">
        <div className="absolute inset-0 bg-mesh-dark" />
        <div className="absolute top-0 left-1/2 w-[500px] h-[500px] bg-sky-500/3 rounded-full -translate-y-1/2 -translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[350px] h-[350px] bg-blue-500/3 rounded-full translate-y-1/3 blur-3xl" />
        <div className="relative max-w-4xl mx-auto text-center">
          <p className="text-sm uppercase tracking-[0.25em] text-sky-400/60 mb-4 font-medium">Get Started</p>
          <h2 className="font-display text-4xl md:text-5xl font-light text-white mb-6">{wc?.closingHeadline || 'Begin Your Project Today'}</h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto mb-12 leading-relaxed">
            {wc?.closingBody || `Schedule a complimentary consultation with ${lead.companyName}. Let us show you why discerning clients trust us with their most important projects.`}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={`tel:${lead.phone}`}
              onClick={onCallClick}
              className="inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-sky-500 to-blue-500 text-white px-10 py-4.5 rounded-xl font-semibold text-lg hover:from-sky-400 hover:to-blue-400 transition-all shadow-lg animate-cta-glow"
            >
              <Phone size={20} />
              {lead.phone || 'Call Now'}
            </a>
            <button
              onClick={onCTAClick}
              className="inline-flex items-center justify-center gap-2.5 border border-sky-400/30 text-sky-400 px-10 py-4.5 rounded-xl font-semibold text-lg hover:bg-sky-500 hover:text-white transition-all"
            >
              {config.ctaText}
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="bg-slate-950 py-16 px-4 sm:px-6 border-t border-sky-400/10">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
            <div>
              <h3 className="font-display text-sky-400/70 font-light text-xl tracking-wide mb-4">{lead.companyName}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Premium {industryLabel} services{location ? ` in ${location}` : ''}.
                Excellence in every detail, satisfaction with every engagement.
              </p>
            </div>
            <div>
              <h4 className="text-sm uppercase tracking-[0.2em] text-sky-400/50 mb-5 font-medium">Services</h4>
              <ul className="space-y-3 text-sm text-slate-500">
                {services.slice(0, 4).map((s, i) => (
                  <li key={i} className="flex items-center gap-2.5 hover:text-white transition-colors">
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
                {lead.phone && <p className="flex items-center gap-2.5 hover:text-white transition-colors"><Phone size={14} className="text-sky-500/40" /> {lead.phone}</p>}
                {lead.email && <p className="flex items-center gap-2.5 hover:text-white transition-colors"><Mail size={14} className="text-sky-500/40" /> {lead.email}</p>}
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
