'use client'
/*
 * HORIZON TEMPLATE -- Modern
 * Light, airy, geometric. Split hero, floating pill nav, left-accent service rows.
 * Warm white (#FAFAF9), alternating warm gray (#F5F3EF)
 * Fonts: Space Grotesk (heading) / DM Sans (body) / IBM Plex Mono (labels)
 */

import { useState, useEffect, useRef } from 'react'
import { Phone, MapPin, Star, CheckCircle, ArrowRight, Mail, Camera, MessageCircle, X, Send, Menu, Minus, Plus, Quote, ChevronLeft, ChevronRight } from 'lucide-react'
import type { TemplateProps } from '../config/template-types'
import DisclaimerBanner from '../shared/DisclaimerBanner'
import PhotoPlaceholder from '../shared/PhotoPlaceholder'

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

export default function ModernTemplate({ lead, config, onCTAClick, onCallClick, websiteCopy: wc }: TemplateProps) {
  const [page, setPage] = useState<'home'|'services'|'about'|'work'|'contact'>('home')
  const [mobNav, setMobNav] = useState(false)
  const [openFAQ, setOpenFAQ] = useState<number|null>(null)
  const [lb, setLb] = useState<number|null>(null)
  const [navSolid, setNavSolid] = useState(false)

  useEffect(() => {
    const h = () => setNavSolid(window.scrollY>60)
    window.addEventListener('scroll',h,{passive:true}); return()=>window.removeEventListener('scroll',h)
  },[])

  const go = (p: typeof page) => { setPage(p); setMobNav(false); window.scrollTo({top:0,behavior:'smooth'}) }

  const svc = lead.enrichedServices||[]; const photos = lead.enrichedPhotos||[]
  const loc = [lead.city,lead.state].filter(Boolean).join(', ')
  const indLabel = lead.industry.toLowerCase().replace(/_/g,' ')
  const hasR = lead.enrichedRating && lead.enrichedRating > 0
  const A = getAccent(config)

  const svcData = svc.map((n,i) => ({ name:n, desc: wc?.serviceDescriptions?.[n] || `Professional ${n.toLowerCase()} services tailored to your needs.`, img: photos.length > 0 ? photos[i % photos.length] : undefined }))
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
  const brands = wc?.brandNames || []
  const faqs = [
    { q:'How do I get a quote?', a:'Call us or fill out our contact form -- we respond same-day with a free estimate.' },
    { q:'Do you offer free estimates?', a:'Absolutely! All estimates are free with no obligation whatsoever.' },
    { q:'What areas do you serve?', a:`We proudly serve ${loc||'your area'} and surrounding communities within 30 miles.` },
    { q:'Are you licensed and insured?', a:'Yes -- fully licensed, bonded, and insured for your complete protection.' },
    { q:'How quickly can you start?', a:'Most projects can begin within a few days. Emergency services available same-day.' },
  ]

  const PAGES = [{k:'home' as const,l:'Home'},{k:'services' as const,l:'Services'},{k:'about' as const,l:'About'},{k:'work' as const,l:'Portfolio'},{k:'contact' as const,l:'Contact'}]

  const sans = "'Space Grotesk','Inter',sans-serif"
  const body = "'DM Sans','Helvetica Neue',sans-serif"
  const mono = "'IBM Plex Mono','SF Mono',monospace"

  return (
    <div className="preview-template min-h-screen antialiased" style={{fontFamily:body,background:'#FAFAF9',color:'#1a1a1a',overflowX:'hidden'}}>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
        @keyframes hz-fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes hz-slideUp{from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:translateY(0)}}
        .hz-pill-btn{display:inline-flex;align-items:center;gap:8px;background:${A};color:#fff;padding:14px 32px;font-weight:600;font-size:15px;border-radius:999px;border:none;cursor:pointer;transition:all .25s;font-family:${body};text-decoration:none}
        .hz-pill-btn:hover{transform:scale(1.02);box-shadow:0 8px 30px ${A}33}
        .hz-pill-o{display:inline-flex;align-items:center;gap:8px;background:transparent;color:#1a1a1a;padding:14px 32px;border-radius:999px;border:1.5px solid #e0ddd8;font-weight:600;font-size:15px;cursor:pointer;transition:all .25s;font-family:${body};text-decoration:none}
        .hz-pill-o:hover{border-color:${A};color:${A}}
        .hz-lift{transition:transform .3s ease,box-shadow .3s ease}.hz-lift:hover{transform:translateY(-3px);box-shadow:0 12px 40px rgba(0,0,0,.06)}
        .hz-img-zoom{transition:transform .5s ease}.hz-img-zoom:hover{transform:scale(1.04)}
        .hz-overlay{position:fixed;inset:0;z-index:60;background:rgba(250,250,249,0.97);backdrop-filter:blur(20px);display:flex;flex-direction:column;padding:80px 24px 40px;animation:hz-slideUp .35s ease}
        ::selection{background:${A}22;color:#1a1a1a}
      ` }} />

      <DisclaimerBanner variant="modern" companyName={lead.companyName}/>

      {/* ── FLOATING PILL NAV (Desktop) ── */}
      <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 hidden lg:block" style={{transition:'all .4s'}}>
        <div style={{background:navSolid?'rgba(255,255,255,0.92)':'rgba(255,255,255,0.8)',backdropFilter:'blur(20px)',borderRadius:999,border:'1px solid rgba(0,0,0,0.06)',padding:'8px 8px 8px 24px',display:'flex',alignItems:'center',gap:8,boxShadow:'0 4px 30px rgba(0,0,0,0.06)'}}>
          <button onClick={()=>go('home')} className="flex items-center gap-2 mr-6" style={{background:'none',border:'none',cursor:'pointer'}}>
            {lead.logo?<img src={lead.logo} alt="" className="h-6 w-6 rounded-full object-cover"/>:<div className="w-2 h-2 rounded-full" style={{background:A}}/>}
            <span className="font-bold text-sm" style={{fontFamily:sans}}>{lead.companyName}</span>
          </button>
          {PAGES.map(p=>(
            <button key={p.k} onClick={()=>go(p.k)} className="text-[13px] font-medium px-4 py-2 rounded-full transition-all" style={{background:page===p.k?`${A}12`:'transparent',color:page===p.k?A:'#666',border:'none',cursor:'pointer',fontFamily:body}}>{p.l}</button>
          ))}
          <button onClick={()=>{onCTAClick();go('contact')}} className="ml-3 text-[13px] font-semibold px-5 py-2.5 rounded-full text-white border-none cursor-pointer" style={{background:A}}>Get Quote</button>
        </div>
      </nav>

      {/* ── MOBILE TOP BAR ── */}
      <nav className="lg:hidden fixed top-0 left-0 right-0 z-50" style={{background:'rgba(250,250,249,0.92)',backdropFilter:'blur(16px)',borderBottom:'1px solid rgba(0,0,0,0.05)',padding:'0 20px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',height:60}}>
          <button onClick={()=>go('home')} className="flex items-center gap-2" style={{background:'none',border:'none',cursor:'pointer'}}>
            {lead.logo?<img src={lead.logo} alt="" className="h-6 w-6 rounded-full object-cover"/>:<div className="w-2 h-2 rounded-full" style={{background:A}}/>}
            <span className="font-bold text-sm" style={{fontFamily:sans}}>{lead.companyName}</span>
          </button>
          <div className="flex items-center gap-3">
            <button onClick={()=>{onCTAClick();go('contact')}} className="text-[12px] font-semibold px-4 py-2 rounded-full text-white border-none cursor-pointer" style={{background:A}}>Quote</button>
            <button onClick={()=>setMobNav(!mobNav)} aria-label="Menu" style={{width:40,height:40,borderRadius:12,background:'#F5F3EF',border:'1.5px solid #e8e5df',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
              {mobNav?<X size={18} style={{color:'#666'}}/>:<Menu size={18} style={{color:'#666'}}/>}
            </button>
          </div>
        </div>
      </nav>

      {/* ── MOBILE NAV OVERLAY ── */}
      {mobNav&&<div className="hz-overlay lg:hidden">
        <div className="flex flex-col gap-2">
          {PAGES.map(p=>(
            <button key={p.k} onClick={()=>go(p.k)} className="text-left text-2xl font-semibold py-3 px-2 rounded-xl transition-all" style={{background:page===p.k?`${A}08`:'transparent',color:page===p.k?A:'#444',border:'none',cursor:'pointer',fontFamily:sans}}>{p.l}</button>
          ))}
        </div>
        <div className="mt-auto flex flex-col gap-3">
          <button onClick={()=>{onCTAClick();go('contact')}} className="hz-pill-btn justify-center">{config.ctaText||'Get Free Quote'} <ArrowRight size={16}/></button>
          {lead.phone&&<a href={`tel:${lead.phone}`} onClick={onCallClick} className="hz-pill-o justify-center"><Phone size={16}/>{fmt(lead.phone)}</a>}
        </div>
      </div>}

      {/* ================================================================ */}
      {/* ═══ HOME ═══ */}
      {/* ================================================================ */}
      <div data-page="home" style={{display:page==='home'?'block':'none'}}>
        {/* HERO -- split layout */}
        <section style={{paddingTop:'clamp(100px,14vh,160px)',paddingBottom:'clamp(60px,8vh,100px)',paddingLeft:'clamp(16px,4vw,48px)',paddingRight:'clamp(16px,4vw,48px)'}}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center" style={{maxWidth:1280,margin:'0 auto'}}>
            <div>
              <Reveal><div className="flex items-center gap-3 mb-6">
                {hasR&&<div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold" style={{background:`${A}12`,color:A}}><Star size={14} className="fill-current"/>{lead.enrichedRating} Rating</div>}
                {loc&&<span className="text-sm" style={{color:'#999'}}><MapPin size={13} className="inline mr-1"/>{loc}</span>}
              </div></Reveal>
              <Reveal delay={100}><h1 style={{fontFamily:sans,fontSize:'clamp(36px,5vw,64px)',fontWeight:700,lineHeight:1.08,letterSpacing:'-0.03em',marginBottom:20,color:'#1a1a1a'}}>{wc?.heroHeadline||config.tagline||`Quality ${indLabel} you can trust.`}</h1></Reveal>
              {wc?.heroSubheadline&&<Reveal delay={200}><p className="text-lg mb-8" style={{color:'#777',lineHeight:1.7,maxWidth:460}}>{wc.heroSubheadline}</p></Reveal>}
              <Reveal delay={300}><div className="flex flex-wrap gap-3">
                <button onClick={()=>{onCTAClick();go('contact')}} className="hz-pill-btn">{config.ctaText||'Get Free Quote'} <ArrowRight size={16}/></button>
                {lead.phone&&<a href={`tel:${lead.phone}`} onClick={onCallClick} className="hz-pill-o"><Phone size={16}/>{fmt(lead.phone)}</a>}
              </div></Reveal>
              <Reveal delay={400}><div className="flex items-center gap-6 mt-10">
                {[{v:hasR?`${lead.enrichedRating}`:'-',l:'Rating'},{v:lead.enrichedReviews?`${lead.enrichedReviews}+`:'-',l:'Reviews'},{v:'10+',l:'Years'}].map((s,i)=>(
                  <div key={i} className="text-center"><p className="text-2xl font-bold" style={{fontFamily:sans}}>{s.v}</p><p className="text-[11px] font-medium uppercase" style={{color:'#bbb',letterSpacing:'0.1em'}}>{s.l}</p></div>
                ))}
              </div></Reveal>
            </div>
            <Reveal delay={200} y={30}><div className="relative">
              {photos[0] ? (
                <img src={photos[0]} alt="" className="w-full object-cover" style={{borderRadius:16,aspectRatio:'4/3',display:'block',boxShadow:'0 20px 60px rgba(0,0,0,0.08)'}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
              ) : (
                <PhotoPlaceholder accent={A} aspectRatio="4/3" style={{borderRadius:16,boxShadow:'0 20px 60px rgba(0,0,0,0.08)'}} />
              )}
              {lead.enrichedReviews&&<div className="absolute -bottom-4 -left-4 px-4 py-2.5 rounded-xl bg-white shadow-lg border border-gray-100 flex items-center gap-2">
                <div className="flex gap-0.5">{Array.from({length:5},(_,i)=><Star key={i} size={12} className="fill-current" style={{color:'#f59e0b'}}/>)}</div>
                <span className="text-sm font-semibold">{lead.enrichedReviews}+ reviews</span>
              </div>}
            </div></Reveal>
          </div>
        </section>

        {/* SERVICES preview -- left-accent rows */}
        {svc.length>0&&(<section style={{padding:'clamp(60px,8vw,100px) clamp(16px,4vw,48px)',background:'#F5F3EF'}}>
          <div style={{maxWidth:1200,margin:'0 auto'}}>
            <Reveal><div className="flex flex-wrap justify-between items-end gap-4 mb-12">
              <div><p style={{fontFamily:mono,fontSize:11,color:A,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:8}}>Our Services</p>
              <h2 style={{fontFamily:sans,fontSize:'clamp(28px,3.5vw,44px)',fontWeight:700,letterSpacing:'-0.02em'}}>How we can help.</h2></div>
              <button onClick={()=>go('services')} className="hz-pill-o" style={{padding:'10px 24px',fontSize:13}}>See all <ArrowRight size={14}/></button>
            </div></Reveal>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {svcData.slice(0,6).map((s,i)=>(
                <Reveal key={i} delay={i*60}><div onClick={()=>go('services')} className="hz-lift cursor-pointer flex gap-5 bg-white p-6 rounded-xl" style={{borderLeft:`4px solid ${A}`}}>
                  <div className="flex-1"><h3 className="text-lg font-bold mb-1.5">{s.name}</h3>
                  <p className="text-sm leading-relaxed" style={{color:'#888'}}>{s.desc}</p></div>
                  <ArrowRight size={18} className="flex-shrink-0 mt-1" style={{color:'#ccc'}}/>
                </div></Reveal>
              ))}
            </div>
          </div>
        </section>)}

        {/* PHOTO + QUOTE band */}
        <Reveal><section className="relative overflow-hidden" style={{height:'50vh',minHeight:340}}>
          {photos[1] ? (
            <div className="absolute inset-0"><img src={photos[1]} alt="" className="w-full h-full object-cover" onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/></div>
          ) : (
            <div className="absolute inset-0" style={{background:`linear-gradient(135deg, ${A}18 0%, ${A}35 100%)`}} />
          )}
          <div className="absolute inset-0" style={{background: photos[1] ? 'rgba(26,26,26,0.55)' : 'transparent'}}/>
          <div className="relative h-full flex items-center justify-center text-center p-6">
            <p style={{fontFamily:sans,fontSize:'clamp(24px,3.5vw,44px)',fontWeight:700,lineHeight:1.2,maxWidth:650,letterSpacing:'-0.02em',color: photos[1] ? '#fff' : '#333'}}>"{wc?.closingHeadline||`Trusted by families across ${loc||'your community'}.`}"</p>
          </div>
        </section></Reveal>

        {/* STATS */}
        <section style={{padding:'clamp(60px,8vw,100px) clamp(16px,4vw,48px)'}}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8" style={{maxWidth:1000,margin:'0 auto'}}>
            {[{v:hasR?Number(lead.enrichedRating):5.0,s:'',l:'Star Rating'},{v:lead.enrichedReviews||100,s:'+',l:'Reviews'},{v:10,s:'+',l:'Years Experience'},{v:100,s:'%',l:'Satisfaction'}].map((st,i)=>(
              <Reveal key={i} delay={i*100}><div className="text-center">
                <p style={{fontFamily:sans,fontSize:'clamp(36px,5vw,56px)',fontWeight:700,letterSpacing:'-0.02em',color:'#1a1a1a'}}><Counter end={st.v} suffix={st.s}/></p>
                <p className="text-sm font-medium mt-1" style={{color:'#aaa'}}>{st.l}</p>
              </div></Reveal>
            ))}
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section style={{padding:'clamp(60px,8vw,100px) clamp(16px,4vw,48px)',background:'#F5F3EF'}}>
          <div style={{maxWidth:1200,margin:'0 auto'}}>
            <Reveal><p style={{fontFamily:mono,fontSize:11,color:A,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:8}}>Reviews</p>
            <h2 style={{fontFamily:sans,fontSize:'clamp(28px,3.5vw,44px)',fontWeight:700,letterSpacing:'-0.02em',marginBottom:48}}>What our clients say.</h2></Reveal>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">{testis.slice(0,3).map((t,i)=>(
              <Reveal key={i} delay={i*100}><div className="hz-lift bg-white rounded-xl p-7">
                <div className="flex gap-0.5 mb-4">{Array.from({length:5},(_,j)=><Star key={j} size={14} className="fill-current" style={{color:'#f59e0b'}}/>)}</div>
                <p className="text-[15px] leading-relaxed mb-6" style={{color:'#555'}}>"{t.text}"</p>
                <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{background:A}}>{t.name[0]}</div>
                <div><p className="text-sm font-semibold">{t.name}</p><p className="text-xs" style={{color:'#bbb'}}>{t.loc}</p></div></div>
              </div></Reveal>
            ))}</div>
          </div>
        </section>

        {/* PORTFOLIO PREVIEW */}
        <section style={{padding:'clamp(60px,8vw,100px) clamp(16px,4vw,48px)'}}>
          <div style={{maxWidth:1280,margin:'0 auto'}}>
            <Reveal><div className="flex flex-wrap justify-between items-end gap-4 mb-10">
              <div><p style={{fontFamily:mono,fontSize:11,color:A,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:8}}>Our Work</p>
              <h2 style={{fontFamily:sans,fontSize:'clamp(28px,3.5vw,44px)',fontWeight:700,letterSpacing:'-0.02em'}}>Recent projects.</h2></div>
              <button onClick={()=>go('work')} className="hz-pill-o" style={{padding:'10px 24px',fontSize:13}}>View all <ArrowRight size={14}/></button>
            </div></Reveal>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {photos.length > 0 ? photos.slice(0,3).map((p,i)=>(<Reveal key={i} delay={i*80}><div className="overflow-hidden rounded-xl cursor-pointer hz-lift" onClick={()=>setLb(i)}><img src={p} alt="" className="w-full object-cover" style={{aspectRatio:'4/3',display:'block'}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/></div></Reveal>)) : Array.from({length:3},(_,i)=>(<Reveal key={i} delay={i*80}><PhotoPlaceholder accent={A} aspectRatio="4/3" style={{borderRadius:12}} /></Reveal>))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section style={{padding:'clamp(60px,8vw,100px) clamp(16px,4vw,48px)',background:'#F5F3EF'}}>
          <Reveal><div style={{maxWidth:640,margin:'0 auto',background:A,borderRadius:24,padding:'clamp(40px,6vw,64px)',textAlign:'center',color:'#fff'}}>
            <h2 style={{fontFamily:sans,fontSize:'clamp(28px,4vw,40px)',fontWeight:700,letterSpacing:'-0.02em',marginBottom:12}}>Ready to get started?</h2>
            <p className="text-base mb-8" style={{opacity:0.8}}>Free estimate, no obligation. We respond same-day.</p>
            <div className="flex flex-wrap justify-center gap-3">
              <button onClick={()=>{onCTAClick();go('contact')}} style={{display:'inline-flex',alignItems:'center',gap:8,background:'#fff',color:A,padding:'14px 32px',fontWeight:600,fontSize:15,borderRadius:999,border:'none',cursor:'pointer',fontFamily:body}}>Get Quote <ArrowRight size={16}/></button>
              {lead.phone&&<a href={`tel:${lead.phone}`} onClick={onCallClick} style={{display:'inline-flex',alignItems:'center',gap:8,border:'1.5px solid rgba(255,255,255,.3)',color:'#fff',padding:'14px 32px',fontWeight:600,fontSize:15,borderRadius:999,textDecoration:'none',fontFamily:body}}><Phone size={16}/>{fmt(lead.phone)}</a>}
            </div>
          </div></Reveal>
        </section>
      </div>

      {/* ================================================================ */}
      {/* ═══ SERVICES PAGE ═══ */}
      {/* ================================================================ */}
      <div data-page="services" style={{display:page==='services'?'block':'none'}}>
        {/* Header */}
        <section style={{padding:'clamp(100px,14vh,160px) clamp(16px,4vw,48px) 60px'}}><div style={{maxWidth:1200,margin:'0 auto'}}>
          <Reveal><p style={{fontFamily:mono,fontSize:11,color:A,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:8}}>Services</p></Reveal>
          <Reveal delay={80}><h1 style={{fontFamily:sans,fontSize:'clamp(36px,5vw,60px)',fontWeight:700,letterSpacing:'-0.03em',marginBottom:16}}>What we offer.</h1></Reveal>
          <Reveal delay={160}><p className="text-lg" style={{color:'#888',maxWidth:540}}>Comprehensive {indLabel} services{loc?` in ${loc}`:''} -- backed by {lead.enrichedReviews||'hundreds of'} five-star reviews.</p></Reveal>
        </div></section>

        {/* Service cards with photos -- alternating layout */}
        <section style={{padding:'0 clamp(16px,4vw,48px) clamp(60px,8vw,100px)'}}>
          <div style={{maxWidth:1200,margin:'0 auto'}}>{svcData.map((s,i)=>(
            <Reveal key={i} delay={i*60}>
              <div className={`grid grid-cols-1 md:grid-cols-2 gap-0 mb-5 hz-lift overflow-hidden bg-white rounded-xl`} style={{borderLeft:`4px solid ${A}`}}>
                {i%2===0 && <div className="relative overflow-hidden" style={{minHeight:240}}>
                  {s.img ? (
                    <img src={s.img} alt={s.name} className="w-full h-full object-cover hz-img-zoom" style={{display:'block'}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
                  ) : (
                    <PhotoPlaceholder accent={A} style={{width:'100%',height:'100%',minHeight:240}} />
                  )}
                  <div className="absolute top-4 left-4"><span style={{fontFamily:mono,fontSize:11,color:'#fff',background:'rgba(0,0,0,0.5)',padding:'6px 12px',borderRadius:999,letterSpacing:'0.1em',backdropFilter:'blur(4px)'}}>{String(i+1).padStart(2,'0')}</span></div>
                </div>}
                <div className="flex flex-col justify-center p-8 md:p-10">
                  <h3 className="text-xl font-bold mb-3" style={{fontFamily:sans}}>{s.name}</h3>
                  <p className="text-[15px] leading-relaxed mb-5" style={{color:'#888'}}>{s.desc}</p>
                  <button onClick={()=>{onCTAClick();go('contact')}} className="flex items-center gap-2 text-sm font-semibold p-0" style={{background:'none',border:'none',color:A,cursor:'pointer'}}>Get estimate <ArrowRight size={14}/></button>
                </div>
                {i%2!==0 && <div className="relative overflow-hidden hidden md:block" style={{minHeight:240}}>
                  {s.img ? (
                    <img src={s.img} alt={s.name} className="w-full h-full object-cover hz-img-zoom" style={{display:'block'}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
                  ) : (
                    <PhotoPlaceholder accent={A} style={{width:'100%',height:'100%',minHeight:240}} />
                  )}
                  <div className="absolute top-4 right-4"><span style={{fontFamily:mono,fontSize:11,color:'#fff',background:'rgba(0,0,0,0.5)',padding:'6px 12px',borderRadius:999,letterSpacing:'0.1em',backdropFilter:'blur(4px)'}}>{String(i+1).padStart(2,'0')}</span></div>
                </div>}
              </div>
            </Reveal>
          ))}</div>
        </section>

        {/* Process Steps */}
        <section style={{padding:'clamp(60px,8vw,100px) clamp(16px,4vw,48px)',background:'#F5F3EF'}}>
          <div style={{maxWidth:1000,margin:'0 auto'}}>
            <Reveal><p style={{fontFamily:mono,fontSize:11,color:A,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:8}}>Our Process</p>
            <h2 style={{fontFamily:sans,fontSize:'clamp(28px,4vw,44px)',fontWeight:700,letterSpacing:'-0.02em',marginBottom:56}}>How it works.</h2></Reveal>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">{steps.slice(0,4).map((s,i)=>(
              <Reveal key={i} delay={i*100}>
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full mx-auto mb-5 flex items-center justify-center text-lg font-bold text-white" style={{background:A}}>{String(i+1).padStart(2,'0')}</div>
                  <h4 className="text-lg font-bold mb-2" style={{fontFamily:sans}}>{s.title}</h4>
                  <p className="text-sm leading-relaxed" style={{color:'#999'}}>{s.description}</p>
                </div>
              </Reveal>
            ))}</div>
          </div>
        </section>

        {/* Services CTA */}
        <section className="text-center" style={{padding:'clamp(60px,8vw,100px) clamp(16px,4vw,48px)'}}>
          <Reveal><div style={{maxWidth:540,margin:'0 auto'}}>
            <h2 style={{fontFamily:sans,fontSize:'clamp(24px,3vw,36px)',fontWeight:700,letterSpacing:'-0.02em',marginBottom:12}}>Need help choosing?</h2>
            <p className="text-base mb-8" style={{color:'#999'}}>Contact us for a personalized recommendation.</p>
            <div className="flex flex-wrap justify-center gap-3">
              <button onClick={()=>{onCTAClick();go('contact')}} className="hz-pill-btn">Contact Us <ArrowRight size={16}/></button>
              {lead.phone&&<a href={`tel:${lead.phone}`} onClick={onCallClick} className="hz-pill-o"><Phone size={16}/>{fmt(lead.phone)}</a>}
            </div>
          </div></Reveal>
        </section>
      </div>

      {/* ================================================================ */}
      {/* ═══ ABOUT PAGE ═══ */}
      {/* ================================================================ */}
      <div data-page="about" style={{display:page==='about'?'block':'none'}}>
        {/* Story header */}
        <section style={{padding:'clamp(100px,14vh,160px) clamp(16px,4vw,48px) 60px'}}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-end" style={{maxWidth:1200,margin:'0 auto'}}>
            <Reveal><div><p style={{fontFamily:mono,fontSize:11,color:A,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:8}}>About</p>
            <h1 style={{fontFamily:sans,fontSize:'clamp(36px,5vw,60px)',fontWeight:700,letterSpacing:'-0.03em'}}>Our story.</h1></div></Reveal>
            <Reveal delay={150}><p className="text-[17px] leading-relaxed" style={{color:'#777'}}>{wc?.aboutParagraph1||`${lead.companyName} provides expert ${indLabel}${loc?` in ${loc}`:''}, combining years of experience with a commitment to quality that shows in every project.`}</p></Reveal>
          </div>
        </section>

        {/* Photo + second paragraph */}
        <section style={{padding:'0 clamp(16px,4vw,48px) clamp(60px,8vw,80px)'}}><div style={{maxWidth:1200,margin:'0 auto'}}>
          <Reveal><div className="overflow-hidden rounded-xl mb-10">{photos[3] ? <img src={photos[3]} alt="" className="w-full object-cover" style={{height:400,display:'block'}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/> : <PhotoPlaceholder accent={A} height={400} style={{borderRadius:12}} />}</div></Reveal>
          {wc?.aboutParagraph2&&<Reveal><p className="text-base leading-relaxed mb-10" style={{color:'#777',maxWidth:700}}>{wc.aboutParagraph2}</p></Reveal>}
        </div></section>

        {/* Why Choose Us */}
        <section style={{padding:'clamp(40px,6vw,80px) clamp(16px,4vw,48px)',background:'#F5F3EF'}}>
          <div style={{maxWidth:1200,margin:'0 auto'}}>
            <Reveal><p style={{fontFamily:mono,fontSize:11,color:A,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:8}}>Why Us</p>
            <h2 style={{fontFamily:sans,fontSize:'clamp(28px,4vw,44px)',fontWeight:700,letterSpacing:'-0.02em',marginBottom:48}}>Why choose us.</h2></Reveal>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">{whyUs.slice(0,3).map((vp,i)=>(
              <Reveal key={i} delay={i*100}><div className="hz-lift bg-white rounded-xl p-7" style={{borderLeft:`4px solid ${A}`}}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center mb-4" style={{background:`${A}12`}}><CheckCircle size={20} style={{color:A}}/></div>
                <h4 className="text-lg font-bold mb-2" style={{fontFamily:sans}}>{vp.title}</h4>
                <p className="text-sm leading-relaxed" style={{color:'#888'}}>{vp.description}</p>
              </div></Reveal>
            ))}</div>
          </div>
        </section>

        {/* Stats */}
        <section style={{padding:'clamp(40px,6vw,80px) clamp(16px,4vw,48px)'}}>
          <div className="flex flex-wrap gap-12 justify-center" style={{maxWidth:1200,margin:'0 auto'}}>
            {hasR&&<Reveal><div className="text-center"><p className="text-5xl font-bold" style={{fontFamily:sans}}>{lead.enrichedRating}</p><p className="text-xs uppercase mt-2 font-medium" style={{letterSpacing:'0.12em',color:'#bbb'}}>Rating</p></div></Reveal>}
            {lead.enrichedReviews&&<Reveal delay={100}><div className="text-center"><p className="text-5xl font-bold" style={{fontFamily:sans}}><Counter end={lead.enrichedReviews} suffix="+"/></p><p className="text-xs uppercase mt-2 font-medium" style={{letterSpacing:'0.12em',color:'#bbb'}}>Reviews</p></div></Reveal>}
            <Reveal delay={200}><div className="text-center"><p className="text-5xl font-bold" style={{fontFamily:sans}}>100%</p><p className="text-xs uppercase mt-2 font-medium" style={{letterSpacing:'0.12em',color:'#bbb'}}>Satisfaction</p></div></Reveal>
            <Reveal delay={300}><div className="text-center"><p className="text-5xl font-bold" style={{fontFamily:sans}}><Counter end={svc.length}/></p><p className="text-xs uppercase mt-2 font-medium" style={{letterSpacing:'0.12em',color:'#bbb'}}>Services</p></div></Reveal>
          </div>
        </section>

        {/* Testimonials */}
        <section style={{padding:'clamp(40px,6vw,80px) clamp(16px,4vw,48px)',background:'#F5F3EF'}}>
          <div style={{maxWidth:1200,margin:'0 auto'}}>
            <Reveal><p style={{fontFamily:mono,fontSize:11,color:A,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:8}}>Testimonials</p>
            <h2 style={{fontFamily:sans,fontSize:'clamp(28px,4vw,44px)',fontWeight:700,letterSpacing:'-0.02em',marginBottom:48}}>What clients say.</h2></Reveal>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">{testis.slice(0,3).map((t,i)=>(
              <Reveal key={i} delay={i*100}><div className="hz-lift bg-white rounded-xl p-7">
                <Quote size={28} style={{color:A,opacity:0.15,marginBottom:12}}/>
                <p className="text-[15px] leading-relaxed mb-6" style={{color:'#555'}}>"{t.text}"</p>
                <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{background:A}}>{t.name[0]}</div>
                <div><p className="text-sm font-semibold">{t.name}</p><p className="text-xs" style={{color:'#bbb'}}>{t.loc}</p></div></div>
              </div></Reveal>
            ))}</div>
          </div>
        </section>

        {/* Brand Partners */}
        {brands.length>0&&(<section style={{padding:'clamp(40px,6vw,60px) clamp(16px,4vw,48px)'}}>
          <div className="text-center" style={{maxWidth:800,margin:'0 auto'}}>
            <p style={{fontFamily:mono,fontSize:11,color:'#bbb',letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:24}}>Trusted Brands We Work With</p>
            <div className="flex flex-wrap justify-center gap-8">{brands.map((b,i)=>(
              <span key={i} className="text-lg font-bold" style={{color:'#ddd'}}>{b}</span>
            ))}</div>
          </div>
        </section>)}

        {/* FAQ */}
        <section style={{padding:'clamp(40px,6vw,80px) clamp(16px,4vw,48px)',background:'#F5F3EF'}}>
          <div style={{maxWidth:700,margin:'0 auto'}}>
            <Reveal><p style={{fontFamily:mono,fontSize:11,color:A,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:8}}>FAQ</p>
            <h2 style={{fontFamily:sans,fontSize:'clamp(24px,3vw,36px)',fontWeight:700,letterSpacing:'-0.02em',marginBottom:40}}>Common questions.</h2></Reveal>
            {faqs.map((f,i)=>(<Reveal key={i} delay={i*50}><div style={{borderBottom:'1px solid #e8e5df'}}>
              <button onClick={()=>setOpenFAQ(openFAQ===i?null:i)} className="w-full flex justify-between items-center text-left" style={{background:'none',border:'none',cursor:'pointer',color:'#1a1a1a',padding:'18px 0'}}>
                <span className="text-[15px] font-semibold pr-5">{f.q}</span><span style={{color:openFAQ===i?A:'#ccc'}}>{openFAQ===i?<Minus size={16}/>:<Plus size={16}/>}</span>
              </button>
              <div style={{maxHeight:openFAQ===i?200:0,opacity:openFAQ===i?1:0,overflow:'hidden',transition:'all .3s'}}><p className="text-sm leading-relaxed pb-5" style={{color:'#888'}}>{f.a}</p></div>
            </div></Reveal>))}
          </div>
        </section>
      </div>

      {/* ================================================================ */}
      {/* ═══ WORK / PORTFOLIO PAGE ═══ */}
      {/* ================================================================ */}
      <div data-page="portfolio" style={{display:page==='work'?'block':'none'}}>
        {/* Gallery Header */}
        <section style={{padding:'clamp(100px,14vh,160px) clamp(16px,4vw,48px) 48px'}}><div style={{maxWidth:1200,margin:'0 auto'}}>
          <Reveal><p style={{fontFamily:mono,fontSize:11,color:A,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:8}}>Portfolio</p></Reveal>
          <Reveal delay={80}><h1 style={{fontFamily:sans,fontSize:'clamp(36px,5vw,60px)',fontWeight:700,letterSpacing:'-0.03em',marginBottom:16}}>Our work.</h1></Reveal>
          <Reveal delay={160}><p className="text-lg max-w-lg" style={{color:'#888',lineHeight:1.6}}>A selection of recent projects{loc?` in ${loc}`:''} and surrounding areas.</p></Reveal>
        </div></section>

        {/* Photo grid */}
        <section style={{padding:'0 clamp(16px,4vw,48px) clamp(60px,8vw,100px)'}}>
          <div style={{maxWidth:1200,margin:'0 auto'}}>
            {photos.length>0?(
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {photos.slice(0,9).map((p,i)=>(<Reveal key={i} delay={i*60}><div className="overflow-hidden rounded-xl cursor-pointer relative group" onClick={()=>setLb(i)}>
                  <img src={p} alt="" className="w-full object-cover hz-img-zoom" style={{aspectRatio:i===0?'16/10':'4/3',display:'block'}} loading={i>2?'lazy':undefined} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
                  <div className="absolute inset-0 flex items-end p-5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{background:'linear-gradient(to top,rgba(0,0,0,.6),transparent)'}}>
                    <p style={{fontFamily:mono,fontSize:11,color:'#fff',letterSpacing:'0.12em'}}>PROJECT {String(i+1).padStart(2,'0')}</p>
                  </div>
                </div></Reveal>))}
              </div>
            ):(
              <div className="text-center py-20 bg-white rounded-2xl"><Camera size={40} style={{color:'#ddd',margin:'0 auto 16px'}}/><h3 className="text-xl font-bold mb-3">Portfolio Coming Soon</h3><p className="text-sm mb-8" style={{color:'#aaa'}}>Contact us to see examples of our work.</p><button onClick={()=>{onCTAClick();go('contact')}} className="hz-pill-btn">Request Examples <ArrowRight size={14}/></button></div>
            )}
          </div>
        </section>

        {/* Portfolio CTA */}
        <section className="text-center" style={{padding:'clamp(40px,6vw,80px) clamp(16px,4vw,48px)',background:'#F5F3EF'}}>
          <Reveal><h2 style={{fontFamily:sans,fontSize:'clamp(24px,3vw,36px)',fontWeight:700,letterSpacing:'-0.02em',marginBottom:12}}>Like what you see?</h2>
          <p className="text-base mb-8" style={{color:'#999'}}>Let us bring the same quality to your project.</p>
          <button onClick={()=>{onCTAClick();go('contact')}} className="hz-pill-btn">Discuss Your Project <ArrowRight size={14}/></button></Reveal>
        </section>
      </div>

      {/* ================================================================ */}
      {/* ═══ CONTACT PAGE ═══ */}
      {/* ================================================================ */}
      <div data-page="contact" style={{display:page==='contact'?'block':'none'}}>
        {/* Header */}
        <section style={{padding:'clamp(100px,14vh,160px) clamp(16px,4vw,48px) 0'}}><div style={{maxWidth:1200,margin:'0 auto'}}>
          <Reveal><p style={{fontFamily:mono,fontSize:11,color:A,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:8}}>Contact</p></Reveal>
          <Reveal delay={80}><h1 style={{fontFamily:sans,fontSize:'clamp(36px,5vw,60px)',fontWeight:700,letterSpacing:'-0.03em',marginBottom:16}}>Get in touch.</h1></Reveal>
          <Reveal delay={160}><p className="text-lg" style={{color:'#888',maxWidth:480}}>We would love to hear from you. Reach out and we will respond same-day.</p></Reveal>
        </div></section>

        {/* Contact info cards */}
        <section style={{padding:'clamp(40px,5vw,64px) clamp(16px,4vw,48px)'}}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{maxWidth:1200,margin:'0 auto'}}>
            {[
              lead.phone&&{icon:<Phone size={20}/>,label:'Phone',value:fmt(lead.phone),sub:'Call or text anytime',href:`tel:${lead.phone}`},
              lead.email&&{icon:<Mail size={20}/>,label:'Email',value:lead.email,sub:'We respond same-day',href:`mailto:${lead.email}`},
              (lead.enrichedAddress||loc)&&{icon:<MapPin size={20}/>,label:'Location',value:lead.enrichedAddress||loc,sub:loc,href:undefined},
            ].filter(Boolean).map((item,i)=>{
              const c = item as {icon:React.ReactNode;label:string;value:string;sub:string;href?:string}
              return(<Reveal key={i} delay={i*80}><div className="hz-lift bg-white rounded-xl p-6 text-center" style={{border:'1px solid #eee'}}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{background:`${A}10`,color:A}}>{c.icon}</div>
                <p style={{fontFamily:mono,fontSize:10,letterSpacing:'0.12em',textTransform:'uppercase',color:'#bbb',marginBottom:8}}>{c.label}</p>
                {c.href?<a href={c.href} onClick={c.label==='Phone'?onCallClick:undefined} className="font-semibold text-base" style={{color:'#1a1a1a',textDecoration:'none'}}>{c.value}</a>:<p className="font-semibold text-base">{c.value}</p>}
                <p className="text-xs mt-1" style={{color:'#bbb'}}>{c.sub}</p>
              </div></Reveal>)
            })}
          </div>
        </section>

        {/* Service area + FAQ + Form */}
        <section style={{padding:'clamp(40px,6vw,80px) clamp(16px,4vw,48px)',background:'#F5F3EF'}}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16" style={{maxWidth:1200,margin:'0 auto'}}>
            <Reveal><div>
              {wc?.serviceAreaText&&<div className="bg-white rounded-xl p-6 mb-8" style={{borderLeft:`4px solid ${A}`}}>
                <p style={{fontFamily:mono,fontSize:10,color:A,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:8}}>Service Area</p>
                <p className="text-sm leading-relaxed" style={{color:'#777'}}>{wc.serviceAreaText}</p>
              </div>}
              <p style={{fontFamily:mono,fontSize:11,color:A,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:20}}>FAQ</p>
              {faqs.map((f,i)=>(<div key={i} style={{borderBottom:'1px solid #e8e5df'}}>
                <button onClick={()=>setOpenFAQ(openFAQ===i?null:i)} className="w-full flex justify-between items-center text-left" style={{background:'none',border:'none',cursor:'pointer',color:'#1a1a1a',padding:'16px 0'}}>
                  <span className="text-sm font-semibold pr-5">{f.q}</span><span style={{color:openFAQ===i?A:'#ccc'}}>{openFAQ===i?<Minus size={14}/>:<Plus size={14}/>}</span>
                </button>
                <div style={{maxHeight:openFAQ===i?200:0,opacity:openFAQ===i?1:0,overflow:'hidden',transition:'all .3s'}}><p className="text-sm leading-relaxed pb-4" style={{color:'#888'}}>{f.a}</p></div>
              </div>))}
            </div></Reveal>
            <Reveal delay={120}><div className="bg-white rounded-xl p-8 border border-gray-100" style={{boxShadow:'0 4px 30px rgba(0,0,0,0.04)'}}>
              <h3 className="text-xl font-bold mb-1" style={{fontFamily:sans}}>Request an Estimate</h3>
              <p className="text-[13px] mb-6" style={{color:'#aaa'}}>Free estimate, no obligation.</p>
              {['Full Name','Phone','Email'].map(l=>(<input key={l} placeholder={l} className="w-full text-sm mb-3 outline-none rounded-xl" style={{padding:'14px 16px',background:'#f8f7f5',border:'1px solid #eee',color:'#1a1a1a',fontFamily:body,boxSizing:'border-box'}}/>))}
              {svc.length>0&&<select className="w-full text-sm mb-3 rounded-xl" style={{padding:'14px 16px',background:'#f8f7f5',border:'1px solid #eee',color:'#aaa',fontFamily:body,boxSizing:'border-box'}}><option>Select service</option>{svc.map(s=><option key={s}>{s}</option>)}</select>}
              <textarea placeholder="Tell us about your project..." rows={4} className="w-full text-sm mb-5 outline-none resize-none rounded-xl" style={{padding:'14px 16px',background:'#f8f7f5',border:'1px solid #eee',color:'#1a1a1a',fontFamily:body,boxSizing:'border-box'}}/>
              <button onClick={onCTAClick} className="hz-pill-btn w-full justify-center" style={{padding:16}}>Submit Request <ArrowRight size={14}/></button>
            </div></Reveal>
          </div>
        </section>
      </div>

      {/* ═══ FOOTER ═══ */}
      <footer style={{background:'#fff',borderTop:'1px solid #eee',padding:'clamp(48px,6vw,80px) clamp(16px,4vw,48px) clamp(80px,10vw,120px)'}}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12" style={{maxWidth:1200,margin:'0 auto'}}>
          <div><div className="flex items-center gap-2 mb-4">{lead.logo?<img src={lead.logo} alt="" className="h-6 w-6 rounded-full object-cover"/>:<div className="w-2 h-2 rounded-full" style={{background:A}}/>}<span className="font-bold" style={{fontFamily:sans}}>{lead.companyName}</span></div>
          <p className="text-sm leading-relaxed" style={{color:'#aaa',maxWidth:300}}>Professional {indLabel}{loc?` in ${loc}`:''}.  Licensed and insured.</p></div>
          <div><p className="text-[10px] font-semibold uppercase mb-4" style={{color:'#ccc',letterSpacing:'0.12em'}}>Pages</p>
          <div className="flex flex-col gap-2.5">{PAGES.map(p=><button key={p.k} onClick={()=>go(p.k)} className="text-sm text-left p-0" style={{background:'none',border:'none',color:'#999',cursor:'pointer'}}>{p.l}</button>)}</div></div>
          <div><p className="text-[10px] font-semibold uppercase mb-4" style={{color:'#ccc',letterSpacing:'0.12em'}}>Contact</p>
          <div className="flex flex-col gap-3 text-sm" style={{color:'#999'}}>
            {lead.phone&&<a href={`tel:${lead.phone}`} onClick={onCallClick} style={{textDecoration:'none',color:'inherit'}}>{fmt(lead.phone)}</a>}
            {lead.email&&<a href={`mailto:${lead.email}`} style={{textDecoration:'none',color:'inherit'}}>{lead.email}</a>}
            {loc&&<span>{loc}</span>}
          </div></div>
        </div>
        <div className="flex flex-wrap justify-between items-center gap-4" style={{maxWidth:1200,margin:'0 auto',borderTop:'1px solid #f0f0f0',paddingTop:24}}>
          <p className="text-xs" style={{color:'#ccc'}}>&copy; {new Date().getFullYear()} {lead.companyName}</p>
          <span className="text-[10px]" style={{color:'#ddd'}}>Powered by <a href="https://brightautomations.com" target="_blank" rel="noopener noreferrer" style={{color:'#bbb'}}>Bright Automations</a></span>
        </div>
      </footer>

      {/* ═══ LIGHTBOX with prev/next ═══ */}
      {lb!==null&&photos[lb]&&(<div className="fixed inset-0 z-[200] flex items-center justify-center p-5" style={{background:'rgba(0,0,0,.92)'}} onClick={()=>setLb(null)}>
        <img src={photos[lb]} alt="" className="rounded-xl" style={{maxWidth:'90%',maxHeight:'85vh',objectFit:'contain'}}/>
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
