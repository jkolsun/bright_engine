import { Phone, MapPin, Star, Shield, Clock, CheckCircle, ArrowRight, Award, Mail, ChevronRight, Sparkles, Users, Camera, BadgeCheck, ThumbsUp, Zap } from 'lucide-react'
import type { TemplateProps } from '../config/template-types'
import DisclaimerBanner from '../shared/DisclaimerBanner'

export default function ModernBTemplate({ lead, config, onCTAClick, onCallClick, websiteCopy }: TemplateProps) {
  const services = lead.enrichedServices || []
  const photos = lead.enrichedPhotos || []
  const industryLabel = lead.industry.toLowerCase().replace(/_/g, ' ')
  const location = [lead.city, lead.state].filter(Boolean).join(', ')
  const hasRating = lead.enrichedRating && lead.enrichedRating > 0
  const wc = websiteCopy

  return (
    <div className="preview-template min-h-screen bg-white">
      <DisclaimerBanner variant="modern" companyName={lead.companyName} />

      {/* ─── Sticky Glass Nav ─── */}
      <nav className="sticky top-0 z-40 glass border-b border-gray-200/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-[72px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            {lead.logo && <img src={lead.logo} alt="" className="w-9 h-9 rounded-xl object-cover ring-2 ring-violet-100" />}
            <span className="font-display text-xl font-bold text-gray-900 tracking-tight">{lead.companyName}</span>
          </div>
          <div className="flex items-center gap-4">
            {lead.phone && (
              <a href={`tel:${lead.phone}`} onClick={onCallClick} className="hidden md:inline-flex items-center gap-2 text-sm text-gray-500 hover:text-violet-600 transition-colors font-medium">
                <Phone size={15} />
                {lead.phone}
              </a>
            )}
            <button onClick={onCTAClick} className="bg-gradient-to-r from-violet-500 to-purple-600 text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:from-violet-600 hover:to-purple-700 transition-all duration-300 shadow-md hover:shadow-lg animate-cta-glow-violet">
              Get a Free Quote
            </button>
          </div>
        </div>
      </nav>

      {/* ─── Split Hero ─── */}
      <section className="relative py-20 md:py-32 px-4 sm:px-6 overflow-hidden bg-mesh-light">
        <div className="absolute top-[-5%] left-[-10%] w-[500px] h-[500px] bg-gradient-to-br from-violet-200/40 to-purple-100/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '9s' }} />
        <div className="absolute bottom-[-10%] right-[-8%] w-[450px] h-[450px] bg-gradient-to-tl from-fuchsia-100/30 to-violet-50/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '7s' }} />

        <div className="relative max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="animate-fade-in-up">
              <div className="inline-flex items-center gap-2 bg-violet-50 border border-violet-200/60 text-violet-700 rounded-full px-4 py-2 text-sm font-semibold mb-6">
                <Sparkles size={14} />
                {hasRating ? `${lead.enrichedRating}-Star Rated` : 'Top Rated'} • {location || 'Your Area'}
              </div>
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 tracking-tight leading-[1.1]">
                {wc?.heroHeadline || `Expert ${industryLabel.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} You Can Trust`}
              </h1>
              <p className="text-lg md:text-xl text-gray-500 mb-4 leading-relaxed">
                {wc?.heroSubheadline || `${lead.companyName} delivers premium ${industryLabel} services with transparent pricing and guaranteed satisfaction.`}
              </p>
              {location && (
                <p className="text-gray-400 mb-10 flex items-center gap-2 text-base">
                  <MapPin size={16} className="text-violet-500" />
                  Serving {location} and surrounding areas
                </p>
              )}
              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href={`tel:${lead.phone}`}
                  onClick={onCallClick}
                  className="inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white px-9 py-4 rounded-full font-semibold text-lg hover:from-violet-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 animate-cta-glow-violet"
                >
                  <Phone size={20} />
                  Call Now — It&apos;s Free
                </a>
                <button
                  onClick={onCTAClick}
                  className="inline-flex items-center justify-center gap-2.5 bg-white border-2 border-gray-200 text-gray-700 px-9 py-4 rounded-full font-semibold text-lg hover:border-violet-400 hover:text-violet-600 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
                >
                  {config.ctaText}
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>

            {/* CTA Card with Rating */}
            <div className="animate-fade-in-up" style={{ animationDelay: '150ms' }}>
              <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-8 md:p-10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-violet-50 to-transparent rounded-bl-full" />
                <div className="relative">
                  {hasRating && (
                    <div className="flex items-center gap-3 mb-6">
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star key={i} size={20} className={i < Math.floor(lead.enrichedRating!) ? 'text-amber-400 fill-current' : 'text-gray-200'} />
                        ))}
                      </div>
                      <span className="font-display text-xl font-bold text-gray-900">{lead.enrichedRating}</span>
                      {lead.enrichedReviews && <span className="text-sm text-gray-400">({lead.enrichedReviews} reviews)</span>}
                    </div>
                  )}
                  <h3 className="font-display text-2xl font-bold text-gray-900 mb-2">Get Your Free Estimate</h3>
                  <p className="text-gray-500 mb-8">No obligation. Same-day response guaranteed.</p>

                  <div className="space-y-3 mb-8">
                    {[
                      'Free, no-obligation assessment',
                      'Licensed and fully insured',
                      'Transparent, upfront pricing',
                      'Same-day response time',
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 text-gray-600">
                        <CheckCircle size={18} className="text-violet-500 flex-shrink-0" />
                        <span className="text-sm">{item}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={onCTAClick}
                    className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:from-violet-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl mb-4"
                  >
                    Request a Quote
                  </button>
                  {lead.phone && (
                    <a
                      href={`tel:${lead.phone}`}
                      onClick={onCallClick}
                      className="w-full inline-flex items-center justify-center gap-2 border-2 border-gray-200 text-gray-700 py-3.5 rounded-xl font-semibold hover:border-violet-300 hover:text-violet-600 transition-all duration-300"
                    >
                      <Phone size={16} />
                      Or call {lead.phone}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Horizontal Badge Row ─── */}
      <section className="py-8 px-4 sm:px-6 border-b border-gray-100 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {[
              { icon: Shield, label: wc?.valueProps?.[0]?.title || 'Licensed & Insured' },
              { icon: Award, label: wc?.valueProps?.[1]?.title || 'Top Rated' },
              { icon: Clock, label: wc?.valueProps?.[2]?.title || 'Same-Day Response' },
              { icon: BadgeCheck, label: 'Satisfaction Guaranteed' },
              { icon: ThumbsUp, label: hasRating ? `${lead.enrichedRating}-Star Rated` : 'Trusted Pros' },
            ].map((badge, i) => (
              <div key={i} className="inline-flex items-center gap-2 bg-violet-50/60 border border-violet-100 rounded-full px-5 py-2.5 text-sm font-medium text-violet-700 hover:bg-violet-50 transition-colors duration-200">
                <badge.icon size={15} />
                {badge.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Alternating Feature Sections for Services ─── */}
      {services.length > 0 && (
        <div>
          {services.slice(0, 4).map((service, i) => {
            const isEven = i % 2 === 0
            const serviceIcons = [Sparkles, Zap, CheckCircle, Award]
            const ServiceIcon = serviceIcons[i % serviceIcons.length]
            const desc = wc?.serviceDescriptions?.[service] || `Expert ${service.toLowerCase()} solutions delivered with precision, quality materials, and meticulous attention to detail. We handle projects of every size with the same level of care and professionalism.`

            return (
              <section
                key={i}
                className={`py-20 px-4 sm:px-6 ${isEven ? 'bg-white' : 'bg-violet-50/30'}`}
              >
                <div className="max-w-6xl mx-auto">
                  <div className={`grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center ${!isEven ? 'md:[direction:rtl]' : ''}`}>
                    <div className={!isEven ? 'md:[direction:ltr]' : ''}>
                      <div className="inline-flex items-center gap-2 bg-violet-50 text-violet-600 rounded-full px-4 py-1.5 text-sm font-semibold mb-5">
                        Service {String(i + 1).padStart(2, '0')}
                      </div>
                      <h3 className="font-display text-3xl md:text-4xl font-bold text-gray-900 mb-5">{service}</h3>
                      <p className="text-gray-500 text-lg leading-relaxed mb-8">{desc}</p>
                      <button
                        onClick={onCTAClick}
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white px-8 py-3.5 rounded-full font-semibold hover:from-violet-600 hover:to-purple-700 transition-all duration-300 shadow-md hover:shadow-lg"
                      >
                        Get a Quote
                        <ArrowRight size={16} />
                      </button>
                    </div>
                    <div className={`flex justify-center ${!isEven ? 'md:[direction:ltr]' : ''}`}>
                      <div className="relative">
                        <div className="w-48 h-48 md:w-56 md:h-56 rounded-3xl bg-gradient-to-br from-violet-100 to-purple-50 flex items-center justify-center">
                          <div className="w-28 h-28 md:w-32 md:h-32 rounded-2xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center shadow-xl">
                            <ServiceIcon size={48} className="text-white" />
                          </div>
                        </div>
                        <div className="absolute -top-3 -right-3 w-20 h-20 bg-gradient-to-br from-fuchsia-100/50 to-transparent rounded-full blur-xl" />
                        <div className="absolute -bottom-3 -left-3 w-16 h-16 bg-gradient-to-br from-violet-100/40 to-transparent rounded-full blur-xl" />
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )
          })}
        </div>
      )}

      {/* ─── Full-Width Social Proof Banner ─── */}
      <section className="relative py-14 px-4 sm:px-6 bg-gradient-to-r from-violet-600 via-purple-600 to-violet-600 overflow-hidden">
        <div className="absolute inset-0 bg-noise opacity-10" />
        <div className="relative max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 text-center md:text-left">
            {hasRating && (
              <div className="flex items-center gap-3">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} size={22} className={i < Math.floor(lead.enrichedRating!) ? 'text-amber-300 fill-current' : 'text-white/30'} />
                  ))}
                </div>
                <span className="text-white font-display text-2xl font-bold">{lead.enrichedRating}</span>
                {lead.enrichedReviews && <span className="text-white/70">({lead.enrichedReviews}+ reviews)</span>}
              </div>
            )}
            <div className="hidden md:block w-px h-10 bg-white/20" />
            <div className="flex items-center gap-2.5">
              <Users size={20} className="text-white/80" />
              <span className="text-white font-semibold text-lg">
                Trusted by homeowners in {location || 'your area'}
              </span>
            </div>
            <div className="hidden md:block w-px h-10 bg-white/20" />
            <a
              href={`tel:${lead.phone}`}
              onClick={onCallClick}
              className="inline-flex items-center gap-2 bg-white text-violet-700 px-6 py-3 rounded-full font-bold hover:bg-gray-50 transition-all shadow-lg"
            >
              <Phone size={18} />
              Call Now
            </a>
          </div>
        </div>
      </section>

      {/* ─── About Section ─── */}
      <section className="py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-violet-50 text-violet-600 rounded-full px-4 py-1.5 text-sm font-semibold mb-5">
              About {lead.companyName}
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-8 leading-tight">
              Your Trusted {industryLabel.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Professionals
            </h2>
          </div>

          <div className="space-y-6 text-gray-600 text-lg leading-relaxed mb-14">
            <p>
              {wc?.aboutParagraph1 || `At ${lead.companyName}, we believe every client deserves exceptional ${industryLabel} service delivered with integrity and professionalism.${location ? ` Based in ${location}, we've built our reputation on honest work, transparent pricing, and results that speak for themselves.` : ' We\'ve built our reputation on honest work, transparent pricing, and results that speak for themselves.'}`}
            </p>
            <p>
              {wc?.aboutParagraph2 || 'Our team of experienced professionals is fully licensed and insured, bringing deep expertise to every project — no matter the size. From initial consultation to final walkthrough, we keep you informed and ensure complete satisfaction.'}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: hasRating ? `${lead.enrichedRating}` : '5.0', label: 'Star Rating' },
              { value: lead.enrichedReviews ? `${lead.enrichedReviews}+` : '100+', label: lead.enrichedReviews ? 'Reviews' : 'Projects' },
              { value: '100%', label: 'Satisfaction' },
              { value: 'Same Day', label: 'Response Time' },
            ].map((stat, i) => (
              <div key={i} className="p-6 rounded-2xl bg-violet-50/50 border border-violet-100">
                <p className="font-display text-3xl md:text-4xl font-bold text-gradient-violet">{stat.value}</p>
                <p className="text-sm text-gray-500 font-medium mt-2">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Gallery ─── */}
      {photos.length > 0 && (
        <section className="py-24 px-4 sm:px-6 bg-gradient-to-b from-gray-50 to-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-violet-50 text-violet-600 rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
                <Camera size={14} />
                Portfolio
              </div>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-4">Our Recent Work</h2>
              <p className="text-gray-500 text-lg">See the quality and craftsmanship we bring to every project.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[180px] md:auto-rows-[200px]">
              {photos.slice(0, 8).map((photo, i) => {
                const isFeatured = i === 0
                return (
                  <div
                    key={i}
                    className={`group relative bg-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 ${
                      isFeatured ? 'col-span-2 row-span-2' : ''
                    }`}
                  >
                    <img
                      src={photo}
                      alt={`${lead.companyName} project ${i + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    {isFeatured && (
                      <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <button onClick={onCTAClick} className="inline-flex items-center gap-1.5 bg-white/90 backdrop-blur-sm text-gray-900 text-sm font-semibold px-4 py-2 rounded-full">
                          <Camera size={14} />
                          Get a Quote
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ─── Service Area ─── */}
      {location && (
        <section className="py-20 px-4 sm:px-6 bg-white">
          <div className="max-w-4xl mx-auto text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center mx-auto mb-8 shadow-lg">
              <MapPin size={32} className="text-white" />
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-6">Serving {location}</h2>
            <p className="text-gray-500 text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
              {lead.companyName} proudly serves {lead.city} and the greater {lead.state} area.
              We&apos;re your local {industryLabel} experts — always nearby and ready to help.
            </p>
            <div className="inline-flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-full px-7 py-3.5 shadow-sm">
              <Users size={18} className="text-violet-500" />
              <span className="text-gray-700 font-semibold">Locally owned and operated</span>
            </div>
          </div>
        </section>
      )}

      {/* ─── Final CTA Section ─── */}
      <section className="relative py-24 px-4 sm:px-6 bg-gradient-to-br from-violet-600 via-purple-600 to-violet-700 overflow-hidden">
        <div className="absolute inset-0 bg-noise opacity-10" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-400/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-6">
            {wc?.closingHeadline || 'Ready to Get Started?'}
          </h2>
          <p className="text-xl text-white/80 mb-12 max-w-xl mx-auto leading-relaxed">
            {wc?.closingBody || 'Get a free estimate on your project today. No obligation, no pressure — just honest advice from local professionals.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={`tel:${lead.phone}`}
              onClick={onCallClick}
              className="inline-flex items-center justify-center gap-2.5 bg-white text-violet-700 px-10 py-4 rounded-full font-bold text-lg hover:bg-gray-50 transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-0.5"
            >
              <Phone size={20} />
              {lead.phone || 'Call Now'}
            </a>
            <button
              onClick={onCTAClick}
              className="inline-flex items-center justify-center gap-2.5 border-2 border-white/50 text-white px-10 py-4 rounded-full font-bold text-lg hover:bg-white hover:text-violet-700 transition-all duration-300"
            >
              {config.ctaText}
            </button>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="bg-gray-950 py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
            <div>
              <h3 className="font-display text-white font-bold text-xl mb-4">{lead.companyName}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Professional {industryLabel} services{location ? ` in ${location}` : ''}.
                Quality workmanship, honest pricing, and customer satisfaction guaranteed.
              </p>
              {hasRating && (
                <div className="flex items-center gap-2 mt-4">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} size={12} className={i < Math.floor(lead.enrichedRating!) ? 'text-amber-400 fill-current' : 'text-gray-700'} />
                    ))}
                  </div>
                  <span className="text-gray-400 text-sm">{lead.enrichedRating} rating</span>
                </div>
              )}
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Quick Links</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                <li className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer"><ChevronRight size={12} className="text-violet-400" /> Our Services</li>
                <li className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer"><ChevronRight size={12} className="text-violet-400" /> About Us</li>
                <li className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer"><ChevronRight size={12} className="text-violet-400" /> Contact</li>
                <li className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer"><ChevronRight size={12} className="text-violet-400" /> Free Estimate</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Contact</h4>
              <div className="space-y-3 text-sm text-gray-400">
                {lead.phone && <a href={`tel:${lead.phone}`} onClick={onCallClick} className="flex items-center gap-2.5 hover:text-white transition-colors"><Phone size={14} className="text-violet-400" /> {lead.phone}</a>}
                {lead.email && <a href={`mailto:${lead.email}`} className="flex items-center gap-2.5 hover:text-white transition-colors"><Mail size={14} className="text-violet-400" /> {lead.email}</a>}
                {lead.enrichedAddress && <p className="flex items-center gap-2.5"><MapPin size={14} className="text-violet-400" /> {lead.enrichedAddress}</p>}
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-10 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">&copy; {new Date().getFullYear()} {lead.companyName}. All rights reserved.</p>
            {location && <p className="text-gray-600 text-xs">Professional {industryLabel} services in {location}</p>}
          </div>
        </div>
      </footer>

      {/* ─── Floating Phone Button ─── */}
      <a
        href={`tel:${lead.phone}`}
        onClick={onCallClick}
        className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center shadow-2xl hover:shadow-xl hover:from-violet-600 hover:to-purple-700 transition-all duration-300 hover:scale-110 animate-cta-glow-violet"
        aria-label="Call us"
      >
        <Phone size={26} />
      </a>
    </div>
  )
}
