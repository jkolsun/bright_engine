'use client'

import { useState } from 'react'
import { Phone, Mail, MapPin, Star, Clock } from 'lucide-react'

export default function PreviewTemplate({ lead }: { lead: any }) {
  const [showBanner] = useState(true)

  const handleCTAClick = async () => {
    await fetch('/api/preview/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        previewId: lead.previewId,
        event: 'cta_click',
      })
    })
  }

  const handleCallClick = async () => {
    await fetch('/api/preview/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        previewId: lead.previewId,
        event: 'call_click',
      })
    })
  }

  const services = lead.enrichedServices || lead.services || []
  const photos = lead.enrichedPhotos || lead.photos || []
  const hours = lead.enrichedHours || lead.hours

  return (
    <div className="min-h-screen bg-white">
      {/* Preview Banner */}
      {showBanner && (
        <div className="bg-blue-600 text-white py-3 px-4 text-center sticky top-0 z-50 shadow-lg">
          <p className="text-sm font-medium">
            Preview of your new website • <span className="font-bold">$149 to go live</span> • Expires in 7 days
          </p>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 to-blue-800 text-white py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {lead.companyName}
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 mb-8">
            Professional {lead.industry.toLowerCase().replace('_', ' ')} services in {lead.city}, {lead.state}
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href={`tel:${lead.phone}`}
              onClick={handleCallClick}
              className="inline-flex items-center justify-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-50 transition-colors"
            >
              <Phone size={20} />
              Call Now
            </a>
            <button
              onClick={handleCTAClick}
              className="inline-flex items-center justify-center gap-2 border-2 border-white text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white hover:text-blue-600 transition-colors"
            >
              Get Free Quote
            </button>
          </div>
        </div>
      </section>

      {/* Services Section */}
      {services.length > 0 && (
        <section className="py-16 px-4 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Our Services</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.slice(0, 6).map((service: string, index: number) => (
                <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">{service}</h3>
                  <p className="text-gray-600 text-sm">Professional and reliable service</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* About Section */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">About {lead.companyName}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <p className="text-gray-700 mb-4">
                {lead.companyName} is a trusted {lead.industry.toLowerCase().replace('_', ' ')} company 
                serving {lead.city} and the surrounding areas. We pride ourselves on quality workmanship, 
                exceptional customer service, and fair pricing.
              </p>
              <p className="text-gray-700">
                Our experienced team is ready to help with all your {lead.industry.toLowerCase().replace('_', ' ')} needs. 
                Contact us today for a free estimate.
              </p>
            </div>
            <div className="space-y-4">
              {lead.enrichedRating && (
                <div className="flex items-center gap-2">
                  <Star className="text-yellow-500 fill-current" size={20} />
                  <span className="font-semibold">{lead.enrichedRating} Stars</span>
                  {lead.enrichedReviews && (
                    <span className="text-gray-600">({lead.enrichedReviews} reviews)</span>
                  )}
                </div>
              )}
              {lead.phone && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Phone size={20} />
                  <a href={`tel:${lead.phone}`} onClick={handleCallClick} className="hover:text-blue-600">
                    {lead.phone}
                  </a>
                </div>
              )}
              {lead.enrichedAddress && (
                <div className="flex items-start gap-2 text-gray-700">
                  <MapPin size={20} className="mt-0.5" />
                  <span>{lead.enrichedAddress}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Photos Section */}
      {photos.length > 0 && (
        <section className="py-16 px-4 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Our Work</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.slice(0, 8).map((photo: string, index: number) => (
                <div key={index} className="aspect-square bg-gray-200 rounded-lg overflow-hidden">
                  <img 
                    src={photo} 
                    alt={`${lead.companyName} work`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Contact Section */}
      <section className="py-16 px-4 bg-blue-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl text-blue-100 mb-8">
            Contact us today for a free estimate on your project
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={`tel:${lead.phone}`}
              onClick={handleCallClick}
              className="inline-flex items-center justify-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-50 transition-colors"
            >
              <Phone size={20} />
              {lead.phone}
            </a>
            {lead.email && (
              <a
                href={`mailto:${lead.email}`}
                className="inline-flex items-center justify-center gap-2 border-2 border-white text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white hover:text-blue-600 transition-colors"
              >
                <Mail size={20} />
                Email Us
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-8 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <p className="mb-2">© {new Date().getFullYear()} {lead.companyName}. All rights reserved.</p>
          <p className="text-sm text-gray-400">
            {lead.city}, {lead.state} • Professional {lead.industry.toLowerCase().replace('_', ' ')} services
          </p>
        </div>
      </footer>
    </div>
  )
}
