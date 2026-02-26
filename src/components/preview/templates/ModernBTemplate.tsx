'use client'
/*
 * ZEPHYR TEMPLATE — Modern-B
 * Organic modern, soft sage/cream, geometric-organic shapes, Quicksand accent, bottom-sheet nav
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
  return m[config.accentColor] || '#14b8a6'
}

function Counter({ end, suffix='', dur=2200 }: { end: number; suffix?: string; dur?: number }) {
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

function Reveal({ children, delay=0, className='' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const [vis, setVis] = useState(false); const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => { if(e.isIntersecting){setVis(true);obs.disconnect()} }, { threshold:0.08 })
    obs.observe(el); return () => obs.disconnect()
  }, [])
  return <div ref={ref} className={className} style={{ opacity:vis?1:0, transform:vis?'scale(1) translateY(0)':'scale(0.95) translateY(22px)', transition:`opacity 0.8s cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 0.8s cubic-bezier(0.22,1,0.36,1) ${delay}ms` }}>{children}</div>
}

function ChatWidget({ name, accent }: { name: string; accent: string }) {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<{from:string;text:string}[]>([])
  const [input, setInput] = useState(''); const [typing, setTyping] = useState(false)
  const endRef = useRef<HTMLDivElement>(null); const inRef = useRef<HTMLInputElement>(null)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }) }, [msgs])
  useEffect(() => {
    if(open && msgs.length===0){ setTyping(true); const t=setTimeout(()=>{setMsgs([{from:'bot',text:`Hey there! Thanks for visiting ${name}. What can we help with?`}]);setTyping(false)},700); return()=>clearTimeout(t) }
    if(open) setTimeout(()=>inRef.current?.focus(),100)
  }, [open,name])
  const send = (t?:string) => {
    const m=t||input.trim(); if(!m) return; setMsgs(p=>[...p,{from:'user',text:m}]); setInput(''); setTyping(true)
    setTimeout(()=>{
      let r="Thanks! We'll follow up shortly. For the fastest answer, give us a call."
      if(m.toLowerCase().includes('estimat')||m.toLowerCase().includes('quot')) r="Absolutely! Free estimates on everything. Drop your details or call us."
      else if(m.toLowerCase().includes('servic')) r="We offer a full range — check the Services page or ask away!"
      else if(m.toLowerCase().includes('hour')) r="Mon-Sat regular hours, plus 24/7 emergency availability."
      setMsgs(p=>[...p,{from:'bot',text:r}]); setTyping(false)
    },1000)
  }
  return (<>
    <button onClick={()=>setOpen(!open)} className="fixed bottom-6 right-5 z-[100] sm:bottom-6 bottom-20" aria-label="Chat">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg text-white" style={{background:accent,borderRadius:'28% 72% 72% 28% / 72% 28% 72% 28%'}}>{open?<X size={22}/>:<MessageCircle size={22}/>}</div>
    </button>
    {open&&(<div className="fixed sm:bottom-24 bottom-28 right-5 z-[100] w-[370px] max-w-[calc(100vw-2.5rem)] shadow-2xl overflow-hidden" style={{borderRadius:20,border:'1px solid #eee',background:'#FFFCF7'}}>
      <div className="px-5 py-4 text-white" style={{background:accent,borderRadius:'0 0 24px 24px'}}>
        <p className="font-bold text-sm">{name}</p>
        <p className="text-[10px] opacity-60 mt-0.5">AI Assistant by Bright Automations</p>
      </div>
      <div className="h-[260px] overflow-y-auto px-4 py-4 space-y-3">
        {msgs.map((m,i)=>(<div key={i} className={`flex ${m.from==='user'?'justify-end':'justify-start'}`}><div className={`max-w-[80%] px-4 py-2.5 text-sm leading-relaxed ${m.from==='user'?'text-white':'text-gray-600 border border-gray-100'}`} style={m.from==='user'?{background:accent,borderRadius:'20px 20px 4px 20px'}:{background:'#fff',borderRadius:'20px 20px 20px 4px'}}>{m.text}</div></div>))}
        {typing&&<div className="flex justify-start"><div className="bg-white px-4 py-3 border border-gray-100" style={{borderRadius:20}}><div className="flex gap-1">{[0,150,300].map(d=><span key={d} className="w-2 h-2 rounded-full animate-bounce" style={{background:accent,opacity:0.4,animationDelay:`${d}ms`}}/>)}</div></div></div>}
        <div ref={endRef}/>
      </div>
      <div className="px-4 py-3 border-t border-gray-100"><div className="flex gap-2">
        <input ref={inRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Type a message..." className="flex-1 text-sm px-4 py-2.5 bg-white rounded-full border border-gray-200 text-gray-800 focus:outline-none placeholder:text-gray-400"/>
        <button onClick={()=>send()} disabled={!input.trim()} className="w-10 h-10 rounded-full flex items-center justify-center text-white disabled:opacity-30" style={{background:accent}}><Send size={15}/></button>
      </div></div>
    </div>)}
  </>)
}

export default function ModernBTemplate({ lead, config, onCTAClick, onCallClick, websiteCopy }: TemplateProps) {
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
  const wc = websiteCopy
  const loc = [lead.city,lead.state].filter(Boolean).join(', ')
  const indLabel = lead.industry.toLowerCase().replace(/_/g,' ')
  const hasR = lead.enrichedRating && lead.enrichedRating > 0
  const A = getAccent(config)

  const svcData = svc.map((n,i) => ({ name:n, desc: wc?.serviceDescriptions?.[n] || `Professional ${n.toLowerCase()} services you can count on.`, img: photos.length > 0 ? photos[i % photos.length] : undefined }))
  const testis = [
    { text: wc?.testimonialQuote || `We loved working with ${lead.companyName}. They really listened and delivered exactly what we wanted.`, name: wc?.testimonialAuthor || 'Anna B.', loc: lead.city||'Local' },
    ...(wc?.additionalTestimonials?.map(t=>({text:t.quote,name:t.author,loc:lead.city||'Local'})) || [
      { text: "Professional, friendly, and the quality was beyond what we expected. Five stars.", name:'Tom H.', loc:lead.city||'Local' },
      { text: "They made the whole process so easy. Would recommend to anyone in the area.", name:'Karen S.', loc:lead.city||'Local' },
    ])
  ]
  const steps = wc?.processSteps || [
    { title:'Reach Out', description:'Give us a call or fill out the contact form to get things started.' },
    { title:'Free Estimate', description:'We visit your property and provide a no-obligation quote.' },
    { title:'Expert Work', description:'Our skilled team completes the project with care and precision.' },
    { title:'Final Walkthrough', description:'We review everything together to make sure you love it.' },
  ]
  const whyUs = wc?.whyChooseUs || wc?.valueProps || [
    { title:'Licensed & Insured', description:'Full coverage on every project for your peace of mind.' },
    { title:'Fast Response', description:'Same-day estimates and quick project turnaround times.' },
    { title:'Guaranteed Work', description:'100% satisfaction guaranteed or we make it right.' },
  ]
  const brands = wc?.brandNames || []
  const faqs = [
    { q:'How do I get started?', a:'Simply call us or fill out the contact form — we\'ll get back to you same-day.' },
    { q:'Are estimates free?', a:'Always. No obligation, no pressure — just honest pricing.' },
    { q:'What\'s your service area?', a:`We proudly serve ${loc||'your area'} and surrounding communities.` },
    { q:'Are you licensed and insured?', a:'Fully licensed, bonded, and insured on every single project.' },
    { q:'How long does a typical project take?', a:'It depends on the scope, but we always provide a clear timeline upfront so there are no surprises.' },
  ]
  const PAGES = [{k:'home' as const,l:'Home'},{k:'services' as const,l:'Services'},{k:'about' as const,l:'About'},{k:'work' as const,l:'Portfolio'},{k:'contact' as const,l:'Contact'}]

  const sans = "'Outfit','Inter',sans-serif"
  const body = "'Source Sans 3','Helvetica Neue',sans-serif"
  const accent_font = "'Quicksand','Nunito',sans-serif"

  return (
    <div className="preview-template min-h-screen antialiased" style={{fontFamily:body,background:'#F7F7F2',color:'#2D2D2D',overflowX:'hidden'}}>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Source+Sans+3:wght@400;500;600;700&family=Quicksand:wght@500;600;700&display=swap');
        @keyframes zephyr-sheet{from{transform:translateY(100%)}to{transform:translateY(0)}}
        .zephyr-btn{display:inline-flex;align-items:center;gap:8px;background:${A};color:#fff;padding:15px 32px;font-weight:600;font-size:15px;border-radius:999px;border:none;cursor:pointer;transition:all .3s;font-family:${body};text-decoration:none}
        .zephyr-btn:hover{transform:translateY(-2px);box-shadow:0 12px 32px ${A}30}
        .zephyr-btn-o{display:inline-flex;align-items:center;gap:8px;background:transparent;color:#2D2D2D;padding:15px 32px;border-radius:999px;border:1.5px solid #ddd;font-weight:600;font-size:15px;cursor:pointer;transition:all .3s;font-family:${body};text-decoration:none}
        .zephyr-btn-o:hover{border-color:${A};color:${A}}
        .zephyr-lift{transition:transform .35s ease,box-shadow .35s ease}.zephyr-lift:hover{transform:translateY(-4px);box-shadow:0 16px 48px rgba(0,0,0,.06)}
        .zephyr-img-zoom{transition:transform .6s ease}.zephyr-img-zoom:hover{transform:scale(1.04)}
        ::selection{background:${A}22;color:#2D2D2D}
      ` }} />

      <DisclaimerBanner variant="modern-b" companyName={lead.companyName}/>

      {/* NAV */}
      <nav style={{position:'fixed',top:0,left:0,right:0,zIndex:50,background:navSolid?'rgba(247,247,242,0.92)':'transparent',backdropFilter:navSolid?'blur(20px)':'none',borderBottom:navSolid?'1px solid rgba(0,0,0,0.05)':'none',transition:'all .4s',padding:'0 clamp(16px,4vw,48px)'}}>
        <div style={{maxWidth:1340,margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'space-between',height:navSolid?60:76,transition:'height .4s'}}>
          <button onClick={()=>go('home')} className="flex items-center gap-2.5" style={{background:'none',border:'none',cursor:'pointer'}}>
            {lead.logo?<img src={lead.logo} alt="" className="h-7 w-7 object-cover" style={{borderRadius:'30%'}}/>:<div className="w-3 h-3" style={{background:A,borderRadius:'30%'}}/>}
            <span className="font-bold" style={{fontFamily:sans,fontSize:17}}>{lead.companyName}</span>
          </button>
          <div className="hidden lg:flex items-center gap-1">{PAGES.map(p=>(
            <button key={p.k} onClick={()=>go(p.k)} className="text-[14px] font-medium px-4 py-2 transition-colors" style={{background:'none',border:'none',cursor:'pointer',color:page===p.k?A:'#888',borderRadius:12}}>{p.l}</button>
          ))}</div>
          <div className="flex items-center gap-3">
            {lead.phone&&<a href={`tel:${lead.phone}`} onClick={onCallClick} className="hidden lg:flex items-center gap-2 text-[13px] font-medium" style={{color:'#999',textDecoration:'none'}}><Phone size={14}/>{fmt(lead.phone)}</a>}
            <button onClick={()=>{onCTAClick();go('contact')}} className="zephyr-btn hidden sm:inline-flex" style={{padding:'10px 24px',fontSize:13}}>Free Quote</button>
            <button onClick={()=>setMobNav(!mobNav)} className="lg:hidden flex items-center justify-center" style={{width:42,height:42,background:'rgba(45,45,45,0.06)',border:'1px solid rgba(0,0,0,0.08)',borderRadius:12,cursor:'pointer',color:'#2D2D2D'}}><Menu size={20}/></button>
          </div>
        </div>
      </nav>

      {/* MOBILE BOTTOM SHEET NAV */}
      {mobNav&&(<>
        <div className="fixed inset-0 z-[89] bg-black/30" onClick={()=>setMobNav(false)}/>
        <div className="fixed bottom-0 left-0 right-0 z-[90] p-5" style={{background:'#FFFCF7',borderRadius:'24px 24px 0 0',animation:'zephyr-sheet .3s ease forwards',boxShadow:'0 -10px 40px rgba(0,0,0,.1)'}}>
          <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-6"/>
          <div className="flex flex-col gap-1 mb-6">{PAGES.map(p=>(
            <button key={p.k} onClick={()=>go(p.k)} className="text-left text-lg font-semibold py-3 px-4 rounded-xl transition-colors" style={{background:page===p.k?`${A}10`:'transparent',color:page===p.k?A:'#2D2D2D',border:'none',cursor:'pointer',fontFamily:sans}}>{p.l}</button>
          ))}</div>
          {lead.phone&&<a href={`tel:${lead.phone}`} onClick={onCallClick} className="zephyr-btn w-full justify-center mb-2"><Phone size={16}/>{fmt(lead.phone)}</a>}
          <div style={{height:'env(safe-area-inset-bottom, 8px)'}}/>
        </div>
      </>)}

      {/* ═══════════════ HOME ═══════════════ */}
      <div data-page="home" style={{display:page==='home'?'block':'none'}}>
        {/* HERO */}
        <section className="relative overflow-hidden" style={{paddingTop:'clamp(100px,14vh,160px)',paddingBottom:'clamp(60px,8vh,100px)',paddingLeft:'clamp(16px,4vw,48px)',paddingRight:'clamp(16px,4vw,48px)'}}>
          <div className="absolute -top-20 -right-20 w-64 h-64 opacity-[0.06]" style={{background:A,borderRadius:'40%'}}/>
          <div className="absolute bottom-10 -left-16 w-48 h-48 opacity-[0.04]" style={{background:A,borderRadius:'40%'}}/>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative" style={{maxWidth:1280,margin:'0 auto'}}>
            <div>
              <Reveal><p style={{fontFamily:accent_font,fontSize:14,fontWeight:600,color:A,marginBottom:16}}>Trusted locally &middot; {loc||'Your community'}</p></Reveal>
              <Reveal delay={100}><h1 style={{fontFamily:sans,fontSize:'clamp(36px,5vw,60px)',fontWeight:800,lineHeight:1.08,letterSpacing:'-0.02em',marginBottom:20}}>{wc?.heroHeadline||config.tagline||`Quality ${indLabel} done right.`}</h1></Reveal>
              {wc?.heroSubheadline&&<Reveal delay={200}><p className="text-lg mb-8" style={{color:'#888',lineHeight:1.7,maxWidth:440}}>{wc.heroSubheadline}</p></Reveal>}
              <Reveal delay={300}><div className="flex flex-wrap gap-3">
                <button onClick={()=>{onCTAClick();go('contact')}} className="zephyr-btn">{config.ctaText||'Get Free Estimate'} <ArrowRight size={16}/></button>
                {lead.phone&&<a href={`tel:${lead.phone}`} onClick={onCallClick} className="zephyr-btn-o"><Phone size={16}/>Call Us</a>}
              </div></Reveal>
              {hasR&&<Reveal delay={400}><div className="flex items-center gap-4 mt-10">
                <div className="flex gap-0.5">{Array.from({length:5},(_,i)=><Star key={i} size={16} className="fill-current" style={{color:'#f59e0b'}}/>)}</div>
                <span className="text-sm font-medium" style={{color:'#999'}}>{lead.enrichedRating}/5 from {lead.enrichedReviews||'many'} reviews</span>
              </div></Reveal>}
            </div>
            <Reveal delay={200}><div className="relative">
              {photos[0] ? (
                <img src={photos[0]} alt="" className="w-full object-cover" style={{borderRadius:20,aspectRatio:'4/3',display:'block',boxShadow:'0 24px 64px rgba(0,0,0,.08)'}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
              ) : (
                <PhotoPlaceholder accent={A} aspectRatio="4/3" style={{borderRadius:20,boxShadow:'0 24px 64px rgba(0,0,0,.08)'}} />
              )}
              <div className="absolute -bottom-3 -right-3 w-32 h-32 opacity-[0.08] -z-10" style={{background:A,borderRadius:'40%'}}/>
            </div></Reveal>
          </div>
        </section>

        {/* SERVICES PREVIEW */}
        {svc.length>0&&(<section style={{padding:'clamp(60px,8vw,100px) clamp(16px,4vw,48px)',background:'#FFF8F0'}}>
          <div style={{maxWidth:1200,margin:'0 auto'}}>
            <Reveal><div className="flex flex-wrap justify-between items-end gap-4 mb-12">
              <div><p style={{fontFamily:accent_font,fontSize:13,fontWeight:600,color:A,marginBottom:8}}>What we do</p>
              <h2 style={{fontFamily:sans,fontSize:'clamp(28px,3.5vw,44px)',fontWeight:700,letterSpacing:'-0.01em'}}>Our services</h2></div>
              <button onClick={()=>go('services')} className="zephyr-btn-o" style={{padding:'10px 24px',fontSize:13}}>View all <ArrowRight size={14}/></button>
            </div></Reveal>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {svcData.slice(0,6).map((s,i)=>(
                <Reveal key={i} delay={i*70}><div onClick={()=>go('services')} className="zephyr-lift cursor-pointer p-7" style={{background:'#fff',borderRadius:16,border:'1px solid rgba(0,0,0,0.04)'}}>
                  <div className="w-10 h-10 flex items-center justify-center mb-5 text-white font-bold text-sm" style={{background:A,borderRadius:'30%'}}>{String(i+1).padStart(2,'0')}</div>
                  <h3 className="text-lg font-bold mb-2">{s.name}</h3>
                  <p className="text-sm leading-relaxed" style={{color:'#888'}}>{s.desc}</p>
                </div></Reveal>
              ))}
            </div>
          </div>
        </section>)}

        {/* STATS */}
        <section style={{padding:'clamp(60px,8vw,100px) clamp(16px,4vw,48px)'}}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8" style={{maxWidth:1000,margin:'0 auto'}}>
            {[{v:hasR?Number(lead.enrichedRating):5.0,s:'',l:'Star Rating'},{v:lead.enrichedReviews||100,s:'+',l:'Happy Clients'},{v:10,s:'+',l:'Years Experience'},{v:100,s:'%',l:'Satisfaction'}].map((st,i)=>(
              <Reveal key={i} delay={i*100}><div className="text-center">
                <p style={{fontFamily:sans,fontSize:'clamp(36px,5vw,52px)',fontWeight:800,color:'#2D2D2D'}}><Counter end={st.v} suffix={st.s}/></p>
                <p className="text-sm font-medium mt-1" style={{color:'#aaa'}}>{st.l}</p>
              </div></Reveal>
            ))}
          </div>
        </section>

        {/* PHOTO BREAK */}
        <Reveal><section className="relative overflow-hidden" style={{margin:'0 clamp(16px,4vw,48px)',borderRadius:20,height:'50vh',minHeight:320}}>
          {photos[1] ? (
            <div className="absolute inset-0"><img src={photos[1]} alt="" className="w-full h-full object-cover" onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/></div>
          ) : (
            <div className="absolute inset-0" style={{background:`linear-gradient(135deg, ${A}18 0%, ${A}35 100%)`}} />
          )}
          <div className="absolute inset-0" style={{background: photos[1] ? 'rgba(45,45,45,0.45)' : 'transparent'}}/>
          <div className="relative h-full flex items-center justify-center text-center p-6">
            <p style={{fontFamily:sans,fontSize:'clamp(24px,3.5vw,40px)',fontWeight:700,lineHeight:1.2,maxWidth:600,color: photos[1] ? '#fff' : '#333'}}>"{wc?.closingHeadline||`Quality you can see. Service you can feel.`}"</p>
          </div>
        </section></Reveal>

        {/* TESTIMONIALS */}
        <section style={{padding:'clamp(60px,8vw,100px) clamp(16px,4vw,48px)',background:'#FFF8F0'}}>
          <div style={{maxWidth:1200,margin:'0 auto'}}>
            <Reveal><p style={{fontFamily:accent_font,fontSize:13,fontWeight:600,color:A,marginBottom:8}}>Kind words</p>
            <h2 style={{fontFamily:sans,fontSize:'clamp(28px,3.5vw,44px)',fontWeight:700,marginBottom:48}}>What clients say</h2></Reveal>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">{testis.slice(0,3).map((t,i)=>(
              <Reveal key={i} delay={i*100}><div className="zephyr-lift p-7" style={{background:'#fff',borderRadius:16}}>
                <div className="flex gap-0.5 mb-4">{Array.from({length:5},(_,j)=><Star key={j} size={14} className="fill-current" style={{color:'#f59e0b'}}/>)}</div>
                <p className="text-[15px] leading-relaxed mb-6" style={{color:'#666'}}>"{t.text}"</p>
                <div className="flex items-center gap-3"><div className="w-9 h-9 flex items-center justify-center text-white text-sm font-bold" style={{background:A,borderRadius:'30%'}}>{t.name[0]}</div>
                <div><p className="text-sm font-semibold">{t.name}</p><p className="text-xs" style={{color:'#bbb'}}>{t.loc}</p></div></div>
              </div></Reveal>
            ))}</div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative overflow-hidden" style={{padding:'clamp(60px,8vw,100px) clamp(16px,4vw,48px)'}}>
          <div className="absolute inset-0" style={{background:`radial-gradient(ellipse at center, ${A}10 0%, transparent 70%)`}}/>
          <Reveal><div className="relative text-center" style={{maxWidth:560,margin:'0 auto'}}>
            <h2 style={{fontFamily:sans,fontSize:'clamp(28px,4vw,44px)',fontWeight:700,marginBottom:16}}>Ready to get started?</h2>
            <p className="text-base mb-8" style={{color:'#888'}}>Free estimate, no obligation. We'll get back to you same-day.</p>
            <div className="flex flex-wrap justify-center gap-3">
              <button onClick={()=>{onCTAClick();go('contact')}} className="zephyr-btn">Get Estimate <ArrowRight size={16}/></button>
              {lead.phone&&<a href={`tel:${lead.phone}`} onClick={onCallClick} className="zephyr-btn-o"><Phone size={16}/>{fmt(lead.phone)}</a>}
            </div>
          </div></Reveal>
        </section>
      </div>

      {/* ═══════════════ SERVICES PAGE ═══════════════ */}
      <div data-page="services" style={{display:page==='services'?'block':'none'}}>
        <section style={{padding:'clamp(100px,14vh,160px) clamp(16px,4vw,48px) 60px'}}><div style={{maxWidth:1200,margin:'0 auto'}}>
          <Reveal><p style={{fontFamily:accent_font,fontSize:13,fontWeight:600,color:A,marginBottom:8}}>Services</p></Reveal>
          <Reveal delay={80}><h1 style={{fontFamily:sans,fontSize:'clamp(36px,5vw,60px)',fontWeight:700,letterSpacing:'-0.02em',marginBottom:16}}>What we offer</h1></Reveal>
          <Reveal delay={160}><p className="text-lg" style={{color:'#888',maxWidth:480}}>Professional {indLabel}{loc?` in ${loc}`:''} and beyond.</p></Reveal>
        </div></section>

        {/* Service cards with photo thumbnails */}
        <section style={{padding:'0 clamp(16px,4vw,48px) clamp(60px,8vw,100px)'}}>
          <div style={{maxWidth:1200,margin:'0 auto'}}>{svcData.map((s,i)=>(
            <Reveal key={i} delay={i*60}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0 mb-5 zephyr-lift overflow-hidden" style={{background:'#fff',borderRadius:20,border:'1px solid rgba(0,0,0,0.04)'}}>
                <div className="relative overflow-hidden" style={{minHeight:220}}>
                  {s.img ? (
                    <img src={s.img} alt={s.name} className="w-full h-full object-cover" style={{display:'block'}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
                  ) : (
                    <PhotoPlaceholder accent={A} style={{width:'100%',height:'100%',minHeight:220}} />
                  )}
                  <div className="absolute top-4 left-4"><span className="text-xs font-bold px-3 py-1.5 text-white" style={{background:`${A}cc`,borderRadius:999}}>{String(i+1).padStart(2,'0')}</span></div>
                </div>
                <div className="flex flex-col justify-between p-8 md:p-10">
                  <div>
                    <h3 className="text-xl font-bold mb-3" style={{fontFamily:sans}}>{s.name}</h3>
                    <p className="text-[15px] leading-relaxed" style={{color:'#888'}}>{s.desc}</p>
                  </div>
                  <button onClick={()=>{onCTAClick();go('contact')}} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold p-0" style={{background:'none',border:'none',color:A,cursor:'pointer'}}>Get estimate <ArrowRight size={14}/></button>
                </div>
              </div>
            </Reveal>
          ))}</div>
        </section>

        {/* Process Steps */}
        <section style={{padding:'clamp(60px,8vw,100px) clamp(16px,4vw,48px)',background:'#FFF8F0'}}>
          <div style={{maxWidth:1000,margin:'0 auto'}}>
            <Reveal><p style={{fontFamily:accent_font,fontSize:13,fontWeight:600,color:A,marginBottom:8}}>Our process</p>
            <h2 style={{fontFamily:sans,fontSize:'clamp(28px,3.5vw,44px)',fontWeight:700,marginBottom:48}}>How it works</h2></Reveal>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">{steps.slice(0,4).map((s,i)=>(
              <Reveal key={i} delay={i*100}>
                <div className="text-center">
                  <div className="w-14 h-14 mx-auto mb-5 flex items-center justify-center text-lg font-bold text-white" style={{background:A,borderRadius:'30%'}}>{String(i+1).padStart(2,'0')}</div>
                  <h4 className="text-lg font-bold mb-2" style={{fontFamily:sans}}>{s.title}</h4>
                  <p className="text-sm leading-relaxed" style={{color:'#888'}}>{s.description}</p>
                </div>
              </Reveal>
            ))}</div>
          </div>
        </section>

        {/* CTA band */}
        <section className="relative overflow-hidden text-center" style={{padding:'clamp(60px,8vw,100px) clamp(16px,4vw,48px)'}}>
          <div className="absolute -top-12 -left-12 w-48 h-48 opacity-[0.05]" style={{background:A,borderRadius:'40%'}}/>
          <Reveal><div className="relative" style={{maxWidth:480,margin:'0 auto'}}>
            <h2 style={{fontFamily:sans,fontSize:'clamp(24px,3vw,36px)',fontWeight:700,marginBottom:28}}>Not sure what you need?</h2>
            <div className="flex flex-wrap justify-center gap-3">
              <button onClick={()=>{onCTAClick();go('contact')}} className="zephyr-btn">Talk to Us <ArrowRight size={16}/></button>
              {lead.phone&&<a href={`tel:${lead.phone}`} onClick={onCallClick} className="zephyr-btn-o"><Phone size={16}/>Call</a>}
            </div>
          </div></Reveal>
        </section>
      </div>

      {/* ═══════════════ ABOUT PAGE ═══════════════ */}
      <div data-page="about" style={{display:page==='about'?'block':'none'}}>
        {/* Intro */}
        <section style={{padding:'clamp(100px,14vh,160px) clamp(16px,4vw,48px) 60px'}}><div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-end" style={{maxWidth:1200,margin:'0 auto'}}>
          <Reveal><div><p style={{fontFamily:accent_font,fontSize:13,fontWeight:600,color:A,marginBottom:8}}>About us</p><h1 style={{fontFamily:sans,fontSize:'clamp(36px,5vw,60px)',fontWeight:700,letterSpacing:'-0.02em'}}>Our story</h1></div></Reveal>
          <Reveal delay={150}><p className="text-[17px] leading-relaxed" style={{color:'#777'}}>{wc?.aboutParagraph1||`${lead.companyName} provides professional ${indLabel}${loc?` in ${loc}`:''}.`}</p></Reveal>
        </div></section>

        {/* Photo + second paragraph */}
        <section style={{padding:'0 clamp(16px,4vw,48px) clamp(60px,8vw,80px)'}}><div style={{maxWidth:1200,margin:'0 auto'}}>
          <Reveal><div className="overflow-hidden mb-10" style={{borderRadius:20}}>{photos[3] ? <img src={photos[3]} alt="" className="w-full object-cover" style={{height:380,display:'block'}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/> : <PhotoPlaceholder accent={A} height={380} style={{borderRadius:20}} />}</div></Reveal>
          {wc?.aboutParagraph2&&<Reveal><p className="text-base leading-relaxed mb-10" style={{color:'#777',maxWidth:680}}>{wc.aboutParagraph2}</p></Reveal>}
        </div></section>

        {/* Why Choose Us */}
        <section style={{padding:'clamp(40px,6vw,80px) clamp(16px,4vw,48px)',background:'#FFF8F0'}}>
          <div style={{maxWidth:1200,margin:'0 auto'}}>
            <Reveal><h2 style={{fontFamily:sans,fontSize:'clamp(28px,3.5vw,44px)',fontWeight:700,marginBottom:48}}>Why choose us</h2></Reveal>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">{whyUs.slice(0,3).map((vp,i)=>(
              <Reveal key={i} delay={i*80}><div className="zephyr-lift p-7" style={{background:'#fff',borderRadius:16}}>
                <div className="w-10 h-10 flex items-center justify-center mb-5 text-white" style={{background:A,borderRadius:'30%'}}><CheckCircle size={18}/></div>
                <h4 className="font-bold text-lg mb-2" style={{fontFamily:sans}}>{vp.title}</h4><p className="text-sm leading-relaxed" style={{color:'#888'}}>{vp.description}</p>
              </div></Reveal>
            ))}</div>
          </div>
        </section>

        {/* Stats */}
        <section style={{padding:'clamp(40px,6vw,80px) clamp(16px,4vw,48px)'}}>
          <div className="flex flex-wrap gap-12 justify-center" style={{maxWidth:1000,margin:'0 auto'}}>
            {hasR&&<Reveal><div className="text-center"><p style={{fontFamily:sans,fontSize:52,fontWeight:800}}>{lead.enrichedRating}</p><p className="text-sm mt-1 font-medium" style={{color:'#aaa'}}>Rating</p></div></Reveal>}
            {lead.enrichedReviews&&<Reveal delay={100}><div className="text-center"><p style={{fontFamily:sans,fontSize:52,fontWeight:800}}><Counter end={lead.enrichedReviews} suffix="+"/></p><p className="text-sm mt-1 font-medium" style={{color:'#aaa'}}>Reviews</p></div></Reveal>}
            <Reveal delay={200}><div className="text-center"><p style={{fontFamily:sans,fontSize:52,fontWeight:800}}>100%</p><p className="text-sm mt-1 font-medium" style={{color:'#aaa'}}>Satisfaction</p></div></Reveal>
            <Reveal delay={300}><div className="text-center"><p style={{fontFamily:sans,fontSize:52,fontWeight:800}}><Counter end={svc.length}/></p><p className="text-sm mt-1 font-medium" style={{color:'#aaa'}}>Services</p></div></Reveal>
          </div>
        </section>

        {/* Testimonials */}
        <section style={{padding:'clamp(40px,6vw,80px) clamp(16px,4vw,48px)',background:'#FFF8F0'}}>
          <div style={{maxWidth:1200,margin:'0 auto'}}>
            <Reveal><h2 style={{fontFamily:sans,fontSize:'clamp(28px,3.5vw,44px)',fontWeight:700,marginBottom:48}}>What clients say</h2></Reveal>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">{testis.slice(0,3).map((t,i)=>(
              <Reveal key={i} delay={i*100}><div className="zephyr-lift p-7" style={{background:'#fff',borderRadius:16}}>
                <Quote size={32} style={{color:A,opacity:0.12,marginBottom:8}}/>
                <p className="text-[15px] leading-relaxed mb-6" style={{color:'#666'}}>"{t.text}"</p>
                <div className="flex items-center gap-3"><div className="w-9 h-9 flex items-center justify-center text-white text-sm font-bold" style={{background:A,borderRadius:'30%'}}>{t.name[0]}</div>
                <div><p className="text-sm font-semibold">{t.name}</p><p className="text-xs" style={{color:'#bbb'}}>{t.loc}</p></div></div>
              </div></Reveal>
            ))}</div>
          </div>
        </section>

        {/* Brand Partners */}
        {brands.length>0&&(<section style={{padding:'clamp(40px,6vw,60px) clamp(16px,4vw,48px)',borderTop:'1px solid #eee'}}>
          <div className="text-center" style={{maxWidth:800,margin:'0 auto'}}>
            <p style={{fontFamily:accent_font,fontSize:12,fontWeight:600,color:'#bbb',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:24}}>Trusted Brands We Work With</p>
            <div className="flex flex-wrap justify-center gap-8">{brands.map((b,i)=>(
              <span key={i} className="text-lg font-bold" style={{color:'#d4d0ca'}}>{b}</span>
            ))}</div>
          </div>
        </section>)}

        {/* FAQ */}
        <section style={{padding:'clamp(40px,6vw,80px) clamp(16px,4vw,48px)',background:brands.length>0?'#F7F7F2':undefined,borderTop:brands.length>0?undefined:'1px solid #eee'}}>
          <div style={{maxWidth:700,margin:'0 auto'}}>
            <Reveal><h2 style={{fontFamily:sans,fontSize:'clamp(24px,3vw,36px)',fontWeight:700,marginBottom:40}}>Common questions</h2></Reveal>
            {faqs.map((f,i)=>(<Reveal key={i} delay={i*50}><div style={{borderBottom:'1px solid #eee'}}>
              <button onClick={()=>setOpenFAQ(openFAQ===i?null:i)} className="w-full flex justify-between items-center text-left" style={{background:'none',border:'none',cursor:'pointer',color:'#2D2D2D',padding:'18px 0'}}>
                <span className="text-[15px] font-semibold pr-5">{f.q}</span><span style={{color:openFAQ===i?A:'#ccc'}}>{openFAQ===i?<Minus size={16}/>:<Plus size={16}/>}</span>
              </button>
              <div style={{maxHeight:openFAQ===i?200:0,opacity:openFAQ===i?1:0,overflow:'hidden',transition:'all .3s'}}><p className="text-sm leading-relaxed pb-5" style={{color:'#888'}}>{f.a}</p></div>
            </div></Reveal>))}
          </div>
        </section>
      </div>

      {/* ═══════════════ WORK / PORTFOLIO PAGE ═══════════════ */}
      <div data-page="portfolio" style={{display:page==='work'?'block':'none'}}>
        <section style={{padding:'clamp(100px,14vh,160px) clamp(16px,4vw,48px) 48px'}}><div style={{maxWidth:1200,margin:'0 auto'}}>
          <Reveal><p style={{fontFamily:accent_font,fontSize:13,fontWeight:600,color:A,marginBottom:8}}>Portfolio</p></Reveal>
          <Reveal delay={80}><h1 style={{fontFamily:sans,fontSize:'clamp(36px,5vw,60px)',fontWeight:700,letterSpacing:'-0.02em',marginBottom:16}}>Our work</h1></Reveal>
          <Reveal delay={160}><p className="text-lg max-w-lg" style={{color:'#888',lineHeight:1.6}}>A selection of recent projects{loc?` in ${loc}`:''} and surrounding areas.</p></Reveal>
        </div></section>
        <section style={{padding:'0 clamp(16px,4vw,48px) clamp(60px,8vw,100px)'}}>
          <div style={{maxWidth:1200,margin:'0 auto'}}>
            {photos.length>0?(
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {photos.slice(0,8).map((p,i)=>(<Reveal key={i} delay={i*60}><div className="overflow-hidden cursor-pointer zephyr-lift relative group" style={{borderRadius:16}} onClick={()=>setLb(i)}>
                  <img src={p} alt="" className="w-full object-cover zephyr-img-zoom" style={{aspectRatio:i%3===0?'16/10':'4/3',display:'block'}} loading={i>1?'lazy':undefined} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
                  <div className="absolute inset-0 flex items-end p-5 opacity-0 group-hover:opacity-100 transition-opacity" style={{background:'linear-gradient(to top,rgba(0,0,0,.5),transparent)',borderRadius:16}}>
                    <p className="text-white text-sm font-semibold" style={{fontFamily:accent_font}}>View larger</p>
                  </div>
                </div></Reveal>))}
              </div>
            ):(
              <div className="text-center py-20" style={{background:'#fff',borderRadius:20}}>
                <Camera size={36} style={{color:'#ccc',margin:'0 auto 16px'}}/>
                <h3 className="text-xl font-bold mb-3">Portfolio Coming Soon</h3>
                <p className="text-sm mb-8" style={{color:'#aaa'}}>Contact us to see examples of our work.</p>
                <button onClick={()=>{onCTAClick();go('contact')}} className="zephyr-btn">Request Examples <ArrowRight size={14}/></button>
              </div>
            )}
          </div>
        </section>
        <section className="text-center" style={{padding:'clamp(60px,8vw,100px) clamp(16px,4vw,48px)',background:'#FFF8F0'}}>
          <Reveal><h2 style={{fontFamily:sans,fontSize:'clamp(24px,3vw,36px)',fontWeight:700,marginBottom:32}}>Like what you see?</h2>
          <button onClick={()=>{onCTAClick();go('contact')}} className="zephyr-btn">Discuss Your Project <ArrowRight size={14}/></button></Reveal>
        </section>
      </div>

      {/* ═══════════════ CONTACT PAGE ═══════════════ */}
      <div data-page="contact" style={{display:page==='contact'?'block':'none'}}>
        <section style={{padding:'clamp(100px,14vh,160px) clamp(16px,4vw,48px) 0'}}><div style={{maxWidth:1200,margin:'0 auto'}}>
          <Reveal><p style={{fontFamily:accent_font,fontSize:13,fontWeight:600,color:A,marginBottom:8}}>Contact</p></Reveal>
          <Reveal delay={80}><h1 style={{fontFamily:sans,fontSize:'clamp(36px,5vw,60px)',fontWeight:700,letterSpacing:'-0.02em',marginBottom:16}}>Let's talk</h1></Reveal>
        </div></section>
        <section style={{padding:'clamp(40px,6vw,80px) clamp(16px,4vw,48px)'}}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16" style={{maxWidth:1200,margin:'0 auto'}}>
            <Reveal><div>
              {/* Contact Info */}
              <div className="mb-10">
                {[lead.phone&&[<Phone size={18} key="p"/>,fmt(lead.phone),'Call or text anytime'],lead.email&&[<Mail size={18} key="e"/>,lead.email,'Same-day response'],lead.enrichedAddress&&[<MapPin size={18} key="m"/>,lead.enrichedAddress,loc]].filter(Boolean).map((item,i)=>{
                  const [icon,main,sub]=item as [React.ReactNode,string,string]
                  return(<div key={i} className="flex gap-4 mb-6"><div className="w-11 h-11 flex items-center justify-center flex-shrink-0 text-white" style={{background:A,borderRadius:'30%'}}>{icon}</div><div><p className="font-semibold">{main}</p><p className="text-[13px] mt-0.5" style={{color:'#aaa'}}>{sub}</p></div></div>)
                })}
              </div>
              {/* Service Area */}
              {wc?.serviceAreaText&&<div className="mb-10 p-5" style={{background:'#FFF8F0',borderRadius:16,border:'1px solid rgba(0,0,0,0.04)'}}>
                <p style={{fontFamily:accent_font,fontSize:12,fontWeight:600,color:A,marginBottom:6}}>Service Area</p>
                <p className="text-sm leading-relaxed" style={{color:'#777'}}>{wc.serviceAreaText}</p>
              </div>}
              {/* FAQ */}
              <div><p style={{fontFamily:accent_font,fontSize:13,fontWeight:600,color:A,marginBottom:16}}>FAQ</p>
              {faqs.map((f,i)=>(<div key={i} style={{borderBottom:'1px solid #eee'}}>
                <button onClick={()=>setOpenFAQ(openFAQ===i?null:i)} className="w-full flex justify-between items-center text-left" style={{background:'none',border:'none',cursor:'pointer',color:'#2D2D2D',padding:'16px 0'}}>
                  <span className="text-sm font-semibold pr-5">{f.q}</span><span style={{color:openFAQ===i?A:'#ccc'}}>{openFAQ===i?<Minus size={14}/>:<Plus size={14}/>}</span>
                </button>
                <div style={{maxHeight:openFAQ===i?200:0,opacity:openFAQ===i?1:0,overflow:'hidden',transition:'all .3s'}}><p className="text-sm leading-relaxed pb-4" style={{color:'#888'}}>{f.a}</p></div>
              </div>))}</div>
            </div></Reveal>
            {/* Estimate Form */}
            <Reveal delay={120}><div className="p-8" style={{background:'#fff',borderRadius:20,border:'1px solid rgba(0,0,0,0.04)',boxShadow:'0 4px 30px rgba(0,0,0,0.03)'}}>
              <h3 className="text-xl font-bold mb-1" style={{fontFamily:sans}}>Get a Free Estimate</h3>
              <p className="text-[13px] mb-6" style={{color:'#aaa'}}>No obligation. We respond fast.</p>
              {['Full Name','Phone','Email'].map(l=>(<input key={l} placeholder={l} className="w-full text-sm mb-3 outline-none" style={{padding:'14px 16px',background:'#F7F7F2',border:'1px solid #eee',borderRadius:12,color:'#2D2D2D',fontFamily:body,boxSizing:'border-box'}}/>))}
              {svc.length>0&&<select className="w-full text-sm mb-3" style={{padding:'14px 16px',background:'#F7F7F2',border:'1px solid #eee',borderRadius:12,color:'#aaa',fontFamily:body,boxSizing:'border-box'}}><option>Select service</option>{svc.map(s=><option key={s}>{s}</option>)}</select>}
              <textarea placeholder="Tell us about your project..." rows={4} className="w-full text-sm mb-5 outline-none resize-none" style={{padding:'14px 16px',background:'#F7F7F2',border:'1px solid #eee',borderRadius:12,color:'#2D2D2D',fontFamily:body,boxSizing:'border-box'}}/>
              <button onClick={onCTAClick} className="zephyr-btn w-full justify-center" style={{padding:16}}>Submit Request <ArrowRight size={14}/></button>
            </div></Reveal>
          </div>
        </section>
      </div>

      {/* FOOTER */}
      <footer style={{background:'#FFFCF7',borderTop:'1px solid #eee',padding:'clamp(48px,6vw,80px) clamp(16px,4vw,48px) clamp(80px,10vw,120px)'}}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12" style={{maxWidth:1200,margin:'0 auto'}}>
          <div><div className="flex items-center gap-2 mb-4">{lead.logo?<img src={lead.logo} alt="" className="h-6 w-6 object-cover" style={{borderRadius:'30%'}}/>:<div className="w-3 h-3" style={{background:A,borderRadius:'30%'}}/>}<span className="font-bold" style={{fontFamily:sans}}>{lead.companyName}</span></div>
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
        <div className="flex flex-wrap justify-between items-center gap-4" style={{maxWidth:1200,margin:'0 auto',borderTop:'1px solid #f0ece4',paddingTop:24}}>
          <p className="text-xs" style={{color:'#ccc'}}>&copy; {new Date().getFullYear()} {lead.companyName}</p>
          <span className="text-[10px]" style={{color:'#ddd'}}>Powered by <a href="https://brightautomations.com" target="_blank" rel="noopener noreferrer" style={{color:'#bbb'}}>Bright Automations</a></span>
        </div>
      </footer>

      {/* LIGHTBOX with prev/next */}
      {lb!==null&&photos[lb]&&(<div className="fixed inset-0 z-[200] flex items-center justify-center p-5" style={{background:'rgba(0,0,0,.88)'}} onClick={()=>setLb(null)}>
        <img src={photos[lb]} alt="" style={{maxWidth:'90%',maxHeight:'85vh',objectFit:'contain',borderRadius:12}}/>
        <button className="absolute top-6 right-6 w-11 h-11 rounded-full flex items-center justify-center bg-white/10 border border-white/20 text-white cursor-pointer" onClick={e=>{e.stopPropagation();setLb(null)}}><X size={18}/></button>
        {lb>0&&<button className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center bg-white/10 border border-white/20 text-white cursor-pointer" onClick={e=>{e.stopPropagation();setLb(lb-1)}}><ChevronLeft size={22}/></button>}
        {lb<photos.length-1&&<button className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center bg-white/10 border border-white/20 text-white cursor-pointer" onClick={e=>{e.stopPropagation();setLb(lb+1)}}><ChevronRight size={22}/></button>}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/50 text-sm">{lb+1} / {photos.length}</div>
      </div>)}

      <ChatWidget name={lead.companyName} accent={A}/>
      <div className="h-16 sm:h-0"/>
    </div>
  )
}
