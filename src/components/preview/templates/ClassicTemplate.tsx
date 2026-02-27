'use client'
/*
 * CORNERSTONE TEMPLATE — Classic
 * Warm ivory editorial, serif typography, magazine cover hero, diamond ornaments, numbered service list
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
  return m[config.accentColor] || '#d97706'
}

function Counter({ end, suffix='', dur=3000 }: { end: number; suffix?: string; dur?: number }) {
  const [v, setV] = useState(0); const ref = useRef<HTMLSpanElement>(null); const go = useRef(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !go.current) { go.current = true; const s = performance.now()
        const f = (n: number) => { const p = Math.min((n-s)/dur,1); setV(Math.floor((1-Math.pow(1-p,4))*end*10)/10); if(p<1) requestAnimationFrame(f); else setV(end) }
        requestAnimationFrame(f)
      }
    }, { threshold: 0.3 }); obs.observe(el); return () => obs.disconnect()
  }, [end, dur])
  return <span ref={ref}>{Number.isInteger(v)?v:v.toFixed(1)}{suffix}</span>
}

function Reveal({ children, delay=0, className='' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const [vis, setVis] = useState(false); const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => { if(e.isIntersecting){setVis(true);obs.disconnect()} }, { threshold:0.08 })
    obs.observe(el); return () => obs.disconnect()
  }, [])
  return <div ref={ref} className={className} style={{ opacity:vis?1:0, transform:vis?'translateY(0)':'translateY(20px)', transition:`opacity 1.2s ease ${delay}ms, transform 1.2s ease ${delay}ms` }}>{children}</div>
}

function Ornament({ color }: { color: string }) {
  return <div className="flex items-center justify-center gap-4 my-8"><div className="h-px flex-1" style={{background:`${color}30`}}/><span style={{color,fontSize:12}}>&#x25C6;</span><div className="h-px flex-1" style={{background:`${color}30`}}/></div>
}

function ChatWidget({ name, accent }: { name: string; accent: string }) {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<{from:string;text:string}[]>([])
  const [input, setInput] = useState(''); const [typing, setTyping] = useState(false)
  const endRef = useRef<HTMLDivElement>(null); const inRef = useRef<HTMLInputElement>(null)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }) }, [msgs])
  useEffect(() => {
    if(open && msgs.length===0){ setTyping(true); const t=setTimeout(()=>{setMsgs([{from:'bot',text:`Welcome to ${name}. How may we assist you?`}]);setTyping(false)},800); return()=>clearTimeout(t) }
    if(open) setTimeout(()=>inRef.current?.focus(),100)
  }, [open,name])
  const send = (t?:string) => {
    const m=t||input.trim(); if(!m) return; setMsgs(p=>[...p,{from:'user',text:m}]); setInput(''); setTyping(true)
    setTimeout(()=>{
      let r="Thank you for reaching out. We'll respond promptly."
      if(m.toLowerCase().includes('estimat')||m.toLowerCase().includes('quot')) r="We'd be happy to provide a free estimate. Please share your details."
      else if(m.toLowerCase().includes('servic')) r="Please visit our Services page for our complete offerings."
      else if(m.toLowerCase().includes('hour')) r="We're available Monday through Saturday, with emergency service 24/7."
      setMsgs(p=>[...p,{from:'bot',text:r}]); setTyping(false)
    },1100)
  }
  return (<>
    <button onClick={()=>setOpen(!open)} className="fixed bottom-6 right-5 z-[100] sm:bottom-6 bottom-20" aria-label="Chat">
      <div className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg text-white" style={{background:accent,border:`2px solid ${accent}`}}>{open?<X size={20}/>:<MessageCircle size={20}/>}</div>
    </button>
    {open&&(<div className="fixed sm:bottom-24 bottom-28 right-5 z-[100] w-[370px] max-w-[calc(100vw-2.5rem)] shadow-2xl overflow-hidden border" style={{background:'#FAF8F4',borderColor:'#e8e2d8',borderRadius:4}}>
      <div className="px-5 py-4 text-white" style={{background:accent}}>
        <p className="font-bold text-sm">{name}</p>
        <p className="text-[10px] opacity-60 mt-0.5">AI Assistant</p>
      </div>
      <div className="h-[260px] overflow-y-auto px-4 py-4 space-y-3">
        {msgs.map((m,i)=>(<div key={i} className={`flex ${m.from==='user'?'justify-end':'justify-start'}`}><div className={`max-w-[80%] px-4 py-2.5 text-sm leading-relaxed ${m.from==='user'?'text-white':'border'}`} style={m.from==='user'?{background:accent,borderRadius:4}:{background:'#fff',borderColor:'#e8e2d8',borderRadius:4,color:'#5C5650'}}>{m.text}</div></div>))}
        {typing&&<div className="flex justify-start"><div className="bg-white px-4 py-3 border" style={{borderColor:'#e8e2d8',borderRadius:4}}><div className="flex gap-1">{[0,150,300].map(d=><span key={d} className="w-2 h-2 rounded-full animate-bounce" style={{background:accent,opacity:0.4,animationDelay:`${d}ms`}}/>)}</div></div></div>}
        <div ref={endRef}/>
      </div>
      <div className="px-4 py-3 border-t" style={{borderColor:'#e8e2d8'}}><div className="flex gap-2">
        <input ref={inRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Type a message..." className="flex-1 text-sm px-4 py-2.5 bg-white border outline-none placeholder:text-gray-400" style={{borderColor:'#e8e2d8',color:'#2C2520'}}/>
        <button onClick={()=>send()} disabled={!input.trim()} className="w-10 h-10 flex items-center justify-center text-white disabled:opacity-30" style={{background:accent}}><Send size={15}/></button>
      </div></div>
    </div>)}
  </>)
}

export default function ClassicTemplate({ lead, config, onCTAClick, onCallClick, websiteCopy: wc }: TemplateProps) {
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

  const svcData = svc.map((n,i) => ({ name:n, desc: wc?.serviceDescriptions?.[n] || `Professional ${n.toLowerCase()} services built on quality and trust.`, img: photos.length > 0 ? photos[i % photos.length] : undefined }))
  const testis = [
    { text: wc?.testimonialQuote || `${lead.companyName} did outstanding work. The craftsmanship speaks for itself. Couldn't be happier.`, name: wc?.testimonialAuthor || 'Robert M.', loc: lead.city||'Local' },
    ...(wc?.additionalTestimonials?.map(t=>({text:t.quote,name:t.author,loc:lead.city||'Local'})) || [
      { text: "They treated our home like it was their own. Honest, dependable, and truly skilled.", name:'Margaret K.', loc:lead.city||'Local' },
      { text: "From the estimate to the final walkthrough — first class all the way.", name:'Steven R.', loc:lead.city||'Local' },
    ])
  ]
  const steps = wc?.processSteps || [
    { title:'Consultation', description:'We discuss your vision, assess requirements, and provide a transparent estimate.' },
    { title:'Planning', description:'Detailed project plan with timelines, materials, and milestones for your approval.' },
    { title:'Execution', description:'Our skilled team brings the plan to life with meticulous attention to detail.' },
    { title:'Final Walkthrough', description:'We review every detail together to ensure your complete satisfaction.' },
  ]
  const whyUs = wc?.whyChooseUs || wc?.valueProps || [
    { title:'Licensed & Insured', description:'Complete coverage on every project for your peace of mind.' },
    { title:'Experienced Crew', description:'Skilled professionals who take pride in their craft.' },
    { title:'Warranty Backed', description:'Our work is guaranteed — your satisfaction is non-negotiable.' },
    { title:'On-Time Delivery', description:'We respect your time with reliable scheduling and clear communication.' },
  ]
  const brands = wc?.brandNames || []
  const faqs = [
    { q:'How do I request an estimate?', a:'Call us or fill out the form — we provide free, no-obligation estimates within 24 hours.' },
    { q:'Do you offer warranties?', a:'Yes. All work is backed by our satisfaction guarantee and material warranties.' },
    { q:'What areas do you serve?', a:`We serve ${loc||'your area'} and the surrounding region.` },
    { q:'Are you licensed and insured?', a:'Fully licensed, bonded, and insured. We carry comprehensive liability coverage.' },
    { q:'How long does a typical project take?', a:'Timelines vary by scope. We provide detailed schedules upfront and keep you informed at every step.' },
  ]
  const PAGES = [{k:'home' as const,l:'Home'},{k:'services' as const,l:'Services'},{k:'about' as const,l:'About'},{k:'work' as const,l:'Portfolio'},{k:'contact' as const,l:'Contact'}]

  const serif = "'Libre Baskerville',Georgia,serif"
  const bodySerif = "'Lora','Times New Roman',serif"
  const label = "'Josefin Sans','Helvetica Neue',sans-serif"

  return (
    <div className="preview-template min-h-screen antialiased" style={{fontFamily:bodySerif,background:'#FAF8F4',color:'#2C2520',overflowX:'hidden'}}>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Lora:wght@400;500;600;700&family=Josefin+Sans:wght@400;500;600;700&display=swap');
        .cs-btn{display:inline-flex;align-items:center;gap:8px;background:${A};color:#fff;padding:14px 32px;font-weight:600;font-size:14px;letter-spacing:.04em;text-transform:uppercase;border:none;cursor:pointer;transition:all .3s;font-family:${label};text-decoration:none}
        .cs-btn:hover{filter:brightness(1.1);transform:translateY(-1px)}
        .cs-btn-o{display:inline-flex;align-items:center;gap:8px;background:transparent;color:#2C2520;padding:14px 32px;border:1.5px solid #d5cfc5;font-weight:600;font-size:14px;letter-spacing:.04em;text-transform:uppercase;cursor:pointer;transition:all .3s;font-family:${label};text-decoration:none}
        .cs-btn-o:hover{border-color:${A};color:${A}}
        ::selection{background:${A}22;color:#2C2520}
        .cs-photo-hover{overflow:hidden;cursor:pointer;position:relative}
        .cs-photo-hover img{transition:transform .7s ease}
        .cs-photo-hover:hover img{transform:scale(1.05)}
        .cs-photo-hover::after{content:'';position:absolute;inset:0;background:rgba(44,37,32,0);transition:background .5s}
        .cs-photo-hover:hover::after{background:rgba(44,37,32,0.15)}
      ` }} />

      {/* Paper texture overlay */}
      <div className="fixed inset-0 pointer-events-none z-[9998] opacity-[0.015]" style={{backgroundImage:"url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"}}/>
      <DisclaimerBanner variant="classic" companyName={lead.companyName}/>

      {/* NAV */}
      <nav style={{position:'fixed',top:0,left:0,right:0,zIndex:50,background:navSolid?'rgba(250,248,244,0.95)':'transparent',backdropFilter:navSolid?'blur(16px)':'none',borderBottom:navSolid?'1px solid #e8e2d8':'none',transition:'all .4s',padding:'0 clamp(16px,4vw,48px)'}}>
        <div style={{maxWidth:1340,margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'space-between',height:navSolid?60:76,transition:'height .4s'}}>
          <button onClick={()=>go('home')} data-nav-page="home" className="flex items-center gap-2" style={{background:'none',border:'none',cursor:'pointer'}}>
            {lead.logo?<img src={lead.logo} alt="" className="h-7 w-7 object-cover"/>:<span style={{fontFamily:serif,fontWeight:700,fontSize:20,color:A}}>&#x25C6;</span>}
            <span style={{fontFamily:serif,fontWeight:700,fontSize:17}}>{lead.companyName}</span>
          </button>
          <div className="hidden lg:flex items-center gap-8">{PAGES.map(p=>(
            <button key={p.k} onClick={()=>go(p.k)} data-nav-page={p.k==='work'?'portfolio':p.k} className="text-[13px] font-medium py-1 transition-colors relative" style={{fontFamily:label,background:'none',border:'none',cursor:'pointer',color:page===p.k?A:'#8a8078',letterSpacing:'0.06em',textTransform:'uppercase'}}>
              {p.l}
              {page===p.k&&<div style={{position:'absolute',bottom:-2,left:0,right:0,height:1.5,background:A,transition:'all .3s'}}/>}
            </button>
          ))}</div>
          <div className="flex items-center gap-4">
            {lead.phone&&<a href={`tel:${lead.phone}`} onClick={onCallClick} className="hidden lg:flex items-center gap-2 text-[13px]" style={{fontFamily:label,color:'#8a8078',textDecoration:'none'}}><Phone size={14}/>{fmt(lead.phone)}</a>}
            <button onClick={()=>{onCTAClick();go('contact')}} data-nav-page="contact" className="cs-btn hidden sm:inline-flex" style={{padding:'10px 22px',fontSize:12}}>Get Estimate</button>
            <button onClick={()=>setMobNav(!mobNav)} className="flex lg:hidden items-center justify-center" style={{background:'none',border:`1.5px solid #d5cfc5`,borderRadius:4,color:'#2C2520',cursor:'pointer',padding:'6px 8px'}}><Menu size={20}/></button>
          </div>
        </div>
      </nav>

      {/* MOBILE SIDE DRAWER — library / bookshelf feel */}
      {mobNav&&(<>
        <div className="fixed inset-0 z-[89] bg-black/20" onClick={()=>setMobNav(false)}/>
        <div className="fixed top-0 right-0 bottom-0 z-[90] w-72 flex flex-col" style={{background:'#FAF8F4',borderLeft:'2px solid #d5cfc5',padding:'80px 28px 28px',boxShadow:'-8px 0 40px rgba(44,37,32,0.08)'}}>
          <button onClick={()=>setMobNav(false)} className="absolute top-5 right-5" style={{background:'none',border:'none',color:'#2C2520',cursor:'pointer'}}><X size={24}/></button>
          <div style={{fontFamily:serif,fontSize:11,color:'#b5afa5',letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:20}}>Navigation</div>
          {PAGES.map(p=>(
            <button key={p.k} onClick={()=>go(p.k)} data-nav-page={p.k==='work'?'portfolio':p.k} className="text-left py-3.5 text-lg font-medium" style={{fontFamily:serif,background:'none',border:'none',cursor:'pointer',color:page===p.k?A:'#2C2520',borderBottom:'1px solid #ece6dc'}}>{p.l}</button>
          ))}
          <div style={{marginTop:'auto',borderTop:'1px solid #ece6dc',paddingTop:20}}>
            {lead.phone&&<a href={`tel:${lead.phone}`} onClick={onCallClick} className="cs-btn justify-center w-full"><Phone size={16}/>{fmt(lead.phone)}</a>}
          </div>
        </div>
      </>)}

      {/* =============== HOME =============== */}
      <div data-page="home" style={{display:page==='home'?'block':'none'}}>
        {/* HERO — magazine cover with thick white border frame */}
        <section className="relative overflow-hidden" style={{marginTop:76}}>
          <div style={{padding:'clamp(12px,2vw,24px)'}}>
            <div className="relative overflow-hidden" style={{maxWidth:1340,margin:'0 auto',border:'6px solid #fff',boxShadow:'0 4px 40px rgba(44,37,32,0.08)'}}>
              {photos[0] ? (
                <img src={photos[0]} alt="" className="w-full object-cover" style={{height:'clamp(400px,60vh,640px)',display:'block'}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
              ) : (
                <PhotoPlaceholder accent={A} height="clamp(400px,60vh,640px)" iconSize={56} />
              )}
              <div className="absolute inset-0" style={{background: photos[0] ? 'linear-gradient(to top, rgba(44,37,32,0.7) 0%, transparent 50%)' : 'linear-gradient(to top, rgba(44,37,32,0.3) 0%, transparent 50%)'}}/>
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <div className="inline-block px-6 py-4" style={{background:'#FAF8F4'}}>
                  <Reveal><h1 style={{fontFamily:serif,fontSize:'clamp(28px,4vw,48px)',fontWeight:700,lineHeight:1.15,color:'#2C2520',maxWidth:600}}>{wc?.heroHeadline||config.tagline||`Trusted ${indLabel} since day one.`}</h1></Reveal>
                </div>
              </div>
            </div>
          </div>
          <div style={{maxWidth:1200,margin:'0 auto',padding:'clamp(24px,4vw,48px) clamp(16px,4vw,48px)'}}>
            {wc?.heroSubheadline&&<Reveal><p className="text-lg mb-6" style={{color:'#8a8078',lineHeight:1.7,maxWidth:540,fontStyle:'italic'}}>{wc.heroSubheadline}</p></Reveal>}
            <Reveal delay={100}><div className="flex flex-wrap gap-3">
              <button onClick={()=>{onCTAClick();go('contact')}} className="cs-btn">{config.ctaText||'Request Estimate'} <ArrowRight size={15}/></button>
              {lead.phone&&<a href={`tel:${lead.phone}`} onClick={onCallClick} className="cs-btn-o"><Phone size={15}/>Call Us</a>}
            </div></Reveal>
            {hasR&&<Reveal delay={200}><div className="flex items-center gap-6 mt-8 pt-6 flex-wrap" style={{borderTop:'1px solid #e8e2d8'}}>
              <div className="flex items-center gap-2"><div className="flex gap-0.5">{Array.from({length:5},(_,i)=><Star key={i} size={14} className="fill-current" style={{color:'#f59e0b'}}/>)}</div><span className="text-sm font-semibold">{lead.enrichedRating}/5</span></div>
              {lead.enrichedReviews&&<span className="text-sm" style={{color:'#8a8078'}}>{lead.enrichedReviews}+ verified reviews</span>}
              {loc&&<span className="text-sm" style={{color:'#8a8078'}}>Serving {loc}</span>}
            </div></Reveal>}
          </div>
        </section>

        <Ornament color={A}/>

        {/* SERVICES — editorial numbered list */}
        {svc.length>0&&(<section style={{padding:'0 clamp(16px,4vw,48px) clamp(60px,8vw,100px)'}}>
          <div style={{maxWidth:900,margin:'0 auto'}}>
            <Reveal><div className="flex flex-wrap justify-between items-end gap-4 mb-10">
              <div><p style={{fontFamily:label,fontSize:12,color:A,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:6}}>Our Services</p>
              <h2 style={{fontFamily:serif,fontSize:'clamp(28px,3.5vw,42px)',fontWeight:700}}>What we offer</h2></div>
              <button onClick={()=>go('services')} className="cs-btn-o" style={{padding:'10px 20px',fontSize:12}}>Full list <ArrowRight size={14}/></button>
            </div></Reveal>
            {svcData.slice(0,5).map((s,i)=>(
              <Reveal key={i} delay={i*80}><div onClick={()=>go('services')} className="cursor-pointer flex gap-6 py-7 group" style={{borderBottom:'1px solid #e8e2d8'}}>
                <span style={{fontFamily:serif,fontSize:32,fontWeight:700,color:`${A}40`,lineHeight:1,minWidth:48}}>{i+1}</span>
                <div className="flex-1"><h3 className="text-xl font-bold mb-1.5 group-hover:text-current transition-colors" style={{fontFamily:serif}}>{s.name}</h3>
                <p className="text-[15px] leading-relaxed" style={{color:'#8a8078'}}>{s.desc}</p></div>
                <ArrowRight size={18} className="mt-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{color:A}}/>
              </div></Reveal>
            ))}
          </div>
        </section>)}

        <Ornament color={A}/>

        {/* TESTIMONIALS — oversized serif pull-quotes */}
        <section style={{background:'#EDE8DF'}}>
          <div style={{maxWidth:1200,margin:'0 auto',padding:'clamp(60px,8vw,100px) clamp(16px,4vw,48px)'}}>
            <Reveal><p style={{fontFamily:label,fontSize:12,color:A,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:6}}>Testimonials</p>
            <h2 style={{fontFamily:serif,fontSize:'clamp(28px,3.5vw,42px)',fontWeight:700,marginBottom:48}}>What our clients say</h2></Reveal>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">{testis.slice(0,3).map((t,i)=>(
              <Reveal key={i} delay={i*120}><div>
                <Quote size={40} style={{color:A,opacity:0.15,marginBottom:12}}/>
                <p style={{fontFamily:serif,fontSize:'clamp(16px,1.8vw,20px)',lineHeight:1.7,fontStyle:'italic',color:'#5C5650',marginBottom:20}}>&#8220;{t.text}&#8221;</p>
                <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{background:A}}>{t.name[0]}</div>
                <div><p className="text-sm font-bold" style={{fontFamily:label}}>{t.name}</p><p className="text-xs" style={{color:'#8a8078'}}>{t.loc}</p></div></div>
              </div></Reveal>
            ))}</div>
          </div>
        </section>

        {/* PORTFOLIO PREVIEW */}
        <section style={{padding:'clamp(60px,8vw,100px) clamp(16px,4vw,48px)'}}>
          <div style={{maxWidth:1280,margin:'0 auto'}}>
            <Reveal><div className="flex flex-wrap justify-between items-end gap-4 mb-10">
              <div><p style={{fontFamily:label,fontSize:12,color:A,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:6}}>Portfolio</p>
              <h2 style={{fontFamily:serif,fontSize:'clamp(28px,3.5vw,42px)',fontWeight:700}}>Recent work</h2></div>
              <button onClick={()=>go('work')} className="cs-btn-o" style={{padding:'10px 20px',fontSize:12}}>View all <ArrowRight size={14}/></button>
            </div></Reveal>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {photos.length > 0 ? photos.slice(0,3).map((p,i)=>(<Reveal key={i} delay={i*80}><div className="cs-photo-hover" onClick={()=>setLb(i)}><img src={p} alt="" className="w-full object-cover" style={{aspectRatio:'4/3',display:'block'}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/></div></Reveal>)) : Array.from({length:3},(_,i)=>(<Reveal key={i} delay={i*80}><PhotoPlaceholder accent={A} aspectRatio="4/3" /></Reveal>))}
            </div>
          </div>
        </section>

        {/* CTA BAND */}
        <section style={{background:'#EDE8DF',padding:'clamp(60px,8vw,100px) clamp(16px,4vw,48px)'}}>
          <Reveal><div className="text-center" style={{maxWidth:600,margin:'0 auto'}}>
            <Ornament color={A}/>
            <h2 style={{fontFamily:serif,fontSize:'clamp(28px,4vw,44px)',fontWeight:700,marginBottom:16}}>Your project starts here.</h2>
            <p className="mb-8" style={{color:'#8a8078',fontStyle:'italic'}}>Free estimates. No obligation. Built on trust.</p>
            <div className="flex flex-wrap justify-center gap-3">
              <button onClick={()=>{onCTAClick();go('contact')}} className="cs-btn">Request Estimate <ArrowRight size={15}/></button>
              {lead.phone&&<a href={`tel:${lead.phone}`} onClick={onCallClick} className="cs-btn-o"><Phone size={15}/>{fmt(lead.phone)}</a>}
            </div>
            <Ornament color={A}/>
          </div></Reveal>
        </section>
      </div>

      {/* =============== SERVICES PAGE =============== */}
      <div data-page="services" style={{display:page==='services'?'block':'none'}}>
        {/* Header */}
        <section style={{padding:'clamp(120px,16vh,180px) clamp(16px,4vw,48px) 60px'}}><div style={{maxWidth:900,margin:'0 auto'}}>
          <Reveal><p style={{fontFamily:label,fontSize:12,color:A,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:6}}>Services</p></Reveal>
          <Reveal delay={80}><h1 style={{fontFamily:serif,fontSize:'clamp(36px,5vw,56px)',fontWeight:700,marginBottom:16}}>Our services</h1></Reveal>
          <Reveal delay={160}><p style={{color:'#8a8078',fontStyle:'italic',maxWidth:500}}>Quality {indLabel}{loc?` across ${loc}`:''} and beyond.</p></Reveal>
        </div></section>
        <Ornament color={A}/>

        {/* Editorial layout — large photo + numbered text */}
        <section style={{padding:'0 clamp(16px,4vw,48px) clamp(60px,8vw,100px)'}}>
          <div style={{maxWidth:1100,margin:'0 auto'}}>
            {svcData.map((s,i)=>(
              <Reveal key={i} delay={i*60}>
                <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 items-center py-10 ${i<svcData.length-1?'':''}`.trim()} style={{borderBottom:i<svcData.length-1?'1px solid #e8e2d8':'none'}}>
                  <div className={`cs-photo-hover ${i%2===1?'lg:order-2':''}`} style={{aspectRatio:'4/3'}}>
                    {s.img ? (
                      <img src={s.img} alt={s.name} className="w-full h-full object-cover" style={{display:'block'}} onError={e=>{(e.target as HTMLImageElement).parentElement!.style.display='none'}}/>
                    ) : (
                      <PhotoPlaceholder accent={A} style={{width:'100%',height:'100%'}} />
                    )}
                  </div>
                  <div className={i%2===1?'lg:order-1':''}>
                    <span style={{fontFamily:serif,fontSize:48,fontWeight:700,color:`${A}25`,lineHeight:1,display:'block',marginBottom:8}}>{String(i+1).padStart(2,'0')}</span>
                    <h3 style={{fontFamily:serif,fontSize:'clamp(22px,3vw,32px)',fontWeight:700,marginBottom:12}}>{s.name}</h3>
                    <p className="leading-relaxed mb-5" style={{color:'#8a8078',fontSize:15}}>{s.desc}</p>
                    <button onClick={()=>{onCTAClick();go('contact')}} className="inline-flex items-center gap-2 text-sm font-semibold" style={{fontFamily:label,color:A,textTransform:'uppercase',letterSpacing:'0.04em',background:'none',border:'none',cursor:'pointer'}}>Get estimate <ArrowRight size={14}/></button>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <Ornament color={A}/>

        {/* Process steps */}
        <section style={{background:'#EDE8DF',padding:'clamp(60px,8vw,100px) clamp(16px,4vw,48px)'}}>
          <div style={{maxWidth:900,margin:'0 auto'}}>
            <Reveal><p style={{fontFamily:label,fontSize:12,color:A,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:6}}>Our Process</p>
            <h2 style={{fontFamily:serif,fontSize:'clamp(28px,3.5vw,42px)',fontWeight:700,marginBottom:48}}>How we work</h2></Reveal>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {steps.map((s,i)=>(
                <Reveal key={i} delay={i*100}><div className="flex gap-5">
                  <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center text-white font-bold" style={{background:A,fontFamily:label,fontSize:14}}>{i+1}</div>
                  <div><h4 className="font-bold mb-1" style={{fontFamily:serif,fontSize:18}}>{s.title}</h4>
                  <p className="text-sm leading-relaxed" style={{color:'#8a8078'}}>{s.description}</p></div>
                </div></Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* CTA band */}
        <section style={{padding:'clamp(48px,6vw,80px) clamp(16px,4vw,48px)'}}>
          <Reveal><div className="text-center" style={{maxWidth:500,margin:'0 auto'}}>
            <h3 style={{fontFamily:serif,fontSize:'clamp(24px,3vw,36px)',fontWeight:700,marginBottom:12}}>Ready to get started?</h3>
            <p className="mb-6" style={{color:'#8a8078',fontStyle:'italic'}}>Free estimates, no obligation.</p>
            <button onClick={()=>{onCTAClick();go('contact')}} className="cs-btn">Request Estimate <ArrowRight size={15}/></button>
          </div></Reveal>
        </section>
      </div>

      {/* =============== ABOUT PAGE =============== */}
      <div data-page="about" style={{display:page==='about'?'block':'none'}}>
        {/* Header */}
        <section style={{padding:'clamp(120px,16vh,180px) clamp(16px,4vw,48px) 60px'}}><div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-end" style={{maxWidth:1100,margin:'0 auto'}}>
          <Reveal><div><p style={{fontFamily:label,fontSize:12,color:A,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:6}}>About</p><h1 style={{fontFamily:serif,fontSize:'clamp(36px,5vw,56px)',fontWeight:700}}>Our story</h1></div></Reveal>
          <Reveal delay={150}><p className="text-[17px] leading-relaxed" style={{color:'#8a8078',fontStyle:'italic'}}>{wc?.aboutParagraph1||`${lead.companyName} has been providing trusted ${indLabel}${loc?` in ${loc}`:''} for over a decade.`}</p></Reveal>
        </div></section>
        <Ornament color={A}/>

        {/* Story + photos */}
        <section style={{padding:'0 clamp(16px,4vw,48px) clamp(60px,8vw,100px)'}}><div style={{maxWidth:1100,margin:'0 auto'}}>
          <Reveal><div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
            {photos.length >= 2 ? photos.slice(0,2).map((p,i)=><div key={i} className="overflow-hidden"><img src={p} alt="" className="w-full object-cover" style={{height:320,display:'block'}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/></div>) : Array.from({length:2},(_,i)=>(<div key={i} className="overflow-hidden"><PhotoPlaceholder accent={A} height={320} /></div>))}
          </div></Reveal>
          {wc?.aboutParagraph2&&<Reveal><p className="leading-relaxed mb-10" style={{color:'#8a8078',maxWidth:700}}>{wc.aboutParagraph2}</p></Reveal>}
        </div></section>

        {/* Why Choose Us */}
        <section style={{background:'#EDE8DF',padding:'clamp(60px,8vw,100px) clamp(16px,4vw,48px)'}}>
          <div style={{maxWidth:1100,margin:'0 auto'}}>
            <Reveal><p style={{fontFamily:label,fontSize:12,color:A,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:6}}>Why Choose Us</p>
            <h2 style={{fontFamily:serif,fontSize:'clamp(28px,3.5vw,42px)',fontWeight:700,marginBottom:48}}>Built different</h2></Reveal>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {whyUs.slice(0,4).map((vp,i)=>(
                <Reveal key={i} delay={i*80}><div style={{borderLeft:`3px solid ${A}`,paddingLeft:20,paddingTop:4,paddingBottom:4}}>
                  <h4 className="font-bold mb-1" style={{fontFamily:label,textTransform:'uppercase',fontSize:14,letterSpacing:'0.04em'}}>{vp.title}</h4>
                  <p className="text-sm leading-relaxed" style={{color:'#8a8078'}}>{vp.description}</p>
                </div></Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Stats counters */}
        <section style={{padding:'clamp(48px,6vw,80px) clamp(16px,4vw,48px)'}}>
          <Reveal><div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center" style={{maxWidth:900,margin:'0 auto'}}>
            {hasR&&<div><div style={{fontFamily:serif,fontSize:'clamp(32px,5vw,48px)',fontWeight:700,color:A}}>{lead.enrichedRating}</div><p className="text-xs mt-1" style={{fontFamily:label,color:'#8a8078',textTransform:'uppercase',letterSpacing:'0.08em'}}>Star Rating</p></div>}
            {lead.enrichedReviews&&<div><div style={{fontFamily:serif,fontSize:'clamp(32px,5vw,48px)',fontWeight:700,color:A}}><Counter end={lead.enrichedReviews} suffix="+"/></div><p className="text-xs mt-1" style={{fontFamily:label,color:'#8a8078',textTransform:'uppercase',letterSpacing:'0.08em'}}>Reviews</p></div>}
            <div><div style={{fontFamily:serif,fontSize:'clamp(32px,5vw,48px)',fontWeight:700,color:A}}><Counter end={svc.length}/></div><p className="text-xs mt-1" style={{fontFamily:label,color:'#8a8078',textTransform:'uppercase',letterSpacing:'0.08em'}}>Services</p></div>
            <div><div style={{fontFamily:serif,fontSize:'clamp(32px,5vw,48px)',fontWeight:700,color:A}}>100%</div><p className="text-xs mt-1" style={{fontFamily:label,color:'#8a8078',textTransform:'uppercase',letterSpacing:'0.08em'}}>Satisfaction</p></div>
          </div></Reveal>
        </section>

        <Ornament color={A}/>

        {/* Testimonials — oversized serif pull-quotes */}
        <section style={{padding:'0 clamp(16px,4vw,48px) clamp(60px,8vw,100px)'}}>
          <div style={{maxWidth:800,margin:'0 auto'}}>
            <Reveal><p style={{fontFamily:label,fontSize:12,color:A,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:6}}>Testimonials</p>
            <h2 style={{fontFamily:serif,fontSize:'clamp(28px,3.5vw,42px)',fontWeight:700,marginBottom:40}}>In their words</h2></Reveal>
            {testis.slice(0,3).map((t,i)=>(
              <Reveal key={i} delay={i*100}><div className="mb-12 relative" style={{paddingLeft:'clamp(20px,4vw,48px)'}}>
                <Quote size={56} style={{position:'absolute',left:0,top:-8,color:A,opacity:0.1}}/>
                <p style={{fontFamily:serif,fontSize:'clamp(18px,2.5vw,26px)',lineHeight:1.6,fontStyle:'italic',color:'#3C3630',marginBottom:12}}>&#8220;{t.text}&#8221;</p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{background:A}}>{t.name[0]}</div>
                  <span className="text-sm font-semibold" style={{fontFamily:label}}>{t.name}</span>
                  <span className="text-xs" style={{color:'#b5afa5'}}>&#x2022; {t.loc}</span>
                </div>
              </div></Reveal>
            ))}
          </div>
        </section>

        {/* Brand partners */}
        {brands.length>0&&(<section style={{background:'#EDE8DF',padding:'clamp(40px,5vw,60px) clamp(16px,4vw,48px)'}}>
          <Reveal><div style={{maxWidth:900,margin:'0 auto',textAlign:'center'}}>
            <p style={{fontFamily:label,fontSize:11,color:'#b5afa5',letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:20}}>Brands We Trust</p>
            <div className="flex flex-wrap justify-center gap-x-10 gap-y-3">
              {brands.map((b,i)=><span key={i} style={{fontFamily:label,fontSize:14,color:'#8a8078',letterSpacing:'0.04em'}}>{b}</span>)}
            </div>
          </div></Reveal>
        </section>)}

        {/* FAQ accordion */}
        <section style={{padding:'clamp(60px,8vw,100px) clamp(16px,4vw,48px)'}}>
          <div style={{maxWidth:700,margin:'0 auto'}}>
            <Reveal><p style={{fontFamily:label,fontSize:12,color:A,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:6}}>FAQ</p>
            <h2 style={{fontFamily:serif,fontSize:'clamp(28px,3.5vw,42px)',fontWeight:700,marginBottom:32}}>Common questions</h2></Reveal>
            {faqs.map((f,i)=>(<Reveal key={i} delay={i*40}><div style={{borderBottom:'1px solid #e8e2d8'}}>
              <button onClick={()=>setOpenFAQ(openFAQ===i?null:i)} className="w-full flex justify-between items-center text-left" style={{background:'none',border:'none',cursor:'pointer',color:'#2C2520',padding:'18px 0'}}>
                <span className="text-[15px] font-semibold pr-5" style={{fontFamily:label}}>{f.q}</span><span style={{color:openFAQ===i?A:'#c5bfb5'}}>{openFAQ===i?<Minus size={14}/>:<Plus size={14}/>}</span>
              </button>
              <div style={{maxHeight:openFAQ===i?200:0,opacity:openFAQ===i?1:0,overflow:'hidden',transition:'all .3s'}}><p className="text-sm leading-relaxed pb-4" style={{color:'#8a8078'}}>{f.a}</p></div>
            </div></Reveal>))}
          </div>
        </section>
      </div>

      {/* =============== WORK / PORTFOLIO PAGE =============== */}
      <div data-page="portfolio" style={{display:page==='work'?'block':'none'}}>
        <section style={{padding:'clamp(120px,16vh,180px) clamp(16px,4vw,48px) 48px'}}><div style={{maxWidth:1200,margin:'0 auto'}}>
          <Reveal><p style={{fontFamily:label,fontSize:12,color:A,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:6}}>Portfolio</p></Reveal>
          <Reveal delay={80}><h1 style={{fontFamily:serif,fontSize:'clamp(36px,5vw,56px)',fontWeight:700}}>Our work</h1></Reveal>
        </div></section>
        <Ornament color={A}/>

        {/* Photo grid with hover */}
        <section style={{padding:'0 clamp(16px,4vw,48px) clamp(60px,8vw,100px)'}}>
          <div style={{maxWidth:1200,margin:'0 auto'}}>
            {photos.length>0?(
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {photos.slice(0,9).map((p,i)=>(<Reveal key={i} delay={i*60}><div className="cs-photo-hover" onClick={()=>setLb(i)} style={{aspectRatio:i===0||i===4?'16/10':'4/3'}}>
                  <img src={p} alt="" className="w-full h-full object-cover" style={{display:'block'}} loading={i>2?'lazy':undefined} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
                  <div className="absolute bottom-3 left-3 px-2 py-1 text-[11px]" style={{background:'rgba(250,248,244,0.9)',fontFamily:label,color:'#5C5650',letterSpacing:'0.04em'}}>Project {i+1}</div>
                </div></Reveal>))}
              </div>
            ):(
              <div className="text-center py-20">
                <Camera size={36} style={{color:'#d5cfc5',margin:'0 auto 16px'}}/>
                <h3 className="text-xl font-bold mb-2" style={{fontFamily:serif}}>Portfolio Coming Soon</h3>
                <p className="text-sm mb-8" style={{color:'#8a8078',fontStyle:'italic',maxWidth:360,margin:'0 auto 24px'}}>We are curating our best work. Contact us to see examples of our craftsmanship.</p>
                <button onClick={()=>{onCTAClick();go('contact')}} className="cs-btn">Request Examples <ArrowRight size={14}/></button>
              </div>
            )}
          </div>
        </section>

        {/* CTA */}
        <section style={{background:'#EDE8DF',padding:'clamp(48px,6vw,80px) clamp(16px,4vw,48px)'}}>
          <Reveal><div className="text-center" style={{maxWidth:500,margin:'0 auto'}}>
            <h3 style={{fontFamily:serif,fontSize:'clamp(24px,3vw,36px)',fontWeight:700,marginBottom:12}}>Like what you see?</h3>
            <p className="mb-6" style={{color:'#8a8078',fontStyle:'italic'}}>Let us bring the same quality to your project.</p>
            <button onClick={()=>{onCTAClick();go('contact')}} className="cs-btn">Start Your Project <ArrowRight size={15}/></button>
          </div></Reveal>
        </section>
      </div>

      {/* =============== CONTACT PAGE =============== */}
      <div data-page="contact" style={{display:page==='contact'?'block':'none'}}>
        <section style={{padding:'clamp(120px,16vh,180px) clamp(16px,4vw,48px) 0'}}><div style={{maxWidth:1100,margin:'0 auto'}}>
          <Reveal><p style={{fontFamily:label,fontSize:12,color:A,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:6}}>Contact</p></Reveal>
          <Reveal delay={80}><h1 style={{fontFamily:serif,fontSize:'clamp(36px,5vw,56px)',fontWeight:700,marginBottom:16}}>Get in touch</h1></Reveal>
        </div></section>
        <Ornament color={A}/>

        <section style={{padding:'0 clamp(16px,4vw,48px) clamp(60px,8vw,100px)'}}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16" style={{maxWidth:1100,margin:'0 auto'}}>
            {/* Left column — contact info + service area + FAQ */}
            <div>
              <Reveal><div className="mb-10">
                {[lead.phone&&[<Phone size={18} key="p"/>,fmt(lead.phone),'Call us anytime'],lead.email&&[<Mail size={18} key="e"/>,lead.email,'We respond promptly'],lead.enrichedAddress&&[<MapPin size={18} key="m"/>,lead.enrichedAddress,loc]].filter(Boolean).map((item,i)=>{
                  const [icon,main,sub]=item as [React.ReactNode,string,string]
                  return(<div key={i} className="flex gap-4 mb-6"><div className="w-11 h-11 flex items-center justify-center flex-shrink-0 text-white" style={{background:A}}>{icon}</div><div><p className="font-semibold">{main}</p><p className="text-[13px] mt-0.5" style={{color:'#8a8078'}}>{sub}</p></div></div>)
                })}
              </div></Reveal>

              {/* Service area */}
              <Reveal delay={80}><div className="mb-10 p-5" style={{background:'#EDE8DF',borderLeft:`3px solid ${A}`}}>
                <p className="text-sm font-semibold mb-1" style={{fontFamily:label,textTransform:'uppercase',letterSpacing:'0.04em'}}>Service Area</p>
                <p className="text-sm leading-relaxed" style={{color:'#8a8078'}}>{wc?.serviceAreaText||`We proudly serve ${loc||'the local area'} and surrounding communities. Contact us to confirm availability in your area.`}</p>
              </div></Reveal>

              {/* FAQ */}
              <Reveal delay={120}><div>
                <p style={{fontFamily:label,fontSize:12,color:A,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:16}}>FAQ</p>
                {faqs.slice(0,4).map((f,i)=>(<div key={i} style={{borderBottom:'1px solid #e8e2d8'}}>
                  <button onClick={()=>setOpenFAQ(openFAQ===i?null:i)} className="w-full flex justify-between items-center text-left" style={{background:'none',border:'none',cursor:'pointer',color:'#2C2520',padding:'14px 0'}}>
                    <span className="text-sm font-semibold pr-5" style={{fontFamily:label}}>{f.q}</span><span style={{color:openFAQ===i?A:'#c5bfb5'}}>{openFAQ===i?<Minus size={14}/>:<Plus size={14}/>}</span>
                  </button>
                  <div style={{maxHeight:openFAQ===i?200:0,opacity:openFAQ===i?1:0,overflow:'hidden',transition:'all .3s'}}><p className="text-sm leading-relaxed pb-4" style={{color:'#8a8078'}}>{f.a}</p></div>
                </div>))}
              </div></Reveal>
            </div>

            {/* Right column — estimate form */}
            <Reveal delay={120}><div style={{background:'#fff',border:'1px solid #e8e2d8',padding:36}}>
              <h3 className="text-xl font-bold mb-1" style={{fontFamily:serif}}>Request an Estimate</h3>
              <p className="text-[13px] mb-6" style={{color:'#8a8078',fontStyle:'italic'}}>Free, no-obligation. We respond within 24 hours.</p>
              {['Full Name','Phone','Email'].map(l=>(<input key={l} placeholder={l} className="w-full text-sm mb-3 outline-none" style={{padding:'14px 16px',background:'#FAF8F4',border:'1px solid #e8e2d8',color:'#2C2520',fontFamily:bodySerif,boxSizing:'border-box'}}/>))}
              {svc.length>0&&<select className="w-full text-sm mb-3" style={{padding:'14px 16px',background:'#FAF8F4',border:'1px solid #e8e2d8',color:'#8a8078',fontFamily:bodySerif,boxSizing:'border-box'}}><option>Select service</option>{svc.map(s=><option key={s}>{s}</option>)}</select>}
              <textarea placeholder="Tell us about your project..." rows={4} className="w-full text-sm mb-5 outline-none resize-none" style={{padding:'14px 16px',background:'#FAF8F4',border:'1px solid #e8e2d8',color:'#2C2520',fontFamily:bodySerif,boxSizing:'border-box'}}/>
              <button onClick={onCTAClick} className="cs-btn w-full justify-center" style={{padding:16}}>Submit Request <ArrowRight size={14}/></button>
            </div></Reveal>
          </div>
        </section>
      </div>

      {/* FOOTER */}
      <footer style={{background:'#EDE8DF',borderTop:'1px solid #d5cfc5',padding:'clamp(48px,6vw,80px) clamp(16px,4vw,48px)'}}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12" style={{maxWidth:1100,margin:'0 auto'}}>
          <div><div className="flex items-center gap-2 mb-4">{lead.logo?<img src={lead.logo} alt="" className="h-6 w-6 object-cover"/>:<span style={{fontFamily:serif,fontWeight:700,fontSize:18,color:A}}>&#x25C6;</span>}<span className="font-bold" style={{fontFamily:serif}}>{lead.companyName}</span></div>
          <p className="text-sm leading-relaxed" style={{color:'#8a8078',maxWidth:300}}>Professional {indLabel}{loc?` in ${loc}`:''}.  Licensed, insured, trusted.</p></div>
          <div><p style={{fontFamily:label,fontSize:10,color:'#8a8078',letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:14}}>Navigation</p>
          <div className="flex flex-col gap-2.5">{PAGES.map(p=><button key={p.k} onClick={()=>go(p.k)} data-nav-page={p.k==='work'?'portfolio':p.k} className="text-sm text-left p-0" style={{background:'none',border:'none',color:'#8a8078',cursor:'pointer'}}>{p.l}</button>)}</div></div>
          <div><p style={{fontFamily:label,fontSize:10,color:'#8a8078',letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:14}}>Contact</p>
          <div className="flex flex-col gap-3 text-sm" style={{color:'#8a8078'}}>
            {lead.phone&&<a href={`tel:${lead.phone}`} onClick={onCallClick} style={{textDecoration:'none',color:'inherit'}}>{fmt(lead.phone)}</a>}
            {lead.email&&<a href={`mailto:${lead.email}`} style={{textDecoration:'none',color:'inherit'}}>{lead.email}</a>}
            {loc&&<span>{loc}</span>}
          </div></div>
        </div>
        <div className="flex flex-wrap justify-between items-center gap-4" style={{maxWidth:1100,margin:'0 auto',borderTop:'1px solid #d5cfc5',paddingTop:24}}>
          <p className="text-xs" style={{color:'#b5afa5'}}>&copy; {new Date().getFullYear()} {lead.companyName}</p>
          <span className="text-[10px]" style={{color:'#c5bfb5'}}>Powered by <a href="https://brightautomations.com" target="_blank" rel="noopener noreferrer" style={{color:'#a5a095'}}>Bright Automations</a></span>
        </div>
      </footer>

      {/* LIGHTBOX with prev/next */}
      {lb!==null&&photos[lb]&&(<div className="fixed inset-0 z-[200] flex items-center justify-center p-5" style={{background:'rgba(44,37,32,.92)'}} onClick={()=>setLb(null)}>
        <img src={photos[lb]} alt="" style={{maxWidth:'85%',maxHeight:'82vh',objectFit:'contain'}}/>
        <button className="absolute top-6 right-6 w-11 h-11 flex items-center justify-center text-white cursor-pointer" style={{background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.2)'}} onClick={e=>{e.stopPropagation();setLb(null)}}><X size={18}/></button>
        {lb>0&&<button className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-white cursor-pointer" style={{background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.2)'}} onClick={e=>{e.stopPropagation();setLb(lb-1)}}><ChevronLeft size={20}/></button>}
        {lb<photos.length-1&&<button className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-white cursor-pointer" style={{background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.2)'}} onClick={e=>{e.stopPropagation();setLb(lb+1)}}><ChevronRight size={20}/></button>}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white text-xs" style={{fontFamily:label,letterSpacing:'0.08em',opacity:0.5}}>{lb+1} / {photos.length}</div>
      </div>)}

      <ChatWidget name={lead.companyName} accent={A}/>
      <div className="h-16 sm:h-0"/>
    </div>
  )
}
