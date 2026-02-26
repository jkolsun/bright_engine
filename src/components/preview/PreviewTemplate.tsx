'use client'

import { useCallback, useState, useEffect } from 'react'
import { getAllIndustryVariants } from './config/industry-mapping'
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
import PreviewQAChecker from './shared/PreviewQAChecker'
import TemplateSwitcher from './shared/TemplateSwitcher'

/** Detect if a string is a raw placeholder label leaked from the AI parser */
function isPlaceholder(text: string): boolean {
  const t = text.trim()
  return /^(VP[0-9]_|ABOUT_P[0-9]|HERO_|CLOSING_|SVC_|TESTIMONIAL_|YEARS_|SERVICE_AREA|PROCESS_STEP_|WHY_[0-9]|BRAND_[0-9])/i.test(t)
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
    processSteps: wc.processSteps?.map(s => ({
      title: cleanField(s.title) || s.title,
      description: cleanField(s.description),
    })).filter(s => s.title && !isPlaceholder(s.title)),
    whyChooseUs: wc.whyChooseUs?.map(w => ({
      title: cleanField(w.title) || w.title,
      description: cleanField(w.description),
    })).filter(w => w.title && !isPlaceholder(w.title)),
    brandNames: wc.brandNames?.filter(b => b && !isPlaceholder(b)).map(b => cleanField(b) || b),
    additionalTestimonials: wc.additionalTestimonials?.map(t => ({
      quote: cleanField(t.quote) || t.quote,
      author: cleanField(t.author) || t.author,
    })).filter(t => t.quote && !isPlaceholder(t.quote)),
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

  // Get ALL variants for this industry
  const { configs: allVariants, defaultIndex } = getAllIndustryVariants(typedLead.industry, typedLead.companyName)

  // Template switching state
  const [activeIndex, setActiveIndex] = useState(defaultIndex)
  const [fading, setFading] = useState(false)

  // Restore persisted choice on mount
  useEffect(() => {
    if (!typedLead.previewId) return
    try {
      const saved = localStorage.getItem(`template_choice_${typedLead.previewId}`)
      if (saved !== null) {
        const idx = parseInt(saved, 10)
        if (idx >= 0 && idx < allVariants.length) {
          setActiveIndex(idx)
        }
      }
    } catch {}
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Expose active template name for CTA banner to read
  useEffect(() => {
    (window as any).__brightSelectedTemplate = allVariants[activeIndex]?.template
  }, [activeIndex, allVariants])

  // Apply colorPrefs override to whichever variant is active
  const baseConfig = allVariants[activeIndex]
  const cp = typedLead.colorPrefs
  const config = cp
    ? { ...baseConfig, primaryHex: cp.primary, secondaryHex: cp.secondary, accentHex: cp.accent || cp.primary }
    : baseConfig

  const handleSwitch = useCallback((index: number) => {
    if (index === activeIndex) return
    setFading(true)
    setTimeout(() => {
      setActiveIndex(index)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      setFading(false)
      // Persist choice
      try {
        localStorage.setItem(`template_choice_${typedLead.previewId}`, String(index))
      } catch {}
      // Track the switch
      fetch('/api/preview/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          previewId: typedLead.previewId,
          event: 'template_switch',
          metadata: { from: allVariants[activeIndex]?.template, to: allVariants[index]?.template },
        }),
      }).catch(() => {})
    }, 200)
  }, [activeIndex, allVariants, typedLead.previewId])

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

  let template: React.ReactNode
  switch (config.template) {
    case 'modern':    template = <ModernTemplate {...props} />; break
    case 'modern-b':  template = <ModernBTemplate {...props} />; break
    case 'bold':      template = <BoldTemplate {...props} />; break
    case 'bold-b':    template = <BoldBTemplate {...props} />; break
    case 'classic-b': template = <ClassicBTemplate {...props} />; break
    case 'premium':   template = <PremiumTemplate {...props} />; break
    case 'premium-b': template = <PremiumBTemplate {...props} />; break
    case 'premium-c': template = <PremiumCTemplate {...props} />; break
    case 'classic':
    default:          template = <ClassicTemplate {...props} />; break
  }

  return (
    <>
      <div style={{ opacity: fading ? 0 : 1, transition: 'opacity 200ms ease-in-out' }}>
        {template}
      </div>
      <PreviewQAChecker lead={lead} websiteCopy={cleanCopy} />
      {allVariants.length > 1 && (
        <TemplateSwitcher
          variants={allVariants}
          activeIndex={activeIndex}
          onSwitch={handleSwitch}
        />
      )}
    </>
  )
}
