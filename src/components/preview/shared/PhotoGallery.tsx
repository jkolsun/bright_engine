import type { TemplateVariant } from '../config/template-types'

interface PhotoGalleryProps {
  variant: TemplateVariant
  photos: string[]
  companyName: string
}

export default function PhotoGallery({ variant, photos, companyName }: PhotoGalleryProps) {
  if (photos.length === 0) return null
  const items = photos.slice(0, 8)

  if (variant === 'modern') {
    return (
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">Our Work</h2>
          <p className="text-gray-500 text-center mb-10">See what we can do</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((photo, i) => (
              <div key={i} className="aspect-square bg-gray-100 rounded-xl overflow-hidden hover:scale-[1.02] transition-transform">
                <img src={photo} alt={`${companyName} work ${i + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (variant === 'bold') {
    return (
      <section className="py-16 px-4 bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">Our Work</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {items.map((photo, i) => (
              <div key={i} className="aspect-square bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                <img src={photo} alt={`${companyName} work ${i + 1}`} className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (variant === 'premium') {
    return (
      <section className="py-16 px-4 bg-gray-950">
        <div className="max-w-6xl mx-auto">
          <p className="text-sm uppercase tracking-widest text-amber-400/70 text-center mb-2">Portfolio</p>
          <h2 className="text-3xl font-light text-white mb-10 text-center">Our Work</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {items.map((photo, i) => (
              <div key={i} className="aspect-square bg-gray-900 rounded-lg overflow-hidden border border-gray-800 hover:border-amber-500/30 transition-colors">
                <img src={photo} alt={`${companyName} work ${i + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  // classic
  return (
    <section className="py-16 px-4 bg-stone-50">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-stone-900 mb-8 text-center">Our Work</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((photo, i) => (
            <div key={i} className="aspect-square bg-stone-200 rounded-md overflow-hidden border border-stone-300">
              <img src={photo} alt={`${companyName} work ${i + 1}`} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
