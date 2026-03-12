'use client'

import { useEffect, useRef, useState } from 'react'

type Animation =
  | 'fade-up' | 'fade-in' | 'fade-left' | 'fade-right' | 'zoom-in' | 'fade-up-slow'
  | 'slide-up' | 'scale-fade' | 'blur-in' | 'rotate-in' | 'clip-reveal'

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
  // New premium animation types
  'slide-up': {
    hidden: { opacity: 0, transform: 'translateY(80px)' },
    visible: { opacity: 1, transform: 'translateY(0)' },
  },
  'scale-fade': {
    hidden: { opacity: 0, transform: 'scale(0.8)' },
    visible: { opacity: 1, transform: 'scale(1)' },
  },
  'blur-in': {
    hidden: { opacity: 0, filter: 'blur(8px)' },
    visible: { opacity: 1, filter: 'blur(0px)' },
  },
  'rotate-in': {
    hidden: { opacity: 0, transform: 'rotate(-3deg) translateY(30px)' },
    visible: { opacity: 1, transform: 'rotate(0deg) translateY(0)' },
  },
  'clip-reveal': {
    hidden: { clipPath: 'inset(0 100% 0 0)' },
    visible: { clipPath: 'inset(0 0 0 0)' },
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

  // Build transition string covering all animated properties
  const ease = `cubic-bezier(0.22, 1, 0.36, 1)`
  const transitionProps = [
    `opacity ${duration}ms ${ease} ${delay}ms`,
    `transform ${duration}ms ${ease} ${delay}ms`,
    `filter ${duration}ms ${ease} ${delay}ms`,
    `clip-path ${duration}ms ${ease} ${delay}ms`,
  ].join(', ')

  return (
    <div
      ref={ref}
      className={className}
      style={{
        ...anim.hidden,
        ...(isVisible ? anim.visible : {}),
        transition: transitionProps,
        willChange: 'opacity, transform, filter, clip-path',
      }}
    >
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  StaggeredReveal — wraps multiple children with cascading delays   */
/* ------------------------------------------------------------------ */

interface StaggeredRevealProps {
  children: React.ReactNode[]
  animation?: Animation
  staggerMs?: number
  duration?: number
  className?: string
  itemClassName?: string
}

/**
 * Wraps an array of children with staggered scroll-reveal animations.
 * Creates a beautiful cascade/waterfall effect for grid items.
 */
export function StaggeredReveal({
  children,
  animation = 'fade-up',
  staggerMs = 100,
  duration = 700,
  className = '',
  itemClassName = '',
}: StaggeredRevealProps) {
  return (
    <div className={className}>
      {children.map((child, i) => (
        <ScrollReveal
          key={i}
          animation={animation}
          delay={i * staggerMs}
          duration={duration}
          className={itemClassName}
        >
          {child}
        </ScrollReveal>
      ))}
    </div>
  )
}
