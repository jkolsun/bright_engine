'use client'

import { Camera } from 'lucide-react'

interface PhotoPlaceholderProps {
  accent: string
  aspectRatio?: string
  height?: string | number
  className?: string
  style?: React.CSSProperties
  iconSize?: number
  variant?: 'light' | 'dark'
}

export default function PhotoPlaceholder({
  accent,
  aspectRatio,
  height,
  className = '',
  style = {},
  iconSize = 40,
  variant = 'light',
}: PhotoPlaceholderProps) {
  const isDark = variant === 'dark'
  const bg = isDark
    ? `linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.07) 100%)`
    : `linear-gradient(135deg, ${accent}08 0%, ${accent}18 100%)`
  const iconColor = isDark ? 'rgba(255,255,255,0.15)' : `${accent}40`
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : `${accent}20`

  return (
    <div
      className={className}
      style={{
        background: bg,
        border: `1.5px dashed ${borderColor}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        ...(aspectRatio ? { aspectRatio } : {}),
        ...(height ? { height } : {}),
        ...style,
      }}
    >
      <Camera size={iconSize} style={{ color: iconColor }} />
    </div>
  )
}
