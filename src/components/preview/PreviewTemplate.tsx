'use client'

import { useCallback } from 'react'
import { getIndustryConfig } from './config/industry-mapping'
import type { PreviewLead, WebsiteCopy } from './config/template-types'
import ModernTemplate from './templates/ModernTemplate'
import ModernBTemplate from './templates/ModernBTemplate'
import BoldTemplate from './templates/BoldTemplate'
import BoldBTemplate from './templates/BoldBTemplate'
import ClassicTemplate from './templates/ClassicTemplate'
import ClassicBTemplate from './templates/ClassicBTemplate'
import PremiumTemplate from './templates/PremiumTemplate'
import PremiumBTemplate from './templates/PremiumBTemplate'
import PremiumCTemplate from './templates/PremiumCTemplate'

export default function PreviewTemplate({ lead, websiteCopy }: { lead: any; websiteCopy?: WebsiteCopy }) {
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

  const config = getIndustryConfig(typedLead.industry, typedLead.companyName)

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

  const props = { lead: typedLead, config, onCTAClick, onCallClick, websiteCopy }

  switch (config.template) {
    case 'modern':    return <ModernTemplate {...props} />
    case 'modern-b':  return <ModernBTemplate {...props} />
    case 'bold':      return <BoldTemplate {...props} />
    case 'bold-b':    return <BoldBTemplate {...props} />
    case 'classic-b': return <ClassicBTemplate {...props} />
    case 'premium':   return <PremiumTemplate {...props} />
    case 'premium-b': return <PremiumBTemplate {...props} />
    case 'premium-c': return <PremiumCTemplate {...props} />
    case 'classic':
    default:          return <ClassicTemplate {...props} />
  }
}
