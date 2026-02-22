'use client'

import type { TemplateTheme } from '../config/template-types'
import ScrollReveal from './ScrollReveal'

const DEFAULT_BRANDS: Record<string, string[]> = {
  roofing: ['GAF', 'Owens Corning', 'CertainTeed', 'TAMKO', 'Atlas'],
  hvac: ['Carrier', 'Trane', 'Lennox', 'Rheem', 'Goodman'],
  plumbing: ['Moen', 'Delta', 'Kohler', 'Rinnai', 'AO Smith'],
  electrical: ['Square D', 'Eaton', 'Leviton', 'Lutron', 'Siemens'],
  landscaping: ['STIHL', 'Husqvarna', 'John Deere', 'Toro', 'Hunter'],
  painting: ['Benjamin Moore', 'Sherwin-Williams', 'PPG', 'Behr', 'Dunn-Edwards'],
  default: ['Industry Leading', 'Premium Materials', 'Top Brands', 'Quality Products', 'Trusted Suppliers'],
}

interface BrandsStripProps {
  brandNames?: string[]
  industry?: string
  theme: TemplateTheme
}

export default function BrandsStrip({ brandNames, industry, theme }: BrandsStripProps) {
  const brands =
    brandNames && brandNames.length > 0
      ? brandNames
      : industry
        ? DEFAULT_BRANDS[industry.toLowerCase()] || DEFAULT_BRANDS.default
        : DEFAULT_BRANDS.default

  const pillClass = {
    modern: 'border border-gray-200 bg-gray-50 text-gray-700',
    bold: 'border border-gray-700 bg-gray-800/50 text-gray-300',
    classic: 'border border-stone-200 bg-stone-50 text-stone-700',
    premium: 'border border-gray-700 bg-gray-800/50 text-gray-400',
  }[theme]

  const headingColor = {
    modern: 'text-gray-400',
    bold: 'text-gray-500',
    classic: 'text-stone-400',
    premium: 'text-gray-500',
  }[theme]

  return (
    <section className="py-10 sm:py-12 px-4 sm:px-6 md:px-8">
      <ScrollReveal animation="fade-in">
        <div className="max-w-5xl mx-auto text-center">
          <p className={`text-xs font-semibold uppercase tracking-widest ${headingColor}`}>
            TRUSTED BRANDS &amp; MATERIALS
          </p>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mt-4">
            {brands.map((brand) => (
              <span
                key={brand}
                className={`px-4 py-2 rounded-full text-sm font-medium ${pillClass}`}
              >
                {brand}
              </span>
            ))}
          </div>
        </div>
      </ScrollReveal>
    </section>
  )
}
