'use client'
/*
 * FLUX TEMPLATE -- Bento Grid
 * Asymmetric bento layouts, rounded corners, glassmorphism, playful but professional.
 * White (#FFFFFF) base, soft gray cards (#F8F9FA), accent color pops.
 * Fonts: Sora (heading) / Nunito Sans (body) / Fira Code (mono/labels)
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
      <div className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg text-white" style={{background:accent}}>{open?<X size={22}/>:<MessageCircle size={22}/>}</div>
    </button>
    {open&&(<div className="fixed sm:bottom-24 bottom-28 right-5 z-[100] w-[370px] max-w-[calc(100vw-2.5rem)] shadow-2xl overflow-hidden" style={{background:'#fff',borderRadius:24,border:'1px solid #f0f0f0'}}>
      <div className="px-5 py-4 text-white" style={{background:accent,borderRadius:'24px 24px 0 0'}}>
        <p className="font-bold text-sm">{name}</p>
        <p className="text-[10px] opacity-60 mt-0.5">AI Assistant by Bright Automations</p>
      </div>
      <div className="h-[260px] overflow-y-auto px-4 py-4 space-y-3" style={{background:'#FAFBFC'}}>
        {msgs.map((m,i)=>(<div key={i} className={`flex ${m.from==='user'?'justify-end':'justify-start'}`}><div className={`max-w-[80%] px-4 py-2.5 text-sm leading-relaxed`} style={m.from==='user'?{background:accent,color:'#fff',borderRadius:'20px 20px 4px 20px'}:{background:'#fff',color:'#555',borderRadius:'20px 20px 20px 4px',border:'1px solid #f0f0f0'}}>{m.text}</div></div>))}
        {typing&&<div className="flex justify-start"><div style={{background:'#fff',borderRadius:20,border:'1px solid #f0f0f0'}} className="px-4 py-3"><div className="flex gap-1">{[0,150,300].map(d=><span key={d} className="w-2 h-2 rounded-full animate-bounce" style={{background:accent,opacity:0.4,animationDelay:`${d}ms`}}/>)}</div></div></div>}
        <div ref={endRef}/>
      </div>
      <div className="px-4 py-3 bg-white" style={{borderTop:'1px solid #f0f0f0'}}><div className="flex gap-2">
        <input ref={inRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Type a message..." className="flex-1 text-sm px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-800 focus:outline-none focus:border-gray-300 placeholder:text-gray-400" style={{borderRadius:999}}/>
        <button onClick={()=>send()} disabled={!input.trim()} className="w-10 h-10 rounded-full flex items-center justify-center text-white disabled:opacity-30" style={{background:accent}}><Send size={15}/></button>
      </div></div>
    </div>)}
  </>)
}

/* ── Main Template ───────────────────────────────────── */

export default function FluxTemplate({ lead, config, onCTAClick, onCallClick, websiteCopy: wc }: TemplateProps) {
  const [page, setPage] = useState<'home'|'services'|'about'|'contact'>('home')
  const [mobNav, setMobNav] = useState(false)
  const [openFAQ, setOpenFAQ] = useState<number|null>(null)
  const [lb, setLb] = useState<number|null>(null)
  const [navSolid, setNavSolid] = useState(false)
  const [formData, setFormData] = useState({ name:'', phone:'', email:'', service:'', message:'' })
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
  const steps = wc?.processSteps || [
    { title:'Consultation', description:'We discuss your needs and vision in detail.' },
    { title:'Custom Quote', description:'Transparent pricing with no hidden fees.' },
    { title:'Expert Execution', description:'Our skilled team delivers quality results.' },
    { title:'Final Walkthrough', description:'We review every detail until you\'re thrilled.' },
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

  const PAGES = [{k:'home' as const,l:'Home'},{k:'services' as const,l:'Services'},{k:'about' as const,l:'About'},{k:'contact' as const,l:'Contact'}]

  const heading = "'Sora','Inter',sans-serif"
  const body = "'Nunito Sans','Helvetica Neue',sans-serif"
  const mono = "'Fira Code','SF Mono',monospace"
  const R = '24px' // global border radius

  const svcTheme: ServicePageTheme = {
    accent: A,
    fonts: { heading, body, mono },
    bgPrimary: '#FFFFFF',
    bgSecondary: '#F8F9FA',
    textPrimary: '#1a1a1a',
    textSecondary: '#444',
    textMuted: '#888',
    cardBg: '#fff',
    cardBorder: 'rgba(0,0,0,0.06)',
    isDark: false,
    borderRadius: R,
  }

  const handleSubmit = () => { onCTAClick(); setFormSent(true) }

  return (
    <div className="preview-template min-h-screen antialiased" style={{fontFamily:body,background:'#FFFFFF',color:'#1a1a1a',overflowX:'hidden'}}>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Nunito+Sans:wght@400;500;600;700&family=Fira+Code:wght@400;500&display=swap');
        @keyframes fx-fadeIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fx-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        .fx-btn{display:inline-flex;align-items:center;gap:8px;background:${A};color:#fff;padding:14px 32px;font-weight:600;font-size:15px;border-radius:999px;border:none;cursor:pointer;transition:all .25s;font-family:${body};text-decoration:none}
        .fx-btn:hover{transform:scale(1.03);box-shadow:0 12px 32px ${A}40}
        .fx-btn-o{display:inline-flex;align-items:center;gap:8px;background:transparent;color:#1a1a1a;padding:14px 32px;border-radius:999px;border:2px solid #E5E7EB;font-weight:600;font-size:15px;cursor:pointer;transition:all .25s;font-family:${body};text-decoration:none}
        .fx-btn-o:hover{border-color:${A};color:${A}}
        .fx-card{background:#fff;border-radius:${R};border:1px solid #F0F0F0;transition:transform .35s ease,box-shadow .35s ease}
        .fx-card:hover{transform:translateY(-4px);box-shadow:0 20px 50px rgba(0,0,0,0.08)}
        .fx-glass{background:rgba(255,255,255,0.7);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.5)}
        ::selection{background:${A}22;color:#1a1a1a}
      ` }} />

      <DisclaimerBanner variant="modern" companyName={lead.companyName}/>

      {/* ── FLOATING PILL NAV (Desktop) ── */}
      <nav className="fixed top-5 left-1/2 -translate-x-1/2 z-50 hidden lg:block" style={{transition:'all .4s'}}>
        <div className="fx-glass" style={{borderRadius:999,padding:'6px 6px 6px 24px',display:'flex',alignItems:'center',gap:6,boxShadow:navSolid?'0 8px 40px rgba(0,0,0,0.08)':'0 4px 24px rgba(0,0,0,0.04)'}}>
          <button onClick={()=>go('home')} data-nav-page="home" className="flex items-center gap-2 mr-4" style={{background:'none',border:'none',cursor:'pointer'}}>
            {lead.logo?<img src={lead.logo} alt="" className="h-7 w-7 rounded-full object-cover"/>:<div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{background:A}}>{lead.companyName[0]}</div>}
            <span className="font-bold text-sm" style={{fontFamily:heading}}>{lead.companyName}</span>
          </button>
          {PAGES.map(p=>(
            <button key={p.k} onClick={()=>go(p.k)} data-nav-page={p.k} className="text-[13px] font-medium px-5 py-2.5 transition-all" style={{background:page===p.k?A:'transparent',color:page===p.k?'#fff':'#666',border:'none',cursor:'pointer',fontFamily:body,borderRadius:999}}>{p.l}</button>
          ))}
          <button onClick={()=>{onCTAClick();go('contact')}} data-nav-page="contact" className="ml-2 text-[13px] font-semibold px-5 py-2.5 text-white border-none cursor-pointer" style={{background:A,borderRadius:999,boxShadow:`0 4px 16px ${A}40`}}>Get Quote</button>
        </div>
      </nav>

      {/* ── MOBILE TOP BAR ── */}
      <nav className="lg:hidden fixed top-0 left-0 right-0 z-50" style={{background:'rgba(255,255,255,0.9)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',borderBottom:'1px solid rgba(0,0,0,0.04)',padding:'0 20px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',height:60}}>
          <button onClick={()=>go('home')} data-nav-page="home" className="flex items-center gap-2" style={{background:'none',border:'none',cursor:'pointer'}}>
            {lead.logo?<img src={lead.logo} alt="" className="h-6 w-6 rounded-full object-cover"/>:<div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{background:A}}>{lead.companyName[0]}</div>}
            <span className="font-bold text-sm" style={{fontFamily:heading,maxWidth:'calc(100vw - 180px)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{lead.companyName}</span>
          </button>
          <div className="flex items-center gap-3">
            <button onClick={()=>{onCTAClick();go('contact')}} data-nav-page="contact" className="text-[12px] font-semibold px-4 py-2 text-white border-none cursor-pointer" style={{background:A,borderRadius:999,flexShrink:0}}>Quote</button>
            <button onClick={()=>setMobNav(!mobNav)} aria-label="Menu" style={{width:40,height:40,borderRadius:14,background:'#F8F9FA',border:'1px solid #EDEDEF',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
              {mobNav?<X size={18} style={{color:'#666'}}/>:<Menu size={18} style={{color:'#666'}}/>}
            </button>
          </div>
        </div>
      </nav>

      {/* ── MOBILE NAV OVERLAY ── */}
      {mobNav&&<div className="lg:hidden fixed inset-0 z-[60] flex flex-col" style={{background:'rgba(255,255,255,0.97)',backdropFilter:'blur(24px)',WebkitBackdropFilter:'blur(24px)',padding:'80px 24px 40px',animation:'fx-fadeIn .3s ease'}}>
        <div className="flex flex-col gap-2">
          {PAGES.map(p=>(
            <button key={p.k} onClick={()=>go(p.k)} data-nav-page={p.k} className="text-left text-2xl font-semibold py-3 px-4 transition-all" style={{background:page===p.k?`${A}10`:'transparent',color:page===p.k?A:'#444',border:'none',cursor:'pointer',fontFamily:heading,borderRadius:16}}>{p.l}</button>
          ))}
        </div>
        <div className="mt-auto flex flex-col gap-3">
          <button onClick={()=>{onCTAClick();go('contact')}} className="fx-btn justify-center">{config.ctaText||'Get Free Quote'} <ArrowRight size={16}/></button>
          {lead.phone&&<a href={`tel:${lead.phone}`} onClick={onCallClick} className="fx-btn-o justify-center"><Phone size={16}/>{fmt(lead.phone)}</a>}
        </div>
      </div>}

      {/* ================================================================ */}
      {/* === HOME PAGE === */}
      {/* ================================================================ */}
      <div data-page="home" style={{display:page==='home'?'block':'none'}}>

        {/* HERO -- Centered, playful */}
        <section style={{paddingTop:'clamp(110px,16vh,180px)',paddingBottom:'clamp(40px,6vh,80px)',paddingLeft:'clamp(16px,4vw,48px)',paddingRight:'clamp(16px,4vw,48px)',textAlign:'center'}}>
          <div style={{maxWidth:900,margin:'0 auto'}}>
            <Reveal><div className="flex items-center justify-center gap-3 mb-6 flex-wrap">
              {hasR&&<div className="flex items-center gap-1.5 px-4 py-2" style={{background:`${A}10`,borderRadius:999,color:A,fontSize:14,fontWeight:600}}><Star size={14} className="fill-current"/>{lead.enrichedRating} Rating</div>}
              {loc&&<span className="text-sm" style={{color:'#999',display:'inline-flex',alignItems:'center',gap:4}}><MapPin size={13}/>{loc}</span>}
            </div></Reveal>
            <Reveal delay={100}><h1 style={{fontFamily:heading,fontSize:'clamp(36px,5.5vw,68px)',fontWeight:800,lineHeight:1.06,letterSpacing:'-0.035em',marginBottom:24,color:'#1a1a1a',overflowWrap:'break-word'}}>
              {wc?.heroHeadline ? (
                wc.heroHeadline.split(' ').map((word, i, arr) => (
                  i >= Math.floor(arr.length / 2) && i < Math.floor(arr.length / 2) + 2
                    ? <span key={i} style={{color:A}}>{word} </span>
                    : <span key={i}>{word} </span>
                ))
              ) : (
                <>Quality <span style={{color:A}}>{indLabel}</span> you can trust.</>
              )}
            </h1></Reveal>
            <Reveal delay={200}><p style={{fontSize:'clamp(16px,1.8vw,20px)',lineHeight:1.7,color:'#777',maxWidth:560,margin:'0 auto 32px'}}>{wc?.heroSubheadline||`Professional ${indLabel} services${loc?` in ${loc}`:''} with a commitment to excellence on every job.`}</p></Reveal>
            <Reveal delay={300}><div className="flex flex-wrap justify-center gap-3">
              <button onClick={()=>{onCTAClick();go('contact')}} className="fx-btn">{config.ctaText||'Get Free Quote'} <ArrowRight size={16}/></button>
              {lead.phone&&<a href={`tel:${lead.phone}`} onClick={onCallClick} className="fx-btn-o"><Phone size={16}/>{fmt(lead.phone)}</a>}
            </div></Reveal>
          </div>
        </section>

        {/* BENTO GRID -- Service preview cards with varied sizes */}
        {svc.length>0&&(<section style={{padding:'clamp(20px,4vw,60px) clamp(16px,4vw,48px) clamp(60px,8vw,100px)'}}>
          <div style={{maxWidth:1200,margin:'0 auto'}}>
            <Reveal><div style={{textAlign:'center',marginBottom:'clamp(32px,4vw,48px)'}}>
              <p style={{fontFamily:mono,fontSize:12,color:A,letterSpacing:'0.15em',textTransform:'uppercase',marginBottom:10}}>What We Do</p>
              <h2 style={{fontFamily:heading,fontSize:'clamp(28px,3.5vw,44px)',fontWeight:700,letterSpacing:'-0.02em'}}>Our services</h2>
            </div></Reveal>
            {/* Bento: first card spans 2 cols on desktop, rest are single */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" style={{gridAutoRows:'minmax(200px,auto)'}}>
              {svcData.slice(0,5).map((s,i)=>(
                <Reveal key={i} delay={i*80}><div
                  onClick={()=>go('services')}
                  className={`fx-card cursor-pointer overflow-hidden relative ${i===0?'md:col-span-2 lg:col-span-2':''}`}
                  style={{borderRadius:R,minHeight:i===0?280:220,display:'flex',flexDirection:'column'}}
                >
                  {s.img ? (
                    <img src={s.img} alt={s.name} className="absolute inset-0 w-full h-full object-cover" style={{borderRadius:R}} onError={handleImgError} />
                  ) : (
                    <PhotoPlaceholder accent={A} style={{position:'absolute',inset:0,borderRadius:R}} />
                  )}
                  <div className="absolute inset-0" style={{background:'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)',borderRadius:R}}/>
                  <div className="relative mt-auto" style={{padding:'clamp(20px,3vw,32px)'}}>
                    <h3 style={{fontFamily:heading,fontSize:i===0?'clamp(22px,2.5vw,28px)':'clamp(18px,2vw,22px)',fontWeight:700,color:'#fff',marginBottom:6}}>{s.name}</h3>
                    <p style={{fontSize:14,color:'rgba(255,255,255,0.75)',lineHeight:1.5,maxWidth:400}}>{s.desc.length>100?s.desc.slice(0,100)+'...':s.desc}</p>
                  </div>
                </div></Reveal>
              ))}
            </div>
            {svc.length>5&&<Reveal delay={400}><div style={{textAlign:'center',marginTop:24}}>
              <button onClick={()=>go('services')} className="fx-btn-o" style={{padding:'12px 28px',fontSize:14}}>View all services <ArrowRight size={14}/></button>
            </div></Reveal>}
          </div>
        </section>)}

        {/* STATS -- Round badge row */}
        <section style={{padding:'clamp(40px,6vw,80px) clamp(16px,4vw,48px)',background:'#F8F9FA'}}>
          <div className="flex flex-wrap justify-center gap-6" style={{maxWidth:1000,margin:'0 auto'}}>
            {[
              {v:hasR?Number(lead.enrichedRating):5.0,s:'',l:'Star Rating',icon:'star'},
              {v:lead.enrichedReviews||100,s:'+',l:'Reviews',icon:'review'},
              {v:10,s:'+',l:'Years Exp.',icon:'years'},
              {v:100,s:'%',l:'Satisfaction',icon:'check'},
            ].map((st,i)=>(
              <Reveal key={i} delay={i*100}><div className="fx-glass" style={{borderRadius:R,padding:'clamp(24px,3vw,36px) clamp(28px,4vw,48px)',textAlign:'center',minWidth:140}}>
                <p style={{fontFamily:heading,fontSize:'clamp(32px,4vw,48px)',fontWeight:800,letterSpacing:'-0.02em',color:A,lineHeight:1}}><Counter end={st.v} suffix={st.s}/></p>
                <p className="text-sm font-medium mt-2" style={{color:'#888'}}>{st.l}</p>
              </div></Reveal>
            ))}
          </div>
        </section>

        {/* TESTIMONIAL -- Featured quote card */}
        <section style={{padding:'clamp(60px,8vw,100px) clamp(16px,4vw,48px)'}}>
          <div style={{maxWidth:1200,margin:'0 auto'}}>
            <Reveal><div style={{textAlign:'center',marginBottom:'clamp(32px,4vw,48px)'}}>
              <p style={{fontFamily:mono,fontSize:12,color:A,letterSpacing:'0.15em',textTransform:'uppercase',marginBottom:10}}>Reviews</p>
              <h2 style={{fontFamily:heading,fontSize:'clamp(28px,3.5vw,44px)',fontWeight:700,letterSpacing:'-0.02em'}}>What clients say</h2>
            </div></Reveal>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {testis.slice(0,3).map((t,i)=>(
                <Reveal key={i} delay={i*120}><div className="fx-card" style={{padding:'clamp(24px,3vw,36px)',borderRadius:R}}>
                  <div className="flex gap-0.5 mb-4">{Array.from({length:5},(_,j)=><Star key={j} size={16} className="fill-current" style={{color:'#f59e0b'}}/>)}</div>
                  <p style={{fontSize:15,lineHeight:1.7,color:'#555',marginBottom:24}}>"{t.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{background:A}}>{t.name[0]}</div>
                    <div><p className="text-sm font-semibold">{t.name}</p><p className="text-xs" style={{color:'#bbb'}}>{t.loc}</p></div>
                  </div>
                </div></Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* CTA -- Accent card */}
        <section style={{padding:'clamp(40px,6vw,80px) clamp(16px,4vw,48px)'}}>
          <Reveal><div style={{maxWidth:800,margin:'0 auto',background:A,borderRadius:R,padding:'clamp(40px,6vw,72px)',textAlign:'center',color:'#fff',position:'relative',overflow:'hidden'}}>
            {/* Decorative circles */}
            <div style={{position:'absolute',top:-40,right:-40,width:160,height:160,borderRadius:'50%',background:'rgba(255,255,255,0.08)'}}/>
            <div style={{position:'absolute',bottom:-60,left:-30,width:200,height:200,borderRadius:'50%',background:'rgba(255,255,255,0.05)'}}/>
            <div style={{position:'relative',zIndex:1}}>
              <h2 style={{fontFamily:heading,fontSize:'clamp(28px,4vw,44px)',fontWeight:700,letterSpacing:'-0.02em',marginBottom:14}}>Ready to get started?</h2>
              <p style={{fontSize:17,opacity:0.85,marginBottom:32,maxWidth:480,margin:'0 auto 32px'}}>Free estimate, no obligation. We respond same-day.</p>
              <div className="flex flex-wrap justify-center gap-3">
                <button onClick={()=>{onCTAClick();go('contact')}} style={{display:'inline-flex',alignItems:'center',gap:8,background:'#fff',color:A,padding:'14px 32px',fontWeight:700,fontSize:15,borderRadius:999,border:'none',cursor:'pointer',fontFamily:body}}>Get Quote <ArrowRight size={16}/></button>
                {lead.phone&&<a href={`tel:${lead.phone}`} onClick={onCallClick} style={{display:'inline-flex',alignItems:'center',gap:8,border:'2px solid rgba(255,255,255,.3)',color:'#fff',padding:'14px 32px',fontWeight:600,fontSize:15,borderRadius:999,textDecoration:'none',fontFamily:body}}><Phone size={16}/>{fmt(lead.phone)}</a>}
              </div>
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
          steps={steps}
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
        {/* About Hero */}
        <section style={{padding:'clamp(110px,14vh,170px) clamp(16px,4vw,48px) clamp(40px,5vw,60px)'}}>
          <div style={{maxWidth:1200,margin:'0 auto'}}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-end">
              <Reveal><div>
                <p style={{fontFamily:mono,fontSize:12,color:A,letterSpacing:'0.15em',textTransform:'uppercase',marginBottom:10}}>About</p>
                <h1 style={{fontFamily:heading,fontSize:'clamp(36px,5vw,64px)',fontWeight:800,letterSpacing:'-0.035em',lineHeight:1.08}}>Our story</h1>
              </div></Reveal>
              <Reveal delay={150}><p style={{fontSize:17,lineHeight:1.8,color:'#777'}}>{wc?.aboutParagraph1||`${lead.companyName} provides expert ${indLabel}${loc?` in ${loc}`:''}, combining years of experience with a commitment to quality that shows in every project.`}</p></Reveal>
            </div>
          </div>
        </section>

        {/* Photo band */}
        <section style={{padding:'0 clamp(16px,4vw,48px) clamp(48px,6vw,72px)'}}>
          <div style={{maxWidth:1200,margin:'0 auto'}}>
            <Reveal><div style={{overflow:'hidden',borderRadius:R}}>
              {photos[0] ? <img src={photos[0]} alt="" className="w-full object-cover" style={{height:'clamp(240px,30vw,420px)',display:'block',borderRadius:R}} onError={handleImgError}/> : <PhotoPlaceholder accent={A} height={360} style={{borderRadius:R}} />}
            </div></Reveal>
            {wc?.aboutParagraph2&&<Reveal delay={100}><p style={{fontSize:16,lineHeight:1.8,color:'#777',maxWidth:720,marginTop:32}}>{wc.aboutParagraph2}</p></Reveal>}
          </div>
        </section>

        {/* Why Choose Us -- Bento cards */}
        <section style={{padding:'clamp(40px,6vw,80px) clamp(16px,4vw,48px)',background:'#F8F9FA'}}>
          <div style={{maxWidth:1200,margin:'0 auto'}}>
            <Reveal><p style={{fontFamily:mono,fontSize:12,color:A,letterSpacing:'0.15em',textTransform:'uppercase',marginBottom:10}}>Why Us</p>
            <h2 style={{fontFamily:heading,fontSize:'clamp(28px,4vw,44px)',fontWeight:700,letterSpacing:'-0.02em',marginBottom:48}}>Why choose us</h2></Reveal>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">{whyUs.slice(0,3).map((vp,i)=>(
              <Reveal key={i} delay={i*100}><div className="fx-card" style={{padding:'clamp(24px,3vw,36px)',borderRadius:R}}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-5" style={{background:`${A}10`}}><CheckCircle size={22} style={{color:A}}/></div>
                <h4 style={{fontFamily:heading,fontSize:18,fontWeight:700,marginBottom:8}}>{vp.title}</h4>
                <p className="text-sm leading-relaxed" style={{color:'#888'}}>{vp.description}</p>
              </div></Reveal>
            ))}</div>
          </div>
        </section>

        {/* Stats row */}
        <section style={{padding:'clamp(40px,6vw,80px) clamp(16px,4vw,48px)'}}>
          <div className="flex flex-wrap gap-12 justify-center" style={{maxWidth:1200,margin:'0 auto'}}>
            {hasR&&<Reveal><div className="text-center"><p style={{fontFamily:heading,fontSize:'clamp(40px,5vw,56px)',fontWeight:800,color:A}}>{lead.enrichedRating}</p><p className="text-xs uppercase mt-2 font-medium" style={{letterSpacing:'0.12em',color:'#bbb'}}>Rating</p></div></Reveal>}
            {lead.enrichedReviews&&<Reveal delay={100}><div className="text-center"><p style={{fontFamily:heading,fontSize:'clamp(40px,5vw,56px)',fontWeight:800,color:A}}><Counter end={lead.enrichedReviews} suffix="+"/></p><p className="text-xs uppercase mt-2 font-medium" style={{letterSpacing:'0.12em',color:'#bbb'}}>Reviews</p></div></Reveal>}
            <Reveal delay={200}><div className="text-center"><p style={{fontFamily:heading,fontSize:'clamp(40px,5vw,56px)',fontWeight:800,color:A}}>100%</p><p className="text-xs uppercase mt-2 font-medium" style={{letterSpacing:'0.12em',color:'#bbb'}}>Satisfaction</p></div></Reveal>
            {svc.length>0&&<Reveal delay={300}><div className="text-center"><p style={{fontFamily:heading,fontSize:'clamp(40px,5vw,56px)',fontWeight:800,color:A}}><Counter end={svc.length}/></p><p className="text-xs uppercase mt-2 font-medium" style={{letterSpacing:'0.12em',color:'#bbb'}}>Services</p></div></Reveal>}
          </div>
        </section>

        {/* Testimonials */}
        <section style={{padding:'clamp(40px,6vw,80px) clamp(16px,4vw,48px)',background:'#F8F9FA'}}>
          <div style={{maxWidth:1200,margin:'0 auto'}}>
            <Reveal><p style={{fontFamily:mono,fontSize:12,color:A,letterSpacing:'0.15em',textTransform:'uppercase',marginBottom:10}}>Testimonials</p>
            <h2 style={{fontFamily:heading,fontSize:'clamp(28px,4vw,44px)',fontWeight:700,letterSpacing:'-0.02em',marginBottom:48}}>What clients say</h2></Reveal>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">{testis.slice(0,3).map((t,i)=>(
              <Reveal key={i} delay={i*100}><div className="fx-card" style={{padding:'clamp(24px,3vw,36px)',borderRadius:R}}>
                <Quote size={28} style={{color:A,opacity:0.2,marginBottom:12}}/>
                <p style={{fontSize:15,lineHeight:1.7,color:'#555',marginBottom:24}}>"{t.text}"</p>
                <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{background:A}}>{t.name[0]}</div>
                <div><p className="text-sm font-semibold">{t.name}</p><p className="text-xs" style={{color:'#bbb'}}>{t.loc}</p></div></div>
              </div></Reveal>
            ))}</div>
          </div>
        </section>

        {/* FAQ */}
        <section style={{padding:'clamp(40px,6vw,80px) clamp(16px,4vw,48px)'}}>
          <div style={{maxWidth:700,margin:'0 auto'}}>
            <Reveal><p style={{fontFamily:mono,fontSize:12,color:A,letterSpacing:'0.15em',textTransform:'uppercase',marginBottom:10}}>FAQ</p>
            <h2 style={{fontFamily:heading,fontSize:'clamp(24px,3vw,36px)',fontWeight:700,letterSpacing:'-0.02em',marginBottom:40}}>Common questions</h2></Reveal>
            {faqs.map((f,i)=>(<Reveal key={i} delay={i*50}><div style={{borderBottom:'1px solid #EDEDEF'}}>
              <button onClick={()=>setOpenFAQ(openFAQ===i?null:i)} className="w-full flex justify-between items-center text-left" style={{background:'none',border:'none',cursor:'pointer',color:'#1a1a1a',padding:'18px 0'}}>
                <span className="text-[15px] font-semibold pr-5">{f.q}</span><span style={{color:openFAQ===i?A:'#ccc'}}>{openFAQ===i?<Minus size={16}/>:<Plus size={16}/>}</span>
              </button>
              <div style={{maxHeight:openFAQ===i?200:0,opacity:openFAQ===i?1:0,overflow:'hidden',transition:'all .3s'}}><p className="text-sm leading-relaxed pb-5" style={{color:'#888'}}>{f.a}</p></div>
            </div></Reveal>))}
          </div>
        </section>
      </div>

      {/* ================================================================ */}
      {/* === CONTACT PAGE === */}
      {/* ================================================================ */}
      <div data-page="contact" style={{display:page==='contact'?'block':'none'}}>
        {/* Contact header */}
        <section style={{padding:'clamp(110px,14vh,170px) clamp(16px,4vw,48px) 0'}}>
          <div style={{maxWidth:1200,margin:'0 auto',textAlign:'center'}}>
            <Reveal><p style={{fontFamily:mono,fontSize:12,color:A,letterSpacing:'0.15em',textTransform:'uppercase',marginBottom:10}}>Contact</p></Reveal>
            <Reveal delay={80}><h1 style={{fontFamily:heading,fontSize:'clamp(36px,5vw,64px)',fontWeight:800,letterSpacing:'-0.035em',marginBottom:16}}>Get in touch</h1></Reveal>
            <Reveal delay={160}><p style={{fontSize:17,color:'#888',maxWidth:500,margin:'0 auto'}}>We would love to hear from you. Reach out and we will respond same-day.</p></Reveal>
          </div>
        </section>

        {/* Contact info cards */}
        <section style={{padding:'clamp(40px,5vw,64px) clamp(16px,4vw,48px)'}}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5" style={{maxWidth:1200,margin:'0 auto'}}>
            {[
              lead.phone&&{icon:<Phone size={22}/>,label:'Phone',value:fmt(lead.phone),sub:'Call or text anytime',href:`tel:${lead.phone}`},
              lead.email&&{icon:<Mail size={22}/>,label:'Email',value:lead.email,sub:'We respond same-day',href:`mailto:${lead.email}`},
              (lead.enrichedAddress||loc)&&{icon:<MapPin size={22}/>,label:'Location',value:lead.enrichedAddress||loc,sub:loc,href:undefined},
            ].filter(Boolean).map((item,i)=>{
              const c = item as {icon:React.ReactNode;label:string;value:string;sub:string;href?:string}
              return(<Reveal key={i} delay={i*80}><div className="fx-card text-center" style={{padding:'clamp(28px,3vw,40px)',borderRadius:R}}>
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{background:`${A}10`,color:A}}>{c.icon}</div>
                <p style={{fontFamily:mono,fontSize:11,letterSpacing:'0.12em',textTransform:'uppercase',color:'#bbb',marginBottom:10}}>{c.label}</p>
                {c.href?<a href={c.href} onClick={c.label==='Phone'?onCallClick:undefined} className="font-semibold text-base" style={{color:'#1a1a1a',textDecoration:'none'}}>{c.value}</a>:<p className="font-semibold text-base">{c.value}</p>}
                <p className="text-xs mt-2" style={{color:'#bbb'}}>{c.sub}</p>
              </div></Reveal>)
            })}
          </div>
        </section>

        {/* Form + FAQ */}
        <section style={{padding:'clamp(40px,6vw,80px) clamp(16px,4vw,48px)',background:'#F8F9FA'}}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16" style={{maxWidth:1200,margin:'0 auto'}}>
            <Reveal><div>
              {wc?.serviceAreaText&&<div className="fx-card" style={{padding:'clamp(20px,3vw,28px)',marginBottom:32,borderRadius:R,borderLeft:`4px solid ${A}`}}>
                <p style={{fontFamily:mono,fontSize:11,color:A,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:8}}>Service Area</p>
                <p className="text-sm leading-relaxed" style={{color:'#777'}}>{wc.serviceAreaText}</p>
              </div>}
              <p style={{fontFamily:mono,fontSize:12,color:A,letterSpacing:'0.15em',textTransform:'uppercase',marginBottom:20}}>FAQ</p>
              {faqs.map((f,i)=>(<div key={i} style={{borderBottom:'1px solid #E5E7EB'}}>
                <button onClick={()=>setOpenFAQ(openFAQ===i?null:i)} className="w-full flex justify-between items-center text-left" style={{background:'none',border:'none',cursor:'pointer',color:'#1a1a1a',padding:'16px 0'}}>
                  <span className="text-sm font-semibold pr-5">{f.q}</span><span style={{color:openFAQ===i?A:'#ccc'}}>{openFAQ===i?<Minus size={14}/>:<Plus size={14}/>}</span>
                </button>
                <div style={{maxHeight:openFAQ===i?200:0,opacity:openFAQ===i?1:0,overflow:'hidden',transition:'all .3s'}}><p className="text-sm leading-relaxed pb-4" style={{color:'#888'}}>{f.a}</p></div>
              </div>))}
            </div></Reveal>
            <Reveal delay={120}><div style={{background:'#fff',borderRadius:R,padding:'clamp(28px,4vw,40px)',border:'1px solid #F0F0F0',boxShadow:'0 8px 40px rgba(0,0,0,0.04)'}}>
              {formSent ? (
                <div style={{textAlign:'center',padding:'40px 0'}}>
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{background:`${A}10`}}><CheckCircle size={28} style={{color:A}}/></div>
                  <h3 style={{fontFamily:heading,fontSize:22,fontWeight:700,marginBottom:8}}>Request Sent!</h3>
                  <p className="text-sm" style={{color:'#888'}}>We will get back to you within 24 hours.</p>
                </div>
              ) : (
                <>
                  <h3 style={{fontFamily:heading,fontSize:22,fontWeight:700,marginBottom:4}}>Request an Estimate</h3>
                  <p className="text-[13px] mb-6" style={{color:'#aaa'}}>Free estimate, no obligation.</p>
                  {['Full Name','Phone','Email'].map(l=>(
                    <input key={l} placeholder={l}
                      type={l==='Phone'?'tel':l==='Email'?'email':'text'}
                      value={l==='Full Name'?formData.name:l==='Phone'?formData.phone:formData.email}
                      onChange={e=>{const v=e.target.value; setFormData(d=>({...d,[l==='Full Name'?'name':l==='Phone'?'phone':'email']:v}))}}
                      className="w-full text-sm mb-3 outline-none"
                      style={{padding:'14px 18px',background:'#F8F9FA',border:'1px solid #EDEDEF',color:'#1a1a1a',fontFamily:body,boxSizing:'border-box',borderRadius:16}}
                    />
                  ))}
                  {svc.length>0&&<select
                    value={formData.service}
                    onChange={e=>setFormData(d=>({...d,service:e.target.value}))}
                    className="w-full text-sm mb-3"
                    style={{padding:'14px 18px',background:'#F8F9FA',border:'1px solid #EDEDEF',color:formData.service?'#1a1a1a':'#aaa',fontFamily:body,boxSizing:'border-box',borderRadius:16}}
                  ><option value="">Select service</option>{svc.map(s=><option key={s}>{s}</option>)}</select>}
                  <textarea
                    placeholder="Tell us about your project..."
                    rows={4}
                    value={formData.message}
                    onChange={e=>setFormData(d=>({...d,message:e.target.value}))}
                    className="w-full text-sm mb-5 outline-none resize-none"
                    style={{padding:'14px 18px',background:'#F8F9FA',border:'1px solid #EDEDEF',color:'#1a1a1a',fontFamily:body,boxSizing:'border-box',borderRadius:16}}
                  />
                  <button onClick={handleSubmit} className="fx-btn w-full justify-center" style={{padding:16}}>Submit Request <ArrowRight size={14}/></button>
                </>
              )}
            </div></Reveal>
          </div>
        </section>
      </div>

      {/* ═══ FOOTER ═══ */}
      <footer style={{background:'#FAFBFC',borderTop:'1px solid #F0F0F0',padding:'clamp(48px,6vw,80px) clamp(16px,4vw,48px) clamp(80px,10vw,120px)'}}>
        <div style={{maxWidth:1200,margin:'0 auto'}}>
          {/* Accent divider */}
          <div style={{width:60,height:4,borderRadius:999,background:A,marginBottom:40}}/>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                {lead.logo?<img src={lead.logo} alt="" className="h-7 w-7 rounded-full object-cover"/>:<div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold" style={{background:A}}>{lead.companyName[0]}</div>}
                <span className="font-bold" style={{fontFamily:heading}}>{lead.companyName}</span>
              </div>
              <p className="text-sm leading-relaxed" style={{color:'#aaa',maxWidth:300}}>Professional {indLabel}{loc?` in ${loc}`:''}.  Licensed and insured.</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase mb-4" style={{color:'#ccc',letterSpacing:'0.12em'}}>Pages</p>
              <div className="flex flex-col gap-2.5">{PAGES.map(p=><button key={p.k} onClick={()=>go(p.k)} data-nav-page={p.k} className="text-sm text-left p-0" style={{background:'none',border:'none',color:'#999',cursor:'pointer'}}>{p.l}</button>)}</div>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase mb-4" style={{color:'#ccc',letterSpacing:'0.12em'}}>Contact</p>
              <div className="flex flex-col gap-3 text-sm" style={{color:'#999'}}>
                {lead.phone&&<a href={`tel:${lead.phone}`} onClick={onCallClick} style={{textDecoration:'none',color:'inherit'}}>{fmt(lead.phone)}</a>}
                {lead.email&&<a href={`mailto:${lead.email}`} style={{textDecoration:'none',color:'inherit'}}>{lead.email}</a>}
                {loc&&<span>{loc}</span>}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap justify-between items-center gap-4" style={{borderTop:'1px solid #F0F0F0',paddingTop:24}}>
            <p className="text-xs" style={{color:'#ccc'}}>&copy; {new Date().getFullYear()} {lead.companyName}</p>
            <span className="text-[10px]" style={{color:'#ddd'}}>Powered by <a href="https://brightautomations.com" target="_blank" rel="noopener noreferrer" style={{color:'#bbb'}}>Bright Automations</a></span>
          </div>
        </div>
      </footer>

      {/* ═══ LIGHTBOX ═══ */}
      {lb!==null&&photos[lb]&&(<div className="fixed inset-0 z-[200] flex items-center justify-center p-5" style={{background:'rgba(0,0,0,.92)'}} onClick={()=>setLb(null)}>
        <img src={photos[lb]} alt="" style={{maxWidth:'90%',maxHeight:'85vh',objectFit:'contain',borderRadius:R}}/>
        <button className="absolute top-6 right-6 w-11 h-11 rounded-full flex items-center justify-center bg-white/10 border border-white/20 text-white cursor-pointer" onClick={e=>{e.stopPropagation();setLb(null)}}><X size={18}/></button>
        {lb>0&&<button className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center bg-white/10 border border-white/20 text-white cursor-pointer" onClick={e=>{e.stopPropagation();setLb(lb-1)}}><ChevronLeft size={20}/></button>}
        {lb<photos.length-1&&<button className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center bg-white/10 border border-white/20 text-white cursor-pointer" onClick={e=>{e.stopPropagation();setLb(lb+1)}}><ChevronRight size={20}/></button>}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2" style={{fontFamily:mono,fontSize:11,color:'rgba(255,255,255,.5)',letterSpacing:'0.1em'}}>{lb+1} / {photos.length}</div>
      </div>)}

      <ChatWidget name={lead.companyName} accent={A}/>
      <div className="h-20 lg:h-0"/>
    </div>
  )
}
