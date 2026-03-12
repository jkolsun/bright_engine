'use client'
/*
 * SUMMIT TEMPLATE
 * Minimal luxury, vast whitespace, elegant typography.
 * Pure white (#FFFFFF) with near-black text (#1A1A1A), light gray sections (#F9F9F9).
 * Fonts: Cormorant Garamond (heading) / Lato (body) / Space Mono (mono)
 * Accent used sparingly — a single dot, a thin line, a button.
 */

import { useState, useEffect, useRef } from 'react'
import { Phone, MapPin, Star, CheckCircle, ArrowRight, Mail, Camera, MessageCircle, X, Send, Menu, Minus, Plus, Quote, ChevronLeft, ChevronRight } from 'lucide-react'
import type { TemplateProps } from '../config/template-types'
import DisclaimerBanner from '../shared/DisclaimerBanner'
import PhotoPlaceholder from '../shared/PhotoPlaceholder'
import ServicePageContent from '../shared/ServiceSections'
import type { ServicePageTheme } from '../shared/ServiceSections'
import { resolveServiceImage, handleImgError } from '../shared/photoUtils'

/* ── Helpers ─────────────────────────────────────────── */

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
  return m[config.accentColor] || '#0ea5e9'
}

function Reveal({ children, delay = 0, y = 20, className = '' }: { children: React.ReactNode; delay?: number; y?: number; className?: string }) {
  const [vis, setVis] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect() } }, { threshold: 0.08 })
    obs.observe(el); return () => obs.disconnect()
  }, [])
  return (
    <div ref={ref} className={className} style={{
      opacity: vis ? 1 : 0,
      transform: vis ? 'translateY(0)' : `translateY(${y}px)`,
      transition: `opacity 0.8s cubic-bezier(0.25,0.46,0.45,0.94) ${delay}ms, transform 0.8s cubic-bezier(0.25,0.46,0.45,0.94) ${delay}ms`,
    }}>
      {children}
    </div>
  )
}

function ChatWidget({ name, accent }: { name: string; accent: string }) {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<{from:string;text:string}[]>([])
  const [input, setInput] = useState(''); const [typing, setTyping] = useState(false)
  const endRef = useRef<HTMLDivElement>(null); const inRef = useRef<HTMLInputElement>(null)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }) }, [msgs])
  useEffect(() => {
    if(open && msgs.length===0){ setTyping(true); const t=setTimeout(()=>{setMsgs([{from:'bot',text:`Hi! Welcome to ${name}. How can we help you today?`}]);setTyping(false)},700); return()=>clearTimeout(t) }
    if(open) setTimeout(()=>inRef.current?.focus(),100)
  }, [open,name])
  const send = (t?:string) => {
    const m=t||input.trim(); if(!m) return; setMsgs(p=>[...p,{from:'user',text:m}]); setInput(''); setTyping(true)
    setTimeout(()=>{
      let r="Thanks for reaching out! We'll get back to you shortly."
      if(m.toLowerCase().includes('estimat')||m.toLowerCase().includes('quot')) r="We'd love to give you a free estimate! Share some details or call us."
      else if(m.toLowerCase().includes('servic')) r="Check out our Services page for the full list, or tell me what you need."
      else if(m.toLowerCase().includes('hour')) r="We're available Mon-Sat, and 24/7 for emergencies."
      setMsgs(p=>[...p,{from:'bot',text:r}]); setTyping(false)
    },1000)
  }
  return (<>
    <button onClick={()=>setOpen(!open)} className="fixed bottom-6 right-5 z-[100] sm:bottom-6 bottom-20" aria-label="Chat">
      <div className="w-14 h-14 flex items-center justify-center shadow-lg text-white" style={{background:accent,borderRadius:0}}>{open?<X size={22}/>:<MessageCircle size={22}/>}</div>
    </button>
    {open&&(<div className="fixed sm:bottom-24 bottom-28 right-5 z-[100] w-[370px] max-w-[calc(100vw-2.5rem)] bg-white shadow-2xl overflow-hidden border border-gray-100">
      <div className="px-5 py-4 text-white" style={{background:accent}}>
        <p className="font-bold text-sm">{name}</p>
        <p className="text-[10px] opacity-60 mt-0.5">AI Assistant by Bright Automations</p>
      </div>
      <div className="h-[260px] overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
        {msgs.map((m,i)=>(<div key={i} className={`flex ${m.from==='user'?'justify-end':'justify-start'}`}><div className={`max-w-[80%] px-4 py-2.5 text-sm leading-relaxed ${m.from==='user'?'text-white':'bg-white text-gray-700 border border-gray-100'}`} style={m.from==='user'?{background:accent}:{}}>{m.text}</div></div>))}
        {typing&&<div className="flex justify-start"><div className="bg-white px-4 py-3 border border-gray-100"><div className="flex gap-1">{[0,150,300].map(d=><span key={d} className="w-2 h-2 animate-bounce" style={{background:accent,opacity:0.4,animationDelay:`${d}ms`}}/>)}</div></div></div>}
        <div ref={endRef}/>
      </div>
      <div className="px-4 py-3 bg-white border-t border-gray-100"><div className="flex gap-2">
        <input ref={inRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Type a message..." className="flex-1 text-sm px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-800 focus:outline-none focus:border-gray-300 placeholder:text-gray-400"/>
        <button onClick={()=>send()} disabled={!input.trim()} className="w-10 h-10 flex items-center justify-center text-white disabled:opacity-30" style={{background:accent}}><Send size={15}/></button>
      </div></div>
    </div>)}
  </>)
}

/* ── Fonts ────────────────────────────────────────────── */

const heading = "'Cormorant Garamond', Georgia, serif"
const body = "'Lato', system-ui, sans-serif"
const mono = "'Space Mono', monospace"

/* ── Main Template ───────────────────────────────────── */

export default function SummitTemplate({ lead, config, onCTAClick, onCallClick, websiteCopy: wc }: TemplateProps) {
  const [page, setPage] = useState<'home' | 'services' | 'about' | 'contact'>('home')
  const [mobNav, setMobNav] = useState(false)
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', service: '', message: '' })
  const [formSent, setFormSent] = useState(false)

  const go = (p: typeof page) => { setPage(p); setMobNav(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  const svc = lead.enrichedServices || []
  const photos = lead.enrichedPhotos || []
  const loc = [lead.city, lead.state].filter(Boolean).join(', ')
  const indLabel = (lead.industry || 'general contracting').toLowerCase().replace(/_/g, ' ')
  const hasR = lead.enrichedRating && lead.enrichedRating > 0
  const A = getAccent(config)

  const svcData = svc.map((n, i) => ({
    name: n,
    desc: wc?.serviceDescriptions?.[n] || `Professional ${n.toLowerCase()} services tailored to your needs.`,
    img: resolveServiceImage(n, i, photos, lead.stockPhotos),
  }))

  const testis = [
    { text: wc?.testimonialQuote || `${lead.companyName} exceeded expectations. On time, clean work, great communication throughout.`, name: wc?.testimonialAuthor || 'Rachel M.' },
    ...(wc?.additionalTestimonials?.map(t => ({ text: t.quote, name: t.author })) || [
      { text: 'We compared five companies — these guys were the most professional and the fairest price.', name: 'David K.' },
      { text: 'Already recommended them to two neighbors. That says everything.', name: 'Linda P.' },
    ]),
  ]

  const whyUs = wc?.whyChooseUs || wc?.valueProps || [
    { title: 'Licensed & Insured', description: 'Full protection on every job.' },
    { title: 'Fast Response', description: 'Same-day service when you need it most.' },
    { title: 'Satisfaction Guarantee', description: 'Not happy? We make it right, period.' },
  ]

  const handleSubmit = () => { onCTAClick(); setFormSent(true) }

  const PAGES: { k: typeof page; l: string }[] = [
    { k: 'home', l: 'Home' },
    { k: 'services', l: 'Services' },
    { k: 'about', l: 'About' },
    { k: 'contact', l: 'Contact' },
  ]

  const svcTheme: ServicePageTheme = {
    accent: A,
    fonts: { heading, body, mono },
    bgPrimary: '#FFFFFF',
    bgSecondary: '#F9F9F9',
    textPrimary: '#1A1A1A',
    textSecondary: '#444444',
    textMuted: '#888888',
    cardBg: '#FFFFFF',
    cardBorder: 'rgba(0,0,0,0.06)',
    isDark: false,
    borderRadius: '0px',
  }

  return (
    <div className="preview-template min-h-screen antialiased" style={{ fontFamily: body, background: '#FFFFFF', color: '#1A1A1A', overflowX: 'hidden' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&family=Lato:wght@300;400;700&family=Space+Mono:wght@400;700&display=swap');
        @keyframes sm-fadeIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes sm-scrollHint{0%,100%{transform:translateY(0);opacity:0.4}50%{transform:translateY(8px);opacity:1}}
        .sm-link{position:relative;text-decoration:none;color:#1A1A1A;transition:color .3s}
        .sm-link::after{content:'';position:absolute;bottom:-2px;left:0;width:0;height:1px;background:${A};transition:width .3s ease}
        .sm-link:hover::after{width:100%}.sm-link:hover{color:${A}}
        .sm-link-active::after{width:100%;background:${A}}
        .sm-overlay{position:fixed;inset:0;z-index:60;background:rgba(255,255,255,0.97);backdrop-filter:blur(20px);display:flex;flex-direction:column;padding:100px 32px 40px;animation:sm-fadeIn .3s ease}
        .sm-input{width:100%;font-size:15px;padding:16px 0;border:none;border-bottom:1px solid #E0E0E0;background:transparent;color:#1A1A1A;outline:none;transition:border-color .3s;font-family:${body};box-sizing:border-box}
        .sm-input:focus{border-bottom-color:${A}}
        .sm-input::placeholder{color:#BBBBBB}
        .sm-btn{display:inline-flex;align-items:center;gap:10px;padding:18px 40px;font-size:14px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;border:none;cursor:pointer;transition:all .3s;font-family:${body}}
        .sm-btn-primary{background:${A};color:#fff}.sm-btn-primary:hover{opacity:0.88}
        .sm-btn-outline{background:transparent;border:1px solid #1A1A1A;color:#1A1A1A}.sm-btn-outline:hover{border-color:${A};color:${A}}
        .sm-hairline{width:100%;height:1px;background:#E8E8E8}
        ::selection{background:${A}22;color:#1A1A1A}
        textarea.sm-input{resize:none}
      ` }} />

      <DisclaimerBanner variant="modern" companyName={lead.companyName} />

      {/* ── DESKTOP NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 hidden lg:block" style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid #F0F0F0' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 clamp(24px,4vw,64px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 72 }}>
          <button onClick={() => go('home')} data-nav-page="home" style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: heading, fontSize: 18, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#1A1A1A' }}>
            {lead.companyName}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
            {PAGES.map(p => (
              <button key={p.k} onClick={() => go(p.k)} data-nav-page={p.k} className={`sm-link ${page === p.k ? 'sm-link-active' : ''}`} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: body, fontSize: 13, fontWeight: 400, letterSpacing: '0.05em', textTransform: 'uppercase', padding: '4px 0' }}>
                {p.l}
              </button>
            ))}
            {lead.phone && (
              <a href={`tel:${lead.phone}`} onClick={onCallClick} style={{ fontFamily: mono, fontSize: 13, color: '#1A1A1A', textDecoration: 'none', letterSpacing: '0.02em' }}>
                {fmt(lead.phone)}
              </a>
            )}
          </div>
        </div>
      </nav>

      {/* ── MOBILE NAV ── */}
      <nav className="lg:hidden fixed top-0 left-0 right-0 z-50" style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid #F0F0F0', padding: '0 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
          <button onClick={() => go('home')} data-nav-page="home" style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: heading, fontSize: 16, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#1A1A1A', maxWidth: 'calc(100vw - 100px)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {lead.companyName}
          </button>
          <button onClick={() => setMobNav(!mobNav)} aria-label="Menu" style={{ width: 40, height: 40, background: 'none', border: '1px solid #E0E0E0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            {mobNav ? <X size={18} style={{ color: '#666' }} /> : <Menu size={18} style={{ color: '#666' }} />}
          </button>
        </div>
      </nav>

      {/* ── MOBILE NAV OVERLAY ── */}
      {mobNav && (
        <div className="sm-overlay lg:hidden">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {PAGES.map(p => (
              <button key={p.k} onClick={() => go(p.k)} data-nav-page={p.k} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: heading, fontSize: 32, fontWeight: 300, color: page === p.k ? A : '#1A1A1A', textAlign: 'left', padding: '12px 0', transition: 'color .3s' }}>
                {p.l}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button onClick={() => { onCTAClick(); go('contact') }} className="sm-btn sm-btn-primary" style={{ justifyContent: 'center' }}>
              {config.ctaText || 'Get Free Quote'} <ArrowRight size={14} />
            </button>
            {lead.phone && (
              <a href={`tel:${lead.phone}`} onClick={onCallClick} className="sm-btn sm-btn-outline" style={{ justifyContent: 'center', textDecoration: 'none' }}>
                <Phone size={14} /> {fmt(lead.phone)}
              </a>
            )}
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* ═══ HOME ═══ */}
      {/* ================================================================ */}
      <div data-page="home" style={{ display: page === 'home' ? 'block' : 'none' }}>

        {/* ── HERO ── Full-height centered text */}
        <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: 'clamp(100px,14vh,160px) clamp(24px,6vw,80px)', position: 'relative' }}>
          <Reveal>
            {hasR && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 24 }}>
                <div style={{ display: 'flex', gap: 2 }}>
                  {Array.from({ length: 5 }, (_, i) => <Star key={i} size={12} style={{ color: '#D4AF37', fill: '#D4AF37' }} />)}
                </div>
                <span style={{ fontFamily: mono, fontSize: 12, color: '#999', letterSpacing: '0.05em' }}>
                  {lead.enrichedRating} stars &middot; {lead.enrichedReviews || '100'}+ reviews
                </span>
              </div>
            )}
          </Reveal>
          <Reveal delay={100}>
            <h1 style={{ fontFamily: heading, fontSize: 'clamp(48px,9vw,120px)', fontWeight: 300, lineHeight: 1.0, letterSpacing: '-0.02em', color: '#1A1A1A', maxWidth: 1000, margin: '0 auto 32px', overflowWrap: 'break-word' }}>
              {wc?.heroHeadline || config.tagline || `Quality ${indLabel} you can trust`}
              <span style={{ color: A }}>.</span>
            </h1>
          </Reveal>
          <Reveal delay={250}>
            <p style={{ fontFamily: body, fontSize: 'clamp(16px,1.8vw,20px)', fontWeight: 300, color: '#888', maxWidth: 520, margin: '0 auto 48px', lineHeight: 1.7 }}>
              {wc?.heroSubheadline || `Professional ${indLabel}${loc ? ` in ${loc}` : ''} — built on trust, delivered with excellence.`}
            </p>
          </Reveal>
          <Reveal delay={400}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center' }}>
              <button onClick={() => { onCTAClick(); go('contact') }} className="sm-btn sm-btn-primary">
                {config.ctaText || 'Get Free Quote'} <ArrowRight size={14} />
              </button>
              {lead.phone && (
                <a href={`tel:${lead.phone}`} onClick={onCallClick} className="sm-btn sm-btn-outline" style={{ textDecoration: 'none' }}>
                  <Phone size={14} /> Call Now
                </a>
              )}
            </div>
          </Reveal>
          {/* Scroll indicator */}
          <div style={{ position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#CCC' }}>Scroll</span>
            <div style={{ width: 1, height: 32, background: '#DDD', animation: 'sm-scrollHint 2s ease infinite' }} />
          </div>
        </section>

        {/* ── HAIRLINE ── */}
        <div className="sm-hairline" />

        {/* ── ABOUT TEASER ── */}
        <section style={{ padding: 'clamp(100px,15vw,200px) clamp(24px,6vw,80px)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <Reveal>
              <div style={{ width: 40, height: 2, background: A, marginBottom: 32 }} />
            </Reveal>
            <Reveal delay={100}>
              <p style={{ fontFamily: heading, fontSize: 'clamp(24px,3.5vw,40px)', fontWeight: 400, fontStyle: 'italic', lineHeight: 1.5, color: '#444', maxWidth: 600 }}>
                {wc?.aboutParagraph1 || `${lead.companyName} provides expert ${indLabel}${loc ? ` in ${loc}` : ''}, combining years of experience with a commitment to quality that shows in every project.`}
              </p>
            </Reveal>
            <Reveal delay={200}>
              <button onClick={() => go('about')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: mono, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: A, marginTop: 32, padding: 0, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                Our Story <ArrowRight size={12} />
              </button>
            </Reveal>
          </div>
        </section>

        <div className="sm-hairline" />

        {/* ── SERVICES GRID (text only) ── */}
        {svc.length > 0 && (
          <section style={{ padding: 'clamp(100px,15vw,200px) clamp(24px,6vw,80px)' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
              <Reveal>
                <p style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#BBB', marginBottom: 12 }}>Services</p>
                <h2 style={{ fontFamily: heading, fontSize: 'clamp(36px,5vw,64px)', fontWeight: 300, letterSpacing: '-0.02em', marginBottom: 64 }}>
                  What we offer<span style={{ color: A }}>.</span>
                </h2>
              </Reveal>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: 0 }}>
                {svcData.slice(0, 6).map((s, i) => (
                  <Reveal key={i} delay={i * 60}>
                    <div onClick={() => go('services')} style={{ padding: 'clamp(24px,3vw,40px) 0', borderBottom: '1px solid #E8E8E8', cursor: 'pointer', transition: 'padding-left .3s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.paddingLeft = '12px' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.paddingLeft = '0px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                        <div style={{ flex: 1 }}>
                          <h3 style={{ fontFamily: heading, fontSize: 'clamp(20px,2.5vw,28px)', fontWeight: 500, marginBottom: 8, color: '#1A1A1A' }}>{s.name}</h3>
                          <p style={{ fontFamily: body, fontSize: 14, color: '#999', lineHeight: 1.6, maxWidth: 400 }}>{s.desc}</p>
                        </div>
                        <ArrowRight size={16} style={{ color: '#CCC', flexShrink: 0, marginTop: 8 }} />
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
              {svc.length > 6 && (
                <Reveal delay={400}>
                  <button onClick={() => go('services')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: mono, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: A, marginTop: 40, padding: 0, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    View All Services <ArrowRight size={12} />
                  </button>
                </Reveal>
              )}
            </div>
          </section>
        )}

        <div className="sm-hairline" />

        {/* ── FULL-WIDTH IMAGE BAND ── */}
        <section style={{ position: 'relative', height: 'clamp(300px,50vh,600px)', overflow: 'hidden' }}>
          {photos[0] ? (
            <img src={photos[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={handleImgError} />
          ) : (
            <PhotoPlaceholder accent={A} style={{ width: '100%', height: '100%' }} />
          )}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.2) 100%)' }} />
        </section>

        <div className="sm-hairline" />

        {/* ── TESTIMONIAL ── Full-width centered */}
        <section style={{ padding: 'clamp(100px,15vw,200px) clamp(24px,6vw,80px)', background: '#F9F9F9' }}>
          <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
            <Reveal>
              <Quote size={32} style={{ color: A, opacity: 0.25, margin: '0 auto 32px' }} />
            </Reveal>
            <Reveal delay={100}>
              <p style={{ fontFamily: heading, fontSize: 'clamp(24px,3.5vw,40px)', fontWeight: 400, fontStyle: 'italic', lineHeight: 1.5, color: '#333', marginBottom: 32 }}>
                &ldquo;{testis[0].text}&rdquo;
              </p>
            </Reveal>
            <Reveal delay={200}>
              <div style={{ width: 40, height: 1, background: A, margin: '0 auto 16px' }} />
              <p style={{ fontFamily: mono, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#999' }}>
                {testis[0].name}
              </p>
            </Reveal>
          </div>
        </section>

        <div className="sm-hairline" />

        {/* ── CTA ── Simple headline + line + button */}
        <section style={{ padding: 'clamp(100px,15vw,200px) clamp(24px,6vw,80px)', textAlign: 'center' }}>
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <Reveal>
              <h2 style={{ fontFamily: heading, fontSize: 'clamp(36px,5vw,64px)', fontWeight: 300, lineHeight: 1.1, marginBottom: 32 }}>
                {wc?.closingHeadline || 'Ready to begin'}
                <span style={{ color: A }}>?</span>
              </h2>
            </Reveal>
            <Reveal delay={100}>
              <div style={{ width: 60, height: 1, background: '#E0E0E0', margin: '0 auto 32px' }} />
            </Reveal>
            <Reveal delay={200}>
              <p style={{ fontFamily: body, fontSize: 16, color: '#999', marginBottom: 40, lineHeight: 1.7 }}>
                {wc?.closingBody || 'Free estimate, no obligation. We respond same-day.'}
              </p>
            </Reveal>
            <Reveal delay={300}>
              <button onClick={() => { onCTAClick(); go('contact') }} className="sm-btn sm-btn-primary">
                {config.ctaText || 'Get Free Quote'} <ArrowRight size={14} />
              </button>
            </Reveal>
          </div>
        </section>
      </div>

      {/* ================================================================ */}
      {/* ═══ SERVICES PAGE ═══ */}
      {/* ================================================================ */}
      <div data-page="services" style={{ display: page === 'services' ? 'block' : 'none' }}>
        <ServicePageContent
          services={svcData}
          steps={wc?.processSteps || [
            { title: 'Consultation', description: 'We discuss your needs and vision in detail.' },
            { title: 'Custom Quote', description: 'Transparent pricing with no hidden fees.' },
            { title: 'Expert Execution', description: 'Our skilled team delivers quality results.' },
            { title: 'Final Walkthrough', description: 'We review every detail until you are thrilled.' },
          ]}
          whyUs={whyUs}
          lead={lead}
          config={config}
          theme={svcTheme}
          onCTAClick={onCTAClick}
          onCallClick={onCallClick}
          goToContact={() => go('contact')}
        />
      </div>

      {/* ================================================================ */}
      {/* ═══ ABOUT PAGE ═══ */}
      {/* ================================================================ */}
      <div data-page="about" style={{ display: page === 'about' ? 'block' : 'none' }}>

        {/* Header */}
        <section style={{ padding: 'clamp(120px,16vh,200px) clamp(24px,6vw,80px) clamp(60px,8vw,100px)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <Reveal>
              <p style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#BBB', marginBottom: 12 }}>About</p>
            </Reveal>
            <Reveal delay={100}>
              <h1 style={{ fontFamily: heading, fontSize: 'clamp(48px,8vw,96px)', fontWeight: 300, letterSpacing: '-0.02em', lineHeight: 1.0, marginBottom: 40 }}>
                Our story<span style={{ color: A }}>.</span>
              </h1>
            </Reveal>
            <Reveal delay={200}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 480px), 1fr))', gap: 'clamp(32px,4vw,64px)' }}>
                <p style={{ fontFamily: body, fontSize: 'clamp(16px,1.6vw,18px)', lineHeight: 1.8, color: '#666' }}>
                  {wc?.aboutParagraph1 || `${lead.companyName} provides expert ${indLabel}${loc ? ` in ${loc}` : ''}, combining years of experience with a commitment to quality that shows in every project.`}
                </p>
                {wc?.aboutParagraph2 && (
                  <p style={{ fontFamily: body, fontSize: 'clamp(16px,1.6vw,18px)', lineHeight: 1.8, color: '#666' }}>
                    {wc.aboutParagraph2}
                  </p>
                )}
              </div>
            </Reveal>
          </div>
        </section>

        <div className="sm-hairline" />

        {/* Photo */}
        {photos[1] && (
          <>
            <section style={{ position: 'relative', height: 'clamp(280px,45vh,500px)', overflow: 'hidden' }}>
              <img src={photos[1]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={handleImgError} />
            </section>
            <div className="sm-hairline" />
          </>
        )}

        {/* Why Us */}
        <section style={{ padding: 'clamp(100px,15vw,200px) clamp(24px,6vw,80px)', background: '#F9F9F9' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <Reveal>
              <p style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#BBB', marginBottom: 12 }}>Why Us</p>
              <h2 style={{ fontFamily: heading, fontSize: 'clamp(36px,5vw,56px)', fontWeight: 300, letterSpacing: '-0.02em', marginBottom: 64 }}>
                Why choose {lead.companyName}<span style={{ color: A }}>.</span>
              </h2>
            </Reveal>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 'clamp(32px,4vw,48px)' }}>
              {whyUs.slice(0, 3).map((vp, i) => (
                <Reveal key={i} delay={i * 100}>
                  <div style={{ borderTop: `2px solid ${A}`, paddingTop: 24 }}>
                    <h4 style={{ fontFamily: heading, fontSize: 22, fontWeight: 600, marginBottom: 12, color: '#1A1A1A' }}>{vp.title}</h4>
                    <p style={{ fontFamily: body, fontSize: 14, color: '#888', lineHeight: 1.7 }}>{vp.description}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <div className="sm-hairline" />

        {/* Stats */}
        <section style={{ padding: 'clamp(80px,12vw,160px) clamp(24px,6vw,80px)' }}>
          <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 'clamp(40px,8vw,80px)' }}>
            {[
              hasR && { v: `${lead.enrichedRating}`, l: 'Rating' },
              lead.enrichedReviews && { v: `${lead.enrichedReviews}+`, l: 'Reviews' },
              { v: '10+', l: 'Years' },
              { v: '100%', l: 'Satisfaction' },
            ].filter(Boolean).map((st, i) => {
              const s = st as { v: string; l: string }
              return (
                <Reveal key={i} delay={i * 100}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontFamily: heading, fontSize: 'clamp(40px,6vw,64px)', fontWeight: 300, color: '#1A1A1A', lineHeight: 1 }}>{s.v}</p>
                    <p style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#BBB', marginTop: 12 }}>{s.l}</p>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </section>

        <div className="sm-hairline" />

        {/* Testimonials */}
        <section style={{ padding: 'clamp(100px,15vw,200px) clamp(24px,6vw,80px)', background: '#F9F9F9' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <Reveal>
              <p style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#BBB', marginBottom: 12 }}>Testimonials</p>
              <h2 style={{ fontFamily: heading, fontSize: 'clamp(36px,5vw,56px)', fontWeight: 300, letterSpacing: '-0.02em', marginBottom: 64 }}>
                What clients say<span style={{ color: A }}>.</span>
              </h2>
            </Reveal>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 'clamp(32px,4vw,48px)' }}>
              {testis.slice(0, 3).map((t, i) => (
                <Reveal key={i} delay={i * 120}>
                  <div>
                    <div style={{ display: 'flex', gap: 2, marginBottom: 20 }}>
                      {Array.from({ length: 5 }, (_, j) => <Star key={j} size={14} style={{ color: '#D4AF37', fill: '#D4AF37' }} />)}
                    </div>
                    <p style={{ fontFamily: heading, fontSize: 18, fontStyle: 'italic', lineHeight: 1.6, color: '#555', marginBottom: 20 }}>
                      &ldquo;{t.text}&rdquo;
                    </p>
                    <div style={{ width: 24, height: 1, background: '#DDD', marginBottom: 12 }} />
                    <p style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#AAA' }}>{t.name}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* About CTA */}
        <section style={{ padding: 'clamp(80px,12vw,160px) clamp(24px,6vw,80px)', textAlign: 'center' }}>
          <Reveal>
            <h2 style={{ fontFamily: heading, fontSize: 'clamp(32px,4.5vw,52px)', fontWeight: 300, marginBottom: 24 }}>
              Work with us<span style={{ color: A }}>.</span>
            </h2>
            <div style={{ width: 40, height: 1, background: '#E0E0E0', margin: '0 auto 24px' }} />
            <button onClick={() => { onCTAClick(); go('contact') }} className="sm-btn sm-btn-primary">
              Get Started <ArrowRight size={14} />
            </button>
          </Reveal>
        </section>
      </div>

      {/* ================================================================ */}
      {/* ═══ CONTACT PAGE ═══ */}
      {/* ================================================================ */}
      <div data-page="contact" style={{ display: page === 'contact' ? 'block' : 'none' }}>

        {/* Header */}
        <section style={{ padding: 'clamp(120px,16vh,200px) clamp(24px,6vw,80px) clamp(40px,5vw,60px)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <Reveal>
              <p style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#BBB', marginBottom: 12 }}>Contact</p>
            </Reveal>
            <Reveal delay={100}>
              <h1 style={{ fontFamily: heading, fontSize: 'clamp(48px,8vw,96px)', fontWeight: 300, letterSpacing: '-0.02em', lineHeight: 1.0, marginBottom: 20 }}>
                Get in touch<span style={{ color: A }}>.</span>
              </h1>
            </Reveal>
            <Reveal delay={200}>
              <p style={{ fontFamily: body, fontSize: 'clamp(16px,1.6vw,18px)', color: '#888', maxWidth: 480, lineHeight: 1.7 }}>
                We would love to hear from you. Reach out and we will respond same-day.
              </p>
            </Reveal>
          </div>
        </section>

        <div className="sm-hairline" />

        {/* Contact info + Form */}
        <section style={{ padding: 'clamp(80px,12vw,160px) clamp(24px,6vw,80px)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 440px), 1fr))', gap: 'clamp(48px,8vw,100px)' }}>

            {/* Left: Contact info */}
            <Reveal>
              <div>
                <div style={{ marginBottom: 48 }}>
                  <p style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#BBB', marginBottom: 16 }}>Phone</p>
                  {lead.phone && (
                    <a href={`tel:${lead.phone}`} onClick={onCallClick} style={{ fontFamily: heading, fontSize: 'clamp(24px,3vw,32px)', fontWeight: 400, color: '#1A1A1A', textDecoration: 'none', display: 'block' }}>
                      {fmt(lead.phone)}
                    </a>
                  )}
                </div>
                <div style={{ width: '100%', height: 1, background: '#E8E8E8', marginBottom: 48 }} />
                <div style={{ marginBottom: 48 }}>
                  <p style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#BBB', marginBottom: 16 }}>Email</p>
                  {lead.email && (
                    <a href={`mailto:${lead.email}`} style={{ fontFamily: body, fontSize: 16, color: '#1A1A1A', textDecoration: 'none' }}>
                      {lead.email}
                    </a>
                  )}
                </div>
                <div style={{ width: '100%', height: 1, background: '#E8E8E8', marginBottom: 48 }} />
                <div>
                  <p style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#BBB', marginBottom: 16 }}>Location</p>
                  <p style={{ fontFamily: body, fontSize: 16, color: '#1A1A1A' }}>
                    {lead.enrichedAddress || loc || 'Contact us for service area details'}
                  </p>
                </div>
                {wc?.serviceAreaText && (
                  <>
                    <div style={{ width: '100%', height: 1, background: '#E8E8E8', margin: '48px 0' }} />
                    <div>
                      <p style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#BBB', marginBottom: 16 }}>Service Area</p>
                      <p style={{ fontFamily: body, fontSize: 14, color: '#888', lineHeight: 1.7 }}>{wc.serviceAreaText}</p>
                    </div>
                  </>
                )}
              </div>
            </Reveal>

            {/* Right: Form */}
            <Reveal delay={150}>
              <div>
                {formSent ? (
                  <div style={{ textAlign: 'center', padding: '60px 0' }}>
                    <CheckCircle size={40} style={{ color: A, margin: '0 auto 20px' }} />
                    <h3 style={{ fontFamily: heading, fontSize: 28, fontWeight: 400, marginBottom: 12 }}>Thank you</h3>
                    <p style={{ fontFamily: body, fontSize: 15, color: '#888' }}>We will be in touch shortly.</p>
                  </div>
                ) : (
                  <>
                    <h3 style={{ fontFamily: heading, fontSize: 'clamp(24px,3vw,32px)', fontWeight: 400, marginBottom: 8 }}>Request an Estimate</h3>
                    <p style={{ fontFamily: body, fontSize: 14, color: '#BBB', marginBottom: 40 }}>Free estimate, no obligation.</p>
                    <input
                      className="sm-input"
                      placeholder="Full Name"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                    <input
                      className="sm-input"
                      type="tel"
                      placeholder="Phone"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    />
                    <input
                      className="sm-input"
                      type="email"
                      placeholder="Email"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                    />
                    {svc.length > 0 && (
                      <select
                        className="sm-input"
                        value={formData.service}
                        onChange={e => setFormData({ ...formData, service: e.target.value })}
                        style={{ width: '100%', fontSize: 15, padding: '16px 0', border: 'none', borderBottom: '1px solid #E0E0E0', background: 'transparent', color: formData.service ? '#1A1A1A' : '#BBBBBB', outline: 'none', fontFamily: body, cursor: 'pointer', boxSizing: 'border-box' }}
                      >
                        <option value="">Select service</option>
                        {svc.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    )}
                    <textarea
                      className="sm-input"
                      placeholder="Tell us about your project..."
                      rows={4}
                      value={formData.message}
                      onChange={e => setFormData({ ...formData, message: e.target.value })}
                      style={{ marginBottom: 40 }}
                    />
                    <button onClick={handleSubmit} className="sm-btn sm-btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                      Submit Request <ArrowRight size={14} />
                    </button>
                  </>
                )}
              </div>
            </Reveal>
          </div>
        </section>
      </div>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ borderTop: '1px solid #E8E8E8', padding: 'clamp(60px,8vw,100px) clamp(24px,6vw,80px) clamp(100px,12vw,140px)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'clamp(32px,4vw,48px)', marginBottom: 48 }}>
            <div>
              <p style={{ fontFamily: heading, fontSize: 20, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12, color: '#1A1A1A' }}>{lead.companyName}</p>
              <p style={{ fontFamily: body, fontSize: 14, color: '#AAA', maxWidth: 280, lineHeight: 1.6 }}>
                Professional {indLabel}{loc ? ` in ${loc}` : ''}. Licensed and insured.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 'clamp(24px,4vw,48px)' }}>
              <div>
                <p style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#CCC', marginBottom: 16 }}>Pages</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {PAGES.map(p => (
                    <button key={p.k} onClick={() => go(p.k)} data-nav-page={p.k} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: body, fontSize: 14, color: '#999', textAlign: 'left', padding: 0 }}>
                      {p.l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#CCC', marginBottom: 16 }}>Contact</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14, color: '#999' }}>
                  {lead.phone && <a href={`tel:${lead.phone}`} onClick={onCallClick} style={{ textDecoration: 'none', color: 'inherit' }}>{fmt(lead.phone)}</a>}
                  {lead.email && <a href={`mailto:${lead.email}`} style={{ textDecoration: 'none', color: 'inherit' }}>{lead.email}</a>}
                  {loc && <span>{loc}</span>}
                </div>
              </div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid #F0F0F0', paddingTop: 24, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
            <p style={{ fontFamily: body, fontSize: 12, color: '#CCC' }}>&copy; {new Date().getFullYear()} {lead.companyName}</p>
            <span style={{ fontSize: 10, color: '#DDD' }}>Powered by <a href="https://brightautomations.com" target="_blank" rel="noopener noreferrer" style={{ color: '#BBB' }}>Bright Automations</a></span>
          </div>
        </div>
      </footer>

      <ChatWidget name={lead.companyName} accent={A} />
      <div className="h-20 lg:h-0" />
    </div>
  )
}
