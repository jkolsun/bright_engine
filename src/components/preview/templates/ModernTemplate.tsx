'use client'
/*
 * MODERN TEMPLATE — "Wavelength"
 * Design Direction: Modern SaaS, teal/cyan
 * Brand Voice: Technical & Precise + warm
 *
 * CHANGES: +chatbot +social nav +mobile drawer +FAQ +contact form
 * Removed: bento grid services, "How It Works" timeline, service area, Quick Links
 * Services → numbered list, gallery → asymmetric, testimonial → 3 staggered
 * Floating stats bar → inline proof strip
 */

import { useState, useEffect, useRef } from 'react'
import {
  Phone, MapPin, Star, Shield, Clock, CheckCircle, ArrowRight, Mail,
  Sparkles, Camera, Quote,
  MessageCircle, X, Send, ChevronDown, Menu, ChevronRight,
  Minus, Plus, Facebook, Instagram
} from 'lucide-react'
import type { TemplateProps } from '../config/template-types'
import DisclaimerBanner from '../shared/DisclaimerBanner'
import ScrollReveal from '../shared/ScrollReveal'

function GoogleIcon({ size = 15, className = '' }: { size?: number; className?: string }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>)
}

function ChatbotWidget({ companyName, accentColor = '#14b8a6' }: { companyName: string; accentColor?: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<{from: string; text: string}[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => {
    if (isOpen && messages.length === 0) { setIsTyping(true); const t = setTimeout(() => { setMessages([{ from: 'bot', text: `Hi! 👋 Welcome to ${companyName}. Need a quote or have a question? I'm here to help.` }]); setIsTyping(false) }, 800); return () => clearTimeout(t) }
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100)
  }, [isOpen, companyName])
  const quickReplies = ['Get a free estimate', 'What services do you offer?', 'Hours & availability']
  const handleSend = (text?: string) => {
    const msg = text || input.trim(); if (!msg) return
    setMessages(p => [...p, { from: 'user', text: msg }]); setInput(''); setIsTyping(true)
    setTimeout(() => {
      let reply = "Thanks for reaching out! A team member will follow up shortly. Call us for the fastest response."
      if (msg.toLowerCase().includes('quote') || msg.toLowerCase().includes('estimate')) reply = "We'd love to get you a free estimate! Tell me about your project or call us directly."
      else if (msg.toLowerCase().includes('service')) reply = "We offer a full range of services — check out the list below, or tell me what you need!"
      else if (msg.toLowerCase().includes('hour')) reply = "We're available Monday through Saturday with same-day response. Call anytime!"
      setMessages(p => [...p, { from: 'bot', text: reply }]); setIsTyping(false)
    }, 1200)
  }
  return (
    <>
      <button onClick={() => setIsOpen(!isOpen)} className="fixed bottom-5 right-5 z-[100] group sm:bottom-5 bottom-[88px]" aria-label="Chat">
        <div className="w-[58px] h-[58px] rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-105" style={{ background: `linear-gradient(135deg, ${accentColor}, #06b6d4)` }}>
          {isOpen ? <X size={22} className="text-white" /> : <MessageCircle size={22} className="text-white" />}
        </div>
        {!isOpen && <span className="absolute inset-0 rounded-full animate-ping opacity-15" style={{ background: accentColor }} />}
        {!isOpen && (<div className="absolute bottom-full right-0 mb-3 whitespace-nowrap bg-white text-gray-700 text-sm font-semibold px-4 py-2 rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">Need help? Chat with us<div className="absolute top-full right-6 w-2 h-2 bg-white transform rotate-45 -translate-y-1" /></div>)}
      </button>
      {isOpen && (
        <div className="fixed sm:bottom-24 bottom-[152px] right-5 z-[100] w-[370px] max-w-[calc(100vw-2.5rem)] bg-white rounded-2xl shadow-2xl border border-teal-100 overflow-hidden">
          <div className="px-5 py-4 text-white" style={{ background: `linear-gradient(135deg, ${accentColor}, #06b6d4)` }}>
            <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"><MessageCircle size={18} className="text-white" /></div><div><p className="font-bold text-sm">{companyName}</p><div className="flex items-center gap-1.5"><span className="w-2 h-2 bg-green-300 rounded-full animate-pulse" /><span className="text-xs text-white/80">Online now</span></div></div></div>
            <p className="text-[10px] text-white/40 mt-2.5 tracking-wide uppercase">AI Assistant by Bright Automations · Included with your website</p>
          </div>
          <div className="h-[280px] overflow-y-auto px-4 py-4 space-y-3 bg-teal-50/20">
            {messages.map((msg, i) => (<div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[80%] px-4 py-2.5 text-sm leading-relaxed ${msg.from === 'user' ? 'text-white rounded-2xl rounded-br-sm' : 'bg-white text-gray-700 rounded-2xl rounded-bl-sm shadow-sm border border-teal-50'}`} style={msg.from === 'user' ? { background: accentColor } : undefined}>{msg.text}</div></div>))}
            {isTyping && (<div className="flex justify-start"><div className="bg-white px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm border border-teal-50"><div className="flex gap-1"><span className="w-2 h-2 bg-teal-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} /><span className="w-2 h-2 bg-teal-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} /><span className="w-2 h-2 bg-teal-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} /></div></div></div>)}
            <div ref={endRef} />
          </div>
          {messages.length <= 1 && (<div className="px-4 pb-2 flex gap-2 flex-wrap bg-teal-50/20">{quickReplies.map((qr, i) => (<button key={i} onClick={() => handleSend(qr)} className="text-xs px-3 py-1.5 rounded-full border border-teal-200 text-teal-600 hover:bg-teal-50 transition-all">{qr}</button>))}</div>)}
          <div className="px-4 py-3 border-t border-teal-50 bg-white"><div className="flex gap-2"><input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Type a message..." className="flex-1 text-sm px-4 py-2.5 rounded-full bg-teal-50/50 border border-teal-100 text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400/30 placeholder:text-gray-400" /><button onClick={() => handleSend()} disabled={!input.trim()} className="w-10 h-10 rounded-full flex items-center justify-center text-white transition-all disabled:opacity-30" style={{ background: accentColor }}><Send size={15} /></button></div></div>
        </div>
      )}
    </>
  )
}

function MobileNav({ isOpen, onClose, companyName, sections, phone, onCallClick, onCTAClick }: { isOpen: boolean; onClose: () => void; companyName: string; sections: { id: string; label: string }[]; phone?: string; onCallClick: () => void; onCTAClick: () => void }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-[90] lg:hidden">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-[300px] bg-white shadow-2xl">
        <div className="p-6 h-full flex flex-col">
          <div className="flex justify-between items-center mb-10"><span className="text-lg font-bold text-gray-900">{companyName}</span><button onClick={onClose} className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500"><X size={18} /></button></div>
          <nav className="space-y-1 flex-1">{sections.map((s) => (<a key={s.id} href={`#${s.id}`} onClick={onClose} className="flex items-center justify-between px-4 py-3.5 rounded-xl text-gray-700 hover:bg-teal-50 transition-all text-[15px] font-medium">{s.label}<ChevronRight size={16} className="text-gray-300" /></a>))}</nav>
          <div className="flex gap-3 mb-5">
            <a href="#" className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:text-teal-600 transition-colors"><Facebook size={16} /></a>
            <a href="#" className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:text-teal-600 transition-colors"><Instagram size={16} /></a>
            <a href="#" className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:text-teal-600 transition-colors"><GoogleIcon size={16} /></a>
          </div>
          <div className="space-y-3">
            {phone && (<a href={`tel:${phone}`} onClick={() => { onCallClick(); onClose() }} className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-gray-100 text-gray-800 font-bold text-sm border border-gray-200"><Phone size={16} />Call {phone}</a>)}
            <button onClick={() => { onCTAClick(); onClose() }} className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold text-sm">Get Free Quote</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function FAQItem({ question, answer, isOpen, onToggle }: { question: string; answer: string; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button onClick={onToggle} className="w-full flex items-center justify-between py-5 text-left group">
        <span className="text-[15px] font-medium text-gray-800 group-hover:text-teal-600 transition-colors pr-6">{question}</span>
        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-50 group-hover:bg-teal-100 flex items-center justify-center transition-all">
          {isOpen ? <Minus size={14} className="text-teal-600" /> : <Plus size={14} className="text-teal-300" />}
        </span>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[200px] opacity-100 pb-5' : 'max-h-0 opacity-0'}`}><p className="text-sm text-gray-500 leading-relaxed pr-14">{answer}</p></div>
    </div>
  )
}
// ═══════ MAIN TEMPLATE ═══════
export default function ModernTemplate({ lead, config, onCTAClick, onCallClick, websiteCopy }: TemplateProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [openFAQ, setOpenFAQ] = useState<number | null>(null)
  const services = lead.enrichedServices || []
  const photos = lead.enrichedPhotos || []
  const industryLabel = lead.industry.toLowerCase().replace(/_/g, ' ')
  const location = [lead.city, lead.state].filter(Boolean).join(', ')
  const hasRating = lead.enrichedRating && lead.enrichedRating > 0
  const wc = websiteCopy

  const navSections = [
    { id: 'hero', label: 'Home' }, { id: 'services', label: 'Services' },
    { id: 'about', label: 'About' }, { id: 'gallery', label: 'Work' },
    { id: 'faq', label: 'FAQ' }, { id: 'contact', label: 'Contact' },
  ]
  const faqs = [
    { q: 'How do I get a free estimate?', a: 'Call us or submit the form below — we respond same-day.' },
    { q: 'What areas do you serve?', a: `We serve ${location || 'the local area'} and surrounding communities.` },
    { q: 'Are you licensed and insured?', a: 'Yes — fully licensed, bonded, and insured on every job.' },
    { q: 'How soon can you start?', a: 'Most projects begin within 1-2 weeks.' },
    { q: 'Do you guarantee your work?', a: "Every job is backed by our satisfaction guarantee." },
  ]
  useEffect(() => { const h = () => setScrolled(window.scrollY > 50); window.addEventListener('scroll', h, { passive: true }); return () => window.removeEventListener('scroll', h) }, [])

  return (
    <div className="preview-template min-h-screen bg-white antialiased">
      <DisclaimerBanner variant="modern" companyName={lead.companyName} />

      {/* ═══════ NAV ═══════ */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-white/95 backdrop-blur-xl shadow-sm border-b border-gray-100' : 'bg-white/50 backdrop-blur-md'}`}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex items-center justify-between h-[68px]">
            <div className="flex items-center gap-3">
              {lead.logo && <img src={lead.logo} alt="" className="h-8 w-8 rounded-xl object-cover ring-2 ring-teal-100" />}
              <span className="text-lg font-bold text-gray-900 tracking-tight">{lead.companyName}</span>
            </div>
            <div className="hidden lg:flex items-center gap-1">{navSections.map((s) => (<a key={s.id} href={`#${s.id}`} className="px-3 py-2 rounded-lg text-[13px] font-medium text-gray-500 hover:text-teal-600 hover:bg-teal-50 transition-all">{s.label}</a>))}</div>
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-0.5 text-gray-400">
                <a href="#" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-teal-50 hover:text-teal-500 transition-all"><Facebook size={14} /></a>
                <a href="#" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-teal-50 hover:text-teal-500 transition-all"><Instagram size={14} /></a>
                <a href="#" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-teal-50 hover:text-teal-500 transition-all"><GoogleIcon size={13} /></a>
              </div>
              <div className="hidden md:block w-px h-5 bg-gray-200" />
              {lead.phone && (<a href={`tel:${lead.phone}`} onClick={onCallClick} className="hidden lg:flex items-center gap-2 text-sm text-gray-500 hover:text-teal-600 font-medium"><Phone size={14} />{lead.phone}</a>)}
              <button onClick={onCTAClick} className="hidden sm:flex bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:from-teal-600 hover:to-cyan-600 transition-all shadow-md">Free Quote</button>
              <button onClick={() => setMobileNavOpen(true)} className="lg:hidden w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600"><Menu size={20} /></button>
            </div>
          </div>
        </div>
      </nav>

      <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} companyName={lead.companyName} sections={navSections} phone={lead.phone} onCallClick={onCallClick} onCTAClick={onCTAClick} />

      {/* ═══════ HERO — Centered with Gradient Mesh ═══════ */}
      <section id="hero" className="relative min-h-[100svh] flex items-center justify-center overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-gradient-to-bl from-teal-100/50 to-cyan-50/20 rounded-full blur-3xl" />
        <div className="absolute bottom-[-15%] left-[-8%] w-[500px] h-[500px] bg-gradient-to-tr from-cyan-100/40 to-teal-50/10 rounded-full blur-3xl" />
        <div className="absolute top-[30%] left-[55%] w-[250px] h-[250px] bg-gradient-to-br from-emerald-50/30 to-transparent rounded-full blur-3xl" />
        <div className="relative max-w-4xl mx-auto w-full px-4 sm:px-6 md:px-8 py-32 text-center">
          <div className="inline-flex items-center gap-2 bg-teal-50 border border-teal-100 text-teal-700 rounded-full px-5 py-2 text-sm font-semibold mb-8">
            <Sparkles size={14} />
            {hasRating ? `${lead.enrichedRating}-Star Rated` : 'Top Rated'}{location ? ` · ${location}` : ''}
          </div>
          <h1 className="font-display text-[2.75rem] sm:text-6xl md:text-7xl lg:text-8xl font-bold text-gray-900 mb-6 tracking-tight leading-[1.02]">{wc?.heroHeadline || lead.companyName}</h1>
          {wc?.heroSubheadline && (
            <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto mb-8 leading-relaxed">{wc.heroSubheadline}</p>
          )}
          <div className="w-24 h-1 bg-gradient-to-r from-teal-400 via-cyan-400 to-emerald-400 mx-auto mb-8 rounded-full" />
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {lead.phone && (<a href={`tel:${lead.phone}`} onClick={onCallClick} className="inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-10 py-4 rounded-full font-semibold text-lg hover:from-teal-600 hover:to-cyan-600 transition-all shadow-lg hover:-translate-y-0.5"><Phone size={20} />Call Now</a>)}
            <button onClick={onCTAClick} className="inline-flex items-center justify-center gap-2.5 bg-white border-2 border-gray-200 text-gray-700 px-10 py-4 rounded-full font-semibold text-lg hover:border-teal-400 hover:text-teal-600 transition-all group">{config.ctaText}<ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></button>
          </div>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-gray-300"><span className="text-[10px] uppercase tracking-[0.25em] font-medium">Scroll</span><ChevronDown size={18} className="animate-bounce" /></div>
      </section>

      {/* ═══════ PROOF STRIP ═══════ */}
      <section className="py-4 px-4 sm:px-6 md:px-8 border-b border-gray-100 bg-gray-50/50">
        <ScrollReveal animation="fade-in" delay={0}>
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm">
          {hasRating && <span className="flex items-center gap-2 text-gray-700 font-semibold"><Star size={13} className="text-amber-400 fill-current" />{lead.enrichedRating} Rating</span>}
          {lead.enrichedReviews && (<><span className="text-gray-200 hidden sm:inline">•</span><span className="text-gray-500">{lead.enrichedReviews}+ Reviews</span></>)}
          <span className="text-gray-200 hidden sm:inline">•</span>
          <span className="flex items-center gap-1.5 text-gray-500"><Shield size={13} />Licensed & Insured</span>
          {location && (<><span className="text-gray-200 hidden sm:inline">•</span><span className="flex items-center gap-1.5 text-gray-500"><MapPin size={13} />{location}</span></>)}
          <span className="text-gray-200 hidden sm:inline">•</span>
          <span className="flex items-center gap-1.5 text-gray-500"><Clock size={13} />Same-Day Response</span>
          {wc?.yearsBadge && (
            <><span className="text-gray-200 hidden sm:inline">•</span><span className="flex items-center gap-1.5 text-gray-500">{wc.yearsBadge}</span></>
          )}
        </div>
        </ScrollReveal>
      </section>

      {/* ═══════ SERVICES ═══════ */}
      {services.length > 0 && (
        <section id="services" className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 bg-white">
          <div className="max-w-5xl mx-auto">
            <ScrollReveal animation="fade-up" delay={0}>
            <div className="max-w-xl mb-14">
              <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-600 rounded-full px-4 py-1.5 text-xs font-semibold mb-4 border border-teal-100"><Sparkles size={12} />Services</div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">What we offer.</h2>
            </div>
            </ScrollReveal>
            <div className="divide-y divide-gray-100">
              {services.slice(0, 8).map((service, i) => (
                <ScrollReveal key={i} animation="fade-up" delay={i * 100}>
                <div className="group flex items-center justify-between py-5 cursor-pointer hover:pl-2 transition-all duration-300" onClick={onCTAClick}>
                  <div className="flex items-center gap-5">
                    <span className="text-xs text-teal-300 font-mono tabular-nums w-6 font-bold">{String(i + 1).padStart(2, '0')}</span>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-800 group-hover:text-teal-600 transition-colors">{service}</h3>
                    {wc?.serviceDescriptions?.[service] && (
                      <p className="text-sm text-gray-400 mt-1">{wc.serviceDescriptions[service]}</p>
                    )}
                  </div>
                  <ArrowRight size={16} className="text-gray-300 group-hover:text-teal-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
                </div>
                </ScrollReveal>
              ))}
            </div>
            <ScrollReveal animation="fade-up" delay={100}>
            <div className="mt-12 flex justify-center">
              <button onClick={onCTAClick} className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-7 py-3.5 rounded-full font-semibold text-sm hover:from-teal-600 hover:to-cyan-600 transition-all shadow-md">Get a Free Estimate<ArrowRight size={16} /></button>
            </div>
            </ScrollReveal>
          </div>
        </section>
      )}

      {/* ═══════ TEAL CTA BAND ═══════ */}
      <section className="relative py-16 sm:py-20 md:py-24 overflow-hidden bg-gradient-to-r from-teal-600 via-cyan-600 to-teal-600">
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <ScrollReveal animation="fade-in" delay={0}>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 md:px-8 text-center">
          <Quote size={36} className="text-white/15 mx-auto mb-5" />
          <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-snug">{wc?.closingHeadline || "Quality work. Honest pricing. Guaranteed."}</p>
        </div>
        </ScrollReveal>
      </section>

      {/* ═══════ ABOUT ═══════ */}
      <section id="about" className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16 items-start">
            <ScrollReveal animation="fade-left" delay={0}>
            <div className="lg:col-span-3">
              <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-600 rounded-full px-4 py-1.5 text-xs font-semibold mb-4 border border-teal-100">About {lead.companyName}</div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-6">Your local {industryLabel} experts.</h2>
              <p className="text-gray-500 text-base leading-relaxed">
                {wc?.aboutParagraph1 || `${lead.companyName} delivers top-quality ${industryLabel}${location ? ` in ${location}` : ''}. Licensed, insured, and committed to your satisfaction.`}
              </p>
              {wc?.aboutParagraph2 && (
                <p className="text-gray-500 text-base leading-relaxed mt-4">{wc.aboutParagraph2}</p>
              )}
              <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6">
                {(wc?.valueProps || [
                  { title: 'Licensed & Insured', description: 'Full protection on every job' },
                  { title: 'Satisfaction Guaranteed', description: 'We stand behind our work' },
                  { title: 'Transparent Pricing', description: 'No hidden fees, no surprises' },
                ]).slice(0, 3).map((vp, i) => (
                  <div key={i}><div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center mb-3 border border-teal-100"><CheckCircle size={18} className="text-teal-500" /></div><h4 className="text-sm font-bold text-gray-800 mb-1">{vp.title}</h4><p className="text-xs text-gray-400 leading-relaxed">{vp.description}</p></div>
                ))}
              </div>
            </div>
            </ScrollReveal>
            <ScrollReveal animation="fade-right" delay={100}>
            <div className="lg:col-span-2 flex flex-col gap-5">
              <div className="bg-teal-50/40 border border-teal-100 rounded-2xl p-7">
                <div className="flex gap-0.5 mb-4">{Array.from({ length: 5 }, (_, i) => <Star key={i} size={14} className="text-amber-400 fill-current" />)}</div>
                <p className="text-gray-700 text-base italic leading-relaxed mb-4">"{wc?.testimonialQuote || `They handled everything from start to finish — on time, on budget, and the results were exactly what we wanted.`}"</p>
                <div className="w-8 h-0.5 bg-teal-200 rounded-full mb-2" />
                <span className="text-gray-400 text-xs font-medium">{wc?.testimonialAuthor || 'Local Homeowner'}{location ? ` · ${location}` : ''}</span>
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-7">
                <h3 className="font-bold text-gray-800 text-base mb-1">Ready to get started?</h3>
                <p className="text-gray-400 text-xs mb-5">Free estimate · Same-day response</p>
                <div className="space-y-3.5">
                  {lead.phone && (<a href={`tel:${lead.phone}`} onClick={onCallClick} className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center flex-shrink-0"><Phone size={14} className="text-white" /></div><div><p className="text-[11px] text-gray-400 uppercase tracking-wider font-bold">Phone</p><p className="text-sm font-bold text-gray-800">{lead.phone}</p></div></a>)}
                  {lead.email && (<a href={`mailto:${lead.email}`} className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center flex-shrink-0"><Mail size={14} className="text-white" /></div><div><p className="text-[11px] text-gray-400 uppercase tracking-wider font-bold">Email</p><p className="text-sm font-bold text-gray-800">{lead.email}</p></div></a>)}
                  {lead.enrichedAddress && (<div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0"><MapPin size={14} className="text-white" /></div><div><p className="text-[11px] text-gray-400 uppercase tracking-wider font-bold">Location</p><p className="text-sm font-bold text-gray-800">{lead.enrichedAddress}</p></div></div>)}
                </div>
              </div>
            </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ═══════ GALLERY ═══════ */}
      {photos.length > 0 && (
        <section id="gallery" className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 bg-gray-50/50">
          <div className="max-w-7xl mx-auto">
            <ScrollReveal animation="fade-up" delay={0}>
            <div className="text-center max-w-xl mx-auto mb-10">
              <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-600 rounded-full px-4 py-1.5 text-xs font-semibold mb-4 border border-teal-100"><Camera size={12} />Portfolio</div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Our recent work.</h2>
            </div>
            </ScrollReveal>
            {/* First photo hero-sized */}
            {photos[0] && (
              <ScrollReveal animation="zoom-in" delay={100}>
              <div className="relative overflow-hidden rounded-2xl group border border-gray-100 hover:border-teal-200 transition-all mb-3 sm:mb-4">
                <img src={photos[0]} alt="Project 1" className="w-full object-cover aspect-[4/3] sm:aspect-[16/9] transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              </ScrollReveal>
            )}
            {/* Remaining photos in grid */}
            {photos.length > 1 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                {photos.slice(1, 7).map((photo, i) => (
                  <ScrollReveal key={i} animation="zoom-in" delay={i * 100}>
                  <div className="relative overflow-hidden rounded-2xl group border border-gray-100 hover:border-teal-200 transition-all">
                    <img src={photo} alt={`Project ${i + 2}`} className="w-full object-cover aspect-[4/3] transition-transform duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  </ScrollReveal>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ═══════ TESTIMONIALS ═══════ */}
      <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <ScrollReveal animation="fade-up" delay={0}>
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-600 rounded-full px-4 py-1.5 text-xs font-semibold mb-4 border border-teal-100">Reviews</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">What customers say.</h2>
          </div>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(() => {
              const testimonials = [
                ...(wc?.testimonialQuote ? [{
                  quote: wc.testimonialQuote,
                  name: wc.testimonialAuthor || 'Verified Customer',
                  loc: lead.city || 'Local',
                }] : []),
                { quote: `Called on a Monday, had a crew here by Wednesday. They finished ahead of schedule and left the place spotless. Already told three neighbors about ${lead.companyName}.`, name: 'Sarah M.', loc: lead.city || 'Local' },
                { quote: `We've used other companies before — no comparison. ${lead.companyName} showed up on time, communicated every step, and the final result was exactly what we pictured.`, name: 'David R.', loc: lead.city || 'Local' },
                { quote: `Honest quote, no pressure, and the work speaks for itself. Our ${industryLabel} project came out better than we expected.`, name: 'Jennifer K.', loc: lead.city || 'Local' },
              ].slice(0, 3)
              return testimonials.map((r, i) => (
              <ScrollReveal key={i} animation="fade-up" delay={i * 100}>
              <div className={`bg-gray-50/50 border border-gray-100 rounded-2xl p-7 hover:border-teal-200 transition-all ${i === 2 ? 'md:col-span-2 md:max-w-lg md:mx-auto' : ''}`}>
                <div className="flex gap-0.5 mb-4">{Array.from({ length: 5 }, (_, j) => <Star key={j} size={16} className="text-amber-400 fill-current" />)}</div>
                <p className="text-gray-600 text-base leading-relaxed mb-5 italic">"{r.quote}"</p>
                <div className="flex items-center gap-3 text-sm pt-3 border-t border-gray-100">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-100 to-cyan-100 flex items-center justify-center"><span className="text-teal-600 font-bold text-xs">{r.name[0]}</span></div>
                  <div><span className="font-semibold text-gray-800">{r.name}</span><span className="text-gray-400"> — {r.loc}</span></div>
                </div>
              </div>
              </ScrollReveal>
              ))
            })()}
          </div>
        </div>
      </section>

      {/* ═══════ FAQ ═══════ */}
      <section id="faq" className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 bg-gray-50/50">
        <div className="max-w-3xl mx-auto">
          <ScrollReveal animation="fade-up" delay={0}>
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-600 rounded-full px-4 py-1.5 text-xs font-semibold mb-4 border border-teal-100">FAQ</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Common questions.</h2>
          </div>
          </ScrollReveal>
          <ScrollReveal animation="fade-up" delay={100}>
          <div className="bg-white rounded-2xl border border-gray-100 px-6 sm:px-8 shadow-sm">
            {faqs.map((f, i) => <FAQItem key={i} question={f.q} answer={f.a} isOpen={openFAQ === i} onToggle={() => setOpenFAQ(openFAQ === i ? null : i)} />)}
          </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ═══════ CONTACT ═══════ */}
      <section id="contact" className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <ScrollReveal animation="fade-left" delay={0}>
            <div>
              <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-600 rounded-full px-4 py-1.5 text-xs font-semibold mb-4 border border-teal-100">Contact</div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-8">Get your free estimate.</h2>
              <div className="space-y-5">
                {lead.phone && (<a href={`tel:${lead.phone}`} onClick={onCallClick} className="flex items-center gap-4"><div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-sm"><Phone size={20} className="text-white" /></div><div><p className="text-sm font-bold text-gray-800">{lead.phone}</p><p className="text-xs text-gray-400">Call or text anytime</p></div></a>)}
                {lead.email && (<a href={`mailto:${lead.email}`} className="flex items-center gap-4"><div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center flex-shrink-0 shadow-sm"><Mail size={20} className="text-white" /></div><div><p className="text-sm font-bold text-gray-800">{lead.email}</p><p className="text-xs text-gray-400">We reply fast</p></div></a>)}
                {lead.enrichedAddress && (<div className="flex items-center gap-4"><div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0 shadow-sm"><MapPin size={20} className="text-white" /></div><div><p className="text-sm font-bold text-gray-800">{lead.enrichedAddress}</p><p className="text-xs text-gray-400">{location}</p></div></div>)}
              </div>
              <div className="flex gap-3 mt-10">
                <a href="#" className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 hover:text-teal-500 hover:border-teal-200 transition-all"><Facebook size={16} /></a>
                <a href="#" className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 hover:text-teal-500 hover:border-teal-200 transition-all"><Instagram size={16} /></a>
                <a href="#" className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 hover:text-teal-500 hover:border-teal-200 transition-all"><GoogleIcon size={16} /></a>
              </div>
            </div>
            </ScrollReveal>
            <ScrollReveal animation="fade-right" delay={100}>
            <div className="bg-gray-50 rounded-2xl border border-gray-100 p-7 sm:p-8">
              <h3 className="text-lg font-bold text-gray-800 mb-1">Send us a message</h3>
              <p className="text-xs text-gray-400 mb-6">We respond same-day.</p>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Name</label><input type="text" placeholder="Your name" className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-300 placeholder:text-gray-300 transition-all" /></div>
                  <div><label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Phone</label><input type="tel" placeholder="(555) 555-5555" className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-300 placeholder:text-gray-300 transition-all" /></div>
                </div>
                <div><label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Email</label><input type="email" placeholder="your@email.com" className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-300 placeholder:text-gray-300 transition-all" /></div>
                <div><label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Project details</label><textarea rows={4} placeholder="Tell us about your project..." className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-300 placeholder:text-gray-300 transition-all resize-none" /></div>
                <button onClick={onCTAClick} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-semibold text-sm hover:from-teal-600 hover:to-cyan-600 transition-all shadow-md">Send Message</button>
              </div>
            </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer className="bg-gray-950 py-14 px-4 sm:px-6 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
            <div>
              <span className="text-white font-bold text-lg">{lead.companyName}</span>
              <p className="text-gray-400 text-sm leading-relaxed mt-3">Professional {industryLabel}{location ? ` in ${location}` : ''}. Quality workmanship, guaranteed.</p>
              {hasRating && (<div className="flex items-center gap-2 mt-4"><div className="flex gap-0.5">{Array.from({ length: 5 }, (_, i) => <Star key={i} size={11} className={i < Math.floor(lead.enrichedRating || 0) ? 'text-amber-400 fill-current' : 'text-gray-700'} />)}</div><span className="text-gray-500 text-xs">{lead.enrichedRating} rating</span></div>)}
              <div className="flex gap-2.5 mt-5">
                <a href="#" className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-gray-500 hover:text-white transition-all"><Facebook size={13} /></a>
                <a href="#" className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-gray-500 hover:text-white transition-all"><Instagram size={13} /></a>
                <a href="#" className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-gray-500 hover:text-white transition-all"><GoogleIcon size={12} /></a>
              </div>
            </div>
            <div><h4 className="text-white font-semibold mb-4 text-xs uppercase tracking-[0.15em]">Services</h4><ul className="space-y-2.5 text-sm text-gray-400">{services.slice(0, 5).map((s, i) => <li key={i} className="flex items-center gap-2 hover:text-gray-200 transition-colors cursor-pointer"><CheckCircle size={11} className="text-teal-500 flex-shrink-0" />{s}</li>)}</ul></div>
            <div><h4 className="text-white font-semibold mb-4 text-xs uppercase tracking-[0.15em]">Contact</h4><div className="space-y-3 text-sm text-gray-400">{lead.phone && <a href={`tel:${lead.phone}`} onClick={onCallClick} className="flex items-center gap-2.5 hover:text-white transition-colors"><Phone size={13} className="text-teal-400" />{lead.phone}</a>}{lead.email && <a href={`mailto:${lead.email}`} className="flex items-center gap-2.5 hover:text-white transition-colors"><Mail size={13} className="text-teal-400" />{lead.email}</a>}{lead.enrichedAddress && <p className="flex items-center gap-2.5"><MapPin size={13} className="text-teal-400 flex-shrink-0" />{lead.enrichedAddress}</p>}</div></div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-xs">&copy; {new Date().getFullYear()} {lead.companyName}. All rights reserved.</p>
            {location && <p className="text-gray-600 text-xs">Professional {industryLabel} · {location}</p>}
          </div>
        </div>
      </footer>

      {/* ═══════ STICKY MOBILE CTA ═══════ */}
      <div className="fixed bottom-0 left-0 right-0 z-40 sm:hidden bg-white/95 backdrop-blur-xl border-t border-gray-100 px-4 py-3">
        <div className="flex gap-3">
          {lead.phone && <a href={`tel:${lead.phone}`} onClick={onCallClick} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white text-teal-700 font-semibold text-sm border border-gray-200"><Phone size={16} />Call</a>}
          <button onClick={onCTAClick} className="flex-[2] flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-semibold text-sm">Free Quote</button>
        </div>
      </div>

      <ChatbotWidget companyName={lead.companyName} />
      <div className="h-20 sm:h-0" />
    </div>
  )
}