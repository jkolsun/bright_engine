import { Phone, MapPin, Star, Shield, CheckCircle, ArrowRight, Mail, Wrench, Clock, Award, Camera, Quote, Sparkles } from 'lucide-react'
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[72px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            {lead.logo && (
              <img src={lead.logo} alt={lead.companyName} className="h-8 w-8 rounded-lg object-cover" />
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
                className="hidden md:inline-flex items-center gap-2 text-sm text-gray-400 hover:text-blue-400 transition-colors font-medium"
              >
                <Phone size={15} />
                {lead.phone}
              </a>
            )}
            <button
              onClick={onCTAClick}
              className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:from-blue-600 hover:to-cyan-600 transition-all shadow-md hover:shadow-lg animate-cta-glow"
            >
              Free Quote
            </button>
          </div>
        </div>
      </nav>

      {/* ─── Hero — Centered with Giant Watermark ─── */}
      <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient}`} />
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/20 to-transparent" />

        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full pointer-events-none select-none">
          <p className="font-display text-[8rem] md:text-[12rem] lg:text-[14rem] font-black text-white/[0.03] text-center leading-none whitespace-nowrap truncate px-8">
            {lead.companyName}
          </p>
        </div>

        <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-blue-500/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-cyan-500/8 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-0 w-[300px] h-[300px] bg-indigo-500/5 rounded-full -translate-x-1/2 blur-3xl" />

        <div className="relative max-w-4xl mx-auto w-full px-4 sm:px-6 py-28 text-center">
          {hasRating && (
            <div className="inline-flex items-center gap-2.5 bg-white/10 backdrop-blur-md border border-white/10 rounded-full px-5 py-2.5 mb-8">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} size={15} className={i < Math.floor(lead.enrichedRating!) ? 'text-blue-400 fill-current' : 'text-white/20'} />
                ))}
              </div>
              <span className="text-sm font-bold text-white">{lead.enrichedRating}</span>
              {lead.enrichedReviews && (
                <span className="text-sm text-white/50">({lead.enrichedReviews} reviews)</span>
              )}
            </div>
          )}

          <h1 className="font-display text-5xl md:text-7xl lg:text-[5.5rem] font-black text-white mb-6 tracking-tight leading-[0.95]">
            {wc?.heroHeadline || lead.companyName}
          </h1>

          <p className="text-xl md:text-2xl text-white/50 mb-12 max-w-2xl mx-auto leading-relaxed">
            {wc?.heroSubheadline || config.tagline}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
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
              className="inline-flex items-center justify-center gap-2.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white px-10 py-5 rounded-xl font-bold text-lg hover:bg-white hover:text-gray-900 transition-all duration-300"
            >
              {config.ctaText}
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </section>

      {/* ─── Compact Icon Grid — Services ─── */}
      {services.length > 0 && (
        <section className="py-24 px-4 sm:px-6 bg-gray-950">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-400 rounded-full px-4 py-1.5 text-sm font-bold mb-4 border border-blue-500/20">
                <Wrench size={14} />
                Our Services
              </div>
              <h2 className="font-display text-4xl md:text-5xl font-black text-white mb-4">What We Do</h2>
              <p className="text-gray-400 max-w-xl mx-auto text-lg">
                Expert {industryLabel} services tailored to your needs.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.slice(0, 6).map((service, i) => (
                <button
                  key={i}
                  onClick={onCTAClick}
                  className="group flex items-start gap-4 bg-gray-900/40 border border-gray-800/50 rounded-xl p-5 hover:border-blue-500/40 hover:bg-gray-900/70 transition-all duration-300 text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-500/10 group-hover:shadow-blue-500/25 transition-shadow duration-300">
                    <Wrench size={18} className="text-white" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display font-bold text-base text-white mb-1 truncate">{service}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed line-clamp-2">
                      {wc?.serviceDescriptions?.[service] || `Professional ${service.toLowerCase()} with guaranteed quality.`}
                    </p>
                  </div>
                  <ArrowRight size={16} className="text-gray-700 group-hover:text-blue-400 flex-shrink-0 mt-1 transition-colors duration-300" />
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Inline Social Proof Strip ─── */}
      <section className="py-6 px-4 sm:px-6 border-y border-white/5 bg-gray-900/50">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm">
            {hasRating && (
              <span className="flex items-center gap-1.5 text-white font-semibold">
                <Star size={14} className="text-blue-400 fill-current" />
                {lead.enrichedRating} Rating
              </span>
            )}
            {hasRating && lead.enrichedReviews && (
              <span className="text-gray-600 hidden sm:inline">&#x2022;</span>
            )}
            {lead.enrichedReviews && (
              <span className="text-gray-300 font-medium">{lead.enrichedReviews}+ Reviews</span>
            )}
            <span className="text-gray-600 hidden sm:inline">&#x2022;</span>
            <span className="flex items-center gap-1.5 text-gray-300 font-medium">
              <Shield size={13} className="text-blue-400" />
              Licensed &amp; Insured
            </span>
            {location && (
              <>
                <span className="text-gray-600 hidden sm:inline">&#x2022;</span>
                <span className="flex items-center gap-1.5 text-gray-300 font-medium">
                  <MapPin size={13} className="text-blue-400" />
                  Serving {location}
                </span>
              </>
            )}
            <span className="text-gray-600 hidden sm:inline">&#x2022;</span>
            <span className="flex items-center gap-1.5 text-gray-300 font-medium">
              <Clock size={13} className="text-blue-400" />
              24/7 Available
            </span>
          </div>
        </div>
      </section>

      {/* ─── Before/After Style Gallery — Creative Offset Grid ─── */}
      {photos.length > 0 && (
        <section className="py-24 px-4 sm:px-6 bg-gray-950">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-400 rounded-full px-4 py-1.5 text-sm font-bold mb-4 border border-blue-500/20">
                <Camera size={14} />
                Our Work
              </div>
              <h2 className="font-display text-4xl md:text-5xl font-black text-white mb-4">
                See the Results
              </h2>
              <p className="text-gray-400 text-lg">Quality craftsmanship you can count on.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {photos.slice(0, 6).map((photo, i) => (
                <div
                  key={i}
                  className={`group relative bg-gray-800 rounded-xl overflow-hidden border border-gray-800/80 hover:border-blue-500/40 transition-all duration-500 hover:shadow-xl hover:shadow-blue-500/10 ${
                    i % 2 === 1 ? 'md:translate-y-6' : ''
                  }`}
                >
                  <div className="aspect-[4/3]">
                    <img
                      src={photo}
                      alt={`${lead.companyName} project ${i + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500 translate-y-2 group-hover:translate-y-0">
                    <p className="text-white text-sm font-semibold">Project {i + 1}</p>
                    <p className="text-white/60 text-xs">{lead.companyName}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── About with Pull-Quote Callout ─── */}
      <section className="py-24 px-4 sm:px-6 bg-gray-900/40">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-start">
            <div className="lg:col-span-3">
              <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-400 rounded-full px-4 py-1.5 text-sm font-bold mb-4 border border-blue-500/20">
                About Us
              </div>
              <h2 className="font-display text-4xl md:text-5xl font-black text-white mb-8">
                Built on Trust &amp; Excellence
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
                      From emergency calls to planned projects, we bring the same level of care and commitment.
                      Our crew shows up on time, works efficiently, and doesn&apos;t leave until the job is done right.
                    </>
                  )}
                </p>
                <p>
                  Fully licensed, fully insured, and fully committed to your satisfaction.
                  That&apos;s the {lead.companyName} promise.
                </p>
              </div>

              <a
                href={`tel:${lead.phone}`}
                onClick={onCallClick}
                className="inline-flex items-center gap-2.5 mt-10 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-8 py-4 rounded-xl font-bold text-lg hover:from-blue-600 hover:to-cyan-600 transition-all shadow-lg animate-cta-glow"
              >
                <Phone size={20} />
                Call Us Now
              </a>
            </div>

            <div className="lg:col-span-2 flex flex-col gap-6">
              <div className="relative bg-gray-950/80 border border-blue-500/20 rounded-2xl p-8">
                <Quote size={32} className="text-blue-500/20 mb-4" />
                <p className="text-white text-lg italic leading-relaxed mb-4">
                  &ldquo;Absolutely outstanding work. They arrived on time, were incredibly professional, and the quality exceeded our expectations. Highly recommend!&rdquo;
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} size={12} className="text-blue-400 fill-current" />
                    ))}
                  </div>
                  <span className="text-gray-500 text-sm">
                    &mdash; Satisfied Customer{location ? `, ${location}` : ''}
                  </span>
                </div>
              </div>

              <div className="bg-gray-950/80 border border-gray-800/50 rounded-2xl p-8">
                <h3 className="font-display text-lg font-bold text-white mb-5">Contact Info</h3>
                <div className="space-y-4">
                  {lead.phone && (
                    <a
                      href={`tel:${lead.phone}`}
                      onClick={onCallClick}
                      className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center flex-shrink-0">
                        <Phone size={16} className="text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Phone</p>
                        <p className="font-bold text-white text-sm">{lead.phone}</p>
                      </div>
                    </a>
                  )}
                  {lead.email && (
                    <a
                      href={`mailto:${lead.email}`}
                      className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                        <Mail size={16} className="text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Email</p>
                        <p className="font-bold text-white text-sm">{lead.email}</p>
                      </div>
                    </a>
                  )}
                  {lead.enrichedAddress && (
                    <div className="flex items-center gap-3 text-gray-300">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                        <MapPin size={16} className="text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Location</p>
                        <p className="font-bold text-white text-sm">{lead.enrichedAddress}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Mini Testimonial Cards ─── */}
      <section className="py-20 px-4 sm:px-6 bg-gray-950">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-400 rounded-full px-4 py-1.5 text-sm font-bold mb-4 border border-blue-500/20">
              <Sparkles size={14} />
              What People Say
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-black text-white">
              Trusted by Homeowners
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                quote: `${lead.companyName} was fantastic from start to finish. Professional, clean, and affordable. Will absolutely call again.`,
                name: 'Homeowner',
                loc: location || 'Local Area',
                stars: 5,
              },
              {
                quote: `Fast response and excellent work. They explained everything clearly and completed the job on time. Couldn't be happier.`,
                name: 'Property Manager',
                loc: location || 'Local Area',
                stars: 5,
              },
              {
                quote: `Great experience from the first call to project completion. Fair pricing, quality workmanship, and genuinely nice people.`,
                name: 'Repeat Customer',
                loc: location || 'Local Area',
                stars: 5,
              },
            ].map((review, i) => (
              <div
                key={i}
                className="bg-gray-900/50 border border-gray-800/50 rounded-xl p-6 hover:border-blue-500/20 transition-all duration-300"
              >
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: review.stars }, (_, j) => (
                    <Star key={j} size={14} className="text-blue-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-5 italic">
                  &ldquo;{review.quote}&rdquo;
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-[10px] font-bold">{review.name[0]}</span>
                  </div>
                  <span className="font-semibold text-gray-400">{review.name}</span>
                  <span className="text-gray-600">&mdash;</span>
                  <span>{review.loc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Why Choose Us ─── */}
      <section className="py-24 px-4 sm:px-6 bg-gray-900/40">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-400 rounded-full px-4 py-1.5 text-sm font-bold mb-4 border border-blue-500/20">
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
                icon: Clock,
                title: wc?.valueProps?.[0]?.title || 'Fast Response',
                desc: wc?.valueProps?.[0]?.description || `We understand urgency. ${lead.companyName} responds quickly and gets to work fast — because your time matters.`,
              },
              {
                icon: Shield,
                title: wc?.valueProps?.[1]?.title || 'Quality Guaranteed',
                desc: wc?.valueProps?.[1]?.description || 'Every project is backed by our satisfaction guarantee. We use premium materials and expert techniques on every job.',
              },
              {
                icon: CheckCircle,
                title: wc?.valueProps?.[2]?.title || 'Fair & Transparent',
                desc: wc?.valueProps?.[2]?.description || 'No hidden fees, no surprises. You get honest pricing upfront with a detailed estimate before any work begins.',
              },
            ].map((item, i) => (
              <div
                key={i}
                className="group bg-gray-950/80 border border-gray-800/50 rounded-2xl p-10 text-center card-lift card-lift-dark hover:border-blue-500/20 transition-all duration-300"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/15 group-hover:shadow-blue-500/30 transition-shadow">
                  <item.icon size={28} className="text-white" />
                </div>
                <h3 className="font-display text-xl font-bold text-white mb-4">{item.title}</h3>
                <p className="text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Inline Final CTA — Contained Card with Gradient Border ─── */}
      <section className="py-24 px-4 sm:px-6 bg-gray-950">
        <div className="max-w-3xl mx-auto">
          <div className="relative rounded-2xl p-[1px] bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500">
            <div className="bg-gray-950 rounded-2xl p-10 md:p-14 text-center">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[150px] bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

              <h2 className="font-display text-3xl md:text-5xl font-black text-white mb-5 relative">
                {wc?.closingHeadline || 'Ready to Get Started?'}
              </h2>
              <p className="text-lg text-gray-400 mb-10 max-w-lg mx-auto leading-relaxed relative">
                {wc?.closingBody || (
                  <>Don&apos;t wait — contact {lead.companyName} today for a free, no-obligation estimate.</>
                )}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center relative">
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
                  className="inline-flex items-center justify-center gap-2.5 bg-white/10 border border-white/20 text-white px-10 py-5 rounded-xl font-bold text-lg hover:bg-white hover:text-gray-900 transition-all duration-300"
                >
                  {config.ctaText}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Floating Phone Button (Bottom-Right, Mobile + Desktop) ─── */}
      {lead.phone && (
        <a
          href={`tel:${lead.phone}`}
          onClick={onCallClick}
          className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-110 transition-all duration-300 animate-cta-glow"
          aria-label="Call Now"
        >
          <Phone size={24} className="text-white" />
        </a>
      )}

      {/* ─── Footer ─── */}
      <footer className="bg-black py-16 px-4 sm:px-6">
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
            </div>
            <div>
              <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Services</h4>
              <ul className="space-y-3 text-sm text-gray-500">
                {services.slice(0, 5).map((s, i) => (
                  <li key={i} className="flex items-center gap-2 hover:text-white transition-colors">
                    <CheckCircle size={12} className="text-blue-500 flex-shrink-0" />
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
                    <Phone size={14} className="text-blue-500" /> {lead.phone}
                  </a>
                )}
                {lead.email && (
                  <a href={`mailto:${lead.email}`} className="flex items-center gap-2.5 hover:text-white transition-colors">
                    <Mail size={14} className="text-blue-500" /> {lead.email}
                  </a>
                )}
                {lead.enrichedAddress && (
                  <p className="flex items-center gap-2.5">
                    <MapPin size={14} className="text-blue-500" /> {lead.enrichedAddress}
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
