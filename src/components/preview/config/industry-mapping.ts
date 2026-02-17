import type { IndustryConfig } from './template-types'

export const industryTemplateMap: Record<string, IndustryConfig> = {
  // MODERN — Clean, minimalist (aesthetic trades)
  PLUMBING:    { gradient: 'from-blue-700 to-blue-900',    accentColor: 'blue-600',    tagline: 'Professional Plumbing Solutions You Can Trust',   ctaText: 'Schedule Service',   template: 'modern' },
  PAINTING:    { gradient: 'from-purple-600 to-indigo-800', accentColor: 'purple-600',  tagline: 'Transform Your Space with Expert Painting',       ctaText: 'Get Quote',          template: 'modern' },
  LANDSCAPING: { gradient: 'from-green-600 to-emerald-800', accentColor: 'green-600',   tagline: 'Beautiful Landscapes, Expert Care',               ctaText: 'Free Consultation',  template: 'modern' },
  CLEANING:    { gradient: 'from-cyan-600 to-blue-800',     accentColor: 'cyan-600',    tagline: 'Spotless Results, Every Time',                    ctaText: 'Book Cleaning',      template: 'modern' },

  // BOLD — Dark, dramatic (emergency/urgent trades)
  HVAC:        { gradient: 'from-orange-600 to-red-800',     accentColor: 'orange-500',  tagline: 'Keep Your Home Comfortable Year-Round',           ctaText: 'Get Free Estimate',  template: 'bold' },
  RESTORATION: { gradient: 'from-emerald-600 to-teal-900',   accentColor: 'emerald-500', tagline: '24/7 Emergency Restoration Services',             ctaText: 'Call Now',           template: 'bold' },
  ELECTRICAL:  { gradient: 'from-yellow-500 to-amber-700',   accentColor: 'yellow-500',  tagline: 'Safe & Reliable Electrical Services',             ctaText: 'Book Electrician',   template: 'bold' },

  // CLASSIC — Warm, trust-focused (reliability trades)
  ROOFING:             { gradient: 'from-slate-700 to-slate-900',   accentColor: 'slate-600',  tagline: 'Protecting What Matters Most',                ctaText: 'Free Roof Inspection', template: 'classic' },
  GENERAL_CONTRACTING: { gradient: 'from-gray-700 to-gray-900',    accentColor: 'gray-600',   tagline: 'Quality Construction & Renovation',           ctaText: 'Request Estimate',     template: 'classic' },
  CONSTRUCTION:        { gradient: 'from-amber-700 to-amber-900',  accentColor: 'amber-600',  tagline: 'Building Excellence, One Project at a Time',  ctaText: 'Get Quote',            template: 'classic' },
  PEST_CONTROL:        { gradient: 'from-red-700 to-rose-900',     accentColor: 'red-600',    tagline: 'Protect Your Home from Unwanted Guests',      ctaText: 'Schedule Inspection',  template: 'classic' },

  // PREMIUM — Elegant dark + gold (professional services)
  LAW:            { gradient: 'from-gray-800 to-gray-950',   accentColor: 'amber-500', tagline: 'Experienced Legal Counsel You Can Count On',  ctaText: 'Free Consultation', template: 'premium' },
  LAW_PRACTICE:   { gradient: 'from-gray-800 to-gray-950',   accentColor: 'amber-500', tagline: 'Experienced Legal Counsel You Can Count On',  ctaText: 'Free Consultation', template: 'premium' },
  LEGAL:          { gradient: 'from-gray-800 to-gray-950',   accentColor: 'amber-500', tagline: 'Experienced Legal Counsel You Can Count On',  ctaText: 'Free Consultation', template: 'premium' },
  LEGAL_SERVICES: { gradient: 'from-gray-800 to-gray-950',   accentColor: 'amber-500', tagline: 'Experienced Legal Counsel You Can Count On',  ctaText: 'Free Consultation', template: 'premium' },
  CONSULTING:     { gradient: 'from-slate-800 to-slate-950', accentColor: 'amber-500', tagline: 'Strategic Solutions for Business Growth',     ctaText: 'Schedule Call',     template: 'premium' },
  TECHNOLOGY:     { gradient: 'from-gray-900 to-black',      accentColor: 'amber-400', tagline: 'Innovative Technology Solutions',              ctaText: 'Get Started',       template: 'premium' },
  HEALTHCARE:     { gradient: 'from-teal-800 to-teal-950',   accentColor: 'amber-500', tagline: 'Compassionate Care, Modern Medicine',         ctaText: 'Book Appointment',  template: 'premium' },
  REAL_ESTATE:    { gradient: 'from-stone-800 to-stone-950', accentColor: 'amber-500', tagline: 'Your Trusted Real Estate Partners',           ctaText: 'Schedule Viewing',  template: 'premium' },
}

const defaultConfig: IndustryConfig = {
  gradient: 'from-gray-700 to-gray-900',
  accentColor: 'gray-600',
  tagline: 'Professional Services You Can Trust',
  ctaText: 'Contact Us',
  template: 'classic',
}

export function getIndustryConfig(industry: string): IndustryConfig {
  return industryTemplateMap[industry] || defaultConfig
}
