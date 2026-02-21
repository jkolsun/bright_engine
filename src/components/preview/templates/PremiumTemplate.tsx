'use client'
/*
 * PREMIUM TEMPLATE — "Aurum"
 * Design Direction: Quiet Luxury, dark gold/amber
 * Brand Voice: Quiet & Confident
 *
 * CHANGES: +chatbot +social nav +mobile drawer +FAQ +contact form
 * Removed: service card rows, "Our Approach" 3-step, contact sidebar (→ full contact section)
 * Services → numbered list, gallery → asymmetric, testimonial → 3 staggered
 * Value props folded into About. Split hero retained (differentiator from PremiumB centered).
 */

import { useState, useEffect, useRef } from 'react'
import {
  Phone, MapPin, Star, Shield, CheckCircle, ArrowRight, Mail,
  MessageCircle, X, Send, ChevronDown, Menu, ChevronRight,
  Minus, Plus, Facebook, Instagram
} from 'lucide-react'
import type { TemplateProps } from '../config/template-types'
import DisclaimerBanner from '../shared/DisclaimerBanner'
import ScrollReveal from '../shared/ScrollReveal'

function GoogleIcon({ size = 15, className = '' }: { size?: number; className?: string }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>)
}

function ChatbotWidget({ companyName }: { companyName: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<{from: string; text: string}[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => {
    if (isOpen && messages.length === 0) { setIsTyping(true); const t = setTimeout(() => { setMessages([{ from: 'bot', text: `Welcome to ${companyName}. How may we assist you today?` }]); setIsTyping(false) }, 800); return () => clearTimeout(t) }
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100)
  }, [isOpen, companyName])
  const quickReplies = ['Request a consultation', 'What services do you offer?', 'Hours & availability']
  const handleSend = (text?: string) => {
    const msg = text || input.trim(); if (!msg) return
    setMessages(p => [...p, { from: 'user', text: msg }]); setInput(''); setIsTyping(true)
    setTimeout(() => {
      let reply = "Thank you for reaching out. A member of our team will be in touch shortly. For immediate assistance, please call us directly."
      if (msg.toLowerCase().includes('consult') || msg.toLowerCase().includes('quote') || msg.toLowerCase().includes('estimate')) reply = "We'd be delighted to arrange a complimentary consultation. Please share your project details, or call us directly."
      else if (msg.toLowerCase().includes('service')) reply = "We offer a comprehensive range of services — please see our Services section, or let us know what you're looking for."
      else if (msg.toLowerCase().includes('hour')) reply = "We're available Monday through Saturday. For immediate assistance, please call us anytime."
      setMessages(p => [...p, { from: 'bot', text: reply }]); setIsTyping(false)
    }, 1200)
  }
  return (
    <>
      <button onClick={() => setIsOpen(!isOpen)} className="fixed bottom-5 right-5 z-[100] group sm:bottom-5 bottom-[88px]" aria-label="Chat">
        <div className="w-[58px] h-[58px] rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-105 border border-amber-500/20" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
          {isOpen ? <X size={22} className="text-black" /> : <MessageCircle size={22} className="text-black" />}
        </div>
        {!isOpen && <span className="absolute inset-0 rounded-full animate-ping opacity-10 bg-amber-400" />}
        {!isOpen && (<div className="absolute bottom-full right-0 mb-3 whitespace-nowrap bg-gray-800 text-amber-300 text-sm font-medium px-4 py-2 rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-amber-500/10">Chat with us<div className="absolute top-full right-6 w-2 h-2 bg-gray-800 transform rotate-45 -translate-y-1" /></div>)}
      </button>
      {isOpen && (
        <div className="fixed sm:bottom-24 bottom-[152px] right-5 z-[100] w-[370px] max-w-[calc(100vw-2.5rem)] bg-gray-900 rounded-2xl shadow-2xl border border-amber-500/15 overflow-hidden">
          <div className="px-5 py-4 bg-gray-950 border-b border-amber-500/10">
            <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center"><MessageCircle size={18} className="text-amber-400" /></div><div><p className="font-semibold text-sm text-white">{companyName}</p><div className="flex items-center gap-1.5"><span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" /><span className="text-xs text-gray-500">Online now</span></div></div></div>
            <p className="text-[10px] text-gray-600 mt-2.5 tracking-wide uppercase">AI Assistant by Bright Automations · Included with your website</p>
          </div>
          <div className="h-[280px] overflow-y-auto px-4 py-4 space-y-3 bg-gray-900">
            {messages.map((msg, i) => (<div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[80%] px-4 py-2.5 text-sm leading-relaxed ${msg.from === 'user' ? 'bg-amber-500 text-black rounded-2xl rounded-br-sm' : 'bg-gray-800 text-gray-300 rounded-2xl rounded-bl-sm border border-gray-700/50'}`}>{msg.text}</div></div>))}
            {isTyping && (<div className="flex justify-start"><div className="bg-gray-800 px-4 py-3 rounded-2xl rounded-bl-sm border border-gray-700/50"><div className="flex gap-1"><span className="w-2 h-2 bg-amber-400/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} /><span className="w-2 h-2 bg-amber-400/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} /><span className="w-2 h-2 bg-amber-400/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} /></div></div></div>)}
            <div ref={endRef} />
          </div>
          {messages.length <= 1 && (<div className="px-4 pb-2 flex gap-2 flex-wrap">{quickReplies.map((qr, i) => (<button key={i} onClick={() => handleSend(qr)} className="text-xs px-3 py-1.5 rounded-full border border-gray-700 text-gray-400 hover:border-amber-500/30 hover:text-amber-300 transition-all">{qr}</button>))}</div>)}
          <div className="px-4 py-3 border-t border-gray-800 bg-gray-950"><div className="flex gap-2"><input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Type a message..." className="flex-1 text-sm px-4 py-2.5 rounded-full bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-400/30 placeholder:text-gray-500" /><button onClick={() => handleSend()} disabled={!input.trim()} className="w-10 h-10 rounded-full flex items-center justify-center text-black transition-all disabled:opacity-30" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}><Send size={15} /></button></div></div>
        </div>
      )}
    </>
  )
}

function MobileNav({ isOpen, onClose, companyName, sections, phone, onCallClick, onCTAClick }: { isOpen: boolean; onClose: () => void; companyName: string; sections: { id: string; label: string }[]; phone?: string; onCallClick: () => void; onCTAClick: () => void }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-[90] lg:hidden">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-[300px] bg-gray-900 shadow-2xl border-l border-amber-500/10">
        <div className="p-6 h-full flex flex-col">
          <div className="flex justify-between items-center mb-10">
            <div className="flex items-center gap-2.5"><div className="w-1 h-6 bg-gradient-to-b from-amber-400 to-amber-600 rounded-full" /><span className="text-lg font-light text-white tracking-wide">{companyName}</span></div>
            <button onClick={onClose} className="w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400 border border-gray-700"><X size={18} /></button>
          </div>
          <nav className="space-y-1 flex-1">{sections.map((s) => (<a key={s.id} href={`#${s.id}`} onClick={onClose} className="flex items-center justify-between px-4 py-3.5 rounded-xl text-gray-300 hover:bg-gray-800 hover:text-white transition-all text-[15px] font-medium">{s.label}<ChevronRight size={16} className="text-gray-600" /></a>))}</nav>
          <div className="flex gap-3 mb-5">
            <a href="#" className="w-10 h-10 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-500 hover:text-amber-400 transition-colors"><Facebook size={16} /></a>
            <a href="#" className="w-10 h-10 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-500 hover:text-amber-400 transition-colors"><Instagram size={16} /></a>
            <a href="#" className="w-10 h-10 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-500 hover:text-amber-400 transition-colors"><GoogleIcon size={16} /></a>
          </div>
          <div className="space-y-3">
            {phone && (<a href={`tel:${phone}`} onClick={() => { onCallClick(); onClose() }} className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-gray-800 text-white font-semibold text-sm border border-gray-700"><Phone size={16} />Call {phone}</a>)}
            <button onClick={() => { onCTAClick(); onClose() }} className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-black font-semibold text-sm" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>Free Consultation</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function FAQItem({ question, answer, isOpen, onToggle }: { question: string; answer: string; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-gray-800/50 last:border-0">
      <button onClick={onToggle} className="w-full flex items-center justify-between py-5 text-left group">
        <span className="text-[15px] font-medium text-gray-300 group-hover:text-amber-400 transition-colors pr-6">{question}</span>
        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-800 group-hover:bg-gray-700 flex items-center justify-center transition-all border border-gray-700">
          {isOpen ? <Minus size={14} className="text-amber-400" /> : <Plus size={14} className="text-gray-500" />}
        </span>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[200px] opacity-100 pb-5' : 'max-h-0 opacity-0'}`}><p className="text-sm text-gray-500 leading-relaxed pr-14">{answer}</p></div>
    </div>
  )
}
// ═══════ MAIN TEMPLATE ═══════
export default function PremiumTemplate({ lead, config, onCTAClick, onCallClick, websiteCopy }: TemplateProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [openFAQ, setOpenFAQ] = useState<number | null>(null)
  const services = lead.enrichedServices || []
  const photos = lead.enrichedPhotos || []
  const industryLabel = lead.industry.toLowerCase().replace(/_/g, ' ')
  const location = [lead.city, lead.state].filter(Boolean).join(', ')
  const hasRating = lead.enrichedRating && lead.enrichedRating > 0
  const wc = websiteCopy

  const navSections = [
    { id: 'hero', label: 'Home' }, { id: 'services', label: 'Services' },
    { id: 'about', label: 'About' }, { id: 'gallery', label: 'Portfolio' },
    { id: 'faq', label: 'FAQ' }, { id: 'contact', label: 'Contact' },
  ]
  const faqs = [
    { q: 'How does the consultation work?', a: 'Free assessment of your needs followed by a transparent, no-obligation estimate.' },
    { q: 'What areas do you serve?', a: `We serve ${location || 'the local area'} and surrounding communities.` },
    { q: 'Are you licensed and insured?', a: 'Fully licensed, bonded, and insured on every project.' },
    { q: 'How soon can work begin?', a: 'Most projects start within 1–2 weeks of approval.' },
    { q: 'What guarantees do you offer?', a: 'Every project is backed by our complete satisfaction guarantee.' },
  ]

  return (
    <div className="preview-template min-h-screen bg-gray-950 antialiased">
      <DisclaimerBanner variant="premium" companyName={lead.companyName} />

      {/* ═══════ NAV ═══════ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-950/90 backdrop-blur-xl border-b border-amber-500/8">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex items-center justify-between h-[68px]">
            <div className="flex items-center gap-2.5">
              <div className="w-1 h-6 bg-gradient-to-b from-amber-400 to-amber-600 rounded-full" />
              <span className="text-lg font-light text-white tracking-wide">{lead.companyName}</span>
            </div>
            <div className="hidden lg:flex items-center gap-1">{navSections.map((s) => (<a key={s.id} href={`#${s.id}`} className="px-3 py-2 rounded-lg text-[13px] font-medium text-gray-500 hover:text-amber-400 hover:bg-amber-400/5 transition-all">{s.label}</a>))}</div>
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-0.5 text-gray-600">
                <a href="#" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-amber-400/5 hover:text-amber-400 transition-all"><Facebook size={14} /></a>
                <a href="#" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-amber-400/5 hover:text-amber-400 transition-all"><Instagram size={14} /></a>
                <a href="#" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-amber-400/5 hover:text-amber-400 transition-all"><GoogleIcon size={13} /></a>
              </div>
              <div className="hidden md:block w-px h-5 bg-gray-800" />
              {lead.phone && (<a href={`tel:${lead.phone}`} onClick={onCallClick} className="hidden lg:flex items-center gap-2 text-sm text-gray-500 hover:text-amber-400 font-medium"><Phone size={14} />{lead.phone}</a>)}
              <button onClick={onCTAClick} className="hidden sm:flex text-black px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-md" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>Free Consultation</button>
              <button onClick={() => setMobileNavOpen(true)} className="lg:hidden w-10 h-10 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-400"><Menu size={20} /></button>
            </div>
          </div>
        </div>
      </nav>

      <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} companyName={lead.companyName} sections={navSections} phone={lead.phone} onCallClick={onCallClick} onCTAClick={onCTAClick} />

      {/* ═══════ SPLIT HERO ═══════ */}
      <section id="hero" className="relative min-h-[100svh] flex items-center overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient}`} />
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-amber-500/5 rounded-full -translate-y-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-amber-500/3 rounded-full translate-y-1/2 -translate-x-1/4 blur-3xl" />
        <div className="relative max-w-7xl mx-auto w-full px-4 sm:px-6 md:px-8 py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              {location && <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-amber-400/50 mb-6 font-medium"><MapPin size={12} className="text-amber-500/40" />{location}</p>}
              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light text-white mb-6 tracking-tight leading-[1.05]">{lead.companyName}</h1>
              {wc?.heroSubheadline && (
                <p className="text-lg sm:text-xl text-gray-200 max-w-2xl mx-auto mb-8 leading-relaxed">{wc.heroSubheadline}</p>
              )}
              <div className="w-20 h-0.5 bg-gradient-to-r from-amber-500 to-amber-300 mb-6" />
              <p className="text-lg sm:text-xl text-gray-400 leading-relaxed mb-8">{wc?.heroHeadline || config.tagline}</p>
              <div className="flex flex-col sm:flex-row gap-4">
                {lead.phone && (<a href={`tel:${lead.phone}`} onClick={onCallClick} className="inline-flex items-center justify-center gap-2.5 text-black px-10 py-4 rounded-xl font-semibold text-lg shadow-lg" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}><Phone size={20} />Call Now</a>)}
                <button onClick={onCTAClick} className="inline-flex items-center justify-center gap-2.5 border border-amber-500/30 text-amber-400 px-10 py-4 rounded-xl font-semibold text-lg hover:bg-amber-500 hover:text-black transition-all duration-300 group">{config.ctaText}<ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></button>
              </div>
            </div>
            <div className="border border-amber-500/15 rounded-3xl p-8 md:p-10 bg-gray-950/60 backdrop-blur-md shadow-2xl shadow-amber-500/5">
              {hasRating && (<div className="flex items-center gap-3 mb-6"><div className="flex gap-0.5">{Array.from({ length: 5 }, (_, i) => <Star key={i} size={16} className={i < Math.floor(lead.enrichedRating || 0) ? 'text-amber-400 fill-current' : 'text-gray-700'} />)}</div><span className="text-amber-400 font-semibold text-sm">{lead.enrichedRating}-Star Rated</span>{lead.enrichedReviews && <span className="text-gray-600 text-sm">({lead.enrichedReviews})</span>}</div>)}
              <h2 className="font-display text-xl font-light text-white mb-3">Get a free consultation</h2>
              <p className="text-gray-500 text-sm mb-6">No obligation · Same-day response</p>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" placeholder="Name" className="px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-400/30 placeholder:text-gray-600" />
                  <input type="tel" placeholder="Phone" className="px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-400/30 placeholder:text-gray-600" />
                </div>
                <input type="email" placeholder="Email" className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-400/30 placeholder:text-gray-600" />
                <button onClick={onCTAClick} className="w-full py-3.5 rounded-xl text-black font-semibold text-sm shadow-md" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>Get Free Consultation</button>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-gray-700"><span className="text-[10px] uppercase tracking-[0.25em] font-medium">Scroll</span><ChevronDown size={18} className="animate-bounce" /></div>
      </section>

      {/* ═══════ PROOF STRIP ═══════ */}
      <section className="py-4 px-4 sm:px-6 md:px-8 border-y border-amber-500/8 bg-gray-900/40">
        <ScrollReveal animation="fade-in" delay={0}>
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm">
          {hasRating && <span className="flex items-center gap-2 text-gray-400 font-medium"><Star size={13} className="text-amber-400 fill-current" />{lead.enrichedRating} Rating</span>}
          {lead.enrichedReviews && (<><span className="text-gray-800 hidden sm:inline">•</span><span className="text-gray-500">{lead.enrichedReviews}+ Reviews</span></>)}
          <span className="text-gray-800 hidden sm:inline">•</span>
          <span className="flex items-center gap-1.5 text-gray-500"><Shield size={13} className="text-amber-400/50" />Licensed & Insured</span>
          {location && (<><span className="text-gray-800 hidden sm:inline">•</span><span className="flex items-center gap-1.5 text-gray-500"><MapPin size={13} className="text-amber-400/50" />{location}</span></>)}
          {wc?.yearsBadge && (
            <><span className="text-gray-800 hidden sm:inline">•</span><span className="flex items-center gap-1.5 text-gray-500">{wc.yearsBadge}</span></>
          )}
        </div>
        </ScrollReveal>
      </section>

      {/* ═══════ SERVICES ═══════ */}
      {services.length > 0 && (
        <section id="services" className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 bg-gray-950">
          <div className="max-w-5xl mx-auto">
            <ScrollReveal animation="fade-up" delay={0}>
            <div className="max-w-xl mb-12 sm:mb-16">
              <p className="text-xs uppercase tracking-[0.25em] text-amber-400/40 mb-3 font-medium">Our Expertise</p>
              <h2 className="text-3xl sm:text-4xl font-light text-white leading-tight">Services.</h2>
            </div>
            </ScrollReveal>
            <div className="divide-y divide-gray-800/50">
              {services.slice(0, 8).map((service, i) => (
                <ScrollReveal key={i} animation="fade-left" delay={i * 100}>
                <div className="group flex items-center justify-between py-5 sm:py-6 cursor-pointer hover:pl-2 transition-all duration-300" onClick={onCTAClick}>
                  <div className="flex items-center gap-5">
                    <span className="text-xs text-amber-400/30 font-mono tabular-nums w-6 font-medium">{String(i + 1).padStart(2, '0')}</span>
                    <h3 className="text-base sm:text-lg font-medium text-gray-300 group-hover:text-amber-400 transition-colors">{service}</h3>
                    {wc?.serviceDescriptions?.[service] && (
                      <p className="text-sm text-gray-400 mt-1">{wc.serviceDescriptions[service]}</p>
                    )}
                  </div>
                  <ArrowRight size={16} className="text-gray-700 group-hover:text-amber-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
                </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════ AMBER CTA BAND ═══════ */}
      <section className="relative py-16 sm:py-20 md:py-24 overflow-hidden" style={{ background: 'linear-gradient(135deg, #d97706, #b45309)' }}>
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        <ScrollReveal animation="fade-in" delay={0}>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 md:px-8 text-center">
          <p className="text-2xl sm:text-3xl md:text-4xl font-light text-white leading-snug tracking-tight">{wc?.closingHeadline || "Excellence in every detail."}</p>
          {location && <p className="mt-4 text-white/40 text-sm font-medium tracking-wide">{location}</p>}
        </div>
        </ScrollReveal>
      </section>

      {/* ═══════ ABOUT ═══════ */}
      <section id="about" className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 bg-gray-950">
        <ScrollReveal animation="fade-up" delay={100}>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16 items-start">
            <div className="lg:col-span-3">
              <p className="text-xs uppercase tracking-[0.25em] text-amber-400/40 mb-3 font-medium">About</p>
              <h2 className="text-3xl sm:text-4xl font-light text-white leading-tight mb-6">{lead.companyName}</h2>
              <div className="space-y-4 text-gray-400 text-base leading-relaxed">
                <p>{wc?.aboutParagraph1 || `${lead.companyName} delivers expert ${industryLabel}${location ? ` in ${location}` : ''} with a client-first approach.`}</p>
                {wc?.aboutParagraph2 && <p>{wc.aboutParagraph2}</p>}
              </div>
              <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6">
                {(wc?.valueProps || [
                  { title: 'Consultation', description: `Understanding your ${industryLabel} needs first` },
                  { title: 'Expert Execution', description: 'Precision and care in every detail' },
                  { title: 'Lasting Results', description: 'Work that stands the test of time' },
                ]).slice(0, 3).map((vp, i) => (
                  <div key={i}><div className="w-10 h-10 rounded-xl bg-amber-400/5 border border-amber-500/10 flex items-center justify-center mb-3"><CheckCircle size={18} className="text-amber-400/60" /></div><h4 className="text-sm font-medium text-white mb-1">{vp.title}</h4><p className="text-xs text-gray-500 leading-relaxed">{vp.description}</p></div>
                ))}
              </div>
            </div>
            <div className="lg:col-span-2 flex flex-col gap-8 lg:pt-12">
              <div className="text-center lg:text-left">
                <p className="font-display text-5xl font-light text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>{hasRating ? lead.enrichedRating : '5.0'}</p>
                <div className="flex gap-0.5 mt-2 justify-center lg:justify-start">{Array.from({ length: 5 }, (_, i) => <Star key={i} size={13} className={i < Math.floor(lead.enrichedRating || 5) ? 'text-amber-400 fill-current' : 'text-gray-700'} />)}</div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-gray-600 mt-2">Star Rating</p>
              </div>
              {lead.enrichedReviews && (<div className="text-center lg:text-left"><p className="font-display text-5xl font-light text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>{lead.enrichedReviews}+</p><p className="text-[11px] uppercase tracking-[0.2em] text-gray-600 mt-2">Verified Reviews</p></div>)}
              <div className="text-center lg:text-left"><p className="font-display text-5xl font-light text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>100%</p><p className="text-[11px] uppercase tracking-[0.2em] text-gray-600 mt-2">Satisfaction Rate</p></div>
            </div>
          </div>
        </div>
        </ScrollReveal>
      </section>

      {/* ═══════ GALLERY ═══════ */}
      {photos.length > 0 && (
        <section id="gallery" className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 bg-gray-900/40">
          <div className="max-w-7xl mx-auto">
            <ScrollReveal animation="fade-up" delay={0}>
            <div className="text-center max-w-xl mx-auto mb-10 sm:mb-14">
              <p className="text-xs uppercase tracking-[0.25em] text-amber-400/40 mb-3 font-medium">Portfolio</p>
              <h2 className="text-3xl sm:text-4xl font-light text-white">Our work.</h2>
            </div>
            </ScrollReveal>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {photos.slice(0, 6).map((photo, i) => (
                <ScrollReveal key={i} animation="zoom-in" delay={i * 100}>
                <div className={`relative overflow-hidden rounded-2xl group border border-gray-800/50 hover:border-amber-500/20 transition-all ${i === 0 ? 'col-span-1 sm:col-span-2 sm:row-span-2' : ''}`}>
                  <img src={photo} alt={`Project ${i + 1}`} className={`w-full object-cover transition-transform duration-700 group-hover:scale-105 ${i === 0 ? 'aspect-[4/3]' : 'aspect-[4/3] sm:aspect-square'}`} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════ TESTIMONIALS ═══════ */}
      <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 bg-gray-950 border-y border-amber-500/5">
        <div className="max-w-6xl mx-auto">
          <ScrollReveal animation="fade-up" delay={0}>
          <div className="text-center mb-12 sm:mb-16">
            <p className="text-xs uppercase tracking-[0.25em] text-amber-400/40 mb-3 font-medium">Testimonials</p>
            <h2 className="text-3xl sm:text-4xl font-light text-white">What clients say.</h2>
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
                <ScrollReveal key={i} animation="fade-right" delay={i * 100}>
                <div className={`bg-gray-900/40 border border-gray-800/50 rounded-2xl p-8 hover:border-amber-500/15 transition-all ${i === 2 ? 'md:col-span-2 md:max-w-lg md:mx-auto' : ''}`}>
                  <div className="flex gap-0.5 mb-4">{Array.from({ length: 5 }, (_, j) => <Star key={j} size={15} className="text-amber-400 fill-current" />)}</div>
                  <p className="text-gray-400 text-base leading-relaxed mb-5 italic font-light">"{r.quote}"</p>
                  <div className="flex items-center gap-3 text-sm pt-4 border-t border-gray-800/50">
                    <div className="w-9 h-9 rounded-full bg-amber-400/10 flex items-center justify-center"><span className="text-amber-400 font-semibold text-xs">{r.name[0]}</span></div>
                    <div><span className="font-medium text-gray-300">{r.name}</span><span className="text-gray-600"> — {r.loc}</span></div>
                  </div>
                </div>
                </ScrollReveal>
              ))
            })()}
          </div>
        </div>
      </section>

      {/* ═══════ FAQ ═══════ */}
      <section id="faq" className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 bg-gray-950">
        <ScrollReveal animation="fade-up" delay={100}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10 sm:mb-14">
            <p className="text-xs uppercase tracking-[0.25em] text-amber-400/40 mb-3 font-medium">FAQ</p>
            <h2 className="text-3xl sm:text-4xl font-light text-white">Common questions.</h2>
          </div>
          <div className="bg-gray-900/40 rounded-2xl border border-gray-800/50 px-6 sm:px-8">
            {faqs.map((f, i) => <FAQItem key={i} question={f.q} answer={f.a} isOpen={openFAQ === i} onToggle={() => setOpenFAQ(openFAQ === i ? null : i)} />)}
          </div>
        </div>
        </ScrollReveal>
      </section>

      {/* ═══════ CONTACT ═══════ */}
      <section id="contact" className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 bg-gray-900/40">
        <ScrollReveal animation="fade-up" delay={100}>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-amber-400/40 mb-3 font-medium">Contact</p>
              <h2 className="text-3xl sm:text-4xl font-light text-white leading-tight mb-8">Get in touch.</h2>
              <div className="space-y-5">
                {lead.phone && (<a href={`tel:${lead.phone}`} onClick={onCallClick} className="flex items-center gap-4"><div className="w-12 h-12 rounded-xl bg-amber-400/5 border border-amber-500/10 flex items-center justify-center flex-shrink-0"><Phone size={20} className="text-amber-400" /></div><div><p className="text-sm font-medium text-white">{lead.phone}</p><p className="text-xs text-gray-600">Call or text anytime</p></div></a>)}
                {lead.email && (<a href={`mailto:${lead.email}`} className="flex items-center gap-4"><div className="w-12 h-12 rounded-xl bg-amber-400/5 border border-amber-500/10 flex items-center justify-center flex-shrink-0"><Mail size={20} className="text-amber-400" /></div><div><p className="text-sm font-medium text-white">{lead.email}</p><p className="text-xs text-gray-600">We respond same-day</p></div></a>)}
                {lead.enrichedAddress && (<div className="flex items-center gap-4"><div className="w-12 h-12 rounded-xl bg-amber-400/5 border border-amber-500/10 flex items-center justify-center flex-shrink-0"><MapPin size={20} className="text-amber-400" /></div><div><p className="text-sm font-medium text-white">{lead.enrichedAddress}</p><p className="text-xs text-gray-600">{location}</p></div></div>)}
              </div>
              <div className="flex gap-3 mt-10">
                <a href="#" className="w-10 h-10 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-500 hover:text-amber-400 hover:border-amber-500/20 transition-all"><Facebook size={16} /></a>
                <a href="#" className="w-10 h-10 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-500 hover:text-amber-400 hover:border-amber-500/20 transition-all"><Instagram size={16} /></a>
                <a href="#" className="w-10 h-10 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-500 hover:text-amber-400 hover:border-amber-500/20 transition-all"><GoogleIcon size={16} /></a>
              </div>
            </div>
            <div className="bg-gray-900/60 rounded-2xl border border-gray-800/50 p-7 sm:p-8">
              <h3 className="text-lg font-medium text-white mb-1">Send us a message</h3>
              <p className="text-xs text-gray-600 mb-6">We respond within 24 hours.</p>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="block text-[11px] font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Name</label><input type="text" placeholder="Your name" className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-500/30 placeholder:text-gray-600 transition-all" /></div>
                  <div><label className="block text-[11px] font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Phone</label><input type="tel" placeholder="(555) 555-5555" className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-500/30 placeholder:text-gray-600 transition-all" /></div>
                </div>
                <div><label className="block text-[11px] font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Email</label><input type="email" placeholder="your@email.com" className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-500/30 placeholder:text-gray-600 transition-all" /></div>
                <div><label className="block text-[11px] font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Project details</label><textarea rows={4} placeholder="Tell us about your project..." className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-500/30 placeholder:text-gray-600 transition-all resize-none" /></div>
                <button onClick={onCTAClick} className="w-full py-3.5 rounded-xl text-black font-semibold text-sm shadow-md" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>Send Message</button>
              </div>
            </div>
          </div>
        </div>
        </ScrollReveal>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer className="bg-black py-14 px-4 sm:px-6 md:px-8 border-t border-amber-500/8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
            <div>
              <span className="text-amber-400/60 font-light text-lg tracking-wide">{lead.companyName}</span>
              <p className="text-gray-700 text-sm leading-relaxed mt-3">Premium {industryLabel}{location ? ` in ${location}` : ''}. Excellence in every detail.</p>
              {hasRating && (<div className="flex items-center gap-2 mt-4"><div className="flex gap-0.5">{Array.from({ length: 5 }, (_, i) => <Star key={i} size={11} className={i < Math.floor(lead.enrichedRating || 0) ? 'text-amber-400 fill-current' : 'text-gray-800'} />)}</div><span className="text-gray-700 text-xs">{lead.enrichedRating} rating</span></div>)}
              <div className="flex gap-2.5 mt-5">
                <a href="#" className="w-8 h-8 rounded-lg bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-600 hover:text-amber-400 transition-all"><Facebook size={13} /></a>
                <a href="#" className="w-8 h-8 rounded-lg bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-600 hover:text-amber-400 transition-all"><Instagram size={13} /></a>
                <a href="#" className="w-8 h-8 rounded-lg bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-600 hover:text-amber-400 transition-all"><GoogleIcon size={12} /></a>
              </div>
            </div>
            <div><h4 className="text-xs uppercase tracking-[0.2em] text-amber-400/30 mb-4 font-medium">Services</h4><ul className="space-y-2.5 text-sm text-gray-600">{services.slice(0, 5).map((s, i) => <li key={i} className="flex items-center gap-2 hover:text-gray-300 transition-colors cursor-pointer"><CheckCircle size={11} className="text-amber-400/30 flex-shrink-0" />{s}</li>)}</ul></div>
            <div><h4 className="text-xs uppercase tracking-[0.2em] text-amber-400/30 mb-4 font-medium">Contact</h4><div className="space-y-3 text-sm text-gray-600">{lead.phone && <a href={`tel:${lead.phone}`} onClick={onCallClick} className="flex items-center gap-2.5 hover:text-white transition-colors"><Phone size={13} className="text-amber-400/30" />{lead.phone}</a>}{lead.email && <a href={`mailto:${lead.email}`} className="flex items-center gap-2.5 hover:text-white transition-colors"><Mail size={13} className="text-amber-400/30" />{lead.email}</a>}{lead.enrichedAddress && <p className="flex items-center gap-2.5"><MapPin size={13} className="text-amber-400/30 flex-shrink-0" />{lead.enrichedAddress}</p>}</div></div>
          </div>
          <div className="border-t border-gray-900 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-gray-700 text-xs">&copy; {new Date().getFullYear()} {lead.companyName}</p>
            {location && <p className="text-gray-800 text-xs">{location} · {industryLabel}</p>}
          </div>
        </div>
      </footer>

      {/* ═══════ STICKY MOBILE CTA ═══════ */}
      <div className="fixed bottom-0 left-0 right-0 z-40 sm:hidden bg-gray-950/95 backdrop-blur-xl border-t border-amber-500/10 px-4 py-3">
        <div className="flex gap-3">
          {lead.phone && <a href={`tel:${lead.phone}`} onClick={onCallClick} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-800 text-white font-semibold text-sm border border-gray-700"><Phone size={16} />Call</a>}
          <button onClick={onCTAClick} className="flex-[2] flex items-center justify-center gap-2 py-3 rounded-xl text-black font-semibold text-sm" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>Free Consultation</button>
        </div>
      </div>

      <ChatbotWidget companyName={lead.companyName} />
      <div className="h-20 sm:h-0" />
    </div>
  )
}
