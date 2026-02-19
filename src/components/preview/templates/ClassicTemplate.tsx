import { Phone, MapPin, Star, Shield, Clock, Check, Award, Mail, Users, Heart, CheckCircle, ChevronRight, Quote, Camera, ArrowRight } from 'lucide-react'
import type { TemplateProps } from '../config/template-types'
import DisclaimerBanner from '../shared/DisclaimerBanner'

export default function ClassicTemplate({ lead, config, onCTAClick, onCallClick, websiteCopy }: TemplateProps) {
  const services = lead.enrichedServices || []
  const photos = lead.enrichedPhotos || []
  const industryLabel = lead.industry.toLowerCase().replace(/_/g, ' ')
  const location = [lead.city, lead.state].filter(Boolean).join(', ')
  const hasRating = lead.enrichedRating && lead.enrichedRating > 0
  const wc = websiteCopy

  return (
    <div className="preview-template min-h-screen bg-stone-50">
      <DisclaimerBanner variant="classic" companyName={lead.companyName} />

      {/* ─── Sticky Nav ─── */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200/60 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 md:h-[72px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            {lead.logo && (
              <img src={lead.logo} alt={lead.companyName} className="w-8 h-8 rounded-lg object-cover" />
            )}
            <span className="font-display text-lg md:text-xl font-bold text-stone-800 truncate max-w-[200px] md:max-w-none">{lead.companyName}</span>
          </div>
          <div className="flex items-center gap-3 md:gap-4">
            {lead.phone && (
              <a
                href={`tel:${lead.phone}`}
                onClick={onCallClick}
                className="hidden md:inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-900 transition-colors duration-200 font-medium"
              >
                <Phone size={15} />
                {lead.phone}
              </a>
            )}
            {lead.phone && (
              <a
                href={`tel:${lead.phone}`}
                onClick={onCallClick}
                className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors duration-200"
              >
                <Phone size={18} />
              </a>
            )}
            <button
              onClick={onCTAClick}
              className={`bg-gradient-to-r ${config.gradient} text-white px-5 md:px-6 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-all duration-200 shadow-md hover:shadow-lg`}
            >
              Free Estimate
            </button>
          </div>
        </div>
      </nav>

      {/* ─── Sticky Mobile CTA Bar ─── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/95 backdrop-blur-md border-t border-stone-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex items-center gap-3 px-4 py-3">
          <a
            href={`tel:${lead.phone}`}
            onClick={onCallClick}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-stone-100 text-stone-900 py-3 rounded-xl font-semibold text-sm border border-stone-200"
          >
            <Phone size={16} />
            Call Now
          </a>
          <button
            onClick={onCTAClick}
            className={`flex-1 inline-flex items-center justify-center gap-2 bg-gradient-to-r ${config.gradient} text-white py-3 rounded-xl font-semibold text-sm shadow-md`}
          >
            Free Quote
          </button>
        </div>
      </div>

      {/* ─── Full-Width Gradient Hero ─── */}
      <section className={`relative bg-gradient-to-br ${config.gradient} text-white py-24 md:py-36 lg:py-44 px-4 sm:px-6 overflow-hidden`}>
        <div className="absolute inset-0 bg-black/10" />
        <div className="absolute inset-0 bg-noise opacity-5" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full -translate-y-1/3 translate-x-1/3 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[350px] h-[350px] bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4 blur-3xl" />

        <div className="relative max-w-4xl mx-auto text-center animate-fade-in-up">
          <p className="text-white/60 text-sm md:text-base uppercase tracking-widest font-semibold mb-6">
            {location ? `Trusted ${industryLabel} in ${location}` : `Professional ${industryLabel} Services`}
          </p>

          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 tracking-tight leading-[1.05]">
            {lead.companyName}
          </h1>

          <div className="w-20 h-1 bg-white/30 mx-auto mb-6 rounded-full" />

          <p className="text-lg md:text-2xl text-white/85 mb-4 max-w-2xl mx-auto leading-relaxed">
            {wc?.heroHeadline || config.tagline}
          </p>
          {wc?.heroSubheadline && (
            <p className="text-base md:text-lg text-white/60 mb-4 max-w-2xl mx-auto leading-relaxed">{wc.heroSubheadline}</p>
          )}

          {hasRating && (
            <div className="inline-flex items-center gap-2.5 bg-white/15 backdrop-blur-sm rounded-full px-5 py-2.5 mb-10 border border-white/10">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} size={16} className={i < Math.floor(lead.enrichedRating!) ? 'text-yellow-300 fill-current' : 'text-white/20'} />
                ))}
              </div>
              <span className="text-sm font-semibold">{lead.enrichedRating}-Star Rated</span>
              {lead.enrichedReviews && <span className="text-sm text-white/60">({lead.enrichedReviews} reviews)</span>}
            </div>
          )}

          {!hasRating && <div className="mb-10" />}

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={`tel:${lead.phone}`}
              onClick={onCallClick}
              className="inline-flex items-center justify-center gap-2.5 bg-white text-stone-900 px-8 md:px-10 py-4 rounded-xl font-bold text-base md:text-lg hover:bg-stone-50 transition-all duration-200 shadow-xl hover:shadow-2xl hover:-translate-y-0.5"
            >
              <Phone size={20} />
              Call Now — Free Estimate
            </a>
            <button
              onClick={onCTAClick}
              className="inline-flex items-center justify-center gap-2.5 bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white px-8 md:px-10 py-4 rounded-xl font-semibold text-base md:text-lg hover:bg-white hover:text-stone-900 transition-all duration-300"
            >
              {config.ctaText}
              <ChevronRight size={18} />
            </button>
          </div>
          <p className="mt-4 text-sm text-white/50">No obligation &bull; Free estimate &bull; Fast response</p>
        </div>
      </section>

      {/* ─── Social Proof Banner ─── */}
      <section className="py-4 px-4 sm:px-6 bg-white border-b border-stone-200/60">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-6 md:gap-0">
          {hasRating && (
            <>
              <div className="flex items-center gap-2 px-6">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} size={13} className={i < Math.floor(lead.enrichedRating!) ? 'text-amber-400 fill-current' : 'text-stone-200'} />
                  ))}
                </div>
                <span className="text-stone-700 font-semibold text-sm">{lead.enrichedRating}-Star Rated</span>
              </div>
              <div className="hidden md:block w-px h-6 bg-stone-200" />
            </>
          )}
          {lead.enrichedReviews && (
            <>
              <div className="flex items-center gap-1.5 px-6">
                <span className="text-stone-800 font-semibold text-sm">{lead.enrichedReviews}+</span>
                <span className="text-stone-500 text-sm">Reviews</span>
              </div>
              <div className="hidden md:block w-px h-6 bg-stone-200" />
            </>
          )}
          <div className="flex items-center gap-1.5 px-6">
            <Shield size={14} className="text-stone-500" />
            <span className="text-stone-500 text-sm">Licensed &amp; Insured</span>
          </div>
          <div className="hidden md:block w-px h-6 bg-stone-200" />
          <div className="flex items-center gap-1.5 px-6">
            <Clock size={14} className="text-stone-500" />
            <span className="text-stone-500 text-sm">Same-Day Response</span>
          </div>
          {lead.phone && (
            <>
              <div className="hidden md:block w-px h-6 bg-stone-200" />
              <a href={`tel:${lead.phone}`} onClick={onCallClick} className="flex items-center gap-1.5 px-6 text-stone-600 hover:text-stone-900 transition-colors">
                <Phone size={13} />
                <span className="text-sm font-semibold">{lead.phone}</span>
              </a>
            </>
          )}
        </div>
      </section>

      {/* ─── Three-Column Why Choose Us ─── */}
      <section className="py-20 md:py-28 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14 md:mb-18">
            <p className="text-sm uppercase tracking-widest text-stone-400 font-semibold mb-3">Why Choose Us</p>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-stone-900 mb-4">
              Why Choose {lead.companyName}?
            </h2>
            <p className="text-stone-500 max-w-xl mx-auto text-base md:text-lg">
              We&apos;ve built our reputation on core values that guide every project we take on.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-10">
            {[
              {
                icon: Shield,
                title: wc?.valueProps?.[0]?.title || 'Licensed & Insured',
                desc: wc?.valueProps?.[0]?.description || `Every member of our team is fully licensed and insured. You can trust ${lead.companyName} to protect your property and deliver professional results.`,
              },
              {
                icon: Award,
                title: wc?.valueProps?.[1]?.title || 'Proven Track Record',
                desc: wc?.valueProps?.[1]?.description || `${hasRating ? `With a ${lead.enrichedRating}-star rating${lead.enrichedReviews ? ` across ${lead.enrichedReviews} reviews` : ''}, our` : 'Our'} customers consistently rate us among the top ${industryLabel} providers in the area.`,
              },
              {
                icon: Heart,
                title: wc?.valueProps?.[2]?.title || 'Customer First',
                desc: wc?.valueProps?.[2]?.description || 'We treat your home like our own. From the first call to the final walkthrough, your satisfaction is our top priority — guaranteed.',
              },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-2xl border border-stone-200/60 p-8 md:p-10 text-center card-lift hover:border-stone-300/60 transition-all duration-300">
                <div className={`w-18 h-18 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br ${config.gradient} flex items-center justify-center mx-auto mb-6 shadow-lg`}>
                  <item.icon size={30} className="text-white" />
                </div>
                <h3 className="font-display text-lg md:text-xl font-bold text-stone-900 mb-3">{item.title}</h3>
                <p className="text-stone-500 leading-relaxed text-sm md:text-base">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Services — Two-Column Row List ─── */}
      {services.length > 0 && (
        <section className="py-20 md:py-28 px-4 sm:px-6 bg-stone-50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14 md:mb-18">
              <p className="text-sm uppercase tracking-widest text-stone-400 font-semibold mb-3">What We Do</p>
              <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-stone-900 mb-4">Our Services</h2>
              <p className="text-stone-500 max-w-xl mx-auto text-base md:text-lg">
                Comprehensive {industryLabel} solutions for residential and commercial properties.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {services.slice(0, 8).map((service, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-stone-200/60 px-6 py-5 flex items-start gap-4 hover:shadow-md hover:border-stone-300/60 transition-all duration-300 group"
                >
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${config.gradient} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                    <Check size={18} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-bold text-stone-900 text-base md:text-lg mb-1 group-hover:text-stone-800 transition-colors duration-200">
                      {service}
                    </h3>
                    <p className="text-stone-500 text-sm leading-relaxed">
                      {wc?.serviceDescriptions?.[service] || `Professional ${service.toLowerCase()} services with quality materials and expert craftsmanship.`}
                    </p>
                  </div>
                  <ArrowRight size={16} className="text-stone-300 group-hover:text-stone-500 flex-shrink-0 mt-1 transition-colors duration-200" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── How We Work — Numbered Steps ─── */}
      <section className="py-20 md:py-28 px-4 sm:px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14 md:mb-18">
            <p className="text-sm uppercase tracking-widest text-stone-400 font-semibold mb-3">Our Process</p>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-stone-900 mb-4">How We Work</h2>
            <p className="text-stone-500 text-base md:text-lg">A straightforward process designed around your convenience.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-14">
            {[
              {
                step: '01',
                title: 'Schedule a Visit',
                desc: `Give us a call or fill out a quick form. We'll set up a convenient time to visit your property and discuss your ${industryLabel} needs.`,
              },
              {
                step: '02',
                title: 'Get Your Free Estimate',
                desc: 'We provide a detailed, written estimate with no hidden fees. You\'ll know exactly what to expect before any work begins.',
              },
              {
                step: '03',
                title: 'Enjoy the Results',
                desc: `Our experienced crew handles your project from start to finish. We clean up after ourselves and make sure you're 100% satisfied.`,
              },
            ].map((item) => (
              <div key={item.step} className="relative text-center md:text-left">
                <div className={`font-display text-7xl md:text-8xl font-black bg-gradient-to-b ${config.gradient} bg-clip-text text-transparent mb-4 leading-none`}>
                  {item.step}
                </div>
                <h3 className="font-display text-xl font-bold text-stone-900 mb-3">{item.title}</h3>
                <p className="text-stone-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── About with Sticky Contact Sidebar (3/5 + 2/5) ─── */}
      <section className="py-20 md:py-28 px-4 sm:px-6 bg-stone-50">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-14">
            <div className="lg:col-span-3">
              <p className="text-sm uppercase tracking-widest text-stone-400 font-semibold mb-3">About Us</p>
              <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-stone-900 mb-8">
                A Name You Can Trust
              </h2>
              <div className="space-y-6 text-stone-600 leading-relaxed text-base md:text-lg">
                <p>
                  {wc?.aboutParagraph1 || `${lead.companyName} has been providing reliable ${industryLabel} services${location ? ` to homeowners and businesses throughout ${location}` : ' to homeowners and businesses in the local area'}. We built this company on old-fashioned values: show up on time, do honest work, and stand behind every job.`}
                </p>
                <p>
                  {wc?.aboutParagraph2 || `Our team brings years of hands-on experience to every project. Whether it\u2019s a small repair or a complete overhaul, we approach every job with the same level of care and professionalism.`}
                </p>
                <p>
                  As a locally owned and operated business, we understand the needs of our community. We&apos;re not a faceless corporation — we&apos;re
                  your neighbors, and we treat every customer like family.
                </p>
              </div>
              {hasRating && (
                <div className="mt-8 flex items-center gap-4 bg-white rounded-xl border border-stone-200/60 p-5">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} size={20} className={i < Math.floor(lead.enrichedRating!) ? 'text-amber-400 fill-current' : 'text-stone-200'} />
                    ))}
                  </div>
                  <div>
                    <p className="font-bold text-stone-900">{lead.enrichedRating} out of 5</p>
                    {lead.enrichedReviews && <p className="text-sm text-stone-500">Based on {lead.enrichedReviews} customer reviews</p>}
                  </div>
                </div>
              )}
            </div>
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl border border-stone-200/60 p-7 md:p-9 shadow-sm sticky top-24">
                <h3 className="font-display text-xl md:text-2xl font-bold text-stone-900 mb-2">Ready to Get Started?</h3>
                <p className="text-stone-500 text-sm mb-6">Free estimate &bull; Same-day response</p>
                <div className="space-y-3">
                  {lead.phone && (
                    <a
                      href={`tel:${lead.phone}`}
                      onClick={onCallClick}
                      className="flex items-center gap-4 text-stone-600 hover:text-stone-900 transition-colors duration-200 p-3 rounded-xl hover:bg-stone-50"
                    >
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                        <Phone size={18} className="text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-stone-400 uppercase tracking-wider font-medium">Phone</p>
                        <p className="font-semibold text-stone-900">{lead.phone}</p>
                      </div>
                    </a>
                  )}
                  {lead.email && (
                    <a
                      href={`mailto:${lead.email}`}
                      className="flex items-center gap-4 text-stone-600 hover:text-stone-900 transition-colors duration-200 p-3 rounded-xl hover:bg-stone-50"
                    >
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                        <Mail size={18} className="text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-stone-400 uppercase tracking-wider font-medium">Email</p>
                        <p className="font-semibold text-stone-900">{lead.email}</p>
                      </div>
                    </a>
                  )}
                  {lead.enrichedAddress && (
                    <div className="flex items-start gap-4 text-stone-600 p-3 rounded-xl">
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                        <MapPin size={18} className="text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-stone-400 uppercase tracking-wider font-medium">Address</p>
                        <p className="font-semibold text-stone-900">{lead.enrichedAddress}</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-7 pt-6 border-t border-stone-100">
                  <button
                    onClick={onCTAClick}
                    className={`w-full bg-gradient-to-r ${config.gradient} text-white py-3.5 rounded-xl font-semibold text-base hover:opacity-90 transition-all duration-200 shadow-md hover:shadow-lg`}
                  >
                    Get Your Free Estimate
                  </button>
                  <p className="text-center text-xs text-stone-400 mt-2">No obligation &bull; Same-day response</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Single Testimonial Blockquote ─── */}
      <section className="py-20 md:py-28 px-4 sm:px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm uppercase tracking-widest text-stone-400 font-semibold mb-3">Testimonials</p>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-stone-900 mb-12">
            Trusted by the Community
          </h2>
          <div className="bg-white rounded-3xl border-2 border-stone-200/60 p-10 md:p-14 lg:p-16 shadow-sm relative">
            <div className="absolute top-6 left-8 md:top-8 md:left-10">
              <Quote size={40} className="text-stone-200" />
            </div>
            <div className="flex justify-center mb-6 gap-1">
              {Array.from({ length: 5 }, (_, i) => (
                <Star key={i} size={26} className="text-amber-400 fill-current" />
              ))}
            </div>
            <p className="text-lg md:text-xl lg:text-2xl text-stone-700 leading-relaxed italic mb-8 font-light max-w-3xl mx-auto">
              &ldquo;{lead.companyName} did an outstanding job. They were professional from start to finish — showed up on time,
              communicated clearly throughout the project, and the quality of work exceeded our expectations.
              We wouldn&apos;t hesitate to recommend them to anyone looking for {industryLabel} services.&rdquo;
            </p>
            <div className="w-16 h-0.5 bg-stone-300 mx-auto mb-4 rounded-full" />
            <p className="text-stone-500 font-semibold">Happy Homeowner</p>
            {location && <p className="text-stone-400 text-sm mt-1">{lead.city}, {lead.state}</p>}
          </div>
        </div>
      </section>

      {/* ─── Photo Gallery — 4 Columns with Hover CTAs ─── */}
      {photos.length > 0 && (
        <section className="py-20 md:py-28 px-4 sm:px-6 bg-stone-50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14 md:mb-18">
              <div className="inline-flex items-center gap-2 mb-3">
                <Camera size={16} className="text-stone-400" />
                <p className="text-sm uppercase tracking-widest text-stone-400 font-semibold">Portfolio</p>
              </div>
              <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-stone-900 mb-4">Our Recent Work</h2>
              <p className="text-stone-500 text-base md:text-lg">Quality craftsmanship you can see and feel.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {photos.slice(0, 8).map((photo, i) => (
                <div key={i} className="group relative aspect-square bg-stone-200 rounded-xl md:rounded-2xl overflow-hidden card-lift">
                  <img
                    src={photo}
                    alt={`${lead.companyName} project ${i + 1}`}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
                    <button onClick={onCTAClick} className="bg-white/90 text-stone-900 text-xs font-semibold px-4 py-2 rounded-full backdrop-blur-sm">
                      Get a Free Quote
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Service Area ─── */}
      {location && (
        <section className="py-20 md:py-28 px-4 sm:px-6 bg-white">
          <div className="max-w-4xl mx-auto text-center">
            <div className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br ${config.gradient} flex items-center justify-center mx-auto mb-8 shadow-lg`}>
              <MapPin size={28} className="text-white" />
            </div>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-stone-900 mb-6">
              Serving {location}
            </h2>
            <p className="text-stone-600 text-base md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
              {lead.companyName} is proud to serve homeowners and businesses in {lead.city} and the greater {lead.state} area.
              As local {industryLabel} professionals, we understand the unique needs of our community.
            </p>
            <div className="flex flex-wrap justify-center gap-3 md:gap-4">
              {[
                { icon: Users, label: 'Locally Owned' },
                { icon: Clock, label: 'Same-Day Response' },
                { icon: Shield, label: 'Fully Licensed' },
                { icon: CheckCircle, label: 'Satisfaction Guaranteed' },
              ].map((item, i) => (
                <div
                  key={i}
                  className="inline-flex items-center gap-2.5 bg-stone-50 border border-stone-200 rounded-full px-5 md:px-6 py-2.5 md:py-3 shadow-sm hover:shadow-md transition-shadow duration-200"
                >
                  <item.icon size={16} className="text-stone-600" />
                  <span className="text-sm font-semibold text-stone-700">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Gradient CTA Section ─── */}
      <section className={`relative py-20 md:py-28 px-4 sm:px-6 bg-gradient-to-br ${config.gradient} text-white overflow-hidden`}>
        <div className="absolute inset-0 bg-noise opacity-5" />
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/4 blur-3xl" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            {wc?.closingHeadline || 'Ready to Get Started?'}
          </h2>
          <p className="text-base md:text-xl text-white/75 mb-10 md:mb-12 max-w-xl mx-auto leading-relaxed">
            {wc?.closingBody || `Contact ${lead.companyName} today for a free, no-obligation estimate. We\u2019re here to help with all your ${industryLabel} needs.`}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={`tel:${lead.phone}`}
              onClick={onCallClick}
              className="inline-flex items-center justify-center gap-2.5 bg-white text-stone-900 px-8 md:px-10 py-4 rounded-xl font-bold text-base md:text-lg hover:bg-stone-50 transition-all duration-200 shadow-xl hover:shadow-2xl hover:-translate-y-0.5"
            >
              <Phone size={20} />
              Call Now — It&apos;s Free
            </a>
            {lead.email && (
              <a
                href={`mailto:${lead.email}`}
                className="inline-flex items-center justify-center gap-2.5 bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white px-8 md:px-10 py-4 rounded-xl font-semibold text-base md:text-lg hover:bg-white hover:text-stone-900 transition-all duration-300"
              >
                <Mail size={20} />
                Email Us
              </a>
            )}
          </div>
          <p className="mt-4 text-sm text-white/50">No obligation &bull; Free estimate &bull; Satisfaction guaranteed</p>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="bg-stone-900 py-14 md:py-16 px-4 sm:px-6 pb-28 md:pb-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12 mb-10 md:mb-12">
            <div>
              <h3 className="font-display text-white font-bold text-lg md:text-xl mb-4">{lead.companyName}</h3>
              <p className="text-stone-400 text-sm leading-relaxed">
                Your trusted {industryLabel} professionals{location ? ` in ${location}` : ''}.
                Licensed, insured, and committed to quality workmanship on every project.
              </p>
              {hasRating && (
                <div className="flex items-center gap-2 mt-4">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} size={12} className={i < Math.floor(lead.enrichedRating!) ? 'text-amber-400 fill-current' : 'text-stone-700'} />
                    ))}
                  </div>
                  <span className="text-stone-400 text-xs">{lead.enrichedRating} Stars{lead.enrichedReviews ? ` (${lead.enrichedReviews} reviews)` : ''}</span>
                </div>
              )}
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Services</h4>
              <ul className="space-y-3 text-sm text-stone-400">
                {services.slice(0, 4).map((s, i) => (
                  <li key={i} className="flex items-center gap-2 hover:text-white transition-colors duration-200">
                    <CheckCircle size={12} className="text-emerald-500 flex-shrink-0" />
                    {s}
                  </li>
                ))}
                {services.length === 0 && (
                  <li>Professional {industryLabel} services</li>
                )}
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Contact</h4>
              <div className="space-y-3 text-sm text-stone-400">
                {lead.phone && (
                  <a href={`tel:${lead.phone}`} onClick={onCallClick} className="flex items-center gap-2.5 hover:text-white transition-colors duration-200">
                    <Phone size={14} /> {lead.phone}
                  </a>
                )}
                {lead.email && (
                  <a href={`mailto:${lead.email}`} className="flex items-center gap-2.5 hover:text-white transition-colors duration-200">
                    <Mail size={14} /> {lead.email}
                  </a>
                )}
                {lead.enrichedAddress && (
                  <p className="flex items-center gap-2.5"><MapPin size={14} /> {lead.enrichedAddress}</p>
                )}
              </div>
            </div>
          </div>
          <div className="border-t border-stone-800 pt-8 md:pt-10 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-stone-500 text-sm">&copy; {new Date().getFullYear()} {lead.companyName}. All rights reserved.</p>
            {location && <p className="text-stone-600 text-xs">Professional {industryLabel} services in {location}</p>}
          </div>
        </div>
      </footer>
    </div>
  )
}
