'use client'
/*
 * MERIDIAN TEMPLATE — Coming Soon
 * Premium-B template placeholder while we rebuild
 */

import type { TemplateProps } from '../config/template-types'

export default function PremiumBTemplate({ lead, config }: TemplateProps) {
  const name = lead.companyName || 'Premium'

  return (
    <div className="preview-template" style={{ background: '#0A0E1A', color: '#C5CAD8', minHeight: '100vh', fontFamily: "'Inter', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ maxWidth: 480, padding: '40px 24px' }}>
        <div style={{ fontSize: 11, letterSpacing: 6, textTransform: 'uppercase' as const, color: '#8A91A4', marginBottom: 24 }}>Meridian Template</div>
        <h1 style={{ fontFamily: "'Georgia', serif", fontSize: 'clamp(28px,5vw,42px)', fontWeight: 400, color: '#fff', marginBottom: 16, letterSpacing: -0.5 }}>Coming Soon</h1>
        <div style={{ width: 48, height: 1, background: '#1E2640', margin: '0 auto 24px' }} />
        <p style={{ fontSize: 15, color: '#8A91A4', lineHeight: 1.7 }}>
          The premium Meridian template for <strong style={{ color: '#fff' }}>{name}</strong> is being rebuilt with an elevated design. Check back shortly.
        </p>
      </div>
    </div>
  )
}