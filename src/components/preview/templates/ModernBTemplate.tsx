import { Phone, MapPin, Star, Shield, Clock, CheckCircle, ArrowRight, Award, Mail, ChevronRight, Sparkles, Eye, Users } from 'lucide-react'
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

      {/* ─── Sticky Nav ─── */}
      <nav className="sticky top-0 z-40 glass border-b border-gray-200/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-[72px] flex items-center justify-between">
          <span className="font-display text-xl font-bold text-gray-900 tracking-tight">{lead.companyName}</span>
          <div className="flex items-center gap-4">
            {lead.phone && (
              <a href={`tel:${lead.phone}`} onClick={onCallClick} className="hidden md:inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium">
                <Phone size={15} />
                {lead.phone}
              </a>
            )}
            <button onClick={onCTAClick} className="bg-gradient-to-r from-violet-500 to-purple-600 text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:from-violet-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg animate-cta-glow-violet">
              Get a Quote
            </button>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative py-28 md:py-40 px-4 sm:px-6 overflow-hidden bg-mesh-light-violet">
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-violet-100/60 to-transparent rounded-full -translate-y-1/3 translate-x-1/4 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-purple-100/40 to-transparent rounded-full translate-y-1/3 -translate-x-1/4 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] bg-gradient-to-br from-fuchsia-100/30 to-transparent rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />

        <div className="relative max-w-5xl mx-auto text-center">
          {hasRating && (
            <div className="inline-flex items-center gap-2.5 bg-white/80 backdrop-blur-sm border border-gray-200/60 rounded-full px-5 py-2.5 mb-10 shadow-sm animate-fade-in-up">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} size={15} className={i < Math.floor(lead.enrichedRating!) ? 'text-amber-400 fill-current' : 'text-gray-200'} />
                ))}
              </div>
              <span className="text-sm font-semibold text-gray-800">{lead.enrichedRating}</span>
              {lead.enrichedReviews && <span className="text-sm text-gray-400">({lead.enrichedReviews} reviews)</span>}
            </div>
          )}

          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold text-gray-900 mb-8 tracking-tight leading-[1.05]">
            {lead.companyName}
          </h1>

          <div className="w-24 h-1.5 bg-gradient-to-r from-violet-400 via-purple-500 to-violet-500 mx-auto mb-8 rounded-full" />

          <p className="text-xl md:text-2xl text-gray-500 mb-5 max-w-2xl mx-auto leading-relaxed font-light">{wc?.heroHeadline || config.tagline}</p>
          {wc?.heroSubheadline && <p className="text-lg text-gray-400 mb-5 max-w-2xl mx-auto leading-relaxed">{wc.heroSubheadline}</p>}
          {location && (
            <p className="text-gray-400 mb-12 flex items-center justify-center gap-2 text-base">
              <MapPin size={16} className="text-violet-500" />
              Serving {location} and surrounding areas
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={`tel:${lead.phone}`}
              onClick={onCallClick}
              className="inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white px-10 py-4.5 rounded-full font-semibold text-lg hover:from-violet-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl animate-cta-glow-violet"
            >
              <Phone size={20} />
              Call Now
            </a>
            <button
              onClick={onCTAClick}
              className="inline-flex items-center justify-center gap-2.5 bg-white border-2 border-gray-200 text-gray-700 px-10 py-4.5 rounded-full font-semibold text-lg hover:border-violet-400 hover:text-violet-600 transition-all hover:shadow-md"
            >
              {config.ctaText}
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* ─── Trust Bar ─── */}
      <section className="py-12 px-4 sm:px-6 border-y border-gray-100 bg-gradient-to-r from-gray-50 via-white to-gray-50">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          {[
            { icon: Shield, color: 'violet', title: wc?.valueProps?.[0]?.title || 'Licensed & Insured', desc: wc?.valueProps?.[0]?.description || 'Full coverage for your peace of mind' },
            { icon: Award, color: 'purple', title: wc?.valueProps?.[1]?.title || 'Top Rated', desc: wc?.valueProps?.[1]?.description || (hasRating ? `${lead.enrichedRating}-star average rating` : 'Consistently 5-star service') },
            { icon: Clock, color: 'fuchsia', title: wc?.valueProps?.[2]?.title || 'Fast Response', desc: wc?.valueProps?.[2]?.description || 'Quick turnaround on every project' },
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center gap-3">
              <div className={`w-14 h-14 rounded-2xl bg-${item.color}-50 flex items-center justify-center`}>
                <item.icon size={24} className={`text-${item.color}-500`} />
              </div>
              <p className="font-display font-bold text-gray-900 text-lg">{item.title}</p>
              <p className="text-sm text-gray-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Services ─── */}
      {services.length > 0 && (
        <section className="py-24 px-4 sm:px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-violet-50 text-violet-600 rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
                <Sparkles size={14} />
                What We Offer
              </div>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-4">Our Services</h2>
              <p className="text-gray-500 max-w-xl mx-auto text-lg">{wc?.heroSubheadline || `Professional ${industryLabel} services tailored to your specific needs.`}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.slice(0, 6).map((service, i) => (
                <div key={i} className="group bg-white rounded-2xl border border-gray-100 p-8 card-lift hover:border-violet-200">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-md">
                    <CheckCircle size={24} className="text-white" />
                  </div>
                  <h3 className="font-display font-bold text-xl text-gray-900 mb-3">{service}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed mb-4">{wc?.serviceDescriptions?.[service] || `Expert ${service.toLowerCase()} solutions delivered with precision, quality materials, and attention to detail.`}</p>
                  <div className="flex items-center gap-1.5 text-violet-500 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
                    Learn more <ChevronRight size={14} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── How It Works ─── */}
      <section className="py-24 px-4 sm:px-6 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-violet-50 text-violet-600 rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
              <Eye size={14} />
              Simple Process
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-gray-500 text-lg">Three simple steps to get your project started.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              { step: '01', title: 'Get in Touch', desc: `Call us or request a quote online. We'll discuss your ${industryLabel} needs and schedule a time that works for you.` },
              { step: '02', title: 'Free Consultation', desc: `Our team will assess your project, provide expert recommendations, and deliver a transparent, no-obligation estimate.` },
              { step: '03', title: 'We Get to Work', desc: `Once approved, our skilled professionals handle everything from start to finish with quality craftsmanship guaranteed.` },
            ].map((item) => (
              <div key={item.step} className="text-center group">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-400 to-purple-500 text-white text-2xl font-bold flex items-center justify-center mx-auto mb-6 font-display shadow-lg group-hover:shadow-xl transition-shadow">
                  {item.step}
                </div>
                <h3 className="font-display text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── About ─── */}
      <section className="py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-14">
            <div className="lg:col-span-3">
              <div className="inline-flex items-center gap-2 bg-violet-50 text-violet-600 rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
                About Us
              </div>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-8">Your Trusted {industryLabel.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Professionals</h2>
              <div className="space-y-5 text-gray-600 leading-relaxed text-lg">
                <p>
                  {wc?.aboutParagraph1 || `At ${lead.companyName}, we believe every client deserves exceptional ${industryLabel} service delivered with integrity and professionalism.${location ? ` Based in ${location}, we've built our reputation on honest work, transparent pricing, and results that speak for themselves.` : " We've built our reputation on honest work, transparent pricing, and results that speak for themselves."}`}
                </p>
                <p>
                  {wc?.aboutParagraph2 || 'Our team of experienced professionals is fully licensed and insured, bringing deep expertise to every project — no matter the size. From initial consultation to final walkthrough, we keep you informed and ensure complete satisfaction.'}
                </p>
              </div>
              <div className="mt-10 flex flex-wrap gap-10">
                <div>
                  <p className="font-display text-4xl font-bold text-gradient-violet">{hasRating ? lead.enrichedRating : '5.0'}</p>
                  <p className="text-sm text-gray-400 font-medium mt-1">Star Rating</p>
                </div>
                {lead.enrichedReviews && (
                  <div>
                    <p className="font-display text-4xl font-bold text-gradient-violet">{lead.enrichedReviews}+</p>
                    <p className="text-sm text-gray-400 font-medium mt-1">Reviews</p>
                  </div>
                )}
                <div>
                  <p className="font-display text-4xl font-bold text-gradient-violet">100%</p>
                  <p className="text-sm text-gray-400 font-medium mt-1">Satisfaction</p>
                </div>
              </div>
            </div>
            <div className="lg:col-span-2">
              <div className="bg-gradient-to-br from-gray-50 to-white rounded-3xl border border-gray-100 p-9 sticky top-24 shadow-sm">
                <h3 className="font-display text-2xl font-bold text-gray-900 mb-6">Contact Us</h3>
                <div className="space-y-4">
                  {lead.phone && (
                    <a href={`tel:${lead.phone}`} onClick={onCallClick} className="flex items-center gap-4 text-gray-600 hover:text-gray-900 transition-colors p-3 rounded-xl hover:bg-gray-50">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Phone size={20} className="text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Phone</p>
                        <p className="font-semibold text-gray-900">{lead.phone}</p>
                      </div>
                    </a>
                  )}
                  {lead.email && (
                    <a href={`mailto:${lead.email}`} className="flex items-center gap-4 text-gray-600 hover:text-gray-900 transition-colors p-3 rounded-xl hover:bg-gray-50">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-fuchsia-500 flex items-center justify-center flex-shrink-0 shadow-sm">
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
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-fuchsia-400 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <MapPin size={20} className="text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Address</p>
                        <p className="font-semibold text-gray-900">{lead.enrichedAddress}</p>
                      </div>
                    </div>
                  )}
                </div>
                <button onClick={onCTAClick} className="w-full mt-8 bg-gradient-to-r from-violet-500 to-purple-600 text-white py-4 rounded-xl font-semibold text-lg hover:from-violet-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg">
                  {config.ctaText}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Photo Gallery ─── */}
      {photos.length > 0 && (
        <section className="py-24 px-4 sm:px-6 bg-gradient-to-b from-gray-50 to-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-violet-50 text-violet-600 rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
                Portfolio
              </div>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-4">Our Recent Work</h2>
              <p className="text-gray-500 text-lg">See the quality and craftsmanship we bring to every project.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.slice(0, 8).map((photo, i) => (
                <div key={i} className="group aspect-square bg-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500">
                  <img src={photo} alt={`${lead.companyName} project ${i + 1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Service Area ─── */}
      {location && (
        <section className="py-24 px-4 sm:px-6 bg-white">
          <div className="max-w-4xl mx-auto text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center mx-auto mb-8 shadow-lg">
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

      {/* ─── Final CTA ─── */}
      <section className="relative py-24 px-4 sm:px-6 bg-gradient-to-br from-violet-600 via-violet-500 to-purple-600 overflow-hidden">
        <div className="absolute inset-0 bg-noise opacity-10" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-400/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-6">{wc?.closingHeadline || 'Ready to Get Started?'}</h2>
          <p className="text-xl text-white/80 mb-12 max-w-xl mx-auto leading-relaxed">
            {wc?.closingBody || 'Get a free estimate on your project today. No obligation, no pressure — just honest advice from local professionals.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={`tel:${lead.phone}`}
              onClick={onCallClick}
              className="inline-flex items-center justify-center gap-2.5 bg-white text-violet-700 px-10 py-4.5 rounded-full font-bold text-lg hover:bg-gray-50 transition-all shadow-xl hover:shadow-2xl"
            >
              <Phone size={20} />
              {lead.phone || 'Call Now'}
            </a>
            <button
              onClick={onCTAClick}
              className="inline-flex items-center justify-center gap-2.5 border-2 border-white/50 text-white px-10 py-4.5 rounded-full font-bold text-lg hover:bg-white hover:text-violet-700 transition-all"
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
                {lead.phone && <p className="flex items-center gap-2.5 hover:text-white transition-colors"><Phone size={14} className="text-violet-400" /> {lead.phone}</p>}
                {lead.email && <p className="flex items-center gap-2.5 hover:text-white transition-colors"><Mail size={14} className="text-violet-400" /> {lead.email}</p>}
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
    </div>
  )
}
