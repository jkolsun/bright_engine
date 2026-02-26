'use client'
/*
 * CARBON TEMPLATE — Bold-B Industrial
 * Pure black, diagonal cuts, accent glow, condensed all-caps, mechanical snap animations
 * data-page wrapper divs for snapshot delivery
 */

import { useState, useEffect, useRef } from 'react'
import { Phone, MapPin, Star, CheckCircle, ArrowRight, Mail, Camera, MessageCircle, X, Send, Menu, Minus, Plus, Quote, ChevronLeft, ChevronRight } from 'lucide-react'
import type { TemplateProps } from '../config/template-types'
import DisclaimerBanner from '../shared/DisclaimerBanner'

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
  return m[config.accentColor] || '#ff3d00'
}

function Counter({ end, suffix='', dur=1200 }: { end: number; suffix?: string; dur?: number }) {
  const [v, setV] = useState(0); const ref = useRef<HTMLSpanElement>(null); const go = useRef(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !go.current) { go.current = true; const s = performance.now()
        const f = (n: number) => { const p = Math.min((n-s)/dur,1); setV(Math.floor(p*end*10)/10); if(p<1) requestAnimationFrame(f); else setV(end) }
        requestAnimationFrame(f)
      }
    }, { threshold: 0.3 }); obs.observe(el); return () => obs.disconnect()
  }, [end, dur])
  return <span ref={ref}>{Number.isInteger(v)?v:v.toFixed(1)}{suffix}</span>
}

function Reveal({ children, delay=0, x=-40, className='' }: { children: React.ReactNode; delay?: number; x?: number; className?: string }) {
  const [vis, setVis] = useState(false); const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => { if(e.isIntersecting){setVis(true);obs.disconnect()} }, { threshold:0.08 })
    obs.observe(el); return () => obs.disconnect()
  }, [])
  return <div ref={ref} className={className} style={{ opacity:vis?1:0, transform:vis?'translate(0)':`translateX(${x}px)`, transition:`opacity 0.5s cubic-bezier(0.77,0,0.175,1) ${delay}ms, transform 0.5s cubic-bezier(0.77,0,0.175,1) ${delay}ms` }}>{children}</div>
}

function ChatWidget({ name, accent }: { name: string; accent: string }) {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<{from:string;text:string}[]>([])
  const [input, setInput] = useState(''); const [typing, setTyping] = useState(false)
  const endRef = useRef<HTMLDivElement>(null); const inRef = useRef<HTMLInputElement>(null)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }) }, [msgs])
  useEffect(() => {
    if(open && msgs.length===0){ setTyping(true); const t=setTimeout(()=>{setMsgs([{from:'bot',text:`${name} here. How can we help?`}]);setTyping(false)},600); return()=>clearTimeout(t) }
    if(open) setTimeout(()=>inRef.current?.focus(),100)
  }, [open,name])
  const send = (t?:string) => {
    const m=t||input.trim(); if(!m) return; setMsgs(p=>[...p,{from:'user',text:m}]); setInput(''); setTyping(true)
    setTimeout(()=>{
      let r="We'll get back to you ASAP. Call for the fastest response."
      if(m.toLowerCase().includes('estimat')||m.toLowerCase().includes('quot')) r="Free estimates — share details or call us directly."
      else if(m.toLowerCase().includes('servic')) r="Check our Services page, or tell me what you need."
      else if(m.toLowerCase().includes('hour')||m.toLowerCase().includes('emergency')) r="24/7 emergency response. Call us now."
      setMsgs(p=>[...p,{from:'bot',text:r}]); setTyping(false)
    },900)
  }
  return (<>
    <button onClick={()=>setOpen(!open)} className="fixed bottom-6 right-5 z-[100] sm:bottom-6 bottom-20" aria-label="Chat">
      <div className="w-14 h-14 flex items-center justify-center shadow-xl" style={{background:accent,color:'#000',clipPath:'polygon(0 0,100% 0,100% 70%,70% 100%,0 100%)'}}>{open?<X size={22}/>:<MessageCircle size={22}/>}</div>
    </button>
    {open&&(<div className="fixed sm:bottom-24 bottom-28 right-5 z-[100] w-[370px] max-w-[calc(100vw-2.5rem)] bg-black shadow-2xl border border-white/10 overflow-hidden">
      <div className="px-5 py-4" style={{background:accent,color:'#000'}}>
        <p className="font-bold text-sm uppercase tracking-wider">{name}</p>
        <p className="text-[10px] opacity-40 mt-0.5 tracking-widest uppercase">AI Assistant</p>
      </div>
      <div className="h-[260px] overflow-y-auto px-4 py-4 space-y-3">
        {msgs.map((m,i)=>(<div key={i} className={`flex ${m.from==='user'?'justify-end':'justify-start'}`}><div className={`max-w-[80%] px-4 py-2.5 text-sm leading-relaxed ${m.from==='user'?'text-black':'bg-white/5 text-white/70 border border-white/5'}`} style={m.from==='user'?{background:accent}:{}}>{m.text}</div></div>))}
        {typing&&<div className="flex justify-start"><div className="bg-white/5 px-4 py-3 border border-white/5"><div className="flex gap-1">{[0,150,300].map(d=><span key={d} className="w-2 h-2 bg-white/30 animate-bounce" style={{animationDelay:`${d}ms`}}/>)}</div></div></div>}
        <div ref={endRef}/>
      </div>
      <div className="px-4 py-3 border-t border-white/5"><div className="flex gap-2">
        <input ref={inRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Type a message..." className="flex-1 text-sm px-4 py-2.5 bg-white/5 border border-white/10 text-white focus:outline-none placeholder:text-white/20"/>
        <button onClick={()=>send()} disabled={!input.trim()} className="w-10 h-10 flex items-center justify-center text-black disabled:opacity-30" style={{background:accent}}><Send size={15}/></button>
      </div></div>
    </div>)}
  </>)
}

export default function BoldBTemplate({ lead, config, onCTAClick, onCallClick, websiteCopy: wc }: TemplateProps) {
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

  const svcData = svc.map((n,i) => ({ name:n, desc: wc?.serviceDescriptions?.[n] || `Professional ${n.toLowerCase()} services.`, img: photos[i % photos.length] }))
  const testis = [
    { text: wc?.testimonialQuote || `Called ${lead.companyName} at midnight — crew was here in two hours. Absolute lifesavers.`, name: wc?.testimonialAuthor || 'Mike T.', loc: lead.city||'Local' },
    ...(wc?.additionalTestimonials?.map(t=>({text:t.quote,name:t.author,loc:lead.city||'Local'})) || [
      { text:"Other companies gave us the runaround. These guys showed up, diagnosed it fast, fixed it right.", name:'Sarah L.', loc:lead.city||'Local' },
      { text:"Professional operation start to finish. Fair price, no surprises, handled the insurance too.", name:'James W.', loc:lead.city||'Local' },
    ])
  ]
  const steps = wc?.processSteps || [
    { title:'Contact Us', description:'Call or submit a request — we respond within minutes.' },
    { title:'Assessment', description:'On-site evaluation with transparent, upfront pricing.' },
    { title:'Execute', description:'Our certified crew delivers precision work on schedule.' },
    { title:'Final Review', description:'Walkthrough, cleanup, and your 100% satisfaction guarantee.' },
  ]
  const whyUs = wc?.whyChooseUs || wc?.valueProps || [
    { title:'Licensed & Insured', description:'Full coverage and credentials you can verify.' },
    { title:'24/7 Emergency', description:'Live answer any hour. Average 2-hour response.' },
    { title:'Transparent Pricing', description:'Written estimates before work begins. No surprises.' },
    { title:'Satisfaction Guaranteed', description:'We are not done until you say we are done.' },
  ]
  const brands = wc?.brandNames || []
  const faqs = [
    { q:'How fast can you respond?', a:'Emergency: 1-2 hours. Standard projects start within the week.' },
    { q:'Do you handle insurance claims?', a:'Yes. Direct billing with all major providers.' },
    { q:'What areas do you serve?', a:`We cover ${loc||'your area'} and surrounding communities.` },
    { q:'Are you licensed and insured?', a:'Fully licensed, bonded, and insured. Always.' },
    { q:'Do you offer free estimates?', a:'Absolutely. No-obligation quotes for every project.' },
  ]
  const PAGES = [{k:'home' as const,l:'HOME'},{k:'services' as const,l:'SERVICES'},{k:'about' as const,l:'ABOUT'},{k:'work' as const,l:'WORK'},{k:'contact' as const,l:'CONTACT'}]

  const head = "'Bebas Neue','Impact',sans-serif"
  const body = "'Barlow','Helvetica Neue',sans-serif"
  const mono = "'Share Tech Mono','Courier New',monospace"

  return (
    <div className="preview-template min-h-screen antialiased" style={{fontFamily:body,background:'#000',color:'#fff',overflowX:'hidden'}}>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;500;600;700;800&family=Share+Tech+Mono&display=swap');
        @keyframes carbon-slideLeft{from{opacity:0;transform:translateX(-30px)}to{opacity:1;transform:translateX(0)}}
        .carbon-glow{transition:box-shadow .4s ease,transform .4s ease}.carbon-glow:hover{box-shadow:0 0 30px ${A}33;transform:translateY(-4px)}
        .carbon-btn{display:inline-flex;align-items:center;gap:10px;background:${A};color:#000;padding:16px 36px;font-weight:700;font-size:14px;letter-spacing:.12em;text-transform:uppercase;text-decoration:none;border:none;cursor:pointer;transition:all .3s;font-family:${body};clip-path:polygon(0 0,100% 0,100% 70%,92% 100%,0 100%)}
        .carbon-btn:hover{filter:brightness(1.15);transform:translateY(-2px)}
        .carbon-btn-o{display:inline-flex;align-items:center;gap:10px;background:transparent;color:#fff;padding:16px 36px;border:1.5px solid rgba(255,255,255,.15);font-weight:700;font-size:14px;letter-spacing:.12em;text-transform:uppercase;text-decoration:none;cursor:pointer;transition:all .3s;font-family:${body}}
        .carbon-btn-o:hover{border-color:${A};color:${A}}
        .carbon-clip-img{clip-path:polygon(0 0,100% 0,100% 85%,92% 100%,0 100%);transition:box-shadow .4s ease}.carbon-clip-img:hover{box-shadow:0 0 24px ${A}40}
        ::selection{background:${A};color:#000}
      ` }} />

      <DisclaimerBanner variant="bold-b" companyName={lead.companyName}/>

      {/* NAV */}
      <nav style={{position:'fixed',top:0,left:0,right:0,zIndex:50,background:navSolid?'rgba(0,0,0,0.95)':'transparent',backdropFilter:navSolid?'blur(16px)':'none',borderBottom:navSolid?`1px solid ${A}15`:'none',transition:'all .3s',padding:'0 clamp(16px,4vw,48px)'}}>
        <div style={{maxWidth:1440,margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'space-between',height:navSolid?60:76,transition:'height .3s'}}>
          <button onClick={()=>go('home')} className="flex items-center gap-3" style={{background:'none',border:'none',cursor:'pointer'}}>
            {lead.logo?<img src={lead.logo} alt="" className="h-8 w-8 object-cover"/>:<div style={{width:12,height:12,background:A,clipPath:'polygon(50% 0%,100% 50%,50% 100%,0% 50%)'}}/>}
            <span className="font-extrabold text-white" style={{fontFamily:head,fontSize:22,letterSpacing:'0.05em'}}>{lead.companyName}</span>
          </button>
          <div className="hidden lg:flex items-center gap-10">{PAGES.map(p=>(
            <button key={p.k} onClick={()=>go(p.k)} className="relative py-1 text-[12px] font-bold bg-transparent border-none cursor-pointer transition-colors" style={{fontFamily:mono,color:page===p.k?A:'rgba(255,255,255,0.35)',letterSpacing:'0.15em'}}>
              {p.l}
            </button>
          ))}</div>
          <div className="flex items-center gap-4">
            {lead.phone&&<a href={`tel:${lead.phone}`} onClick={onCallClick} className="hidden lg:flex items-center gap-2 text-[12px] font-semibold" style={{fontFamily:mono,color:'rgba(255,255,255,0.35)',textDecoration:'none',letterSpacing:'0.05em'}}><Phone size={13}/>{fmt(lead.phone)}</a>}
            <button onClick={()=>{onCTAClick();go('contact')}} className="carbon-btn hidden sm:inline-flex" style={{padding:'10px 22px',fontSize:11}}>Get Estimate</button>
            <button onClick={()=>setMobNav(!mobNav)} className="lg:hidden flex items-center justify-center" style={{background:'rgba(255,255,255,0.06)',border:`1px solid rgba(255,255,255,0.1)`,width:44,height:44,cursor:'pointer',color:'#fff'}} aria-label="Menu">{mobNav?<X size={22}/>:<Menu size={22}/>}</button>
          </div>
        </div>
      </nav>

      {/* MOBILE NAV — fullscreen overlay with diagonal accent stripe */}
      {mobNav&&(<div className="fixed inset-0 z-[90] flex flex-col justify-center items-center gap-8" style={{background:'rgba(0,0,0,0.98)'}}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none"><div style={{position:'absolute',top:'-20%',right:'-10%',width:'50%',height:'140%',background:A,opacity:0.04,transform:'rotate(-15deg)'}}/></div>
        <button onClick={()=>setMobNav(false)} className="absolute top-5 right-5 z-10 flex items-center justify-center" style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',width:44,height:44,cursor:'pointer',color:'#fff'}}><X size={22}/></button>
        {PAGES.map((p,i)=>(<button key={p.k} onClick={()=>go(p.k)} className="relative z-10" style={{fontFamily:head,fontSize:48,background:'none',border:'none',color:page===p.k?A:'#fff',cursor:'pointer',letterSpacing:'0.08em',opacity:0,animation:`carbon-slideLeft .4s ease ${i*60}ms forwards`}}>{p.l}</button>))}
        {lead.phone&&<a href={`tel:${lead.phone}`} onClick={onCallClick} className="carbon-btn relative z-10 mt-4"><Phone size={16}/>{fmt(lead.phone)}</a>}
      </div>)}

      {/* ═══ HOME ═══ */}
      <div data-page="home" style={{display:page==='home'?'block':'none'}}>
        {/* HERO — diagonal split */}
        <section className="relative overflow-hidden" style={{minHeight:'100vh',display:'flex',alignItems:'center'}}>
          <div className="absolute inset-0" style={{background:'#000'}}/>
          {photos[0]&&<div className="absolute inset-0" style={{backgroundImage:`url(${photos[0]})`,backgroundSize:'cover',backgroundPosition:'center',clipPath:'polygon(45% 0,100% 0,100% 100%,25% 100%)',opacity:0.7}}/>}
          <div className="absolute inset-0" style={{background:'linear-gradient(90deg,#000 35%,transparent 70%)'}}/>
          <div className="relative w-full" style={{maxWidth:1440,margin:'0 auto',padding:'120px clamp(16px,4vw,48px) clamp(60px,8vh,100px)'}}>
            <Reveal x={-50}><p style={{fontFamily:mono,fontSize:12,color:A,letterSpacing:'0.25em',textTransform:'uppercase',marginBottom:24}}>{loc||'24/7 Emergency'} &mdash; Licensed &amp; Insured</p></Reveal>
            <Reveal delay={100} x={-60}><h1 style={{fontFamily:head,fontSize:'clamp(56px,10vw,140px)',fontWeight:400,lineHeight:0.95,letterSpacing:'0.02em',marginBottom:32,maxWidth:800,textTransform:'uppercase'}}>{wc?.heroHeadline||config.tagline||`Trusted ${indLabel}`}</h1></Reveal>
            {wc?.heroSubheadline&&<Reveal delay={200} x={-40}><p style={{fontSize:18,color:'rgba(255,255,255,0.5)',maxWidth:480,lineHeight:1.7,marginBottom:48}}>{wc.heroSubheadline}</p></Reveal>}
            <Reveal delay={300} x={-30}><div className="flex flex-wrap gap-4">
              <button onClick={()=>{onCTAClick();go('contact')}} className="carbon-btn"><ArrowRight size={16}/>{config.ctaText||'Get Estimate'}</button>
              {lead.phone&&<a href={`tel:${lead.phone}`} onClick={onCallClick} className="carbon-btn-o"><Phone size={16}/>Call Now</a>}
            </div></Reveal>
            {hasR&&<Reveal delay={400} x={-20}><div className="flex items-center gap-6 mt-12">
              <div className="flex items-center gap-2"><div className="flex gap-0.5">{Array.from({length:5},(_,i)=><Star key={i} size={14} className="fill-current" style={{color:A}}/>)}</div><span className="text-sm font-bold">{lead.enrichedRating}</span></div>
              {lead.enrichedReviews&&<span style={{fontFamily:mono,fontSize:12,color:'rgba(255,255,255,0.3)',letterSpacing:'0.15em'}}>{lead.enrichedReviews}+ VERIFIED</span>}
            </div></Reveal>}
          </div>
        </section>

        {/* STATS BAR */}
        <div style={{height:4,background:A}}/>
        <section style={{padding:'clamp(48px,6vw,80px) clamp(16px,4vw,48px)',background:'#080808'}}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8" style={{maxWidth:1200,margin:'0 auto'}}>
            {[{v:hasR?Number(lead.enrichedRating):5.0,s:'',l:'RATING',d:lead.enrichedReviews?`${lead.enrichedReviews}+ reviews`:'Verified'},{v:2,s:'HR',l:'RESPONSE',d:'Emergency avg.'},{v:10,s:'+',l:'YEARS',d:loc||'Serving you'},{v:100,s:'%',l:'SATISFACTION',d:'Guaranteed'}].map((st,i)=>(
              <Reveal key={i} delay={i*80} x={-30}><div className="text-center">
                <p style={{fontFamily:head,fontSize:'clamp(48px,7vw,80px)',lineHeight:1,letterSpacing:'0.02em'}}><Counter end={st.v} suffix={st.s}/></p>
                <p style={{fontFamily:mono,fontSize:11,color:A,letterSpacing:'0.2em',marginTop:8}}>{st.l}</p>
                <p className="text-xs mt-1" style={{color:'rgba(255,255,255,0.25)'}}>{st.d}</p>
              </div></Reveal>
            ))}
          </div>
        </section>

        {/* SERVICES PREVIEW */}
        {svc.length>0&&(<section style={{clipPath:'polygon(0 0,100% 3vw,100% 100%,0 100%)',marginTop:'-3vw',paddingTop:'calc(3vw + clamp(48px,6vw,80px))',paddingBottom:'clamp(48px,6vw,80px)',paddingLeft:'clamp(16px,4vw,48px)',paddingRight:'clamp(16px,4vw,48px)',background:'#0a0a0a'}}>
          <div style={{maxWidth:1200,margin:'0 auto'}}>
            <Reveal><div className="flex flex-wrap justify-between items-end gap-4 mb-12">
              <div><p style={{fontFamily:mono,fontSize:11,color:A,letterSpacing:'0.25em',marginBottom:8}}>SERVICES</p>
              <h2 style={{fontFamily:head,fontSize:'clamp(36px,5vw,64px)',lineHeight:1,letterSpacing:'0.02em',textTransform:'uppercase'}}>What We Do</h2></div>
              <button onClick={()=>go('services')} className="carbon-btn-o" style={{padding:'10px 24px',fontSize:11}}>All Services <ArrowRight size={14}/></button>
            </div></Reveal>
            {svcData.slice(0,5).map((s,i)=>(
              <Reveal key={i} delay={i*60} x={-30}><div onClick={()=>go('services')} className="carbon-glow cursor-pointer flex items-start gap-6 border-b border-white/5 py-7 group" style={{paddingLeft:16}}>
                <span style={{fontFamily:mono,fontSize:13,color:'rgba(255,255,255,0.15)',letterSpacing:'0.1em',minWidth:36}}>{String(i+1).padStart(2,'0')}</span>
                <div className="flex-1"><h3 className="text-xl font-bold mb-1.5 group-hover:text-white transition-colors" style={{color:'rgba(255,255,255,0.85)'}}>{s.name}</h3>
                <p className="text-sm leading-relaxed" style={{color:'rgba(255,255,255,0.35)'}}>{s.desc}</p></div>
                <ArrowRight size={18} className="mt-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{color:A}}/>
              </div></Reveal>
            ))}
          </div>
        </section>)}

        {/* PHOTO BREAK */}
        {photos[1]&&<Reveal x={0}><section className="relative overflow-hidden" style={{height:'50vh',minHeight:350,clipPath:'polygon(0 4vw,100% 0,100% calc(100% - 4vw),0 100%)'}}>
          <div className="absolute inset-0" style={{backgroundImage:`url(${photos[1]})`,backgroundSize:'cover',backgroundPosition:'center'}}/>
          <div className="absolute inset-0" style={{background:'rgba(0,0,0,0.5)'}}/>
          <div className="relative h-full flex items-center justify-center text-center p-6">
            <p style={{fontFamily:head,fontSize:'clamp(28px,5vw,56px)',lineHeight:1.1,letterSpacing:'0.03em',textTransform:'uppercase',maxWidth:700}}>{wc?.closingHeadline||`${loc||'Your community'} trusts ${lead.companyName}`}</p>
          </div>
        </section></Reveal>}

        {/* ABOUT PREVIEW */}
        <section style={{padding:'clamp(60px,8vw,100px) clamp(16px,4vw,48px)',background:'#050505'}}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16" style={{maxWidth:1200,margin:'0 auto'}}>
            <Reveal><div>
              <p style={{fontFamily:mono,fontSize:11,color:A,letterSpacing:'0.25em',marginBottom:8}}>ABOUT</p>
              <h2 style={{fontFamily:head,fontSize:'clamp(32px,4vw,56px)',lineHeight:1,letterSpacing:'0.02em',textTransform:'uppercase',marginBottom:24}}>{loc?`${loc}'s`:''} Most Trusted {indLabel} Team</h2>
              <p className="text-[15px] leading-relaxed mb-8" style={{color:'rgba(255,255,255,0.4)'}}>{wc?.aboutParagraph1||`${lead.companyName} delivers expert ${indLabel}${loc?` in ${loc}`:''}.${lead.enrichedReviews?` ${lead.enrichedReviews} five-star reviews.`:''}`}</p>
              <div className="flex flex-wrap gap-3">
                {whyUs.slice(0,3).map((vp,i)=>(
                  <span key={i} className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase" style={{fontFamily:mono,letterSpacing:'0.1em',border:`1px solid ${A}30`,color:'rgba(255,255,255,0.6)'}}><CheckCircle size={12} style={{color:A}}/>{vp.title}</span>
                ))}
              </div>
              <button onClick={()=>go('about')} className="mt-8 flex items-center gap-2 text-[13px] font-bold uppercase" style={{background:'none',border:'none',color:A,cursor:'pointer',letterSpacing:'0.12em',fontFamily:mono}}>Our Story <ArrowRight size={14}/></button>
            </div></Reveal>
            {photos[2]&&<Reveal delay={150} x={40}><div className="overflow-hidden relative carbon-clip-img" style={{minHeight:300}}>
              <img src={photos[2]} alt="" className="w-full h-full object-cover" style={{display:'block',clipPath:'polygon(0 0,100% 0,100% 85%,92% 100%,0 100%)'}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
            </div></Reveal>}
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section style={{padding:'clamp(60px,8vw,100px) clamp(16px,4vw,48px)',background:'#0a0a0a',borderTop:'1px solid rgba(255,255,255,0.04)'}}>
          <div style={{maxWidth:1200,margin:'0 auto'}}>
            <Reveal><p style={{fontFamily:mono,fontSize:11,color:A,letterSpacing:'0.25em',marginBottom:8}}>TESTIMONIALS</p>
            <h2 style={{fontFamily:head,fontSize:'clamp(32px,4vw,56px)',lineHeight:1,letterSpacing:'0.02em',textTransform:'uppercase',marginBottom:48}}>Real Results</h2></Reveal>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{testis.slice(0,3).map((t,i)=>(
              <Reveal key={i} delay={i*100} x={-30}><div className="carbon-glow" style={{background:'#111',border:'1px solid rgba(255,255,255,0.05)',padding:32}}>
                <Quote size={32} style={{color:A,opacity:0.12,marginBottom:8}}/>
                <p className="text-[15px] leading-relaxed mb-6" style={{color:'rgba(255,255,255,0.6)'}}>"{t.text}"</p>
                <div className="flex items-center gap-3"><div className="w-10 h-10 flex items-center justify-center font-bold text-sm" style={{background:A,color:'#000',clipPath:'polygon(0 0,100% 0,100% 70%,70% 100%,0 100%)'}}>{t.name[0]}</div>
                <div><p className="font-bold text-sm">{t.name}</p><p style={{fontFamily:mono,fontSize:11,color:'rgba(255,255,255,0.25)'}}>{t.loc}</p></div></div>
              </div></Reveal>
            ))}</div>
          </div>
        </section>

        {/* PORTFOLIO PREVIEW */}
        {photos.length>2&&(<section style={{padding:'clamp(60px,8vw,100px) clamp(16px,4vw,48px)',background:'#050505'}}>
          <div style={{maxWidth:1440,margin:'0 auto'}}>
            <Reveal><div className="flex flex-wrap justify-between items-end gap-4 mb-10">
              <div><p style={{fontFamily:mono,fontSize:11,color:A,letterSpacing:'0.25em',marginBottom:8}}>PORTFOLIO</p>
              <h2 style={{fontFamily:head,fontSize:'clamp(32px,4vw,56px)',lineHeight:1,letterSpacing:'0.02em',textTransform:'uppercase'}}>Our Work</h2></div>
              <button onClick={()=>go('work')} className="carbon-btn-o" style={{padding:'10px 24px',fontSize:11}}>View All <ArrowRight size={14}/></button>
            </div></Reveal>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {photos.slice(0,3).map((p,i)=>(<Reveal key={i} delay={i*80} x={-20}><div className="overflow-hidden cursor-pointer carbon-glow" onClick={()=>setLb(i)}><img src={p} alt="" className="w-full object-cover transition-transform duration-500 hover:scale-105" style={{aspectRatio:i===0?'16/10':'1',display:'block'}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/></div></Reveal>))}
            </div>
          </div>
        </section>)}

        {/* CTA BAND */}
        <section className="relative overflow-hidden" style={{padding:'clamp(80px,10vw,140px) clamp(16px,4vw,48px)',background:A,clipPath:'polygon(0 0,100% 3vw,100% 100%,0 calc(100% - 3vw))'}}>
          <div className="absolute inset-0 opacity-[0.08]" style={{backgroundImage:'repeating-linear-gradient(135deg,transparent,transparent 30px,#000 30px,#000 31px)'}}/>
          <div className="relative text-center" style={{maxWidth:700,margin:'0 auto'}}>
            <h2 style={{fontFamily:head,fontSize:'clamp(40px,6vw,80px)',color:'#000',lineHeight:1,letterSpacing:'0.03em',textTransform:'uppercase',marginBottom:20}}>Don't Wait.<br/>Call Now.</h2>
            <p className="text-lg mb-10" style={{color:'rgba(0,0,0,0.5)'}}>Free assessment. We pick up 24/7.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <button onClick={()=>{onCTAClick();go('contact')}} style={{display:'inline-flex',alignItems:'center',gap:10,background:'#000',color:A,padding:'18px 40px',fontWeight:700,fontSize:15,letterSpacing:'.08em',textTransform:'uppercase',border:'none',cursor:'pointer',fontFamily:body}}>Get Estimate <ArrowRight size={16}/></button>
              {lead.phone&&<a href={`tel:${lead.phone}`} onClick={onCallClick} style={{display:'inline-flex',alignItems:'center',gap:10,border:'2px solid rgba(0,0,0,.2)',color:'#000',padding:'18px 40px',fontWeight:700,fontSize:15,letterSpacing:'.08em',textTransform:'uppercase',textDecoration:'none',fontFamily:body}}><Phone size={16}/>{fmt(lead.phone)}</a>}
            </div>
          </div>
        </section>
      </div>

      {/* ═══ SERVICES PAGE ═══ */}
      <div data-page="services" style={{display:page==='services'?'block':'none'}}>
        <section style={{padding:'160px clamp(16px,4vw,48px) 60px',background:'#000'}}><div style={{maxWidth:1200,margin:'0 auto'}}>
          <Reveal><p style={{fontFamily:mono,fontSize:11,color:A,letterSpacing:'0.25em',marginBottom:8}}>SERVICES</p></Reveal>
          <Reveal delay={80} x={-50}><h1 style={{fontFamily:head,fontSize:'clamp(44px,7vw,96px)',lineHeight:.95,letterSpacing:'0.02em',textTransform:'uppercase',marginBottom:20}}>What We Do</h1></Reveal>
          <Reveal delay={160}><p className="text-lg" style={{color:'rgba(255,255,255,0.4)',maxWidth:500}}>Comprehensive {indLabel}{loc?` in ${loc}`:''} and surrounding areas.</p></Reveal>
        </div></section>
        <div style={{height:4,background:A}}/>

        {/* Service cards with photos */}
        <section style={{padding:'clamp(48px,6vw,80px) clamp(16px,4vw,48px)',background:'#050505'}}>
          <div style={{maxWidth:1200,margin:'0 auto'}}>{svcData.map((s,i)=>(
            <Reveal key={i} delay={i*60} x={-30}><div className="carbon-glow flex flex-col md:flex-row gap-6 border-b border-white/5 py-10 cursor-pointer" onClick={()=>{onCTAClick();go('contact')}}>
              {s.img&&<div className="w-full md:w-48 h-40 md:h-36 flex-shrink-0 overflow-hidden carbon-clip-img">
                <img src={s.img} alt={s.name} className="w-full h-full object-cover" style={{display:'block',clipPath:'polygon(0 0,100% 0,100% 85%,92% 100%,0 100%)'}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
              </div>}
              <div className="flex-1 flex items-start gap-5">
                <span style={{fontFamily:mono,fontSize:14,color:'rgba(255,255,255,0.12)',letterSpacing:'0.1em',minWidth:40}}>{String(i+1).padStart(2,'0')}</span>
                <div className="flex-1"><h3 className="text-2xl font-bold mb-2">{s.name}</h3>
                <p className="text-[15px] leading-relaxed" style={{color:'rgba(255,255,255,0.35)'}}>{s.desc}</p></div>
              </div>
              <div className="flex items-center gap-2 self-center text-[12px] font-bold uppercase flex-shrink-0" style={{color:A,fontFamily:mono,letterSpacing:'0.1em'}}>Estimate <ArrowRight size={14}/></div>
            </div></Reveal>
          ))}</div>
        </section>

        {/* Process steps */}
        <section style={{padding:'clamp(60px,8vw,100px) clamp(16px,4vw,48px)',background:'#0a0a0a',clipPath:'polygon(0 0,100% 3vw,100% 100%,0 100%)',marginTop:'-3vw'}}>
          <div style={{maxWidth:1200,margin:'0 auto',paddingTop:'3vw'}}>
            <Reveal><p style={{fontFamily:mono,fontSize:11,color:A,letterSpacing:'0.25em',marginBottom:8}}>PROCESS</p>
            <h2 style={{fontFamily:head,fontSize:'clamp(32px,4vw,56px)',lineHeight:1,letterSpacing:'0.02em',textTransform:'uppercase',marginBottom:48}}>How We Work</h2></Reveal>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {steps.map((st,i)=>(
                <Reveal key={i} delay={i*100} x={-20}><div style={{background:'#111',border:'1px solid rgba(255,255,255,0.05)',padding:28}}>
                  <p style={{fontFamily:head,fontSize:56,lineHeight:1,color:A,opacity:0.15,marginBottom:8}}>{String(i+1).padStart(2,'0')}</p>
                  <h4 className="text-lg font-bold mb-2">{st.title}</h4>
                  <p className="text-sm leading-relaxed" style={{color:'rgba(255,255,255,0.35)'}}>{st.description}</p>
                </div></Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Services CTA */}
        <section className="relative overflow-hidden text-center" style={{padding:'clamp(80px,10vw,120px) clamp(16px,4vw,48px)',background:A,clipPath:'polygon(0 0,100% 3vw,100% 100%,0 100%)'}}>
          <div className="absolute inset-0 opacity-[0.08]" style={{backgroundImage:'repeating-linear-gradient(135deg,transparent,transparent 30px,#000 30px,#000 31px)'}}/>
          <div className="relative" style={{maxWidth:600,margin:'0 auto'}}><h2 style={{fontFamily:head,fontSize:'clamp(32px,5vw,56px)',color:'#000',letterSpacing:'0.03em',textTransform:'uppercase',marginBottom:32}}>Ready to Start?</h2>
          <div className="flex flex-wrap justify-center gap-4">
            <button onClick={()=>{onCTAClick();go('contact')}} style={{background:'#000',color:A,padding:'16px 36px',fontWeight:700,fontSize:14,letterSpacing:'.08em',textTransform:'uppercase',border:'none',cursor:'pointer',fontFamily:body}}>Get Estimate</button>
            {lead.phone&&<a href={`tel:${lead.phone}`} onClick={onCallClick} style={{border:'2px solid rgba(0,0,0,.2)',color:'#000',padding:'16px 36px',fontWeight:700,textDecoration:'none',display:'inline-flex',alignItems:'center',gap:10,fontFamily:body}}><Phone size={16}/>{fmt(lead.phone)}</a>}
          </div></div>
        </section>
      </div>

      {/* ═══ ABOUT PAGE ═══ */}
      <div data-page="about" style={{display:page==='about'?'block':'none'}}>
        {/* Header */}
        <section style={{padding:'160px clamp(16px,4vw,48px) 60px',background:'#000'}}><div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-end" style={{maxWidth:1200,margin:'0 auto'}}>
          <Reveal><div><p style={{fontFamily:mono,fontSize:11,color:A,letterSpacing:'0.25em',marginBottom:8}}>ABOUT</p><h1 style={{fontFamily:head,fontSize:'clamp(44px,6vw,80px)',lineHeight:.95,letterSpacing:'0.02em',textTransform:'uppercase'}}>Our Story</h1></div></Reveal>
          <Reveal delay={150}><p className="text-[17px] leading-relaxed" style={{color:'rgba(255,255,255,0.4)'}}>{wc?.aboutParagraph1||`${lead.companyName} delivers expert ${indLabel}${loc?` in ${loc}`:''}.`}</p></Reveal>
        </div></section>
        <div style={{height:4,background:A}}/>

        {/* Story + photos */}
        <section style={{padding:'clamp(48px,6vw,80px) clamp(16px,4vw,48px)',background:'#050505'}}><div style={{maxWidth:1200,margin:'0 auto'}}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
            <div>
              {photos[3]&&<Reveal><div className="overflow-hidden mb-8 carbon-clip-img" style={{clipPath:'polygon(0 0,100% 0,100% 85%,92% 100%,0 100%)'}}><img src={photos[3]} alt="" className="w-full object-cover" style={{height:340,display:'block'}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/></div></Reveal>}
              {wc?.aboutParagraph2&&<Reveal delay={80}><p className="text-base leading-relaxed" style={{color:'rgba(255,255,255,0.4)'}}>{wc.aboutParagraph2}</p></Reveal>}
            </div>
            {photos[4]&&<Reveal delay={120} x={40}><div className="overflow-hidden carbon-clip-img" style={{clipPath:'polygon(0 0,100% 0,100% 85%,92% 100%,0 100%)'}}><img src={photos[4]} alt="" className="w-full object-cover" style={{height:'100%',minHeight:300,display:'block'}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/></div></Reveal>}
          </div>

          {/* Why Choose Us */}
          <Reveal><p style={{fontFamily:mono,fontSize:11,color:A,letterSpacing:'0.25em',marginBottom:8}}>WHY CHOOSE US</p>
          <h2 style={{fontFamily:head,fontSize:'clamp(32px,4vw,48px)',lineHeight:1,letterSpacing:'0.02em',textTransform:'uppercase',marginBottom:36}}>The {lead.companyName} Difference</h2></Reveal>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">{whyUs.slice(0,4).map((vp,i)=>(
            <Reveal key={i} delay={i*80} x={-20}><div className="carbon-glow" style={{background:'#111',border:'1px solid rgba(255,255,255,0.05)',padding:28}}>
              <div className="w-2 h-2 mb-4" style={{background:A}}/><h4 className="text-lg font-bold mb-2">{vp.title}</h4><p className="text-sm leading-relaxed" style={{color:'rgba(255,255,255,0.35)'}}>{vp.description}</p>
            </div></Reveal>
          ))}</div>

          {/* Stats */}
          <Reveal><div className="flex flex-wrap gap-12 mb-16 py-10 border-t border-b border-white/5">
            <div><p style={{fontFamily:head,fontSize:56}}><Counter end={hasR?Number(lead.enrichedRating):5.0}/></p><p style={{fontFamily:mono,fontSize:11,color:A,letterSpacing:'0.2em',marginTop:4}}>RATING</p></div>
            {lead.enrichedReviews&&<div><p style={{fontFamily:head,fontSize:56}}><Counter end={lead.enrichedReviews} suffix="+"/></p><p style={{fontFamily:mono,fontSize:11,color:A,letterSpacing:'0.2em',marginTop:4}}>REVIEWS</p></div>}
            <div><p style={{fontFamily:head,fontSize:56}}><Counter end={100} suffix="%"/></p><p style={{fontFamily:mono,fontSize:11,color:A,letterSpacing:'0.2em',marginTop:4}}>SATISFACTION</p></div>
            <div><p style={{fontFamily:head,fontSize:56}}><Counter end={10} suffix="+"/></p><p style={{fontFamily:mono,fontSize:11,color:A,letterSpacing:'0.2em',marginTop:4}}>YEARS</p></div>
          </div></Reveal>

          {/* Testimonials */}
          <Reveal><p style={{fontFamily:mono,fontSize:11,color:A,letterSpacing:'0.25em',marginBottom:8}}>TESTIMONIALS</p>
          <h2 style={{fontFamily:head,fontSize:'clamp(32px,4vw,48px)',lineHeight:1,letterSpacing:'0.02em',textTransform:'uppercase',marginBottom:36}}>What Clients Say</h2></Reveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">{testis.slice(0,3).map((t,i)=>(
            <Reveal key={i} delay={i*100} x={-30}><div className="carbon-glow" style={{background:'#111',border:'1px solid rgba(255,255,255,0.05)',padding:28}}>
              <Quote size={28} style={{color:A,opacity:0.12,marginBottom:8}}/>
              <p className="text-[15px] leading-relaxed mb-5" style={{color:'rgba(255,255,255,0.6)'}}>"{t.text}"</p>
              <div className="flex items-center gap-3"><div className="w-9 h-9 flex items-center justify-center font-bold text-sm" style={{background:A,color:'#000',clipPath:'polygon(0 0,100% 0,100% 70%,70% 100%,0 100%)'}}>{t.name[0]}</div>
              <div><p className="font-bold text-sm">{t.name}</p><p style={{fontFamily:mono,fontSize:10,color:'rgba(255,255,255,0.25)'}}>{t.loc}</p></div></div>
            </div></Reveal>
          ))}</div>

          {/* Brand partners */}
          {brands.length>0&&(<Reveal><div className="mb-16">
            <p style={{fontFamily:mono,fontSize:11,color:A,letterSpacing:'0.25em',marginBottom:16}}>TRUSTED PARTNERS</p>
            <div className="flex flex-wrap gap-6">{brands.map((b,i)=>(
              <span key={i} className="px-5 py-3 text-sm font-bold uppercase" style={{fontFamily:mono,letterSpacing:'0.1em',border:'1px solid rgba(255,255,255,0.06)',color:'rgba(255,255,255,0.3)'}}>{b}</span>
            ))}</div>
          </div></Reveal>)}

          {/* FAQ accordion */}
          <Reveal><p style={{fontFamily:mono,fontSize:11,color:A,letterSpacing:'0.25em',marginBottom:8}}>FAQ</p>
          <h2 style={{fontFamily:head,fontSize:'clamp(32px,4vw,48px)',lineHeight:1,letterSpacing:'0.02em',textTransform:'uppercase',marginBottom:24}}>Common Questions</h2></Reveal>
          {faqs.map((f,i)=>(<Reveal key={i} delay={i*40} x={-15}><div style={{borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
            <button onClick={()=>setOpenFAQ(openFAQ===i?null:i)} className="w-full flex justify-between items-center text-left" style={{background:'none',border:'none',cursor:'pointer',color:'#fff',padding:'18px 0'}}>
              <span className="text-[15px] font-semibold pr-5">{f.q}</span><span style={{color:openFAQ===i?A:'rgba(255,255,255,0.2)'}}>{openFAQ===i?<Minus size={14}/>:<Plus size={14}/>}</span>
            </button>
            <div style={{maxHeight:openFAQ===i?200:0,opacity:openFAQ===i?1:0,overflow:'hidden',transition:'all .3s'}}><p className="text-sm leading-relaxed pb-5" style={{color:'rgba(255,255,255,0.35)'}}>{f.a}</p></div>
          </div></Reveal>))}
        </div></section>
      </div>

      {/* ═══ WORK / PORTFOLIO PAGE ═══ */}
      <div data-page="portfolio" style={{display:page==='work'?'block':'none'}}>
        <section style={{padding:'160px clamp(16px,4vw,48px) 48px'}}><div style={{maxWidth:1200,margin:'0 auto'}}>
          <Reveal><p style={{fontFamily:mono,fontSize:11,color:A,letterSpacing:'0.25em',marginBottom:8}}>PORTFOLIO</p></Reveal>
          <Reveal delay={80} x={-50}><h1 style={{fontFamily:head,fontSize:'clamp(44px,7vw,96px)',lineHeight:.95,letterSpacing:'0.02em',textTransform:'uppercase'}}>Our Work</h1></Reveal>
        </div></section>
        <div style={{height:4,background:A}}/>

        {/* Photo grid */}
        <section style={{padding:'clamp(48px,6vw,80px) clamp(16px,4vw,48px)',background:'#050505'}}>
          <div style={{maxWidth:1200,margin:'0 auto'}}>
            {photos.length>0?(
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {photos.slice(0,9).map((p,i)=>(<Reveal key={i} delay={i*50} x={-20}><div className="overflow-hidden cursor-pointer carbon-glow" style={{clipPath:'polygon(0 0,100% 0,100% 92%,92% 100%,0 100%)'}} onClick={()=>setLb(i)}>
                  <img src={p} alt="" className="w-full object-cover transition-transform duration-500 hover:scale-105" style={{aspectRatio:i%5===0?'16/10':'4/3',display:'block'}} loading={i>2?'lazy':undefined} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
                </div></Reveal>))}
              </div>
            ):(
              <div className="text-center py-20">
                <Camera size={40} style={{color:'rgba(255,255,255,0.12)',margin:'0 auto 20px'}}/>
                <h3 className="text-2xl font-bold mb-3" style={{fontFamily:head,letterSpacing:'0.05em',textTransform:'uppercase'}}>Portfolio Coming Soon</h3>
                <p className="text-sm mb-8" style={{color:'rgba(255,255,255,0.25)',maxWidth:400,margin:'0 auto'}}>We are curating our best work. Contact us for project examples and references.</p>
                <button onClick={()=>{onCTAClick();go('contact')}} className="carbon-btn">Request Examples <ArrowRight size={14}/></button>
              </div>
            )}
          </div>
        </section>

        {/* Portfolio CTA */}
        {photos.length>0&&(<section className="relative overflow-hidden text-center" style={{padding:'clamp(80px,10vw,120px) clamp(16px,4vw,48px)',background:A,clipPath:'polygon(0 0,100% 3vw,100% 100%,0 100%)'}}>
          <div className="absolute inset-0 opacity-[0.08]" style={{backgroundImage:'repeating-linear-gradient(135deg,transparent,transparent 30px,#000 30px,#000 31px)'}}/>
          <div className="relative" style={{maxWidth:600,margin:'0 auto'}}>
            <h2 style={{fontFamily:head,fontSize:'clamp(32px,5vw,56px)',color:'#000',letterSpacing:'0.03em',textTransform:'uppercase',marginBottom:16}}>Like What You See?</h2>
            <p className="text-base mb-8" style={{color:'rgba(0,0,0,0.45)'}}>Let us bring the same quality to your project.</p>
            <button onClick={()=>{onCTAClick();go('contact')}} style={{background:'#000',color:A,padding:'16px 36px',fontWeight:700,fontSize:14,letterSpacing:'.08em',textTransform:'uppercase',border:'none',cursor:'pointer',fontFamily:body}}>Get Your Estimate <ArrowRight size={14} style={{display:'inline',marginLeft:8,verticalAlign:'middle'}}/></button>
          </div>
        </section>)}
      </div>

      {/* ═══ CONTACT PAGE ═══ */}
      <div data-page="contact" style={{display:page==='contact'?'block':'none'}}>
        <section style={{padding:'160px clamp(16px,4vw,48px) 0'}}><div style={{maxWidth:1200,margin:'0 auto'}}>
          <Reveal><p style={{fontFamily:mono,fontSize:11,color:A,letterSpacing:'0.25em',marginBottom:8}}>CONTACT</p></Reveal>
          <Reveal delay={80} x={-50}><h1 style={{fontFamily:head,fontSize:'clamp(44px,7vw,80px)',lineHeight:.95,letterSpacing:'0.02em',textTransform:'uppercase',marginBottom:20}}>Get In Touch</h1></Reveal>
        </div></section>
        <div style={{height:4,background:A}}/>

        <section style={{padding:'clamp(40px,6vw,80px) clamp(16px,4vw,48px)',background:'#050505'}}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16" style={{maxWidth:1200,margin:'0 auto'}}>
            {/* Left column: info + service area + FAQ */}
            <Reveal><div>
              <div className="mb-10">
                {[lead.phone&&[<Phone size={18} key="p"/>,fmt(lead.phone),'24/7 Emergency Line'],lead.email&&[<Mail size={18} key="e"/>,lead.email,'Same-day response'],lead.enrichedAddress&&[<MapPin size={18} key="m"/>,lead.enrichedAddress,loc]].filter(Boolean).map((item,i)=>{
                  const [icon,main,sub]=item as [React.ReactNode,string,string]
                  return(<div key={i} className="flex gap-5 mb-7"><div className="w-12 h-12 flex items-center justify-center flex-shrink-0" style={{background:'#111',border:'1px solid rgba(255,255,255,0.05)',color:A}}>{icon}</div><div><p className="font-bold text-base">{main}</p><p className="text-[13px] mt-0.5" style={{color:'rgba(255,255,255,0.3)'}}>{sub}</p></div></div>)
                })}
              </div>

              {/* Service area */}
              <div className="mb-10 p-6" style={{background:'#111',border:'1px solid rgba(255,255,255,0.05)'}}>
                <p style={{fontFamily:mono,fontSize:11,color:A,letterSpacing:'0.25em',marginBottom:8}}>SERVICE AREA</p>
                <p className="text-sm leading-relaxed" style={{color:'rgba(255,255,255,0.4)'}}>{wc?.serviceAreaText||`${lead.companyName} proudly serves ${loc||'your area'} and all surrounding communities. Contact us to confirm coverage for your location.`}</p>
              </div>

              {/* FAQ */}
              <p style={{fontFamily:mono,fontSize:11,color:A,letterSpacing:'0.25em',marginBottom:16}}>FAQ</p>
              {faqs.map((f,i)=>(<div key={i} style={{borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                <button onClick={()=>setOpenFAQ(openFAQ===i?null:i)} className="w-full flex justify-between items-center text-left" style={{background:'none',border:'none',cursor:'pointer',color:'#fff',padding:'16px 0'}}>
                  <span className="text-sm font-semibold pr-5">{f.q}</span><span style={{color:openFAQ===i?A:'rgba(255,255,255,0.2)'}}>{openFAQ===i?<Minus size={14}/>:<Plus size={14}/>}</span>
                </button>
                <div style={{maxHeight:openFAQ===i?200:0,opacity:openFAQ===i?1:0,overflow:'hidden',transition:'all .3s'}}><p className="text-sm leading-relaxed pb-4" style={{color:'rgba(255,255,255,0.35)'}}>{f.a}</p></div>
              </div>))}
            </div></Reveal>

            {/* Right column: Estimate form */}
            <Reveal delay={120}><div style={{background:'#111',border:'1px solid rgba(255,255,255,0.05)',padding:36}}>
              <h3 style={{fontFamily:head,fontSize:26,letterSpacing:'0.05em',textTransform:'uppercase',marginBottom:4}}>Request Estimate</h3>
              <p className="text-[13px] mb-6" style={{color:'rgba(255,255,255,0.3)'}}>Free. Fast. No obligation.</p>
              <input placeholder="Full Name" className="w-full text-sm text-white mb-3 outline-none" style={{padding:'14px 16px',background:'#080808',border:'1px solid rgba(255,255,255,0.08)',fontFamily:body,boxSizing:'border-box'}}/>
              <input placeholder="Phone" className="w-full text-sm text-white mb-3 outline-none" style={{padding:'14px 16px',background:'#080808',border:'1px solid rgba(255,255,255,0.08)',fontFamily:body,boxSizing:'border-box'}}/>
              <input placeholder="Email" className="w-full text-sm text-white mb-3 outline-none" style={{padding:'14px 16px',background:'#080808',border:'1px solid rgba(255,255,255,0.08)',fontFamily:body,boxSizing:'border-box'}}/>
              {svc.length>0&&<select className="w-full text-sm mb-3" style={{padding:'14px 16px',background:'#080808',border:'1px solid rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.4)',fontFamily:body,boxSizing:'border-box'}}><option>Select service</option>{svc.map(s=><option key={s}>{s}</option>)}</select>}
              <textarea placeholder="Project details..." rows={4} className="w-full text-sm text-white mb-5 outline-none resize-none" style={{padding:'14px 16px',background:'#080808',border:'1px solid rgba(255,255,255,0.08)',fontFamily:body,boxSizing:'border-box'}}/>
              <button onClick={onCTAClick} className="carbon-btn w-full justify-center" style={{padding:16,fontSize:14}}>Submit Request <Send size={14}/></button>
            </div></Reveal>
          </div>
        </section>
      </div>

      {/* FOOTER */}
      <footer style={{background:'#000',borderTop:`1px solid ${A}15`,padding:'clamp(48px,6vw,80px) clamp(16px,4vw,48px)'}}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12" style={{maxWidth:1200,margin:'0 auto'}}>
          <div><div className="flex items-center gap-3 mb-4">{lead.logo?<img src={lead.logo} alt="" className="h-6 w-6 object-cover"/>:<div style={{width:10,height:10,background:A,clipPath:'polygon(50% 0%,100% 50%,50% 100%,0% 50%)'}}/>}<span className="font-bold text-lg" style={{fontFamily:head,letterSpacing:'0.05em'}}>{lead.companyName}</span></div>
          <p className="text-sm leading-relaxed" style={{color:'rgba(255,255,255,0.2)',maxWidth:300}}>Professional {indLabel}{loc?` in ${loc}`:''}.  Licensed, insured, 24/7.</p></div>
          <div><p style={{fontFamily:mono,fontSize:10,color:'rgba(255,255,255,0.2)',letterSpacing:'0.25em',marginBottom:14}}>NAVIGATION</p>
          <div className="flex flex-col gap-2.5">{PAGES.map(p=><button key={p.k} onClick={()=>go(p.k)} className="text-sm font-medium text-left p-0" style={{background:'none',border:'none',color:'rgba(255,255,255,0.3)',cursor:'pointer',fontFamily:mono,fontSize:12,letterSpacing:'0.1em'}}>{p.l}</button>)}</div></div>
          <div><p style={{fontFamily:mono,fontSize:10,color:'rgba(255,255,255,0.2)',letterSpacing:'0.25em',marginBottom:14}}>CONTACT</p>
          <div className="flex flex-col gap-3 text-sm" style={{color:'rgba(255,255,255,0.3)'}}>
            {lead.phone&&<a href={`tel:${lead.phone}`} onClick={onCallClick} style={{textDecoration:'none',color:'inherit'}}>{fmt(lead.phone)}</a>}
            {lead.email&&<a href={`mailto:${lead.email}`} style={{textDecoration:'none',color:'inherit'}}>{lead.email}</a>}
            {loc&&<span>{loc}</span>}
          </div></div>
        </div>
        <div className="flex flex-wrap justify-between items-center gap-4" style={{maxWidth:1200,margin:'0 auto',borderTop:'1px solid rgba(255,255,255,0.04)',paddingTop:28}}>
          <p className="text-xs" style={{color:'rgba(255,255,255,0.12)'}}>&copy; {new Date().getFullYear()} {lead.companyName}</p>
          <span className="text-[10px]" style={{color:'rgba(255,255,255,0.08)'}}>Powered by <a href="https://brightautomations.com" target="_blank" rel="noopener noreferrer" style={{color:'rgba(255,255,255,0.2)'}}>Bright Automations</a></span>
        </div>
      </footer>

      {/* LIGHTBOX with prev/next */}
      {lb!==null&&photos[lb]&&(<div className="fixed inset-0 z-[200] flex items-center justify-center p-5" style={{background:'rgba(0,0,0,.95)'}} onClick={()=>setLb(null)}>
        <img src={photos[lb]} alt="" style={{maxWidth:'90%',maxHeight:'85vh',objectFit:'contain'}}/>
        <button className="absolute top-6 right-6 flex items-center justify-center" style={{background:A,border:'none',color:'#000',width:44,height:44,cursor:'pointer',clipPath:'polygon(0 0,100% 0,100% 70%,70% 100%,0 100%)'}} onClick={e=>{e.stopPropagation();setLb(null)}}><X size={18}/></button>
        {lb>0&&<button className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center" style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.1)',width:48,height:48,cursor:'pointer',color:'#fff'}} onClick={e=>{e.stopPropagation();setLb(lb-1)}}><ChevronLeft size={22}/></button>}
        {lb<photos.length-1&&<button className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center" style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.1)',width:48,height:48,cursor:'pointer',color:'#fff'}} onClick={e=>{e.stopPropagation();setLb(lb+1)}}><ChevronRight size={22}/></button>}
      </div>)}

      <ChatWidget name={lead.companyName} accent={A}/>
      <div className="h-16 sm:h-0"/>
    </div>
  )
}
