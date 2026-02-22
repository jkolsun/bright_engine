export type TemplateVariant = 'modern' | 'bold' | 'classic' | 'premium' | 'modern-b' | 'bold-b' | 'classic-b' | 'premium-b' | 'premium-c'

export interface WebsiteCopy {
  heroHeadline: string
  heroSubheadline: string
  aboutParagraph1: string
  aboutParagraph2: string
  valueProps: Array<{ title: string; description: string }>
  closingHeadline: string
  closingBody: string
  serviceDescriptions: Record<string, string>
  testimonialQuote?: string
  testimonialAuthor?: string
  yearsBadge?: string
  serviceAreaText?: string
}

export interface PreviewLead {
  companyName: string
  industry: string
  city: string
  state: string
  phone: string
  email: string
  website: string
  previewId: string
  enrichedRating?: number
  enrichedReviews?: number
  enrichedAddress?: string
  enrichedServices: string[]
  enrichedPhotos: string[]
  logo?: string
  colorPrefs?: {
    primary: string
    secondary: string
    accent?: string
    extra?: Array<{ label: string; hex: string }>
  }
}

export interface IndustryConfig {
  gradient: string
  accentColor: string
  tagline: string
  ctaText: string
  template: TemplateVariant
  // Client color overrides (set when lead.colorPrefs exists)
  primaryHex?: string
  secondaryHex?: string
  accentHex?: string
}

export interface TemplateProps {
  lead: PreviewLead
  config: IndustryConfig
  onCTAClick: () => Promise<void>
  onCallClick: () => Promise<void>
  websiteCopy?: WebsiteCopy
}
