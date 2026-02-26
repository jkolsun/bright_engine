'use client'
/*
 * OBSIDIAN TEMPLATE — Bold Challenger
 * Self-contained, mobile-first, data-page compatible for snapshot delivery
 * Accepts TemplateProps, uses DisclaimerBanner, wires tracking callbacks
 */

import { useState, useEffect, useRef } from 'react'
import { Phone, MapPin, Star, Shield, Clock, CheckCircle, ArrowRight, Mail, Camera, MessageCircle, X, Send, Menu, Minus, Plus, Quote, ChevronLeft, ChevronRight } from 'lucide-react'
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
  return m[config.accentColor] || '#c8ff00'
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

function Reveal({ children, delay=0, y=60, className='' }: { children: React.ReactNode; delay?: number; y?: number; className?: string }) {
  const [vis, setVis] = useState(false); const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => { if(e.isIntersecting){setVis(true);obs.disconnect()} }, { threshold:0.08 })
    obs.observe(el); return () => obs.disconnect()
  }, [])
  return <div ref={ref} className={className} style={{ opacity:vis?1:0, transform:vis?'translateY(0)':`translateY(${y}px)`, transition:`opacity 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}ms` }}>{children}</div>
}

function Marquee({ items, accent }: { items: string[]; accent: string }) {
  return (
    <div className="overflow-hidden whitespace-nowrap py-3.5">
      <div className="inline-block" style={{ animation:'obsidian-marquee 30s linear infinite' }}>
        {[...items,...items].map((item,i) => (
          <span key={i} className="inline-flex items-center gap-2 mr-12 text-[13px] font-semibold uppercase" style={{ letterSpacing:'0.15em', color:'rgba(255,255,255,0.3)' }}>
            <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background:accent }} />{item}
          </span>
        ))}
      </div>
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
    if(open && msgs.length===0){ setTyping(true); const t=setTimeout(()=>{setMsgs([{from:'bot',text:`Hi! Thanks for visiting ${name}. How can we help?`}]);setTyping(false)},800); return()=>clearTimeout(t) }
    if(open) setTimeout(()=>inRef.current?.focus(),100)
  }, [open,name])
  const send = (t?:string) => {
    const m=t||input.trim(); if(!m) return; setMsgs(p=>[...p,{from:'user',text:m}]); setInput(''); setTyping(true)
    setTimeout(()=>{
      let r="Thanks! We'll get back to you shortly. Call us for the fastest response."
      if(m.toLowerCase().includes('estimat')||m.toLowerCase().includes('quot')) r="We'd love to give you a free estimate. Share details or call us directly."
      else if(m.toLowerCase().includes('servic')) r="Check the Services section, or tell me what you need."
      else if(m.toLowerCase().includes('hour')) r="We're available 24/7 for emergencies. Standard hours Mon-Sat."
      setMsgs(p=>[...p,{from:'bot',text:r}]); setTyping(false)
    },1200)
  }
  return (<>
    <button onClick={()=>setOpen(!open)} className="fixed bottom-6 right-5 z-[100] sm:bottom-6 bottom-20" aria-label="Chat">
      <div className="w-14 h-14 flex items-center justify-center shadow-xl text-black" style={{background:accent}}>{open?<X size={22}/>:<MessageCircle size={22}/>}</div>
    </button>
    {open&&(<div className="fixed sm:bottom-24 bottom-28 right-5 z-[100] w-[370px] max-w-[calc(100vw-2.5rem)] bg-[#0a0a0a] shadow-2xl border border-white/10 overflow-hidden">
      <div className="px-5 py-4 text-black" style={{background:accent}}>
        <p className="font-bold text-sm">{name}</p>
        <p className="text-[10px] opacity-30 mt-1 tracking-widest uppercase">AI Assistant by Bright Automations</p>
      </div>
      <div className="h-[260px] overflow-y-auto px-4 py-4 space-y-3">
        {msgs.map((m,i)=>(<div key={i} className={`flex ${m.from==='user'?'justify-end':'justify-start'}`}><div className={`max-w-[80%] px-4 py-2.5 text-sm leading-relaxed ${m.from==='user'?'text-black':'bg-white/5 text-white/70 border border-white/5'}`} style={m.from==='user'?{background:accent}:{}}>{m.text}</div></div>))}
        {typing&&<div className="flex justify-start"><div className="bg-white/5 px-4 py-3 border border-white/5"><div className="flex gap-1">{[0,150,300].map(d=><span key={d} className="w-2 h-2 rounded-full animate-bounce" style={{background:accent,opacity:0.4,animationDelay:`${d}ms`}}/>)}</div></div></div>}
        <div ref={endRef}/>
      </div>
      <div className="px-4 py-3 border-t border-white/5"><div className="flex gap-2">
        <input ref={inRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Type a message..." className="flex-1 text-sm px-4 py-2.5 bg-white/5 border border-white/10 text-white focus:outline-none placeholder:text-white/20"/>
        <button onClick={()=>send()} disabled={!input.trim()} className="w-10 h-10 flex items-center justify-center text-black disabled:opacity-30" style={{background:accent}}><Send size={15}/></button>
      </div></div>
    </div>)}
  </>)
}

export default function BoldTemplate({ lead, config, onCTAClick, onCallClick, websiteCopy: wc }: TemplateProps) {
  const [page, setPage] = useState<'home'|'services'|'about'|'work'|'contact'>('home')
  const [mobNav, setMobNav] = useState(false)
  const [openFAQ, setOpenFAQ] = useState<number|null>(null)
  const [lb, setLb] = useState<number|null>(null)
  const [sY, setSY] = useState(0)
  const [navSolid, setNavSolid] = useState(false)

  useEffect(() => {
    const h = () => { setSY(window.scrollY); setNavSolid(window.scrollY>80) }
    window.addEventListener('scroll',h,{passive:true}); return()=>window.removeEventListener('scroll',h)
  },[])

  const go = (p: typeof page) => { setPage(p); setMobNav(false); window.scrollTo({top:0,behavior:'smooth'}) }

  const svc = lead.enrichedServices||[]; const photos = lead.enrichedPhotos||[]
  const loc = [lead.city,lead.state].filter(Boolean).join(', ')
  const indLabel = lead.industry.toLowerCase().replace(/_/g,' ')
  const hasR = lead.enrichedRating && lead.enrichedRating > 0
  const A = getAccent(config)

  const svcData = svc.map((n,i) => ({ name:n, desc: wc?.serviceDescriptions?.[n] || `Professional ${n.toLowerCase()} services.`, img: photos.length > 0 ? photos[i % photos.length] : undefined }))
  const testis = [
    { text: wc?.testimonialQuote || `Called on a Monday, had a crew here by Wednesday. Finished ahead of schedule. Already told three neighbors about ${lead.companyName}.`, name: wc?.testimonialAuthor || 'Sarah M.', loc:lead.city||'Local' },
    ...(wc?.additionalTestimonials?.map(t=>({text:t.quote,name:t.author,loc:lead.city||'Local'})) || [
      { text: "We've used other companies — no comparison. On time, communicated everything, result was exactly what we pictured.", name:'David R.', loc:lead.city||'Local' },
      { text: "Professional from start to finish. They handled everything including the insurance paperwork.", name:'James K.', loc:lead.city||'Local' },
    ])
  ]
  const steps = wc?.processSteps || [
    { title:'Free Consultation', description:'We assess your needs and provide a detailed, no-obligation quote.' },
    { title:'Schedule Service', description:'Pick a time that works — including evenings and weekends.' },
    { title:'Expert Execution', description:'Our certified team completes the work to the highest standards.' },
    { title:'Final Walkthrough', description:'We review everything together to ensure your complete satisfaction.' },
  ]
  const whyUs = wc?.whyChooseUs || wc?.valueProps || [
    { title:'Licensed & Insured', description:'Full coverage and proper licensing for your peace of mind.' },
    { title:'Same-Day Response', description:'We understand urgency. Most calls answered within 2 hours.' },
    { title:'Satisfaction Guaranteed', description:'We stand behind every job — 100% satisfaction or we make it right.' },
  ]
  const brands = wc?.brandNames || []
  const faqs = [
    { q:'How fast can you respond?', a:'Emergencies: 2-4 hours. Standard projects begin within 1-2 weeks.' },
    { q:'Do you work with insurance?', a:"Yes. Direct billing with all major providers." },
    { q:'What areas do you cover?', a:`We serve ${loc||'your area'} and surrounding communities.` },
    { q:'Are you licensed?', a:'Fully licensed, bonded, and insured.' },
    { q:'Do you offer free estimates?', a:'Absolutely. Every project starts with a free, no-obligation assessment.' },
  ]
  const PAGES = [{k:'home' as const,l:'Home'},{k:'services' as const,l:'Services'},{k:'about' as const,l:'About'},{k:'work' as const,l:'Our Work'},{k:'contact' as const,l:'Contact'}]
  const marquee = ['Licensed & Insured', hasR?`${lead.enrichedRating}-Star`:'5-Star', '24/7 Emergency', loc||'Local', lead.enrichedReviews?`${lead.enrichedReviews}+ Reviews`:'Guaranteed', 'Trusted Locally', 'Free Estimates']

  const serif = "'Playfair Display',Georgia,serif"
  const sans = "'Syne','Inter',-apple-system,sans-serif"
  const mono = "'JetBrains Mono','SF Mono',monospace"

  return (
    <div className="preview-template min-h-screen antialiased" style={{fontFamily:sans,background:'#0a0a0a',color:'#fff',overflowX:'hidden'}}>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800;900&family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
        @keyframes obsidian-marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        @keyframes obsidian-slideIn{from{opacity:0;transform:translateX(-30px)}to{opacity:1;transform:translateX(0)}}
        .obsidian-grain{position:fixed;inset:0;pointer-events:none;z-index:9999;opacity:0.02;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
        .obsidian-lift{transition:transform .4s cubic-bezier(.16,1,.3,1),box-shadow .4s ease}
        .obsidian-lift:hover{transform:translateY(-6px);box-shadow:0 20px 60px rgba(0,0,0,.4)}
        .obsidian-zoom{transition:transform .7s cubic-bezier(.16,1,.3,1)}.obsidian-zoom:hover{transform:scale(1.08)}
        .obsidian-bp{display:inline-flex;align-items:center;gap:10px;background:${A};color:#000;padding:16px 36px;font-weight:700;font-size:14px;letter-spacing:.08em;text-transform:uppercase;text-decoration:none;border:none;cursor:pointer;transition:all .3s;font-family:${sans}}
        .obsidian-bp:hover{background:#fff;transform:translateY(-2px)}
        .obsidian-bo{display:inline-flex;align-items:center;gap:10px;background:transparent;color:#fff;padding:16px 36px;border:1.5px solid rgba(255,255,255,.2);font-weight:700;font-size:14px;letter-spacing:.08em;text-transform:uppercase;text-decoration:none;cursor:pointer;transition:all .3s;font-family:${sans}}
        .obsidian-bo:hover{border-color:${A};color:${A}}
        ::selection{background:${A};color:#000}
      ` }} />

      <div className="obsidian-grain"/>
      <DisclaimerBanner variant="bold" companyName={lead.companyName}/>

      {/* ── NAV ── */}
      <nav style={{position:'fixed',top:0,left:0,right:0,zIndex:50,background:navSolid?'rgba(10,10,10,0.95)':'transparent',backdropFilter:navSolid?'blur(20px)':'none',borderBottom:navSolid?'1px solid rgba(255,255,255,0.05)':'none',transition:'all .4s',padding:'0 clamp(16px,4vw,48px)'}}>
        <div style={{maxWidth:1440,margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'space-between',height:navSolid?64:80,transition:'height .4s'}}>
          <button onClick={()=>go('home')} className="flex items-center gap-3" style={{background:'none',border:'none',cursor:'pointer'}}>
            {lead.logo?<img src={lead.logo} alt="" className="h-8 w-8 object-cover"/>:<div style={{width:10,height:10,background:A,borderRadius:'50%'}}/>}
            <span className="text-lg font-extrabold text-white" style={{letterSpacing:'-0.02em'}}>{lead.companyName}</span>
          </button>
          <div className="hidden lg:flex items-center gap-1">{PAGES.map(p=>(
            <button key={p.k} onClick={()=>go(p.k)} className="relative px-5 py-2 text-[13px] font-semibold uppercase bg-transparent border-none cursor-pointer transition-colors" style={{color:page===p.k?'#fff':'rgba(255,255,255,0.4)',letterSpacing:'0.05em'}}>
              {p.l}{page===p.k&&<span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5" style={{background:A}}/>}
            </button>
          ))}</div>
          <div className="flex items-center gap-4">
            {lead.phone&&<a href={`tel:${lead.phone}`} onClick={onCallClick} className="hidden lg:flex items-center gap-2 text-[13px] font-semibold" style={{color:'rgba(255,255,255,0.4)',textDecoration:'none'}}><Phone size={14}/>{fmt(lead.phone)}</a>}
            <button onClick={()=>{onCTAClick();go('contact')}} className="obsidian-bp hidden sm:inline-flex" style={{padding:'10px 24px',fontSize:12}}>Get Estimate</button>
            <button onClick={()=>setMobNav(!mobNav)} className="lg:hidden flex items-center justify-center w-11 h-11" style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',cursor:'pointer',color:'#fff'}}>{mobNav?<X size={20}/>:<Menu size={20}/>}</button>
          </div>
        </div>
      </nav>

      {/* ── MOBILE NAV ── */}
      {mobNav&&(<div className="fixed inset-0 z-[90] flex flex-col justify-center items-center gap-6" style={{background:'rgba(10,10,10,0.98)',backdropFilter:'blur(24px)'}}>
        <button onClick={()=>setMobNav(false)} className="absolute top-5 right-5 w-11 h-11 flex items-center justify-center" style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'#fff',cursor:'pointer'}}><X size={20}/></button>
        {PAGES.map((p,i)=>(<button key={p.k} onClick={()=>go(p.k)} className="text-3xl font-extrabold text-white" style={{background:'none',border:'none',cursor:'pointer',letterSpacing:'-0.02em',opacity:0,animation:`obsidian-slideIn .5s ease ${i*80}ms forwards`}}>{p.l}</button>))}
        {lead.phone&&<a href={`tel:${lead.phone}`} onClick={onCallClick} className="obsidian-bp mt-6"><Phone size={16}/>{fmt(lead.phone)}</a>}
      </div>)}

      {/* ═══════════════ HOME ═══════════════ */}
      <div data-page="home" style={{display:page==='home'?'block':'none'}}>
        {/* HERO */}
        <section className="relative flex items-end overflow-hidden" style={{height:'100vh',minHeight:700}}>
          {photos[0] ? (
            <div className="absolute inset-0" style={{backgroundImage:`url(${photos[0]})`,backgroundSize:'cover',backgroundPosition:'center',transform:`scale(${1+sY*0.0003})`,transition:'transform .1s linear'}}/>
          ) : (
            <div className="absolute inset-0" style={{background:`linear-gradient(135deg, ${A}15 0%, ${A}30 50%, rgba(10,10,10,0.95) 100%)`}} />
          )}
          <div className="absolute inset-0" style={{background:'linear-gradient(to top,#0a0a0a 0%,rgba(10,10,10,.6) 40%,rgba(10,10,10,.3) 100%)'}}/>
          <div className="relative w-full" style={{maxWidth:1440,margin:'0 auto',padding:'0 clamp(16px,4vw,48px) clamp(60px,10vh,120px)'}}>
            <Reveal y={40}><p style={{fontFamily:mono,fontSize:12,fontWeight:500,color:A,letterSpacing:'0.2em',textTransform:'uppercase',marginBottom:20}}>{loc?`24/7 Emergency Response · ${loc}`:'24/7 Emergency Response'}</p></Reveal>
            <Reveal delay={150} y={60}><h1 style={{fontFamily:serif,fontSize:'clamp(48px,8vw,120px)',fontWeight:800,lineHeight:0.92,letterSpacing:'-0.03em',marginBottom:32,maxWidth:900}}>{wc?.heroHeadline||config.tagline||`Trusted ${indLabel}.`}<span style={{color:A}}>.</span></h1></Reveal>
            {wc?.heroSubheadline&&<Reveal delay={300} y={40}><p style={{fontSize:20,color:'rgba(255,255,255,0.6)',maxWidth:520,lineHeight:1.6,marginBottom:48}}>{wc.heroSubheadline}</p></Reveal>}
            <Reveal delay={450} y={30}><div className="flex flex-wrap gap-4">
              <button onClick={()=>{onCTAClick();go('contact')}} className="obsidian-bp"><ArrowRight size={16}/>{config.ctaText||'Get Free Estimate'}</button>
              {lead.phone&&<a href={`tel:${lead.phone}`} onClick={onCallClick} className="obsidian-bo"><Phone size={16}/>Call Now</a>}
            </div></Reveal>
            {hasR&&<Reveal delay={600}><div className="hidden md:flex absolute items-center gap-4" style={{right:'clamp(16px,4vw,48px)',bottom:'clamp(60px,10vh,120px)',background:'rgba(255,255,255,0.05)',backdropFilter:'blur(20px)',border:'1px solid rgba(255,255,255,0.08)',padding:'20px 28px'}}>
              <div className="flex gap-1">{Array.from({length:5},(_,i)=><Star key={i} size={14} className="fill-current text-yellow-400"/>)}</div>
              <div><p className="font-bold text-sm">{lead.enrichedRating}/5.0</p><p style={{fontFamily:mono,fontSize:11,color:'rgba(255,255,255,0.4)'}}>{lead.enrichedReviews?`${lead.enrichedReviews}+ VERIFIED`:''}</p></div>
            </div></Reveal>}
          </div>
        </section>

        <div style={{borderTop:'1px solid rgba(255,255,255,0.05)',borderBottom:'1px solid rgba(255,255,255,0.05)',background:'#0a0a0a'}}><Marquee items={marquee} accent={A}/></div>

        {/* STATS */}
        <section style={{padding:'clamp(60px,8vw,100px) clamp(16px,4vw,48px)',background:'#0a0a0a'}}>
          <div className="flex flex-col sm:flex-row justify-between items-start gap-12 sm:gap-6" style={{maxWidth:1200,margin:'0 auto'}}>
            {[{v:hasR?Number(lead.enrichedRating):5.0,s:'',l:'Google Rating',d:lead.enrichedReviews?`${lead.enrichedReviews}+ reviews`:'Verified'},{v:2,s:'hr',l:'Avg Response',d:'Emergency arrival'},{v:10,s:'+',l:'Years Serving',d:loc||'Your community'},{v:100,s:'%',l:'Satisfaction',d:'Guaranteed'}].map((st,i)=>(
              <Reveal key={i} delay={i*120} className="flex-1 text-center">
                <p style={{fontFamily:serif,fontSize:'clamp(48px,6vw,72px)',fontWeight:800,letterSpacing:'-0.03em',lineHeight:1}}><Counter end={st.v} suffix={st.s}/></p>
                <p className="text-[13px] font-bold uppercase mt-2" style={{letterSpacing:'0.15em',color:'rgba(255,255,255,0.4)'}}>{st.l}</p>
                <p className="text-xs mt-1" style={{color:'rgba(255,255,255,0.2)'}}>{st.d}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* SERVICES PREVIEW */}
        {svc.length>0&&(<section style={{padding:'clamp(60px,8vw,100px) clamp(16px,4vw,48px)',background:'#0f0f0f',borderTop:'1px solid rgba(255,255,255,0.04)'}}>
          <div style={{maxWidth:1440,margin:'0 auto'}}>
            <Reveal><div className="flex flex-wrap justify-between items-end gap-5 mb-14"><div>
              <p style={{fontFamily:mono,fontSize:11,color:A,letterSpacing:'0.2em',textTransform:'uppercase',marginBottom:12}}>Services</p>
              <h2 style={{fontFamily:serif,fontSize:'clamp(32px,4vw,56px)',fontWeight:800,letterSpacing:'-0.02em',lineHeight:1.05}}>What we do<span style={{color:A}}>.</span></h2>
            </div><button onClick={()=>go('services')} className="obsidian-bo" style={{padding:'12px 28px',fontSize:12}}>All Services <ArrowRight size={14}/></button></div></Reveal>
            <div className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory flex-col sm:flex-row">
              {svcData.slice(0,6).map((s,i)=>(
                <Reveal key={i} delay={i*80}><div className="obsidian-lift cursor-pointer flex flex-col justify-between" onClick={()=>go('services')} style={{flex:'0 0 340px',minHeight:280,padding:36,background:'#161616',border:'1px solid rgba(255,255,255,0.05)',scrollSnapAlign:'start'}}>
                  <div><p style={{fontFamily:mono,fontSize:11,color:'rgba(255,255,255,0.2)',letterSpacing:'0.15em',marginBottom:20}}>{String(i+1).padStart(2,'0')}</p>
                  <h3 className="text-[22px] font-bold mb-3">{s.name}</h3><p className="text-sm leading-relaxed" style={{color:'rgba(255,255,255,0.4)'}}>{s.desc}</p></div>
                  <div className="flex items-center gap-2 mt-6 text-[13px] font-bold uppercase" style={{color:A,letterSpacing:'0.05em'}}>Learn more <ArrowRight size={14}/></div>
                </div></Reveal>
              ))}
            </div>
          </div>
        </section>)}

        {/* PHOTO BREAK */}
        <Reveal><section className="relative overflow-hidden" style={{height:'60vh',minHeight:400}}>
          {photos[1] ? (
            <div className="absolute inset-0" style={{backgroundImage:`url(${photos[1]})`,backgroundSize:'cover',backgroundPosition:'center',backgroundAttachment:'fixed'}}/>
          ) : (
            <div className="absolute inset-0" style={{background:`linear-gradient(135deg, ${A}20 0%, ${A}40 100%)`}} />
          )}
          <div className="absolute inset-0" style={{background: photos[1] ? 'rgba(10,10,10,0.5)' : 'rgba(10,10,10,0.3)'}}/>
          <div className="relative h-full flex items-center justify-center text-center p-5">
            <p style={{fontFamily:serif,fontSize:'clamp(28px,4vw,52px)',fontWeight:700,lineHeight:1.2,maxWidth:700}}>{wc?.closingHeadline?`"${wc.closingHeadline}"`:`"${loc||'Your community'} trusts ${lead.companyName}."`}</p>
          </div>
        </section></Reveal>

        {/* BENTO */}
        <section style={{padding:'clamp(60px,8vw,100px) clamp(16px,4vw,48px)',background:'#0a0a0a'}}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5" style={{maxWidth:1200,margin:'0 auto'}}>
            <Reveal className="lg:row-span-2"><div className="obsidian-lift h-full" style={{background:'#161616',border:'1px solid rgba(255,255,255,0.05)',padding:'clamp(32px,4vw,56px)'}}>
              <p style={{fontFamily:mono,fontSize:11,color:A,letterSpacing:'0.2em',textTransform:'uppercase',marginBottom:20}}>About</p>
              <h2 style={{fontFamily:serif,fontSize:'clamp(28px,3vw,44px)',fontWeight:800,lineHeight:1.1,marginBottom:24,letterSpacing:'-0.02em'}}>{loc?`${loc}'s`:'Your'} most trusted {indLabel} team.</h2>
              <p className="text-[15px] leading-relaxed mb-8" style={{color:'rgba(255,255,255,0.45)'}}>{wc?.aboutParagraph1||`${lead.companyName} delivers expert ${indLabel}${loc?` in ${loc}`:''}.${lead.enrichedReviews?` ${lead.enrichedReviews} five-star reviews.`:''} We handle every phase — no subcontractors.`}</p>
              <div className="flex gap-3 flex-wrap">
                {whyUs.slice(0,3).map((vp,i)=>(
                  <span key={i} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold" style={{color:'rgba(255,255,255,0.6)',border:'1px solid rgba(255,255,255,0.08)'}}><CheckCircle size={12}/>{vp.title}</span>
                ))}
              </div>
              <button onClick={()=>go('about')} className="mt-8 flex items-center gap-2 text-[13px] font-bold uppercase" style={{background:'none',border:'none',color:A,cursor:'pointer',letterSpacing:'0.08em'}}>Our Story <ArrowRight size={14}/></button>
            </div></Reveal>
            <Reveal delay={100}><div className="overflow-hidden relative" style={{minHeight:260}}>
              {photos[2] ? (
                <img src={photos[2]} alt="" className="w-full h-full object-cover obsidian-zoom" style={{display:'block'}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
              ) : (
                <PhotoPlaceholder accent={A} variant="dark" style={{width:'100%',height:'100%',minHeight:260}} />
              )}
              <div className="absolute bottom-0 left-0 right-0 p-6" style={{background:'linear-gradient(to top,rgba(0,0,0,.7),transparent)'}}><p style={{fontFamily:mono,fontSize:11,color:A,letterSpacing:'0.15em',textTransform:'uppercase'}}>Recent Project</p></div>
            </div></Reveal>
            <Reveal delay={200}><div className="obsidian-lift flex flex-col justify-between" style={{background:A,color:'#000',padding:'clamp(28px,3vw,40px)'}}>
              <div><p style={{fontFamily:mono,fontSize:11,fontWeight:600,letterSpacing:'0.2em',textTransform:'uppercase',marginBottom:16,opacity:.5}}>Our Process</p>
              <h3 style={{fontFamily:serif,fontSize:28,fontWeight:800,lineHeight:1.15,marginBottom:12}}>4 steps to done.</h3>
              <p className="text-sm" style={{opacity:.6,lineHeight:1.6}}>Call → Arrive → Plan → Restore. That simple.</p></div>
              <button onClick={()=>go('services')} className="mt-6 flex items-center gap-2 text-[13px] font-bold uppercase" style={{background:'none',border:'none',color:'#000',cursor:'pointer',letterSpacing:'0.08em'}}>How It Works <ArrowRight size={14}/></button>
            </div></Reveal>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section style={{padding:'clamp(60px,8vw,100px) clamp(16px,4vw,48px)',background:'#0f0f0f',borderTop:'1px solid rgba(255,255,255,0.04)'}}>
          <div style={{maxWidth:1200,margin:'0 auto'}}>
            <Reveal><p style={{fontFamily:mono,fontSize:11,color:A,letterSpacing:'0.2em',textTransform:'uppercase',marginBottom:12}}>Testimonials</p>
            <h2 style={{fontFamily:serif,fontSize:'clamp(32px,4vw,56px)',fontWeight:800,letterSpacing:'-0.02em',marginBottom:56,lineHeight:1.05}}>Real people<span style={{color:A}}>.</span> Real results<span style={{color:A}}>.</span></h2></Reveal>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">{testis.slice(0,3).map((t,i)=>(
              <Reveal key={i} delay={i*120}><div className="obsidian-lift" style={{background:'#161616',border:'1px solid rgba(255,255,255,0.05)',padding:36}}>
                <Quote size={48} style={{color:A,opacity:0.08}}/>
                <p className="text-base leading-relaxed mb-7 mt-2" style={{color:'rgba(255,255,255,0.7)'}}>"{t.text}"</p>
                <div className="flex items-center gap-3"><div className="w-10 h-10 flex items-center justify-center font-extrabold text-sm" style={{background:A,color:'#000'}}>{t.name[0]}</div>
                <div><p className="font-bold text-sm">{t.name}</p><p style={{fontFamily:mono,fontSize:11,color:'rgba(255,255,255,0.3)'}}>{t.loc}</p></div></div>
              </div></Reveal>
            ))}</div>
          </div>
        </section>

        {/* PORTFOLIO PREVIEW */}
        <section style={{padding:'clamp(60px,8vw,100px) clamp(16px,4vw,48px)',background:'#0a0a0a'}}>
          <div style={{maxWidth:1440,margin:'0 auto'}}>
            <Reveal><div className="flex flex-wrap justify-between items-end gap-5 mb-12"><div>
              <p style={{fontFamily:mono,fontSize:11,color:A,letterSpacing:'0.2em',textTransform:'uppercase',marginBottom:12}}>Portfolio</p>
              <h2 style={{fontFamily:serif,fontSize:'clamp(32px,4vw,56px)',fontWeight:800,letterSpacing:'-0.02em'}}>Our work<span style={{color:A}}>.</span></h2>
            </div><button onClick={()=>go('work')} className="obsidian-bo" style={{padding:'12px 28px',fontSize:12}}>View All <ArrowRight size={14}/></button></div></Reveal>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" style={{gridTemplateColumns:'2fr 1fr 1fr'}}>
              {photos.length > 0 ? photos.slice(0,3).map((p,i)=>(<Reveal key={i} delay={i*100}><div className="overflow-hidden cursor-pointer" onClick={()=>setLb(i)}><img src={p} alt="" className="w-full object-cover obsidian-zoom" style={{aspectRatio:i===0?'16/10':'1',display:'block'}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/></div></Reveal>)) : Array.from({length:3},(_,i)=>(<Reveal key={i} delay={i*100}><PhotoPlaceholder accent={A} variant="dark" aspectRatio={i===0?'16/10':'1'} /></Reveal>))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative overflow-hidden text-center" style={{padding:'clamp(80px,12vw,160px) clamp(16px,4vw,48px)',background:A}}>
          <div className="absolute inset-0 opacity-[0.06]" style={{backgroundImage:'repeating-linear-gradient(-45deg,transparent,transparent 40px,#000 40px,#000 41px)'}}/>
          <div className="relative" style={{maxWidth:700,margin:'0 auto'}}><Reveal>
            <h2 style={{fontFamily:serif,fontSize:'clamp(36px,5vw,64px)',fontWeight:800,color:'#000',lineHeight:1.05,letterSpacing:'-0.03em',marginBottom:20}}>Your property<br/>won't wait.</h2>
            <p className="text-lg mb-12 mx-auto" style={{color:'rgba(0,0,0,0.5)',maxWidth:460}}>Call now for a free assessment. We pick up 24/7.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <button onClick={()=>{onCTAClick();go('contact')}} style={{display:'inline-flex',alignItems:'center',gap:10,background:'#000',color:A,padding:'18px 40px',fontWeight:700,fontSize:15,letterSpacing:'0.06em',textTransform:'uppercase',border:'none',cursor:'pointer',fontFamily:sans}}>Get Estimate <ArrowRight size={16}/></button>
              {lead.phone&&<a href={`tel:${lead.phone}`} onClick={onCallClick} style={{display:'inline-flex',alignItems:'center',gap:10,border:'2px solid rgba(0,0,0,.2)',color:'#000',padding:'18px 40px',fontWeight:700,fontSize:15,letterSpacing:'0.06em',textTransform:'uppercase',textDecoration:'none',fontFamily:sans}}><Phone size={16}/>{fmt(lead.phone)}</a>}
            </div>
          </Reveal></div>
        </section>
      </div>

      {/* ═══════════════ SERVICES PAGE ═══════════════ */}
      <div data-page="services" style={{display:page==='services'?'block':'none'}}>
        <section style={{padding:'140px clamp(16px,4vw,48px) 60px',background:'#0a0a0a'}}><div style={{maxWidth:1200,margin:'0 auto'}}>
          <Reveal><p style={{fontFamily:mono,fontSize:11,color:A,letterSpacing:'0.2em',textTransform:'uppercase',marginBottom:12}}>Services</p></Reveal>
          <Reveal delay={100}><h1 style={{fontFamily:serif,fontSize:'clamp(40px,6vw,80px)',fontWeight:800,letterSpacing:'-0.03em',lineHeight:.95,marginBottom:24}}>What we do<span style={{color:A}}>.</span></h1></Reveal>
          <Reveal delay={200}><p className="text-lg max-w-xl" style={{color:'rgba(255,255,255,0.4)',lineHeight:1.6}}>Comprehensive {indLabel} services{loc?` in ${loc}`:''} — backed by {lead.enrichedReviews||'hundreds of'} reviews.</p></Reveal>
        </div></section>

        {/* Service cards with images */}
        <section style={{padding:'0 clamp(16px,4vw,48px) clamp(60px,8vw,100px)'}}>
          <div style={{maxWidth:1200,margin:'0 auto'}}>{svcData.map((s,i)=>(
            <Reveal key={i} delay={i*60}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0 mb-5 obsidian-lift" style={{background:'#161616',border:'1px solid rgba(255,255,255,0.05)',overflow:'hidden'}}>
                {s.img && <div className="relative overflow-hidden" style={{minHeight:220}}>
                  <img src={s.img} alt={s.name} className="w-full h-full object-cover" style={{display:'block',filter:'brightness(0.8)'}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
                  <div className="absolute top-4 left-4"><span style={{fontFamily:mono,fontSize:11,color:A,background:'rgba(0,0,0,0.7)',padding:'6px 12px',letterSpacing:'0.15em'}}>{String(i+1).padStart(2,'0')}</span></div>
                </div>}
                <div className="flex flex-col justify-between p-8 md:p-10">
                  <div>
                    <h3 className="text-2xl font-bold mb-4">{s.name}</h3>
                    <p className="text-[15px] leading-relaxed" style={{color:'rgba(255,255,255,0.45)'}}>{s.desc}</p>
                  </div>
                  <button onClick={()=>{onCTAClick();go('contact')}} className="mt-7 flex items-center gap-2 text-[13px] font-bold uppercase p-0" style={{background:'none',border:'none',color:A,cursor:'pointer',letterSpacing:'0.08em'}}>Get estimate <ArrowRight size={14}/></button>
                </div>
              </div>
            </Reveal>
          ))}</div>
        </section>

        {/* Process Steps */}
        <section style={{padding:'clamp(60px,8vw,100px) clamp(16px,4vw,48px)',background:'#0f0f0f',borderTop:'1px solid rgba(255,255,255,0.04)'}}>
          <div style={{maxWidth:1000,margin:'0 auto'}}>
            <Reveal><p style={{fontFamily:mono,fontSize:11,color:A,letterSpacing:'0.2em',textTransform:'uppercase',marginBottom:12}}>Our Process</p>
            <h2 style={{fontFamily:serif,fontSize:'clamp(28px,4vw,48px)',fontWeight:800,letterSpacing:'-0.02em',marginBottom:56}}>How it works<span style={{color:A}}>.</span></h2></Reveal>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">{steps.slice(0,4).map((s,i)=>(
              <Reveal key={i} delay={i*100}>
                <div className="text-center">
                  <div className="w-14 h-14 mx-auto mb-5 flex items-center justify-center text-lg font-extrabold" style={{background:A,color:'#000'}}>{String(i+1).padStart(2,'0')}</div>
                  <h4 className="text-lg font-bold mb-2">{s.title}</h4>
                  <p className="text-sm leading-relaxed" style={{color:'rgba(255,255,255,0.4)'}}>{s.description}</p>
                </div>
              </Reveal>
            ))}</div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative overflow-hidden text-center" style={{padding:'clamp(80px,10vw,120px) clamp(16px,4vw,48px)',background:A}}>
          <div className="absolute inset-0 opacity-[0.06]" style={{backgroundImage:'repeating-linear-gradient(-45deg,transparent,transparent 40px,#000 40px,#000 41px)'}}/>
          <div className="relative" style={{maxWidth:640,margin:'0 auto'}}><h2 style={{fontFamily:serif,fontSize:'clamp(28px,4vw,44px)',fontWeight:800,color:'#000',marginBottom:40}}>Ready to get started?</h2>
          <div className="flex flex-wrap justify-center gap-4">
            <button onClick={()=>{onCTAClick();go('contact')}} style={{background:'#000',color:A,padding:'16px 36px',fontWeight:700,fontSize:15,letterSpacing:'.06em',textTransform:'uppercase',border:'none',cursor:'pointer',fontFamily:sans}}>Get Estimate</button>
            {lead.phone&&<a href={`tel:${lead.phone}`} onClick={onCallClick} style={{border:'2px solid rgba(0,0,0,.2)',color:'#000',padding:'16px 36px',fontWeight:700,textDecoration:'none',display:'inline-flex',alignItems:'center',gap:10,fontFamily:sans}}><Phone size={16}/>{fmt(lead.phone)}</a>}
          </div></div>
        </section>
      </div>

      {/* ═══════════════ ABOUT PAGE ═══════════════ */}
      <div data-page="about" style={{display:page==='about'?'block':'none'}}>
        <section style={{padding:'140px clamp(16px,4vw,48px) 60px',background:'#0a0a0a'}}><div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-end" style={{maxWidth:1200,margin:'0 auto'}}>
          <Reveal><div><p style={{fontFamily:mono,fontSize:11,color:A,letterSpacing:'0.2em',textTransform:'uppercase',marginBottom:12}}>About</p><h1 style={{fontFamily:serif,fontSize:'clamp(40px,5vw,72px)',fontWeight:800,letterSpacing:'-0.03em',lineHeight:.95}}>Our story<span style={{color:A}}>.</span></h1></div></Reveal>
          <Reveal delay={200}><p className="text-[17px] leading-relaxed" style={{color:'rgba(255,255,255,0.4)'}}>{wc?.aboutParagraph1||`${lead.companyName} delivers expert ${indLabel}${loc?` in ${loc}`:''}.`}</p></Reveal>
        </div></section>

        {/* Photo + second paragraph */}
        <section style={{padding:'0 clamp(16px,4vw,48px) clamp(60px,8vw,80px)'}}><div style={{maxWidth:1200,margin:'0 auto'}}>
          <Reveal><div className="overflow-hidden mb-10">{photos[3] ? <img src={photos[3]} alt="" className="w-full object-cover" style={{height:400,display:'block'}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/> : <PhotoPlaceholder accent={A} variant="dark" height={400} />}</div></Reveal>
          {wc?.aboutParagraph2&&<Reveal><p className="text-base leading-relaxed mb-10" style={{color:'rgba(255,255,255,0.4)',maxWidth:700}}>{wc.aboutParagraph2}</p></Reveal>}
        </div></section>

        {/* Why Choose Us */}
        <section style={{padding:'clamp(40px,6vw,80px) clamp(16px,4vw,48px)',background:'#0f0f0f',borderTop:'1px solid rgba(255,255,255,0.04)'}}>
          <div style={{maxWidth:1200,margin:'0 auto'}}>
            <Reveal><h2 style={{fontFamily:serif,fontSize:'clamp(28px,4vw,48px)',fontWeight:800,letterSpacing:'-0.02em',marginBottom:48}}>Why choose us<span style={{color:A}}>.</span></h2></Reveal>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">{whyUs.slice(0,3).map((vp,i)=>(
              <Reveal key={i} delay={i*100}><div style={{background:'#161616',border:'1px solid rgba(255,255,255,0.05)',padding:32}}>
                <div className="w-2 h-2 mb-5" style={{background:A}}/><h4 className="text-lg font-bold mb-2">{vp.title}</h4><p className="text-sm leading-relaxed" style={{color:'rgba(255,255,255,0.4)'}}>{vp.description}</p>
              </div></Reveal>
            ))}</div>
          </div>
        </section>

        {/* Stats */}
        <section style={{padding:'clamp(40px,6vw,80px) clamp(16px,4vw,48px)',background:'#0a0a0a'}}>
          <div className="flex flex-wrap gap-10 justify-center" style={{maxWidth:1200,margin:'0 auto'}}>
            {hasR&&<Reveal><div className="text-center"><p className="text-5xl font-extrabold">{lead.enrichedRating}</p><p className="text-xs uppercase mt-2 font-semibold" style={{letterSpacing:'0.15em',color:'rgba(255,255,255,0.3)'}}>Rating</p></div></Reveal>}
            {lead.enrichedReviews&&<Reveal delay={100}><div className="text-center"><p className="text-5xl font-extrabold"><Counter end={lead.enrichedReviews} suffix="+"/></p><p className="text-xs uppercase mt-2 font-semibold" style={{letterSpacing:'0.15em',color:'rgba(255,255,255,0.3)'}}>Reviews</p></div></Reveal>}
            <Reveal delay={200}><div className="text-center"><p className="text-5xl font-extrabold">100%</p><p className="text-xs uppercase mt-2 font-semibold" style={{letterSpacing:'0.15em',color:'rgba(255,255,255,0.3)'}}>Satisfaction</p></div></Reveal>
            <Reveal delay={300}><div className="text-center"><p className="text-5xl font-extrabold"><Counter end={svc.length}/></p><p className="text-xs uppercase mt-2 font-semibold" style={{letterSpacing:'0.15em',color:'rgba(255,255,255,0.3)'}}>Services</p></div></Reveal>
          </div>
        </section>

        {/* Testimonials */}
        <section style={{padding:'clamp(40px,6vw,80px) clamp(16px,4vw,48px)',background:'#0f0f0f',borderTop:'1px solid rgba(255,255,255,0.04)'}}>
          <div style={{maxWidth:1200,margin:'0 auto'}}>
            <Reveal><h2 style={{fontFamily:serif,fontSize:'clamp(28px,4vw,48px)',fontWeight:800,letterSpacing:'-0.02em',marginBottom:48}}>What clients say<span style={{color:A}}>.</span></h2></Reveal>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">{testis.slice(0,3).map((t,i)=>(
              <Reveal key={i} delay={i*100}><div style={{background:'#161616',border:'1px solid rgba(255,255,255,0.05)',padding:32}}>
                <Quote size={36} style={{color:A,opacity:0.1,marginBottom:12}}/>
                <p className="text-[15px] leading-relaxed mb-6" style={{color:'rgba(255,255,255,0.65)'}}>"{t.text}"</p>
                <div className="flex items-center gap-3"><div className="w-9 h-9 flex items-center justify-center font-bold text-sm" style={{background:A,color:'#000'}}>{t.name[0]}</div>
                <div><p className="font-semibold text-sm">{t.name}</p><p style={{fontFamily:mono,fontSize:10,color:'rgba(255,255,255,0.3)'}}>{t.loc}</p></div></div>
              </div></Reveal>
            ))}</div>
          </div>
        </section>

        {/* Brand Partners */}
        {brands.length>0&&(<section style={{padding:'clamp(40px,6vw,60px) clamp(16px,4vw,48px)',background:'#0a0a0a',borderTop:'1px solid rgba(255,255,255,0.04)'}}>
          <div className="text-center" style={{maxWidth:800,margin:'0 auto'}}>
            <p style={{fontFamily:mono,fontSize:11,color:'rgba(255,255,255,0.3)',letterSpacing:'0.2em',textTransform:'uppercase',marginBottom:24}}>Trusted Brands We Work With</p>
            <div className="flex flex-wrap justify-center gap-8">{brands.map((b,i)=>(
              <span key={i} className="text-lg font-bold" style={{color:'rgba(255,255,255,0.15)'}}>{b}</span>
            ))}</div>
          </div>
        </section>)}

        {/* FAQ */}
        <section style={{padding:'clamp(40px,6vw,80px) clamp(16px,4vw,48px)',background:'#0a0a0a',borderTop:'1px solid rgba(255,255,255,0.04)'}}>
          <div style={{maxWidth:700,margin:'0 auto'}}>
            <Reveal><h2 style={{fontFamily:serif,fontSize:'clamp(24px,3vw,36px)',fontWeight:800,marginBottom:40}}>Common questions<span style={{color:A}}>.</span></h2></Reveal>
            {faqs.map((f,i)=>(<Reveal key={i} delay={i*50}><div style={{borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
              <button onClick={()=>setOpenFAQ(openFAQ===i?null:i)} className="w-full flex justify-between items-center text-left" style={{background:'none',border:'none',cursor:'pointer',color:'#fff',padding:'20px 0'}}>
                <span className="text-[15px] font-semibold pr-5">{f.q}</span><span style={{color:openFAQ===i?A:'rgba(255,255,255,0.3)'}}>{openFAQ===i?<Minus size={16}/>:<Plus size={16}/>}</span>
              </button>
              <div style={{maxHeight:openFAQ===i?200:0,opacity:openFAQ===i?1:0,overflow:'hidden',transition:'all .3s'}}><p className="text-sm leading-relaxed pb-5" style={{color:'rgba(255,255,255,0.4)'}}>{f.a}</p></div>
            </div></Reveal>))}
          </div>
        </section>
      </div>

      {/* ═══════════════ WORK / PORTFOLIO PAGE ═══════════════ */}
      <div data-page="portfolio" style={{display:page==='work'?'block':'none'}}>
        <section style={{padding:'140px clamp(16px,4vw,48px) 48px'}}><div style={{maxWidth:1200,margin:'0 auto'}}>
          <Reveal><p style={{fontFamily:mono,fontSize:11,color:A,letterSpacing:'0.2em',textTransform:'uppercase',marginBottom:12}}>Portfolio</p></Reveal>
          <Reveal delay={100}><h1 style={{fontFamily:serif,fontSize:'clamp(40px,6vw,80px)',fontWeight:800,letterSpacing:'-0.03em',lineHeight:.95,marginBottom:16}}>Our work<span style={{color:A}}>.</span></h1></Reveal>
          <Reveal delay={200}><p className="text-lg max-w-lg" style={{color:'rgba(255,255,255,0.4)',lineHeight:1.6}}>A selection of recent projects{loc?` in ${loc}`:''} and surrounding areas.</p></Reveal>
        </div></section>
        <section style={{padding:'0 clamp(16px,4vw,48px) clamp(60px,8vw,100px)'}}>
          <div style={{maxWidth:1200,margin:'0 auto'}}>
            {photos.length>0?(
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {photos.slice(0,8).map((p,i)=>(<Reveal key={i} delay={i*80}><div className="overflow-hidden cursor-pointer relative group" onClick={()=>setLb(i)}>
                  <img src={p} alt="" className="w-full object-cover obsidian-zoom" style={{aspectRatio:i===0?'16/10':'4/3',display:'block'}} loading={i>1?'lazy':undefined} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
                  <div className="absolute inset-0 flex items-end p-5 opacity-0 group-hover:opacity-100 transition-opacity" style={{background:'linear-gradient(to top,rgba(0,0,0,.7),transparent)'}}>
                    <p style={{fontFamily:mono,fontSize:11,color:A,letterSpacing:'0.15em'}}>PROJECT {String(i+1).padStart(2,'0')}</p>
                  </div>
                </div></Reveal>))}
              </div>
            ):(
              <div className="text-center py-20"><Camera size={40} style={{color:'rgba(255,255,255,0.15)',margin:'0 auto 16px'}}/><h3 className="text-xl font-bold mb-3">Portfolio Coming Soon</h3><p className="text-sm mb-8" style={{color:'rgba(255,255,255,0.3)'}}>Contact us to see examples of our work.</p><button onClick={()=>{onCTAClick();go('contact')}} className="obsidian-bp">Request Examples <ArrowRight size={14}/></button></div>
            )}
          </div>
        </section>
        <section className="text-center" style={{padding:'clamp(40px,6vw,80px) clamp(16px,4vw,48px)',background:'#0f0f0f',borderTop:'1px solid rgba(255,255,255,0.04)'}}>
          <Reveal><h2 style={{fontFamily:serif,fontSize:'clamp(24px,3vw,36px)',fontWeight:800,marginBottom:32}}>Like what you see?</h2>
          <button onClick={()=>{onCTAClick();go('contact')}} className="obsidian-bp">Discuss Your Project <ArrowRight size={14}/></button></Reveal>
        </section>
      </div>

      {/* ═══════════════ CONTACT PAGE ═══════════════ */}
      <div data-page="contact" style={{display:page==='contact'?'block':'none'}}>
        <section style={{padding:'140px clamp(16px,4vw,48px) 0'}}><div style={{maxWidth:1200,margin:'0 auto'}}>
          <Reveal><p style={{fontFamily:mono,fontSize:11,color:A,letterSpacing:'0.2em',textTransform:'uppercase',marginBottom:12}}>Contact</p></Reveal>
          <Reveal delay={100}><h1 style={{fontFamily:serif,fontSize:'clamp(40px,6vw,72px)',fontWeight:800,letterSpacing:'-0.03em',lineHeight:.95,marginBottom:24}}>Let's talk<span style={{color:A}}>.</span></h1></Reveal>
        </div></section>
        <section style={{padding:'clamp(40px,6vw,80px) clamp(16px,4vw,48px)'}}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16" style={{maxWidth:1200,margin:'0 auto'}}>
            <Reveal><div>
              <div className="mb-12">
                {[lead.phone&&[<Phone size={20} key="p"/>,fmt(lead.phone),'Call or text 24/7'],lead.email&&[<Mail size={20} key="e"/>,lead.email,'We respond same-day'],lead.enrichedAddress&&[<MapPin size={20} key="m"/>,lead.enrichedAddress,loc]].filter(Boolean).map((item,i)=>{
                  const [icon,main,sub]=item as [React.ReactNode,string,string]
                  return(<div key={i} className="flex gap-5 mb-7"><div className="w-12 h-12 flex items-center justify-center flex-shrink-0" style={{background:'#161616',border:'1px solid rgba(255,255,255,0.05)',color:A}}>{icon}</div><div><p className="font-bold text-base">{main}</p><p className="text-[13px] mt-0.5" style={{color:'rgba(255,255,255,0.3)'}}>{sub}</p></div></div>)
                })}
              </div>
              {wc?.serviceAreaText&&<Reveal delay={100}><div style={{background:'#161616',border:'1px solid rgba(255,255,255,0.05)',padding:24,marginBottom:32}}>
                <p style={{fontFamily:mono,fontSize:10,color:A,letterSpacing:'0.2em',textTransform:'uppercase',marginBottom:8}}>Service Area</p>
                <p className="text-sm leading-relaxed" style={{color:'rgba(255,255,255,0.4)'}}>{wc.serviceAreaText}</p>
              </div></Reveal>}
              <div><p style={{fontFamily:mono,fontSize:11,color:A,letterSpacing:'0.2em',textTransform:'uppercase',marginBottom:20}}>FAQ</p>
              {faqs.map((f,i)=>(<div key={i} style={{borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                <button onClick={()=>setOpenFAQ(openFAQ===i?null:i)} className="w-full flex justify-between items-center text-left" style={{background:'none',border:'none',cursor:'pointer',color:'#fff',padding:'18px 0'}}>
                  <span className="text-sm font-semibold pr-5">{f.q}</span><span style={{color:openFAQ===i?A:'rgba(255,255,255,0.3)'}}>{openFAQ===i?<Minus size={14}/>:<Plus size={14}/>}</span>
                </button>
                <div style={{maxHeight:openFAQ===i?200:0,opacity:openFAQ===i?1:0,overflow:'hidden',transition:'all .3s'}}><p className="text-sm leading-relaxed pb-4" style={{color:'rgba(255,255,255,0.4)'}}>{f.a}</p></div>
              </div>))}</div>
            </div></Reveal>
            <Reveal delay={150}><div style={{background:'#161616',border:'1px solid rgba(255,255,255,0.05)',padding:40}}>
              <h3 className="text-[22px] font-bold mb-1">Request an Estimate</h3>
              <p className="text-[13px] mb-7" style={{color:'rgba(255,255,255,0.3)'}}>Free. No obligation. We respond fast.</p>
              {['Full Name','Phone','Email'].map(l=>(<input key={l} placeholder={l} className="w-full text-sm text-white mb-3 outline-none" style={{padding:'14px 16px',background:'#0f0f0f',border:'1px solid rgba(255,255,255,0.08)',fontFamily:sans,boxSizing:'border-box'}}/>))}
              {svc.length>0&&<select className="w-full text-sm mb-3" style={{padding:'14px 16px',background:'#0f0f0f',border:'1px solid rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.4)',fontFamily:sans,boxSizing:'border-box'}}><option>Select service</option>{svc.map(s=><option key={s}>{s}</option>)}</select>}
              <textarea placeholder="Project details..." rows={4} className="w-full text-sm text-white mb-5 outline-none resize-none" style={{padding:'14px 16px',background:'#0f0f0f',border:'1px solid rgba(255,255,255,0.08)',fontFamily:sans,boxSizing:'border-box'}}/>
              <button onClick={onCTAClick} className="obsidian-bp w-full justify-center" style={{padding:16,fontSize:14}}>Submit Request <ArrowRight size={14}/></button>
            </div></Reveal>
          </div>
        </section>
      </div>

      {/* ── FOOTER ── */}
      <footer style={{background:'#060606',borderTop:'1px solid rgba(255,255,255,0.04)',padding:'clamp(48px,6vw,80px) clamp(16px,4vw,48px)'}}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12" style={{maxWidth:1200,margin:'0 auto'}}>
          <div><div className="flex items-center gap-3 mb-4">{lead.logo?<img src={lead.logo} alt="" className="h-6 w-6 object-cover"/>:<div className="w-2.5 h-2.5 rounded-full" style={{background:A}}/>}<span className="font-extrabold text-lg">{lead.companyName}</span></div>
          <p className="text-sm leading-relaxed" style={{color:'rgba(255,255,255,0.25)',maxWidth:320}}>Professional {indLabel}{loc?` in ${loc}`:''}.  Licensed, insured, 24/7.</p></div>
          <div><p style={{fontFamily:mono,fontSize:10,color:'rgba(255,255,255,0.25)',letterSpacing:'0.2em',textTransform:'uppercase',marginBottom:16}}>Navigation</p>
          <div className="flex flex-col gap-2.5">{PAGES.map(p=><button key={p.k} onClick={()=>go(p.k)} className="text-sm font-medium text-left p-0" style={{background:'none',border:'none',color:'rgba(255,255,255,0.35)',cursor:'pointer'}}>{p.l}</button>)}</div></div>
          <div><p style={{fontFamily:mono,fontSize:10,color:'rgba(255,255,255,0.25)',letterSpacing:'0.2em',textTransform:'uppercase',marginBottom:16}}>Contact</p>
          <div className="flex flex-col gap-3 text-sm" style={{color:'rgba(255,255,255,0.35)'}}>
            {lead.phone&&<a href={`tel:${lead.phone}`} onClick={onCallClick} style={{textDecoration:'none',color:'inherit'}}>{fmt(lead.phone)}</a>}
            {lead.email&&<a href={`mailto:${lead.email}`} style={{textDecoration:'none',color:'inherit'}}>{lead.email}</a>}
            {loc&&<span>{loc}</span>}
          </div></div>
        </div>
        <div className="flex flex-wrap justify-between items-center gap-4" style={{maxWidth:1200,margin:'0 auto',borderTop:'1px solid rgba(255,255,255,0.04)',paddingTop:32}}>
          <p className="text-xs" style={{color:'rgba(255,255,255,0.15)'}}>&copy; {new Date().getFullYear()} {lead.companyName}</p>
          <span className="text-[10px]" style={{color:'rgba(255,255,255,0.1)'}}>Powered by <a href="https://brightautomations.com" target="_blank" rel="noopener noreferrer" style={{color:'rgba(255,255,255,0.25)'}}>Bright Automations</a></span>
        </div>
      </footer>

      {/* ── LIGHTBOX with prev/next ── */}
      {lb!==null&&photos[lb]&&(<div className="fixed inset-0 z-[200] flex items-center justify-center p-5" style={{background:'rgba(0,0,0,.95)'}} onClick={()=>setLb(null)}>
        <img src={photos[lb]} alt="" style={{maxWidth:'85%',maxHeight:'80vh',objectFit:'contain'}}/>
        <button className="absolute top-6 right-6 flex items-center justify-center" style={{background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',color:'#fff',width:48,height:48,cursor:'pointer'}} onClick={e=>{e.stopPropagation();setLb(null)}}><X size={20}/></button>
        {lb>0&&<button className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center" style={{background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',color:'#fff',width:48,height:48,cursor:'pointer'}} onClick={e=>{e.stopPropagation();setLb(lb-1)}}><ChevronLeft size={24}/></button>}
        {lb<photos.length-1&&<button className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center" style={{background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',color:'#fff',width:48,height:48,cursor:'pointer'}} onClick={e=>{e.stopPropagation();setLb(lb+1)}}><ChevronRight size={24}/></button>}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2" style={{fontFamily:mono,fontSize:11,color:'rgba(255,255,255,0.4)'}}>{lb+1} / {photos.length}</div>
      </div>)}

      <ChatWidget name={lead.companyName} accent={A}/>
      <div className="h-16 sm:h-0"/>
    </div>
  )
}
