'use client'

import { useEffect, useRef } from 'react'

interface SmoothScrollProps {
  children: React.ReactNode
  duration?: number
}

/**
 * Lenis smooth scroll wrapper. Initializes on mount, cleans up on unmount.
 * For static HTML snapshots, the CDN script handles initialization.
 */
export default function SmoothScroll({ children, duration = 1.2 }: SmoothScrollProps) {
  const lenisRef = useRef<any>(null)

  useEffect(() => {
    let raf: number
    let lenis: any

    async function init() {
      try {
        const Lenis = (await import('lenis')).default
        lenis = new Lenis({
          duration,
          easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          touchMultiplier: 2,
          infinite: false,
        })
        lenisRef.current = lenis

        function animate(time: number) {
          lenis.raf(time)
          raf = requestAnimationFrame(animate)
        }
        raf = requestAnimationFrame(animate)
      } catch {
        // Lenis not available — degrade gracefully
      }
    }

    init()

    return () => {
      if (raf) cancelAnimationFrame(raf)
      lenis?.destroy()
    }
  }, [duration])

  return <div data-lenis-root>{children}</div>
}
