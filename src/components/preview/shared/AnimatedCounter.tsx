'use client'

import { useEffect, useRef, useState } from 'react'

interface AnimatedCounterProps {
  value: number
  suffix?: string
  prefix?: string
  duration?: number
  className?: string
}

export default function AnimatedCounter({
  value,
  suffix = '',
  prefix = '',
  duration = 1500,
  className = '',
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const [currentValue, setCurrentValue] = useState(0)
  const [hasAnimated, setHasAnimated] = useState(false)

  const hasDecimals = value % 1 !== 0

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true)
          observer.unobserve(el)
        }
      },
      { threshold: 0.3 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [hasAnimated])

  useEffect(() => {
    if (!hasAnimated) return

    let startTime: number | null = null
    let rafId: number

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const elapsed = timestamp - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = easeOutCubic(progress)

      setCurrentValue(easedProgress * value)

      if (progress < 1) {
        rafId = requestAnimationFrame(animate)
      } else {
        setCurrentValue(value)
      }
    }

    rafId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafId)
  }, [hasAnimated, value, duration])

  const displayValue = hasDecimals
    ? currentValue.toFixed(1)
    : Math.round(currentValue).toString()

  return (
    <span ref={ref} className={className}>
      {prefix}{displayValue}{suffix}
    </span>
  )
}
