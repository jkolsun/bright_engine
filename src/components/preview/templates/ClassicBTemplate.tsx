'use client'
/*
 * IRONCLAD TEMPLATE — Premium Industrial
 * Dark slate (#1C1F26), Oswald condensed headings, table-layout services
 * Darkened photo hero, stamped badges, thick dividers, bolt corner decorations
 * data-page wrapper divs for snapshot delivery
 */

import { useState, useEffect, useRef } from 'react'
import { Phone, MapPin, Star, CheckCircle, ArrowRight, Mail, Camera, MessageCircle, X, Send, Menu, Minus, Plus, Quote, ChevronLeft, ChevronRight } from 'lucide-react'
import type { TemplateProps } from '../config/template-types'
import DisclaimerBanner from '../shared/DisclaimerBanner'
import PhotoPlaceholder from '../shared/PhotoPlaceholder'

function fmt(phone: string): string {
  const d = phone.replace(/\D/g, '')
  if (d.length === 11 && d[0] === '1') return `(${d.slice(1,4)}) ${d.slice(4,7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`
  return phone
}

function getAccent(config: TemplateProps['config']): string {
  const m: Record<string, string> = {
    'amber-300':'#fcd34d','amber-400':'#fbbf24','amber-500':'#f59e0b','amber-600':'#d97706',
    'sky-400':'#38bdf8','sky-500':'#0ea5e9','cyan-400':'#22d3ee','cyan-600':'#0891b2',
    'teal-400':'#2dd4bf','teal-500':'#14b8a6','emerald-400':'#34d399','emerald-500':'#10b981','emerald-600':'#059669',
    'green-400':'#4ade80','green-500':'#22c55e','green-600':'#16a34a',
    'lime-400':'#a3e635','lime-500':'#84cc16',
    'violet-400':'#a78bfa','purple-600':'#9333ea',
    'blue-400':'#60a5fa','blue-500':'#3b82f6','blue-600':'#2563eb',
    'red-600':'#dc2626','rose-500':'#f43f5e',
    'orange-400':'#fb923c','orange-500':'#f97316',
    'yellow-500':'#eab308',
    'slate-600':'#475569','gray-600':'#4b5563',
  }
  return m[config.accentColor] || '#f59e0b'
}

function Counter({ end, suffix = '' }: { end: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const counted = useRef(false)
  useEffect(() => {
    if (!ref.current) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !counted.current) {
        counted.current = true
        let f = 0
        const step = Math.max(1, Math.floor(end / 30))
        const iv = setInterval(() => { f += step; if (f >= end) { f = end; clearInterval(iv) } if (ref.current) ref.current.textContent = f + suffix }, 30)
      }
    }, { threshold: 0.3 })
    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [end, suffix])
  return <span ref={ref}>0{suffix}</span>
}

function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const [vis, setVis] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect() } }, { threshold: 0.15 })
    obs.observe(el); return () => obs.disconnect()
  }, [])
  return <div ref={ref} className={className} style={{ opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : 'translateY(24px)', transition: `opacity .8s ease ${delay}ms, transform .8s ease ${delay}ms` }}>{children}</div>
}

/* bolt corners reusable */
function Bolts() {
  return <>
    <div style={{ position: 'absolute', top: 8, left: 8, width: 6, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
    <div style={{ position: 'absolute', top: 8, right: 8, width: 6, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
    <div style={{ position: 'absolute', bottom: 8, left: 8, width: 6, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
    <div style={{ position: 'absolute', bottom: 8, right: 8, width: 6, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
  </>
}

export default function ClassicBTemplate({ lead, config, onCTAClick, onCallClick, websiteCopy }: TemplateProps) {
  const A = getAccent(config)
  const indLabel = lead.industry.toLowerCase().replace(/_/g, ' ')
  const name = lead.companyName || indLabel
  const phone = lead.phone || ''
  const city = lead.city || ''
  const loc = [lead.city, lead.state].filter(Boolean).join(', ')

  const svc = lead.enrichedServices || []
  const photos = lead.enrichedPhotos || []
  const rating = lead.enrichedRating || 0
  const reviewCount = lead.enrichedReviews || 0
  const heroPhoto = photos[0] || ''
  const wc = websiteCopy

  const heroHeadline = wc?.heroHeadline || `${indLabel} Done Right`
  const heroSub = wc?.heroSubheadline || `Trusted ${indLabel} professionals serving ${city || 'your area'}`
  const aboutText = wc?.aboutParagraph1 || `${name} delivers dependable ${indLabel} services with precision, transparency, and a relentless focus on quality. We show up on time, do the job right, and stand behind every project.`
  const aboutText2 = wc?.aboutParagraph2 || `From day one our mission has been simple: do honest work at fair prices. Every crew member is trained, every job is inspected, and every client gets our direct number.`

  const svcData = svc.map((n, i) => ({ name: n, desc: wc?.serviceDescriptions?.[n] || `Professional ${n.toLowerCase()} services.`, img: photos.length > 0 ? photos[i % photos.length] : undefined }))
  const testis = [
    { text: wc?.testimonialQuote || `${name} exceeded our expectations. Professional, on time, and the quality speaks for itself.`, author: wc?.testimonialAuthor || 'Verified Customer' },
    ...(wc?.additionalTestimonials?.map(t => ({ text: t.quote, author: t.author })) || [
      { text: 'Solid work from start to finish. No shortcuts, no excuses. Exactly what we needed.', author: 'Local Client' },
      { text: `We've used other companies before — ${name} is in a different league. Highly recommend.`, author: 'Repeat Customer' },
    ])
  ]
  const steps = wc?.processSteps || [
    { title: 'Contact', description: 'Call or request an estimate — we respond fast.' },
    { title: 'Assess', description: 'On-site evaluation with honest, upfront pricing.' },
    { title: 'Execute', description: 'Our crew delivers precision work, on schedule.' },
    { title: 'Inspect', description: 'Final walkthrough and your satisfaction guarantee.' },
  ]
  const whyUs = wc?.whyChooseUs || wc?.valueProps || [
    { title: 'Licensed & Insured', description: 'Full coverage and credentials you can verify.' },
    { title: 'Dependable Service', description: 'We show up on time, every time. No excuses.' },
    { title: 'Transparent Pricing', description: 'Written estimates before work begins. Zero surprises.' },
    { title: 'Quality Guaranteed', description: 'We stand behind every job we complete.' },
  ]
  const brands = wc?.brandNames || []
  const faqs = [
    { q: `Why choose ${name}?`, a: `${name} combines years of experience with a commitment to quality. We treat every project like our reputation depends on it — because it does.` },
    { q: 'Do you offer free estimates?', a: 'Absolutely. We provide honest, no-obligation estimates so you know exactly what to expect before any work begins.' },
    { q: 'What areas do you serve?', a: `We proudly serve ${loc || 'the local area'} and surrounding communities. Call us to confirm service in your location.` },
    { q: 'Are you licensed and insured?', a: 'Yes. We are fully licensed and insured, giving you complete peace of mind on every job.' },
    { q: 'How quickly can you start?', a: 'Most projects begin within the week. For urgent needs, call us directly and we will prioritize your job.' },
  ]

  const [page, setPage] = useState<'home' | 'services' | 'about' | 'work' | 'contact'>('home')
  const [menuOpen, setMenuOpen] = useState(false)
  const [lb, setLb] = useState<number | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [faqOpen, setFaqOpen] = useState<number | null>(null)

  const nav = (p: typeof page) => { setPage(p); setMenuOpen(false); window.scrollTo({ top: 0 }) }

  const navItems: { label: string; key: typeof page }[] = [
    { label: 'Home', key: 'home' }, { label: 'Services', key: 'services' },
    { label: 'About', key: 'about' }, { label: 'Work', key: 'work' }, { label: 'Contact', key: 'contact' },
  ]

  const head = "'Oswald', sans-serif"
  const body = "'Work Sans', sans-serif"
  const mono = "'Roboto Mono', monospace"

  return (
    <div className="preview-template" style={{ background: '#1C1F26', color: '#E8E6E1', minHeight: '100vh', fontFamily: body }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Work+Sans:wght@300;400;500;600&family=Roboto+Mono:wght@400;500&display=swap');
        .ic-press { transition: transform 0.15s ease; }
        .ic-press:hover { transform: scale(0.97); }
        .ic-press:active { transform: scale(0.95); }
        .ic-dropdown { max-height: 0; overflow: hidden; transition: max-height 0.35s ease; }
        .ic-dropdown.open { max-height: 600px; }
        .ic-table-row { transition: background 0.2s ease; }
        .ic-table-row:hover { background: rgba(255,255,255,0.03); }
        @keyframes ic-stamp { from { opacity:0; transform:scale(1.3) rotate(-6deg); } to { opacity:1; transform:scale(1) rotate(-3deg); } }
        .ic-stamp { animation: ic-stamp 0.5s ease forwards; }
        ::selection { background: ${A}; color: #1C1F26; }
      ` }} />

      <DisclaimerBanner variant="classic-b" companyName={name} />

      {/* NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: '#1C1F26', borderBottom: `4px solid ${A}` }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 clamp(16px,4vw,32px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <button onClick={() => nav('home')} style={{ fontFamily: head, fontWeight: 700, fontSize: 'clamp(18px,3vw,24px)', color: '#fff', textTransform: 'uppercase', letterSpacing: 2, background: 'none', border: 'none', cursor: 'pointer' }}>
            {name}
          </button>
          <div className="hidden md:flex items-center gap-0">
            {navItems.map(n => (
              <button key={n.key} onClick={() => nav(n.key)}
                style={{ fontFamily: head, fontWeight: 500, fontSize: 13, color: page === n.key ? A : '#9CA3AF', textTransform: 'uppercase', letterSpacing: 2, background: 'none', border: 'none', cursor: 'pointer', padding: '8px 16px', borderBottom: page === n.key ? `3px solid ${A}` : '3px solid transparent', transition: 'all 0.2s' }}>
                {n.label}
              </button>
            ))}
            <button onClick={onCallClick} className="ic-press"
              style={{ fontFamily: mono, fontSize: 12, background: A, color: '#1C1F26', padding: '10px 20px', fontWeight: 500, letterSpacing: 1, border: 'none', cursor: 'pointer', marginLeft: 16, textTransform: 'uppercase' }}>
              <Phone size={14} style={{ display: 'inline', verticalAlign: -2, marginRight: 6 }} />CALL NOW
            </button>
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)} className="flex md:hidden items-center justify-center" style={{ background: '#252830', border: `1px solid rgba(255,255,255,0.08)`, color: '#fff', cursor: 'pointer', width: 44, height: 44 }}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        <div className={`ic-dropdown ${menuOpen ? 'open' : ''} md:hidden`} style={{ background: '#252830', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {navItems.map(n => (
            <button key={n.key} onClick={() => nav(n.key)}
              style={{ display: 'block', width: '100%', textAlign: 'left', fontFamily: head, fontWeight: 500, fontSize: 15, color: page === n.key ? A : '#9CA3AF', textTransform: 'uppercase', letterSpacing: 2, background: 'none', border: 'none', borderLeft: page === n.key ? `4px solid ${A}` : '4px solid transparent', cursor: 'pointer', padding: '16px 24px' }}>
              {n.label}
            </button>
          ))}
          <div style={{ padding: '12px 24px 20px' }}>
            <button onClick={onCallClick} className="ic-press" style={{ width: '100%', fontFamily: mono, fontSize: 13, background: A, color: '#1C1F26', padding: '14px', fontWeight: 500, border: 'none', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 1 }}>
              <Phone size={14} style={{ display: 'inline', verticalAlign: -2, marginRight: 6 }} />CALL NOW
            </button>
          </div>
        </div>
      </nav>

      <div style={{ paddingTop: 64 }}>

        {/* ══════════════ HOME ══════════════ */}
        <div data-page="home" style={{ display: page === 'home' ? 'block' : 'none' }}>
          {/* HERO */}
          <section style={{ position: 'relative', minHeight: 'clamp(500px,70vh,700px)', display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
            {heroPhoto ? <img src={heroPhoto} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${A}15 0%, ${A}30 100%)` }} />}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #1C1F26 10%, rgba(28,31,38,0.85) 50%, rgba(28,31,38,0.6) 100%)' }} />
            <div style={{ position: 'relative', zIndex: 2, maxWidth: 1200, margin: '0 auto', padding: 'clamp(32px,6vw,80px) clamp(16px,4vw,32px)', width: '100%' }}>
              <Reveal>
                <p style={{ fontFamily: mono, fontSize: 'clamp(11px,1.4vw,13px)', color: A, textTransform: 'uppercase', letterSpacing: 4, marginBottom: 16 }}>
                  {city && `${city} \u2022 `}{indLabel}
                </p>
                <h1 style={{ fontFamily: head, fontWeight: 700, fontSize: 'clamp(36px,7vw,72px)', textTransform: 'uppercase', lineHeight: 1, color: '#fff', marginBottom: 20, maxWidth: 700 }}>
                  {heroHeadline}
                </h1>
                <p style={{ fontSize: 'clamp(15px,1.8vw,18px)', color: '#B0ADA6', maxWidth: 520, lineHeight: 1.7, marginBottom: 28, fontWeight: 300 }}>
                  {heroSub}
                </p>
                <div style={{ width: 80, height: 6, background: A, marginBottom: 32 }} />
                <div style={{ display: 'flex', gap: 'clamp(24px,4vw,48px)', flexWrap: 'wrap', alignItems: 'center' }}>
                  {rating > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Star size={20} fill={A} color={A} />
                      <span style={{ fontFamily: head, fontWeight: 600, fontSize: 22, color: '#fff' }}>{rating}</span>
                      {reviewCount > 0 && <span style={{ fontFamily: mono, fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase' }}>({reviewCount} reviews)</span>}
                    </div>
                  )}
                  {svc.length > 0 && <div style={{ fontFamily: mono, fontSize: 12, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1 }}><Counter end={svc.length} />+ Services</div>}
                  {photos.length > 0 && <div style={{ fontFamily: mono, fontSize: 12, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1 }}><Counter end={photos.length} /> Project Photos</div>}
                </div>
              </Reveal>
              <Reveal>
                <div style={{ display: 'flex', gap: 12, marginTop: 32, flexWrap: 'wrap' }}>
                  <button onClick={onCTAClick} className="ic-press" style={{ fontFamily: head, fontWeight: 600, fontSize: 15, background: A, color: '#1C1F26', padding: '16px 36px', border: 'none', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 2 }}>Get Free Estimate</button>
                  <button onClick={onCallClick} className="ic-press" style={{ fontFamily: head, fontWeight: 600, fontSize: 15, background: 'transparent', color: '#fff', padding: '16px 36px', border: '2px solid rgba(255,255,255,0.2)', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 2 }}>
                    <Phone size={16} style={{ display: 'inline', verticalAlign: -3, marginRight: 8 }} />{phone ? fmt(phone) : 'Call Us'}
                  </button>
                </div>
              </Reveal>
            </div>
          </section>

          <div style={{ height: 6, background: A }} />

          {/* SERVICES PREVIEW */}
          <section style={{ background: '#252830', padding: 'clamp(48px,8vw,96px) clamp(16px,4vw,32px)' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
              <Reveal>
                <p style={{ fontFamily: mono, fontSize: 12, color: A, textTransform: 'uppercase', letterSpacing: 4, marginBottom: 12 }}>What We Do</p>
                <h2 style={{ fontFamily: head, fontWeight: 700, fontSize: 'clamp(28px,5vw,48px)', textTransform: 'uppercase', color: '#fff', marginBottom: 40 }}>Our Services</h2>
              </Reveal>
              <div style={{ borderTop: `3px solid ${A}` }}>
                {svc.slice(0, 6).map((s, i) => (
                  <Reveal key={i}>
                    <div className="ic-table-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'clamp(16px,3vw,24px) clamp(12px,2vw,20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)', gap: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(12px,2vw,24px)', flex: 1, minWidth: 0 }}>
                        <span style={{ fontFamily: mono, fontSize: 'clamp(11px,1.2vw,13px)', color: A, flexShrink: 0, width: 32 }}>{String(i + 1).padStart(2, '0')}</span>
                        <span style={{ fontFamily: head, fontWeight: 500, fontSize: 'clamp(15px,2vw,20px)', textTransform: 'uppercase', letterSpacing: 1, color: '#E8E6E1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s}</span>
                      </div>
                      <CheckCircle size={16} color={A} style={{ flexShrink: 0 }} />
                    </div>
                  </Reveal>
                ))}
              </div>
              <Reveal>
                <div style={{ marginTop: 32, textAlign: 'center' }}>
                  <button onClick={() => nav('services')} className="ic-press" style={{ fontFamily: head, fontWeight: 600, fontSize: 14, color: A, background: 'none', border: `2px solid ${A}`, padding: '14px 32px', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 2 }}>
                    View All Services <ArrowRight size={14} style={{ display: 'inline', verticalAlign: -2, marginLeft: 8 }} />
                  </button>
                </div>
              </Reveal>
            </div>
          </section>

          {/* TRUST BADGES */}
          <section style={{ background: '#1C1F26', padding: 'clamp(40px,6vw,72px) clamp(16px,4vw,32px)' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'clamp(20px,3vw,32px)' }}>
              {[
                { label: 'Licensed & Insured', val: 'Verified' },
                { label: 'Years of Service', val: '10+' },
                { label: 'Jobs Completed', val: '500+' },
                { label: 'Satisfaction Rate', val: '99%' },
              ].map((b, i) => (
                <Reveal key={i}>
                  <div style={{ border: '2px solid rgba(255,255,255,0.08)', padding: 'clamp(20px,3vw,28px)', textAlign: 'center', position: 'relative' }}>
                    <div style={{ fontFamily: head, fontWeight: 700, fontSize: 'clamp(28px,4vw,40px)', color: A }}>{b.val}</div>
                    <div style={{ fontFamily: mono, fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 2, marginTop: 6 }}>{b.label}</div>
                    <Bolts />
                  </div>
                </Reveal>
              ))}
            </div>
          </section>

          {/* WORK PREVIEW */}
          <section style={{ background: '#252830', padding: 'clamp(48px,8vw,96px) clamp(16px,4vw,32px)' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
              <Reveal>
                <p style={{ fontFamily: mono, fontSize: 12, color: A, textTransform: 'uppercase', letterSpacing: 4, marginBottom: 12 }}>Project Gallery</p>
                <h2 style={{ fontFamily: head, fontWeight: 700, fontSize: 'clamp(28px,5vw,48px)', textTransform: 'uppercase', color: '#fff', marginBottom: 40 }}>Our Work</h2>
              </Reveal>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(250px,30vw,350px), 1fr))', gap: 4 }}>
                {photos.length > 0 ? photos.slice(0, 6).map((p, i) => (
                  <Reveal key={i}>
                    <div onClick={() => setLb(i)} style={{ position: 'relative', paddingBottom: '75%', cursor: 'pointer', overflow: 'hidden' }}>
                      <img src={p} alt={`Project ${i + 1}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }}
                        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.03)')} onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')} />
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '24px 12px 8px', background: 'linear-gradient(transparent, rgba(28,31,38,0.9))' }}>
                        <span style={{ fontFamily: mono, fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 2 }}>Project {String(i + 1).padStart(2, '0')}</span>
                      </div>
                      <Camera size={16} color="#fff" style={{ position: 'absolute', top: 10, right: 10, opacity: 0.5 }} />
                    </div>
                  </Reveal>
                )) : [0, 1, 2].map(i => (
                  <Reveal key={i}>
                    <PhotoPlaceholder accent={A} variant="dark" aspectRatio="4/3" iconSize={36} style={{ position: 'relative' }} />
                  </Reveal>
                ))}
              </div>
              {photos.length > 6 && (
                <Reveal><div style={{ textAlign: 'center', marginTop: 28 }}>
                  <button onClick={() => nav('work')} className="ic-press" style={{ fontFamily: head, fontWeight: 600, fontSize: 14, color: A, background: 'none', border: `2px solid ${A}`, padding: '14px 32px', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 2 }}>
                    View All Work <ArrowRight size={14} style={{ display: 'inline', verticalAlign: -2, marginLeft: 8 }} />
                  </button>
                </div></Reveal>
              )}
            </div>
          </section>

          {/* TESTIMONIALS */}
          <section style={{ background: '#1C1F26', padding: 'clamp(48px,8vw,96px) clamp(16px,4vw,32px)' }}>
            <div style={{ maxWidth: 900, margin: '0 auto' }}>
              <Reveal>
                <p style={{ fontFamily: mono, fontSize: 12, color: A, textTransform: 'uppercase', letterSpacing: 4, marginBottom: 12, textAlign: 'center' }}>Testimonials</p>
                <h2 style={{ fontFamily: head, fontWeight: 700, fontSize: 'clamp(28px,5vw,48px)', textTransform: 'uppercase', color: '#fff', marginBottom: 48, textAlign: 'center' }}>What Clients Say</h2>
              </Reveal>
              <div style={{ display: 'grid', gap: 32 }}>
                {testis.slice(0, 3).map((t, i) => (
                  <Reveal key={i}>
                    <div style={{ position: 'relative', padding: 'clamp(24px,4vw,40px)', background: '#252830', borderLeft: `4px solid ${A}` }}>
                      <Quote size={28} color={A} style={{ opacity: 0.3, marginBottom: 12 }} />
                      <p style={{ fontSize: 'clamp(15px,1.6vw,17px)', lineHeight: 1.8, color: '#D1CFC9', fontWeight: 300 }}>&ldquo;{t.text}&rdquo;</p>
                      <p style={{ fontFamily: head, fontWeight: 500, fontSize: 14, color: A, textTransform: 'uppercase', letterSpacing: 2, marginTop: 16 }}>&mdash; {t.author}</p>
                      <div className="ic-stamp" style={{ position: 'absolute', top: 16, right: 16, border: `2px solid ${A}40`, padding: '4px 12px', transform: 'rotate(-3deg)' }}>
                        <span style={{ fontFamily: mono, fontSize: 9, color: `${A}80`, textTransform: 'uppercase', letterSpacing: 2 }}>Verified</span>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>

          {/* CTA */}
          <section style={{ background: '#252830', position: 'relative', overflow: 'hidden' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(48px,8vw,96px) clamp(16px,4vw,32px)', textAlign: 'center' }}>
              <Reveal>
                <p style={{ fontFamily: mono, fontSize: 12, color: A, textTransform: 'uppercase', letterSpacing: 4, marginBottom: 12 }}>Ready to Start?</p>
                <h2 style={{ fontFamily: head, fontWeight: 700, fontSize: 'clamp(28px,5vw,48px)', textTransform: 'uppercase', color: '#fff', marginBottom: 16 }}>Let&rsquo;s Build Something Solid</h2>
                <p style={{ fontSize: 'clamp(14px,1.6vw,16px)', color: '#9CA3AF', lineHeight: 1.7, marginBottom: 28, maxWidth: 560, marginLeft: 'auto', marginRight: 'auto' }}>Get in touch for a free, no-obligation estimate. We respond fast and show up ready to work.</p>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button onClick={onCTAClick} className="ic-press" style={{ fontFamily: head, fontWeight: 600, fontSize: 15, background: A, color: '#1C1F26', padding: '16px 36px', border: 'none', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 2 }}>Get Free Estimate</button>
                  <button onClick={onCallClick} className="ic-press" style={{ fontFamily: head, fontWeight: 600, fontSize: 15, color: '#fff', background: 'none', border: '2px solid rgba(255,255,255,0.15)', padding: '16px 36px', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 2 }}>
                    <Phone size={16} style={{ display: 'inline', verticalAlign: -3, marginRight: 8 }} />{phone ? fmt(phone) : 'Call'}
                  </button>
                </div>
              </Reveal>
            </div>
            {/* Corner bolts */}
            <div style={{ position: 'absolute', top: 16, left: 16, width: 10, height: 10, border: `2px solid ${A}30` }} />
            <div style={{ position: 'absolute', top: 16, right: 16, width: 10, height: 10, border: `2px solid ${A}30` }} />
            <div style={{ position: 'absolute', bottom: 16, left: 16, width: 10, height: 10, border: `2px solid ${A}30` }} />
            <div style={{ position: 'absolute', bottom: 16, right: 16, width: 10, height: 10, border: `2px solid ${A}30` }} />
          </section>
        </div>

        {/* ══════════════ SERVICES ══════════════ */}
        <div data-page="services" style={{ display: page === 'services' ? 'block' : 'none' }}>
          <section style={{ padding: 'clamp(48px,8vw,96px) clamp(16px,4vw,32px)' }}>
            <div style={{ maxWidth: 1000, margin: '0 auto' }}>
              <Reveal>
                <p style={{ fontFamily: mono, fontSize: 12, color: A, textTransform: 'uppercase', letterSpacing: 4, marginBottom: 12 }}>Full Service List</p>
                <h1 style={{ fontFamily: head, fontWeight: 700, fontSize: 'clamp(32px,6vw,56px)', textTransform: 'uppercase', color: '#fff', marginBottom: 48 }}>Our Services</h1>
              </Reveal>

              {/* Table-row services with thumbnail */}
              <div style={{ borderTop: `3px solid ${A}` }}>
                {svcData.map((s, i) => (
                  <Reveal key={i}>
                    <div className="ic-table-row" style={{ display: 'flex', alignItems: 'center', gap: 'clamp(16px,3vw,24px)', padding: 'clamp(16px,3vw,24px) clamp(12px,2vw,20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                      {s.img && <img src={s.img} alt={s.name} style={{ width: 'clamp(56px,8vw,80px)', height: 'clamp(56px,8vw,80px)', objectFit: 'cover', flexShrink: 0 }} />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                          <span style={{ fontFamily: mono, fontSize: 'clamp(10px,1.1vw,12px)', color: A, flexShrink: 0 }}>{String(i + 1).padStart(2, '0')}</span>
                          <span style={{ fontFamily: head, fontWeight: 600, fontSize: 'clamp(16px,2.2vw,22px)', textTransform: 'uppercase', letterSpacing: 1, color: '#E8E6E1' }}>{s.name}</span>
                        </div>
                        <p style={{ fontSize: 'clamp(13px,1.4vw,15px)', color: '#9CA3AF', lineHeight: 1.6, fontWeight: 300 }}>{s.desc}</p>
                      </div>
                      <CheckCircle size={18} color={A} style={{ flexShrink: 0 }} />
                    </div>
                  </Reveal>
                ))}
              </div>

              {/* Process Steps */}
              <div style={{ marginTop: 64 }}>
                <Reveal>
                  <p style={{ fontFamily: mono, fontSize: 12, color: A, textTransform: 'uppercase', letterSpacing: 4, marginBottom: 12 }}>How It Works</p>
                  <h2 style={{ fontFamily: head, fontWeight: 700, fontSize: 'clamp(24px,4vw,40px)', textTransform: 'uppercase', color: '#fff', marginBottom: 40 }}>Our Process</h2>
                </Reveal>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'clamp(16px,3vw,24px)' }}>
                  {steps.map((s, i) => (
                    <Reveal key={i}>
                      <div style={{ padding: 'clamp(20px,3vw,32px)', background: '#252830', borderTop: `3px solid ${A}`, position: 'relative' }}>
                        <span style={{ fontFamily: mono, fontSize: 32, color: `${A}20`, fontWeight: 500, position: 'absolute', top: 12, right: 16 }}>{String(i + 1).padStart(2, '0')}</span>
                        <h3 style={{ fontFamily: head, fontWeight: 600, fontSize: 'clamp(16px,2vw,20px)', textTransform: 'uppercase', color: '#fff', marginBottom: 8 }}>{s.title}</h3>
                        <p style={{ fontSize: 'clamp(13px,1.4vw,15px)', color: '#9CA3AF', lineHeight: 1.6, fontWeight: 300 }}>{s.description}</p>
                      </div>
                    </Reveal>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <Reveal>
                <div style={{ marginTop: 48, padding: 'clamp(24px,4vw,40px)', background: '#252830', borderLeft: `4px solid ${A}`, display: 'flex', flexDirection: 'column', gap: 16, position: 'relative' }}>
                  <h3 style={{ fontFamily: head, fontWeight: 600, fontSize: 'clamp(20px,3vw,28px)', textTransform: 'uppercase', color: '#fff' }}>Need a Custom Solution?</h3>
                  <p style={{ fontSize: 'clamp(14px,1.5vw,16px)', color: '#9CA3AF', lineHeight: 1.7 }}>Every job is different. Contact us to discuss your specific needs and we&rsquo;ll build a plan that fits.</p>
                  <button onClick={onCTAClick} className="ic-press" style={{ fontFamily: head, fontWeight: 600, fontSize: 14, background: A, color: '#1C1F26', padding: '14px 32px', border: 'none', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 2, alignSelf: 'flex-start' }}>Get Free Estimate</button>
                  <Bolts />
                </div>
              </Reveal>
            </div>
          </section>
        </div>

        {/* ══════════════ ABOUT ══════════════ */}
        <div data-page="about" style={{ display: page === 'about' ? 'block' : 'none' }}>
          {/* Story + photo */}
          <section style={{ padding: 'clamp(48px,8vw,96px) clamp(16px,4vw,32px)' }}>
            <div style={{ maxWidth: 900, margin: '0 auto' }}>
              <Reveal>
                <p style={{ fontFamily: mono, fontSize: 12, color: A, textTransform: 'uppercase', letterSpacing: 4, marginBottom: 12 }}>About</p>
                <h1 style={{ fontFamily: head, fontWeight: 700, fontSize: 'clamp(32px,6vw,56px)', textTransform: 'uppercase', color: '#fff', marginBottom: 16 }}>{name}</h1>
                <div style={{ width: 60, height: 6, background: A, marginBottom: 40 }} />
              </Reveal>
              <Reveal>
                <div style={{ marginBottom: 48, position: 'relative' }}>
                  {photos[1] ? (
                    <img src={photos[1]} alt="About" style={{ width: '100%', height: 'clamp(250px,40vw,400px)', objectFit: 'cover' }} />
                  ) : (
                    <PhotoPlaceholder accent={A} variant="dark" height="clamp(250px,40vw,400px)" iconSize={48} style={{ width: '100%' }} />
                  )}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 40%, #1C1F26)' }} />
                </div>
              </Reveal>
              <Reveal>
                <p style={{ fontSize: 'clamp(15px,1.8vw,18px)', lineHeight: 1.9, color: '#D1CFC9', fontWeight: 300, marginBottom: 24 }}>{aboutText}</p>
                <p style={{ fontSize: 'clamp(14px,1.6vw,16px)', lineHeight: 1.8, color: '#9CA3AF', fontWeight: 300, marginBottom: 48 }}>{aboutText2}</p>
              </Reveal>
            </div>
          </section>

          <div style={{ height: 4, background: A }} />

          {/* Why Choose Us — stamped badges */}
          <section style={{ background: '#252830', padding: 'clamp(48px,8vw,80px) clamp(16px,4vw,32px)' }}>
            <div style={{ maxWidth: 1000, margin: '0 auto' }}>
              <Reveal>
                <p style={{ fontFamily: mono, fontSize: 12, color: A, textTransform: 'uppercase', letterSpacing: 4, marginBottom: 12, textAlign: 'center' }}>The Difference</p>
                <h2 style={{ fontFamily: head, fontWeight: 700, fontSize: 'clamp(28px,5vw,44px)', textTransform: 'uppercase', color: '#fff', marginBottom: 48, textAlign: 'center' }}>Why Choose Us</h2>
              </Reveal>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'clamp(16px,3vw,24px)' }}>
                {whyUs.slice(0, 4).map((w, i) => (
                  <Reveal key={i}>
                    <div style={{ padding: 'clamp(24px,3vw,32px)', border: '2px solid rgba(255,255,255,0.06)', position: 'relative', textAlign: 'center' }}>
                      <div className="ic-stamp" style={{ display: 'inline-block', border: `2px solid ${A}`, padding: '6px 18px', transform: 'rotate(-3deg)', marginBottom: 16 }}>
                        <span style={{ fontFamily: mono, fontSize: 10, color: A, textTransform: 'uppercase', letterSpacing: 3, fontWeight: 500 }}>{String(i + 1).padStart(2, '0')}</span>
                      </div>
                      <h3 style={{ fontFamily: head, fontWeight: 600, fontSize: 'clamp(16px,2vw,20px)', textTransform: 'uppercase', color: '#fff', marginBottom: 8 }}>{w.title}</h3>
                      <p style={{ fontSize: 'clamp(13px,1.3vw,15px)', color: '#9CA3AF', lineHeight: 1.6, fontWeight: 300 }}>{w.description}</p>
                      <Bolts />
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>

          {/* Stats Counters */}
          <section style={{ background: '#1C1F26', padding: 'clamp(40px,6vw,72px) clamp(16px,4vw,32px)' }}>
            <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'clamp(16px,3vw,32px)', textAlign: 'center' }}>
              {[
                { n: 500, s: '+', l: 'Jobs Completed' },
                { n: 10, s: '+', l: 'Years Experience' },
                { n: 99, s: '%', l: 'Satisfaction' },
                { n: reviewCount || 50, s: '+', l: 'Reviews' },
              ].map((c, i) => (
                <Reveal key={i}>
                  <div style={{ padding: 'clamp(16px,2vw,24px)' }}>
                    <div style={{ fontFamily: head, fontWeight: 700, fontSize: 'clamp(36px,6vw,56px)', color: A }}><Counter end={c.n} suffix={c.s} /></div>
                    <div style={{ fontFamily: mono, fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 2, marginTop: 4 }}>{c.l}</div>
                  </div>
                </Reveal>
              ))}
            </div>
          </section>

          {/* Testimonials with rotated badge frames */}
          <section style={{ background: '#252830', padding: 'clamp(48px,8vw,80px) clamp(16px,4vw,32px)' }}>
            <div style={{ maxWidth: 900, margin: '0 auto' }}>
              <Reveal>
                <h2 style={{ fontFamily: head, fontWeight: 700, fontSize: 'clamp(24px,4vw,36px)', textTransform: 'uppercase', color: '#fff', marginBottom: 40, textAlign: 'center' }}>Client Testimonials</h2>
              </Reveal>
              <div style={{ display: 'grid', gap: 24 }}>
                {testis.slice(0, 3).map((t, i) => (
                  <Reveal key={i}>
                    <div style={{ position: 'relative', padding: 'clamp(24px,3vw,36px)', background: '#1C1F26', borderLeft: `4px solid ${A}` }}>
                      <Quote size={24} color={A} style={{ opacity: 0.3, marginBottom: 8 }} />
                      <p style={{ fontSize: 'clamp(14px,1.5vw,16px)', lineHeight: 1.8, color: '#D1CFC9', fontWeight: 300 }}>&ldquo;{t.text}&rdquo;</p>
                      <p style={{ fontFamily: head, fontWeight: 500, fontSize: 13, color: A, textTransform: 'uppercase', letterSpacing: 2, marginTop: 12 }}>&mdash; {t.author}</p>
                      <div className="ic-stamp" style={{ position: 'absolute', top: 12, right: 12, border: `2px solid ${A}40`, padding: '3px 10px', transform: 'rotate(-3deg)' }}>
                        <span style={{ fontFamily: mono, fontSize: 8, color: `${A}80`, textTransform: 'uppercase', letterSpacing: 2 }}>Verified</span>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>

          {/* Brand Partners */}
          {brands.length > 0 && (
            <section style={{ background: '#1C1F26', padding: 'clamp(32px,5vw,56px) clamp(16px,4vw,32px)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
                <Reveal>
                  <p style={{ fontFamily: mono, fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 4, marginBottom: 24 }}>Brands We Trust</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 'clamp(16px,3vw,32px)' }}>
                    {brands.map((b, i) => (
                      <div key={i} style={{ fontFamily: head, fontWeight: 500, fontSize: 'clamp(13px,1.5vw,16px)', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: 2, padding: '8px 16px', border: '1px solid rgba(255,255,255,0.06)' }}>{b}</div>
                    ))}
                  </div>
                </Reveal>
              </div>
            </section>
          )}

          {/* FAQ */}
          <section style={{ background: '#1C1F26', padding: 'clamp(48px,8vw,80px) clamp(16px,4vw,32px)' }}>
            <div style={{ maxWidth: 800, margin: '0 auto' }}>
              <Reveal>
                <h2 style={{ fontFamily: head, fontWeight: 700, fontSize: 'clamp(24px,4vw,36px)', textTransform: 'uppercase', color: '#fff', marginBottom: 32 }}>Common Questions</h2>
              </Reveal>
              <div style={{ borderTop: `3px solid ${A}` }}>
                {faqs.map((f, i) => (
                  <Reveal key={i}>
                    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <button onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                        style={{ width: '100%', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'clamp(16px,2.5vw,24px) 0', background: 'none', border: 'none', cursor: 'pointer', gap: 16 }}>
                        <span style={{ fontFamily: head, fontWeight: 500, fontSize: 'clamp(15px,2vw,18px)', color: '#E8E6E1', textTransform: 'uppercase', letterSpacing: 1 }}>{f.q}</span>
                        {faqOpen === i ? <Minus size={18} color={A} /> : <Plus size={18} color="#9CA3AF" />}
                      </button>
                      <div style={{ maxHeight: faqOpen === i ? 200 : 0, overflow: 'hidden', transition: 'max-height 0.3s ease' }}>
                        <p style={{ fontSize: 'clamp(14px,1.5vw,16px)', color: '#9CA3AF', lineHeight: 1.7, paddingBottom: 20, fontWeight: 300 }}>{f.a}</p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* ══════════════ PORTFOLIO / WORK ══════════════ */}
        <div data-page="portfolio" style={{ display: page === 'work' ? 'block' : 'none' }}>
          <section style={{ padding: 'clamp(48px,8vw,96px) clamp(16px,4vw,32px)' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
              <Reveal>
                <p style={{ fontFamily: mono, fontSize: 12, color: A, textTransform: 'uppercase', letterSpacing: 4, marginBottom: 12 }}>Portfolio</p>
                <h1 style={{ fontFamily: head, fontWeight: 700, fontSize: 'clamp(32px,6vw,56px)', textTransform: 'uppercase', color: '#fff', marginBottom: 48 }}>Our Work</h1>
              </Reveal>
              {photos.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(250px,30vw,350px), 1fr))', gap: 4 }}>
                  {photos.map((p, i) => (
                    <Reveal key={i}>
                      <div onClick={() => setLb(i)} style={{ position: 'relative', paddingBottom: '75%', cursor: 'pointer', overflow: 'hidden' }}>
                        <img src={p} alt={`Project ${i + 1}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }}
                          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.03)')} onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')} />
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '24px 12px 8px', background: 'linear-gradient(transparent, rgba(28,31,38,0.9))' }}>
                          <span style={{ fontFamily: mono, fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 2 }}>Project {String(i + 1).padStart(2, '0')}</span>
                        </div>
                      </div>
                    </Reveal>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(250px,30vw,350px), 1fr))', gap: 4 }}>
                  {[0, 1, 2, 3, 4, 5].map(i => (
                    <Reveal key={i}>
                      <PhotoPlaceholder accent={A} variant="dark" aspectRatio="4/3" iconSize={36} />
                    </Reveal>
                  ))}
                </div>
              )}
              <Reveal>
                <div style={{ textAlign: 'center', marginTop: 48 }}>
                  <button onClick={onCTAClick} className="ic-press" style={{ fontFamily: head, fontWeight: 600, fontSize: 15, background: A, color: '#1C1F26', padding: '16px 36px', border: 'none', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 2 }}>Start Your Project</button>
                </div>
              </Reveal>
            </div>
          </section>
        </div>

        {/* ══════════════ CONTACT ══════════════ */}
        <div data-page="contact" style={{ display: page === 'contact' ? 'block' : 'none' }}>
          <section style={{ padding: 'clamp(48px,8vw,96px) clamp(16px,4vw,32px)' }}>
            <div style={{ maxWidth: 900, margin: '0 auto' }}>
              <Reveal>
                <p style={{ fontFamily: mono, fontSize: 12, color: A, textTransform: 'uppercase', letterSpacing: 4, marginBottom: 12 }}>Contact</p>
                <h1 style={{ fontFamily: head, fontWeight: 700, fontSize: 'clamp(32px,6vw,56px)', textTransform: 'uppercase', color: '#fff', marginBottom: 16 }}>Get In Touch</h1>
                <div style={{ width: 60, height: 6, background: A, marginBottom: 48 }} />
              </Reveal>

              {/* Contact info + Service area */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 32, marginBottom: 48 }}>
                <Reveal>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {phone && (
                      <button onClick={onCallClick} className="ic-press" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20, background: '#252830', borderLeft: `4px solid ${A}`, border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                        <Phone size={20} color={A} />
                        <div>
                          <div style={{ fontFamily: mono, fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>Call Us</div>
                          <div style={{ fontSize: 16, color: '#fff', fontWeight: 500 }}>{fmt(phone)}</div>
                        </div>
                      </button>
                    )}
                    {city && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20, background: '#252830', borderLeft: `4px solid ${A}` }}>
                        <MapPin size={20} color={A} />
                        <div>
                          <div style={{ fontFamily: mono, fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>Location</div>
                          <div style={{ fontSize: 16, color: '#fff', fontWeight: 500 }}>{loc}</div>
                        </div>
                      </div>
                    )}
                    <button onClick={onCTAClick} className="ic-press" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20, background: '#252830', borderLeft: `4px solid ${A}`, border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                      <Mail size={20} color={A} />
                      <div>
                        <div style={{ fontFamily: mono, fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>Email</div>
                        <div style={{ fontSize: 16, color: '#fff', fontWeight: 500 }}>Send a Message</div>
                      </div>
                    </button>
                  </div>
                </Reveal>
                <Reveal>
                  <div style={{ padding: 'clamp(20px,3vw,32px)', background: '#252830', borderLeft: `4px solid ${A}` }}>
                    <h3 style={{ fontFamily: head, fontWeight: 600, fontSize: 'clamp(18px,2.5vw,22px)', textTransform: 'uppercase', color: '#fff', marginBottom: 12 }}>Service Area</h3>
                    <p style={{ fontSize: 'clamp(14px,1.5vw,16px)', color: '#9CA3AF', lineHeight: 1.7, fontWeight: 300 }}>
                      {wc?.serviceAreaText || `We proudly serve ${loc || 'the local area'} and surrounding communities. Our crews are dispatched daily across the region, so chances are we cover your neighborhood. Call to confirm availability at your address.`}
                    </p>
                  </div>
                </Reveal>
              </div>

              {/* Contact FAQ */}
              <Reveal>
                <h2 style={{ fontFamily: head, fontWeight: 700, fontSize: 'clamp(22px,3.5vw,32px)', textTransform: 'uppercase', color: '#fff', marginBottom: 24 }}>Frequently Asked</h2>
              </Reveal>
              <div style={{ borderTop: `3px solid ${A}`, marginBottom: 48 }}>
                {faqs.slice(0, 4).map((f, i) => {
                  const idx = i + 100
                  return (
                    <Reveal key={i}>
                      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <button onClick={() => setFaqOpen(faqOpen === idx ? null : idx)}
                          style={{ width: '100%', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'clamp(14px,2vw,20px) 0', background: 'none', border: 'none', cursor: 'pointer', gap: 16 }}>
                          <span style={{ fontFamily: head, fontWeight: 500, fontSize: 'clamp(14px,1.8vw,17px)', color: '#E8E6E1', textTransform: 'uppercase', letterSpacing: 1 }}>{f.q}</span>
                          {faqOpen === idx ? <Minus size={16} color={A} /> : <Plus size={16} color="#9CA3AF" />}
                        </button>
                        <div style={{ maxHeight: faqOpen === idx ? 200 : 0, overflow: 'hidden', transition: 'max-height 0.3s ease' }}>
                          <p style={{ fontSize: 'clamp(13px,1.4vw,15px)', color: '#9CA3AF', lineHeight: 1.7, paddingBottom: 16, fontWeight: 300 }}>{f.a}</p>
                        </div>
                      </div>
                    </Reveal>
                  )
                })}
              </div>

              {/* Estimate Form CTA */}
              <Reveal>
                <div style={{ background: '#252830', padding: 'clamp(28px,4vw,48px)', borderTop: `4px solid ${A}`, position: 'relative' }}>
                  <h3 style={{ fontFamily: head, fontWeight: 600, fontSize: 'clamp(20px,3vw,28px)', textTransform: 'uppercase', color: '#fff', marginBottom: 12 }}>Request an Estimate</h3>
                  <p style={{ fontSize: 'clamp(14px,1.5vw,16px)', color: '#9CA3AF', lineHeight: 1.7, marginBottom: 24, fontWeight: 300 }}>Tell us about your project and we&rsquo;ll get back to you with a detailed, no-obligation quote.</p>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <button onClick={onCTAClick} className="ic-press" style={{ fontFamily: head, fontWeight: 600, fontSize: 15, background: A, color: '#1C1F26', padding: '16px 36px', border: 'none', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 2, flex: '1 1 auto' }}>Get Free Estimate</button>
                    {phone && <button onClick={onCallClick} className="ic-press" style={{ fontFamily: head, fontWeight: 600, fontSize: 15, color: '#fff', background: 'none', border: '2px solid rgba(255,255,255,0.15)', padding: '16px 36px', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 2, flex: '1 1 auto' }}>
                      <Phone size={16} style={{ display: 'inline', verticalAlign: -3, marginRight: 8 }} />{fmt(phone)}
                    </button>}
                  </div>
                  <Bolts />
                </div>
              </Reveal>
            </div>
          </section>
        </div>

        {/* FOOTER */}
        <footer style={{ background: '#15171D', borderTop: `3px solid ${A}`, padding: 'clamp(32px,5vw,48px) clamp(16px,4vw,32px)', textAlign: 'center' }}>
          <p style={{ fontFamily: head, fontWeight: 600, fontSize: 16, color: '#fff', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>{name}</p>
          {loc && <p style={{ fontFamily: mono, fontSize: 11, color: '#6B7280', letterSpacing: 1, marginBottom: 8 }}>{loc}</p>}
          <p style={{ fontFamily: mono, fontSize: 11, color: '#6B7280', letterSpacing: 1 }}>&copy; {new Date().getFullYear()} {name}. All rights reserved.</p>
        </footer>
      </div>

      {/* LIGHTBOX with prev/next */}
      {lb !== null && photos[lb] && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={() => setLb(null)} style={{ position: 'absolute', inset: 0 }} />
          <img src={photos[lb]} alt="" style={{ maxWidth: '85vw', maxHeight: '85vh', objectFit: 'contain', position: 'relative', zIndex: 1 }} />
          <button onClick={() => setLb(null)} style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', color: '#fff', cursor: 'pointer', zIndex: 2 }}><X size={28} /></button>
          {photos.length > 1 && <>
            <button onClick={e => { e.stopPropagation(); setLb((lb - 1 + photos.length) % photos.length) }} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', cursor: 'pointer', padding: 12, zIndex: 2 }}><ChevronLeft size={28} /></button>
            <button onClick={e => { e.stopPropagation(); setLb((lb + 1) % photos.length) }} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', cursor: 'pointer', padding: 12, zIndex: 2 }}><ChevronRight size={28} /></button>
          </>}
          <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 2 }}>
            <span style={{ fontFamily: mono, fontSize: 12, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 2 }}>
              {String(lb + 1).padStart(2, '0')} / {String(photos.length).padStart(2, '0')}
            </span>
          </div>
        </div>
      )}

      {/* CHAT WIDGET */}
      {chatOpen && (
        <div style={{ position: 'fixed', bottom: 80, right: 16, zIndex: 9997, width: 'min(360px, calc(100vw - 32px))', background: '#1C1F26', border: `2px solid ${A}30`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', background: '#252830', borderBottom: `2px solid ${A}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: head, fontWeight: 600, fontSize: 14, color: '#fff', textTransform: 'uppercase', letterSpacing: 1 }}>{name}</span>
            <button onClick={() => setChatOpen(false)} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}><X size={18} /></button>
          </div>
          <div style={{ padding: 16, flex: 1 }}>
            <div style={{ background: '#252830', padding: 12, borderLeft: `3px solid ${A}`, marginBottom: 12 }}>
              <p style={{ fontSize: 13, color: '#D1CFC9' }}>How can we help? We typically respond within minutes.</p>
            </div>
          </div>
          <div style={{ padding: 12, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 8 }}>
            <input type="text" placeholder="Type a message..." style={{ flex: 1, padding: '10px 14px', background: '#252830', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: 13, outline: 'none', fontFamily: body }} />
            <button onClick={onCTAClick} style={{ background: A, border: 'none', padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Send size={16} color="#1C1F26" /></button>
          </div>
        </div>
      )}
      <button onClick={() => setChatOpen(!chatOpen)}
        style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 9997, width: 52, height: 52, background: A, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {chatOpen ? <X size={22} color="#1C1F26" /> : <MessageCircle size={22} color="#1C1F26" />}
      </button>
    </div>
  )
}
