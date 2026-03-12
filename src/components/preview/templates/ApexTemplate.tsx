'use client'
/*
 * APEX TEMPLATE
 * Full-screen editorial, magazine-like feel. Dramatic scale, bold typography,
 * horizontal rules and editorial grid lines as decorative elements.
 * Light base (#FAFBFC), accent used for bold stripes and highlights.
 * Fonts: Playfair Display (heading) / Inter (body) / JetBrains Mono (labels)
 */

import { useState, useEffect, useRef } from 'react'
import { Phone, MapPin, Star, CheckCircle, ArrowRight, Mail, Camera, MessageCircle, X, Send, Menu, Minus, Plus, Quote, ChevronLeft, ChevronRight } from 'lucide-react'
import type { TemplateProps } from '../config/template-types'
import DisclaimerBanner from '../shared/DisclaimerBanner'
import PhotoPlaceholder from '../shared/PhotoPlaceholder'
import ServicePageContent from '../shared/ServiceSections'
import type { ServicePageTheme } from '../shared/ServiceSections'
import { resolveServiceImage } from '../shared/photoUtils'

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

function Counter({ end, suffix='', dur=2000 }: { end: number; suffix?: string; dur?: number }) {
  const [v, setV] = useState(0); const ref = useRef<HTMLSpanElement>(null); const go = useRef(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !go.current) { go.current = true; const s = performance.now()
        const f = (n: number) => { const p = Math.min((n-s)/dur,1); setV(Math.floor((1-Math.pow(1-p,3))*end*10)/10); if(p<1) requestAnimationFrame(f); else setV(end) }
        requestAnimationFrame(f)
      }
    }, { threshold: 0.3 }); obs.observe(el); return () => obs.disconnect()
  }, [end, dur])
  return <span ref={ref}>{Number.isInteger(v)?v:v.toFixed(1)}{suffix}</span>
}

function Reveal({ children, delay=0, y=24, className='' }: { children: React.ReactNode; delay?: number; y?: number; className?: string }) {
  const [vis, setVis] = useState(false); const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => { if(e.isIntersecting){setVis(true);obs.disconnect()} }, { threshold:0.08 })
    obs.observe(el); return () => obs.disconnect()
  }, [])
  return <div ref={ref} className={className} style={{ opacity:vis?1:0, transform:vis?'translateY(0)':`translateY(${y}px)`, transition:`opacity 0.8s cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 0.8s cubic-bezier(0.22,1,0.36,1) ${delay}ms` }}>{children}</div>
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
      <div className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg text-white" style={{background:accent}}>{open?<X size={22}/>:<MessageCircle size={22}/>}</div>
    </button>
    {open&&(<div className="fixed sm:bottom-24 bottom-28 right-5 z-[100] w-[370px] max-w-[calc(100vw-2.5rem)] bg-white shadow-2xl rounded-2xl overflow-hidden border border-gray-100">
      <div className="px-5 py-4 text-white" style={{background:accent}}>
        <p className="font-bold text-sm">{name}</p>
        <p className="text-[10px] opacity-60 mt-0.5">AI Assistant by Bright Automations</p>
      </div>
      <div className="h-[260px] overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
        {msgs.map((m,i)=>(<div key={i} className={`flex ${m.from==='user'?'justify-end':'justify-start'}`}><div className={`max-w-[80%] px-4 py-2.5 text-sm leading-relaxed rounded-2xl ${m.from==='user'?'text-white':'bg-white text-gray-700 border border-gray-100'}`} style={m.from==='user'?{background:accent}:{}}>{m.text}</div></div>))}
        {typing&&<div className="flex justify-start"><div className="bg-white px-4 py-3 rounded-2xl border border-gray-100"><div className="flex gap-1">{[0,150,300].map(d=><span key={d} className="w-2 h-2 rounded-full animate-bounce" style={{background:accent,opacity:0.4,animationDelay:`${d}ms`}}/>)}</div></div></div>}
        <div ref={endRef}/>
      </div>
      <div className="px-4 py-3 bg-white border-t border-gray-100"><div className="flex gap-2">
        <input ref={inRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Type a message..." className="flex-1 text-sm px-4 py-2.5 bg-gray-50 rounded-full border border-gray-200 text-gray-800 focus:outline-none focus:border-gray-300 placeholder:text-gray-400"/>
        <button onClick={()=>send()} disabled={!input.trim()} className="w-10 h-10 rounded-full flex items-center justify-center text-white disabled:opacity-30" style={{background:accent}}><Send size={15}/></button>
      </div></div>
    </div>)}
  </>)
}

/* ── Main Template ───────────────────────────────────── */

export default function ApexTemplate({ lead, config, onCTAClick, onCallClick, websiteCopy: wc }: TemplateProps) {
  const [page, setPage] = useState<'home'|'services'|'about'|'contact'>('home')
  const [mobNav, setMobNav] = useState(false)
  const [lb, setLb] = useState<number|null>(null)
  const [navSolid, setNavSolid] = useState(false)
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', service: '', message: '' })
  const [formSent, setFormSent] = useState(false)

  useEffect(() => {
    const h = () => setNavSolid(window.scrollY > 80)
    window.addEventListener('scroll', h, { passive: true }); return () => window.removeEventListener('scroll', h)
  }, [])

  const go = (p: typeof page) => { setPage(p); setMobNav(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  const svc = lead.enrichedServices || []; const photos = lead.enrichedPhotos || []
  const loc = [lead.city, lead.state].filter(Boolean).join(', ')
  const indLabel = (lead.industry || 'general contracting').toLowerCase().replace(/_/g, ' ')
  const hasR = lead.enrichedRating && lead.enrichedRating > 0
  const A = getAccent(config)

  const svcData = svc.map((n, i) => ({ name: n, desc: wc?.serviceDescriptions?.[n] || `Professional ${n.toLowerCase()} services tailored to your needs.`, img: resolveServiceImage(n, i, photos, lead.stockPhotos) }))
  const testis = [
    { text: wc?.testimonialQuote || `${lead.companyName} exceeded expectations. On time, clean work, great communication throughout.`, name: wc?.testimonialAuthor || 'Rachel M.', loc: lead.city || 'Local' },
    ...(wc?.additionalTestimonials?.map(t => ({ text: t.quote, name: t.author, loc: lead.city || 'Local' })) || [
      { text: "We compared five companies -- these guys were the most professional and the fairest price.", name: 'David K.', loc: lead.city || 'Local' },
      { text: "Already recommended them to two neighbors. That says everything.", name: 'Linda P.', loc: lead.city || 'Local' },
    ])
  ]
  const whyUs = wc?.whyChooseUs || wc?.valueProps || [
    { title: 'Licensed & Insured', description: 'Full protection on every single job.' },
    { title: 'Fast Response', description: 'Same-day service when you need it most.' },
    { title: 'Satisfaction Guarantee', description: 'Not happy? We make it right, period.' },
  ]

  const PAGES = [{ k: 'home' as const, l: 'Home' }, { k: 'services' as const, l: 'Services' }, { k: 'about' as const, l: 'About' }, { k: 'contact' as const, l: 'Contact' }]

  const heading = "'Playfair Display', Georgia, serif"
  const body = "'Inter', system-ui, sans-serif"
  const mono = "'JetBrains Mono', monospace"

  const svcTheme: ServicePageTheme = {
    accent: A,
    fonts: { heading, body, mono },
    bgPrimary: '#FAFBFC',
    bgSecondary: '#F0F1F3',
    textPrimary: '#111318',
    textSecondary: '#3a3f4b',
    textMuted: '#8b8f9a',
    cardBg: '#fff',
    cardBorder: 'rgba(0,0,0,0.06)',
    isDark: false,
    borderRadius: '4px',
  }

  return (
    <div className="preview-template min-h-screen antialiased" style={{ fontFamily: body, background: '#FAFBFC', color: '#111318', overflowX: 'hidden' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,700&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        @keyframes ax-fadeUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
        @keyframes ax-lineGrow{from{width:0}to{width:100%}}
        @keyframes ax-slideDown{from{opacity:0;transform:translateY(-100%)}to{opacity:1;transform:translateY(0)}}
        .ax-btn{display:inline-flex;align-items:center;gap:10px;background:${A};color:#fff;padding:16px 36px;font-weight:600;font-size:14px;letter-spacing:0.04em;text-transform:uppercase;border:none;cursor:pointer;transition:all .3s;font-family:${body};text-decoration:none}
        .ax-btn:hover{opacity:0.88;transform:translateY(-1px);box-shadow:0 8px 30px ${A}30}
        .ax-btn-outline{display:inline-flex;align-items:center;gap:10px;background:transparent;color:#111318;padding:16px 36px;font-weight:600;font-size:14px;letter-spacing:0.04em;text-transform:uppercase;border:2px solid #111318;cursor:pointer;transition:all .3s;font-family:${body};text-decoration:none}
        .ax-btn-outline:hover{background:#111318;color:#fff}
        .ax-rule{height:1px;background:linear-gradient(90deg,transparent,#d1d3d8 20%,#d1d3d8 80%,transparent);margin:0}
        .ax-lift{transition:transform .35s ease,box-shadow .35s ease}.ax-lift:hover{transform:translateY(-4px);box-shadow:0 16px 48px rgba(0,0,0,0.08)}
        .ax-overlay{position:fixed;inset:0;z-index:60;background:rgba(250,251,252,0.98);backdrop-filter:blur(24px);display:flex;flex-direction:column;padding:100px 32px 48px;animation:ax-slideDown .3s ease}
        ::selection{background:${A}25;color:#111318}
      ` }} />

      <DisclaimerBanner variant="modern" companyName={lead.companyName} />

      {/* ── DESKTOP NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 hidden lg:block" style={{ transition: 'all .4s' }}>
        <div style={{ background: navSolid ? 'rgba(250,251,252,0.95)' : 'transparent', backdropFilter: navSolid ? 'blur(20px)' : 'none', borderBottom: navSolid ? '1px solid rgba(0,0,0,0.06)' : '1px solid transparent', transition: 'all .4s' }}>
          <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 clamp(24px,4vw,48px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 72 }}>
            <button onClick={() => go('home')} data-nav-page="home" style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
              {lead.logo ? <img src={lead.logo} alt="" style={{ height: 28, width: 28, borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width: 8, height: 8, background: A, borderRadius: '50%' }} />}
              <span style={{ fontFamily: heading, fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em' }}>{lead.companyName}</span>
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
              {PAGES.map(p => (
                <button key={p.k} onClick={() => go(p.k)} data-nav-page={p.k} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: body, fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: page === p.k ? A : '#8b8f9a', transition: 'color .3s', padding: '4px 0', borderBottom: page === p.k ? `2px solid ${A}` : '2px solid transparent' }}>{p.l}</button>
              ))}
              <button onClick={() => { onCTAClick(); go('contact') }} data-nav-page="contact" className="ax-btn" style={{ padding: '10px 28px', fontSize: 11 }}>{config.ctaText || 'Get Quote'} <ArrowRight size={13} /></button>
            </div>
          </div>
        </div>
      </nav>

      {/* ── MOBILE NAV ── */}
      <nav className="lg:hidden fixed top-0 left-0 right-0 z-50" style={{ background: 'rgba(250,251,252,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(0,0,0,0.06)', padding: '0 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
          <button onClick={() => go('home')} data-nav-page="home" style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            {lead.logo ? <img src={lead.logo} alt="" style={{ height: 24, width: 24, borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width: 6, height: 6, background: A, borderRadius: '50%' }} />}
            <span style={{ fontFamily: heading, fontSize: 15, fontWeight: 700, maxWidth: 'calc(100vw - 180px)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.companyName}</span>
          </button>
          <div className="flex items-center gap-3">
            <button onClick={() => { onCTAClick(); go('contact') }} data-nav-page="contact" style={{ background: A, color: '#fff', border: 'none', cursor: 'pointer', padding: '7px 16px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, fontFamily: body, flexShrink: 0 }}>Quote</button>
            <button onClick={() => setMobNav(!mobNav)} aria-label="Menu" style={{ width: 40, height: 40, background: '#F0F1F3', border: '1px solid #e0e2e6', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: 4 }}>
              {mobNav ? <X size={18} style={{ color: '#666' }} /> : <Menu size={18} style={{ color: '#666' }} />}
            </button>
          </div>
        </div>
      </nav>

      {/* ── MOBILE OVERLAY ── */}
      {mobNav && <div className="ax-overlay lg:hidden">
        <div className="flex flex-col gap-1">
          {PAGES.map(p => (
            <button key={p.k} onClick={() => go(p.k)} data-nav-page={p.k} style={{ background: page === p.k ? `${A}08` : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' as const, fontFamily: heading, fontSize: 28, fontWeight: 700, padding: '14px 8px', color: page === p.k ? A : '#333', borderLeft: page === p.k ? `3px solid ${A}` : '3px solid transparent', transition: 'all .2s' }}>{p.l}</button>
          ))}
        </div>
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
          <button onClick={() => { onCTAClick(); go('contact') }} data-nav-page="contact" className="ax-btn" style={{ justifyContent: 'center' }}>{config.ctaText || 'Get Free Quote'} <ArrowRight size={16} /></button>
          {lead.phone && <a href={`tel:${lead.phone}`} onClick={onCallClick} className="ax-btn-outline" style={{ justifyContent: 'center' }}><Phone size={16} />{fmt(lead.phone)}</a>}
        </div>
      </div>}

      {/* ================================================================ */}
      {/* === HOME === */}
      {/* ================================================================ */}
      <div data-page="home" style={{ display: page === 'home' ? 'block' : 'none' }}>

        {/* HERO -- Full-viewport editorial */}
        <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 'clamp(100px,14vh,180px) clamp(20px,5vw,64px) clamp(60px,8vh,100px)', position: 'relative' }}>
          {/* Decorative editorial lines */}
          <div style={{ position: 'absolute', top: 0, left: 'clamp(20px,5vw,64px)', bottom: 0, width: 1, background: '#e8e9ec' }} className="hidden lg:block" />
          <div style={{ position: 'absolute', top: 0, right: 'clamp(20px,5vw,64px)', bottom: 0, width: 1, background: '#e8e9ec' }} className="hidden lg:block" />

          <div style={{ maxWidth: 1400, margin: '0 auto', width: '100%' }}>
            <Reveal>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
                <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 500, color: A, letterSpacing: '0.16em', textTransform: 'uppercase' }}>{indLabel}</span>
                <span style={{ width: 40, height: 1, background: A, display: 'inline-block' }} />
                {loc && <span style={{ fontFamily: mono, fontSize: 11, color: '#8b8f9a', letterSpacing: '0.08em' }}>{loc}</span>}
              </div>
            </Reveal>

            <Reveal delay={120}>
              <h1 style={{ fontFamily: heading, fontSize: 'clamp(48px,8vw,96px)', fontWeight: 800, lineHeight: 1.02, letterSpacing: '-0.03em', color: '#111318', marginBottom: 'clamp(20px,3vw,36px)', maxWidth: 900, overflowWrap: 'break-word' }}>
                {wc?.heroHeadline || config.tagline || `Quality ${indLabel} you can trust.`}
              </h1>
            </Reveal>

            <div className="ax-rule" style={{ maxWidth: 500, marginBottom: 'clamp(20px,3vw,32px)' }} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-end">
              <Reveal delay={220}>
                <div>
                  {wc?.heroSubheadline && <p style={{ fontSize: 'clamp(16px,1.4vw,20px)', lineHeight: 1.7, color: '#5a5f6b', marginBottom: 32, maxWidth: 480 }}>{wc.heroSubheadline}</p>}
                  <div className="flex flex-wrap gap-4">
                    <button onClick={() => { onCTAClick(); go('contact') }} className="ax-btn">{config.ctaText || 'Get Free Quote'} <ArrowRight size={15} /></button>
                    {lead.phone && <a href={`tel:${lead.phone}`} onClick={onCallClick} className="ax-btn-outline"><Phone size={15} />{fmt(lead.phone)}</a>}
                  </div>
                  {hasR && <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 32 }}>
                    <div className="flex gap-0.5">{Array.from({ length: 5 }, (_, i) => <Star key={i} size={14} className="fill-current" style={{ color: '#f59e0b' }} />)}</div>
                    <span style={{ fontFamily: mono, fontSize: 12, color: '#8b8f9a' }}>{lead.enrichedRating} rating{lead.enrichedReviews ? ` / ${lead.enrichedReviews}+ reviews` : ''}</span>
                  </div>}
                </div>
              </Reveal>

              <Reveal delay={320} y={30}>
                <div style={{ position: 'relative' }}>
                  {photos[0] ? (
                    <img src={photos[0]} alt="" style={{ width: '100%', aspectRatio: '5/4', objectFit: 'cover', display: 'block', boxShadow: '0 24px 64px rgba(0,0,0,0.1)' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  ) : (
                    <PhotoPlaceholder accent={A} aspectRatio="5/4" style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.1)' }} />
                  )}
                  {/* Accent stripe overlay */}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 6, background: A }} />
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ACCENT DIVIDER STRIP */}
        <div style={{ background: A, padding: 'clamp(20px,3vw,32px) clamp(20px,5vw,64px)' }}>
          <div className="flex flex-wrap justify-between items-center gap-6" style={{ maxWidth: 1400, margin: '0 auto' }}>
            {[
              { v: hasR ? `${lead.enrichedRating}` : '5.0', l: 'Star Rating' },
              { v: lead.enrichedReviews ? `${lead.enrichedReviews}+` : '100+', l: 'Reviews' },
              { v: wc?.yearsBadge || '10+', l: 'Years Exp.' },
              ...(svc.length > 0 ? [{ v: `${svc.length}`, l: 'Services' }] : []),
            ].map((s, i) => (
              <div key={i} style={{ textAlign: 'center', flex: '1 1 auto' }}>
                <p style={{ fontFamily: heading, fontSize: 'clamp(24px,3vw,36px)', fontWeight: 800, color: '#fff' }}>{s.v}</p>
                <p style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)', marginTop: 4 }}>{s.l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ABOUT PREVIEW -- Editorial two-column */}
        <section style={{ padding: 'clamp(60px,10vw,120px) clamp(20px,5vw,64px)' }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16" style={{ maxWidth: 1400, margin: '0 auto' }}>
            <Reveal>
              <div>
                <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 500, color: A, letterSpacing: '0.16em', textTransform: 'uppercase', display: 'block', marginBottom: 16 }}>About Us</span>
                <h2 style={{ fontFamily: heading, fontSize: 'clamp(32px,4vw,52px)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: 24 }}>
                  {wc?.closingHeadline || `Trusted by families across ${loc || 'your community'}.`}
                </h2>
                <div className="ax-rule" style={{ marginBottom: 24 }} />
                <p style={{ fontSize: 'clamp(15px,1.2vw,17px)', lineHeight: 1.8, color: '#5a5f6b', marginBottom: 24 }}>
                  {wc?.aboutParagraph1 || `${lead.companyName} provides expert ${indLabel}${loc ? ` in ${loc}` : ''}, combining years of experience with a commitment to quality that shows in every project.`}
                </p>
                <button onClick={() => go('about')} style={{ fontFamily: mono, fontSize: 12, fontWeight: 500, color: A, background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 8, padding: 0 }}>Read our story <ArrowRight size={14} /></button>
              </div>
            </Reveal>
            <Reveal delay={200}>
              <div className="grid grid-cols-2 gap-4">
                {whyUs.slice(0, 4).map((vp, i) => (
                  <div key={i} className="ax-lift" style={{ background: '#fff', border: '1px solid #e8e9ec', padding: 'clamp(20px,2vw,28px)', borderTop: i === 0 ? `3px solid ${A}` : '1px solid #e8e9ec' }}>
                    <CheckCircle size={20} style={{ color: A, marginBottom: 12 }} />
                    <h4 style={{ fontFamily: heading, fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{vp.title}</h4>
                    <p style={{ fontSize: 13, lineHeight: 1.6, color: '#8b8f9a' }}>{vp.description}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* FEATURED SERVICES -- Magazine grid */}
        {svc.length > 0 && (
          <section style={{ padding: 'clamp(60px,10vw,120px) clamp(20px,5vw,64px)', background: '#F0F1F3' }}>
            <div style={{ maxWidth: 1400, margin: '0 auto' }}>
              <Reveal>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, marginBottom: 48 }}>
                  <div>
                    <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 500, color: A, letterSpacing: '0.16em', textTransform: 'uppercase', display: 'block', marginBottom: 12 }}>Services</span>
                    <h2 style={{ fontFamily: heading, fontSize: 'clamp(32px,4vw,52px)', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}>What we do.</h2>
                  </div>
                  <button onClick={() => go('services')} className="ax-btn-outline" style={{ padding: '10px 24px', fontSize: 12 }}>View All <ArrowRight size={14} /></button>
                </div>
              </Reveal>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {svcData.slice(0, 6).map((s, i) => (
                  <Reveal key={i} delay={i * 70}>
                    <div onClick={() => go('services')} className="ax-lift cursor-pointer" style={{ background: '#fff', border: '1px solid #e8e9ec', overflow: 'hidden' }}>
                      <div style={{ height: 180, overflow: 'hidden', position: 'relative' }}>
                        {s.img ? (
                          <img src={s.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform .5s' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        ) : (
                          <PhotoPlaceholder accent={A} height={180} />
                        )}
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: A }} />
                      </div>
                      <div style={{ padding: 'clamp(16px,2vw,24px)' }}>
                        <span style={{ fontFamily: mono, fontSize: 10, color: A, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{String(i + 1).padStart(2, '0')}</span>
                        <h3 style={{ fontFamily: heading, fontSize: 'clamp(17px,1.4vw,20px)', fontWeight: 700, margin: '8px 0 10px', lineHeight: 1.2 }}>{s.name}</h3>
                        <p style={{ fontSize: 13, lineHeight: 1.6, color: '#8b8f9a' }}>{s.desc}</p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* TESTIMONIAL -- Full-width editorial quote */}
        <section style={{ padding: 'clamp(80px,12vw,160px) clamp(20px,5vw,64px)', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: '#e8e9ec' }} />
          <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
            <Reveal>
              <Quote size={48} style={{ color: A, opacity: 0.2, margin: '0 auto 24px', display: 'block' }} />
              <p style={{ fontFamily: heading, fontSize: 'clamp(22px,3vw,36px)', fontWeight: 500, fontStyle: 'italic', lineHeight: 1.5, color: '#2a2e38', marginBottom: 32 }}>
                &ldquo;{testis[0].text}&rdquo;
              </p>
              <div style={{ width: 40, height: 2, background: A, margin: '0 auto 20px' }} />
              <p style={{ fontFamily: mono, fontSize: 12, fontWeight: 500, color: '#8b8f9a', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{testis[0].name} &mdash; {testis[0].loc}</p>
            </Reveal>
          </div>
        </section>

        {/* PHOTO EDITORIAL BAND */}
        {photos.length > 1 && (
          <Reveal><section style={{ padding: '0 clamp(20px,5vw,64px)' }}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ maxWidth: 1400, margin: '0 auto' }}>
              {photos.slice(0, 3).map((p, i) => (
                <div key={i} className="overflow-hidden cursor-pointer" style={{ position: 'relative' }} onClick={() => setLb(i)}>
                  <img src={p} alt="" style={{ width: '100%', aspectRatio: i === 1 ? '3/4' : '4/3', objectFit: 'cover', display: 'block', transition: 'transform .5s' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                </div>
              ))}
            </div>
          </section></Reveal>
        )}

        {/* CTA BAND */}
        <section style={{ padding: 'clamp(60px,10vw,120px) clamp(20px,5vw,64px)', background: '#111318', marginTop: photos.length > 1 ? 'clamp(40px,6vw,80px)' : 0 }}>
          <Reveal>
            <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
              <h2 style={{ fontFamily: heading, fontSize: 'clamp(30px,4.5vw,56px)', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 20 }}>Ready to get started?</h2>
              <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', marginBottom: 36, lineHeight: 1.6 }}>Free estimate, no obligation. We respond same-day.</p>
              <div className="flex flex-wrap justify-center gap-4">
                <button onClick={() => { onCTAClick(); go('contact') }} className="ax-btn" style={{ background: A }}>Get Your Quote <ArrowRight size={15} /></button>
                {lead.phone && <a href={`tel:${lead.phone}`} onClick={onCallClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, border: '2px solid rgba(255,255,255,0.2)', color: '#fff', padding: '16px 36px', fontWeight: 600, fontSize: 14, letterSpacing: '0.04em', textTransform: 'uppercase', textDecoration: 'none', fontFamily: body, cursor: 'pointer', transition: 'all .3s' }}><Phone size={15} />{fmt(lead.phone)}</a>}
              </div>
            </div>
          </Reveal>
        </section>
      </div>

      {/* ================================================================ */}
      {/* === SERVICES PAGE === */}
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
      {/* === ABOUT PAGE === */}
      {/* ================================================================ */}
      <div data-page="about" style={{ display: page === 'about' ? 'block' : 'none' }}>
        {/* About Hero */}
        <section style={{ padding: 'clamp(100px,14vh,180px) clamp(20px,5vw,64px) clamp(40px,6vw,80px)' }}>
          <div style={{ maxWidth: 1400, margin: '0 auto' }}>
            <Reveal>
              <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 500, color: A, letterSpacing: '0.16em', textTransform: 'uppercase', display: 'block', marginBottom: 16 }}>About</span>
              <h1 style={{ fontFamily: heading, fontSize: 'clamp(40px,6vw,72px)', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.03em', marginBottom: 24, maxWidth: 700 }}>Our story.</h1>
            </Reveal>
            <div className="ax-rule" style={{ maxWidth: 400, marginBottom: 40 }} />
          </div>
        </section>

        {/* About Content */}
        <section style={{ padding: '0 clamp(20px,5vw,64px) clamp(60px,8vw,100px)' }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16" style={{ maxWidth: 1400, margin: '0 auto' }}>
            <Reveal>
              <div>
                <p style={{ fontSize: 'clamp(16px,1.3vw,19px)', lineHeight: 1.8, color: '#3a3f4b', marginBottom: 28 }}>
                  {wc?.aboutParagraph1 || `${lead.companyName} provides expert ${indLabel}${loc ? ` in ${loc}` : ''}, combining years of experience with a commitment to quality that shows in every project.`}
                </p>
                {wc?.aboutParagraph2 && <p style={{ fontSize: 'clamp(15px,1.2vw,17px)', lineHeight: 1.8, color: '#5a5f6b' }}>{wc.aboutParagraph2}</p>}
              </div>
            </Reveal>
            <Reveal delay={150}>
              <div style={{ position: 'relative' }}>
                {photos[2] ? (
                  <img src={photos[2]} alt="" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                ) : (
                  <PhotoPlaceholder accent={A} aspectRatio="4/3" />
                )}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: A }} />
              </div>
            </Reveal>
          </div>
        </section>

        {/* Stats row */}
        <section style={{ padding: 'clamp(40px,6vw,80px) clamp(20px,5vw,64px)', background: '#F0F1F3' }}>
          <div className="flex flex-wrap gap-12 justify-center" style={{ maxWidth: 1200, margin: '0 auto' }}>
            {hasR && <Reveal><div style={{ textAlign: 'center' }}><p style={{ fontFamily: heading, fontSize: 'clamp(40px,5vw,56px)', fontWeight: 800 }}>{lead.enrichedRating}</p><p style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8b8f9a', marginTop: 8 }}>Rating</p></div></Reveal>}
            {lead.enrichedReviews && <Reveal delay={100}><div style={{ textAlign: 'center' }}><p style={{ fontFamily: heading, fontSize: 'clamp(40px,5vw,56px)', fontWeight: 800 }}><Counter end={lead.enrichedReviews} suffix="+" /></p><p style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8b8f9a', marginTop: 8 }}>Reviews</p></div></Reveal>}
            <Reveal delay={200}><div style={{ textAlign: 'center' }}><p style={{ fontFamily: heading, fontSize: 'clamp(40px,5vw,56px)', fontWeight: 800 }}>100%</p><p style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8b8f9a', marginTop: 8 }}>Satisfaction</p></div></Reveal>
            {svc.length > 0 && <Reveal delay={300}><div style={{ textAlign: 'center' }}><p style={{ fontFamily: heading, fontSize: 'clamp(40px,5vw,56px)', fontWeight: 800 }}><Counter end={svc.length} /></p><p style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8b8f9a', marginTop: 8 }}>Services</p></div></Reveal>}
          </div>
        </section>

        {/* Why Choose Us */}
        <section style={{ padding: 'clamp(60px,8vw,100px) clamp(20px,5vw,64px)' }}>
          <div style={{ maxWidth: 1400, margin: '0 auto' }}>
            <Reveal>
              <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 500, color: A, letterSpacing: '0.16em', textTransform: 'uppercase', display: 'block', marginBottom: 12 }}>Why Us</span>
              <h2 style={{ fontFamily: heading, fontSize: 'clamp(28px,3.5vw,44px)', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 48 }}>Why choose us.</h2>
            </Reveal>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {whyUs.slice(0, 3).map((vp, i) => (
                <Reveal key={i} delay={i * 100}>
                  <div className="ax-lift" style={{ background: '#fff', border: '1px solid #e8e9ec', padding: 'clamp(24px,2vw,32px)', borderLeft: `3px solid ${A}` }}>
                    <CheckCircle size={22} style={{ color: A, marginBottom: 16 }} />
                    <h4 style={{ fontFamily: heading, fontSize: 18, fontWeight: 700, marginBottom: 10 }}>{vp.title}</h4>
                    <p style={{ fontSize: 14, lineHeight: 1.7, color: '#8b8f9a' }}>{vp.description}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section style={{ padding: 'clamp(60px,8vw,100px) clamp(20px,5vw,64px)', background: '#F0F1F3' }}>
          <div style={{ maxWidth: 1400, margin: '0 auto' }}>
            <Reveal>
              <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 500, color: A, letterSpacing: '0.16em', textTransform: 'uppercase', display: 'block', marginBottom: 12 }}>Testimonials</span>
              <h2 style={{ fontFamily: heading, fontSize: 'clamp(28px,3.5vw,44px)', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 48 }}>What clients say.</h2>
            </Reveal>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {testis.slice(0, 3).map((t, i) => (
                <Reveal key={i} delay={i * 100}>
                  <div className="ax-lift" style={{ background: '#fff', border: '1px solid #e8e9ec', padding: 'clamp(24px,2vw,32px)' }}>
                    <Quote size={24} style={{ color: A, opacity: 0.2, marginBottom: 16 }} />
                    <p style={{ fontSize: 15, lineHeight: 1.7, color: '#3a3f4b', marginBottom: 24 }}>&ldquo;{t.text}&rdquo;</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: A, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700 }}>{t.name[0]}</div>
                      <div><p style={{ fontSize: 13, fontWeight: 600 }}>{t.name}</p><p style={{ fontSize: 11, color: '#8b8f9a' }}>{t.loc}</p></div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* ================================================================ */}
      {/* === CONTACT PAGE === */}
      {/* ================================================================ */}
      <div data-page="contact" style={{ display: page === 'contact' ? 'block' : 'none' }}>
        {/* Contact Header */}
        <section style={{ padding: 'clamp(100px,14vh,180px) clamp(20px,5vw,64px) clamp(40px,5vw,60px)' }}>
          <div style={{ maxWidth: 1400, margin: '0 auto' }}>
            <Reveal>
              <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 500, color: A, letterSpacing: '0.16em', textTransform: 'uppercase', display: 'block', marginBottom: 16 }}>Contact</span>
              <h1 style={{ fontFamily: heading, fontSize: 'clamp(40px,6vw,72px)', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.03em', marginBottom: 16 }}>Get in touch.</h1>
            </Reveal>
            <Reveal delay={100}><p style={{ fontSize: 'clamp(15px,1.2vw,18px)', color: '#8b8f9a', maxWidth: 480, lineHeight: 1.6 }}>We would love to hear from you. Reach out and we will respond same-day.</p></Reveal>
          </div>
        </section>

        {/* Contact info cards */}
        <section style={{ padding: '0 clamp(20px,5vw,64px) clamp(40px,5vw,64px)' }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ maxWidth: 1400, margin: '0 auto' }}>
            {[
              lead.phone && { icon: <Phone size={20} />, label: 'Phone', value: fmt(lead.phone), sub: 'Call or text anytime', href: `tel:${lead.phone}` },
              lead.email && { icon: <Mail size={20} />, label: 'Email', value: lead.email, sub: 'We respond same-day', href: `mailto:${lead.email}` },
              (lead.enrichedAddress || loc) && { icon: <MapPin size={20} />, label: 'Location', value: lead.enrichedAddress || loc, sub: loc, href: undefined },
            ].filter(Boolean).map((item, i) => {
              const c = item as { icon: React.ReactNode; label: string; value: string; sub: string; href?: string }
              return (
                <Reveal key={i} delay={i * 80}>
                  <div className="ax-lift" style={{ background: '#fff', border: '1px solid #e8e9ec', padding: 'clamp(20px,2vw,28px)', textAlign: 'center' }}>
                    <div style={{ width: 48, height: 48, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: A }}>{c.icon}</div>
                    <p style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8b8f9a', marginBottom: 8 }}>{c.label}</p>
                    {c.href ? <a href={c.href} onClick={c.label === 'Phone' ? onCallClick : undefined} style={{ fontWeight: 600, fontSize: 15, color: '#111318', textDecoration: 'none' }}>{c.value}</a> : <p style={{ fontWeight: 600, fontSize: 15 }}>{c.value}</p>}
                    <p style={{ fontSize: 12, color: '#8b8f9a', marginTop: 4 }}>{c.sub}</p>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </section>

        {/* Contact Form + Service Area */}
        <section style={{ padding: 'clamp(40px,6vw,80px) clamp(20px,5vw,64px)', background: '#F0F1F3' }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16" style={{ maxWidth: 1400, margin: '0 auto' }}>
            <Reveal>
              <div>
                {wc?.serviceAreaText && (
                  <div style={{ background: '#fff', border: '1px solid #e8e9ec', padding: 'clamp(20px,2vw,28px)', borderLeft: `3px solid ${A}`, marginBottom: 32 }}>
                    <p style={{ fontFamily: mono, fontSize: 10, color: A, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>Service Area</p>
                    <p style={{ fontSize: 14, lineHeight: 1.7, color: '#5a5f6b' }}>{wc.serviceAreaText}</p>
                  </div>
                )}
                <h3 style={{ fontFamily: heading, fontSize: 'clamp(24px,3vw,36px)', fontWeight: 700, marginBottom: 24 }}>Why work with us?</h3>
                {whyUs.slice(0, 3).map((vp, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
                    <CheckCircle size={18} style={{ color: A, flexShrink: 0, marginTop: 3 }} />
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{vp.title}</p>
                      <p style={{ fontSize: 13, color: '#8b8f9a', lineHeight: 1.6 }}>{vp.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div style={{ background: '#fff', border: '1px solid #e8e9ec', padding: 'clamp(24px,3vw,40px)', boxShadow: '0 4px 30px rgba(0,0,0,0.04)' }}>
                {formSent ? (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <CheckCircle size={40} style={{ color: A, margin: '0 auto 20px' }} />
                    <h3 style={{ fontFamily: heading, fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Request Sent!</h3>
                    <p style={{ fontSize: 14, color: '#8b8f9a' }}>We will get back to you within 24 hours.</p>
                  </div>
                ) : (
                  <>
                    <h3 style={{ fontFamily: heading, fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Request an Estimate</h3>
                    <p style={{ fontSize: 13, color: '#8b8f9a', marginBottom: 28 }}>Free estimate, no obligation.</p>
                    {['Full Name', 'Phone', 'Email'].map(l => (
                      <input key={l} placeholder={l}
                        type={l === 'Phone' ? 'tel' : l === 'Email' ? 'email' : 'text'}
                        value={l === 'Full Name' ? formData.name : l === 'Phone' ? formData.phone : formData.email}
                        onChange={e => { const v = e.target.value; setFormData(d => ({ ...d, [l === 'Full Name' ? 'name' : l === 'Phone' ? 'phone' : 'email']: v })) }}
                        style={{ width: '100%', fontSize: 14, padding: '14px 16px', background: '#FAFBFC', border: '1px solid #e8e9ec', color: '#111318', fontFamily: body, boxSizing: 'border-box' as const, marginBottom: 12, outline: 'none' }} />
                    ))}
                    {svc.length > 0 && <select value={formData.service} onChange={e => setFormData(d => ({ ...d, service: e.target.value }))} style={{ width: '100%', fontSize: 14, padding: '14px 16px', background: '#FAFBFC', border: '1px solid #e8e9ec', color: formData.service ? '#111318' : '#8b8f9a', fontFamily: body, boxSizing: 'border-box' as const, marginBottom: 12 }}><option value="">Select service</option>{svc.map(s => <option key={s} value={s}>{s}</option>)}</select>}
                    <textarea placeholder="Tell us about your project..." rows={4} value={formData.message} onChange={e => setFormData(d => ({ ...d, message: e.target.value }))} style={{ width: '100%', fontSize: 14, padding: '14px 16px', background: '#FAFBFC', border: '1px solid #e8e9ec', color: '#111318', fontFamily: body, boxSizing: 'border-box' as const, marginBottom: 20, outline: 'none', resize: 'none' as const }} />
                    <button onClick={() => { onCTAClick(); setFormSent(true) }} className="ax-btn" style={{ width: '100%', justifyContent: 'center', padding: 16 }}>Submit Request <ArrowRight size={14} /></button>
                  </>
                )}
              </div>
            </Reveal>
          </div>
        </section>
      </div>

      {/* === FOOTER === */}
      <footer style={{ borderTop: `4px solid ${A}`, background: '#111318', padding: 'clamp(48px,6vw,80px) clamp(20px,5vw,64px) clamp(80px,10vw,120px)', color: '#fff' }}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12" style={{ maxWidth: 1400, margin: '0 auto' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              {lead.logo ? <img src={lead.logo} alt="" style={{ height: 28, width: 28, borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width: 8, height: 8, background: A, borderRadius: '50%' }} />}
              <span style={{ fontFamily: heading, fontWeight: 700, fontSize: 18 }}>{lead.companyName}</span>
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: 'rgba(255,255,255,0.4)', maxWidth: 300 }}>Professional {indLabel}{loc ? ` in ${loc}` : ''}. Licensed and insured.</p>
          </div>
          <div>
            <p style={{ fontFamily: mono, fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 16 }}>Pages</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {PAGES.map(p => <button key={p.k} onClick={() => go(p.k)} data-nav-page={p.k} style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: 'rgba(255,255,255,0.6)', fontSize: 14, fontFamily: body, padding: 0, transition: 'color .2s' }}>{p.l}</button>)}
            </div>
          </div>
          <div>
            <p style={{ fontFamily: mono, fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 16 }}>Contact</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>
              {lead.phone && <a href={`tel:${lead.phone}`} onClick={onCallClick} style={{ textDecoration: 'none', color: 'inherit' }}>{fmt(lead.phone)}</a>}
              {lead.email && <a href={`mailto:${lead.email}`} style={{ textDecoration: 'none', color: 'inherit' }}>{lead.email}</a>}
              {loc && <span>{loc}</span>}
            </div>
          </div>
        </div>
        <div style={{ maxWidth: 1400, margin: '0 auto', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 24, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>&copy; {new Date().getFullYear()} {lead.companyName}</p>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>Powered by <a href="https://brightautomations.com" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.35)' }}>Bright Automations</a></span>
        </div>
      </footer>

      {/* === LIGHTBOX === */}
      {lb !== null && photos[lb] && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-5" style={{ background: 'rgba(0,0,0,.94)' }} onClick={() => setLb(null)}>
          <img src={photos[lb]} alt="" style={{ maxWidth: '90%', maxHeight: '85vh', objectFit: 'contain' }} />
          <button className="absolute top-6 right-6 w-11 h-11 rounded-full flex items-center justify-center bg-white/10 border border-white/20 text-white cursor-pointer" onClick={e => { e.stopPropagation(); setLb(null) }}><X size={18} /></button>
          {lb > 0 && <button className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center bg-white/10 border border-white/20 text-white cursor-pointer" onClick={e => { e.stopPropagation(); setLb(lb - 1) }}><ChevronLeft size={20} /></button>}
          {lb < photos.length - 1 && <button className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center bg-white/10 border border-white/20 text-white cursor-pointer" onClick={e => { e.stopPropagation(); setLb(lb + 1) }}><ChevronRight size={20} /></button>}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2" style={{ fontFamily: mono, fontSize: 11, color: 'rgba(255,255,255,.5)', letterSpacing: '0.1em' }}>{lb + 1} / {photos.length}</div>
        </div>
      )}

      <ChatWidget name={lead.companyName} accent={A} />
      <div className="h-20 lg:h-0" />
    </div>
  )
}
