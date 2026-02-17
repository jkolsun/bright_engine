import { Phone, MapPin } from 'lucide-react'
import type { TemplateProps } from '../config/template-types'
import DisclaimerBanner from '../shared/DisclaimerBanner'
import SocialProof from '../shared/SocialProof'
import ServiceShowcase from '../shared/ServiceShowcase'
import PhotoGallery from '../shared/PhotoGallery'
import ContactCTA from '../shared/ContactCTA'
import PreviewFooter from '../shared/PreviewFooter'

export default function ModernTemplate({ lead, config, onCTAClick, onCallClick }: TemplateProps) {
  const services = lead.enrichedServices || []
  const photos = lead.enrichedPhotos || []

  return (
    <div className="min-h-screen bg-white">
      <DisclaimerBanner variant="modern" companyName={lead.companyName} />

      {/* Hero — clean white with subtle accent */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-light text-gray-900 mb-4 tracking-tight">
            {lead.companyName}
          </h1>
          <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto mb-6 rounded-full" />
          <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">{config.tagline}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={`tel:${lead.phone}`}
              onClick={onCallClick}
              className="inline-flex items-center justify-center gap-2 bg-gray-900 text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-gray-800 transition-colors"
            >
              <Phone size={20} />
              Call Now
            </a>
            <button
              onClick={onCTAClick}
              className="inline-flex items-center justify-center gap-2 border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-full font-semibold text-lg hover:border-gray-900 hover:text-gray-900 transition-colors"
            >
              {config.ctaText}
            </button>
          </div>
        </div>
      </section>

      <SocialProof variant="modern" rating={lead.enrichedRating} reviewCount={lead.enrichedReviews} city={lead.city} state={lead.state} />
      <ServiceShowcase variant="modern" services={services} />

      {/* About */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">About Us</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              {lead.companyName} is a trusted {lead.industry.toLowerCase().replace(/_/g, ' ')} company
              {lead.city ? ` serving ${lead.city} and the surrounding areas` : ''}. We pride ourselves on quality workmanship,
              exceptional customer service, and fair pricing.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Our experienced team is ready to help with all your {lead.industry.toLowerCase().replace(/_/g, ' ')} needs.
              Contact us today for a free estimate.
            </p>
          </div>
          <div className="space-y-4 flex flex-col justify-center">
            {lead.phone && (
              <div className="flex items-center gap-3 text-gray-600">
                <Phone size={18} className="text-gray-400" />
                <a href={`tel:${lead.phone}`} onClick={onCallClick} className="hover:text-gray-900">{lead.phone}</a>
              </div>
            )}
            {lead.enrichedAddress && (
              <div className="flex items-start gap-3 text-gray-600">
                <MapPin size={18} className="text-gray-400 mt-0.5" />
                <span>{lead.enrichedAddress}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <PhotoGallery variant="modern" photos={photos} companyName={lead.companyName} />
      <ContactCTA variant="modern" phone={lead.phone} email={lead.email} ctaText={config.ctaText} gradient={config.gradient} onCTAClick={onCTAClick} onCallClick={onCallClick} />
      <PreviewFooter variant="modern" companyName={lead.companyName} city={lead.city} state={lead.state} industry={lead.industry} />
    </div>
  )
}
