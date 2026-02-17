'use client'

import { useCallback } from 'react'
import { getIndustryConfig } from './config/industry-mapping'
import type { PreviewLead } from './config/template-types'
import ModernTemplate from './templates/ModernTemplate'
import BoldTemplate from './templates/BoldTemplate'
import ClassicTemplate from './templates/ClassicTemplate'
import PremiumTemplate from './templates/PremiumTemplate'

export default function PreviewTemplate({ lead }: { lead: any }) {
  // Map the raw lead prop to the typed interface
  const typedLead: PreviewLead = {
    companyName: lead.companyName || '',
    industry: lead.industry || 'GENERAL_CONTRACTING',
    city: lead.city || '',
    state: lead.state || '',
    phone: lead.phone || '',
    email: lead.email || '',
    website: lead.website || '',
    previewId: lead.previewId || '',
    enrichedRating: lead.enrichedRating,
    enrichedReviews: lead.enrichedReviews,
    enrichedAddress: lead.enrichedAddress,
    enrichedServices: lead.enrichedServices || lead.services || [],
    enrichedPhotos: lead.enrichedPhotos || lead.photos || [],
    logo: lead.logo,
  }

  const config = getIndustryConfig(typedLead.industry)

  const onCTAClick = useCallback(async () => {
    await fetch('/api/preview/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ previewId: typedLead.previewId, event: 'cta_click' }),
    })
  }, [typedLead.previewId])

  const onCallClick = useCallback(async () => {
    await fetch('/api/preview/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ previewId: typedLead.previewId, event: 'call_click' }),
    })
  }, [typedLead.previewId])

  const props = { lead: typedLead, config, onCTAClick, onCallClick }

  switch (config.template) {
    case 'modern':  return <ModernTemplate {...props} />
    case 'bold':    return <BoldTemplate {...props} />
    case 'premium': return <PremiumTemplate {...props} />
    case 'classic':
    default:        return <ClassicTemplate {...props} />
  }
}
