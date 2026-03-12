/**
 * Distributes enrichedPhotos across template pages for visual variety.
 * Photos are assigned to maximize coverage without duplicating on the same page.
 * portfolioPhotos always gets ALL photos (portfolio page is the full gallery).
 */
export function distributePhotos(photos: string[]): {
  serviceHero: string | undefined
  serviceAccents: string[]
  aboutPhoto: string | undefined
  galleryPhotos: string[]
} {
  if (!photos || photos.length === 0) {
    return { serviceHero: undefined, serviceAccents: [], aboutPhoto: undefined, galleryPhotos: [] }
  }

  return {
    serviceHero: photos[0],
    serviceAccents: photos.slice(1, 4),
    aboutPhoto: photos.length > 1 ? photos[Math.min(4, photos.length - 1)] : undefined,
    galleryPhotos: photos, // Portfolio page always gets all photos
  }
}

/**
 * Resolve the best available image for a service card.
 * Priority: enriched photo > stock photo > undefined (will use gradient placeholder)
 */
export function resolveServiceImage(
  serviceName: string,
  index: number,
  enrichedPhotos: string[],
  stockPhotos?: { servicePhotos?: Record<string, string[]>; heroPhoto?: string },
): string | undefined {
  // 1. Try enriched photo (cycle through available)
  if (enrichedPhotos.length > 0) {
    return enrichedPhotos[index % enrichedPhotos.length]
  }
  // 2. Try stock photo for this specific service
  const stockForService = stockPhotos?.servicePhotos?.[serviceName]
  if (stockForService && stockForService.length > 0) {
    return stockForService[0]
  }
  // 3. Try hero photo as fallback for first service
  if (index === 0 && stockPhotos?.heroPhoto) {
    return stockPhotos.heroPhoto
  }
  // 4. No image available — template will use GradientPlaceholder
  return undefined
}
