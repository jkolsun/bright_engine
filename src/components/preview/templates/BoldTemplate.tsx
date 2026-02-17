import { Phone, MapPin } from 'lucide-react'
import type { TemplateProps } from '../config/template-types'
import DisclaimerBanner from '../shared/DisclaimerBanner'
import SocialProof from '../shared/SocialProof'
import ServiceShowcase from '../shared/ServiceShowcase'
import PhotoGallery from '../shared/PhotoGallery'
import ContactCTA from '../shared/ContactCTA'
import PreviewFooter from '../shared/PreviewFooter'

export default function BoldTemplate({ lead, config, onCTAClick, onCallClick }: TemplateProps) {
  const services = lead.enrichedServices || []
  const photos = lead.enrichedPhotos || []

  return (
    <div className="min-h-screen bg-gray-950">
      <DisclaimerBanner variant="bold" companyName={lead.companyName} />

      {/* Hero — dramatic full-bleed dark gradient */}
      <section className={`relative min-h-[60vh] flex items-center bg-gradient-to-br ${config.gradient} px-4`}>
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative max-w-6xl mx-auto w-full py-20">
          <h1 className="text-5xl md:text-7xl font-black text-white mb-4 tracking-tight leading-tight">
            {lead.companyName}
          </h1>
          <p className="text-xl md:text-2xl text-white/70 mb-10 max-w-2xl">{config.tagline}</p>
          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href={`tel:${lead.phone}`}
              onClick={onCallClick}
              className="inline-flex items-center justify-center gap-2 bg-white text-gray-900 px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition-colors"
            >
              <Phone size={20} />
              Call Now
            </a>
            <button
              onClick={onCTAClick}
              className="inline-flex items-center justify-center gap-2 border-2 border-white text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-white hover:text-gray-900 transition-colors"
            >
              {config.ctaText}
            </button>
          </div>
        </div>
      </section>

      <SocialProof variant="bold" rating={lead.enrichedRating} reviewCount={lead.enrichedReviews} city={lead.city} state={lead.state} />
      <ServiceShowcase variant="bold" services={services} />

      {/* About */}
      <section className="py-16 px-4 bg-gray-950">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10">
          <div>
            <h2 className="text-3xl font-bold text-white mb-4">About {lead.companyName}</h2>
            <p className="text-gray-400 mb-4">
              {lead.companyName} is a trusted {lead.industry.toLowerCase().replace(/_/g, ' ')} company
              {lead.city ? ` serving ${lead.city} and the surrounding areas` : ''}. We pride ourselves on quality workmanship,
              exceptional customer service, and fair pricing.
            </p>
            <p className="text-gray-400">
              Our experienced team is ready to help with all your {lead.industry.toLowerCase().replace(/_/g, ' ')} needs.
              Contact us today for a free estimate.
            </p>
          </div>
          <div className="space-y-4 flex flex-col justify-center">
            {lead.phone && (
              <div className="flex items-center gap-3 text-gray-300">
                <Phone size={20} className="text-gray-500" />
                <a href={`tel:${lead.phone}`} onClick={onCallClick} className="hover:text-white">{lead.phone}</a>
              </div>
            )}
            {lead.enrichedAddress && (
              <div className="flex items-start gap-3 text-gray-300">
                <MapPin size={20} className="text-gray-500 mt-0.5" />
                <span>{lead.enrichedAddress}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <PhotoGallery variant="bold" photos={photos} companyName={lead.companyName} />
      <ContactCTA variant="bold" phone={lead.phone} email={lead.email} ctaText={config.ctaText} gradient={config.gradient} onCTAClick={onCTAClick} onCallClick={onCallClick} />
      <PreviewFooter variant="bold" companyName={lead.companyName} city={lead.city} state={lead.state} industry={lead.industry} />
    </div>
  )
}
