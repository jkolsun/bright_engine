'use client'

import {
  Wrench, Paintbrush, Trees, Sparkles, Zap, Flame, Home, Bug,
  Scale, Briefcase, Monitor, Heart, Building, Scissors, Dumbbell,
  Camera, UtensilsCrossed, Truck, Layers, Fence, HardHat, Sun,
  Droplets, Wind, Shield,
} from 'lucide-react'

/** Maps industry to a relevant icon for the gradient placeholder */
const INDUSTRY_ICONS: Record<string, any> = {
  PLUMBING: Droplets,
  PAINTING: Paintbrush,
  LANDSCAPING: Trees,
  CLEANING: Sparkles,
  HVAC: Wind,
  RESTORATION: Shield,
  ELECTRICAL: Zap,
  ROOFING: Home,
  GENERAL_CONTRACTING: HardHat,
  CONSTRUCTION: HardHat,
  PEST_CONTROL: Bug,
  LAW: Scale,
  LAW_PRACTICE: Scale,
  LEGAL: Scale,
  LEGAL_SERVICES: Scale,
  CONSULTING: Briefcase,
  TECHNOLOGY: Monitor,
  HEALTHCARE: Heart,
  REAL_ESTATE: Building,
  DENTAL: Heart,
  FITNESS: Dumbbell,
  SALON: Scissors,
  RESTAURANT: UtensilsCrossed,
  PHOTOGRAPHY: Camera,
  MOVING: Truck,
  FLOORING: Layers,
  FENCING: Fence,
  CONCRETE: HardHat,
  TREE_SERVICE: Trees,
  SOLAR: Sun,
  POOL: Droplets,
  AUTO_REPAIR: Wrench,
  GARAGE_DOOR: Home,
  WINDOW: Home,
}

interface GradientPlaceholderProps {
  accent: string
  industry?: string
  serviceName?: string
  className?: string
  style?: React.CSSProperties
  aspectRatio?: string
  height?: string | number
  variant?: 'light' | 'dark'
  /** Index used to vary the gradient angle */
  index?: number
}

/**
 * Beautiful industry-specific gradient placeholder.
 * Replaces the ugly camera icon placeholder with a professional-looking design.
 * Uses accent color gradients, subtle patterns, and industry icons.
 */
export default function GradientPlaceholder({
  accent,
  industry = 'GENERAL_CONTRACTING',
  serviceName,
  className = '',
  style = {},
  aspectRatio = '4/3',
  height,
  variant = 'light',
  index = 0,
}: GradientPlaceholderProps) {
  const isDark = variant === 'dark'
  const Icon = INDUSTRY_ICONS[industry] || Wrench

  // Vary gradient angle based on index for visual variety
  const angles = [135, 160, 120, 145, 155, 130, 170, 140]
  const angle = angles[index % angles.length]

  // Create gradient based on accent color
  const bgGradient = isDark
    ? `linear-gradient(${angle}deg, rgba(20,20,20,0.95) 0%, rgba(30,30,30,0.9) 40%, ${accent}15 100%)`
    : `linear-gradient(${angle}deg, ${accent}08 0%, ${accent}18 40%, ${accent}28 100%)`

  // Subtle geometric pattern via CSS
  const patternBg = isDark
    ? `radial-gradient(circle at 25% 75%, ${accent}10 1px, transparent 1px), radial-gradient(circle at 75% 25%, ${accent}08 1px, transparent 1px)`
    : `radial-gradient(circle at 25% 75%, ${accent}15 1px, transparent 1px), radial-gradient(circle at 75% 25%, ${accent}10 1px, transparent 1px)`

  const iconColor = isDark ? `${accent}40` : `${accent}50`

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        background: bgGradient,
        ...(aspectRatio ? { aspectRatio } : {}),
        ...(height ? { height } : {}),
        ...style,
      }}
    >
      {/* Dot pattern overlay */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: patternBg,
          backgroundSize: '32px 32px',
          opacity: 0.6,
        }}
      />

      {/* Decorative accent line */}
      <div
        className="absolute"
        style={{
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          background: `linear-gradient(90deg, transparent 0%, ${accent} 50%, transparent 100%)`,
          opacity: 0.4,
        }}
      />

      {/* Centered industry icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div style={{ opacity: 0.25 }}>
          <Icon size={48} style={{ color: iconColor }} strokeWidth={1.5} />
        </div>
      </div>

      {/* Service name watermark */}
      {serviceName && (
        <div
          className="absolute bottom-4 left-4 right-4"
          style={{
            fontWeight: 700,
            fontSize: 'clamp(11px, 1.5vw, 14px)',
            color: isDark ? 'rgba(255,255,255,0.08)' : `${accent}15`,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
          }}
        >
          {serviceName}
        </div>
      )}
    </div>
  )
}
