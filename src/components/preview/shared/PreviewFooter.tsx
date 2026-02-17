import type { TemplateVariant } from '../config/template-types'

interface PreviewFooterProps {
  variant: TemplateVariant
  companyName: string
  city: string
  state: string
  industry: string
}

export default function PreviewFooter({ variant, companyName, city, state, industry }: PreviewFooterProps) {
  const location = [city, state].filter(Boolean).join(', ')
  const industryLabel = industry.toLowerCase().replace(/_/g, ' ')
  const year = new Date().getFullYear()

  if (variant === 'modern') {
    return (
      <footer className="bg-gray-100 py-8 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-gray-600 text-sm mb-1">&copy; {year} {companyName}. All rights reserved.</p>
          {location && <p className="text-gray-400 text-xs">{location} &bull; Professional {industryLabel} services</p>}
        </div>
      </footer>
    )
  }

  if (variant === 'bold') {
    return (
      <footer className="bg-black py-8 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-gray-400 text-sm mb-1">&copy; {year} {companyName}</p>
          {location && <p className="text-gray-600 text-xs">{location} &bull; Professional {industryLabel} services</p>}
        </div>
      </footer>
    )
  }

  if (variant === 'premium') {
    return (
      <footer className="bg-black py-10 px-4 border-t border-amber-500/10">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-amber-400/60 text-sm tracking-wide mb-1">{companyName}</p>
          <p className="text-gray-600 text-xs">&copy; {year} &bull; {location && `${location} &bull; `}{industryLabel}</p>
        </div>
      </footer>
    )
  }

  // classic
  return (
    <footer className="bg-stone-900 py-8 px-4">
      <div className="max-w-6xl mx-auto text-center">
        <p className="text-stone-300 text-sm mb-1">&copy; {year} {companyName}. All rights reserved.</p>
        {location && <p className="text-stone-500 text-xs">{location} &bull; Professional {industryLabel} services</p>}
      </div>
    </footer>
  )
}
