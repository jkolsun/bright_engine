import { Phone, MapPin, Star, Shield, Clock, Check, Award, Mail, Users, Heart, ArrowRight, CheckCircle } from 'lucide-react'
import type { TemplateProps } from '../config/template-types'
import DisclaimerBanner from '../shared/DisclaimerBanner'

export default function ClassicTemplate({ lead, config, onCTAClick, onCallClick }: TemplateProps) {
  const services = lead.enrichedServices || []
  const photos = lead.enrichedPhotos || []
  const industryLabel = lead.industry.toLowerCase().replace(/_/g, ' ')
  const location = [lead.city, lead.state].filter(Boolean).join(', ')
  const hasRating = lead.enrichedRating && lead.enrichedRating > 0

  return (
    <div className="min-h-screen bg-stone-50">
      <DisclaimerBanner variant="classic" companyName={lead.companyName} />

      {/* ─── Nav ─── */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-stone-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="text-lg font-bold text-stone-800">{lead.companyName}</span>
          <div className="flex items-center gap-3">
            {lead.phone && (
              <a href={`tel:${lead.phone}`} onClick={onCallClick} className="hidden sm:inline-flex items-center gap-2 text-sm text-stone-600 hover:text-stone-900 transition-colors">
                <Phone size={14} />
                {lead.phone}
              </a>
            )}
            <button onClick={onCTAClick} className={`bg-gradient-to-r ${config.gradient} text-white px-5 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity`}>
              Free Estimate
            </button>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className={`relative bg-gradient-to-br ${config.gradient} text-white py-24 md:py-32 px-4`}>
        <div className="max-w-6xl mx-auto text-center">
          {hasRating && (
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-2 mb-8">
              <div className="flex">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} size={16} className={i < Math.floor(lead.enrichedRating!) ? 'text-yellow-300 fill-current' : 'text-white/30'} />
                ))}
              </div>
              <span className="text-sm font-semibold">{lead.enrichedRating} Stars</span>
              {lead.enrichedReviews && <span className="text-sm text-white/70">from {lead.enrichedReviews} reviews</span>}
            </div>
          )}
          <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">{lead.companyName}</h1>
          <p className="text-xl md:text-2xl text-white/85 mb-4 max-w-2xl mx-auto">{config.tagline}</p>
          {location && (
            <p className="text-white/60 mb-10 flex items-center justify-center gap-1.5">
              <MapPin size={16} />
              Proudly serving {location} and surrounding areas
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={`tel:${lead.phone}`}
              onClick={onCallClick}
              className="inline-flex items-center justify-center gap-2 bg-white text-stone-900 px-10 py-4 rounded-lg font-bold text-lg hover:bg-stone-100 transition-colors shadow-lg"
            >
              <Phone size={20} />
              Call Now
            </a>
            <button
              onClick={onCTAClick}
              className="inline-flex items-center justify-center gap-2 border-2 border-white text-white px-10 py-4 rounded-lg font-semibold text-lg hover:bg-white hover:text-stone-900 transition-colors"
            >
              {config.ctaText}
            </button>
          </div>
        </div>
      </section>

      {/* ─── Why Choose Us ─── */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-stone-900 mb-3">Why Choose {lead.companyName}?</h2>
            <p className="text-stone-500 max-w-xl mx-auto">We&apos;ve built our reputation on three core values that guide every project we take on.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Shield, title: 'Licensed & Insured', desc: `Every member of our team is fully licensed and insured. You can trust ${lead.companyName} to protect your property and deliver professional results.` },
              { icon: Award, title: 'Proven Track Record', desc: `${hasRating ? `With a ${lead.enrichedRating}-star rating${lead.enrichedReviews ? ` across ${lead.enrichedReviews} reviews` : ''}, our` : 'Our'} customers consistently rate us among the top ${industryLabel} providers in the area.` },
              { icon: Heart, title: 'Customer First', desc: 'We treat your home like our own. From the first call to the final walkthrough, your satisfaction is our top priority — guaranteed.' },
            ].map((item, i) => (
              <div key={i} className="bg-stone-50 rounded-xl border border-stone-200 p-8 text-center hover:shadow-lg transition-shadow">
                <div className="w-16 h-16 rounded-full bg-white border-2 border-stone-200 flex items-center justify-center mx-auto mb-5">
                  <item.icon size={28} className="text-stone-700" />
                </div>
                <h3 className="text-xl font-bold text-stone-900 mb-3">{item.title}</h3>
                <p className="text-stone-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Services ─── */}
      {services.length > 0 && (
        <section className="py-20 px-4 bg-stone-50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <p className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-2">What We Do</p>
              <h2 className="text-3xl md:text-4xl font-bold text-stone-900 mb-3">Our Services</h2>
              <p className="text-stone-500 max-w-xl mx-auto">Comprehensive {industryLabel} solutions for residential and commercial properties.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {services.slice(0, 6).map((service, i) => (
                <div key={i} className="bg-white rounded-xl border border-stone-200 p-6 flex items-start gap-4 hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                    <Check size={20} className="text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-stone-900 mb-1">{service}</h3>
                    <p className="text-stone-500 text-sm leading-relaxed">Professional {service.toLowerCase()} services with quality materials and expert craftsmanship.</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── How We Work ─── */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-2">Our Process</p>
            <h2 className="text-3xl md:text-4xl font-bold text-stone-900 mb-3">How We Work</h2>
            <p className="text-stone-500">A straightforward process designed around your convenience.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              { step: '01', title: 'Schedule a Visit', desc: `Give us a call or fill out a quick form. We'll set up a convenient time to visit your property and discuss your ${industryLabel} needs.` },
              { step: '02', title: 'Get Your Estimate', desc: 'We provide a detailed, written estimate with no hidden fees. You\'ll know exactly what to expect before any work begins.' },
              { step: '03', title: 'Enjoy the Results', desc: `Our experienced crew handles your project from start to finish. We clean up after ourselves and make sure you're 100% satisfied.` },
            ].map((item) => (
              <div key={item.step} className="relative">
                <div className="text-5xl font-black text-stone-200 mb-4">{item.step}</div>
                <h3 className="text-xl font-bold text-stone-900 mb-3">{item.title}</h3>
                <p className="text-stone-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── About ─── */}
      <section className="py-20 px-4 bg-stone-50">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-12">
          <div className="lg:col-span-3">
            <p className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-2">About Us</p>
            <h2 className="text-3xl md:text-4xl font-bold text-stone-900 mb-6">A Name You Can Trust</h2>
            <div className="space-y-4 text-stone-600 leading-relaxed">
              <p>
                {lead.companyName} has been providing reliable {industryLabel} services
                {location ? ` to homeowners and businesses throughout ${location}` : ' to homeowners and businesses in the local area'}.
                We built this company on old-fashioned values: show up on time, do honest work, and stand behind every job.
              </p>
              <p>
                Our team brings years of hands-on experience to every project. Whether it&apos;s a small repair or a complete overhaul,
                we approach every job with the same level of care and professionalism. We use quality materials from trusted brands
                and follow industry best practices on every installation.
              </p>
              <p>
                As a locally owned and operated business, we understand the needs of our community. We&apos;re not a faceless corporation — we&apos;re
                your neighbors, and we treat every customer like family. That&apos;s why so many of our clients come back to us time and time again.
              </p>
            </div>
          </div>
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-stone-200 p-8 shadow-sm">
              <h3 className="text-xl font-bold text-stone-900 mb-6">Contact Information</h3>
              <div className="space-y-5">
                {lead.phone && (
                  <a href={`tel:${lead.phone}`} onClick={onCallClick} className="flex items-center gap-4 text-stone-600 hover:text-stone-900 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center flex-shrink-0">
                      <Phone size={18} className="text-stone-600" />
                    </div>
                    <div>
                      <p className="text-xs text-stone-400 uppercase tracking-wider">Phone</p>
                      <p className="font-semibold">{lead.phone}</p>
                    </div>
                  </a>
                )}
                {lead.email && (
                  <a href={`mailto:${lead.email}`} className="flex items-center gap-4 text-stone-600 hover:text-stone-900 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center flex-shrink-0">
                      <Mail size={18} className="text-stone-600" />
                    </div>
                    <div>
                      <p className="text-xs text-stone-400 uppercase tracking-wider">Email</p>
                      <p className="font-semibold">{lead.email}</p>
                    </div>
                  </a>
                )}
                {lead.enrichedAddress && (
                  <div className="flex items-start gap-4 text-stone-600">
                    <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center flex-shrink-0">
                      <MapPin size={18} className="text-stone-600" />
                    </div>
                    <div>
                      <p className="text-xs text-stone-400 uppercase tracking-wider">Address</p>
                      <p className="font-semibold">{lead.enrichedAddress}</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-6 pt-6 border-t border-stone-100">
                <button onClick={onCTAClick} className={`w-full bg-gradient-to-r ${config.gradient} text-white py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity`}>
                  {config.ctaText}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Testimonial Section ─── */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-2">What Our Customers Say</p>
          <h2 className="text-3xl md:text-4xl font-bold text-stone-900 mb-10">Trusted by the Community</h2>
          <div className="bg-stone-50 rounded-2xl border border-stone-200 p-10 md:p-12">
            <div className="flex justify-center mb-4">
              {Array.from({ length: 5 }, (_, i) => (
                <Star key={i} size={24} className="text-yellow-500 fill-current" />
              ))}
            </div>
            <p className="text-xl text-stone-700 leading-relaxed italic mb-6">
              &ldquo;{lead.companyName} did an outstanding job. They were professional from start to finish — showed up on time,
              communicated clearly throughout the project, and the quality of work exceeded our expectations.
              We wouldn&apos;t hesitate to recommend them to anyone looking for {industryLabel} services.&rdquo;
            </p>
            <p className="text-stone-500 font-medium">— Satisfied Customer{location ? `, ${lead.city}` : ''}</p>
          </div>
        </div>
      </section>

      {/* ─── Photo Gallery ─── */}
      {photos.length > 0 && (
        <section className="py-20 px-4 bg-stone-50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <p className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-2">Portfolio</p>
              <h2 className="text-3xl md:text-4xl font-bold text-stone-900 mb-3">Our Recent Work</h2>
              <p className="text-stone-500">Quality craftsmanship you can see and feel.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.slice(0, 8).map((photo, i) => (
                <div key={i} className="group aspect-square bg-stone-200 rounded-xl overflow-hidden border border-stone-200 hover:shadow-lg transition-shadow">
                  <img src={photo} alt={`${lead.companyName} project ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Service Area ─── */}
      {location && (
        <section className="py-20 px-4 bg-white">
          <div className="max-w-4xl mx-auto text-center">
            <div className="w-16 h-16 rounded-full bg-stone-100 border-2 border-stone-200 flex items-center justify-center mx-auto mb-6">
              <MapPin size={28} className="text-stone-700" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-stone-900 mb-4">Serving {location}</h2>
            <p className="text-stone-600 text-lg max-w-2xl mx-auto mb-8">
              {lead.companyName} is proud to serve homeowners and businesses in {lead.city} and the greater {lead.state} area.
              As local {industryLabel} professionals, we understand the unique needs of our community.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                { icon: Users, label: 'Locally Owned' },
                { icon: Clock, label: 'Prompt Service' },
                { icon: Shield, label: 'Fully Licensed' },
              ].map((item, i) => (
                <div key={i} className="inline-flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-full px-5 py-2.5">
                  <item.icon size={16} className="text-stone-600" />
                  <span className="text-sm font-medium text-stone-700">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Final CTA ─── */}
      <section className={`py-20 px-4 bg-gradient-to-br ${config.gradient} text-white`}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl text-white/80 mb-10 max-w-xl mx-auto">
            Contact {lead.companyName} today for a free, no-obligation estimate. We&apos;re here to help with all your {industryLabel} needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={`tel:${lead.phone}`}
              onClick={onCallClick}
              className="inline-flex items-center justify-center gap-2 bg-white text-stone-900 px-10 py-4 rounded-lg font-bold text-lg hover:bg-stone-100 transition-colors shadow-lg"
            >
              <Phone size={20} />
              {lead.phone || 'Call Now'}
            </a>
            {lead.email && (
              <a
                href={`mailto:${lead.email}`}
                className="inline-flex items-center justify-center gap-2 border-2 border-white text-white px-10 py-4 rounded-lg font-semibold text-lg hover:bg-white hover:text-stone-900 transition-colors"
              >
                <Mail size={20} />
                Email Us
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="bg-stone-900 py-14 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
            <div>
              <h3 className="text-white font-bold text-lg mb-3">{lead.companyName}</h3>
              <p className="text-stone-400 text-sm leading-relaxed">
                Your trusted {industryLabel} professionals{location ? ` in ${location}` : ''}.
                Licensed, insured, and committed to quality workmanship on every project.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Services</h4>
              <ul className="space-y-2 text-sm text-stone-400">
                {services.slice(0, 4).map((s, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <CheckCircle size={12} className="text-green-500" />
                    {s}
                  </li>
                ))}
                {services.length === 0 && (
                  <li>Professional {industryLabel} services</li>
                )}
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Contact</h4>
              <div className="space-y-2 text-sm text-stone-400">
                {lead.phone && <p className="flex items-center gap-2"><Phone size={14} /> {lead.phone}</p>}
                {lead.email && <p className="flex items-center gap-2"><Mail size={14} /> {lead.email}</p>}
                {lead.enrichedAddress && <p className="flex items-center gap-2"><MapPin size={14} /> {lead.enrichedAddress}</p>}
              </div>
            </div>
          </div>
          <div className="border-t border-stone-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-stone-500 text-sm">&copy; {new Date().getFullYear()} {lead.companyName}. All rights reserved.</p>
            {location && <p className="text-stone-600 text-xs">Professional {industryLabel} services in {location}</p>}
          </div>
        </div>
      </footer>
    </div>
  )
}
