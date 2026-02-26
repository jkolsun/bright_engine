import type { IndustryConfig, TemplateVariant } from './template-types'

// Each industry has multiple template variants to ensure visual variety
interface IndustryVariants {
  variants: IndustryConfig[]
}

const industryVariantsMap: Record<string, IndustryVariants> = {
  // MODERN variants — Clean, minimalist (aesthetic trades)
  PLUMBING: {
    variants: [
      { gradient: 'from-blue-700 to-blue-900',    accentColor: 'blue-600',    tagline: 'The Plumber Your Neighbors Already Call',          ctaText: 'Schedule Service',   template: 'modern' },
      { gradient: 'from-sky-600 to-indigo-800',    accentColor: 'sky-500',     tagline: 'Fix It Right. Fix It Once.',                      ctaText: 'Book Now',           template: 'modern-b' },
    ],
  },
  PAINTING: {
    variants: [
      { gradient: 'from-purple-600 to-indigo-800', accentColor: 'purple-600',  tagline: 'Walls That Actually Match Your Vision',           ctaText: 'Get Quote',          template: 'modern' },
      { gradient: 'from-rose-500 to-fuchsia-700',  accentColor: 'rose-500',    tagline: 'Every Brushstroke, Backed by Reviews',            ctaText: 'Free Estimate',      template: 'modern-b' },
    ],
  },
  LANDSCAPING: {
    variants: [
      { gradient: 'from-green-600 to-emerald-800', accentColor: 'green-600',   tagline: 'Yards People Actually Stop to Look At',           ctaText: 'Free Consultation',  template: 'modern' },
      { gradient: 'from-lime-600 to-green-800',    accentColor: 'lime-500',    tagline: 'From Bare Lot to Backyard Retreat',               ctaText: 'Design My Yard',     template: 'modern-b' },
    ],
  },
  CLEANING: {
    variants: [
      { gradient: 'from-cyan-600 to-blue-800',     accentColor: 'cyan-600',    tagline: 'Walk In and Notice the Difference',               ctaText: 'Book Cleaning',      template: 'modern' },
      { gradient: 'from-teal-500 to-cyan-800',     accentColor: 'teal-500',    tagline: 'Clean Enough to Host. Every Single Time.',        ctaText: 'Get a Quote',        template: 'modern-b' },
    ],
  },

  // BOLD variants — Dark, dramatic (emergency/urgent trades)
  HVAC: {
    variants: [
      { gradient: 'from-orange-600 to-red-800',     accentColor: 'orange-500',  tagline: 'Your Comfort Isn\'t Optional — It\'s Guaranteed', ctaText: 'Get Free Estimate',  template: 'bold' },
      { gradient: 'from-amber-500 to-orange-800',   accentColor: 'amber-400',   tagline: 'One Call. Same-Day Comfort.',                     ctaText: 'Call for Service',   template: 'bold-b' },
    ],
  },
  RESTORATION: {
    variants: [
      { gradient: 'from-emerald-600 to-teal-900',   accentColor: 'emerald-500', tagline: 'Damage Doesn\'t Wait. Neither Do We.',            ctaText: 'Call Now',           template: 'bold' },
      { gradient: 'from-blue-600 to-slate-900',     accentColor: 'blue-400',    tagline: 'From Disaster to Done — Fast.',                   ctaText: 'Emergency Line',     template: 'bold-b' },
    ],
  },
  ELECTRICAL: {
    variants: [
      { gradient: 'from-yellow-500 to-amber-700',   accentColor: 'yellow-500',  tagline: 'Licensed. Insured. Lights On Tonight.',           ctaText: 'Book Electrician',   template: 'bold' },
      { gradient: 'from-orange-400 to-yellow-700',  accentColor: 'orange-400',  tagline: 'Wired Right the First Time',                     ctaText: 'Schedule Service',   template: 'bold-b' },
    ],
  },

  // CLASSIC variants — Warm, trust-focused (reliability trades)
  ROOFING: {
    variants: [
      { gradient: 'from-slate-700 to-slate-900',   accentColor: 'slate-600',  tagline: 'The Roof Over Your Head Should Never Be a Question', ctaText: 'Free Roof Inspection', template: 'classic' },
      { gradient: 'from-stone-600 to-stone-900',   accentColor: 'amber-600',  tagline: 'Built Tough. Backed by Proof.',                     ctaText: 'Get Estimate',         template: 'classic-b' },
    ],
  },
  GENERAL_CONTRACTING: {
    variants: [
      { gradient: 'from-gray-700 to-gray-900',    accentColor: 'gray-600',   tagline: 'From Blueprint to Handshake — Done Right',         ctaText: 'Request Estimate',     template: 'classic' },
      { gradient: 'from-zinc-700 to-zinc-900',    accentColor: 'emerald-600',tagline: 'Your Vision. Our Hands. Zero Shortcuts.',          ctaText: 'Start Your Project',   template: 'classic-b' },
    ],
  },
  CONSTRUCTION: {
    variants: [
      { gradient: 'from-amber-700 to-amber-900',  accentColor: 'amber-600',  tagline: 'We Build What Others Talk About',                  ctaText: 'Get Quote',            template: 'classic' },
      { gradient: 'from-orange-700 to-stone-900', accentColor: 'orange-500', tagline: 'Foundation to Finish. No Excuses.',                ctaText: 'Free Consultation',    template: 'classic-b' },
    ],
  },
  PEST_CONTROL: {
    variants: [
      { gradient: 'from-red-700 to-rose-900',     accentColor: 'red-600',    tagline: 'Sleep Tight — We Handle the Rest',                 ctaText: 'Schedule Inspection',  template: 'classic' },
      { gradient: 'from-green-700 to-emerald-900',accentColor: 'green-500',  tagline: 'Gone for Good. That\'s the Guarantee.',            ctaText: 'Book Treatment',       template: 'classic-b' },
    ],
  },

  // PREMIUM variants — Elegant (professional services) - 3 variants each
  LAW: {
    variants: [
      { gradient: 'from-gray-800 to-gray-950',   accentColor: 'amber-500', tagline: 'When It Matters Most, Experience Counts',         ctaText: 'Free Consultation', template: 'premium' },
      { gradient: 'from-navy-800 to-slate-950',  accentColor: 'sky-400',   tagline: 'Your Case Deserves More Than a Template Defense', ctaText: 'Schedule Consult',  template: 'premium-b' },
      { gradient: 'from-stone-800 to-stone-950', accentColor: 'emerald-400',tagline: 'Results Speak. Ours Are on the Record.',        ctaText: 'Get Started',       template: 'premium-c' },
    ],
  },
  LAW_PRACTICE: {
    variants: [
      { gradient: 'from-gray-800 to-gray-950',   accentColor: 'amber-500', tagline: 'When It Matters Most, Experience Counts',         ctaText: 'Free Consultation', template: 'premium' },
      { gradient: 'from-navy-800 to-slate-950',  accentColor: 'sky-400',   tagline: 'Your Case Deserves More Than a Template Defense', ctaText: 'Schedule Consult',  template: 'premium-b' },
      { gradient: 'from-stone-800 to-stone-950', accentColor: 'emerald-400',tagline: 'Results Speak. Ours Are on the Record.',        ctaText: 'Get Started',       template: 'premium-c' },
    ],
  },
  LEGAL: {
    variants: [
      { gradient: 'from-gray-800 to-gray-950',   accentColor: 'amber-500', tagline: 'When It Matters Most, Experience Counts',         ctaText: 'Free Consultation', template: 'premium' },
      { gradient: 'from-navy-800 to-slate-950',  accentColor: 'sky-400',   tagline: 'Your Case Deserves More Than a Template Defense', ctaText: 'Schedule Consult',  template: 'premium-b' },
      { gradient: 'from-stone-800 to-stone-950', accentColor: 'emerald-400',tagline: 'Results Speak. Ours Are on the Record.',        ctaText: 'Get Started',       template: 'premium-c' },
    ],
  },
  LEGAL_SERVICES: {
    variants: [
      { gradient: 'from-gray-800 to-gray-950',   accentColor: 'amber-500', tagline: 'When It Matters Most, Experience Counts',         ctaText: 'Free Consultation', template: 'premium' },
      { gradient: 'from-navy-800 to-slate-950',  accentColor: 'sky-400',   tagline: 'Your Case Deserves More Than a Template Defense', ctaText: 'Schedule Consult',  template: 'premium-b' },
      { gradient: 'from-stone-800 to-stone-950', accentColor: 'emerald-400',tagline: 'Results Speak. Ours Are on the Record.',        ctaText: 'Get Started',       template: 'premium-c' },
    ],
  },
  CONSULTING: {
    variants: [
      { gradient: 'from-slate-800 to-slate-950', accentColor: 'amber-500', tagline: 'Strategies That Survive First Contact with Reality', ctaText: 'Schedule Call',     template: 'premium' },
      { gradient: 'from-indigo-800 to-indigo-950', accentColor: 'violet-400', tagline: 'Clarity Over Complexity. Growth Over Guesswork.', ctaText: 'Book Session',      template: 'premium-b' },
      { gradient: 'from-zinc-800 to-zinc-950',   accentColor: 'teal-400',  tagline: 'The Advisor Your Board Actually Listens To',        ctaText: 'Get Started',       template: 'premium-c' },
    ],
  },
  TECHNOLOGY: {
    variants: [
      { gradient: 'from-gray-900 to-black',      accentColor: 'amber-400', tagline: 'Built to Ship. Engineered to Scale.',                ctaText: 'Get Started',       template: 'premium' },
      { gradient: 'from-slate-900 to-black',     accentColor: 'cyan-400',  tagline: 'Code That Solves Problems, Not Creates Them',        ctaText: 'Learn More',        template: 'premium-b' },
      { gradient: 'from-zinc-900 to-black',      accentColor: 'lime-400',  tagline: 'From Prototype to Production — No Detours',          ctaText: 'Start Building',    template: 'premium-c' },
    ],
  },
  HEALTHCARE: {
    variants: [
      { gradient: 'from-teal-800 to-teal-950',   accentColor: 'amber-500', tagline: 'Care That Treats People, Not Just Symptoms',         ctaText: 'Book Appointment',  template: 'premium' },
      { gradient: 'from-blue-800 to-blue-950',   accentColor: 'sky-400',   tagline: 'Your Health Deserves Undivided Attention',            ctaText: 'Schedule Visit',    template: 'premium-b' },
      { gradient: 'from-emerald-800 to-emerald-950', accentColor: 'green-400', tagline: 'Where Modern Medicine Meets Human Touch',         ctaText: 'Get Care Now',      template: 'premium-c' },
    ],
  },
  REAL_ESTATE: {
    variants: [
      { gradient: 'from-stone-800 to-stone-950', accentColor: 'amber-500', tagline: 'We Don\'t Just List Homes — We Sell Them',            ctaText: 'Schedule Viewing',  template: 'premium' },
      { gradient: 'from-slate-800 to-gray-950',  accentColor: 'sky-400',   tagline: 'Find the Property Before Everyone Else Does',        ctaText: 'Browse Listings',   template: 'premium-b' },
      { gradient: 'from-amber-800 to-stone-950', accentColor: 'amber-300', tagline: 'From Open House to Closing Day — Handled.',           ctaText: 'Get Started',       template: 'premium-c' },
    ],
  },
}

const defaultVariants: IndustryVariants = {
  variants: [
    { gradient: 'from-gray-700 to-gray-900',    accentColor: 'gray-600',   tagline: 'Trusted Locally. Proven by Results.', ctaText: 'Contact Us', template: 'classic' },
    { gradient: 'from-slate-700 to-slate-900',  accentColor: 'blue-500',   tagline: 'The Service Your Property Deserves',  ctaText: 'Get Quote',  template: 'classic-b' },
  ],
}

/**
 * Simple hash of a string to a number.
 * Used to deterministically pick a template variant so the same lead always sees the same design.
 */
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

/**
 * Get industry config for a lead, with variant selection based on company name.
 * Ensures different companies in the same industry get different template designs.
 */
export function getIndustryConfig(industry: string, companyName?: string): IndustryConfig {
  const entry = industryVariantsMap[industry] || defaultVariants
  const variants = entry.variants

  if (variants.length === 1 || !companyName) {
    return variants[0]
  }

  // Use hash of company name to deterministically select variant
  const variantIndex = hashString(companyName) % variants.length
  return variants[variantIndex]
}

/**
 * Get all template variants for an industry, plus the default (hash-selected) index.
 * Used by the template switcher so clients can toggle between designs.
 */
export function getAllIndustryVariants(industry: string, companyName?: string): { configs: IndustryConfig[]; defaultIndex: number } {
  const entry = industryVariantsMap[industry] || defaultVariants
  const variants = entry.variants
  const defaultIndex = (variants.length > 1 && companyName)
    ? hashString(companyName) % variants.length
    : 0
  return { configs: variants, defaultIndex }
}

// Backwards-compatible export for any code using the old flat map
export const industryTemplateMap: Record<string, IndustryConfig> = Object.fromEntries(
  Object.entries(industryVariantsMap).map(([key, val]) => [key, val.variants[0]])
)
