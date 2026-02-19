import { Phone, MapPin, Star, Shield, Clock, Check, Award, Mail, Users, Heart, CheckCircle, ChevronRight, Quote, Leaf, ThumbsUp, Wrench, Zap, Droplets, Hammer } from 'lucide-react'
import type { TemplateProps } from '../config/template-types'
import DisclaimerBanner from '../shared/DisclaimerBanner'

export default function ClassicBTemplate({ lead, config, onCTAClick, onCallClick, websiteCopy }: TemplateProps) {
  const services = lead.enrichedServices || []
  const photos = lead.enrichedPhotos || []
  const industryLabel = lead.industry.toLowerCase().replace(/_/g, ' ')
  const location = [lead.city, lead.state].filter(Boolean).join(', ')
  const hasRating = lead.enrichedRating && lead.enrichedRating > 0
  const wc = websiteCopy

  const serviceIcons = [Wrench, Zap, Droplets, Hammer]

  return (
    <div className="preview-template min-h-screen bg-green-50/30">
      <DisclaimerBanner variant="classic" companyName={lead.companyName} />

      {/* ─── Sticky Nav with Green Accents ─── */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-green-200/60 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 md:h-[72px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-700 to-emerald-600 flex items-center justify-center flex-shrink-0">
              <Leaf size={16} className="text-white" />
            </div>
            <span className="font-display text-lg md:text-xl font-bold text-green-900 truncate max-w-[200px] md:max-w-none">{lead.companyName}</span>
          </div>
          <div className="flex items-center gap-3 md:gap-4">
            {lead.phone && (
              <a
                href={`tel:${lead.phone}`}
                onClick={onCallClick}
                className="hidden md:inline-flex items-center gap-2 text-sm text-green-700/60 hover:text-green-900 transition-colors duration-200 font-medium"
              >
                <Phone size={15} />
                {lead.phone}
              </a>
            )}
            <button
              onClick={onCTAClick}
              className="bg-gradient-to-r from-green-700 to-emerald-600 text-white px-5 md:px-6 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              Free Estimate
            </button>
          </div>
        </div>
      </nav>

      {/* ─── Split Hero — Text Left, Stats Right ─── */}
      <section className="relative bg-gradient-to-br from-green-800 via-green-900 to-emerald-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black/5" />
        <div className="absolute inset-0 bg-noise opacity-5" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-400/10 rounded-full -translate-y-1/3 translate-x-1/4 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-green-400/10 rounded-full translate-y-1/2 -translate-x-1/4 blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20 md:py-32 lg:py-40">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="animate-fade-in-up">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6 border border-white/10">
                <Leaf size={14} className="text-emerald-300" />
                <span className="text-sm font-medium text-emerald-200">
                  {location ? `Trusted in ${location}` : 'Trusted Local Business'}
                </span>
              </div>
              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold mb-6 tracking-tight leading-[1.08]">
                {lead.companyName}
              </h1>
              <p className="text-lg md:text-xl text-white/80 mb-4 leading-relaxed max-w-lg">
                {wc?.heroHeadline || config.tagline}
              </p>
              {wc?.heroSubheadline && (
                <p className="text-base md:text-lg text-white/55 mb-8 leading-relaxed max-w-lg">{wc.heroSubheadline}</p>
              )}
              {!wc?.heroSubheadline && <div className="mb-8" />}
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href={`tel:${lead.phone}`}
                  onClick={onCallClick}
                  className="inline-flex items-center justify-center gap-2.5 bg-white text-green-900 px-8 py-4 rounded-xl font-bold text-base hover:bg-green-50 transition-all duration-200 shadow-xl hover:shadow-2xl hover:-translate-y-0.5"
                >
                  <Phone size={18} />
                  Call Now
                </a>
                <button
                  onClick={onCTAClick}
                  className="inline-flex items-center justify-center gap-2.5 bg-white/10 backdrop-blur-sm border-2 border-white/25 text-white px-8 py-4 rounded-xl font-semibold text-base hover:bg-white hover:text-green-900 transition-all duration-300"
                >
                  {config.ctaText}
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="flex justify-center lg:justify-end">
              <div className="bg-white/10 backdrop-blur-md rounded-3xl border border-white/15 p-6 md:p-8 w-full max-w-sm shadow-2xl">
                <h3 className="font-display text-lg font-bold text-white mb-6 text-center">
                  Why Homeowners Trust Us
                </h3>
                <div className="space-y-4">
                  {hasRating && (
                    <div className="bg-white/10 rounded-2xl p-5 text-center border border-white/10">
                      <div className="flex justify-center gap-1 mb-2">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star key={i} size={20} className={i < Math.floor(lead.enrichedRating!) ? 'text-yellow-300 fill-current' : 'text-white/20'} />
                        ))}
                      </div>
                      <p className="text-3xl font-bold text-white">{lead.enrichedRating}</p>
                      <p className="text-sm text-white/60">Star Rating</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    {lead.enrichedReviews && (
                      <div className="bg-white/10 rounded-xl p-4 text-center border border-white/10">
                        <p className="text-2xl font-bold text-white">{lead.enrichedReviews}+</p>
                        <p className="text-xs text-white/60 mt-1">Reviews</p>
                      </div>
                    )}
                    <div className="bg-white/10 rounded-xl p-4 text-center border border-white/10">
                      <p className="text-2xl font-bold text-white">10+</p>
                      <p className="text-xs text-white/60 mt-1">Years Experience</p>
                    </div>
                    {!lead.enrichedReviews && (
                      <div className="bg-white/10 rounded-xl p-4 text-center border border-white/10">
                        <p className="text-2xl font-bold text-white">100%</p>
                        <p className="text-xs text-white/60 mt-1">Satisfaction</p>
                      </div>
                    )}
                  </div>
                  <div className="bg-emerald-500/20 rounded-xl p-4 flex items-center gap-3 border border-emerald-400/20">
                    <Shield size={20} className="text-emerald-300 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-white">Licensed & Insured</p>
                      <p className="text-xs text-white/50">Full coverage on every job</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Alternating Feature Sections for Services ─── */}
      {services.length > 0 && (
        <section>
          {services.slice(0, 4).map((service, i) => {
            const ServiceIcon = serviceIcons[i % serviceIcons.length]
            const isEven = i % 2 === 0
            const desc = wc?.serviceDescriptions?.[service] || `Professional ${service.toLowerCase()} services with quality materials and expert craftsmanship. Our experienced team delivers reliable results that stand the test of time.`
            return (
              <div key={i} className={`py-16 md:py-20 px-4 sm:px-6 ${isEven ? 'bg-white' : 'bg-green-50/50'}`}>
                <div className="max-w-6xl mx-auto">
                  <div className={`grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center ${!isEven ? 'lg:direction-rtl' : ''}`}>
                    <div className={`${!isEven ? 'lg:order-2' : ''}`}>
                      <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center mb-6 shadow-sm border border-green-200/50">
                        <ServiceIcon size={36} className="text-green-700" />
                      </div>
                      <h3 className="font-display text-2xl md:text-3xl font-bold text-green-950 mb-4">{service}</h3>
                      <p className="text-green-800/60 leading-relaxed text-base md:text-lg mb-6">{desc}</p>
                      <ul className="space-y-3">
                        {['Expert technicians', 'Quality materials', 'Satisfaction guaranteed'].map((point, j) => (
                          <li key={j} className="flex items-center gap-3 text-green-800/70">
                            <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                              <Check size={14} className="text-emerald-600" />
                            </div>
                            <span className="text-sm font-medium">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className={`${!isEven ? 'lg:order-1' : ''}`}>
                      <div className="bg-gradient-to-br from-green-100 to-emerald-50 rounded-2xl p-8 md:p-10 border border-green-200/50 flex items-center justify-center min-h-[240px] md:min-h-[300px]">
                        <div className="text-center">
                          <ServiceIcon size={64} className="text-green-600/40 mx-auto mb-4" />
                          <p className="font-display text-xl font-bold text-green-800/50">{service}</p>
                          <p className="text-green-700/40 text-sm mt-1">Professional Service</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </section>
      )}

      {/* ─── Statistics Banner ─── */}
      <section className="relative py-16 md:py-20 px-4 sm:px-6 bg-gradient-to-r from-green-700 via-emerald-700 to-green-800 text-white overflow-hidden">
        <div className="absolute inset-0 bg-noise opacity-5" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-400/10 rounded-full -translate-y-1/2 blur-3xl" />
        <div className="relative max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {[
              { value: hasRating ? `${lead.enrichedRating}` : '5.0', label: 'Star Rating', suffix: '/5' },
              { value: lead.enrichedReviews ? `${lead.enrichedReviews}` : '50', label: 'Happy Customers', suffix: '+' },
              { value: '100', label: 'Satisfaction', suffix: '%' },
              { value: '10', label: 'Years Experience', suffix: '+' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <p className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-1">
                  {stat.value}<span className="text-emerald-300">{stat.suffix}</span>
                </p>
                <p className="text-sm md:text-base text-white/60 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Full-Width Storytelling About ─── */}
      <section className="py-20 md:py-28 px-4 sm:px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 rounded-full px-4 py-2 text-sm font-semibold mb-4 border border-green-200">
              <Heart size={14} />
              Our Story
            </div>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-green-950 mb-6">
              Built on Trust, Driven by Community
            </h2>
          </div>

          <div className="space-y-6 text-green-800/65 leading-relaxed text-base md:text-lg">
            <p>
              {wc?.aboutParagraph1 || `${lead.companyName} has been providing reliable ${industryLabel} services${location ? ` to homeowners and businesses throughout ${location}` : ' to homeowners and businesses in the local area'}. We built this company on old-fashioned values: show up on time, do honest work, and stand behind every job.`}
            </p>
          </div>

          <div className="my-10 md:my-14 relative">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-8 md:p-10 border-l-4 border-green-600">
              <Quote size={32} className="text-green-300 mb-4" />
              <p className="text-xl md:text-2xl font-display font-medium text-green-900 leading-relaxed italic">
                &ldquo;We don&apos;t just do the job — we build relationships. Every homeowner we work with becomes part of our extended family.&rdquo;
              </p>
              <p className="mt-4 text-green-700/60 font-semibold">
                — The {lead.companyName} Team
              </p>
            </div>
          </div>

          <div className="space-y-6 text-green-800/65 leading-relaxed text-base md:text-lg">
            <p>
              {wc?.aboutParagraph2 || `Our team brings years of hands-on experience to every project. Whether it\u2019s a small repair or a complete overhaul, we approach every job with the same level of care and professionalism.`}
            </p>
            <p>
              As a locally owned and operated business, we understand the needs of our community. We&apos;re not a faceless corporation — we&apos;re
              your neighbors, and we treat every customer like family.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {lead.phone && (
              <a
                href={`tel:${lead.phone}`}
                onClick={onCallClick}
                className="flex items-center gap-4 bg-green-50 rounded-xl p-5 border border-green-200/60 hover:shadow-md hover:border-green-300/60 transition-all duration-200 group"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-700 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Phone size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-xs text-green-600/50 uppercase tracking-wider font-medium">Call Us</p>
                  <p className="font-semibold text-green-950 group-hover:text-green-800 transition-colors duration-200">{lead.phone}</p>
                </div>
              </a>
            )}
            {lead.email && (
              <a
                href={`mailto:${lead.email}`}
                className="flex items-center gap-4 bg-green-50 rounded-xl p-5 border border-green-200/60 hover:shadow-md hover:border-green-300/60 transition-all duration-200 group"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-700 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Mail size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-xs text-green-600/50 uppercase tracking-wider font-medium">Email</p>
                  <p className="font-semibold text-green-950 group-hover:text-green-800 transition-colors duration-200 truncate max-w-[160px]">{lead.email}</p>
                </div>
              </a>
            )}
            {lead.enrichedAddress && (
              <div className="flex items-center gap-4 bg-green-50 rounded-xl p-5 border border-green-200/60">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-700 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <MapPin size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-xs text-green-600/50 uppercase tracking-wider font-medium">Location</p>
                  <p className="font-semibold text-green-950 text-sm">{lead.enrichedAddress}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── Multiple Testimonial Cards ─── */}
      <section className="py-20 md:py-28 px-4 sm:px-6 bg-green-50/40">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-white text-green-700 rounded-full px-4 py-2 text-sm font-semibold mb-4 border border-green-200 shadow-sm">
              <ThumbsUp size={14} />
              Customer Stories
            </div>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-green-950 mb-4">
              What Our Customers Say
            </h2>
            <p className="text-green-800/50 max-w-xl mx-auto text-base md:text-lg">
              Real feedback from homeowners and businesses who trust {lead.companyName}.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                quote: `${lead.companyName} did an outstanding job. They were professional from start to finish and the quality of work exceeded our expectations.`,
                name: 'Sarah M.',
                loc: lead.city || 'Local Homeowner',
              },
              {
                quote: `Honest, reliable, and truly skilled at what they do. I wouldn't hesitate to recommend them to anyone looking for quality ${industryLabel} services.`,
                name: 'James R.',
                loc: lead.city || 'Satisfied Customer',
              },
              {
                quote: `From the initial quote to the finished project, everything was handled with professionalism and care. They left the site cleaner than they found it.`,
                name: 'Linda K.',
                loc: lead.city || 'Happy Customer',
              },
            ].map((testimonial, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-green-200/50 p-7 md:p-8 card-lift hover:border-green-300/50 transition-all duration-300 flex flex-col"
              >
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: 5 }, (_, j) => (
                    <Star key={j} size={18} className="text-amber-400 fill-current" />
                  ))}
                </div>
                <p className="text-green-800/70 leading-relaxed flex-1 mb-6 italic">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3 pt-4 border-t border-green-100">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-200 to-emerald-200 flex items-center justify-center">
                    <span className="text-green-700 font-bold text-sm">{testimonial.name[0]}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-green-950 text-sm">{testimonial.name}</p>
                    <p className="text-green-700/50 text-xs">{testimonial.loc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Gallery with Large Hero Image ─── */}
      {photos.length > 0 && (
        <section className="py-20 md:py-28 px-4 sm:px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <p className="text-sm uppercase tracking-widest text-green-600/50 font-semibold mb-3">Our Work</p>
              <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-green-950 mb-4">See the Results</h2>
              <p className="text-green-800/50 text-base md:text-lg">Quality craftsmanship showcased through our recent projects.</p>
            </div>
            <div className="group aspect-[16/9] md:aspect-[21/9] bg-green-100 rounded-2xl overflow-hidden mb-4 card-lift">
              <img
                src={photos[0]}
                alt={`${lead.companyName} featured project`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
              />
            </div>
            {photos.length > 1 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                {photos.slice(1, 9).map((photo, i) => (
                  <div key={i} className="group aspect-square bg-green-100 rounded-xl md:rounded-2xl overflow-hidden card-lift">
                    <img
                      src={photo}
                      alt={`${lead.companyName} project ${i + 2}`}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ─── Service Area ─── */}
      {location && (
        <section className="py-20 md:py-28 px-4 sm:px-6 bg-green-50/40">
          <div className="max-w-4xl mx-auto text-center">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-green-700 to-emerald-600 flex items-center justify-center mx-auto mb-8 shadow-lg">
              <MapPin size={28} className="text-white" />
            </div>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-green-950 mb-6">Proudly Serving {location}</h2>
            <p className="text-green-800/60 text-base md:text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
              {lead.companyName} is proud to serve homeowners and businesses in {lead.city} and the greater {lead.state} area.
              As local {industryLabel} professionals, we understand the unique needs of our community.
            </p>
            <div className="flex flex-wrap justify-center gap-3 md:gap-4">
              {[
                { icon: Users, label: 'Locally Owned' },
                { icon: Clock, label: 'Prompt Service' },
                { icon: Shield, label: 'Fully Licensed' },
                { icon: Leaf, label: 'Eco-Conscious' },
              ].map((item, i) => (
                <div
                  key={i}
                  className="inline-flex items-center gap-2.5 bg-white border border-green-200 rounded-full px-5 md:px-6 py-2.5 md:py-3 shadow-sm hover:shadow-md transition-shadow duration-200"
                >
                  <item.icon size={16} className="text-green-700" />
                  <span className="text-sm font-semibold text-green-800">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Final CTA — Dark Green Gradient ─── */}
      <section className="relative py-20 md:py-28 px-4 sm:px-6 bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-noise opacity-5" />
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-400/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-green-400/10 rounded-full translate-y-1/3 -translate-x-1/4 blur-3xl" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            {wc?.closingHeadline || 'Ready to Get Started?'}
          </h2>
          <p className="text-base md:text-xl text-white/70 mb-10 md:mb-12 max-w-xl mx-auto leading-relaxed">
            {wc?.closingBody || `Contact ${lead.companyName} today for a free, no-obligation estimate. We\u2019re here to help with all your ${industryLabel} needs.`}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={`tel:${lead.phone}`}
              onClick={onCallClick}
              className="inline-flex items-center justify-center gap-2.5 bg-white text-green-900 px-8 md:px-10 py-4 rounded-xl font-bold text-base md:text-lg hover:bg-green-50 transition-all duration-200 shadow-xl hover:shadow-2xl hover:-translate-y-0.5"
            >
              <Phone size={20} />
              {lead.phone || 'Call Now'}
            </a>
            {lead.email && (
              <a
                href={`mailto:${lead.email}`}
                className="inline-flex items-center justify-center gap-2.5 bg-white/10 backdrop-blur-sm border-2 border-white/25 text-white px-8 md:px-10 py-4 rounded-xl font-semibold text-base md:text-lg hover:bg-white hover:text-green-900 transition-all duration-300"
              >
                <Mail size={20} />
                Email Us
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ─── Sticky Mobile Phone Bar ─── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/95 backdrop-blur-md border-t border-green-200/60 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex items-center gap-3 px-4 py-3">
          <a
            href={`tel:${lead.phone}`}
            onClick={onCallClick}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-green-50 text-green-900 py-3 rounded-xl font-semibold text-sm border border-green-200 hover:bg-green-100 transition-colors duration-200"
          >
            <Phone size={16} />
            {lead.phone || 'Call Now'}
          </a>
          <button
            onClick={onCTAClick}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-green-700 to-emerald-600 text-white py-3 rounded-xl font-semibold text-sm shadow-md hover:opacity-90 transition-all duration-200"
          >
            {config.ctaText}
          </button>
        </div>
      </div>

      {/* ─── Footer ─── */}
      <footer className="bg-green-950 py-14 md:py-16 px-4 sm:px-6 pb-28 md:pb-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12 mb-10 md:mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-600 to-emerald-500 flex items-center justify-center">
                  <Leaf size={16} className="text-white" />
                </div>
                <h3 className="font-display text-white font-bold text-lg md:text-xl">{lead.companyName}</h3>
              </div>
              <p className="text-green-200/50 text-sm leading-relaxed">
                Your trusted {industryLabel} professionals{location ? ` in ${location}` : ''}.
                Licensed, insured, and committed to quality workmanship on every project.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Services</h4>
              <ul className="space-y-3 text-sm text-green-200/50">
                {services.slice(0, 4).map((s, i) => (
                  <li key={i} className="flex items-center gap-2 hover:text-white transition-colors duration-200">
                    <CheckCircle size={12} className="text-emerald-400 flex-shrink-0" />
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
              <div className="space-y-3 text-sm text-green-200/50">
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
          <div className="border-t border-green-800/50 pt-8 md:pt-10 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-green-200/40 text-sm">&copy; {new Date().getFullYear()} {lead.companyName}. All rights reserved.</p>
            {location && <p className="text-green-200/30 text-xs">Professional {industryLabel} services in {location}</p>}
          </div>
        </div>
      </footer>
    </div>
  )
}
