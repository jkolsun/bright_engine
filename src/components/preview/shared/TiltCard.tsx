'use client'

import { useEffect, useRef } from 'react'

interface TiltCardProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  max?: number
  speed?: number
  glare?: boolean
  maxGlare?: number
  scale?: number
}

/**
 * Vanilla Tilt 3D card effect wrapper.
 * Adds a subtle 3D perspective tilt on mouse hover.
 * For static HTML: adds data-tilt attribute so CDN script auto-initializes.
 */
export default function TiltCard({
  children,
  className = '',
  style = {},
  max = 8,
  speed = 400,
  glare = true,
  maxGlare = 0.15,
  scale = 1.02,
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let tilt: any

    async function init() {
      try {
        const VanillaTilt = (await import('vanilla-tilt')).default
        if (!ref.current) return

        VanillaTilt.init(ref.current, {
          max,
          speed,
          glare,
          'max-glare': maxGlare,
          scale,
        })
      } catch {
        // vanilla-tilt not available — graceful degradation
      }
    }

    init()

    return () => {
      if (ref.current) {
        tilt = (ref.current as any)?.vanillaTilt
        tilt?.destroy()
      }
    }
  }, [max, speed, glare, maxGlare, scale])

  return (
    <div
      ref={ref}
      className={className}
      style={{ transformStyle: 'preserve-3d', ...style }}
      data-tilt
      data-tilt-max={max}
      data-tilt-speed={speed}
      data-tilt-glare={glare}
      data-tilt-max-glare={maxGlare}
      data-tilt-scale={scale}
    >
      {children}
    </div>
  )
}
