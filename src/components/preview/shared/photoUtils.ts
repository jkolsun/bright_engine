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
