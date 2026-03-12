'use client'

import ScrollReveal from './ScrollReveal'
import GradientPlaceholder from './GradientPlaceholder'
import CustomizationBadge from './CustomizationBadge'
import TiltCard from './TiltCard'
import type { PreviewLead, IndustryConfig } from '../config/template-types'
import { ArrowRight, CheckCircle, Phone, Sparkles } from 'lucide-react'

/* ================================================================== */
/*  Theme interface — each template provides its design tokens         */
/* ================================================================== */

export interface ServicePageTheme {
  accent: string
  fonts: { heading: string; body: string; mono: string }
  bgPrimary: string
  bgSecondary: string
  textPrimary: string
  textSecondary: string
  textMuted: string
  cardBg: string
  cardBorder: string
  isDark: boolean
  borderRadius: string
}

export interface ServiceData {
  name: string
  desc: string
  img?: string
}

/* ================================================================== */
/*  ServicePageContent — the main orchestrator                         */
/* ================================================================== */

interface ServicePageContentProps {
  services: ServiceData[]
  steps: Array<{ title: string; description: string }>
  whyUs: Array<{ title: string; description: string }>
  lead: PreviewLead
  config: IndustryConfig
  theme: ServicePageTheme
  onCTAClick: () => void
  onCallClick: () => void
  goToContact: () => void
}

const defaultSteps = [
  { title: 'Free Consultation', description: 'Tell us about your project and we\'ll provide a detailed estimate at no cost.' },
  { title: 'Custom Plan', description: 'We design a tailored approach that fits your timeline, budget, and goals.' },
  { title: 'Expert Execution', description: 'Our skilled team completes the work with attention to every detail.' },
  { title: 'Final Walkthrough', description: 'We walk through the finished project together to ensure your satisfaction.' },
]

export default function ServicePageContent({
  services, steps: rawSteps, whyUs, lead, config, theme, onCTAClick, onCallClick, goToContact,
}: ServicePageContentProps) {
  const { accent, fonts, bgPrimary, bgSecondary, textPrimary, textMuted, cardBg, cardBorder, isDark, borderRadius } = theme
  const steps = rawSteps.length > 0 ? rawSteps : defaultSteps
  const indLabel = lead.industry.replace(/_/g, ' ').toLowerCase()
  const loc = lead.city && lead.state ? `${lead.city}, ${lead.state}` : lead.city || ''

  const getLayout = (i: number, total: number): 'hero' | 'split' | 'overlay' | 'compact' => {
    if (i === 0) return 'hero'
    if (i <= 2) return 'split'
    if (i === 3 && total > 4) return 'overlay'
    return 'compact'
  }

  const handleCTA = () => { onCTAClick(); goToContact() }

  return (
    <>
      {/* ── Section Header ── */}
      <section style={{ padding: 'clamp(100px,14vh,160px) clamp(16px,4vw,48px) 48px', background: bgPrimary }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <ScrollReveal animation="blur-in">
            <p style={{ fontFamily: fonts.mono, fontSize: 12, color: accent, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>Our Services</p>
          </ScrollReveal>
          <ScrollReveal animation="slide-up" delay={100}>
            <h1 style={{ fontFamily: fonts.heading, fontSize: 'clamp(36px,6vw,72px)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 0.95, color: textPrimary, marginBottom: 20 }}>
              What we offer<span style={{ color: accent }}>.</span>
            </h1>
          </ScrollReveal>
          <ScrollReveal animation="fade-up" delay={200}>
            <p className="text-lg" style={{ color: textMuted, maxWidth: 560, lineHeight: 1.7 }}>
              Comprehensive {indLabel} services{loc ? ` in ${loc}` : ''} — backed by {lead.enrichedReviews || 'hundreds of'} five-star reviews.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Service Cards — Mixed Layouts ── */}
      <section style={{ padding: '0 clamp(16px,4vw,48px) clamp(48px,6vw,80px)', background: bgPrimary }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          {services.map((s, i) => {
            const layout = getLayout(i, services.length)
            const badge = i === 2 ? <CustomizationBadge key="badge" accent={accent} isDark={isDark} companyName={lead.companyName} /> : null

            return (
              <div key={`${s.name}-${i}`}>
                {badge}
                {layout === 'hero' && <HeroServiceCard service={s} theme={theme} index={i} industry={lead.industry} onCTA={handleCTA} />}
                {layout === 'split' && <SplitServiceCard service={s} theme={theme} index={i} industry={lead.industry} onCTA={handleCTA} />}
                {layout === 'overlay' && <OverlayServiceCard service={s} theme={theme} index={i} industry={lead.industry} onCTA={handleCTA} />}
                {layout === 'compact' && <CompactServiceCard service={s} theme={theme} index={i} industry={lead.industry} onCTA={handleCTA} />}
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Process Timeline ── */}
      <section style={{ padding: 'clamp(60px,8vw,100px) clamp(16px,4vw,48px)', background: bgSecondary }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <ScrollReveal animation="blur-in">
            <p style={{ fontFamily: fonts.mono, fontSize: 12, color: accent, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>Our Process</p>
          </ScrollReveal>
          <ScrollReveal animation="slide-up" delay={80}>
            <h2 style={{ fontFamily: fonts.heading, fontSize: 'clamp(28px,4vw,48px)', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 56, color: textPrimary }}>
              How it works<span style={{ color: accent }}>.</span>
            </h2>
          </ScrollReveal>

          {/* Desktop: Horizontal */}
          <div className="hidden md:block">
            <div className="relative" style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(steps.length, 4)}, 1fr)`, gap: 0 }}>
              <div className="absolute" style={{ top: 28, left: '6%', right: '6%', height: 2, background: `${accent}25`, zIndex: 0 }} />
              {steps.slice(0, 4).map((step, i) => (
                <ScrollReveal key={i} animation="scale-fade" delay={i * 150}>
                  <div className="text-center relative" style={{ zIndex: 2 }}>
                    <div className="w-14 h-14 mx-auto mb-5 flex items-center justify-center text-lg font-bold" style={{ background: accent, color: isDark ? '#000' : '#fff', borderRadius: borderRadius === '0px' ? '0' : '50%', fontFamily: fonts.mono, boxShadow: `0 0 0 6px ${bgSecondary}, 0 0 0 8px ${accent}30` }}>
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    <h4 style={{ fontFamily: fonts.heading, fontSize: 17, fontWeight: 700, marginBottom: 6, color: textPrimary }}>{step.title}</h4>
                    <p style={{ fontSize: 14, color: textMuted, lineHeight: 1.6, maxWidth: 200, margin: '0 auto' }}>{step.description}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>

          {/* Mobile: Vertical */}
          <div className="md:hidden flex flex-col gap-0">
            {steps.slice(0, 4).map((step, i) => (
              <ScrollReveal key={i} animation="fade-up" delay={i * 100}>
                <div className="flex gap-4 relative">
                  <div className="flex flex-col items-center">
                    <div className="w-11 h-11 flex-shrink-0 flex items-center justify-center text-sm font-bold" style={{ background: accent, color: isDark ? '#000' : '#fff', borderRadius: borderRadius === '0px' ? '0' : '50%', fontFamily: fonts.mono }}>
                      {i + 1}
                    </div>
                    {i < steps.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 32, background: `${accent}30` }} />}
                  </div>
                  <div className="pb-6">
                    <h4 style={{ fontFamily: fonts.heading, fontWeight: 700, color: textPrimary, marginBottom: 4 }}>{step.title}</h4>
                    <p style={{ fontSize: 14, color: textMuted, lineHeight: 1.6 }}>{step.description}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Choose Us ── */}
      {whyUs.length > 0 && (
        <section style={{ padding: 'clamp(60px,8vw,100px) clamp(16px,4vw,48px)', background: bgPrimary }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <ScrollReveal animation="blur-in">
              <p style={{ fontFamily: fonts.mono, fontSize: 12, color: accent, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8, textAlign: 'center' }}>Why Us</p>
            </ScrollReveal>
            <ScrollReveal animation="slide-up" delay={80}>
              <h2 style={{ fontFamily: fonts.heading, fontSize: 'clamp(28px,4vw,48px)', fontWeight: 700, marginBottom: 48, textAlign: 'center', color: textPrimary }}>
                Why choose {lead.companyName}<span style={{ color: accent }}>.</span>
              </h2>
            </ScrollReveal>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {whyUs.slice(0, 3).map((item, i) => (
                <ScrollReveal key={i} animation="scale-fade" delay={i * 100}>
                  <TiltCard className="h-full" style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius, padding: 'clamp(24px,3vw,32px)' }} max={5} glare={!isDark} maxGlare={0.08}>
                    <div style={{ transform: 'translateZ(20px)' }}>
                      <div className="w-10 h-10 flex items-center justify-center mb-4" style={{ background: `${accent}15`, borderRadius: borderRadius === '0px' ? '0' : '10px' }}>
                        <CheckCircle size={20} style={{ color: accent }} />
                      </div>
                      <h4 style={{ fontFamily: fonts.heading, fontSize: 18, fontWeight: 700, marginBottom: 8, color: textPrimary }}>{item.title}</h4>
                      <p style={{ fontSize: 14, color: textMuted, lineHeight: 1.6 }}>{item.description}</p>
                    </div>
                  </TiltCard>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Final CTA ── */}
      <section className="relative overflow-hidden text-center" style={{ padding: 'clamp(80px,10vw,120px) clamp(16px,4vw,48px)', background: accent }}>
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'repeating-linear-gradient(-45deg,transparent,transparent 40px,#000 40px,#000 41px)' }} />
        <ScrollReveal animation="scale-fade">
          <div className="relative" style={{ maxWidth: 600, margin: '0 auto' }}>
            <h2 style={{ fontFamily: fonts.heading, fontSize: 'clamp(28px,4vw,48px)', fontWeight: 700, color: isDark ? '#000' : '#fff', marginBottom: 16 }}>Ready to get started?</h2>
            <p style={{ fontSize: 16, color: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)', marginBottom: 32 }}>Contact us today for a free estimate. No obligation, no pressure.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <button onClick={handleCTA} style={{ background: isDark ? '#000' : '#fff', color: accent, padding: '16px 36px', fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer', fontFamily: fonts.body, borderRadius, display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                Get Estimate <ArrowRight size={16} />
              </button>
              {lead.phone && (
                <a href={`tel:${lead.phone}`} onClick={onCallClick} style={{ border: `2px solid ${isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.3)'}`, color: isDark ? '#000' : '#fff', padding: '16px 36px', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10, fontFamily: fonts.body, borderRadius }}>
                  <Phone size={16} />Call Now
                </a>
              )}
            </div>
          </div>
        </ScrollReveal>
      </section>

      <style dangerouslySetInnerHTML={{ __html: `
        .spc-img-zoom{transition:transform .6s cubic-bezier(.22,1,.36,1)}.spc-img-zoom:hover{transform:scale(1.05)}
        .spc-card-lift{transition:transform .3s ease,box-shadow .3s ease}.spc-card-lift:hover{transform:translateY(-4px);box-shadow:0 16px 48px rgba(0,0,0,.1)}
        .line-clamp-2{overflow:hidden;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2}
      `}} />
    </>
  )
}

/* ================================================================== */
/*  Card Layout Components                                             */
/* ================================================================== */

interface CardProps { service: ServiceData; theme: ServicePageTheme; index: number; industry: string; onCTA: () => void }

function HeroServiceCard({ service, theme, index, industry, onCTA }: CardProps) {
  const { accent, fonts, isDark, borderRadius, cardBg, cardBorder, textPrimary, textMuted } = theme
  return (
    <ScrollReveal animation="slide-up" className="mb-6">
      <TiltCard max={3} glare={!isDark} maxGlare={0.1} scale={1}>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-0 overflow-hidden spc-card-lift" style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius }}>
          <div className="lg:col-span-3 relative overflow-hidden" style={{ minHeight: 320 }}>
            {service.img ? (
              <img src={service.img} alt={service.name} className="w-full h-full object-cover spc-img-zoom" style={{ display: 'block', minHeight: 320 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            ) : (
              <GradientPlaceholder accent={accent} industry={industry} serviceName={service.name} variant={isDark ? 'dark' : 'light'} index={index} style={{ width: '100%', height: '100%', minHeight: 320 }} />
            )}
            <div className="absolute top-4 left-4">
              <span style={{ fontFamily: fonts.mono, fontSize: 11, color: '#fff', background: accent, padding: '6px 14px', borderRadius: 999, letterSpacing: '0.1em', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={12} /> Featured
              </span>
            </div>
          </div>
          <div className="lg:col-span-2 flex flex-col justify-center p-8 lg:p-10">
            <span style={{ fontFamily: fonts.mono, fontSize: 48, fontWeight: 800, color: `${accent}20`, lineHeight: 1, display: 'block', marginBottom: 12 }}>01</span>
            <h3 style={{ fontFamily: fonts.heading, fontSize: 'clamp(24px,3vw,32px)', fontWeight: 700, marginBottom: 12, color: textPrimary }}>{service.name}</h3>
            <p style={{ fontSize: 15, lineHeight: 1.7, marginBottom: 24, color: textMuted }}>{service.desc}</p>
            <button onClick={onCTA} className="inline-flex items-center gap-2 text-sm font-semibold" style={{ background: 'none', border: 'none', color: accent, cursor: 'pointer', padding: 0, fontFamily: fonts.body }}>
              Get a free estimate <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </TiltCard>
    </ScrollReveal>
  )
}

function SplitServiceCard({ service, theme, index, industry, onCTA }: CardProps) {
  const { accent, fonts, isDark, borderRadius, cardBg, cardBorder, textPrimary, textMuted } = theme
  const isReversed = index % 2 !== 0
  const number = String(index + 1).padStart(2, '0')

  return (
    <ScrollReveal animation={isReversed ? 'fade-right' : 'fade-left'} delay={index * 60} className="mb-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 overflow-hidden spc-card-lift" style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius }}>
        {!isReversed && <SvcImage service={service} accent={accent} industry={industry} isDark={isDark} index={index} />}
        <div className="flex flex-col justify-center p-7 md:p-10">
          <span style={{ fontFamily: fonts.mono, fontSize: 11, color: `${accent}60`, letterSpacing: '0.15em', display: 'block', marginBottom: 8 }}>{number}</span>
          <h3 style={{ fontFamily: fonts.heading, fontSize: 'clamp(20px,2.5vw,26px)', fontWeight: 700, marginBottom: 10, color: textPrimary }}>{service.name}</h3>
          <p style={{ fontSize: 15, lineHeight: 1.7, marginBottom: 20, color: textMuted }}>{service.desc}</p>
          <button onClick={onCTA} className="inline-flex items-center gap-2 text-sm font-semibold" style={{ background: 'none', border: 'none', color: accent, cursor: 'pointer', padding: 0, fontFamily: fonts.body }}>
            Get estimate <ArrowRight size={14} />
          </button>
        </div>
        {isReversed && <SvcImage service={service} accent={accent} industry={industry} isDark={isDark} index={index} className="hidden md:block" />}
      </div>
    </ScrollReveal>
  )
}

function OverlayServiceCard({ service, theme, index, industry, onCTA }: CardProps) {
  const { accent, fonts, borderRadius } = theme
  const number = String(index + 1).padStart(2, '0')
  return (
    <ScrollReveal animation="scale-fade" className="mb-5">
      <div className="relative overflow-hidden spc-card-lift" style={{ borderRadius, minHeight: 280 }}>
        {service.img ? (
          <img src={service.img} alt={service.name} className="absolute inset-0 w-full h-full object-cover" style={{ display: 'block' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        ) : (
          <GradientPlaceholder accent={accent} industry={industry} serviceName={service.name} variant="dark" index={index} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.15) 100%)' }} />
        <div className="relative flex flex-col justify-end p-8 md:p-10" style={{ minHeight: 280 }}>
          <span style={{ fontFamily: fonts.mono, fontSize: 11, color: accent, letterSpacing: '0.15em', display: 'block', marginBottom: 8 }}>{number}</span>
          <h3 style={{ fontFamily: fonts.heading, fontSize: 'clamp(22px,3vw,30px)', fontWeight: 700, color: '#fff', marginBottom: 10 }}>{service.name}</h3>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, maxWidth: 500, marginBottom: 16 }}>{service.desc}</p>
          <button onClick={onCTA} className="inline-flex items-center gap-2 text-sm font-bold uppercase" style={{ background: 'none', border: 'none', color: accent, cursor: 'pointer', padding: 0, letterSpacing: '0.06em', fontFamily: fonts.body }}>
            Get estimate <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </ScrollReveal>
  )
}

function CompactServiceCard({ service, theme, index, industry, onCTA }: CardProps) {
  const { accent, fonts, isDark, borderRadius, cardBg, cardBorder, textPrimary, textMuted } = theme
  const number = String(index + 1).padStart(2, '0')
  return (
    <ScrollReveal animation="fade-up" delay={(index - 4) * 80} className="mb-3">
      <div className="flex flex-col sm:flex-row items-stretch overflow-hidden spc-card-lift" style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius, cursor: 'pointer' }} onClick={onCTA}>
        <div className="sm:w-48 flex-shrink-0 relative overflow-hidden" style={{ minHeight: 120 }}>
          {service.img ? (
            <img src={service.img} alt={service.name} className="w-full h-full object-cover" style={{ display: 'block', minHeight: 120 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          ) : (
            <GradientPlaceholder accent={accent} industry={industry} serviceName={service.name} variant={isDark ? 'dark' : 'light'} index={index} style={{ width: '100%', height: '100%', minHeight: 120 }} aspectRatio="" />
          )}
        </div>
        <div className="flex-1 flex items-center justify-between p-5 sm:p-6 gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <span style={{ fontFamily: fonts.mono, fontSize: 11, color: `${accent}60`, letterSpacing: '0.1em' }}>{number}</span>
              <h3 style={{ fontFamily: fonts.heading, fontSize: 17, fontWeight: 700, color: textPrimary }}>{service.name}</h3>
            </div>
            <p style={{ fontSize: 14, color: textMuted, lineHeight: 1.5 }} className="line-clamp-2">{service.desc}</p>
          </div>
          <ArrowRight size={18} style={{ color: accent, flexShrink: 0 }} />
        </div>
      </div>
    </ScrollReveal>
  )
}

function SvcImage({ service, accent, industry, isDark, index, className = '' }: { service: ServiceData; accent: string; industry: string; isDark: boolean; index: number; className?: string }) {
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ minHeight: 220 }}>
      <ScrollReveal animation="clip-reveal" duration={900}>
        {service.img ? (
          <img src={service.img} alt={service.name} className="w-full h-full object-cover spc-img-zoom" style={{ display: 'block', minHeight: 220 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        ) : (
          <GradientPlaceholder accent={accent} industry={industry} serviceName={service.name} variant={isDark ? 'dark' : 'light'} index={index} style={{ width: '100%', height: '100%', minHeight: 220 }} />
        )}
      </ScrollReveal>
    </div>
  )
}
