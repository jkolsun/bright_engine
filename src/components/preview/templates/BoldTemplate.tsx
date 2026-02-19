import { Phone, MapPin, Star, Shield, Zap, CheckCircle, ArrowRight, Mail, Flame, Wrench, ThumbsUp, Clock, Award, Camera } from 'lucide-react'
import type { TemplateProps } from '../config/template-types'
import DisclaimerBanner from '../shared/DisclaimerBanner'

export default function BoldTemplate({ lead, config, onCTAClick, onCallClick, websiteCopy }: TemplateProps) {
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[72px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            {lead.logo && (
              <img src={lead.logo} alt={lead.companyName} className="h-8 w-8 rounded-lg object-cover ring-2 ring-orange-500/20" />
            )}
            <span className="font-display text-xl font-black text-white tracking-tight uppercase">
              {lead.companyName}
            </span>
          </div>
          <div className="flex items-center gap-4">
            {lead.phone && (
              <a
                href={`tel:${lead.phone}`}
                onClick={onCallClick}
                className="hidden md:inline-flex items-center gap-2 text-sm text-gray-400 hover:text-orange-400 transition-colors font-medium"
              >
                <Phone size={15} />
                {lead.phone}
              </a>
            )}
            <button
              onClick={onCTAClick}
              className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:from-orange-600 hover:to-red-600 transition-all shadow-md hover:shadow-lg animate-cta-glow-orange"
            >
              Free Quote
            </button>
          </div>
        </div>
      </nav>

      {/* ─── Hero — Full-Bleed Dramatic ─── */}
      <section className="relative min-h-[80vh] flex items-center overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient}`} />
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/20 to-transparent" />
        <div className="absolute inset-0 bg-mesh-dark" />

        <div className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-orange-500/10 rounded-full translate-x-1/3 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-red-600/8 rounded-full translate-y-1/2 blur-3xl" />

        <div className="relative max-w-7xl mx-auto w-full px-4 sm:px-6 py-28">
          {hasRating && (
            <div className="inline-flex items-center gap-2.5 bg-white/10 backdrop-blur-md border border-white/10 rounded-full px-5 py-2.5 mb-8">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} size={15} className={i < Math.floor(lead.enrichedRating!) ? 'text-amber-400 fill-current' : 'text-white/20'} />
                ))}
              </div>
              <span className="text-sm font-bold text-white">{lead.enrichedRating}-Star Rated</span>
              {lead.enrichedReviews && (
                <span className="text-sm text-white/50">• {lead.enrichedReviews}+ reviews</span>
              )}
            </div>
          )}

          <h1 className="font-display text-5xl md:text-7xl lg:text-[6.5rem] font-black text-white mb-6 tracking-tight leading-[0.95] max-w-4xl">
            {wc?.heroHeadline || lead.companyName}
          </h1>

          <p className="text-xl md:text-2xl text-white/60 mb-4 max-w-2xl leading-relaxed">
            {wc?.heroSubheadline || config.tagline}
          </p>

          {location && (
            <p className="text-base text-white/40 mb-12 flex items-center gap-2">
              <MapPin size={16} className="text-orange-400" />
              Proudly serving {location} and the surrounding area
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href={`tel:${lead.phone}`}
              onClick={onCallClick}
              className="inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white px-10 py-5 rounded-xl font-black text-lg hover:from-orange-600 hover:to-red-600 transition-all shadow-2xl animate-cta-glow-orange"
            >
              <Phone size={22} />
              Call Now — Free Estimate
            </a>
            <button
              onClick={onCTAClick}
              className="inline-flex items-center justify-center gap-2.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white px-10 py-5 rounded-xl font-bold text-lg hover:bg-white hover:text-gray-900 transition-all duration-300"
            >
              {config.ctaText}
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </section>

      {/* ─── Overlapping Stats Counter ─── */}
      <section className="relative z-10 px-4 sm:px-6 -mt-16">
        <div className="max-w-5xl mx-auto">
          <div className="glass-dark border border-white/10 rounded-2xl p-8 md:p-10 shadow-2xl shadow-black/40">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {hasRating && (
                <div className="group">
                  <p className="font-display text-4xl md:text-5xl font-black text-gradient-fire mb-1">
                    {lead.enrichedRating}
                  </p>
                  <div className="flex justify-center mb-2 gap-0.5">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} size={13} className={i < Math.floor(lead.enrichedRating!) ? 'text-orange-400 fill-current' : 'text-gray-700'} />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 uppercase tracking-[0.2em] font-semibold">Star Rating</p>
                </div>
              )}
              {lead.enrichedReviews && (
                <div>
                  <p className="font-display text-4xl md:text-5xl font-black text-gradient-fire mb-1">
                    {lead.enrichedReviews}+
                  </p>
                  <div className="h-[13px] mb-2" />
                  <p className="text-xs text-gray-500 uppercase tracking-[0.2em] font-semibold">Happy Customers</p>
                </div>
              )}
              <div>
                <p className="font-display text-4xl md:text-5xl font-black text-white mb-1">100%</p>
                <div className="flex justify-center mb-2">
                  <Shield size={13} className="text-orange-400" />
                </div>
                <p className="text-xs text-gray-500 uppercase tracking-[0.2em] font-semibold">Licensed & Insured</p>
              </div>
              <div>
                <p className="font-display text-4xl md:text-5xl font-black text-white mb-1">24/7</p>
                <div className="flex justify-center mb-2">
                  <Clock size={13} className="text-orange-400" />
                </div>
                <p className="text-xs text-gray-500 uppercase tracking-[0.2em] font-semibold">Available</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Services — Large Numbered Cards ─── */}
      {services.length > 0 && (
        <section className="py-24 px-4 sm:px-6 bg-gray-950">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-orange-500/10 text-orange-400 rounded-full px-4 py-1.5 text-sm font-bold mb-4 border border-orange-500/20">
                <Wrench size={14} />
                Our Expertise
              </div>
              <h2 className="font-display text-4xl md:text-5xl font-black text-white mb-4">What We Do</h2>
              <p className="text-gray-400 max-w-xl mx-auto text-lg">
                Expert {industryLabel} services — done right, on time, every time.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {services.slice(0, 6).map((service, i) => (
                <div
                  key={i}
                  className="group relative bg-gray-900/60 border border-gray-800/50 rounded-2xl p-8 pt-10 card-lift card-lift-dark hover:border-orange-500/30 overflow-hidden transition-all duration-300"
                >
                  <span className="absolute top-4 right-6 font-display text-7xl font-black text-white/[0.03] group-hover:text-orange-500/10 transition-colors duration-500 select-none leading-none">
                    {String(i + 1).padStart(2, '0')}
                  </span>

                  <div className="relative">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mb-5 shadow-lg shadow-orange-500/10 group-hover:shadow-orange-500/25 transition-shadow duration-300">
                      <Wrench size={22} className="text-white" />
                    </div>
                    <h3 className="font-display font-bold text-xl text-white mb-3">{service}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed mb-4">
                      {wc?.serviceDescriptions?.[service] || `Professional ${service.toLowerCase()} with guaranteed quality and competitive pricing.`}
                    </p>
                    <button
                      onClick={onCTAClick}
                      className="flex items-center gap-1.5 text-orange-400 text-sm font-bold opacity-0 group-hover:opacity-100 transition-all duration-300 hover:gap-3"
                    >
                      Get a quote <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Urgency Strip ─── */}
      <section className="relative py-12 px-4 sm:px-6 bg-gradient-to-r from-orange-500 via-red-500 to-orange-500 overflow-hidden">
        <div className="absolute inset-0 bg-noise opacity-10" />
        <div className="relative max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 animate-bounce-gentle">
              <Zap size={30} className="text-white" />
            </div>
            <div>
              <p className="text-2xl font-display font-black text-white">Need Help Fast?</p>
              <p className="text-white/80 text-lg">
                Same-day response — call us anytime for fast, reliable service.
              </p>
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

      {/* ─── Why Choose Us ─── */}
      <section className="py-24 px-4 sm:px-6 bg-gray-900/40">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-orange-500/10 text-orange-400 rounded-full px-4 py-1.5 text-sm font-bold mb-4 border border-orange-500/20">
              <Award size={14} />
              The Difference
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-black text-white mb-4">
              Why Choose {lead.companyName}?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Flame,
                title: wc?.valueProps?.[0]?.title || 'Fast Response',
                desc: wc?.valueProps?.[0]?.description || `We understand urgency. ${lead.companyName} responds the same day and gets to work fast — because your time matters.`,
              },
              {
                icon: Shield,
                title: wc?.valueProps?.[1]?.title || 'Quality Guaranteed',
                desc: wc?.valueProps?.[1]?.description || 'Every project is backed by our satisfaction guarantee. We use premium materials and expert techniques on every job.',
              },
              {
                icon: ThumbsUp,
                title: wc?.valueProps?.[2]?.title || 'Fair & Transparent',
                desc: wc?.valueProps?.[2]?.description || 'No hidden fees, no surprises. You get honest pricing upfront with a detailed estimate before any work begins.',
              },
            ].map((item, i) => (
              <div
                key={i}
                className="bg-gray-950/80 border border-gray-800/50 rounded-2xl p-10 text-center card-lift card-lift-dark hover:border-orange-500/20 transition-all duration-300"
              >
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-orange-500/15">
                  <item.icon size={32} className="text-white" />
                </div>
                <h3 className="font-display text-xl font-bold text-white mb-4">{item.title}</h3>
                <p className="text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── About with Contact Card ─── */}
      <section className="py-24 px-4 sm:px-6 bg-gray-950">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-14 items-start">
          <div>
            <div className="inline-flex items-center gap-2 bg-orange-500/10 text-orange-400 rounded-full px-4 py-1.5 text-sm font-bold mb-4 border border-orange-500/20">
              About Us
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-black text-white mb-8">
              Built on Hard Work &amp; Results
            </h2>
            <div className="space-y-5 text-gray-400 leading-relaxed text-lg">
              <p>
                {wc?.aboutParagraph1 || (
                  <>
                    {lead.companyName} isn&apos;t just another {industryLabel} company.
                    {location
                      ? ` We're a team of dedicated professionals based in ${location} who take pride in every single job.`
                      : ` We're a team of dedicated professionals who take pride in every single job.`}
                  </>
                )}
              </p>
              <p>
                {wc?.aboutParagraph2 || (
                  <>
                    From emergency calls to planned projects, we bring the same level of intensity and commitment.
                    Our crew shows up on time, works efficiently, and doesn&apos;t leave until the job is done right.
                  </>
                )}
              </p>
              <p>
                Fully licensed, fully insured, and fully committed to your satisfaction.
                That&apos;s the {lead.companyName} promise.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mt-10">
              <a
                href={`tel:${lead.phone}`}
                onClick={onCallClick}
                className="inline-flex items-center gap-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white px-8 py-4 rounded-xl font-bold text-lg hover:from-orange-600 hover:to-red-600 transition-all shadow-lg animate-cta-glow-orange"
              >
                <Phone size={20} />
                Call Us Now
              </a>
              <button
                onClick={onCTAClick}
                className="inline-flex items-center gap-2.5 border border-orange-500/30 text-orange-400 px-8 py-4 rounded-xl font-bold text-lg hover:bg-orange-500/10 transition-all"
              >
                {config.ctaText}
              </button>
            </div>
          </div>

          <div className="bg-gray-900/60 border border-gray-800/50 rounded-2xl p-10">
            <h3 className="font-display text-2xl font-bold text-white mb-2">Ready to Get Started?</h3>
            <p className="text-gray-500 mb-8">Reach out today for a free, no-obligation estimate.</p>
            <div className="space-y-5">
              {lead.phone && (
                <a
                  href={`tel:${lead.phone}`}
                  onClick={onCallClick}
                  className="flex items-center gap-4 text-gray-300 hover:text-white transition-colors p-3 rounded-xl hover:bg-white/5"
                >
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-orange-500/10">
                    <Phone size={22} className="text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-[0.15em] font-semibold">Phone</p>
                    <p className="font-bold text-lg text-white">{lead.phone}</p>
                  </div>
                </a>
              )}
              {lead.email && (
                <a
                  href={`mailto:${lead.email}`}
                  className="flex items-center gap-4 text-gray-300 hover:text-white transition-colors p-3 rounded-xl hover:bg-white/5"
                >
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-red-500/10">
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
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/10">
                    <MapPin size={22} className="text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-[0.15em] font-semibold">Location</p>
                    <p className="font-bold text-white">{lead.enrichedAddress}</p>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={onCTAClick}
              className="w-full mt-8 bg-gradient-to-r from-orange-500 to-red-500 text-white py-4 rounded-xl font-bold text-lg hover:from-orange-600 hover:to-red-600 transition-all shadow-lg"
            >
              Get Your Free Estimate
            </button>
            <p className="text-center text-xs text-gray-600 mt-3">No obligation • Same-day response • Satisfaction guaranteed</p>
          </div>
        </div>
      </section>

      {/* ─── Photo Gallery ─── */}
      {photos.length > 0 && (
        <section className="py-24 px-4 sm:px-6 bg-gray-900/40">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-orange-500/10 text-orange-400 rounded-full px-4 py-1.5 text-sm font-bold mb-4 border border-orange-500/20">
                <Camera size={14} />
                Our Work
              </div>
              <h2 className="font-display text-4xl md:text-5xl font-black text-white mb-4">
                Results Speak Louder
              </h2>
              <p className="text-gray-400 text-lg">
                See what {lead.companyName} can do for you.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {photos.slice(0, 8).map((photo, i) => (
                <div
                  key={i}
                  className="group aspect-square bg-gray-800 rounded-xl overflow-hidden border-2 border-gray-800 hover:border-orange-500/50 transition-all duration-500 hover:shadow-xl hover:shadow-orange-500/10"
                >
                  <img
                    src={photo}
                    alt={`${lead.companyName} project ${i + 1}`}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Testimonial ─── */}
      <section className="py-20 px-4 sm:px-6 bg-gray-950">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-orange-500/10 text-orange-400 rounded-full px-4 py-1.5 text-sm font-bold mb-8 border border-orange-500/20">
            <Award size={14} />
            Customer Review
          </div>
          <div className="flex justify-center mb-6 gap-1">
            {Array.from({ length: 5 }, (_, i) => (
              <Star key={i} size={28} className="text-amber-400 fill-current" />
            ))}
          </div>
          <p className="text-xl md:text-2xl text-gray-300 leading-relaxed italic font-light mb-8">
            &ldquo;{lead.companyName} absolutely crushed it. They were fast, professional, and the
            quality of work was top-notch. Fair pricing too. Already recommended them to everyone
            I know. These guys are the real deal!&rdquo;
          </p>
          <div className="w-12 h-0.5 bg-orange-500 mx-auto mb-4 rounded-full" />
          <p className="text-gray-500 font-semibold">Satisfied Customer</p>
          {location && <p className="text-gray-600 text-sm mt-1">{lead.city}, {lead.state}</p>}
        </div>
      </section>

      {/* ─── Final CTA Section ─── */}
      <section className="relative py-28 px-4 sm:px-6 overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient}`} />
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-0 bg-mesh-dark" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500/10 rounded-full translate-x-1/3 -translate-y-1/3 blur-3xl" />

        <div className="relative max-w-4xl mx-auto text-center">
          <h2 className="font-display text-4xl md:text-6xl font-black text-white mb-6">
            {wc?.closingHeadline || 'Ready to Get Started?'}
          </h2>
          <p className="text-xl text-white/60 mb-12 max-w-xl mx-auto leading-relaxed">
            {wc?.closingBody || (
              <>Don&apos;t wait — contact {lead.companyName} today for a free, no-obligation estimate.</>
            )}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={`tel:${lead.phone}`}
              onClick={onCallClick}
              className="inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white px-10 py-5 rounded-xl font-black text-lg hover:from-orange-600 hover:to-red-600 transition-all shadow-2xl animate-cta-glow-orange"
            >
              <Phone size={22} />
              {lead.phone || 'Call Now'}
            </a>
            <button
              onClick={onCTAClick}
              className="inline-flex items-center justify-center gap-2.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white px-10 py-5 rounded-xl font-bold text-lg hover:bg-white hover:text-gray-900 transition-all duration-300"
            >
              {config.ctaText}
            </button>
          </div>
        </div>
      </section>

      {/* ─── Sticky Bottom CTA Bar (Mobile) ─── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden glass-dark border-t border-white/10 px-4 py-3 safe-area-bottom">
        <div className="flex items-center gap-3">
          {lead.phone && (
            <a
              href={`tel:${lead.phone}`}
              onClick={onCallClick}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 text-white py-3.5 rounded-xl font-bold text-base animate-cta-glow-orange"
            >
              <Phone size={18} />
              Call Now
            </a>
          )}
          <button
            onClick={onCTAClick}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-white/10 border border-white/20 text-white py-3.5 rounded-xl font-bold text-base"
          >
            Free Quote
          </button>
        </div>
      </div>

      {/* ─── Footer ─── */}
      <footer className="bg-black py-16 px-4 sm:px-6 pb-28 md:pb-16">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
            <div>
              <h3 className="font-display text-white font-black text-xl uppercase tracking-wider mb-4">
                {lead.companyName}
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Professional {industryLabel} services{location ? ` serving ${location}` : ''}.
                Licensed, insured, and committed to delivering results.
              </p>
              {hasRating && (
                <div className="flex items-center gap-2 mt-4">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} size={12} className={i < Math.floor(lead.enrichedRating!) ? 'text-amber-400 fill-current' : 'text-gray-700'} />
                    ))}
                  </div>
                  <span className="text-gray-500 text-sm">{lead.enrichedRating} rating</span>
                </div>
              )}
            </div>
            <div>
              <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Services</h4>
              <ul className="space-y-3 text-sm text-gray-500">
                {services.slice(0, 5).map((s, i) => (
                  <li key={i} className="flex items-center gap-2 hover:text-white transition-colors">
                    <CheckCircle size={12} className="text-orange-500 flex-shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Contact</h4>
              <div className="space-y-3 text-sm text-gray-500">
                {lead.phone && (
                  <a href={`tel:${lead.phone}`} onClick={onCallClick} className="flex items-center gap-2.5 hover:text-white transition-colors">
                    <Phone size={14} className="text-orange-500" /> {lead.phone}
                  </a>
                )}
                {lead.email && (
                  <a href={`mailto:${lead.email}`} className="flex items-center gap-2.5 hover:text-white transition-colors">
                    <Mail size={14} className="text-orange-500" /> {lead.email}
                  </a>
                )}
                {lead.enrichedAddress && (
                  <p className="flex items-center gap-2.5">
                    <MapPin size={14} className="text-orange-500" /> {lead.enrichedAddress}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="border-t border-gray-900 pt-10 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-600 text-sm">
              &copy; {new Date().getFullYear()} {lead.companyName}. All rights reserved.
            </p>
            {location && (
              <p className="text-gray-700 text-xs">
                Professional {industryLabel} services in {location}
              </p>
            )}
          </div>
        </div>
      </footer>
    </div>
  )
}
