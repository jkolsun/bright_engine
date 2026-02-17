export type TemplateVariant = 'modern' | 'bold' | 'classic' | 'premium'

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
}

export interface IndustryConfig {
  gradient: string
  accentColor: string
  tagline: string
  ctaText: string
  template: TemplateVariant
}

export interface TemplateProps {
  lead: PreviewLead
  config: IndustryConfig
  onCTAClick: () => Promise<void>
  onCallClick: () => Promise<void>
}
