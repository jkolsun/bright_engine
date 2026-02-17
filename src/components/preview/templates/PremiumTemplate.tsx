import { Phone, MapPin } from 'lucide-react'
import type { TemplateProps } from '../config/template-types'
import DisclaimerBanner from '../shared/DisclaimerBanner'
import SocialProof from '../shared/SocialProof'
import ServiceShowcase from '../shared/ServiceShowcase'
import PhotoGallery from '../shared/PhotoGallery'
import ContactCTA from '../shared/ContactCTA'
import PreviewFooter from '../shared/PreviewFooter'

export default function PremiumTemplate({ lead, config, onCTAClick, onCallClick }: TemplateProps) {
  const services = lead.enrichedServices || []
  const photos = lead.enrichedPhotos || []

  return (
    <div className="min-h-screen bg-gray-950">
      <DisclaimerBanner variant="premium" companyName={lead.companyName} />

      {/* Hero — elegant dark with gold accents */}
      <section className={`relative bg-gradient-to-br ${config.gradient} px-4`}>
        <div className="max-w-6xl mx-auto py-24 md:py-32">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* Left — company name */}
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-amber-400/60 mb-4">Welcome to</p>
              <h1 className="text-4xl md:text-5xl font-light text-white mb-4 tracking-tight leading-tight">
                {lead.companyName}
              </h1>
              <div className="w-12 h-0.5 bg-amber-500 mb-6" />
              {lead.city && (
                <p className="text-gray-400">Serving {lead.city}{lead.state ? `, ${lead.state}` : ''}</p>
              )}
            </div>

            {/* Right — tagline + CTA */}
            <div className="border border-amber-500/20 rounded-lg p-8 bg-gray-950/50 backdrop-blur-sm">
              <p className="text-lg text-gray-300 mb-6">{config.tagline}</p>
              <div className="flex flex-col gap-3">
                <a
                  href={`tel:${lead.phone}`}
                  onClick={onCallClick}
                  className="inline-flex items-center justify-center gap-2 bg-amber-500 text-black px-6 py-3 rounded-lg font-semibold hover:bg-amber-400 transition-colors"
                >
                  <Phone size={18} />
                  Call Now
                </a>
                <button
                  onClick={onCTAClick}
                  className="inline-flex items-center justify-center gap-2 border border-amber-500/50 text-amber-400 px-6 py-3 rounded-lg font-semibold hover:bg-amber-500 hover:text-black transition-colors"
                >
                  {config.ctaText}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SocialProof variant="premium" rating={lead.enrichedRating} reviewCount={lead.enrichedReviews} city={lead.city} state={lead.state} />
      <ServiceShowcase variant="premium" services={services} />

      {/* About */}
      <section className="py-16 px-4 bg-gray-950">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <p className="text-sm uppercase tracking-widest text-amber-400/70 mb-2">About</p>
            <h2 className="text-3xl font-light text-white mb-6">{lead.companyName}</h2>
            <p className="text-gray-400 leading-relaxed mb-4">
              {lead.companyName} is a trusted {lead.industry.toLowerCase().replace(/_/g, ' ')} firm
              {lead.city ? ` serving ${lead.city} and the surrounding areas` : ''}. We pride ourselves on quality,
              exceptional client service, and delivering results.
            </p>
            <p className="text-gray-400 leading-relaxed">
              Our experienced team is ready to assist with all your {lead.industry.toLowerCase().replace(/_/g, ' ')} needs.
              Reach out today for a consultation.
            </p>
          </div>
          <div className="space-y-4 flex flex-col justify-center">
            {lead.phone && (
              <div className="flex items-center gap-3 text-gray-400">
                <Phone size={18} className="text-amber-500/50" />
                <a href={`tel:${lead.phone}`} onClick={onCallClick} className="hover:text-white transition-colors">{lead.phone}</a>
              </div>
            )}
            {lead.enrichedAddress && (
              <div className="flex items-start gap-3 text-gray-400">
                <MapPin size={18} className="text-amber-500/50 mt-0.5" />
                <span>{lead.enrichedAddress}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <PhotoGallery variant="premium" photos={photos} companyName={lead.companyName} />
      <ContactCTA variant="premium" phone={lead.phone} email={lead.email} ctaText={config.ctaText} gradient={config.gradient} onCTAClick={onCTAClick} onCallClick={onCallClick} />
      <PreviewFooter variant="premium" companyName={lead.companyName} city={lead.city} state={lead.state} industry={lead.industry} />
    </div>
  )
}
