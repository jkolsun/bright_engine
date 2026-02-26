'use client'
/*
 * ATELIER TEMPLATE — Coming Soon
 * Premium-C template placeholder while we rebuild
 */

import type { TemplateProps } from '../config/template-types'

export default function PremiumCTemplate({ lead, config }: TemplateProps) {
  const name = lead.companyName || 'Premium'

  return (
    <div className="preview-template" style={{ background: '#FFFCF7', color: '#3D3832', minHeight: '100vh', fontFamily: "'Inter', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ maxWidth: 480, padding: '40px 24px' }}>
        <div style={{ fontSize: 11, letterSpacing: 6, textTransform: 'uppercase' as const, color: '#A89F93', marginBottom: 24 }}>Atelier Template</div>
        <h1 style={{ fontFamily: "'Georgia', serif", fontSize: 'clamp(28px,5vw,42px)', fontWeight: 400, color: '#3D3832', marginBottom: 16, letterSpacing: -0.5 }}>Coming Soon</h1>
        <div style={{ width: 48, height: 1, background: '#E0D8CC', margin: '0 auto 24px' }} />
        <p style={{ fontSize: 15, color: '#A89F93', lineHeight: 1.7 }}>
          The premium Atelier template for <strong style={{ color: '#3D3832' }}>{name}</strong> is being rebuilt with an elevated design. Check back shortly.
        </p>
      </div>
    </div>
  )
}
