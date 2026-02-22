'use client'

import { useEffect, useState, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

interface PhotoLightboxProps {
  photos: string[]
  initialIndex?: number
  isOpen: boolean
  onClose: () => void
}

export default function PhotoLightbox({
  photos,
  initialIndex = 0,
  isOpen,
  onClose,
}: PhotoLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  // Reset to initialIndex when lightbox opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex)
    }
  }, [isOpen, initialIndex])

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1))
  }, [])

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => Math.min(photos.length - 1, prev + 1))
  }, [photos.length])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') goToPrev()
      if (e.key === 'ArrowRight') goToNext()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, goToPrev, goToNext])

  if (!isOpen) return null

  const isFirst = currentIndex === 0
  const isLast = currentIndex === photos.length - 1

  return (
    <div
      className="fixed inset-0 z-[9998] bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-12 h-12 flex items-center justify-center text-white hover:text-gray-300 transition-colors"
        aria-label="Close lightbox"
      >
        <X size={28} />
      </button>

      {/* Previous arrow */}
      {!isFirst && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            goToPrev()
          }}
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 flex items-center justify-center text-white hover:text-gray-300 transition-colors"
          aria-label="Previous photo"
        >
          <ChevronLeft size={32} />
        </button>
      )}

      {/* Next arrow */}
      {!isLast && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            goToNext()
          }}
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 flex items-center justify-center text-white hover:text-gray-300 transition-colors"
          aria-label="Next photo"
        >
          <ChevronRight size={32} />
        </button>
      )}

      {/* Center image */}
      <div
        className="absolute inset-0 flex items-center justify-center p-12 sm:p-16"
        onClick={onClose}
      >
        <img
          key={currentIndex}
          src={photos[currentIndex]}
          alt={`Photo ${currentIndex + 1} of ${photos.length}`}
          className="max-h-[80vh] max-w-[90vw] object-contain mx-auto rounded-lg animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Image counter */}
      {photos.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white text-sm">
          {currentIndex + 1} / {photos.length}
        </div>
      )}
    </div>
  )
}
