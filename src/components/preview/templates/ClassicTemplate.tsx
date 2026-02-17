import { Phone, MapPin } from 'lucide-react'
import type { TemplateProps } from '../config/template-types'
import DisclaimerBanner from '../shared/DisclaimerBanner'
import SocialProof from '../shared/SocialProof'
import ServiceShowcase from '../shared/ServiceShowcase'
import PhotoGallery from '../shared/PhotoGallery'
import ContactCTA from '../shared/ContactCTA'
import PreviewFooter from '../shared/PreviewFooter'

export default function ClassicTemplate({ lead, config, onCTAClick, onCallClick }: TemplateProps) {
  const services = lead.enrichedServices || []
  const photos = lead.enrichedPhotos || []

  return (
    <div className="min-h-screen bg-stone-50">
      <DisclaimerBanner variant="classic" companyName={lead.companyName} />

      {/* Hero */}
      <section className={`relative bg-gradient-to-br ${config.gradient} text-white py-20 px-4`}>
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{lead.companyName}</h1>
          <p className="text-xl md:text-2xl text-white/80 mb-4">{config.tagline}</p>

          {/* Trust badges inline in hero */}
          {lead.enrichedRating && (
            <p className="text-white/70 mb-8">
              &#9733; {lead.enrichedRating} Stars
              {lead.enrichedReviews ? ` from ${lead.enrichedReviews} reviews` : ''}
              {lead.city ? ` \u2022 Serving ${lead.city}` : ''}
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={`tel:${lead.phone}`}
              onClick={onCallClick}
              className="inline-flex items-center justify-center gap-2 bg-white text-gray-900 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors"
            >
              <Phone size={20} />
              Call Now
            </a>
            <button
              onClick={onCTAClick}
              className="inline-flex items-center justify-center gap-2 border-2 border-white text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white hover:text-gray-900 transition-colors"
            >
              {config.ctaText}
            </button>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10">
          <div>
            <h2 className="text-3xl font-bold text-stone-900 mb-4">About {lead.companyName}</h2>
            <p className="text-stone-700 mb-4">
              {lead.companyName} is a trusted {lead.industry.toLowerCase().replace(/_/g, ' ')} company
              {lead.city ? ` serving ${lead.city} and the surrounding areas` : ''}. We pride ourselves on quality workmanship,
              exceptional customer service, and fair pricing.
            </p>
            <p className="text-stone-700">
              Our experienced team is ready to help with all your {lead.industry.toLowerCase().replace(/_/g, ' ')} needs.
              Contact us today for a free estimate.
            </p>
          </div>
          <div className="space-y-4">
            {lead.phone && (
              <div className="flex items-center gap-3 text-stone-700">
                <Phone size={20} />
                <a href={`tel:${lead.phone}`} onClick={onCallClick} className="hover:text-stone-900 font-medium">{lead.phone}</a>
              </div>
            )}
            {lead.enrichedAddress && (
              <div className="flex items-start gap-3 text-stone-700">
                <MapPin size={20} className="mt-0.5" />
                <span>{lead.enrichedAddress}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <SocialProof variant="classic" rating={lead.enrichedRating} reviewCount={lead.enrichedReviews} city={lead.city} state={lead.state} />
      <ServiceShowcase variant="classic" services={services} />
      <PhotoGallery variant="classic" photos={photos} companyName={lead.companyName} />
      <ContactCTA variant="classic" phone={lead.phone} email={lead.email} ctaText={config.ctaText} gradient={config.gradient} onCTAClick={onCTAClick} onCallClick={onCallClick} />
      <PreviewFooter variant="classic" companyName={lead.companyName} city={lead.city} state={lead.state} industry={lead.industry} />
    </div>
  )
}
