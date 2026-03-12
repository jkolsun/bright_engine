'use client'
/*
 * FORGE TEMPLATE -- Industrial / Craft
 * Dark, powerful, gritty-but-professional. Diagonal accent stripes, geometric patterns.
 * Near-black (#111111 / #1A1A1A), bold uppercase typography, sharp edges (0 radius).
 * Fonts: Oswald (heading) / Barlow (body) / Share Tech Mono (mono)
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
  return m[config.accentColor] || '#f97316'
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
  return <div ref={ref} className={className} style={{ opacity:vis?1:0, transform:vis?'translateY(0)':`translateY(${y}px)`, transition:`opacity 0.7s cubic-bezier(0.25,0.46,0.45,0.94) ${delay}ms, transform 0.7s cubic-bezier(0.25,0.46,0.45,0.94) ${delay}ms` }}>{children}</div>
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
    {open&&(<div className="fixed sm:bottom-24 bottom-28 right-5 z-[100] w-[370px] max-w-[calc(100vw-2.5rem)] shadow-2xl overflow-hidden" style={{background:'#1A1A1A',border:`1px solid ${accent}33`}}>
      <div className="px-5 py-4 text-white" style={{background:accent}}>
        <p className="font-bold text-sm" style={{fontFamily:"'Oswald',Impact,sans-serif",textTransform:'uppercase',letterSpacing:'0.05em'}}>{name}</p>
        <p className="text-[10px] opacity-60 mt-0.5">AI Assistant by Bright Automations</p>
      </div>
      <div className="h-[260px] overflow-y-auto px-4 py-4 space-y-3" style={{background:'#111'}}>
        {msgs.map((m,i)=>(<div key={i} className={`flex ${m.from==='user'?'justify-end':'justify-start'}`}><div className={`max-w-[80%] px-4 py-2.5 text-sm leading-relaxed`} style={m.from==='user'?{background:accent,color:'#fff'}:{background:'#222',color:'#ccc',border:'1px solid #333'}}>{m.text}</div></div>))}
        {typing&&<div className="flex justify-start"><div className="px-4 py-3" style={{background:'#222',border:'1px solid #333'}}><div className="flex gap-1">{[0,150,300].map(d=><span key={d} className="w-2 h-2 animate-bounce" style={{background:accent,opacity:0.4,animationDelay:`${d}ms`,borderRadius:0}}/>)}</div></div></div>}
        <div ref={endRef}/>
      </div>
      <div className="px-4 py-3" style={{background:'#1A1A1A',borderTop:'1px solid #333'}}><div className="flex gap-2">
        <input ref={inRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Type a message..." className="flex-1 text-sm px-4 py-2.5 focus:outline-none placeholder:text-gray-600" style={{background:'#111',border:'1px solid #333',color:'#eee',fontFamily:"'Barlow',system-ui,sans-serif"}}/>
        <button onClick={()=>send()} disabled={!input.trim()} className="w-10 h-10 flex items-center justify-center text-white disabled:opacity-30" style={{background:accent}}><Send size={15}/></button>
      </div></div>
    </div>)}
  </>)
}

/* ── Main Template ───────────────────────────────────── */

export default function ForgeTemplate({ lead, config, onCTAClick, onCallClick, websiteCopy: wc }: TemplateProps) {
  const [page, setPage] = useState<'home'|'services'|'about'|'contact'>('home')
  const [mobNav, setMobNav] = useState(false)
  const [openFAQ, setOpenFAQ] = useState<number|null>(null)
  const [lb, setLb] = useState<number|null>(null)
  const [navSolid, setNavSolid] = useState(false)
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', service: '', message: '' })
  const [formSent, setFormSent] = useState(false)

  useEffect(() => {
    const h = () => setNavSolid(window.scrollY>60)
    window.addEventListener('scroll',h,{passive:true}); return()=>window.removeEventListener('scroll',h)
  },[])

  const go = (p: typeof page) => { setPage(p); setMobNav(false); window.scrollTo({top:0,behavior:'smooth'}) }

  const svc = lead.enrichedServices||[]; const photos = lead.enrichedPhotos||[]
  const loc = [lead.city,lead.state].filter(Boolean).join(', ')
  const indLabel = (lead.industry || 'general contracting').toLowerCase().replace(/_/g,' ')
  const hasR = lead.enrichedRating && lead.enrichedRating > 0
  const A = getAccent(config)

  const svcData = svc.map((n,i) => ({ name:n, desc: wc?.serviceDescriptions?.[n] || `Professional ${n.toLowerCase()} services tailored to your needs.`, img: resolveServiceImage(n, i, photos, lead.stockPhotos) }))
  const testis = [
    { text: wc?.testimonialQuote || `${lead.companyName} exceeded expectations. On time, clean work, great communication throughout.`, name: wc?.testimonialAuthor || 'Rachel M.', loc:lead.city||'Local' },
    ...(wc?.additionalTestimonials?.map(t=>({text:t.quote,name:t.author,loc:lead.city||'Local'})) || [
      { text: "We compared five companies -- these guys were the most professional and the fairest price.", name:'David K.', loc:lead.city||'Local' },
      { text: "Already recommended them to two neighbors. That says everything.", name:'Linda P.', loc:lead.city||'Local' },
    ])
  ]
  const whyUs = wc?.whyChooseUs || wc?.valueProps || [
    { title:'Licensed & Insured', description:'Full protection on every single job.' },
    { title:'Fast Response', description:'Same-day service when you need it most.' },
    { title:'Satisfaction Guarantee', description:'Not happy? We make it right, period.' },
  ]
  const faqs = [
    { q:'How do I get a quote?', a:'Call us or fill out our contact form -- we respond same-day with a free estimate.' },
    { q:'Do you offer free estimates?', a:'Absolutely! All estimates are free with no obligation whatsoever.' },
    { q:'What areas do you serve?', a:`We proudly serve ${loc||'your area'} and surrounding communities within 30 miles.` },
    { q:'Are you licensed and insured?', a:'Yes -- fully licensed, bonded, and insured for your complete protection.' },
    { q:'How quickly can you start?', a:'Most projects can begin within a few days. Emergency services available same-day.' },
  ]

  const PAGES = [{k:'home' as const,l:'HOME'},{k:'services' as const,l:'SERVICES'},{k:'about' as const,l:'ABOUT'},{k:'contact' as const,l:'CONTACT'}]

  const heading = "'Oswald',Impact,sans-serif"
  const body = "'Barlow',system-ui,sans-serif"
  const mono = "'Share Tech Mono',monospace"

  /* Subtle texture patterns */
  const stripesBg = `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.015) 10px, rgba(255,255,255,0.015) 20px)`
  const dotsBg = `radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)`

  const svcTheme: ServicePageTheme = {
    accent: A,
    fonts: { heading, body, mono },
    bgPrimary: '#111111',
    bgSecondary: '#1A1A1A',
    textPrimary: '#F0F0F0',
    textSecondary: '#CCCCCC',
    textMuted: '#888888',
    cardBg: '#1A1A1A',
    cardBorder: '#2A2A2A',
    isDark: true,
    borderRadius: '0px',
  }

  return (
    <div className="preview-template min-h-screen antialiased" style={{fontFamily:body,background:'#111111',color:'#F0F0F0',overflowX:'hidden'}}>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700;800;900&family=Barlow:wght@400;500;600;700&family=Share+Tech+Mono&display=swap');
        @keyframes fg-fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fg-slideUp{from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:translateY(0)}}
        .fg-btn{display:inline-flex;align-items:center;gap:10px;background:${A};color:#fff;padding:16px 36px;font-weight:700;font-size:14px;border:none;cursor:pointer;transition:all .25s;font-family:${heading};text-decoration:none;text-transform:uppercase;letter-spacing:0.08em}
        .fg-btn:hover{transform:translateY(-2px);box-shadow:0 8px 30px ${A}44}
        .fg-btn-o{display:inline-flex;align-items:center;gap:10px;background:transparent;color:#F0F0F0;padding:16px 36px;border:2px solid #333;font-weight:700;font-size:14px;cursor:pointer;transition:all .25s;font-family:${heading};text-decoration:none;text-transform:uppercase;letter-spacing:0.08em}
        .fg-btn-o:hover{border-color:${A};color:${A}}
        .fg-lift{transition:transform .3s ease,box-shadow .3s ease}.fg-lift:hover{transform:translateY(-3px);box-shadow:0 12px 40px rgba(0,0,0,.3)}
        .fg-overlay{position:fixed;inset:0;z-index:60;background:rgba(17,17,17,0.98);backdrop-filter:blur(20px);display:flex;flex-direction:column;padding:80px 24px 40px;animation:fg-slideUp .35s ease}
        ::selection{background:${A}33;color:#fff}
        input:focus,textarea:focus,select:focus{border-color:${A} !important;outline:none}
      ` }} />

      <DisclaimerBanner variant="modern" companyName={lead.companyName}/>

      {/* ── DESKTOP NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 hidden lg:block" style={{transition:'all .4s'}}>
        <div style={{background:navSolid?'rgba(17,17,17,0.96)':'rgba(17,17,17,0.8)',backdropFilter:'blur(16px)',borderBottom:`1px solid ${navSolid?'#222':'transparent'}`,padding:'0 clamp(24px,4vw,48px)'}}>
          <div style={{maxWidth:1280,margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'space-between',height:72}}>
            <button onClick={()=>go('home')} data-nav-page="home" className="flex items-center gap-3" style={{background:'none',border:'none',cursor:'pointer'}}>
              {lead.logo?<img src={lead.logo} alt="" className="h-7 w-7 object-cover" style={{borderRadius:0}}/>:<div style={{width:8,height:24,background:A}}/>}
              <span style={{fontFamily:heading,fontSize:18,fontWeight:700,color:'#fff',textTransform:'uppercase',letterSpacing:'0.04em'}}>{lead.companyName}</span>
            </button>
            <div className="flex items-center gap-1">
              {PAGES.map(p=>(
                <button key={p.k} onClick={()=>go(p.k)} data-nav-page={p.k} className="text-[13px] px-5 py-2 transition-all" style={{background:'none',color:page===p.k?A:'#999',border:'none',cursor:'pointer',fontFamily:heading,fontWeight:600,letterSpacing:'0.1em',borderBottom:page===p.k?`2px solid ${A}`:'2px solid transparent'}}>{p.l}</button>
              ))}
              <button onClick={()=>{onCTAClick();go('contact')}} data-nav-page="contact" className="ml-4 fg-btn" style={{padding:'10px 28px',fontSize:12}}>GET QUOTE</button>
            </div>
          </div>
        </div>
      </nav>

      {/* ── MOBILE NAV ── */}
      <nav className="lg:hidden fixed top-0 left-0 right-0 z-50" style={{background:'rgba(17,17,17,0.96)',backdropFilter:'blur(16px)',borderBottom:'1px solid #222',padding:'0 20px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',height:60}}>
          <button onClick={()=>go('home')} data-nav-page="home" className="flex items-center gap-2" style={{background:'none',border:'none',cursor:'pointer'}}>
            {lead.logo?<img src={lead.logo} alt="" className="h-6 w-6 object-cover" style={{borderRadius:0}}/>:<div style={{width:6,height:20,background:A}}/>}
            <span style={{fontFamily:heading,fontSize:15,fontWeight:700,color:'#fff',textTransform:'uppercase',letterSpacing:'0.04em',maxWidth:'calc(100vw - 180px)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{lead.companyName}</span>
          </button>
          <div className="flex items-center gap-3">
            <button onClick={()=>{onCTAClick();go('contact')}} data-nav-page="contact" className="text-[11px] font-bold px-4 py-2 text-white border-none cursor-pointer" style={{background:A,fontFamily:heading,letterSpacing:'0.08em',flexShrink:0}}>QUOTE</button>
            <button onClick={()=>setMobNav(!mobNav)} aria-label="Menu" style={{width:40,height:40,background:'#1A1A1A',border:'1px solid #333',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
              {mobNav?<X size={18} style={{color:'#999'}}/>:<Menu size={18} style={{color:'#999'}}/>}
            </button>
          </div>
        </div>
      </nav>

      {/* ── MOBILE NAV OVERLAY ── */}
      {mobNav&&<div className="fg-overlay lg:hidden">
        <div className="flex flex-col gap-2">
          {PAGES.map(p=>(
            <button key={p.k} onClick={()=>go(p.k)} data-nav-page={p.k} className="text-left text-2xl py-3 px-2 transition-all" style={{background:'none',color:page===p.k?A:'#888',border:'none',cursor:'pointer',fontFamily:heading,fontWeight:700,letterSpacing:'0.08em'}}>{p.l}</button>
          ))}
        </div>
        <div className="mt-auto flex flex-col gap-3">
          <button onClick={()=>{onCTAClick();go('contact')}} data-nav-page="contact" className="fg-btn justify-center">{config.ctaText||'GET FREE QUOTE'} <ArrowRight size={16}/></button>
          {lead.phone&&<a href={`tel:${lead.phone}`} onClick={onCallClick} className="fg-btn-o justify-center"><Phone size={16}/>{fmt(lead.phone)}</a>}
        </div>
      </div>}

      {/* ================================================================ */}
      {/* === HOME === */}
      {/* ================================================================ */}
      <div data-page="home" style={{display:page==='home'?'block':'none'}}>

        {/* HERO -- full dark with diagonal stripes */}
        <section className="relative overflow-hidden" style={{minHeight:'100vh',display:'flex',alignItems:'center',background:'#111111'}}>
          {/* Diagonal stripe overlay */}
          <div className="absolute inset-0" style={{backgroundImage:stripesBg,opacity:1}} />
          {/* Dot pattern overlay */}
          <div className="absolute inset-0" style={{backgroundImage:dotsBg,backgroundSize:'20px 20px',opacity:1}} />
          {/* Accent diagonal stripe decoration */}
          <div className="absolute top-0 right-0 hidden lg:block" style={{width:400,height:'100%',background:`linear-gradient(135deg, transparent 40%, ${A}08 60%, transparent 80%)`,pointerEvents:'none'}} />
          <div className="relative w-full" style={{padding:'clamp(100px,14vh,160px) clamp(20px,5vw,64px)'}}>
            <div style={{maxWidth:1280,margin:'0 auto'}}>
              <Reveal><div className="flex items-center gap-4 mb-8">
                {hasR&&<div className="flex items-center gap-2 px-4 py-2 text-sm font-bold" style={{background:`${A}15`,color:A,border:`1px solid ${A}33`,fontFamily:mono,fontSize:12}}><Star size={14} className="fill-current"/>{lead.enrichedRating} RATING</div>}
                {loc&&<span className="text-sm" style={{color:'#666',fontFamily:mono,fontSize:12}}><MapPin size={13} className="inline mr-1"/>{loc}</span>}
              </div></Reveal>

              <Reveal delay={100}><h1 style={{fontFamily:heading,fontSize:'clamp(48px,8vw,96px)',fontWeight:900,lineHeight:1.0,letterSpacing:'-0.02em',textTransform:'uppercase',color:'#fff',marginBottom:24,maxWidth:900,overflowWrap:'break-word'}}>
                {wc?.heroHeadline||config.tagline||`Quality ${indLabel} you can trust.`}
              </h1></Reveal>

              {/* Accent underline bar */}
              <Reveal delay={150}><div style={{width:80,height:4,background:A,marginBottom:28}} /></Reveal>

              {wc?.heroSubheadline&&<Reveal delay={200}><p style={{fontSize:'clamp(16px,1.8vw,20px)',color:'#999',lineHeight:1.7,maxWidth:560,marginBottom:36,fontFamily:body}}>{wc.heroSubheadline}</p></Reveal>}

              <Reveal delay={300}><div className="flex flex-wrap gap-4">
                <button onClick={()=>{onCTAClick();go('contact')}} className="fg-btn">{config.ctaText||'GET FREE QUOTE'} <ArrowRight size={16}/></button>
                {lead.phone&&<a href={`tel:${lead.phone}`} onClick={onCallClick} className="fg-btn-o"><Phone size={16}/>{fmt(lead.phone)}</a>}
              </div></Reveal>

              <Reveal delay={400}><div className="flex items-center gap-8 mt-14">
                {[{v:hasR?`${lead.enrichedRating}`:'-',l:'RATING'},{v:lead.enrichedReviews?`${lead.enrichedReviews}+`:'-',l:'REVIEWS'},{v:wc?.yearsBadge||'10+',l:'YEARS'}].map((s,i)=>(
                  <div key={i}><p style={{fontFamily:heading,fontSize:'clamp(28px,3vw,40px)',fontWeight:800,color:A}}>{s.v}</p><p style={{fontFamily:mono,fontSize:10,color:'#555',letterSpacing:'0.15em',marginTop:4}}>{s.l}</p></div>
                ))}
              </div></Reveal>
            </div>
          </div>
        </section>

        {/* ABOUT snippet */}
        <section style={{padding:'clamp(60px,8vw,100px) clamp(20px,5vw,64px)',background:'#1A1A1A',backgroundImage:stripesBg}}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center" style={{maxWidth:1200,margin:'0 auto'}}>
            <Reveal><div>
              <p style={{fontFamily:mono,fontSize:11,color:A,letterSpacing:'0.15em',textTransform:'uppercase',marginBottom:12}}>// About Us</p>
              <h2 style={{fontFamily:heading,fontSize:'clamp(28px,4vw,48px)',fontWeight:800,textTransform:'uppercase',letterSpacing:'-0.01em',marginBottom:20,color:'#fff'}}>Built on hard work.</h2>
              <p style={{fontSize:16,color:'#999',lineHeight:1.8,marginBottom:24}}>{wc?.aboutParagraph1||`${lead.companyName} provides expert ${indLabel}${loc?` in ${loc}`:''}, combining years of experience with a commitment to quality that shows in every project.`}</p>
              <button onClick={()=>go('about')} className="fg-btn-o" style={{padding:'12px 28px',fontSize:12}}>LEARN MORE <ArrowRight size={14}/></button>
            </div></Reveal>
            <Reveal delay={150}><div className="relative">
              {photos[0] ? (
                <img src={photos[0]} alt="" className="w-full object-cover" style={{aspectRatio:'4/3',display:'block'}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
              ) : (
                <PhotoPlaceholder accent={A} aspectRatio="4/3" style={{borderRadius:0}} />
              )}
              {/* Corner accent */}
              <div className="absolute top-0 left-0" style={{width:40,height:40,borderTop:`3px solid ${A}`,borderLeft:`3px solid ${A}`}} />
              <div className="absolute bottom-0 right-0" style={{width:40,height:40,borderBottom:`3px solid ${A}`,borderRight:`3px solid ${A}`}} />
            </div></Reveal>
          </div>
        </section>

        {/* SERVICES preview -- numbered industrial cards */}
        {svc.length>0&&(<section style={{padding:'clamp(60px,8vw,100px) clamp(20px,5vw,64px)',background:'#111111',backgroundImage:dotsBg,backgroundSize:'20px 20px'}}>
          <div style={{maxWidth:1200,margin:'0 auto'}}>
            <Reveal><div className="flex flex-wrap justify-between items-end gap-4 mb-14">
              <div><p style={{fontFamily:mono,fontSize:11,color:A,letterSpacing:'0.15em',textTransform:'uppercase',marginBottom:8}}>// Services</p>
              <h2 style={{fontFamily:heading,fontSize:'clamp(28px,4vw,48px)',fontWeight:800,textTransform:'uppercase',letterSpacing:'-0.01em',color:'#fff'}}>What we do.</h2></div>
              <button onClick={()=>go('services')} className="fg-btn-o" style={{padding:'10px 24px',fontSize:12}}>VIEW ALL <ArrowRight size={14}/></button>
            </div></Reveal>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {svcData.slice(0,6).map((s,i)=>(
                <Reveal key={i} delay={i*60}><div onClick={()=>go('services')} className="fg-lift cursor-pointer flex gap-5 p-6" style={{background:'#1A1A1A',borderLeft:`4px solid ${A}`,border:'1px solid #222',borderLeftWidth:4,borderLeftColor:A}}>
                  <span style={{fontFamily:heading,fontSize:'clamp(28px,3vw,40px)',fontWeight:900,color:`${A}22`,lineHeight:1,minWidth:50}}>{String(i+1).padStart(2,'0')}</span>
                  <div className="flex-1"><h3 style={{fontFamily:heading,fontSize:18,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.02em',marginBottom:6,color:'#eee'}}>{s.name}</h3>
                  <p className="text-sm leading-relaxed" style={{color:'#777'}}>{s.desc}</p></div>
                  <ArrowRight size={18} className="flex-shrink-0 mt-1" style={{color:'#444'}}/>
                </div></Reveal>
              ))}
            </div>
          </div>
        </section>)}

        {/* STATS */}
        <section style={{padding:'clamp(50px,7vw,80px) clamp(20px,5vw,64px)',background:A}}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8" style={{maxWidth:1100,margin:'0 auto'}}>
            {[{v:hasR?Number(lead.enrichedRating):5.0,s:'',l:'STAR RATING'},{v:lead.enrichedReviews||100,s:'+',l:'REVIEWS'},{v:10,s:'+',l:'YEARS EXP.'},{v:100,s:'%',l:'SATISFACTION'}].map((st,i)=>(
              <Reveal key={i} delay={i*100}><div className="text-center">
                <p style={{fontFamily:heading,fontSize:'clamp(36px,5vw,60px)',fontWeight:900,color:'#fff'}}><Counter end={st.v} suffix={st.s}/></p>
                <p style={{fontFamily:mono,fontSize:10,color:'rgba(255,255,255,0.6)',letterSpacing:'0.15em',marginTop:4}}>{st.l}</p>
              </div></Reveal>
            ))}
          </div>
        </section>

        {/* TESTIMONIAL */}
        <section style={{padding:'clamp(60px,8vw,100px) clamp(20px,5vw,64px)',background:'#1A1A1A',backgroundImage:stripesBg}}>
          <div style={{maxWidth:900,margin:'0 auto'}}>
            <Reveal><p style={{fontFamily:mono,fontSize:11,color:A,letterSpacing:'0.15em',textTransform:'uppercase',marginBottom:12}}>// Testimonials</p></Reveal>
            <Reveal delay={100}><div style={{borderLeft:`4px solid ${A}`,paddingLeft:'clamp(20px,3vw,40px)',marginTop:20}}>
              <Quote size={36} style={{color:A,opacity:0.3,marginBottom:16}}/>
              <p style={{fontFamily:heading,fontSize:'clamp(22px,3vw,34px)',fontWeight:600,lineHeight:1.4,color:'#ddd',marginBottom:24}}>"{testis[0].text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center text-white text-sm font-bold" style={{background:A}}>{testis[0].name[0]}</div>
                <div><p className="text-sm font-bold" style={{color:'#eee',fontFamily:heading,textTransform:'uppercase',letterSpacing:'0.05em'}}>{testis[0].name}</p><p className="text-xs" style={{color:'#666'}}>{testis[0].loc}</p></div>
              </div>
            </div></Reveal>
          </div>
        </section>

        {/* CTA */}
        <section className="relative overflow-hidden" style={{padding:'clamp(60px,8vw,100px) clamp(20px,5vw,64px)',background:'#111111'}}>
          {/* Diagonal accent stripe */}
          <div className="absolute inset-0" style={{background:`linear-gradient(135deg, transparent 30%, ${A}08 50%, transparent 70%)`,pointerEvents:'none'}} />
          <Reveal><div className="relative text-center" style={{maxWidth:700,margin:'0 auto'}}>
            <p style={{fontFamily:mono,fontSize:11,color:A,letterSpacing:'0.15em',textTransform:'uppercase',marginBottom:12}}>// Get Started</p>
            <h2 style={{fontFamily:heading,fontSize:'clamp(32px,5vw,56px)',fontWeight:900,textTransform:'uppercase',letterSpacing:'-0.01em',marginBottom:16,color:'#fff'}}>Ready to get started?</h2>
            <p className="text-base mb-10" style={{color:'#777'}}>Free estimate, no obligation. We respond same-day.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <button onClick={()=>{onCTAClick();go('contact')}} className="fg-btn">GET QUOTE <ArrowRight size={16}/></button>
              {lead.phone&&<a href={`tel:${lead.phone}`} onClick={onCallClick} className="fg-btn-o"><Phone size={16}/>{fmt(lead.phone)}</a>}
            </div>
          </div></Reveal>
        </section>
      </div>

      {/* ================================================================ */}
      {/* === SERVICES PAGE === */}
      {/* ================================================================ */}
      <div data-page="services" style={{display:page==='services'?'block':'none'}}>
        <ServicePageContent
          services={svcData}
          steps={wc?.processSteps||[
            { title:'Consultation', description:'We discuss your needs and vision in detail.' },
            { title:'Custom Quote', description:'Transparent pricing with no hidden fees.' },
            { title:'Expert Execution', description:'Our skilled team delivers quality results.' },
            { title:'Final Walkthrough', description:'We review every detail until you are thrilled.' },
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
      <div data-page="about" style={{display:page==='about'?'block':'none'}}>
        {/* Header */}
        <section style={{padding:'clamp(100px,14vh,160px) clamp(20px,5vw,64px) 60px',background:'#111111',backgroundImage:stripesBg}}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-end" style={{maxWidth:1200,margin:'0 auto'}}>
            <Reveal><div><p style={{fontFamily:mono,fontSize:11,color:A,letterSpacing:'0.15em',textTransform:'uppercase',marginBottom:8}}>// About</p>
            <h1 style={{fontFamily:heading,fontSize:'clamp(36px,6vw,64px)',fontWeight:900,textTransform:'uppercase',letterSpacing:'-0.01em',color:'#fff'}}>Our story.</h1></div></Reveal>
            <Reveal delay={150}><p style={{fontSize:17,lineHeight:1.8,color:'#999'}}>{wc?.aboutParagraph1||`${lead.companyName} provides expert ${indLabel}${loc?` in ${loc}`:''}, combining years of experience with a commitment to quality that shows in every project.`}</p></Reveal>
          </div>
        </section>

        {/* Photo + second paragraph */}
        <section style={{padding:'0 clamp(20px,5vw,64px) clamp(60px,8vw,80px)',background:'#111111'}}><div style={{maxWidth:1200,margin:'0 auto'}}>
          <Reveal><div className="overflow-hidden mb-10">{photos[3] ? <img src={photos[3]} alt="" className="w-full object-cover" style={{height:'clamp(250px,40vw,400px)',display:'block'}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/> : <PhotoPlaceholder accent={A} height={400} style={{borderRadius:0,height:'clamp(250px,40vw,400px)'}} />}</div></Reveal>
          {wc?.aboutParagraph2&&<Reveal><p className="text-base leading-relaxed mb-10" style={{color:'#999',maxWidth:700}}>{wc.aboutParagraph2}</p></Reveal>}
        </div></section>

        {/* Why Choose Us */}
        <section style={{padding:'clamp(40px,6vw,80px) clamp(20px,5vw,64px)',background:'#1A1A1A',backgroundImage:dotsBg,backgroundSize:'20px 20px'}}>
          <div style={{maxWidth:1200,margin:'0 auto'}}>
            <Reveal><p style={{fontFamily:mono,fontSize:11,color:A,letterSpacing:'0.15em',textTransform:'uppercase',marginBottom:8}}>// Why Us</p>
            <h2 style={{fontFamily:heading,fontSize:'clamp(28px,4vw,44px)',fontWeight:800,textTransform:'uppercase',letterSpacing:'-0.01em',marginBottom:48,color:'#fff'}}>Why choose us.</h2></Reveal>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">{whyUs.slice(0,3).map((vp,i)=>(
              <Reveal key={i} delay={i*100}><div className="fg-lift p-7" style={{background:'#111',borderLeft:`4px solid ${A}`,border:'1px solid #222',borderLeftWidth:4,borderLeftColor:A}}>
                <div className="w-10 h-10 flex items-center justify-center mb-4" style={{background:`${A}15`,color:A}}><CheckCircle size={20}/></div>
                <h4 style={{fontFamily:heading,fontSize:18,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.02em',marginBottom:8,color:'#eee'}}>{vp.title}</h4>
                <p className="text-sm leading-relaxed" style={{color:'#777'}}>{vp.description}</p>
              </div></Reveal>
            ))}</div>
          </div>
        </section>

        {/* Stats */}
        <section style={{padding:'clamp(40px,6vw,80px) clamp(20px,5vw,64px)',background:'#111111'}}>
          <div className="flex flex-wrap gap-12 justify-center" style={{maxWidth:1200,margin:'0 auto'}}>
            {hasR&&<Reveal><div className="text-center"><p style={{fontFamily:heading,fontSize:'clamp(40px,5vw,56px)',fontWeight:900,color:A}}>{lead.enrichedRating}</p><p style={{fontFamily:mono,fontSize:10,letterSpacing:'0.15em',color:'#555',marginTop:8}}>RATING</p></div></Reveal>}
            {lead.enrichedReviews&&<Reveal delay={100}><div className="text-center"><p style={{fontFamily:heading,fontSize:'clamp(40px,5vw,56px)',fontWeight:900,color:A}}><Counter end={lead.enrichedReviews} suffix="+"/></p><p style={{fontFamily:mono,fontSize:10,letterSpacing:'0.15em',color:'#555',marginTop:8}}>REVIEWS</p></div></Reveal>}
            <Reveal delay={200}><div className="text-center"><p style={{fontFamily:heading,fontSize:'clamp(40px,5vw,56px)',fontWeight:900,color:A}}>100%</p><p style={{fontFamily:mono,fontSize:10,letterSpacing:'0.15em',color:'#555',marginTop:8}}>SATISFACTION</p></div></Reveal>
            {svc.length>0&&<Reveal delay={300}><div className="text-center"><p style={{fontFamily:heading,fontSize:'clamp(40px,5vw,56px)',fontWeight:900,color:A}}><Counter end={svc.length}/></p><p style={{fontFamily:mono,fontSize:10,letterSpacing:'0.15em',color:'#555',marginTop:8}}>SERVICES</p></div></Reveal>}
          </div>
        </section>

        {/* Testimonials */}
        <section style={{padding:'clamp(40px,6vw,80px) clamp(20px,5vw,64px)',background:'#1A1A1A'}}>
          <div style={{maxWidth:1200,margin:'0 auto'}}>
            <Reveal><p style={{fontFamily:mono,fontSize:11,color:A,letterSpacing:'0.15em',textTransform:'uppercase',marginBottom:8}}>// Testimonials</p>
            <h2 style={{fontFamily:heading,fontSize:'clamp(28px,4vw,44px)',fontWeight:800,textTransform:'uppercase',letterSpacing:'-0.01em',marginBottom:48,color:'#fff'}}>What clients say.</h2></Reveal>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">{testis.slice(0,3).map((t,i)=>(
              <Reveal key={i} delay={i*100}><div className="fg-lift p-7" style={{background:'#111',border:'1px solid #222'}}>
                <Quote size={28} style={{color:A,opacity:0.2,marginBottom:12}}/>
                <p className="text-[15px] leading-relaxed mb-6" style={{color:'#999'}}>"{t.text}"</p>
                <div className="flex items-center gap-3"><div className="w-9 h-9 flex items-center justify-center text-white text-sm font-bold" style={{background:A}}>{t.name[0]}</div>
                <div><p className="text-sm font-bold" style={{fontFamily:heading,textTransform:'uppercase',letterSpacing:'0.04em',color:'#ddd'}}>{t.name}</p><p className="text-xs" style={{color:'#555'}}>{t.loc}</p></div></div>
              </div></Reveal>
            ))}</div>
          </div>
        </section>

        {/* FAQ */}
        <section style={{padding:'clamp(40px,6vw,80px) clamp(20px,5vw,64px)',background:'#111111',backgroundImage:stripesBg}}>
          <div style={{maxWidth:700,margin:'0 auto'}}>
            <Reveal><p style={{fontFamily:mono,fontSize:11,color:A,letterSpacing:'0.15em',textTransform:'uppercase',marginBottom:8}}>// FAQ</p>
            <h2 style={{fontFamily:heading,fontSize:'clamp(24px,3vw,36px)',fontWeight:800,textTransform:'uppercase',letterSpacing:'-0.01em',marginBottom:40,color:'#fff'}}>Common questions.</h2></Reveal>
            {faqs.map((f,i)=>(<Reveal key={i} delay={i*50}><div style={{borderBottom:'1px solid #222'}}>
              <button onClick={()=>setOpenFAQ(openFAQ===i?null:i)} className="w-full flex justify-between items-center text-left" style={{background:'none',border:'none',cursor:'pointer',color:'#eee',padding:'18px 0'}}>
                <span className="text-[15px] font-semibold pr-5" style={{fontFamily:body}}>{f.q}</span><span style={{color:openFAQ===i?A:'#444'}}>{openFAQ===i?<Minus size={16}/>:<Plus size={16}/>}</span>
              </button>
              <div style={{maxHeight:openFAQ===i?200:0,opacity:openFAQ===i?1:0,overflow:'hidden',transition:'all .3s'}}><p className="text-sm leading-relaxed pb-5" style={{color:'#777'}}>{f.a}</p></div>
            </div></Reveal>))}
          </div>
        </section>
      </div>

      {/* ================================================================ */}
      {/* === CONTACT PAGE === */}
      {/* ================================================================ */}
      <div data-page="contact" style={{display:page==='contact'?'block':'none'}}>
        {/* Header */}
        <section style={{padding:'clamp(100px,14vh,160px) clamp(20px,5vw,64px) 0',background:'#111111',backgroundImage:stripesBg}}><div style={{maxWidth:1200,margin:'0 auto'}}>
          <Reveal><p style={{fontFamily:mono,fontSize:11,color:A,letterSpacing:'0.15em',textTransform:'uppercase',marginBottom:8}}>// Contact</p></Reveal>
          <Reveal delay={80}><h1 style={{fontFamily:heading,fontSize:'clamp(36px,6vw,64px)',fontWeight:900,textTransform:'uppercase',letterSpacing:'-0.01em',marginBottom:16,color:'#fff'}}>Get in touch.</h1></Reveal>
          <Reveal delay={160}><p style={{fontSize:17,color:'#777',maxWidth:500}}>Reach out and we will respond same-day. No runaround.</p></Reveal>
        </div></section>

        {/* Contact info cards */}
        <section style={{padding:'clamp(40px,5vw,64px) clamp(20px,5vw,64px)',background:'#111111'}}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{maxWidth:1200,margin:'0 auto'}}>
            {[
              lead.phone&&{icon:<Phone size={20}/>,label:'Phone',value:fmt(lead.phone),sub:'Call or text anytime',href:`tel:${lead.phone}`},
              lead.email&&{icon:<Mail size={20}/>,label:'Email',value:lead.email,sub:'We respond same-day',href:`mailto:${lead.email}`},
              (lead.enrichedAddress||loc)&&{icon:<MapPin size={20}/>,label:'Location',value:lead.enrichedAddress||loc,sub:loc,href:undefined},
            ].filter(Boolean).map((item,i)=>{
              const c = item as {icon:React.ReactNode;label:string;value:string;sub:string;href?:string}
              return(<Reveal key={i} delay={i*80}><div className="fg-lift p-6 text-center" style={{background:'#1A1A1A',border:'1px solid #222'}}>
                <div className="w-12 h-12 flex items-center justify-center mx-auto mb-4" style={{background:`${A}15`,color:A}}>{c.icon}</div>
                <p style={{fontFamily:mono,fontSize:10,letterSpacing:'0.15em',textTransform:'uppercase',color:'#555',marginBottom:8}}>{c.label}</p>
                {c.href?<a href={c.href} onClick={c.label==='Phone'?onCallClick:undefined} className="font-semibold text-base" style={{color:'#eee',textDecoration:'none'}}>{c.value}</a>:<p className="font-semibold text-base" style={{color:'#eee'}}>{c.value}</p>}
                <p className="text-xs mt-1" style={{color:'#555'}}>{c.sub}</p>
              </div></Reveal>)
            })}
          </div>
        </section>

        {/* Service area + FAQ + Form */}
        <section style={{padding:'clamp(40px,6vw,80px) clamp(20px,5vw,64px)',background:'#1A1A1A',backgroundImage:dotsBg,backgroundSize:'20px 20px'}}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16" style={{maxWidth:1200,margin:'0 auto'}}>
            <Reveal><div>
              {wc?.serviceAreaText&&<div className="p-6 mb-8" style={{background:'#111',borderLeft:`4px solid ${A}`,border:'1px solid #222',borderLeftWidth:4,borderLeftColor:A}}>
                <p style={{fontFamily:mono,fontSize:10,color:A,letterSpacing:'0.15em',textTransform:'uppercase',marginBottom:8}}>Service Area</p>
                <p className="text-sm leading-relaxed" style={{color:'#888'}}>{wc.serviceAreaText}</p>
              </div>}
              <p style={{fontFamily:mono,fontSize:11,color:A,letterSpacing:'0.15em',textTransform:'uppercase',marginBottom:20}}>// FAQ</p>
              {faqs.map((f,i)=>(<div key={i} style={{borderBottom:'1px solid #2A2A2A'}}>
                <button onClick={()=>setOpenFAQ(openFAQ===i?null:i)} className="w-full flex justify-between items-center text-left" style={{background:'none',border:'none',cursor:'pointer',color:'#eee',padding:'16px 0'}}>
                  <span className="text-sm font-semibold pr-5" style={{fontFamily:body}}>{f.q}</span><span style={{color:openFAQ===i?A:'#444'}}>{openFAQ===i?<Minus size={14}/>:<Plus size={14}/>}</span>
                </button>
                <div style={{maxHeight:openFAQ===i?200:0,opacity:openFAQ===i?1:0,overflow:'hidden',transition:'all .3s'}}><p className="text-sm leading-relaxed pb-4" style={{color:'#777'}}>{f.a}</p></div>
              </div>))}
            </div></Reveal>
            <Reveal delay={120}><div className="p-8" style={{background:'#111',border:'1px solid #222'}}>
              {formSent ? (
                <div style={{textAlign:'center',padding:'40px 0'}}>
                  <CheckCircle size={40} style={{color:A,margin:'0 auto 20px'}}/>
                  <h3 style={{fontFamily:heading,fontSize:24,fontWeight:700,textTransform:'uppercase',marginBottom:8,color:'#fff'}}>Request Sent!</h3>
                  <p className="text-sm" style={{color:'#777'}}>We will get back to you within 24 hours.</p>
                </div>
              ) : (
                <>
                  <h3 style={{fontFamily:heading,fontSize:22,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.02em',marginBottom:4,color:'#fff'}}>Request an Estimate</h3>
                  <p className="text-[13px] mb-6" style={{color:'#555'}}>Free estimate, no obligation.</p>
                  {['Full Name','Phone','Email'].map(l=>(<div key={l} style={{marginBottom:12}}>
                    <label style={{fontFamily:mono,fontSize:10,letterSpacing:'0.12em',textTransform:'uppercase',color:'#555',display:'block',marginBottom:6}}>{l}</label>
                    <input placeholder={l}
                      type={l==='Phone'?'tel':l==='Email'?'email':'text'}
                      value={l==='Full Name'?formData.name:l==='Phone'?formData.phone:formData.email}
                      onChange={e=>{const v=e.target.value; setFormData(d=>({...d,[l==='Full Name'?'name':l==='Phone'?'phone':'email']:v}))}}
                      className="w-full text-sm" style={{padding:'14px 16px',background:'#1A1A1A',border:'1px solid #333',color:'#eee',fontFamily:body,boxSizing:'border-box'}}/>
                  </div>))}
                  {svc.length>0&&<div style={{marginBottom:12}}>
                    <label style={{fontFamily:mono,fontSize:10,letterSpacing:'0.12em',textTransform:'uppercase',color:'#555',display:'block',marginBottom:6}}>Service</label>
                    <select value={formData.service} onChange={e=>setFormData(d=>({...d,service:e.target.value}))} className="w-full text-sm" style={{padding:'14px 16px',background:'#1A1A1A',border:'1px solid #333',color:formData.service?'#eee':'#888',fontFamily:body,boxSizing:'border-box'}}><option value="">Select service</option>{svc.map(s=><option key={s} value={s}>{s}</option>)}</select>
                  </div>}
                  <div style={{marginBottom:20}}>
                    <label style={{fontFamily:mono,fontSize:10,letterSpacing:'0.12em',textTransform:'uppercase',color:'#555',display:'block',marginBottom:6}}>Message</label>
                    <textarea placeholder="Tell us about your project..." rows={4} value={formData.message} onChange={e=>setFormData(d=>({...d,message:e.target.value}))} className="w-full text-sm resize-none" style={{padding:'14px 16px',background:'#1A1A1A',border:'1px solid #333',color:'#eee',fontFamily:body,boxSizing:'border-box'}}/>
                  </div>
                  <button onClick={()=>{onCTAClick();setFormSent(true)}} className="fg-btn w-full justify-center" style={{padding:16}}>SUBMIT REQUEST <ArrowRight size={14}/></button>
                </>
              )}
            </div></Reveal>
          </div>
        </section>
      </div>

      {/* === FOOTER === */}
      <footer style={{background:'#0A0A0A',borderTop:`3px solid ${A}`,padding:'clamp(48px,6vw,80px) clamp(20px,5vw,64px) clamp(80px,10vw,120px)'}}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12" style={{maxWidth:1200,margin:'0 auto'}}>
          <div><div className="flex items-center gap-3 mb-4">{lead.logo?<img src={lead.logo} alt="" className="h-7 w-7 object-cover" style={{borderRadius:0}}/>:<div style={{width:6,height:20,background:A}}/>}<span style={{fontFamily:heading,fontWeight:700,color:'#fff',textTransform:'uppercase',letterSpacing:'0.04em'}}>{lead.companyName}</span></div>
          <p className="text-sm leading-relaxed" style={{color:'#555',maxWidth:300}}>Professional {indLabel}{loc?` in ${loc}`:''}.  Licensed and insured.</p></div>
          <div><p style={{fontFamily:mono,fontSize:10,letterSpacing:'0.15em',textTransform:'uppercase',color:'#444',marginBottom:16}}>Pages</p>
          <div className="flex flex-col gap-2.5">{PAGES.map(p=><button key={p.k} onClick={()=>go(p.k)} data-nav-page={p.k} className="text-sm text-left p-0" style={{background:'none',border:'none',color:'#666',cursor:'pointer',fontFamily:body}}>{p.l}</button>)}</div></div>
          <div><p style={{fontFamily:mono,fontSize:10,letterSpacing:'0.15em',textTransform:'uppercase',color:'#444',marginBottom:16}}>Contact</p>
          <div className="flex flex-col gap-3 text-sm" style={{color:'#666'}}>
            {lead.phone&&<a href={`tel:${lead.phone}`} onClick={onCallClick} style={{textDecoration:'none',color:'inherit'}}>{fmt(lead.phone)}</a>}
            {lead.email&&<a href={`mailto:${lead.email}`} style={{textDecoration:'none',color:'inherit'}}>{lead.email}</a>}
            {loc&&<span>{loc}</span>}
          </div></div>
        </div>
        <div className="flex flex-wrap justify-between items-center gap-4" style={{maxWidth:1200,margin:'0 auto',borderTop:'1px solid #1A1A1A',paddingTop:24}}>
          <p className="text-xs" style={{color:'#444'}}>&copy; {new Date().getFullYear()} {lead.companyName}</p>
          <span className="text-[10px]" style={{color:'#333'}}>Powered by <a href="https://brightautomations.com" target="_blank" rel="noopener noreferrer" style={{color:'#444'}}>Bright Automations</a></span>
        </div>
      </footer>

      {/* === LIGHTBOX === */}
      {lb!==null&&photos[lb]&&(<div className="fixed inset-0 z-[200] flex items-center justify-center p-5" style={{background:'rgba(0,0,0,.95)'}} onClick={()=>setLb(null)}>
        <img src={photos[lb]} alt="" style={{maxWidth:'90%',maxHeight:'85vh',objectFit:'contain'}}/>
        <button className="absolute top-6 right-6 w-11 h-11 flex items-center justify-center bg-white/10 border border-white/20 text-white cursor-pointer" onClick={e=>{e.stopPropagation();setLb(null)}}><X size={18}/></button>
        {lb>0&&<button className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center bg-white/10 border border-white/20 text-white cursor-pointer" onClick={e=>{e.stopPropagation();setLb(lb-1)}}><ChevronLeft size={20}/></button>}
        {lb<photos.length-1&&<button className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center bg-white/10 border border-white/20 text-white cursor-pointer" onClick={e=>{e.stopPropagation();setLb(lb+1)}}><ChevronRight size={20}/></button>}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2" style={{fontFamily:mono,fontSize:11,color:'rgba(255,255,255,.5)',letterSpacing:'0.1em'}}>{lb+1} / {photos.length}</div>
      </div>)}

      <ChatWidget name={lead.companyName} accent={A}/>
      <div className="h-20 lg:h-0"/>
    </div>
  )
}
