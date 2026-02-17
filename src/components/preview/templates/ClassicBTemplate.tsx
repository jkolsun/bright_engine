import { Phone, MapPin, Star, Shield, Clock, Check, Award, Mail, Users, Heart, CheckCircle, ChevronRight, Quote } from 'lucide-react'
import type { TemplateProps } from '../config/template-types'
import DisclaimerBanner from '../shared/DisclaimerBanner'

export default function ClassicBTemplate({ lead, config, onCTAClick, onCallClick, websiteCopy }: TemplateProps) {
  const services = lead.enrichedServices || []
  const photos = lead.enrichedPhotos || []
  const industryLabel = lead.industry.toLowerCase().replace(/_/g, ' ')
  const location = [lead.city, lead.state].filter(Boolean).join(', ')
  const hasRating = lead.enrichedRating && lead.enrichedRating > 0
  const wc = websiteCopy

  return (
    <div className="preview-template min-h-screen bg-green-50/30">
      <DisclaimerBanner variant="classic" companyName={lead.companyName} />

      {/* ─── Nav ─── */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-green-200/60 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-[72px] flex items-center justify-between">
          <span className="font-display text-xl font-bold text-green-900">{lead.companyName}</span>
          <div className="flex items-center gap-4">
            {lead.phone && (
              <a href={`tel:${lead.phone}`} onClick={onCallClick} className="hidden md:inline-flex items-center gap-2 text-sm text-green-700/60 hover:text-green-900 transition-colors font-medium">
                <Phone size={15} />
                {lead.phone}
              </a>
            )}
            <button onClick={onCTAClick} className="bg-gradient-to-r from-green-700 to-emerald-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-all shadow-md hover:shadow-lg">
              Free Estimate
            </button>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative bg-gradient-to-br from-green-800 to-emerald-900 text-white py-28 md:py-40 px-4 sm:px-6 overflow-hidden">
        <div className="absolute inset-0 bg-black/10" />
        <div className="absolute inset-0 bg-noise opacity-5" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-white/5 rounded-full -translate-y-1/3 translate-x-1/3 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-400/10 rounded-full translate-y-1/2 -translate-x-1/4 blur-3xl" />

        <div className="relative max-w-6xl mx-auto text-center">
          {hasRating && (
            <div className="inline-flex items-center gap-2.5 bg-white/15 backdrop-blur-sm rounded-full px-5 py-2.5 mb-10 border border-white/10">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} size={16} className={i < Math.floor(lead.enrichedRating!) ? 'text-yellow-300 fill-current' : 'text-white/20'} />
                ))}
              </div>
              <span className="text-sm font-semibold">{lead.enrichedRating} Stars</span>
              {lead.enrichedReviews && <span className="text-sm text-white/60">from {lead.enrichedReviews} reviews</span>}
            </div>
          )}

          <h1 className="font-display text-5xl md:text-7xl font-bold mb-8 tracking-tight leading-[1.05]">{lead.companyName}</h1>

          <div className="w-24 h-1 bg-emerald-400/40 mx-auto mb-8 rounded-full" />

          <p className="text-xl md:text-2xl text-white/85 mb-5 max-w-2xl mx-auto leading-relaxed">{wc?.heroHeadline || config.tagline}</p>
          {wc?.heroSubheadline && <p className="text-lg text-white/65 mb-5 max-w-2xl mx-auto leading-relaxed">{wc.heroSubheadline}</p>}
          {location && (
            <p className="text-white/50 mb-12 flex items-center justify-center gap-2 text-base">
              <MapPin size={16} />
              Proudly serving {location} and surrounding areas
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={`tel:${lead.phone}`}
              onClick={onCallClick}
              className="inline-flex items-center justify-center gap-2.5 bg-white text-green-900 px-10 py-4.5 rounded-xl font-bold text-lg hover:bg-green-50 transition-all shadow-xl hover:shadow-2xl"
            >
              <Phone size={20} />
              Call Now
            </a>
            <button
              onClick={onCTAClick}
              className="inline-flex items-center justify-center gap-2.5 bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white px-10 py-4.5 rounded-xl font-semibold text-lg hover:bg-white hover:text-green-900 transition-all"
            >
              {config.ctaText}
            </button>
          </div>
        </div>
      </section>

      {/* ─── Why Choose Us ─── */}
      <section className="py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-green-950 mb-4">Why Choose {lead.companyName}?</h2>
            <p className="text-green-800/50 max-w-xl mx-auto text-lg">We&apos;ve built our reputation on three core values that guide every project.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Shield, title: wc?.valueProps?.[0]?.title || 'Licensed & Insured', desc: wc?.valueProps?.[0]?.description || `Every member of our team is fully licensed and insured. You can trust ${lead.companyName} to protect your property and deliver professional results.` },
              { icon: Award, title: wc?.valueProps?.[1]?.title || 'Proven Track Record', desc: wc?.valueProps?.[1]?.description || `${hasRating ? `With a ${lead.enrichedRating}-star rating${lead.enrichedReviews ? ` across ${lead.enrichedReviews} reviews` : ''}, our` : 'Our'} customers consistently rate us among the top ${industryLabel} providers in the area.` },
              { icon: Heart, title: wc?.valueProps?.[2]?.title || 'Customer First', desc: wc?.valueProps?.[2]?.description || 'We treat your home like our own. From the first call to the final walkthrough, your satisfaction is our top priority — guaranteed.' },
            ].map((item, i) => (
              <div key={i} className="bg-gradient-to-b from-green-50/60 to-white rounded-2xl border border-green-200/50 p-10 text-center card-lift">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-700 to-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <item.icon size={32} className="text-white" />
                </div>
                <h3 className="font-display text-xl font-bold text-green-950 mb-4">{item.title}</h3>
                <p className="text-green-800/60 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Services ─── */}
      {services.length > 0 && (
        <section className="py-24 px-4 sm:px-6 bg-green-50/40">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-white text-green-700 rounded-full px-4 py-1.5 text-sm font-semibold mb-4 border border-green-200 shadow-sm">
                What We Do
              </div>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-green-950 mb-4">Our Services</h2>
              <p className="text-green-800/50 max-w-xl mx-auto text-lg">Comprehensive {industryLabel} solutions for residential and commercial properties.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {services.slice(0, 6).map((service, i) => (
                <div key={i} className="bg-white rounded-2xl border border-green-200/50 p-7 flex items-start gap-5 card-lift">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <Check size={22} className="text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-green-950 text-lg mb-2">{service}</h3>
                    <p className="text-green-800/50 text-sm leading-relaxed">{wc?.serviceDescriptions?.[service] || `Professional ${service.toLowerCase()} services with quality materials and expert craftsmanship.`}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── How We Work ─── */}
      <section className="py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 rounded-full px-4 py-1.5 text-sm font-semibold mb-4 border border-green-200 shadow-sm">
              Our Process
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-green-950 mb-4">How We Work</h2>
            <p className="text-green-800/50 text-lg">A straightforward process designed around your convenience.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { step: '01', title: 'Schedule a Visit', desc: `Give us a call or fill out a quick form. We'll set up a convenient time to visit your property and discuss your ${industryLabel} needs.` },
              { step: '02', title: 'Get Your Estimate', desc: 'We provide a detailed, written estimate with no hidden fees. You\'ll know exactly what to expect before any work begins.' },
              { step: '03', title: 'Enjoy the Results', desc: `Our experienced crew handles your project from start to finish. We clean up after ourselves and make sure you're 100% satisfied.` },
            ].map((item) => (
              <div key={item.step} className="relative">
                <div className="font-display text-6xl font-black bg-gradient-to-b from-green-700 to-emerald-600 bg-clip-text text-transparent mb-5">{item.step}</div>
                <h3 className="font-display text-xl font-bold text-green-950 mb-3">{item.title}</h3>
                <p className="text-green-800/60 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── About ─── */}
      <section className="py-24 px-4 sm:px-6 bg-green-50/40">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-14">
          <div className="lg:col-span-3">
            <div className="inline-flex items-center gap-2 bg-white text-green-700 rounded-full px-4 py-1.5 text-sm font-semibold mb-4 border border-green-200 shadow-sm">
              About Us
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-green-950 mb-8">A Name You Can Trust</h2>
            <div className="space-y-5 text-green-800/60 leading-relaxed text-lg">
              <p>
                {wc?.aboutParagraph1 || `${lead.companyName} has been providing reliable ${industryLabel} services${location ? ` to homeowners and businesses throughout ${location}` : ' to homeowners and businesses in the local area'}. We built this company on old-fashioned values: show up on time, do honest work, and stand behind every job.`}
              </p>
              <p>
                {wc?.aboutParagraph2 || `Our team brings years of hands-on experience to every project. Whether it's a small repair or a complete overhaul, we approach every job with the same level of care and professionalism.`}
              </p>
              <p>
                As a locally owned and operated business, we understand the needs of our community. We&apos;re not a faceless corporation — we&apos;re
                your neighbors, and we treat every customer like family.
              </p>
            </div>
          </div>
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-green-200/50 p-9 shadow-sm sticky top-24">
              <h3 className="font-display text-2xl font-bold text-green-950 mb-6">Contact Information</h3>
              <div className="space-y-4">
                {lead.phone && (
                  <a href={`tel:${lead.phone}`} onClick={onCallClick} className="flex items-center gap-4 text-green-800/60 hover:text-green-900 transition-colors p-3 rounded-xl hover:bg-green-50/60">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-700 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Phone size={20} className="text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-green-600/50 uppercase tracking-wider font-medium">Phone</p>
                      <p className="font-semibold text-green-950">{lead.phone}</p>
                    </div>
                  </a>
                )}
                {lead.email && (
                  <a href={`mailto:${lead.email}`} className="flex items-center gap-4 text-green-800/60 hover:text-green-900 transition-colors p-3 rounded-xl hover:bg-green-50/60">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-700 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Mail size={20} className="text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-green-600/50 uppercase tracking-wider font-medium">Email</p>
                      <p className="font-semibold text-green-950">{lead.email}</p>
                    </div>
                  </a>
                )}
                {lead.enrichedAddress && (
                  <div className="flex items-start gap-4 text-green-800/60 p-3 rounded-xl">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-700 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <MapPin size={20} className="text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-green-600/50 uppercase tracking-wider font-medium">Address</p>
                      <p className="font-semibold text-green-950">{lead.enrichedAddress}</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-8 pt-6 border-t border-green-100">
                <button onClick={onCTAClick} className="w-full bg-gradient-to-r from-green-700 to-emerald-600 text-white py-4 rounded-xl font-semibold text-lg hover:opacity-90 transition-all shadow-md">
                  {config.ctaText}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Testimonial Section ─── */}
      <section className="py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 rounded-full px-4 py-1.5 text-sm font-semibold mb-4 border border-green-200 shadow-sm">
            <Quote size={14} />
            What Our Customers Say
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-green-950 mb-12">Trusted by the Community</h2>
          <div className="bg-gradient-to-b from-green-50/60 to-white rounded-3xl border border-green-200/50 p-12 md:p-16 shadow-sm">
            <div className="flex justify-center mb-6 gap-1">
              {Array.from({ length: 5 }, (_, i) => (
                <Star key={i} size={28} className="text-amber-400 fill-current" />
              ))}
            </div>
            <p className="text-xl md:text-2xl text-green-900/70 leading-relaxed italic mb-8 font-light">
              &ldquo;{lead.companyName} did an outstanding job. They were professional from start to finish — showed up on time,
              communicated clearly throughout the project, and the quality of work exceeded our expectations.
              We wouldn&apos;t hesitate to recommend them to anyone looking for {industryLabel} services.&rdquo;
            </p>
            <div className="w-12 h-0.5 bg-green-300 mx-auto mb-4" />
            <p className="text-green-700/60 font-medium">— Satisfied Customer{location ? `, ${lead.city}` : ''}</p>
          </div>
        </div>
      </section>

      {/* ─── Photo Gallery ─── */}
      {photos.length > 0 && (
        <section className="py-24 px-4 sm:px-6 bg-green-50/40">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-white text-green-700 rounded-full px-4 py-1.5 text-sm font-semibold mb-4 border border-green-200 shadow-sm">
                Portfolio
              </div>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-green-950 mb-4">Our Recent Work</h2>
              <p className="text-green-800/50 text-lg">Quality craftsmanship you can see and feel.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.slice(0, 8).map((photo, i) => (
                <div key={i} className="group aspect-square bg-green-100 rounded-2xl overflow-hidden border border-green-200/50 card-lift">
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
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-700 to-emerald-600 flex items-center justify-center mx-auto mb-8 shadow-lg">
              <MapPin size={32} className="text-white" />
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-green-950 mb-6">Serving {location}</h2>
            <p className="text-green-800/60 text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
              {lead.companyName} is proud to serve homeowners and businesses in {lead.city} and the greater {lead.state} area.
              As local {industryLabel} professionals, we understand the unique needs of our community.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              {[
                { icon: Users, label: 'Locally Owned' },
                { icon: Clock, label: 'Prompt Service' },
                { icon: Shield, label: 'Fully Licensed' },
              ].map((item, i) => (
                <div key={i} className="inline-flex items-center gap-2.5 bg-green-50 border border-green-200 rounded-full px-6 py-3 shadow-sm">
                  <item.icon size={16} className="text-green-700" />
                  <span className="text-sm font-semibold text-green-800">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Final CTA ─── */}
      <section className="relative py-24 px-4 sm:px-6 bg-gradient-to-br from-green-800 to-emerald-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-noise opacity-5" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-emerald-400/10 rounded-full translate-y-1/3 -translate-x-1/4 blur-3xl" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">{wc?.closingHeadline || 'Ready to Get Started?'}</h2>
          <p className="text-xl text-white/75 mb-12 max-w-xl mx-auto leading-relaxed">
            {wc?.closingBody || `Contact ${lead.companyName} today for a free, no-obligation estimate. We're here to help with all your ${industryLabel} needs.`}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={`tel:${lead.phone}`}
              onClick={onCallClick}
              className="inline-flex items-center justify-center gap-2.5 bg-white text-green-900 px-10 py-4.5 rounded-xl font-bold text-lg hover:bg-green-50 transition-all shadow-xl hover:shadow-2xl"
            >
              <Phone size={20} />
              {lead.phone || 'Call Now'}
            </a>
            {lead.email && (
              <a
                href={`mailto:${lead.email}`}
                className="inline-flex items-center justify-center gap-2.5 bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white px-10 py-4.5 rounded-xl font-semibold text-lg hover:bg-white hover:text-green-900 transition-all"
              >
                <Mail size={20} />
                Email Us
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="bg-green-950 py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
            <div>
              <h3 className="font-display text-white font-bold text-xl mb-4">{lead.companyName}</h3>
              <p className="text-green-200/50 text-sm leading-relaxed">
                Your trusted {industryLabel} professionals{location ? ` in ${location}` : ''}.
                Licensed, insured, and committed to quality workmanship on every project.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Services</h4>
              <ul className="space-y-3 text-sm text-green-200/50">
                {services.slice(0, 4).map((s, i) => (
                  <li key={i} className="flex items-center gap-2 hover:text-white transition-colors">
                    <CheckCircle size={12} className="text-emerald-400" />
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
                {lead.phone && <p className="flex items-center gap-2.5 hover:text-white transition-colors"><Phone size={14} /> {lead.phone}</p>}
                {lead.email && <p className="flex items-center gap-2.5 hover:text-white transition-colors"><Mail size={14} /> {lead.email}</p>}
                {lead.enrichedAddress && <p className="flex items-center gap-2.5"><MapPin size={14} /> {lead.enrichedAddress}</p>}
              </div>
            </div>
          </div>
          <div className="border-t border-green-800/50 pt-10 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-green-200/40 text-sm">&copy; {new Date().getFullYear()} {lead.companyName}. All rights reserved.</p>
            {location && <p className="text-green-200/30 text-xs">Professional {industryLabel} services in {location}</p>}
          </div>
        </div>
      </footer>
    </div>
  )
}
