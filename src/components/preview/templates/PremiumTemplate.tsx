import { Phone, MapPin, Star, Shield, ArrowRight, Award, Mail, Clock, CheckCircle, Gem, Target, Handshake } from 'lucide-react'
import type { TemplateProps } from '../config/template-types'
import DisclaimerBanner from '../shared/DisclaimerBanner'

export default function PremiumTemplate({ lead, config, onCTAClick, onCallClick }: TemplateProps) {
  const services = lead.enrichedServices || []
  const photos = lead.enrichedPhotos || []
  const industryLabel = lead.industry.toLowerCase().replace(/_/g, ' ')
  const location = [lead.city, lead.state].filter(Boolean).join(', ')
  const hasRating = lead.enrichedRating && lead.enrichedRating > 0

  return (
    <div className="min-h-screen bg-gray-950">
      <DisclaimerBanner variant="premium" companyName={lead.companyName} />

      {/* ─── Slim Nav ─── */}
      <nav className="sticky top-0 z-40 bg-gray-950/95 backdrop-blur-md border-b border-amber-500/10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="text-lg font-light text-white tracking-wide">{lead.companyName}</span>
          <div className="flex items-center gap-4">
            {lead.phone && (
              <a href={`tel:${lead.phone}`} onClick={onCallClick} className="hidden sm:inline-flex items-center gap-2 text-sm text-gray-400 hover:text-amber-400 transition-colors">
                <Phone size={14} />
                {lead.phone}
              </a>
            )}
            <button onClick={onCTAClick} className="bg-amber-500 text-black px-5 py-2 rounded-lg text-sm font-semibold hover:bg-amber-400 transition-colors">
              Schedule Consultation
            </button>
          </div>
        </div>
      </nav>

      {/* ─── Hero — elegant split layout ─── */}
      <section className={`relative bg-gradient-to-br ${config.gradient} px-4`}>
        <div className="max-w-6xl mx-auto py-28 md:py-36">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            {/* Left — branding */}
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-amber-400/60 mb-6">Welcome to</p>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-white mb-6 tracking-tight leading-[1.1]">
                {lead.companyName}
              </h1>
              <div className="w-16 h-0.5 bg-amber-500 mb-8" />
              <p className="text-lg text-gray-300 leading-relaxed mb-6">{config.tagline}</p>
              {location && (
                <p className="text-gray-500 flex items-center gap-2">
                  <MapPin size={16} className="text-amber-500/50" />
                  Serving {location} and surrounding areas
                </p>
              )}
            </div>

            {/* Right — CTA card with rating */}
            <div className="border border-amber-500/20 rounded-2xl p-10 bg-gray-950/60 backdrop-blur-sm">
              {hasRating && (
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} size={18} className={i < Math.floor(lead.enrichedRating!) ? 'text-amber-400 fill-current' : 'text-gray-600'} />
                    ))}
                  </div>
                  <span className="text-amber-400 font-medium">{lead.enrichedRating}</span>
                  {lead.enrichedReviews && <span className="text-gray-500 text-sm">({lead.enrichedReviews} reviews)</span>}
                </div>
              )}
              <h2 className="text-2xl font-light text-white mb-3">Let&apos;s Discuss Your Needs</h2>
              <p className="text-gray-400 mb-8 leading-relaxed">
                Schedule a complimentary consultation with our team. We&apos;ll provide personalized recommendations tailored to your specific requirements.
              </p>
              <div className="flex flex-col gap-3">
                <a
                  href={`tel:${lead.phone}`}
                  onClick={onCallClick}
                  className="inline-flex items-center justify-center gap-2 bg-amber-500 text-black px-6 py-4 rounded-lg font-semibold hover:bg-amber-400 transition-colors"
                >
                  <Phone size={18} />
                  Call Now
                </a>
                <button
                  onClick={onCTAClick}
                  className="inline-flex items-center justify-center gap-2 border border-amber-500/50 text-amber-400 px-6 py-4 rounded-lg font-semibold hover:bg-amber-500 hover:text-black transition-colors"
                >
                  {config.ctaText}
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Trust Indicators ─── */}
      <section className="py-14 px-4 bg-gray-950 border-y border-amber-500/10">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-10 md:gap-20">
          {hasRating && (
            <div className="text-center">
              <p className="text-3xl font-light text-white mb-1">{lead.enrichedRating}</p>
              <div className="flex justify-center mb-1">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} size={12} className={i < Math.floor(lead.enrichedRating!) ? 'text-amber-400 fill-current' : 'text-gray-700'} />
                ))}
              </div>
              <p className="text-xs uppercase tracking-widest text-gray-500">Rating</p>
            </div>
          )}
          <div className="hidden md:block w-px h-14 bg-amber-500/10" />
          {lead.enrichedReviews && (
            <>
              <div className="text-center">
                <p className="text-3xl font-light text-white mb-1">{lead.enrichedReviews}+</p>
                <p className="text-xs uppercase tracking-widest text-gray-500">Reviews</p>
              </div>
              <div className="hidden md:block w-px h-14 bg-amber-500/10" />
            </>
          )}
          <div className="text-center">
            <p className="text-sm uppercase tracking-widest text-amber-400/70 mb-1">Licensed</p>
            <p className="text-lg text-white">& Insured</p>
          </div>
          <div className="hidden md:block w-px h-14 bg-amber-500/10" />
          {location && (
            <div className="text-center">
              <p className="text-sm uppercase tracking-widest text-amber-400/70 mb-1">Serving</p>
              <p className="text-lg text-white">{location}</p>
            </div>
          )}
        </div>
      </section>

      {/* ─── Services ─── */}
      {services.length > 0 && (
        <section className="py-20 px-4 bg-gray-900">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <p className="text-sm uppercase tracking-widest text-amber-400/70 mb-2">Our Expertise</p>
              <h2 className="text-3xl md:text-4xl font-light text-white mb-3">Services</h2>
              <p className="text-gray-400 max-w-xl mx-auto">Comprehensive {industryLabel} solutions delivered with precision and care.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {services.slice(0, 6).map((service, i) => (
                <div key={i} className="group flex items-center gap-5 bg-gray-950/50 border border-gray-800 rounded-xl p-6 hover:border-amber-500/30 transition-all duration-300">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-500/20 transition-colors">
                    <ArrowRight size={18} className="text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white mb-1">{service}</h3>
                    <p className="text-gray-500 text-sm">Expert {service.toLowerCase()} tailored to your requirements.</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Our Approach ─── */}
      <section className="py-20 px-4 bg-gray-950">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm uppercase tracking-widest text-amber-400/70 mb-2">How We Work</p>
            <h2 className="text-3xl md:text-4xl font-light text-white mb-3">Our Approach</h2>
            <p className="text-gray-400">A refined process designed to deliver exceptional outcomes.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Target, title: 'Consultation', desc: `We begin with a thorough consultation to understand your vision, assess your ${industryLabel} needs, and develop a tailored strategy.` },
              { icon: Gem, title: 'Expert Execution', desc: 'Our skilled professionals execute your project with meticulous attention to detail, using only premium materials and proven techniques.' },
              { icon: Handshake, title: 'Lasting Results', desc: 'We deliver results that exceed expectations and stand the test of time, backed by our commitment to your complete satisfaction.' },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 rounded-full border border-amber-500/30 flex items-center justify-center mx-auto mb-6">
                  <item.icon size={26} className="text-amber-400" />
                </div>
                <h3 className="text-xl font-medium text-white mb-3">{item.title}</h3>
                <p className="text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── About ─── */}
      <section className="py-20 px-4 bg-gray-900">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-14">
          <div className="lg:col-span-3">
            <p className="text-sm uppercase tracking-widest text-amber-400/70 mb-2">About</p>
            <h2 className="text-3xl md:text-4xl font-light text-white mb-8">{lead.companyName}</h2>
            <div className="space-y-5 text-gray-400 leading-relaxed">
              <p>
                {lead.companyName} represents a commitment to excellence in {industryLabel}.
                {location ? ` Serving ${location} and the surrounding region, we` : ' We'} combine deep expertise
                with a client-first philosophy to deliver results that consistently exceed expectations.
              </p>
              <p>
                Our team of seasoned professionals brings a wealth of knowledge and meticulous attention to detail
                to every engagement. We understand that each client&apos;s needs are unique, which is why we take the time
                to develop customized solutions rather than one-size-fits-all approaches.
              </p>
              <p>
                From initial consultation through project completion, we maintain the highest standards of professionalism,
                communication, and craftsmanship. Our reputation has been built one satisfied client at a time,
                and we intend to keep it that way.
              </p>
            </div>
            <div className="mt-10 flex flex-wrap gap-8">
              <div>
                <p className="text-3xl font-light text-white">{hasRating ? lead.enrichedRating : '5.0'}</p>
                <p className="text-xs uppercase tracking-widest text-gray-500 mt-1">Star Rating</p>
              </div>
              {lead.enrichedReviews && (
                <div>
                  <p className="text-3xl font-light text-white">{lead.enrichedReviews}+</p>
                  <p className="text-xs uppercase tracking-widest text-gray-500 mt-1">Client Reviews</p>
                </div>
              )}
              <div>
                <p className="text-3xl font-light text-white">100%</p>
                <p className="text-xs uppercase tracking-widest text-gray-500 mt-1">Satisfaction</p>
              </div>
            </div>
          </div>
          <div className="lg:col-span-2">
            <div className="border border-amber-500/20 rounded-2xl p-8 bg-gray-950/50 sticky top-24">
              <h3 className="text-xl font-light text-white mb-6">Contact</h3>
              <div className="space-y-5">
                {lead.phone && (
                  <a href={`tel:${lead.phone}`} onClick={onCallClick} className="flex items-center gap-4 text-gray-400 hover:text-amber-400 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                      <Phone size={18} className="text-amber-400" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-gray-600">Phone</p>
                      <p className="font-medium text-white">{lead.phone}</p>
                    </div>
                  </a>
                )}
                {lead.email && (
                  <a href={`mailto:${lead.email}`} className="flex items-center gap-4 text-gray-400 hover:text-amber-400 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                      <Mail size={18} className="text-amber-400" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-gray-600">Email</p>
                      <p className="font-medium text-white">{lead.email}</p>
                    </div>
                  </a>
                )}
                {lead.enrichedAddress && (
                  <div className="flex items-start gap-4 text-gray-400">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                      <MapPin size={18} className="text-amber-400" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-gray-600">Address</p>
                      <p className="font-medium text-white">{lead.enrichedAddress}</p>
                    </div>
                  </div>
                )}
              </div>
              <button onClick={onCTAClick} className="w-full mt-8 bg-amber-500 text-black py-4 rounded-lg font-semibold hover:bg-amber-400 transition-colors">
                {config.ctaText}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Photo Portfolio ─── */}
      {photos.length > 0 && (
        <section className="py-20 px-4 bg-gray-950">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <p className="text-sm uppercase tracking-widest text-amber-400/70 mb-2">Portfolio</p>
              <h2 className="text-3xl md:text-4xl font-light text-white mb-3">Our Work</h2>
              <p className="text-gray-400">A selection of recent projects showcasing our commitment to excellence.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {photos.slice(0, 8).map((photo, i) => (
                <div key={i} className="group aspect-square bg-gray-900 rounded-xl overflow-hidden border border-gray-800 hover:border-amber-500/30 transition-all duration-300">
                  <img src={photo} alt={`${lead.companyName} project ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Testimonial ─── */}
      <section className="py-20 px-4 bg-gray-900">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm uppercase tracking-widest text-amber-400/70 mb-8">Client Testimonial</p>
          <div className="flex justify-center mb-6">
            {Array.from({ length: 5 }, (_, i) => (
              <Star key={i} size={20} className="text-amber-400 fill-current" />
            ))}
          </div>
          <p className="text-xl md:text-2xl text-gray-300 leading-relaxed italic font-light mb-8">
            &ldquo;Working with {lead.companyName} was an exceptional experience. Their attention to detail,
            professionalism, and commitment to excellence truly set them apart. The results exceeded
            our expectations in every way.&rdquo;
          </p>
          <div className="w-12 h-0.5 bg-amber-500/30 mx-auto mb-4" />
          <p className="text-gray-500 text-sm tracking-wide">Satisfied Client{location ? ` — ${lead.city}` : ''}</p>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="py-20 px-4 bg-gray-950 border-t border-amber-500/10">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm uppercase tracking-widest text-amber-400/70 mb-4">Get Started</p>
          <h2 className="text-3xl md:text-4xl font-light text-white mb-4">Begin Your Project Today</h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto mb-10">
            Schedule a complimentary consultation with {lead.companyName}. Let us show you why discerning clients trust us with their most important projects.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={`tel:${lead.phone}`}
              onClick={onCallClick}
              className="inline-flex items-center justify-center gap-2 bg-amber-500 text-black px-10 py-4 rounded-lg font-semibold text-lg hover:bg-amber-400 transition-colors"
            >
              <Phone size={20} />
              {lead.phone || 'Call Now'}
            </a>
            <button
              onClick={onCTAClick}
              className="inline-flex items-center justify-center gap-2 border border-amber-500/50 text-amber-400 px-10 py-4 rounded-lg font-semibold text-lg hover:bg-amber-500 hover:text-black transition-colors"
            >
              {config.ctaText}
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="bg-black py-14 px-4 border-t border-amber-500/10">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
            <div>
              <h3 className="text-amber-400/80 font-light text-lg tracking-wide mb-3">{lead.companyName}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Premium {industryLabel} services{location ? ` in ${location}` : ''}.
                Excellence in every detail, satisfaction with every engagement.
              </p>
            </div>
            <div>
              <h4 className="text-sm uppercase tracking-widest text-amber-400/60 mb-4">Services</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                {services.slice(0, 4).map((s, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <CheckCircle size={12} className="text-amber-500/50" />
                    {s}
                  </li>
                ))}
                {services.length === 0 && (
                  <li>Professional {industryLabel} services</li>
                )}
              </ul>
            </div>
            <div>
              <h4 className="text-sm uppercase tracking-widest text-amber-400/60 mb-4">Contact</h4>
              <div className="space-y-2 text-sm text-gray-500">
                {lead.phone && <p className="flex items-center gap-2"><Phone size={14} className="text-amber-500/50" /> {lead.phone}</p>}
                {lead.email && <p className="flex items-center gap-2"><Mail size={14} className="text-amber-500/50" /> {lead.email}</p>}
                {lead.enrichedAddress && <p className="flex items-center gap-2"><MapPin size={14} className="text-amber-500/50" /> {lead.enrichedAddress}</p>}
              </div>
            </div>
          </div>
          <div className="border-t border-gray-900 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-700 text-sm">&copy; {new Date().getFullYear()} {lead.companyName}</p>
            {location && <p className="text-gray-800 text-xs">{location} &bull; {industryLabel}</p>}
          </div>
        </div>
      </footer>
    </div>
  )
}
