'use client'
/*
 * PREMIUM-B TEMPLATE — "Jade"
 * Design Direction: Quiet Luxury, warm emerald/stone
 * Brand Voice: Quiet & Confident
 * Multi-page with hash-based client-side routing
 */

import { useState, useEffect, useRef } from 'react'
import {
  Phone, MapPin, Star, Shield, Clock, CheckCircle, ArrowRight, Mail,
  Leaf, Briefcase, Users, Camera, MessageSquare,
  MessageCircle, X, Send, ChevronDown, Menu, ChevronRight,
  Minus, Plus, Facebook, Instagram
} from 'lucide-react'
import type { TemplateProps } from '../config/template-types'
import DisclaimerBanner from '../shared/DisclaimerBanner'
import ScrollReveal from '../shared/ScrollReveal'
import usePageRouter from '../shared/usePageRouter'
import type { PageName } from '../shared/usePageRouter'
import PageShell from '../shared/PageShell'
import PageHeader from '../shared/PageHeader'

function formatNavPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11 && digits[0] === '1') {
    return `(${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`
  }
  return phone
}

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
      let reply = "Thank you for reaching out. A member of our team will be in touch shortly. For immediate assistance, please call us."
      if (msg.toLowerCase().includes('consult') || msg.toLowerCase().includes('quote') || msg.toLowerCase().includes('estimate')) reply = "We'd be delighted to arrange a complimentary consultation. Please share your project details, or call us directly."
      else if (msg.toLowerCase().includes('service')) reply = "We offer a full range of services — please see our Services section, or let us know what you're looking for."
      else if (msg.toLowerCase().includes('hour')) reply = "We're available Monday through Saturday. For immediate assistance, please call us anytime."
      setMessages(p => [...p, { from: 'bot', text: reply }]); setIsTyping(false)
    }, 1200)
  }
  return (
    <>
      <button onClick={() => setIsOpen(!isOpen)} className="fixed bottom-6 right-5 z-[100] group sm:bottom-6 bottom-20" aria-label="Chat">
        <div className="w-[58px] h-[58px] rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-105 bg-emerald-700 border border-emerald-600">
          {isOpen ? <X size={22} className="text-white" /> : <MessageCircle size={22} className="text-white" />}
        </div>
        {!isOpen && <span className="absolute inset-0 rounded-full animate-ping opacity-10 bg-emerald-500" />}
        {!isOpen && (<div className="absolute bottom-full right-0 mb-3 whitespace-nowrap bg-white text-stone-700 text-sm font-medium px-4 py-2 rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-stone-200">Chat with us<div className="absolute top-full right-6 w-2 h-2 bg-white transform rotate-45 -translate-y-1" /></div>)}
      </button>
      {isOpen && (
        <div className="fixed sm:bottom-24 bottom-28 right-5 z-[100] w-[370px] max-w-[calc(100vw-2.5rem)] bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
          <div className="px-5 py-4 bg-emerald-800 text-white">
            <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-emerald-700 flex items-center justify-center"><Leaf size={18} className="text-emerald-200" /></div><div><p className="font-semibold text-sm">{companyName}</p><div className="flex items-center gap-1.5"><span className="w-2 h-2 bg-emerald-300 rounded-full animate-pulse" /><span className="text-xs text-emerald-200/70">Online now</span></div></div></div>
            <p className="text-[10px] text-emerald-200/30 mt-2.5 tracking-wide uppercase">AI Assistant by Bright Automations · Included with your website</p>
          </div>
          <div className="h-[280px] overflow-y-auto px-4 py-4 space-y-3 bg-stone-50/50">
            {messages.map((msg, i) => (<div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[80%] px-4 py-2.5 text-sm leading-relaxed ${msg.from === 'user' ? 'bg-emerald-700 text-white rounded-2xl rounded-br-sm' : 'bg-white text-stone-700 rounded-2xl rounded-bl-sm shadow-sm border border-stone-100'}`}>{msg.text}</div></div>))}
            {isTyping && (<div className="flex justify-start"><div className="bg-white px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm border border-stone-100"><div className="flex gap-1"><span className="w-2 h-2 bg-emerald-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} /><span className="w-2 h-2 bg-emerald-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} /><span className="w-2 h-2 bg-emerald-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} /></div></div></div>)}
            <div ref={endRef} />
          </div>
          {messages.length <= 1 && (<div className="px-4 pb-2 flex gap-2 flex-wrap bg-stone-50/50">{quickReplies.map((qr, i) => (<button key={i} onClick={() => handleSend(qr)} className="text-xs px-3 py-1.5 rounded-full border border-stone-200 text-stone-600 hover:bg-emerald-50 hover:border-emerald-200 transition-all">{qr}</button>))}</div>)}
          <div className="px-4 py-3 border-t border-stone-100 bg-white"><div className="flex gap-2"><input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Type a message..." className="flex-1 text-sm px-4 py-2.5 rounded-full bg-stone-50 border border-stone-200 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 placeholder:text-stone-400" /><button onClick={() => handleSend()} disabled={!input.trim()} className="w-10 h-10 rounded-full bg-emerald-700 flex items-center justify-center text-white transition-all disabled:opacity-30"><Send size={15} /></button></div></div>
        </div>
      )}
    </>
  )
}

function MobileNav({ isOpen, onClose, companyName, sections, phone, onCallClick, onCTAClick, onNavigate }: { isOpen: boolean; onClose: () => void; companyName: string; sections: { page: PageName; label: string }[]; phone?: string; onCallClick: () => void; onCTAClick: () => void; onNavigate: (page: PageName) => void }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-[90] lg:hidden">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-[300px] bg-white shadow-2xl">
        <div className="p-6 h-full flex flex-col">
          <div className="flex justify-between items-center mb-10">
            <div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center"><Leaf size={14} className="text-white" /></div><span className="text-lg font-medium text-stone-800">{companyName}</span></div>
            <button onClick={onClose} className="w-9 h-9 rounded-lg bg-stone-100 flex items-center justify-center text-stone-500"><X size={18} /></button>
          </div>
          <nav className="space-y-1 flex-1">{sections.map((s) => (<button key={s.page} data-nav-page={s.page} onClick={() => { onNavigate(s.page); onClose() }} className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-stone-700 hover:bg-emerald-50 transition-all text-[15px] font-medium">{s.label}<ChevronRight size={16} className="text-stone-300" /></button>))}</nav>
          <div className="flex gap-3 mb-5">
            <a href="#" className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center text-stone-500 hover:text-emerald-700 transition-colors"><Facebook size={16} /></a>
            <a href="#" className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center text-stone-500 hover:text-emerald-700 transition-colors"><Instagram size={16} /></a>
            <a href="#" className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center text-stone-500 hover:text-emerald-700 transition-colors"><GoogleIcon size={16} /></a>
          </div>
          <div className="space-y-3">
            {phone && (<a href={`tel:${phone}`} onClick={() => { onCallClick(); onClose() }} className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-stone-100 text-stone-800 font-semibold text-sm border border-stone-200"><Phone size={16} />Call {formatNavPhone(phone)}</a>)}
            <button onClick={() => { onCTAClick(); onClose() }} className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-emerald-700 text-white font-semibold text-sm">Free Consultation</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function FAQItem({ question, answer, isOpen, onToggle }: { question: string; answer: string; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-stone-200/60 last:border-0">
      <button onClick={onToggle} className="w-full flex items-center justify-between py-5 text-left group">
        <span className="text-[15px] font-medium text-stone-700 group-hover:text-emerald-700 transition-colors pr-6">{question}</span>
        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center transition-all">
          {isOpen ? <Minus size={14} className="text-emerald-700" /> : <Plus size={14} className="text-emerald-400" />}
        </span>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[200px] opacity-100 pb-5' : 'max-h-0 opacity-0'}`}><p className="text-sm text-stone-500 leading-relaxed pr-14">{answer}</p></div>
    </div>
  )
}

/* ═══════ CTA BAND (reused on multiple pages) ═══════ */
function CTABand({ closingHeadline, location, onCTAClick }: { closingHeadline?: string; location: string; onCTAClick: () => Promise<void> }) {
  return (
    <section className="relative py-16 sm:py-20 md:py-24 overflow-hidden bg-emerald-800">
      <div className="absolute inset-0 opacity-10"><div className="absolute top-0 right-0 w-96 h-96 bg-emerald-400 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" /><div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-300 rounded-full translate-y-1/2 -translate-x-1/3 blur-3xl" /></div>
      <ScrollReveal animation="fade-up" delay={0}>
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 md:px-8 text-center">
        <p className="text-2xl sm:text-3xl md:text-4xl font-light text-white leading-snug tracking-tight mb-8">{closingHeadline || "Excellence in every detail."}</p>
        <button onClick={onCTAClick} className="inline-flex items-center gap-2.5 bg-white text-emerald-800 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-emerald-50 transition-all shadow-lg group">
          Get Started <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
        </button>
        {location && <p className="mt-6 text-emerald-200/40 text-sm font-medium tracking-wide">{location}</p>}
      </div>
      </ScrollReveal>
    </section>
  )
}

// ═══════ MAIN TEMPLATE ═══════
export default function PremiumBTemplate({ lead, config, onCTAClick, onCallClick, websiteCopy }: TemplateProps) {
  const { currentPage, navigateTo } = usePageRouter()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [openFAQ, setOpenFAQ] = useState<number | null>(null)
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', message: '' })
  const [formSubmitted, setFormSubmitted] = useState(false)
  const [formLoading, setFormLoading] = useState(false)

  const handleFormSubmit = async () => {
    if (formLoading || formSubmitted) return
    if (!formData.name && !formData.phone && !formData.email) return
    setFormLoading(true)
    try {
      await fetch('/api/preview/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          previewId: lead.previewId,
          event: 'contact_form',
          metadata: { ...formData },
        }),
      })
      setFormSubmitted(true)
    } catch {
      // silently fail
    } finally {
      setFormLoading(false)
    }
  }

  const services = lead.enrichedServices || []
  const photos = lead.enrichedPhotos || []
  const industryLabel = lead.industry.toLowerCase().replace(/_/g, ' ')
  const location = [lead.city, lead.state].filter(Boolean).join(', ')
  const hasRating = lead.enrichedRating && lead.enrichedRating > 0
  const wc = websiteCopy

  const navSections: { page: PageName; label: string }[] = [
    { page: 'home', label: 'Home' }, { page: 'services', label: 'Services' },
    { page: 'about', label: 'About' }, { page: 'portfolio', label: 'Portfolio' },
    { page: 'contact', label: 'Contact' },
  ]
  const faqs = [
    { q: 'How does the consultation work?', a: 'Free assessment of your needs followed by a transparent, no-obligation estimate.' },
    { q: 'What areas do you serve?', a: `We serve ${location || 'the local area'} and surrounding communities.` },
    { q: 'Are you licensed and insured?', a: 'Fully licensed, bonded, and insured on every project.' },
    { q: 'How soon can work begin?', a: 'Most projects start within 1–2 weeks of approval.' },
    { q: 'What guarantees do you provide?', a: 'Every project is backed by our complete satisfaction guarantee.' },
  ]

  const testimonials = wc?.testimonialQuote
    ? [{ quote: wc.testimonialQuote, name: wc.testimonialAuthor || 'Verified Customer', loc: lead.city || 'Local' }]
    : [
        { quote: `Called on a Monday, had a crew here by Wednesday. They finished ahead of schedule and left the place spotless. Already told three neighbors about ${lead.companyName}.`, name: 'Sarah M.', loc: lead.city || 'Local' },
        { quote: `We've used other companies before — no comparison. ${lead.companyName} showed up on time, communicated every step, and the final result was exactly what we pictured.`, name: 'David R.', loc: lead.city || 'Local' },
      ]

  return (
    <div className="preview-template min-h-screen bg-stone-50 antialiased">
      <DisclaimerBanner variant="premium" companyName={lead.companyName} />

      {/* ═══════ NAV ═══════ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-stone-50/95 backdrop-blur-xl border-b border-stone-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex items-center justify-between h-[68px]">
            <button onClick={() => navigateTo('home')} className="flex items-center gap-2.5 cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center"><Leaf size={14} className="text-white" /></div>
              <span className="text-lg font-medium text-stone-900 tracking-wide">{lead.companyName}</span>
            </button>
            <div className="hidden lg:flex items-center gap-1.5">{navSections.map((s) => (
              <button key={s.page} data-nav-page={s.page} onClick={() => navigateTo(s.page)} className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${currentPage === s.page ? 'text-emerald-700 bg-emerald-50' : 'text-stone-500 hover:text-emerald-700 hover:bg-emerald-50'}`}>{s.label}</button>
            ))}</div>
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-0.5 text-stone-400">
                <a href="#" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-emerald-50 hover:text-emerald-600 transition-all"><Facebook size={14} /></a>
                <a href="#" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-emerald-50 hover:text-emerald-600 transition-all"><Instagram size={14} /></a>
                <a href="#" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-emerald-50 hover:text-emerald-600 transition-all"><GoogleIcon size={13} /></a>
              </div>
              <div className="hidden md:block w-px h-5 bg-stone-200" />
              {lead.phone && (<a href={`tel:${lead.phone}`} onClick={onCallClick} className="hidden lg:flex items-center gap-2 text-sm text-stone-500 hover:text-emerald-700 font-medium"><Phone size={14} />{formatNavPhone(lead.phone)}</a>)}
              <button onClick={onCTAClick} className="hidden sm:flex bg-emerald-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-600 transition-all shadow-md">Free Consultation</button>
              <button onClick={() => setMobileNavOpen(true)} className="lg:hidden w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center text-stone-600 border border-stone-200"><Menu size={20} /></button>
            </div>
          </div>
        </div>
      </nav>

      <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} companyName={lead.companyName} sections={navSections} phone={lead.phone} onCallClick={onCallClick} onCTAClick={onCTAClick} onNavigate={navigateTo} />

      {/* ═══════════════════════════════════════════
          PAGE: HOME
       ═══════════════════════════════════════════ */}
      <PageShell page="home" currentPage={currentPage}>
        {/* HERO */}
        <section className="relative min-h-[100svh] flex items-center justify-center overflow-hidden bg-stone-50">
          <div className="absolute top-10 right-[10%] w-64 h-64 bg-emerald-100/50 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-[5%] w-80 h-80 bg-emerald-50/60 rounded-full blur-3xl" />
          <div className="relative max-w-4xl mx-auto w-full px-4 sm:px-6 md:px-8 py-32 text-center">
            {location && <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-emerald-600/50 mb-6 font-medium"><MapPin size={12} className="text-emerald-500/40" />{location}</p>}
            <h1 className="font-display text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-light text-stone-900 mb-6 tracking-tight leading-[1.02]">{lead.companyName}</h1>
            {wc?.heroSubheadline && (
              <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto mb-8 leading-relaxed">{wc.heroSubheadline}</p>
            )}
            <div className="w-20 h-0.5 bg-gradient-to-r from-emerald-600 to-emerald-400 mx-auto mb-6 rounded-full" />
            <p className="text-lg sm:text-xl text-stone-500 leading-relaxed max-w-2xl mx-auto mb-8">{wc?.heroHeadline || config.tagline}</p>
            {hasRating && (
              <div className="inline-flex items-center gap-3 bg-white border border-stone-200 rounded-full px-6 py-3 shadow-sm mb-10">
                <div className="flex gap-0.5">{Array.from({ length: 5 }, (_, i) => <Star key={i} size={15} className={i < Math.floor(lead.enrichedRating || 0) ? 'text-emerald-500 fill-current' : 'text-stone-300'} />)}</div>
                <span className="text-emerald-700 font-semibold text-sm">{lead.enrichedRating}-Star Rated</span>
                {lead.enrichedReviews && <span className="text-stone-400 text-sm">({lead.enrichedReviews} reviews)</span>}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {lead.phone && (<a href={`tel:${lead.phone}`} onClick={onCallClick} className="inline-flex items-center justify-center gap-2.5 bg-emerald-700 text-white px-10 py-4 rounded-xl font-semibold text-lg hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-700/20"><Phone size={20} />Call Now</a>)}
              <button onClick={onCTAClick} className="inline-flex items-center justify-center gap-2.5 border-2 border-emerald-700/25 text-emerald-700 px-10 py-4 rounded-xl font-semibold text-lg hover:bg-emerald-700 hover:text-white hover:border-emerald-700 transition-all duration-300 group">{config.ctaText}<ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></button>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-800 via-emerald-500 to-emerald-800" />
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-stone-300"><span className="text-[10px] uppercase tracking-[0.25em] font-medium">Scroll</span><ChevronDown size={18} className="animate-bounce" /></div>
        </section>

        {/* PROOF STRIP */}
        <section className="py-4 px-4 sm:px-6 md:px-8 bg-white border-b border-stone-200">
          <ScrollReveal animation="fade-in" delay={0}>
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm">
            {hasRating && <span className="flex items-center gap-2 text-stone-700 font-semibold"><Star size={13} className="text-emerald-500 fill-current" />{lead.enrichedRating} Rating</span>}
            {lead.enrichedReviews && (<><span className="text-stone-200 hidden sm:inline">•</span><span className="text-stone-500">{lead.enrichedReviews}+ Reviews</span></>)}
            <span className="text-stone-200 hidden sm:inline">•</span>
            <span className="flex items-center gap-1.5 text-stone-500"><Shield size={13} className="text-emerald-600/50" />Licensed & Insured</span>
            <span className="text-stone-200 hidden sm:inline">•</span>
            <span className="flex items-center gap-1.5 text-stone-500"><Clock size={13} className="text-emerald-600/50" />Same-Day Response</span>
            {location && (<><span className="text-stone-200 hidden sm:inline">•</span><span className="flex items-center gap-1.5 text-stone-500"><MapPin size={13} className="text-emerald-600/50" />{location}</span></>)}
            {wc?.yearsBadge && (
              <><span className="text-stone-200 hidden sm:inline">•</span><span className="flex items-center gap-1.5 text-stone-500">{wc.yearsBadge}</span></>
            )}
          </div>
          </ScrollReveal>
        </section>

        {/* HOMEPAGE: SERVICES PREVIEW */}
        {services.length > 0 && (
          <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 bg-stone-50">
            <div className="max-w-6xl mx-auto">
              <ScrollReveal animation="fade-up" delay={0}>
              <div className="flex items-end justify-between mb-12 sm:mb-16">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-emerald-600/50 mb-3 font-medium">What We Do</p>
                  <h2 className="text-3xl sm:text-4xl font-light text-stone-900 leading-tight">Our Services</h2>
                </div>
                <button onClick={() => navigateTo('services')} className="hidden sm:inline-flex items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-600 transition-colors group">
                  View All Services <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
              </ScrollReveal>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {services.slice(0, 6).map((service, i) => (
                  <ScrollReveal key={i} animation="fade-up" delay={i * 80}>
                  <button onClick={() => navigateTo('services')} className="group bg-white border border-stone-200 rounded-2xl p-6 text-left hover:border-emerald-300 hover:shadow-md transition-all duration-300 w-full">
                    <div className="flex items-start gap-4">
                      <span className="text-xs text-emerald-500/40 font-mono tabular-nums font-medium mt-1">{String(i + 1).padStart(2, '0')}</span>
                      <div>
                        <h3 className="text-base font-medium text-stone-800 group-hover:text-emerald-700 transition-colors mb-1">{service}</h3>
                        {wc?.serviceDescriptions?.[service] && (
                          <p className="text-sm text-stone-500 leading-relaxed line-clamp-2">{wc.serviceDescriptions[service]}</p>
                        )}
                      </div>
                    </div>
                  </button>
                  </ScrollReveal>
                ))}
              </div>
              <button onClick={() => navigateTo('services')} className="sm:hidden mt-8 inline-flex items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-600 transition-colors group">
                View All Services <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </section>
        )}

        {/* HOMEPAGE: ABOUT PREVIEW */}
        <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <ScrollReveal animation="fade-left" delay={0}>
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-emerald-600/50 mb-3 font-medium">About Us</p>
                <h2 className="text-3xl sm:text-4xl font-light text-stone-900 leading-tight mb-6">{lead.companyName}</h2>
                <p className="text-stone-600 text-base leading-relaxed mb-6">{wc?.aboutParagraph1 || `${lead.companyName} delivers expert ${industryLabel}${location ? ` in ${location}` : ''} with a client-first approach.`}</p>
                <div className="flex flex-wrap gap-8 mb-8">
                  <div><p className="font-display text-3xl font-light text-emerald-700">{hasRating ? lead.enrichedRating : '5.0'}</p><p className="text-[11px] uppercase tracking-[0.2em] text-stone-500 mt-1">Star Rating</p></div>
                  {lead.enrichedReviews && (<div><p className="font-display text-3xl font-light text-emerald-700">{lead.enrichedReviews}+</p><p className="text-[11px] uppercase tracking-[0.2em] text-stone-500 mt-1">Reviews</p></div>)}
                  <div><p className="font-display text-3xl font-light text-emerald-700">100%</p><p className="text-[11px] uppercase tracking-[0.2em] text-stone-500 mt-1">Satisfaction</p></div>
                </div>
                <button onClick={() => navigateTo('about')} className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-600 transition-colors group">
                  Learn More About Us <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
              </ScrollReveal>
              <ScrollReveal animation="fade-right" delay={200}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {(wc?.valueProps || [
                  { title: 'Consultation', description: `Understanding your ${industryLabel} needs first` },
                  { title: 'Expert Execution', description: 'Precision and care in every detail' },
                  { title: 'Lasting Results', description: 'Work that stands the test of time' },
                ]).slice(0, 3).map((vp, i) => (
                  <div key={i} className="bg-stone-50 border border-stone-200 rounded-2xl p-5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-3 border border-emerald-100"><CheckCircle size={18} className="text-emerald-600" /></div>
                    <h4 className="text-sm font-medium text-stone-800 mb-1">{vp.title}</h4>
                    <p className="text-xs text-stone-500 leading-relaxed">{vp.description}</p>
                  </div>
                ))}
              </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* HOMEPAGE: PORTFOLIO PREVIEW */}
        {photos.length > 0 && (
          <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 bg-stone-50">
            <div className="max-w-6xl mx-auto">
              <ScrollReveal animation="fade-up" delay={0}>
              <div className="flex items-end justify-between mb-10 sm:mb-14">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-emerald-600/50 mb-3 font-medium">Portfolio</p>
                  <h2 className="text-3xl sm:text-4xl font-light text-stone-900">Our Work</h2>
                </div>
                <button onClick={() => navigateTo('portfolio')} className="hidden sm:inline-flex items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-600 transition-colors group">
                  View All Work <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
              </ScrollReveal>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                {photos.slice(0, 3).map((photo, i) => (
                  <ScrollReveal key={i} animation="zoom-in" delay={i * 100}>
                  <button onClick={() => navigateTo('portfolio')} className="relative overflow-hidden rounded-2xl group border border-stone-200 hover:border-emerald-400/40 transition-all w-full">
                    <img src={photo} alt={`Project ${i + 1}`} className="w-full aspect-[4/3] object-cover transition-transform duration-700 group-hover:scale-105" {...(i > 0 ? { loading: 'lazy' as const } : {})} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                  </ScrollReveal>
                ))}
              </div>
              <button onClick={() => navigateTo('portfolio')} className="sm:hidden mt-8 inline-flex items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-600 transition-colors group">
                View All Work <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </section>
        )}

        {/* HOMEPAGE: TESTIMONIAL HIGHLIGHT */}
        <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 bg-white">
          <div className="max-w-3xl mx-auto text-center">
            <ScrollReveal animation="fade-up" delay={0}>
              <p className="text-xs uppercase tracking-[0.25em] text-emerald-600/50 mb-3 font-medium">What Clients Say</p>
              <div className="flex justify-center gap-0.5 mb-6">{Array.from({ length: 5 }, (_, j) => <Star key={j} size={18} className="text-emerald-500 fill-current" />)}</div>
              <p className="text-xl sm:text-2xl text-stone-700 leading-relaxed italic font-light mb-6">"{testimonials[0].quote}"</p>
              <div className="flex items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100"><span className="text-emerald-700 font-semibold text-sm">{testimonials[0].name[0]}</span></div>
                <div className="text-left"><span className="font-medium text-stone-800 text-sm">{testimonials[0].name}</span><span className="text-stone-400 text-sm"> — {testimonials[0].loc}</span></div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* HOMEPAGE: CTA BAND */}
        <CTABand closingHeadline={wc?.closingHeadline} location={location} onCTAClick={onCTAClick} />
      </PageShell>

      {/* ═══════════════════════════════════════════
          PAGE: SERVICES
       ═══════════════════════════════════════════ */}
      <PageShell page="services" currentPage={currentPage}>
        <PageHeader
          title="Our Services"
          subtitle={`Expert ${industryLabel}${location ? ` serving ${location}` : ''} and surrounding areas.`}
          bgClass="bg-emerald-800"
          subtitleClass="text-emerald-200/60"
          accentClass="text-emerald-300"
          onBackClick={() => navigateTo('home')}
        />

        {services.length > 0 && (
          <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 bg-stone-50">
            <div className="max-w-5xl mx-auto">
              <div className="divide-y divide-stone-200/60">
                {services.slice(0, 8).map((service, i) => (
                  <ScrollReveal key={i} animation="fade-left" delay={i * 100}>
                  <div className="group flex items-center justify-between py-5 sm:py-6 cursor-pointer hover:pl-2 transition-all duration-300" onClick={onCTAClick}>
                    <div className="flex items-start gap-5">
                      <span className="text-xs text-emerald-500/40 font-mono tabular-nums w-6 font-medium">{String(i + 1).padStart(2, '0')}</span>
                      <div className="flex flex-col min-w-0">
                        <h3 className="text-base sm:text-lg font-medium text-stone-800 group-hover:text-emerald-700 transition-colors">{service}</h3>
                        {wc?.serviceDescriptions?.[service] && (
                          <p className="text-sm text-gray-600 mt-1 leading-relaxed">{wc.serviceDescriptions[service]}</p>
                        )}
                      </div>
                    </div>
                    <ArrowRight size={16} className="text-stone-300 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
                  </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Service area info */}
        {(wc?.serviceAreaText || location) && (
          <section className="py-12 px-4 sm:px-6 md:px-8 bg-white border-t border-stone-200">
            <div className="max-w-3xl mx-auto text-center">
              <ScrollReveal animation="fade-up" delay={0}>
                <div className="flex items-center justify-center gap-2 mb-3">
                  <MapPin size={16} className="text-emerald-600" />
                  <h3 className="text-lg font-medium text-stone-800">Service Area</h3>
                </div>
                <p className="text-stone-500 text-sm leading-relaxed">{wc?.serviceAreaText || `Proudly serving ${location} and all surrounding communities. Contact us to confirm availability in your area.`}</p>
              </ScrollReveal>
            </div>
          </section>
        )}

        <CTABand closingHeadline={wc?.closingHeadline} location={location} onCTAClick={onCTAClick} />
      </PageShell>

      {/* ═══════════════════════════════════════════
          PAGE: ABOUT
       ═══════════════════════════════════════════ */}
      <PageShell page="about" currentPage={currentPage}>
        <PageHeader
          title="About Us"
          subtitle={`Get to know ${lead.companyName} — your trusted partner in ${industryLabel}.`}
          bgClass="bg-emerald-800"
          subtitleClass="text-emerald-200/60"
          accentClass="text-emerald-300"
          onBackClick={() => navigateTo('home')}
        />

        {/* Full About section */}
        <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 bg-stone-50">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16 items-start">
              <ScrollReveal animation="fade-left" delay={0} className="lg:col-span-3">
              <div>
                <h2 className="text-3xl sm:text-4xl font-light text-stone-900 leading-tight mb-6">{lead.companyName}</h2>
                <div className="space-y-4 text-stone-600 text-base leading-relaxed">
                  <p>{wc?.aboutParagraph1 || `${lead.companyName} delivers expert ${industryLabel}${location ? ` in ${location}` : ''} with a client-first approach.`}</p>
                  {wc?.aboutParagraph2 && <p>{wc.aboutParagraph2}</p>}
                  {wc?.closingBody && <p>{wc.closingBody}</p>}
                </div>
                <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {(wc?.valueProps || [
                    { title: 'Consultation', description: `Understanding your ${industryLabel} needs first` },
                    { title: 'Expert Execution', description: 'Precision and care in every detail' },
                    { title: 'Lasting Results', description: 'Work that stands the test of time' },
                  ]).slice(0, 3).map((vp, i) => (
                    <div key={i}><div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-3 border border-emerald-100"><CheckCircle size={18} className="text-emerald-600" /></div><h4 className="text-sm font-medium text-stone-800 mb-1">{vp.title}</h4><p className="text-xs text-stone-500 leading-relaxed">{vp.description}</p></div>
                  ))}
                </div>
                <div className="mt-10 flex flex-wrap gap-12">
                  <div><p className="font-display text-4xl font-light text-emerald-700">{hasRating ? lead.enrichedRating : '5.0'}</p><p className="text-[11px] uppercase tracking-[0.2em] text-stone-500 mt-2">Star Rating</p></div>
                  {lead.enrichedReviews && (<div><p className="font-display text-4xl font-light text-emerald-700">{lead.enrichedReviews}+</p><p className="text-[11px] uppercase tracking-[0.2em] text-stone-500 mt-2">Reviews</p></div>)}
                  <div><p className="font-display text-4xl font-light text-emerald-700">100%</p><p className="text-[11px] uppercase tracking-[0.2em] text-stone-500 mt-2">Satisfaction</p></div>
                </div>
              </div>
              </ScrollReveal>
              <ScrollReveal animation="fade-right" delay={200} className="lg:col-span-2">
              <div className="flex flex-col gap-5">
                <div className="bg-white border border-stone-200 rounded-2xl p-7">
                  <div className="flex gap-0.5 mb-4">{Array.from({ length: 5 }, (_, i) => <Star key={i} size={14} className="text-emerald-500 fill-current" />)}</div>
                  <p className="text-stone-600 text-base italic leading-relaxed mb-4">&ldquo;Working with {lead.companyName} was truly exceptional.&rdquo;</p>
                  <div className="w-8 h-0.5 bg-emerald-200 rounded-full mb-2" />
                  <span className="text-stone-400 text-xs font-medium">Satisfied Client{location ? ` · ${location}` : ''}</span>
                </div>
                <div className="bg-white border border-stone-200 rounded-2xl p-7">
                  <h3 className="font-medium text-stone-800 text-base mb-1">Ready to get started?</h3>
                  <p className="text-stone-400 text-xs mb-5">Free consultation · Same-day response</p>
                  <div className="space-y-3.5">
                    {lead.phone && (<a href={`tel:${lead.phone}`} onClick={onCallClick} className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0 border border-emerald-100"><Phone size={14} className="text-emerald-600" /></div><div><p className="text-[11px] text-stone-400 uppercase tracking-wider font-semibold">Phone</p><p className="text-sm font-semibold text-stone-800">{lead.phone}</p></div></a>)}
                    {lead.email && (<a href={`mailto:${lead.email}`} className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0 border border-emerald-100"><Mail size={14} className="text-emerald-600" /></div><div><p className="text-[11px] text-stone-400 uppercase tracking-wider font-semibold">Email</p><p className="text-sm font-semibold text-stone-800">{lead.email}</p></div></a>)}
                    {lead.enrichedAddress && (<div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0 border border-emerald-100"><MapPin size={14} className="text-emerald-600" /></div><div><p className="text-[11px] text-stone-400 uppercase tracking-wider font-semibold">Location</p><p className="text-sm font-semibold text-stone-800">{lead.enrichedAddress}</p></div></div>)}
                  </div>
                </div>
              </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* Full Testimonials */}
        <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 bg-stone-100/50">
          <div className="max-w-6xl mx-auto">
            <ScrollReveal animation="fade-up" delay={0}>
            <div className="text-center mb-12 sm:mb-16">
              <p className="text-xs uppercase tracking-[0.25em] text-emerald-600/50 mb-3 font-medium">Testimonials</p>
              <h2 className="text-3xl sm:text-4xl font-light text-stone-900">What clients say.</h2>
            </div>
            </ScrollReveal>
            <div className={testimonials.length === 1 ? 'max-w-2xl mx-auto' : 'grid grid-cols-1 md:grid-cols-2 gap-6'}>
              {testimonials.map((r, i) => (
                <ScrollReveal key={i} animation="fade-up" delay={i * 100}>
                <div className="bg-white border border-stone-200 rounded-2xl p-8 hover:border-emerald-400/30 transition-all">
                  <div className="flex gap-0.5 mb-4">{Array.from({ length: 5 }, (_, j) => <Star key={j} size={15} className="text-emerald-500 fill-current" />)}</div>
                  <p className="text-stone-600 text-base leading-relaxed mb-5 italic font-light">&ldquo;{r.quote}&rdquo;</p>
                  <div className="flex items-center gap-3 text-sm pt-4 border-t border-stone-100">
                    <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100"><span className="text-emerald-700 font-semibold text-xs">{r.name[0]}</span></div>
                    <div><span className="font-medium text-stone-800">{r.name}</span><span className="text-stone-400"> — {r.loc}</span></div>
                  </div>
                </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        <CTABand closingHeadline={wc?.closingHeadline} location={location} onCTAClick={onCTAClick} />
      </PageShell>

      {/* ═══════════════════════════════════════════
          PAGE: PORTFOLIO
       ═══════════════════════════════════════════ */}
      <PageShell page="portfolio" currentPage={currentPage}>
        <PageHeader
          title="Our Work"
          subtitle="Browse our portfolio of completed projects."
          bgClass="bg-emerald-800"
          subtitleClass="text-emerald-200/60"
          accentClass="text-emerald-300"
          onBackClick={() => navigateTo('home')}
        />

        <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 bg-white">
          <div className="max-w-7xl mx-auto">
            {photos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                {photos.slice(0, 6).map((photo, i) => (
                  <ScrollReveal key={i} animation="zoom-in" delay={i * 100} className={i === 0 ? 'col-span-1 sm:col-span-2 sm:row-span-2' : ''}>
                  <div className="relative overflow-hidden rounded-2xl group border border-stone-200 hover:border-emerald-400/40 transition-all">
                    <img src={photo} alt={`Project ${i + 1}`} className={`w-full object-cover transition-transform duration-700 group-hover:scale-105 ${i === 0 ? 'aspect-[4/3]' : 'aspect-[4/3] sm:aspect-square'}`} {...(i > 0 ? { loading: 'lazy' as const } : {})} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  </ScrollReveal>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                  <Camera size={24} className="text-emerald-600" />
                </div>
                <h3 className="text-lg font-medium text-stone-800 mb-2">Portfolio Coming Soon</h3>
                <p className="text-sm text-stone-500 max-w-md mx-auto">We&apos;re putting together our best project photos. Contact us to see examples of our work.</p>
                <button onClick={onCTAClick} className="mt-6 inline-flex items-center gap-2 bg-emerald-700 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-emerald-600 transition-all">
                  Request Examples <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>
        </section>

        <CTABand closingHeadline={wc?.closingHeadline} location={location} onCTAClick={onCTAClick} />
      </PageShell>

      {/* ═══════════════════════════════════════════
          PAGE: CONTACT
       ═══════════════════════════════════════════ */}
      <PageShell page="contact" currentPage={currentPage}>
        <PageHeader
          title="Get In Touch"
          subtitle="We'd love to hear from you. Reach out for a free consultation."
          bgClass="bg-emerald-800"
          subtitleClass="text-emerald-200/60"
          accentClass="text-emerald-300"
          onBackClick={() => navigateTo('home')}
        />

        {/* Contact form + info */}
        <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
              <ScrollReveal animation="fade-left" delay={0}>
              <div>
                <h2 className="text-3xl sm:text-4xl font-light text-stone-900 leading-tight mb-8">Contact Information</h2>
                <div className="space-y-5">
                  {lead.phone && (<a href={`tel:${lead.phone}`} onClick={onCallClick} className="flex items-center gap-4"><div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0 border border-emerald-100"><Phone size={20} className="text-emerald-600" /></div><div><p className="text-sm font-medium text-stone-800">{lead.phone}</p><p className="text-xs text-stone-400">Call or text anytime</p></div></a>)}
                  {lead.email && (<a href={`mailto:${lead.email}`} className="flex items-center gap-4"><div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0 border border-emerald-100"><Mail size={20} className="text-emerald-600" /></div><div><p className="text-sm font-medium text-stone-800">{lead.email}</p><p className="text-xs text-stone-400">We respond same-day</p></div></a>)}
                  {lead.enrichedAddress && (<div className="flex items-center gap-4"><div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0 border border-emerald-100"><MapPin size={20} className="text-emerald-600" /></div><div><p className="text-sm font-medium text-stone-800">{lead.enrichedAddress}</p><p className="text-xs text-stone-400">{location}</p></div></div>)}
                </div>
                <div className="flex gap-3 mt-10">
                  <a href="#" className="w-10 h-10 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-center text-stone-400 hover:text-emerald-600 hover:border-emerald-200 transition-all"><Facebook size={16} /></a>
                  <a href="#" className="w-10 h-10 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-center text-stone-400 hover:text-emerald-600 hover:border-emerald-200 transition-all"><Instagram size={16} /></a>
                  <a href="#" className="w-10 h-10 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-center text-stone-400 hover:text-emerald-600 hover:border-emerald-200 transition-all"><GoogleIcon size={16} /></a>
                </div>
              </div>
              </ScrollReveal>
              <ScrollReveal animation="fade-right" delay={200}>
              <div className="bg-stone-50 rounded-2xl border border-stone-200 p-7 sm:p-8">
                <h3 className="text-lg font-medium text-stone-800 mb-1">Send us a message</h3>
                <p className="text-xs text-stone-400 mb-6">We respond within 24 hours.</p>
                {formSubmitted ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle size={32} className="text-green-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-stone-800 mb-2">Message Sent!</h3>
                    <p className="text-sm text-stone-500">We&apos;ll get back to you shortly.</p>
                  </div>
                ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className="block text-[11px] font-medium text-stone-400 mb-1.5 uppercase tracking-wider">Name</label><input type="text" placeholder="Your name" value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} className="w-full px-4 py-3 rounded-xl bg-white border border-stone-200 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-300 placeholder:text-stone-300 transition-all" /></div>
                    <div><label className="block text-[11px] font-medium text-stone-400 mb-1.5 uppercase tracking-wider">Phone</label><input type="tel" placeholder="(555) 555-5555" value={formData.phone} onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))} className="w-full px-4 py-3 rounded-xl bg-white border border-stone-200 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-300 placeholder:text-stone-300 transition-all" /></div>
                  </div>
                  <div><label className="block text-[11px] font-medium text-stone-400 mb-1.5 uppercase tracking-wider">Email</label><input type="email" placeholder="your@email.com" value={formData.email} onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))} className="w-full px-4 py-3 rounded-xl bg-white border border-stone-200 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-300 placeholder:text-stone-300 transition-all" /></div>
                  <div><label className="block text-[11px] font-medium text-stone-400 mb-1.5 uppercase tracking-wider">Project details</label><textarea rows={4} placeholder="Tell us about your project..." value={formData.message} onChange={(e) => setFormData(p => ({ ...p, message: e.target.value }))} className="w-full px-4 py-3 rounded-xl bg-white border border-stone-200 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-300 placeholder:text-stone-300 transition-all resize-none" /></div>
                  <button onClick={handleFormSubmit} className="w-full py-3.5 rounded-xl bg-emerald-700 text-white font-semibold text-sm hover:bg-emerald-600 transition-all shadow-md">{formLoading ? 'Sending...' : 'Send Message'}</button>
                </div>
                )}
              </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 bg-stone-50">
          <div className="max-w-3xl mx-auto">
            <ScrollReveal animation="fade-up" delay={0}>
            <div className="text-center mb-10 sm:mb-14">
              <p className="text-xs uppercase tracking-[0.25em] text-emerald-600/50 mb-3 font-medium">FAQ</p>
              <h2 className="text-3xl sm:text-4xl font-light text-stone-900">Common questions.</h2>
            </div>
            </ScrollReveal>
            <div className="bg-white rounded-2xl border border-stone-200 px-6 sm:px-8 shadow-sm">
              {faqs.map((f, i) => <ScrollReveal key={i} animation="fade-up" delay={i * 100}><FAQItem question={f.q} answer={f.a} isOpen={openFAQ === i} onToggle={() => setOpenFAQ(openFAQ === i ? null : i)} /></ScrollReveal>)}
            </div>
          </div>
        </section>
      </PageShell>

      {/* ═══════ FOOTER (always visible) ═══════ */}
      <footer className="bg-emerald-900 py-14 px-4 sm:px-6 md:px-8 border-t border-emerald-700/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
            <div>
              <span className="text-emerald-300/70 font-light text-lg tracking-wide">{lead.companyName}</span>
              <p className="text-emerald-100/30 text-sm leading-relaxed mt-3">Premium {industryLabel}{location ? ` in ${location}` : ''}. Excellence in every detail.</p>
              {hasRating && (<div className="flex items-center gap-2 mt-4"><div className="flex gap-0.5">{Array.from({ length: 5 }, (_, i) => <Star key={i} size={11} className={i < Math.floor(lead.enrichedRating || 0) ? 'text-emerald-400 fill-current' : 'text-emerald-800'} />)}</div><span className="text-emerald-100/30 text-xs">{lead.enrichedRating} rating</span></div>)}
              <div className="flex gap-2.5 mt-5">
                <a href="#" className="w-8 h-8 rounded-lg bg-emerald-800 border border-emerald-700/50 flex items-center justify-center text-emerald-100/30 hover:text-white transition-all"><Facebook size={13} /></a>
                <a href="#" className="w-8 h-8 rounded-lg bg-emerald-800 border border-emerald-700/50 flex items-center justify-center text-emerald-100/30 hover:text-white transition-all"><Instagram size={13} /></a>
                <a href="#" className="w-8 h-8 rounded-lg bg-emerald-800 border border-emerald-700/50 flex items-center justify-center text-emerald-100/30 hover:text-white transition-all"><GoogleIcon size={12} /></a>
              </div>
            </div>
            <div>
              <h4 className="text-xs uppercase tracking-[0.2em] text-emerald-400/40 mb-4 font-medium">Quick Links</h4>
              <ul className="space-y-2.5 text-sm text-emerald-100/30">
                {navSections.map((s) => (
                  <li key={s.page}><button onClick={() => navigateTo(s.page)} data-nav-page={s.page} className="hover:text-white transition-colors">{s.label}</button></li>
                ))}
              </ul>
            </div>
            <div><h4 className="text-xs uppercase tracking-[0.2em] text-emerald-400/40 mb-4 font-medium">Contact</h4><div className="space-y-3 text-sm text-emerald-100/30">{lead.phone && <a href={`tel:${lead.phone}`} onClick={onCallClick} className="flex items-center gap-2.5 hover:text-white transition-colors"><Phone size={13} className="text-emerald-500/40" />{lead.phone}</a>}{lead.email && <a href={`mailto:${lead.email}`} className="flex items-center gap-2.5 hover:text-white transition-colors"><Mail size={13} className="text-emerald-500/40" />{lead.email}</a>}{lead.enrichedAddress && <p className="flex items-center gap-2.5"><MapPin size={13} className="text-emerald-500/40 flex-shrink-0" />{lead.enrichedAddress}</p>}</div></div>
          </div>
          <div className="border-t border-emerald-800/50 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-emerald-100/20 text-xs">&copy; {new Date().getFullYear()} {lead.companyName}</p>
            {location && <p className="text-emerald-100/15 text-xs">{location} · {industryLabel}</p>}
          </div>
        </div>
      </footer>

      <ChatbotWidget companyName={lead.companyName} />
      <div className="h-16 sm:h-0" />
    </div>
  )
}
