'use client'

import { useEffect, useRef, useState } from 'react'

type Animation = 'fade-up' | 'fade-in' | 'fade-left' | 'fade-right' | 'zoom-in' | 'fade-up-slow'

interface ScrollRevealProps {
  children: React.ReactNode
  animation?: Animation
  delay?: number
  duration?: number
  className?: string
  /** Distance in px for translate animations */
  distance?: number
  /** Trigger threshold (0-1) — portion of element visible before animating */
  threshold?: number
  /** Once visible, stay visible (default true) */
  once?: boolean
}

const animationStyles: Record<Animation, { hidden: React.CSSProperties; visible: React.CSSProperties }> = {
  'fade-up': {
    hidden: { opacity: 0, transform: 'translateY(40px)' },
    visible: { opacity: 1, transform: 'translateY(0)' },
  },
  'fade-up-slow': {
    hidden: { opacity: 0, transform: 'translateY(60px)' },
    visible: { opacity: 1, transform: 'translateY(0)' },
  },
  'fade-in': {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  'fade-left': {
    hidden: { opacity: 0, transform: 'translateX(-40px)' },
    visible: { opacity: 1, transform: 'translateX(0)' },
  },
  'fade-right': {
    hidden: { opacity: 0, transform: 'translateX(40px)' },
    visible: { opacity: 1, transform: 'translateX(0)' },
  },
  'zoom-in': {
    hidden: { opacity: 0, transform: 'scale(0.92)' },
    visible: { opacity: 1, transform: 'scale(1)' },
  },
}

export default function ScrollReveal({
  children,
  animation = 'fade-up',
  delay = 0,
  duration = 700,
  className = '',
  threshold = 0.15,
  once = true,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          if (once) observer.unobserve(el)
        } else if (!once) {
          setIsVisible(false)
        }
      },
      { threshold, rootMargin: '0px 0px -40px 0px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold, once])

  const anim = animationStyles[animation]

  return (
    <div
      ref={ref}
      className={className}
      style={{
        ...anim.hidden,
        ...(isVisible ? anim.visible : {}),
        transition: `opacity ${duration}ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms, transform ${duration}ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  )
}
