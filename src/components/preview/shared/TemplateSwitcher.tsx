'use client'

import { useState } from 'react'
import { Palette, ChevronUp } from 'lucide-react'
import { TEMPLATE_DISPLAY_NAMES, COMING_SOON_TEMPLATES } from '../config/template-types'
import type { IndustryConfig } from '../config/template-types'

interface TemplateSwitcherProps {
  variants: IndustryConfig[]
  activeIndex: number
  onSwitch: (index: number) => void
}

export default function TemplateSwitcher({ variants, activeIndex, onSwitch }: TemplateSwitcherProps) {
  const [expanded, setExpanded] = useState(false)

  const activeName = TEMPLATE_DISPLAY_NAMES[variants[activeIndex].template] || 'Template'

  return (
    <div style={{ position: 'fixed', bottom: 80, left: 16, zIndex: 60 }}>
      {/* Expanded options */}
      {expanded && (
        <div style={{ marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {variants.map((v, i) => {
            const name = TEMPLATE_DISPLAY_NAMES[v.template] || v.template
            const comingSoon = COMING_SOON_TEMPLATES.has(v.template)
            const isActive = i === activeIndex

            return (
              <button
                key={v.template}
                onClick={() => {
                  if (comingSoon) return
                  onSwitch(i)
                  setExpanded(false)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 16px',
                  background: isActive ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.92)',
                  backdropFilter: 'blur(12px)',
                  border: isActive ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.08)',
                  borderRadius: 12,
                  cursor: comingSoon ? 'default' : 'pointer',
                  opacity: comingSoon ? 0.5 : 1,
                  color: isActive ? '#fff' : '#333',
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 500,
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                  transition: 'all 0.2s ease',
                  minWidth: 140,
                  whiteSpace: 'nowrap' as const,
                }}
              >
                <span style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: isActive ? '#4ade80' : 'transparent',
                  border: isActive ? 'none' : '1.5px solid #ccc',
                  flexShrink: 0,
                }} />
                {name}
                {comingSoon && (
                  <span style={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase' as const,
                    color: isActive ? 'rgba(255,255,255,0.5)' : '#999',
                    marginLeft: 'auto',
                  }}>
                    Soon
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Collapsed pill button */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 18px',
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: 999,
          cursor: 'pointer',
          color: '#333',
          fontSize: 13,
          fontWeight: 600,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
          transition: 'all 0.2s ease',
        }}
      >
        <Palette size={15} style={{ color: '#666' }} />
        <span>{activeName}</span>
        <ChevronUp
          size={14}
          style={{
            color: '#999',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
          }}
        />
      </button>
    </div>
  )
}
