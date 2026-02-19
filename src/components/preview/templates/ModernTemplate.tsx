import { Phone, MapPin, Star, Shield, Clock, CheckCircle, ArrowRight, Mail, ChevronRight, Sparkles, Zap, MessageSquare, Camera, Users, Award, ThumbsUp } from 'lucide-react'
import type { TemplateProps } from '../config/template-types'
import DisclaimerBanner from '../shared/DisclaimerBanner'

export default function ModernTemplate({ lead, config, onCTAClick, onCallClick, websiteCopy }: TemplateProps) {
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
            {lead.logo && <img src={lead.logo} alt="" className="w-9 h-9 rounded-xl object-cover ring-2 ring-teal-100" />}
            <span className="font-display text-xl font-bold text-gray-900 tracking-tight">{lead.companyName}</span>
          </div>
          <div className="flex items-center gap-4">
            {lead.phone && (
              <a href={`tel:${lead.phone}`} onClick={onCallClick} className="hidden md:inline-flex items-center gap-2 text-sm text-gray-500 hover:text-teal-600 transition-colors font-medium">
                <Phone size={15} />
                {lead.phone}
              </a>
            )}
            <button onClick={onCTAClick} className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:from-teal-600 hover:to-cyan-600 transition-all duration-300 shadow-md hover:shadow-lg animate-cta-glow-teal">
              Get a Free Quote
            </button>
          </div>
        </div>
      </nav>

      {/* ─── Hero with Animated Gradient Mesh ─── */}
      <section className="relative py-28 md:py-44 px-4 sm:px-6 overflow-hidden bg-mesh-light">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-gradient-to-bl from-teal-200/50 to-cyan-100/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[-15%] left-[-8%] w-[500px] h-[500px] bg-gradient-to-tr from-cyan-200/40 to-teal-50/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute top-[30%] left-[60%] w-[250px] h-[250px] bg-gradient-to-br from-emerald-100/30 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />

        <div className="relative max-w-5xl mx-auto text-center">
          <div className="animate-fade-in-up">
            <div className="inline-flex items-center gap-2 bg-teal-50 border border-teal-200/60 text-teal-700 rounded-full px-5 py-2 text-sm font-semibold mb-8">
              <Sparkles size={14} />
              {hasRating ? `${lead.enrichedRating}-Star Rated` : 'Top Rated'} {industryLabel} in {location || 'your area'}
            </div>

            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold text-gray-900 mb-8 tracking-tight leading-[1.05]">
              {wc?.heroHeadline || lead.companyName}
            </h1>

            <div className="w-28 h-1.5 bg-gradient-to-r from-teal-400 via-cyan-400 to-emerald-400 mx-auto mb-8 rounded-full" />

            <p className="text-xl md:text-2xl text-gray-500 mb-4 max-w-2xl mx-auto leading-relaxed font-light">
              {wc?.heroSubheadline || config.tagline}
            </p>
            {location && (
              <p className="text-gray-400 mb-12 flex items-center justify-center gap-2 text-base">
                <MapPin size={16} className="text-teal-500" />
                Serving {location} and surrounding areas
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href={`tel:${lead.phone}`}
                onClick={onCallClick}
                className="inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-10 py-4 rounded-full font-semibold text-lg hover:from-teal-600 hover:to-cyan-600 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 animate-cta-glow-teal"
              >
                <Phone size={20} />
                Call Now — Free Estimate
              </a>
              <button
                onClick={onCTAClick}
                className="inline-flex items-center justify-center gap-2.5 bg-white border-2 border-gray-200 text-gray-700 px-10 py-4 rounded-full font-semibold text-lg hover:border-teal-400 hover:text-teal-600 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
              >
                {config.ctaText}
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Floating Stats Bar ─── */}
      <section className="relative z-10 px-4 sm:px-6 -mt-10">
        <div className="max-w-4xl mx-auto">
          <div className="glass rounded-2xl border border-white/60 shadow-xl px-6 py-6 sm:px-10 sm:py-7">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
              {hasRating && (
                <div className="flex flex-col items-center gap-1.5">
                  <div className="flex gap-0.5 mb-1">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} size={16} className={i < Math.floor(lead.enrichedRating!) ? 'text-amber-400 fill-current' : 'text-gray-200'} />
                    ))}
                  </div>
                  <p className="font-display text-2xl font-bold text-gray-900">{lead.enrichedRating}</p>
                  <p className="text-xs text-gray-400 font-medium">Star Rating</p>
                </div>
              )}
              {lead.enrichedReviews && (
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center mb-0.5">
                    <MessageSquare size={18} className="text-teal-500" />
                  </div>
                  <p className="font-display text-2xl font-bold text-gray-900">{lead.enrichedReviews}+</p>
                  <p className="text-xs text-gray-400 font-medium">Happy Customers</p>
                </div>
              )}
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center mb-0.5">
                  <Shield size={18} className="text-cyan-500" />
                </div>
                <p className="font-display text-2xl font-bold text-gray-900">100%</p>
                <p className="text-xs text-gray-400 font-medium">Licensed & Insured</p>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-0.5">
                  <Zap size={18} className="text-emerald-500" />
                </div>
                <p className="font-display text-2xl font-bold text-gray-900">Same Day</p>
                <p className="text-xs text-gray-400 font-medium">Response Time</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Bento Grid Services ─── */}
      {services.length > 0 && (
        <section className="py-24 px-4 sm:px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-600 rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
                <Sparkles size={14} />
                What We Offer
              </div>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-4">Our Services</h2>
              <p className="text-gray-500 max-w-xl mx-auto text-lg">
                Professional {industryLabel} services tailored to your exact needs.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {services.slice(0, 6).map((service, i) => {
                const isFeatured = i < 2
                return (
                  <div
                    key={i}
                    className={`group relative rounded-2xl border overflow-hidden card-lift transition-all duration-500 ${
                      isFeatured
                        ? 'lg:col-span-2 bg-gradient-to-br from-gray-50 to-white border-teal-100 hover:border-teal-300 p-10'
                        : 'bg-white border-gray-100 hover:border-teal-200 p-7'
                    }`}
                  >
                    <div className={`rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-md ${
                      isFeatured ? 'w-16 h-16' : 'w-12 h-12'
                    }`}>
                      <CheckCircle size={isFeatured ? 28 : 22} className="text-white" />
                    </div>
                    <h3 className={`font-display font-bold text-gray-900 mb-3 ${isFeatured ? 'text-2xl' : 'text-lg'}`}>
                      {service}
                    </h3>
                    <p className={`text-gray-500 leading-relaxed ${isFeatured ? 'text-base' : 'text-sm'}`}>
                      {wc?.serviceDescriptions?.[service] || `Expert ${service.toLowerCase()} solutions delivered with precision, quality materials, and attention to detail.`}
                    </p>
                    {isFeatured && (
                      <button
                        onClick={onCTAClick}
                        className="mt-6 inline-flex items-center gap-2 text-teal-600 font-semibold text-sm hover:text-teal-700 transition-colors"
                      >
                        Get a free quote <ArrowRight size={15} />
                      </button>
                    )}
                    <div className={`flex items-center gap-1.5 text-teal-500 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0 ${isFeatured ? 'hidden' : 'mt-4'}`}>
                      Learn more <ChevronRight size={14} />
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="text-center mt-12">
              <button
                onClick={onCTAClick}
                className="inline-flex items-center gap-2 text-teal-600 font-semibold hover:text-teal-700 transition-colors text-lg"
              >
                View all services <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ─── Social Proof Banner ─── */}
      <section className="relative py-14 px-4 sm:px-6 bg-gradient-to-r from-teal-600 via-cyan-600 to-teal-600 overflow-hidden">
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
              <ThumbsUp size={20} className="text-white/80" />
              <span className="text-white font-semibold text-lg">
                Trusted by homeowners in {location || 'your area'}
              </span>
            </div>
            <div className="hidden md:block w-px h-10 bg-white/20" />
            <a
              href={`tel:${lead.phone}`}
              onClick={onCallClick}
              className="inline-flex items-center gap-2 bg-white text-teal-700 px-6 py-3 rounded-full font-bold hover:bg-gray-50 transition-all shadow-lg"
            >
              <Phone size={18} />
              Call Now
            </a>
          </div>
        </div>
      </section>

      {/* ─── Connected Timeline: How It Works ─── */}
      <section className="py-24 px-4 sm:px-6 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-600 rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
              <Clock size={14} />
              Simple Process
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-gray-500 text-lg">Three simple steps to get your project started.</p>
          </div>

          <div className="relative">
            <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-teal-300 via-cyan-300 to-emerald-300 md:-translate-x-px hidden sm:block" />

            {[
              { step: '01', title: 'Get in Touch', desc: `Call us or request a quote online. We'll discuss your ${industryLabel} needs and schedule a time that works for you.` },
              { step: '02', title: 'Free Consultation', desc: 'Our team will assess your project, provide expert recommendations, and deliver a transparent, no-obligation estimate.' },
              { step: '03', title: 'We Get to Work', desc: 'Once approved, our skilled professionals handle everything from start to finish with quality craftsmanship guaranteed.' },
            ].map((item, i) => (
              <div key={item.step} className={`relative flex items-start gap-8 mb-16 last:mb-0 ${i % 2 === 1 ? 'md:flex-row-reverse' : ''}`}>
                <div className="hidden sm:flex absolute left-6 md:left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 text-white text-sm font-bold items-center justify-center font-display shadow-lg z-10 ring-4 ring-white">
                  {item.step}
                </div>
                <div className={`sm:pl-20 md:pl-0 md:w-[calc(50%-3rem)] ${i % 2 === 1 ? 'md:mr-auto md:text-right' : 'md:ml-auto md:text-left'}`}>
                  <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm hover:shadow-md transition-shadow duration-300">
                    <div className="sm:hidden w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 text-white text-sm font-bold flex items-center justify-center mb-4 font-display shadow-md">
                      {item.step}
                    </div>
                    <h3 className="font-display text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                    <p className="text-gray-500 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-16">
            <button
              onClick={onCTAClick}
              className="inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-10 py-4 rounded-full font-semibold text-lg hover:from-teal-600 hover:to-cyan-600 transition-all duration-300 shadow-lg hover:shadow-xl animate-cta-glow-teal"
            >
              Start Your Project Today
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* ─── About with Sticky Contact Sidebar ─── */}
      <section className="py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-8 gap-14">
            <div className="lg:col-span-5">
              <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-600 rounded-full px-4 py-1.5 text-sm font-semibold mb-6">
                About Us
              </div>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-8 leading-tight">
                Your Trusted Local {industryLabel.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Experts
              </h2>
              <div className="space-y-5 text-gray-600 leading-relaxed text-lg">
                <p>
                  {wc?.aboutParagraph1 || `At ${lead.companyName}, we believe every client deserves exceptional ${industryLabel} service delivered with integrity and professionalism.${location ? ` Based in ${location}, we've built our reputation on honest work, transparent pricing, and results that speak for themselves.` : ' We\'ve built our reputation on honest work, transparent pricing, and results that speak for themselves.'}`}
                </p>
                <p>
                  {wc?.aboutParagraph2 || 'Our team of experienced professionals is fully licensed and insured, bringing deep expertise to every project — no matter the size. From initial consultation to final walkthrough, we keep you informed and ensure complete satisfaction.'}
                </p>
              </div>

              {/* Value props grid */}
              <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6">
                {(wc?.valueProps || [
                  { title: 'Licensed & Insured', description: 'Full protection on every job' },
                  { title: 'Satisfaction Guaranteed', description: 'We stand behind our work' },
                  { title: 'Transparent Pricing', description: 'No hidden fees, no surprises' },
                ]).slice(0, 3).map((prop, i) => (
                  <div key={i} className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-100 p-5">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center mb-3">
                      <CheckCircle size={18} className="text-white" />
                    </div>
                    <h4 className="font-display font-bold text-gray-900 mb-1">{prop.title}</h4>
                    <p className="text-sm text-gray-500">{prop.description}</p>
                  </div>
                ))}
              </div>

              <div className="mt-10 grid grid-cols-3 gap-8">
                <div>
                  <p className="font-display text-4xl font-bold text-gradient-teal">{hasRating ? lead.enrichedRating : '5.0'}</p>
                  <p className="text-sm text-gray-400 font-medium mt-1">Star Rating</p>
                </div>
                {lead.enrichedReviews ? (
                  <div>
                    <p className="font-display text-4xl font-bold text-gradient-teal">{lead.enrichedReviews}+</p>
                    <p className="text-sm text-gray-400 font-medium mt-1">Reviews</p>
                  </div>
                ) : (
                  <div>
                    <p className="font-display text-4xl font-bold text-gradient-teal">10+</p>
                    <p className="text-sm text-gray-400 font-medium mt-1">Years Exp.</p>
                  </div>
                )}
                <div>
                  <p className="font-display text-4xl font-bold text-gradient-teal">100%</p>
                  <p className="text-sm text-gray-400 font-medium mt-1">Satisfaction</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-3">
              <div className="bg-gradient-to-br from-gray-50 to-white rounded-3xl border border-gray-100 p-8 sticky top-24 shadow-sm">
                <h3 className="font-display text-2xl font-bold text-gray-900 mb-2">Ready to Get Started?</h3>
                <p className="text-gray-500 text-sm mb-6">Contact us for a free, no-obligation estimate.</p>
                <div className="space-y-4">
                  {lead.phone && (
                    <a href={`tel:${lead.phone}`} onClick={onCallClick} className="flex items-center gap-4 text-gray-600 hover:text-gray-900 transition-colors p-3 rounded-xl hover:bg-gray-50">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Phone size={20} className="text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Call Us Now</p>
                        <p className="font-semibold text-gray-900">{lead.phone}</p>
                      </div>
                    </a>
                  )}
                  {lead.email && (
                    <a href={`mailto:${lead.email}`} className="flex items-center gap-4 text-gray-600 hover:text-gray-900 transition-colors p-3 rounded-xl hover:bg-gray-50">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Mail size={20} className="text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Email</p>
                        <p className="font-semibold text-gray-900">{lead.email}</p>
                      </div>
                    </a>
                  )}
                  {lead.enrichedAddress && (
                    <div className="flex items-start gap-4 text-gray-600 p-3 rounded-xl">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <MapPin size={20} className="text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Address</p>
                        <p className="font-semibold text-gray-900">{lead.enrichedAddress}</p>
                      </div>
                    </div>
                  )}
                </div>
                <button onClick={onCTAClick} className="w-full mt-8 bg-gradient-to-r from-teal-500 to-cyan-500 text-white py-4 rounded-xl font-semibold text-lg hover:from-teal-600 hover:to-cyan-600 transition-all duration-300 shadow-md hover:shadow-lg">
                  Get Your Free Quote
                </button>
                <p className="text-center text-xs text-gray-400 mt-3">No obligation • Free estimate • Fast response</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Testimonial ─── */}
      <section className="py-20 px-4 sm:px-6 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-600 rounded-full px-4 py-1.5 text-sm font-semibold mb-8">
            <Award size={14} />
            What Our Customers Say
          </div>
          <div className="flex justify-center mb-6 gap-1">
            {Array.from({ length: 5 }, (_, i) => (
              <Star key={i} size={28} className="text-amber-400 fill-current" />
            ))}
          </div>
          <p className="text-xl md:text-2xl text-gray-700 leading-relaxed italic font-light mb-8 max-w-3xl mx-auto">
            &ldquo;{lead.companyName} did an outstanding job from start to finish. They were professional,
            on time, and the quality of work exceeded our expectations. We&apos;ve already recommended them
            to all our neighbors. Truly the best {industryLabel} company in the area!&rdquo;
          </p>
          <div className="w-12 h-0.5 bg-teal-400 mx-auto mb-4 rounded-full" />
          <p className="text-gray-500 font-semibold">Happy Homeowner</p>
          {location && <p className="text-gray-400 text-sm mt-1">{lead.city}, {lead.state}</p>}
        </div>
      </section>

      {/* ─── Masonry Photo Gallery ─── */}
      {photos.length > 0 && (
        <section className="py-24 px-4 sm:px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-600 rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
                <Camera size={14} />
                Portfolio
              </div>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-4">Our Recent Work</h2>
              <p className="text-gray-500 text-lg">See the quality and craftsmanship we bring to every project.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-[180px] md:auto-rows-[200px]">
              {photos.slice(0, 8).map((photo, i) => {
                const isLarge = i === 0 || i === 3
                return (
                  <div
                    key={i}
                    className={`group relative bg-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 ${
                      isLarge ? 'row-span-2' : ''
                    }`}
                  >
                    <img
                      src={photo}
                      alt={`${lead.companyName} project ${i + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <button onClick={onCTAClick} className="inline-flex items-center gap-1.5 bg-white/90 backdrop-blur-sm text-gray-900 text-xs font-semibold px-3 py-1.5 rounded-full">
                        Get a quote <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ─── Service Area ─── */}
      {location && (
        <section className="py-20 px-4 sm:px-6 bg-gradient-to-b from-gray-50 to-white">
          <div className="max-w-4xl mx-auto text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center mx-auto mb-8 shadow-lg">
              <MapPin size={32} className="text-white" />
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-6">Serving {location}</h2>
            <p className="text-gray-500 text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
              {lead.companyName} proudly serves {lead.city} and the greater {lead.state} area.
              We&apos;re your local {industryLabel} experts — always nearby and ready to help.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                { icon: Users, label: 'Locally Owned' },
                { icon: Shield, label: 'Fully Licensed' },
                { icon: Clock, label: 'Same-Day Response' },
                { icon: CheckCircle, label: 'Satisfaction Guaranteed' },
              ].map((item, i) => (
                <div key={i} className="inline-flex items-center gap-2.5 bg-white border border-gray-200 rounded-full px-5 py-2.5 shadow-sm">
                  <item.icon size={16} className="text-teal-500" />
                  <span className="text-gray-700 font-semibold text-sm">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Full-Width Gradient CTA ─── */}
      <section className="relative py-24 px-4 sm:px-6 bg-gradient-to-br from-teal-600 via-teal-500 to-cyan-500 overflow-hidden">
        <div className="absolute inset-0 bg-noise opacity-10" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-400/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
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
              className="inline-flex items-center justify-center gap-2.5 bg-white text-teal-700 px-10 py-4 rounded-full font-bold text-lg hover:bg-gray-50 transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-0.5"
            >
              <Phone size={20} />
              {lead.phone || 'Call Now'}
            </a>
            <button
              onClick={onCTAClick}
              className="inline-flex items-center justify-center gap-2.5 border-2 border-white/50 text-white px-10 py-4 rounded-full font-bold text-lg hover:bg-white hover:text-teal-700 transition-all duration-300"
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
                <li className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer"><ChevronRight size={12} className="text-teal-400" /> Our Services</li>
                <li className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer"><ChevronRight size={12} className="text-teal-400" /> About Us</li>
                <li className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer"><ChevronRight size={12} className="text-teal-400" /> Contact</li>
                <li className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer"><ChevronRight size={12} className="text-teal-400" /> Free Estimate</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Contact</h4>
              <div className="space-y-3 text-sm text-gray-400">
                {lead.phone && <a href={`tel:${lead.phone}`} onClick={onCallClick} className="flex items-center gap-2.5 hover:text-white transition-colors"><Phone size={14} className="text-teal-400" /> {lead.phone}</a>}
                {lead.email && <a href={`mailto:${lead.email}`} className="flex items-center gap-2.5 hover:text-white transition-colors"><Mail size={14} className="text-teal-400" /> {lead.email}</a>}
                {lead.enrichedAddress && <p className="flex items-center gap-2.5"><MapPin size={14} className="text-teal-400" /> {lead.enrichedAddress}</p>}
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-10 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">&copy; {new Date().getFullYear()} {lead.companyName}. All rights reserved.</p>
            {location && <p className="text-gray-600 text-xs">Professional {industryLabel} services in {location}</p>}
          </div>
        </div>
      </footer>

      {/* ─── Sticky Mobile CTA Bar ─── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden glass-dark border-t border-white/10 px-4 py-3 safe-area-bottom">
        <div className="flex items-center gap-3">
          <a
            href={`tel:${lead.phone}`}
            onClick={onCallClick}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-white text-teal-700 py-3 rounded-xl font-bold text-sm shadow-md"
          >
            <Phone size={16} />
            Call Now
          </a>
          <button
            onClick={onCTAClick}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white py-3 rounded-xl font-bold text-sm shadow-md"
          >
            Free Quote
          </button>
        </div>
      </div>
    </div>
  )
}
