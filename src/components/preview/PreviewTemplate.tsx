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

/** Detect if a string is a raw placeholder label leaked from the AI parser */
function isPlaceholder(text: string): boolean {
  const t = text.trim()
  return /^(VP[0-9]_|ABOUT_P[0-9]|HERO_|CLOSING_|SVC_|TESTIMONIAL_|YEARS_|SERVICE_AREA)/i.test(t)
}

/** Strip leading "LABEL:" prefix that may have leaked through parsing */
function cleanField(text: string | undefined): string {
  if (!text) return ''
  if (isPlaceholder(text)) return ''
  // Strip any leading LABEL: prefix (e.g. "ABOUT_P1: actual text here")
  const stripped = text.replace(/^[A-Z][A-Z0-9_]+:\s*/, '')
  if (isPlaceholder(stripped)) return ''
  return stripped
}

/** Sanitize websiteCopy to remove any raw placeholder labels from AI output */
function sanitizeWebsiteCopy(wc?: WebsiteCopy): WebsiteCopy | undefined {
  if (!wc) return undefined
  return {
    ...wc,
    heroHeadline: cleanField(wc.heroHeadline) || wc.heroHeadline,
    heroSubheadline: cleanField(wc.heroSubheadline) || wc.heroSubheadline,
    aboutParagraph1: cleanField(wc.aboutParagraph1),
    aboutParagraph2: cleanField(wc.aboutParagraph2),
    closingHeadline: cleanField(wc.closingHeadline),
    closingBody: cleanField(wc.closingBody),
    testimonialQuote: cleanField(wc.testimonialQuote) || undefined,
    testimonialAuthor: cleanField(wc.testimonialAuthor) || undefined,
    yearsBadge: cleanField(wc.yearsBadge) || undefined,
    serviceAreaText: cleanField(wc.serviceAreaText) || undefined,
    valueProps: wc.valueProps?.map(vp => ({
      title: cleanField(vp.title) || vp.title,
      description: cleanField(vp.description),
    })).filter(vp => vp.title && !isPlaceholder(vp.title)),
    serviceDescriptions: Object.fromEntries(
      Object.entries(wc.serviceDescriptions || {}).map(([k, v]) => [k, cleanField(v)])
        .filter(([, v]) => v)
    ),
  }
}

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
    colorPrefs: lead.colorPrefs || undefined,
  }

  // Get base config from industry mapping, then override with client colors if present
  const baseConfig = getIndustryConfig(typedLead.industry, typedLead.companyName)
  const cp = typedLead.colorPrefs
  const config = cp
    ? { ...baseConfig, primaryHex: cp.primary, secondaryHex: cp.secondary, accentHex: cp.accent || cp.primary }
    : baseConfig

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

  const cleanCopy = sanitizeWebsiteCopy(websiteCopy)
  const props = { lead: typedLead, config, onCTAClick, onCallClick, websiteCopy: cleanCopy }

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
