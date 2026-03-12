import type { IndustryConfig, TemplateVariant } from './template-types'

// Each industry has multiple template variants to ensure visual variety
interface IndustryVariants {
  variants: IndustryConfig[]
}

const industryVariantsMap: Record<string, IndustryVariants> = {
  // ── HOME SERVICE TRADES ──────────────────────────────────────────
  PLUMBING: {
    variants: [
      { gradient: 'from-blue-700 to-blue-900',    accentColor: 'blue-600',    tagline: 'The Plumber Your Neighbors Already Call',          ctaText: 'Schedule Service',   template: 'modern' },
      { gradient: 'from-sky-600 to-indigo-800',    accentColor: 'sky-500',     tagline: 'Fix It Right. Fix It Once.',                      ctaText: 'Book Now',           template: 'modern-b' },
      { gradient: 'from-blue-600 to-blue-900',     accentColor: 'blue-500',    tagline: 'Plumbing Done Properly — Every Time.',             ctaText: 'Get Estimate',       template: 'forge' },
      { gradient: 'from-sky-700 to-blue-900',      accentColor: 'sky-600',     tagline: 'Reliable Pipes. Reliable People.',                 ctaText: 'Schedule Now',       template: 'flux' },
    ],
  },
  PAINTING: {
    variants: [
      { gradient: 'from-purple-600 to-indigo-800', accentColor: 'purple-600',  tagline: 'Walls That Actually Match Your Vision',           ctaText: 'Get Quote',          template: 'modern' },
      { gradient: 'from-rose-500 to-fuchsia-700',  accentColor: 'rose-500',    tagline: 'Every Brushstroke, Backed by Reviews',            ctaText: 'Free Estimate',      template: 'modern-b' },
      { gradient: 'from-violet-600 to-purple-900', accentColor: 'violet-400',  tagline: 'Color Your World — Flawlessly.',                  ctaText: 'Book Painter',       template: 'apex' },
      { gradient: 'from-fuchsia-500 to-rose-700',  accentColor: 'fuchsia-500', tagline: 'From Vision to Vibrance.',                        ctaText: 'Get Started',        template: 'flux' },
    ],
  },
  LANDSCAPING: {
    variants: [
      { gradient: 'from-green-600 to-emerald-800', accentColor: 'green-600',   tagline: 'Yards People Actually Stop to Look At',           ctaText: 'Free Consultation',  template: 'modern' },
      { gradient: 'from-lime-600 to-green-800',    accentColor: 'lime-500',    tagline: 'From Bare Lot to Backyard Retreat',               ctaText: 'Design My Yard',     template: 'modern-b' },
      { gradient: 'from-emerald-600 to-green-900', accentColor: 'emerald-500', tagline: 'Landscapes That Live Up to the Dream.',            ctaText: 'Get Estimate',       template: 'summit' },
      { gradient: 'from-green-500 to-teal-800',    accentColor: 'green-500',   tagline: 'Nature, Designed.',                                ctaText: 'Start Project',      template: 'flux' },
    ],
  },
  CLEANING: {
    variants: [
      { gradient: 'from-cyan-600 to-blue-800',     accentColor: 'cyan-600',    tagline: 'Walk In and Notice the Difference',               ctaText: 'Book Cleaning',      template: 'modern' },
      { gradient: 'from-teal-500 to-cyan-800',     accentColor: 'teal-500',    tagline: 'Clean Enough to Host. Every Single Time.',        ctaText: 'Get a Quote',        template: 'modern-b' },
      { gradient: 'from-sky-500 to-cyan-800',       accentColor: 'sky-500',     tagline: 'Spotless Spaces. Happy Faces.',                   ctaText: 'Book Today',         template: 'flux' },
      { gradient: 'from-cyan-500 to-blue-700',      accentColor: 'cyan-500',    tagline: 'Pristine. Professional. Punctual.',               ctaText: 'Schedule Now',       template: 'apex' },
    ],
  },

  // ── URGENT / EMERGENCY TRADES ────────────────────────────────────
  HVAC: {
    variants: [
      { gradient: 'from-orange-600 to-red-800',     accentColor: 'orange-500',  tagline: 'Your Comfort Isn\'t Optional — It\'s Guaranteed', ctaText: 'Get Free Estimate',  template: 'bold' },
      { gradient: 'from-amber-500 to-orange-800',   accentColor: 'amber-400',   tagline: 'One Call. Same-Day Comfort.',                     ctaText: 'Call for Service',   template: 'bold-b' },
      { gradient: 'from-orange-500 to-red-900',     accentColor: 'orange-400',  tagline: 'Climate Control. Zero Compromise.',               ctaText: 'Book HVAC',          template: 'forge' },
      { gradient: 'from-red-600 to-orange-800',     accentColor: 'red-500',     tagline: 'Heating. Cooling. Done Right.',                   ctaText: 'Get Estimate',       template: 'apex' },
    ],
  },
  RESTORATION: {
    variants: [
      { gradient: 'from-emerald-600 to-teal-900',   accentColor: 'emerald-500', tagline: 'Damage Doesn\'t Wait. Neither Do We.',            ctaText: 'Call Now',           template: 'bold' },
      { gradient: 'from-blue-600 to-slate-900',     accentColor: 'blue-400',    tagline: 'From Disaster to Done — Fast.',                   ctaText: 'Emergency Line',     template: 'bold-b' },
      { gradient: 'from-teal-600 to-slate-900',     accentColor: 'teal-400',    tagline: 'Restore It Right. Restore It Now.',               ctaText: 'Get Help',           template: 'forge' },
    ],
  },
  ELECTRICAL: {
    variants: [
      { gradient: 'from-yellow-500 to-amber-700',   accentColor: 'yellow-500',  tagline: 'Licensed. Insured. Lights On Tonight.',           ctaText: 'Book Electrician',   template: 'bold' },
      { gradient: 'from-orange-400 to-yellow-700',  accentColor: 'orange-400',  tagline: 'Wired Right the First Time',                     ctaText: 'Schedule Service',   template: 'bold-b' },
      { gradient: 'from-amber-500 to-yellow-800',   accentColor: 'amber-500',   tagline: 'Power Your Home. Safely.',                        ctaText: 'Get Quote',          template: 'forge' },
      { gradient: 'from-yellow-400 to-amber-700',   accentColor: 'yellow-400',  tagline: 'Precision Electrical Work.',                      ctaText: 'Book Now',           template: 'flux' },
    ],
  },

  // ── RELIABILITY / TRUST TRADES ───────────────────────────────────
  ROOFING: {
    variants: [
      { gradient: 'from-slate-700 to-slate-900',   accentColor: 'slate-600',  tagline: 'The Roof Over Your Head Should Never Be a Question', ctaText: 'Free Roof Inspection', template: 'classic' },
      { gradient: 'from-stone-600 to-stone-900',   accentColor: 'amber-600',  tagline: 'Built Tough. Backed by Proof.',                     ctaText: 'Get Estimate',         template: 'classic-b' },
      { gradient: 'from-gray-700 to-slate-900',    accentColor: 'amber-500',  tagline: 'Roofing That Stands the Test of Time.',              ctaText: 'Free Inspection',      template: 'forge' },
      { gradient: 'from-slate-600 to-gray-900',    accentColor: 'sky-500',    tagline: 'Above and Beyond — Every Project.',                  ctaText: 'Get Quote',            template: 'apex' },
    ],
  },
  GENERAL_CONTRACTING: {
    variants: [
      { gradient: 'from-gray-700 to-gray-900',    accentColor: 'gray-600',   tagline: 'From Blueprint to Handshake — Done Right',         ctaText: 'Request Estimate',     template: 'classic' },
      { gradient: 'from-zinc-700 to-zinc-900',    accentColor: 'emerald-600',tagline: 'Your Vision. Our Hands. Zero Shortcuts.',          ctaText: 'Start Your Project',   template: 'classic-b' },
      { gradient: 'from-stone-700 to-stone-900',  accentColor: 'amber-500',  tagline: 'Built to Last. Built to Impress.',                 ctaText: 'Get Started',          template: 'forge' },
      { gradient: 'from-gray-600 to-gray-900',    accentColor: 'emerald-500',tagline: 'Craftsmanship Meets Commitment.',                  ctaText: 'Request Quote',        template: 'apex' },
    ],
  },
  CONSTRUCTION: {
    variants: [
      { gradient: 'from-amber-700 to-amber-900',  accentColor: 'amber-600',  tagline: 'We Build What Others Talk About',                  ctaText: 'Get Quote',            template: 'classic' },
      { gradient: 'from-orange-700 to-stone-900', accentColor: 'orange-500', tagline: 'Foundation to Finish. No Excuses.',                ctaText: 'Free Consultation',    template: 'classic-b' },
      { gradient: 'from-amber-600 to-stone-900',  accentColor: 'amber-500',  tagline: 'Construction Built on Trust.',                     ctaText: 'Start Building',       template: 'forge' },
      { gradient: 'from-stone-600 to-amber-900',  accentColor: 'orange-400', tagline: 'Solid Work. Solid Word.',                          ctaText: 'Get Estimate',         template: 'bold' },
    ],
  },
  PEST_CONTROL: {
    variants: [
      { gradient: 'from-red-700 to-rose-900',     accentColor: 'red-600',    tagline: 'Sleep Tight — We Handle the Rest',                 ctaText: 'Schedule Inspection',  template: 'classic' },
      { gradient: 'from-green-700 to-emerald-900',accentColor: 'green-500',  tagline: 'Gone for Good. That\'s the Guarantee.',            ctaText: 'Book Treatment',       template: 'classic-b' },
      { gradient: 'from-emerald-600 to-green-900',accentColor: 'emerald-500',tagline: 'Pests Out. Peace In.',                             ctaText: 'Get Protected',        template: 'forge' },
    ],
  },

  // ── PROFESSIONAL SERVICES ────────────────────────────────────────
  LAW: {
    variants: [
      { gradient: 'from-gray-800 to-gray-950',   accentColor: 'amber-500', tagline: 'When It Matters Most, Experience Counts',         ctaText: 'Free Consultation', template: 'premium' },
      { gradient: 'from-navy-800 to-slate-950',  accentColor: 'sky-400',   tagline: 'Your Case Deserves More Than a Template Defense', ctaText: 'Schedule Consult',  template: 'premium-b' },
      { gradient: 'from-stone-800 to-stone-950', accentColor: 'emerald-400',tagline: 'Results Speak. Ours Are on the Record.',        ctaText: 'Get Started',       template: 'premium-c' },
      { gradient: 'from-slate-800 to-gray-950',  accentColor: 'amber-400', tagline: 'Justice Demands the Best.',                       ctaText: 'Book Consultation', template: 'summit' },
    ],
  },
  LAW_PRACTICE: {
    variants: [
      { gradient: 'from-gray-800 to-gray-950',   accentColor: 'amber-500', tagline: 'When It Matters Most, Experience Counts',         ctaText: 'Free Consultation', template: 'premium' },
      { gradient: 'from-navy-800 to-slate-950',  accentColor: 'sky-400',   tagline: 'Your Case Deserves More Than a Template Defense', ctaText: 'Schedule Consult',  template: 'premium-b' },
      { gradient: 'from-stone-800 to-stone-950', accentColor: 'emerald-400',tagline: 'Results Speak. Ours Are on the Record.',        ctaText: 'Get Started',       template: 'premium-c' },
      { gradient: 'from-slate-800 to-gray-950',  accentColor: 'amber-400', tagline: 'Justice Demands the Best.',                       ctaText: 'Book Consultation', template: 'summit' },
    ],
  },
  LEGAL: {
    variants: [
      { gradient: 'from-gray-800 to-gray-950',   accentColor: 'amber-500', tagline: 'When It Matters Most, Experience Counts',         ctaText: 'Free Consultation', template: 'premium' },
      { gradient: 'from-navy-800 to-slate-950',  accentColor: 'sky-400',   tagline: 'Your Case Deserves More Than a Template Defense', ctaText: 'Schedule Consult',  template: 'premium-b' },
      { gradient: 'from-slate-800 to-gray-950',  accentColor: 'amber-400', tagline: 'Justice Demands the Best.',                       ctaText: 'Book Consultation', template: 'summit' },
    ],
  },
  LEGAL_SERVICES: {
    variants: [
      { gradient: 'from-gray-800 to-gray-950',   accentColor: 'amber-500', tagline: 'When It Matters Most, Experience Counts',         ctaText: 'Free Consultation', template: 'premium' },
      { gradient: 'from-navy-800 to-slate-950',  accentColor: 'sky-400',   tagline: 'Your Case Deserves More Than a Template Defense', ctaText: 'Schedule Consult',  template: 'premium-b' },
      { gradient: 'from-slate-800 to-gray-950',  accentColor: 'amber-400', tagline: 'Justice Demands the Best.',                       ctaText: 'Book Consultation', template: 'summit' },
    ],
  },
  CONSULTING: {
    variants: [
      { gradient: 'from-slate-800 to-slate-950', accentColor: 'amber-500', tagline: 'Strategies That Survive First Contact with Reality', ctaText: 'Schedule Call',     template: 'premium' },
      { gradient: 'from-indigo-800 to-indigo-950', accentColor: 'violet-400', tagline: 'Clarity Over Complexity. Growth Over Guesswork.', ctaText: 'Book Session',      template: 'premium-b' },
      { gradient: 'from-zinc-800 to-zinc-950',   accentColor: 'teal-400',  tagline: 'The Advisor Your Board Actually Listens To',        ctaText: 'Get Started',       template: 'premium-c' },
      { gradient: 'from-gray-800 to-slate-950',  accentColor: 'sky-400',   tagline: 'Insight That Drives Outcomes.',                      ctaText: 'Book Consult',      template: 'summit' },
    ],
  },
  TECHNOLOGY: {
    variants: [
      { gradient: 'from-gray-900 to-black',      accentColor: 'amber-400', tagline: 'Built to Ship. Engineered to Scale.',                ctaText: 'Get Started',       template: 'premium' },
      { gradient: 'from-slate-900 to-black',     accentColor: 'cyan-400',  tagline: 'Code That Solves Problems, Not Creates Them',        ctaText: 'Learn More',        template: 'premium-b' },
      { gradient: 'from-zinc-900 to-black',      accentColor: 'lime-400',  tagline: 'From Prototype to Production — No Detours',          ctaText: 'Start Building',    template: 'premium-c' },
      { gradient: 'from-gray-900 to-slate-950',  accentColor: 'violet-400',tagline: 'Technology That Transforms.',                        ctaText: 'Get Started',       template: 'flux' },
    ],
  },
  HEALTHCARE: {
    variants: [
      { gradient: 'from-teal-800 to-teal-950',   accentColor: 'amber-500', tagline: 'Care That Treats People, Not Just Symptoms',         ctaText: 'Book Appointment',  template: 'premium' },
      { gradient: 'from-blue-800 to-blue-950',   accentColor: 'sky-400',   tagline: 'Your Health Deserves Undivided Attention',            ctaText: 'Schedule Visit',    template: 'premium-b' },
      { gradient: 'from-emerald-800 to-emerald-950', accentColor: 'green-400', tagline: 'Where Modern Medicine Meets Human Touch',         ctaText: 'Get Care Now',      template: 'premium-c' },
      { gradient: 'from-teal-700 to-blue-950',   accentColor: 'teal-400',  tagline: 'Compassionate Care. Modern Medicine.',                ctaText: 'Schedule Now',      template: 'summit' },
    ],
  },
  REAL_ESTATE: {
    variants: [
      { gradient: 'from-stone-800 to-stone-950', accentColor: 'amber-500', tagline: 'We Don\'t Just List Homes — We Sell Them',            ctaText: 'Schedule Viewing',  template: 'premium' },
      { gradient: 'from-slate-800 to-gray-950',  accentColor: 'sky-400',   tagline: 'Find the Property Before Everyone Else Does',        ctaText: 'Browse Listings',   template: 'premium-b' },
      { gradient: 'from-amber-800 to-stone-950', accentColor: 'amber-300', tagline: 'From Open House to Closing Day — Handled.',           ctaText: 'Get Started',       template: 'premium-c' },
      { gradient: 'from-stone-700 to-slate-950', accentColor: 'amber-400', tagline: 'Your Dream Home, Found.',                             ctaText: 'Explore Listings',  template: 'summit' },
    ],
  },

  // ── NEW INDUSTRIES ───────────────────────────────────────────────
  DENTAL: {
    variants: [
      { gradient: 'from-sky-700 to-blue-900',     accentColor: 'sky-500',    tagline: 'Smiles You\'re Proud to Show Off',               ctaText: 'Book Appointment',   template: 'modern' },
      { gradient: 'from-teal-600 to-cyan-900',    accentColor: 'teal-500',   tagline: 'Modern Dentistry. Gentle Hands.',                ctaText: 'Schedule Visit',     template: 'summit' },
      { gradient: 'from-blue-600 to-sky-900',     accentColor: 'blue-500',   tagline: 'Your Comfort Comes First.',                      ctaText: 'Book Today',         template: 'flux' },
    ],
  },
  FITNESS: {
    variants: [
      { gradient: 'from-red-600 to-orange-800',   accentColor: 'red-500',    tagline: 'Push Your Limits. See Real Results.',             ctaText: 'Start Training',     template: 'bold' },
      { gradient: 'from-orange-500 to-red-800',   accentColor: 'orange-400', tagline: 'Stronger Every Day.',                             ctaText: 'Join Now',           template: 'forge' },
      { gradient: 'from-rose-500 to-red-800',     accentColor: 'rose-500',   tagline: 'Transform Your Body. Transform Your Life.',       ctaText: 'Get Started',        template: 'flux' },
    ],
  },
  SALON: {
    variants: [
      { gradient: 'from-rose-500 to-pink-800',    accentColor: 'rose-500',   tagline: 'Style That Turns Heads.',                         ctaText: 'Book Appointment',   template: 'modern' },
      { gradient: 'from-pink-500 to-fuchsia-800', accentColor: 'pink-500',   tagline: 'Beauty, Personalized.',                           ctaText: 'Reserve Spot',       template: 'flux' },
      { gradient: 'from-fuchsia-500 to-rose-800', accentColor: 'fuchsia-500',tagline: 'Where Confidence Begins.',                        ctaText: 'Book Now',           template: 'summit' },
    ],
  },
  RESTAURANT: {
    variants: [
      { gradient: 'from-amber-600 to-orange-900', accentColor: 'amber-500',  tagline: 'Every Plate, a Masterpiece.',                     ctaText: 'View Menu',          template: 'apex' },
      { gradient: 'from-red-700 to-amber-900',    accentColor: 'red-600',    tagline: 'Flavors Worth the Trip.',                          ctaText: 'Reserve Table',      template: 'modern' },
      { gradient: 'from-orange-600 to-red-900',   accentColor: 'orange-500', tagline: 'Dine Like It Matters.',                            ctaText: 'Order Now',          template: 'summit' },
    ],
  },
  PHOTOGRAPHY: {
    variants: [
      { gradient: 'from-gray-800 to-gray-950',    accentColor: 'amber-400',  tagline: 'Moments Captured. Stories Told.',                  ctaText: 'Book Session',       template: 'summit' },
      { gradient: 'from-slate-800 to-black',       accentColor: 'rose-400',   tagline: 'See the World Through a Different Lens.',          ctaText: 'View Portfolio',     template: 'apex' },
      { gradient: 'from-zinc-800 to-gray-950',    accentColor: 'violet-400', tagline: 'Artistry Meets Precision.',                        ctaText: 'Get in Touch',       template: 'modern' },
    ],
  },
  MOVING: {
    variants: [
      { gradient: 'from-blue-700 to-indigo-900',  accentColor: 'blue-500',   tagline: 'Move Day, Made Easy.',                             ctaText: 'Get Quote',          template: 'bold' },
      { gradient: 'from-indigo-600 to-blue-900',  accentColor: 'indigo-400', tagline: 'Heavy Lifting? That\'s Our Thing.',                ctaText: 'Book Movers',        template: 'forge' },
      { gradient: 'from-sky-600 to-indigo-900',   accentColor: 'sky-500',    tagline: 'Your New Chapter Starts Here.',                     ctaText: 'Get Estimate',       template: 'flux' },
    ],
  },
  FLOORING: {
    variants: [
      { gradient: 'from-amber-600 to-stone-900',  accentColor: 'amber-500',  tagline: 'Floors Worth Walking On.',                         ctaText: 'Free Estimate',      template: 'classic' },
      { gradient: 'from-stone-600 to-amber-900',  accentColor: 'stone-500',  tagline: 'Step Into Something Beautiful.',                    ctaText: 'Get Quote',          template: 'apex' },
      { gradient: 'from-amber-500 to-orange-800', accentColor: 'amber-400',  tagline: 'Crafted Surfaces. Lasting Impressions.',            ctaText: 'Book Install',       template: 'modern' },
    ],
  },
  FENCING: {
    variants: [
      { gradient: 'from-stone-700 to-stone-900',  accentColor: 'amber-600',  tagline: 'Boundaries Built to Last.',                        ctaText: 'Free Estimate',      template: 'classic' },
      { gradient: 'from-green-700 to-stone-900',  accentColor: 'green-500',  tagline: 'Property. Protected. Perfectly.',                   ctaText: 'Get Quote',          template: 'forge' },
    ],
  },
  CONCRETE: {
    variants: [
      { gradient: 'from-gray-700 to-gray-900',    accentColor: 'amber-500',  tagline: 'Concrete You Can Count On.',                       ctaText: 'Get Estimate',       template: 'forge' },
      { gradient: 'from-stone-700 to-gray-900',   accentColor: 'gray-500',   tagline: 'Poured Right. Built to Stay.',                     ctaText: 'Free Quote',         template: 'classic' },
      { gradient: 'from-zinc-700 to-stone-900',   accentColor: 'amber-400',  tagline: 'Solid Ground. Solid Work.',                        ctaText: 'Get Started',        template: 'bold-b' },
    ],
  },
  TREE_SERVICE: {
    variants: [
      { gradient: 'from-green-700 to-emerald-900',accentColor: 'green-600',  tagline: 'Trees Trimmed Right. Safety Guaranteed.',           ctaText: 'Free Estimate',      template: 'modern' },
      { gradient: 'from-emerald-700 to-green-900',accentColor: 'emerald-500',tagline: 'From Canopy to Stump — We Handle It.',             ctaText: 'Book Service',       template: 'forge' },
      { gradient: 'from-lime-600 to-green-900',   accentColor: 'lime-500',   tagline: 'Healthy Trees. Happy Homes.',                      ctaText: 'Get Quote',          template: 'flux' },
    ],
  },
  SOLAR: {
    variants: [
      { gradient: 'from-amber-500 to-orange-800', accentColor: 'amber-400',  tagline: 'Power Your Home With the Sun.',                    ctaText: 'Get Solar Quote',    template: 'modern' },
      { gradient: 'from-yellow-500 to-amber-800', accentColor: 'yellow-500', tagline: 'Energy Independence Starts Here.',                 ctaText: 'Go Solar',           template: 'flux' },
      { gradient: 'from-orange-500 to-yellow-800',accentColor: 'orange-400', tagline: 'Clean Energy. Clear Savings.',                     ctaText: 'Free Assessment',    template: 'apex' },
    ],
  },
  POOL: {
    variants: [
      { gradient: 'from-cyan-600 to-blue-900',    accentColor: 'cyan-500',   tagline: 'Your Dream Pool, Built to Perfection.',            ctaText: 'Get Estimate',       template: 'modern' },
      { gradient: 'from-blue-600 to-cyan-900',    accentColor: 'blue-500',   tagline: 'Dive Into Summer — Every Day.',                    ctaText: 'Design My Pool',     template: 'flux' },
      { gradient: 'from-teal-600 to-blue-900',    accentColor: 'teal-500',   tagline: 'Crystal Clear. Always.',                           ctaText: 'Book Service',       template: 'summit' },
    ],
  },
  AUTO_REPAIR: {
    variants: [
      { gradient: 'from-red-700 to-gray-900',     accentColor: 'red-600',    tagline: 'Honest Repairs. Fair Prices. Every Time.',          ctaText: 'Schedule Service',   template: 'bold' },
      { gradient: 'from-gray-700 to-red-900',     accentColor: 'red-500',    tagline: 'Keep Your Ride Running Right.',                     ctaText: 'Book Repair',        template: 'forge' },
      { gradient: 'from-slate-700 to-gray-900',   accentColor: 'amber-500',  tagline: 'Mechanics You Can Trust.',                          ctaText: 'Get Quote',          template: 'classic-b' },
    ],
  },
  GARAGE_DOOR: {
    variants: [
      { gradient: 'from-gray-700 to-slate-900',   accentColor: 'amber-500',  tagline: 'Doors That Open Right. Every Time.',               ctaText: 'Schedule Repair',    template: 'classic' },
      { gradient: 'from-slate-700 to-gray-900',   accentColor: 'sky-500',    tagline: 'Upgrade Your Curb Appeal.',                         ctaText: 'Get Estimate',       template: 'forge' },
    ],
  },
  WINDOW: {
    variants: [
      { gradient: 'from-sky-700 to-blue-900',     accentColor: 'sky-500',    tagline: 'Let the Light In. Beautifully.',                    ctaText: 'Free Estimate',      template: 'modern' },
      { gradient: 'from-blue-600 to-sky-900',     accentColor: 'blue-500',   tagline: 'Windows That Wow.',                                 ctaText: 'Get Quote',          template: 'flux' },
    ],
  },
  // ── ADDITIONAL INDUSTRIES ─────────────────────────────────────────
  ACCOUNTING: {
    variants: [
      { gradient: 'from-slate-800 to-gray-950',   accentColor: 'emerald-500',tagline: 'Numbers That Make Sense. Strategies That Work.',    ctaText: 'Book Consult',       template: 'premium' },
      { gradient: 'from-gray-800 to-slate-950',   accentColor: 'blue-400',   tagline: 'Your Finances, Handled.',                           ctaText: 'Get Started',        template: 'summit' },
    ],
  },
  INSURANCE: {
    variants: [
      { gradient: 'from-blue-800 to-indigo-950',  accentColor: 'blue-500',   tagline: 'Coverage That Actually Covers You.',                ctaText: 'Get Quote',          template: 'premium' },
      { gradient: 'from-indigo-700 to-blue-950',  accentColor: 'sky-400',    tagline: 'Protection You Can Count On.',                      ctaText: 'Compare Plans',      template: 'apex' },
    ],
  },
  VETERINARY: {
    variants: [
      { gradient: 'from-emerald-600 to-teal-900', accentColor: 'emerald-500',tagline: 'Compassionate Care for Every Companion.',           ctaText: 'Book Visit',         template: 'modern' },
      { gradient: 'from-teal-600 to-green-900',   accentColor: 'teal-500',   tagline: 'Healthy Pets. Happy Families.',                     ctaText: 'Schedule Exam',      template: 'flux' },
    ],
  },
  PLUMBING_HVAC: {
    variants: [
      { gradient: 'from-blue-700 to-blue-900',    accentColor: 'blue-600',   tagline: 'Pipes and Climate — We\'ve Got You Covered.',       ctaText: 'Get Estimate',       template: 'bold' },
      { gradient: 'from-sky-600 to-blue-900',     accentColor: 'sky-500',    tagline: 'Comfort From Top to Bottom.',                       ctaText: 'Schedule Now',       template: 'forge' },
    ],
  },
  LOCKSMITH: {
    variants: [
      { gradient: 'from-gray-700 to-gray-900',    accentColor: 'amber-500',  tagline: 'Locked Out? We\'re Already On Our Way.',            ctaText: 'Call Now',           template: 'bold' },
      { gradient: 'from-slate-700 to-gray-900',   accentColor: 'yellow-500', tagline: 'Security Solutions. Day or Night.',                  ctaText: 'Get Help',           template: 'forge' },
    ],
  },
  CARPET_CLEANING: {
    variants: [
      { gradient: 'from-teal-600 to-cyan-800',    accentColor: 'teal-500',   tagline: 'Carpets So Clean They Look New.',                   ctaText: 'Book Cleaning',      template: 'modern' },
      { gradient: 'from-cyan-600 to-teal-800',    accentColor: 'cyan-500',   tagline: 'Deep Clean. Deep Satisfaction.',                     ctaText: 'Get Quote',          template: 'flux' },
    ],
  },
  PRESSURE_WASHING: {
    variants: [
      { gradient: 'from-blue-600 to-slate-900',   accentColor: 'blue-500',   tagline: 'Blast Away the Years.',                             ctaText: 'Get Estimate',       template: 'bold' },
      { gradient: 'from-sky-600 to-blue-900',     accentColor: 'sky-500',    tagline: 'Like New. Guaranteed.',                              ctaText: 'Book Service',       template: 'forge' },
    ],
  },
  HANDYMAN: {
    variants: [
      { gradient: 'from-amber-600 to-stone-800',  accentColor: 'amber-500',  tagline: 'One Call Fixes It All.',                             ctaText: 'Schedule Service',   template: 'classic' },
      { gradient: 'from-stone-600 to-amber-800',  accentColor: 'orange-500', tagline: 'No Job Too Small. No Detail Too Big.',               ctaText: 'Get Quote',          template: 'flux' },
    ],
  },
  INTERIOR_DESIGN: {
    variants: [
      { gradient: 'from-stone-700 to-stone-950',  accentColor: 'amber-400',  tagline: 'Spaces That Tell Your Story.',                      ctaText: 'Book Consultation',  template: 'summit' },
      { gradient: 'from-rose-600 to-stone-900',   accentColor: 'rose-400',   tagline: 'Design That Feels Like Home.',                      ctaText: 'Get Started',        template: 'apex' },
      { gradient: 'from-amber-600 to-stone-900',  accentColor: 'amber-500',  tagline: 'Elegant Interiors. Effortlessly.',                  ctaText: 'View Portfolio',     template: 'modern' },
    ],
  },
  ARCHITECTURE: {
    variants: [
      { gradient: 'from-gray-800 to-gray-950',    accentColor: 'amber-400',  tagline: 'Design That Defies the Ordinary.',                  ctaText: 'Start Project',      template: 'summit' },
      { gradient: 'from-slate-800 to-gray-950',   accentColor: 'sky-400',    tagline: 'Blueprints for Bold Ideas.',                         ctaText: 'Book Consult',       template: 'apex' },
    ],
  },
  CATERING: {
    variants: [
      { gradient: 'from-amber-600 to-orange-900', accentColor: 'amber-500',  tagline: 'Events Deserve Exceptional Food.',                  ctaText: 'Get Quote',          template: 'modern' },
      { gradient: 'from-red-600 to-amber-900',    accentColor: 'red-500',    tagline: 'Flavors That Make Events Memorable.',                ctaText: 'Plan Event',         template: 'apex' },
    ],
  },
  TUTORING: {
    variants: [
      { gradient: 'from-indigo-600 to-violet-900',accentColor: 'indigo-500', tagline: 'Unlock Your Potential.',                             ctaText: 'Book Session',       template: 'flux' },
      { gradient: 'from-violet-600 to-indigo-900',accentColor: 'violet-500', tagline: 'Expert Guidance. Real Results.',                     ctaText: 'Get Started',        template: 'modern' },
    ],
  },
  MUSIC: {
    variants: [
      { gradient: 'from-purple-700 to-indigo-900',accentColor: 'purple-500', tagline: 'Find Your Sound.',                                   ctaText: 'Book Lesson',        template: 'apex' },
      { gradient: 'from-indigo-700 to-purple-900',accentColor: 'indigo-500', tagline: 'Music Lessons That Inspire.',                        ctaText: 'Get Started',        template: 'flux' },
    ],
  },
  CHILDCARE: {
    variants: [
      { gradient: 'from-sky-500 to-indigo-700',   accentColor: 'sky-500',    tagline: 'Where Kids Thrive and Parents Trust.',               ctaText: 'Enroll Today',       template: 'flux' },
      { gradient: 'from-teal-500 to-sky-700',     accentColor: 'teal-500',   tagline: 'Safe. Fun. Educational.',                            ctaText: 'Schedule Tour',      template: 'modern' },
    ],
  },
  EVENT_PLANNING: {
    variants: [
      { gradient: 'from-rose-600 to-pink-900',    accentColor: 'rose-500',   tagline: 'Every Detail. Every Moment. Perfect.',               ctaText: 'Plan Your Event',    template: 'apex' },
      { gradient: 'from-fuchsia-600 to-rose-900', accentColor: 'fuchsia-500',tagline: 'Events That Leave an Impression.',                  ctaText: 'Get Started',        template: 'summit' },
    ],
  },
  TOWING: {
    variants: [
      { gradient: 'from-red-700 to-gray-900',     accentColor: 'red-600',    tagline: 'Stuck? We\'re There in Minutes.',                   ctaText: 'Call for Tow',       template: 'bold' },
      { gradient: 'from-yellow-600 to-red-900',   accentColor: 'yellow-500', tagline: '24/7 Roadside Rescue.',                              ctaText: 'Get Help Now',       template: 'forge' },
    ],
  },
  WELDING: {
    variants: [
      { gradient: 'from-orange-700 to-gray-900',  accentColor: 'orange-500', tagline: 'Precision Welds. Permanent Results.',                ctaText: 'Get Quote',          template: 'forge' },
      { gradient: 'from-amber-700 to-stone-900',  accentColor: 'amber-500',  tagline: 'Metal Work Done Right.',                             ctaText: 'Request Estimate',   template: 'bold-b' },
    ],
  },
  EXCAVATION: {
    variants: [
      { gradient: 'from-amber-700 to-stone-900',  accentColor: 'amber-600',  tagline: 'Ground Work That Stands the Test.',                  ctaText: 'Get Quote',          template: 'forge' },
      { gradient: 'from-stone-700 to-amber-900',  accentColor: 'orange-500', tagline: 'Dig Deep. Build Strong.',                            ctaText: 'Free Estimate',      template: 'classic' },
    ],
  },
  SEPTIC: {
    variants: [
      { gradient: 'from-green-700 to-emerald-900',accentColor: 'green-600',  tagline: 'Septic Systems That Just Work.',                     ctaText: 'Schedule Service',   template: 'classic' },
      { gradient: 'from-emerald-700 to-green-900',accentColor: 'emerald-500',tagline: 'Underground Solutions. Above-Ground Trust.',         ctaText: 'Get Estimate',       template: 'forge' },
    ],
  },
  INSULATION: {
    variants: [
      { gradient: 'from-green-600 to-teal-800',   accentColor: 'green-500',  tagline: 'Comfort Starts Behind the Walls.',                   ctaText: 'Get Estimate',       template: 'modern' },
      { gradient: 'from-teal-600 to-green-800',   accentColor: 'teal-500',   tagline: 'Energy Savings. Year Round.',                        ctaText: 'Free Assessment',    template: 'flux' },
    ],
  },
  SIDING: {
    variants: [
      { gradient: 'from-slate-700 to-gray-900',   accentColor: 'sky-500',    tagline: 'Curb Appeal That Lasts Decades.',                    ctaText: 'Get Quote',          template: 'classic' },
      { gradient: 'from-gray-700 to-slate-900',   accentColor: 'amber-500',  tagline: 'Protect. Beautify. Transform.',                      ctaText: 'Free Estimate',      template: 'apex' },
    ],
  },
  MASONRY: {
    variants: [
      { gradient: 'from-stone-700 to-stone-900',  accentColor: 'amber-500',  tagline: 'Stonework Built to Endure.',                         ctaText: 'Get Estimate',       template: 'classic' },
      { gradient: 'from-amber-700 to-stone-900',  accentColor: 'amber-600',  tagline: 'Bricks and Mortar. Skill and Pride.',                ctaText: 'Request Quote',      template: 'forge' },
    ],
  },
  DRYWALL: {
    variants: [
      { gradient: 'from-gray-600 to-gray-900',    accentColor: 'sky-500',    tagline: 'Smooth Walls. Flawless Finish.',                     ctaText: 'Get Estimate',       template: 'classic' },
      { gradient: 'from-slate-600 to-gray-900',   accentColor: 'amber-500',  tagline: 'From Frame to Finish.',                              ctaText: 'Book Service',       template: 'forge' },
    ],
  },
  APPLIANCE_REPAIR: {
    variants: [
      { gradient: 'from-blue-700 to-slate-900',   accentColor: 'blue-500',   tagline: 'Appliances Fixed Fast.',                             ctaText: 'Schedule Repair',    template: 'bold' },
      { gradient: 'from-slate-700 to-blue-900',   accentColor: 'sky-500',    tagline: 'Same-Day Fixes. Lasting Results.',                   ctaText: 'Book Now',           template: 'flux' },
    ],
  },
  JUNK_REMOVAL: {
    variants: [
      { gradient: 'from-green-700 to-emerald-900',accentColor: 'green-500',  tagline: 'Clutter Gone. Space Reclaimed.',                     ctaText: 'Book Pickup',        template: 'bold' },
      { gradient: 'from-emerald-600 to-teal-900', accentColor: 'emerald-500',tagline: 'Fast. Clean. Affordable.',                           ctaText: 'Get Quote',          template: 'flux' },
    ],
  },
  PAVING: {
    variants: [
      { gradient: 'from-gray-700 to-gray-900',    accentColor: 'amber-500',  tagline: 'Smooth Driveways. Solid Craftsmanship.',             ctaText: 'Get Estimate',       template: 'forge' },
      { gradient: 'from-stone-700 to-gray-900',   accentColor: 'orange-500', tagline: 'Pavement That Performs.',                             ctaText: 'Free Quote',         template: 'classic' },
    ],
  },
  WATER_TREATMENT: {
    variants: [
      { gradient: 'from-cyan-700 to-blue-900',    accentColor: 'cyan-500',   tagline: 'Clean Water. Healthy Home.',                         ctaText: 'Free Water Test',    template: 'modern' },
      { gradient: 'from-blue-600 to-cyan-900',    accentColor: 'blue-500',   tagline: 'Pure Water Solutions.',                               ctaText: 'Get Started',        template: 'flux' },
    ],
  },
  CHIMNEY: {
    variants: [
      { gradient: 'from-stone-700 to-stone-900',  accentColor: 'amber-600',  tagline: 'Safe Chimneys. Warm Homes.',                         ctaText: 'Schedule Sweep',     template: 'classic' },
      { gradient: 'from-gray-700 to-stone-900',   accentColor: 'red-500',    tagline: 'Chimney Care Done Right.',                            ctaText: 'Book Inspection',    template: 'forge' },
    ],
  },
}

const defaultVariants: IndustryVariants = {
  variants: [
    { gradient: 'from-gray-700 to-gray-900',    accentColor: 'gray-600',   tagline: 'Trusted Locally. Proven by Results.', ctaText: 'Contact Us', template: 'classic' },
    { gradient: 'from-slate-700 to-slate-900',  accentColor: 'blue-500',   tagline: 'The Service Your Property Deserves',  ctaText: 'Get Quote',  template: 'classic-b' },
    { gradient: 'from-gray-600 to-gray-900',    accentColor: 'emerald-500',tagline: 'Professional Service. Reliable Results.',ctaText: 'Get Started',template: 'flux' },
    { gradient: 'from-stone-700 to-gray-900',   accentColor: 'amber-500',  tagline: 'Quality Work. Fair Prices.',           ctaText: 'Get Quote',  template: 'forge' },
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
