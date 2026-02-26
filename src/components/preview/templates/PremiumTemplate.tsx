'use client'
/*
 * SOVEREIGN TEMPLATE — Coming Soon
 * Premium template placeholder while we rebuild
 */

import type { TemplateProps } from '../config/template-types'

export default function PremiumTemplate({ lead, config }: TemplateProps) {
  const name = lead.companyName || 'Premium'

  return (
    <div className="preview-template" style={{ background: '#0C0C0E', color: '#D4D0C8', minHeight: '100vh', fontFamily: "'Inter', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ maxWidth: 480, padding: '40px 24px' }}>
        <div style={{ fontSize: 11, letterSpacing: 6, textTransform: 'uppercase' as const, color: '#6B7280', marginBottom: 24 }}>Sovereign Template</div>
        <h1 style={{ fontFamily: "'Georgia', serif", fontSize: 'clamp(28px,5vw,42px)', fontWeight: 400, color: '#fff', marginBottom: 16, letterSpacing: -0.5 }}>Coming Soon</h1>
        <div style={{ width: 48, height: 1, background: '#333', margin: '0 auto 24px' }} />
        <p style={{ fontSize: 15, color: '#6B7280', lineHeight: 1.7 }}>
          The premium Sovereign template for <strong style={{ color: '#fff' }}>{name}</strong> is being rebuilt with an elevated design. Check back shortly.
        </p>
      </div>
    </div>
  )
}