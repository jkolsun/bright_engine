'use client'

import { useEffect, useRef, useState } from 'react'

interface ServiceSwiperProps {
  children: React.ReactNode
  slidesPerView?: number
  spaceBetween?: number
  autoplay?: boolean
  loop?: boolean
  accent?: string
}

/**
 * Swiper carousel wrapper for service cards.
 * Renders the correct HTML structure so both React preview and static HTML CDN init work.
 */
export default function ServiceSwiper({
  children,
  slidesPerView = 3,
  spaceBetween = 24,
  autoplay = true,
  loop = true,
  accent = '#000',
}: ServiceSwiperProps) {
  const swiperRef = useRef<HTMLDivElement>(null)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    let swiper: any

    async function init() {
      try {
        const { default: Swiper } = await import('swiper')
        const { Navigation, Pagination, Autoplay } = await import('swiper/modules')

        // Import Swiper styles
        await import('swiper/css')
        await import('swiper/css/navigation')
        await import('swiper/css/pagination')

        if (!swiperRef.current) return

        swiper = new Swiper(swiperRef.current, {
          modules: [Navigation, Pagination, Autoplay],
          slidesPerView: 1,
          spaceBetween,
          loop,
          grabCursor: true,
          autoplay: autoplay ? { delay: 4000, disableOnInteraction: false } : false,
          pagination: {
            el: '.swiper-pagination',
            clickable: true,
          },
          navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
          },
          breakpoints: {
            640: { slidesPerView: Math.min(2, slidesPerView) },
            1024: { slidesPerView },
          },
        })
        setInitialized(true)
      } catch {
        // Swiper not available — render as static grid
      }
    }

    init()
    return () => swiper?.destroy()
  }, [slidesPerView, spaceBetween, autoplay, loop])

  return (
    <div
      ref={swiperRef}
      className="swiper"
      data-swiper-slides-per-view={slidesPerView}
      data-swiper-space-between={spaceBetween}
      data-swiper-autoplay={autoplay ? 'true' : 'false'}
      data-swiper-loop={loop ? 'true' : 'false'}
    >
      <div className="swiper-wrapper">
        {children}
      </div>
      <div className="swiper-pagination" />
      <div className="swiper-button-prev" style={{ color: accent }} />
      <div className="swiper-button-next" style={{ color: accent }} />

      {/* Custom styles for Swiper pagination */}
      <style dangerouslySetInnerHTML={{ __html: `
        .swiper-pagination-bullet-active { background: ${accent} !important; }
        .swiper-button-prev, .swiper-button-next { --swiper-navigation-size: 28px; }
        .swiper-button-prev::after, .swiper-button-next::after { font-size: 18px; font-weight: 700; }
      `}} />
    </div>
  )
}

/** Wrap each service card in this to make it a Swiper slide */
export function SwiperSlide({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`swiper-slide ${className}`}>{children}</div>
}
