'use client'
/*
 * MODERN-B TEMPLATE — "Prism"
 * Design Direction: Modern SaaS, violet/purple
 * Brand Voice: Technical & Precise + warm
 * Multi-page with hash-based client-side routing
 */

import { useState, useEffect, useRef } from 'react'
import {
  Phone, MapPin, Star, Shield, Clock, CheckCircle, ArrowRight, Mail,
  Sparkles, Camera, Quote,
  MessageCircle, X, Send, ChevronDown, Menu, ChevronRight,
  Minus, Plus, Facebook, Instagram
} from 'lucide-react'
import type { TemplateProps } from '../config/template-types'
import { brandGradientStyle, brandAccent } from '../shared/colorUtils'
import DisclaimerBanner from '../shared/DisclaimerBanner'
import ScrollReveal from '../shared/ScrollReveal'
import usePageRouter from '../shared/usePageRouter'
import type { PageName } from '../shared/usePageRouter'
import PageShell from '../shared/PageShell'
import PageHeader from '../shared/PageHeader'

function GoogleIcon({ size = 15, className = '' }: { size?: number; className?: string }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>)
}

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

function ChatbotWidget({ companyName, accentColor = '#8b5cf6' }: { companyName: string; accentColor?: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<{from: string; text: string}[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => {
    if (isOpen && messages.length === 0) { setIsTyping(true); const t = setTimeout(() => { setMessages([{ from: 'bot', text: `Hi! 👋 Welcome to ${companyName}. Looking for a quote or have a question? I'm here to help.` }]); setIsTyping(false) }, 800); return () => clearTimeout(t) }
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100)
  }, [isOpen, companyName])
  const quickReplies = ['Get a free quote', 'What services do you offer?', 'Hours & availability']
  const handleSend = (text?: string) => {
    const msg = text || input.trim(); if (!msg) return
    setMessages(p => [...p, { from: 'user', text: msg }]); setInput(''); setIsTyping(true)
    setTimeout(() => {
      let reply = "Thanks for reaching out! A team member will follow up shortly. Call us for the fastest response."
      if (msg.toLowerCase().includes('quote') || msg.toLowerCase().includes('estimate')) reply = "We'd love to get you a free quote! Describe your project or call us directly for a quick estimate."
      else if (msg.toLowerCase().includes('service')) reply = "We offer a full range of services — scroll down or tell me what you need!"
      else if (msg.toLowerCase().includes('hour')) reply = "We're available Monday through Saturday with same-day response. Call anytime!"
      setMessages(p => [...p, { from: 'bot', text: reply }]); setIsTyping(false)
    }, 1200)
  }
  return (
    <>
      <button onClick={() => setIsOpen(!isOpen)} className="fixed bottom-6 right-5 z-[100] group sm:bottom-6 bottom-20" aria-label="Chat">
        <div className="w-[58px] h-[58px] rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-105" style={{ background: `linear-gradient(135deg, ${accentColor}, #a855f7)` }}>
          {isOpen ? <X size={22} className="text-white" /> : <MessageCircle size={22} className="text-white" />}
        </div>
        {!isOpen && <span className="absolute inset-0 rounded-full animate-ping opacity-15" style={{ background: accentColor }} />}
        {!isOpen && (<div className="absolute bottom-full right-0 mb-3 whitespace-nowrap bg-white text-gray-700 text-sm font-semibold px-4 py-2 rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">Chat with us<div className="absolute top-full right-6 w-2 h-2 bg-white transform rotate-45 -translate-y-1" /></div>)}
      </button>
      {isOpen && (
        <div className="fixed sm:bottom-24 bottom-28 right-5 z-[100] w-[370px] max-w-[calc(100vw-2.5rem)] bg-white rounded-2xl shadow-2xl border border-violet-100 overflow-hidden">
          <div className="px-5 py-4 text-white" style={{ background: `linear-gradient(135deg, ${accentColor}, #a855f7)` }}>
            <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"><MessageCircle size={18} className="text-white" /></div><div><p className="font-bold text-sm">{companyName}</p><div className="flex items-center gap-1.5"><span className="w-2 h-2 bg-green-300 rounded-full animate-pulse" /><span className="text-xs text-white/80">Online now</span></div></div></div>
            <p className="text-[10px] text-white/40 mt-2.5 tracking-wide uppercase">AI Assistant by Bright Automations · Included with your website</p>
          </div>
          <div className="h-[280px] overflow-y-auto px-4 py-4 space-y-3 bg-violet-50/20">
            {messages.map((msg, i) => (<div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[80%] px-4 py-2.5 text-sm leading-relaxed ${msg.from === 'user' ? 'text-white rounded-2xl rounded-br-sm' : 'bg-white text-gray-700 rounded-2xl rounded-bl-sm shadow-sm border border-violet-50'}`} style={msg.from === 'user' ? { background: accentColor } : undefined}>{msg.text}</div></div>))}
            {isTyping && (<div className="flex justify-start"><div className="bg-white px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm border border-violet-50"><div className="flex gap-1"><span className="w-2 h-2 bg-violet-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} /><span className="w-2 h-2 bg-violet-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} /><span className="w-2 h-2 bg-violet-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} /></div></div></div>)}
            <div ref={endRef} />
          </div>
          {messages.length <= 1 && (<div className="px-4 pb-2 flex gap-2 flex-wrap bg-violet-50/20">{quickReplies.map((qr, i) => (<button key={i} onClick={() => handleSend(qr)} className="text-xs px-3 py-1.5 rounded-full border border-violet-200 text-violet-600 hover:bg-violet-50 transition-all">{qr}</button>))}</div>)}
          <div className="px-4 py-3 border-t border-violet-50 bg-white"><div className="flex gap-2"><input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Type a message..." className="flex-1 text-sm px-4 py-2.5 rounded-full bg-violet-50/50 border border-violet-100 text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-400/30 placeholder:text-gray-400" /><button onClick={() => handleSend()} disabled={!input.trim()} className="w-10 h-10 rounded-full flex items-center justify-center text-white transition-all disabled:opacity-30" style={{ background: accentColor }}><Send size={15} /></button></div></div>
        </div>
      )}
    </>
  )
}

function MobileNav({ isOpen, onClose, companyName, sections, phone, onCallClick, onCTAClick, onNavigate, config }: { isOpen: boolean; onClose: () => void; companyName: string; sections: { page: PageName; label: string }[]; phone?: string; onCallClick: () => void; onCTAClick: () => void; onNavigate: (page: PageName) => void; config?: import('../config/template-types').IndustryConfig }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-[90] lg:hidden">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-[300px] bg-white shadow-2xl">
        <div className="p-6 h-full flex flex-col">
          <div className="flex justify-between items-center mb-10"><span className="text-lg font-bold text-gray-900">{companyName}</span><button onClick={onClose} className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500"><X size={18} /></button></div>
          <nav className="space-y-1 flex-1">{sections.map((s) => (<button key={s.page} data-nav-page={s.page} onClick={() => { onNavigate(s.page); onClose() }} className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-gray-700 hover:bg-violet-50 transition-all text-[15px] font-medium">{s.label}<ChevronRight size={16} className="text-gray-300" /></button>))}</nav>
          <div className="flex gap-3 mb-5">
            <a href="#" className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:text-violet-600 transition-colors"><Facebook size={16} /></a>
            <a href="#" className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:text-violet-600 transition-colors"><Instagram size={16} /></a>
            <a href="#" className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:text-violet-600 transition-colors"><GoogleIcon size={16} /></a>
          </div>
          <div className="space-y-3">
            {phone && (<a href={`tel:${phone}`} onClick={() => { onCallClick(); onClose() }} className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-gray-100 text-gray-800 font-bold text-sm border border-gray-200"><Phone size={16} />Call {formatNavPhone(phone)}</a>)}
            <button onClick={() => { onCTAClick(); onNavigate('contact'); onClose() }} className={`flex items-center justify-center gap-2 w-full py-3.5 rounded-xl ${config?.primaryHex ? '' : 'bg-gradient-to-r from-violet-500 to-purple-600'} text-white font-bold text-sm`} style={config ? brandGradientStyle(config, 'to right') : undefined}>Get Free Quote</button>
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
        <span className="text-[15px] font-medium text-gray-800 group-hover:text-violet-600 transition-colors pr-6">{question}</span>
        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-50 group-hover:bg-violet-100 flex items-center justify-center transition-all">
          {isOpen ? <Minus size={14} className="text-violet-600" /> : <Plus size={14} className="text-violet-300" />}
        </span>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[200px] opacity-100 pb-5' : 'max-h-0 opacity-0'}`}><p className="text-sm text-gray-500 leading-relaxed pr-14">{answer}</p></div>
    </div>
  )
}

/* ═══════ CTA BAND (reused on multiple pages) ═══════ */
function CTABand({ closingHeadline, onCTAClick, onNavigateContact, config }: { closingHeadline?: string; onCTAClick: () => Promise<void>; onNavigateContact: () => void; config?: import('../config/template-types').IndustryConfig }) {
  return (
    <section className={`relative py-16 sm:py-20 md:py-24 overflow-hidden ${config?.primaryHex ? '' : 'bg-gradient-to-r from-violet-600 via-purple-600 to-violet-600'}`} style={config ? brandGradientStyle(config, 'to right') : undefined}>
      <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
      <ScrollReveal animation="fade-in">
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 md:px-8 text-center">
        <Quote size={36} className="text-white/15 mx-auto mb-5" />
        <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-snug mb-8">{closingHeadline || "Quality work. Honest pricing. Guaranteed."}</p>
        <button onClick={() => { onCTAClick(); onNavigateContact() }} className="inline-flex items-center gap-2.5 bg-white text-violet-700 px-8 py-4 rounded-full font-semibold text-lg hover:bg-violet-50 transition-all shadow-lg group">
          Get Started <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
      </ScrollReveal>
    </section>
  )
}

// ═══════ MAIN TEMPLATE ═══════
export default function ModernBTemplate({ lead, config, onCTAClick, onCallClick, websiteCopy }: TemplateProps) {
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
    { page: 'about', label: 'About' }, { page: 'portfolio', label: 'Work' },
    { page: 'contact', label: 'Contact' },
  ]
  const faqs = [
    { q: 'How do I get a free quote?', a: 'Call us or use the form below — we respond same-day.' },
    { q: 'What areas do you serve?', a: `We serve ${location || 'the local area'} and surrounding communities.` },
    { q: 'Are you licensed and insured?', a: 'Yes — fully licensed, bonded, and insured on every project.' },
    { q: 'How quickly can you start?', a: 'Most projects start within 1-2 weeks.' },
    { q: 'Is your work guaranteed?', a: "Every job is backed by our satisfaction guarantee." },
  ]

  const testimonials = wc?.testimonialQuote
    ? [{ quote: wc.testimonialQuote, name: wc.testimonialAuthor || 'Verified Customer', loc: lead.city || 'Local' }]
    : [
        { quote: `Called on a Monday, had a crew here by Wednesday. They finished ahead of schedule and left the place spotless. Already told three neighbors about ${lead.companyName}.`, name: 'Sarah M.', loc: lead.city || 'Local' },
        { quote: `We've used other companies before — no comparison. ${lead.companyName} showed up on time, communicated every step, and the final result was exactly what we pictured.`, name: 'David R.', loc: lead.city || 'Local' },
      ]

  return (
    <div className="preview-template min-h-screen bg-white antialiased">
      <DisclaimerBanner variant="modern" companyName={lead.companyName} />

      {/* ═══════ NAV ═══════ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex items-center justify-between h-[68px]">
            <button onClick={() => navigateTo('home')} className="flex items-center gap-3 cursor-pointer">
              {lead.logo && <img src={lead.logo} alt="" className="h-8 w-8 rounded-xl object-cover ring-2 ring-violet-100" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />}
              <span className="text-lg font-bold text-gray-900 tracking-tight">{lead.companyName}</span>
            </button>
            <div className="hidden lg:flex items-center gap-1.5">{navSections.map((s) => (
              <button key={s.page} data-nav-page={s.page} onClick={() => navigateTo(s.page)} className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${currentPage === s.page ? 'text-violet-600 bg-violet-50' : 'text-gray-500 hover:text-violet-600 hover:bg-violet-50'}`}>{s.label}</button>
            ))}</div>
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-0.5 text-gray-400">
                <a href="#" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-violet-50 hover:text-violet-500 transition-all"><Facebook size={14} /></a>
                <a href="#" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-violet-50 hover:text-violet-500 transition-all"><Instagram size={14} /></a>
                <a href="#" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-violet-50 hover:text-violet-500 transition-all"><GoogleIcon size={13} /></a>
              </div>
              <div className="hidden md:block w-px h-5 bg-gray-200" />
              {lead.phone && (<a href={`tel:${lead.phone}`} onClick={onCallClick} className="hidden lg:flex items-center gap-2 text-sm text-gray-500 hover:text-violet-600 font-medium"><Phone size={14} />{formatNavPhone(lead.phone)}</a>)}
              <button onClick={() => { onCTAClick(); navigateTo('contact') }} className={`hidden sm:flex ${config.primaryHex ? '' : 'bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700'} text-white px-5 py-2.5 rounded-full text-sm font-semibold transition-all shadow-md`} style={brandGradientStyle(config, 'to right')}>Free Quote</button>
              <button onClick={() => setMobileNavOpen(true)} className="lg:hidden w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600"><Menu size={20} /></button>
            </div>
          </div>
        </div>
      </nav>

      <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} companyName={lead.companyName} sections={navSections} phone={lead.phone} onCallClick={onCallClick} onCTAClick={onCTAClick} onNavigate={navigateTo} config={config} />

      {/* ═══════════════════════════════════════════
          PAGE: HOME
       ═══════════════════════════════════════════ */}
      <PageShell page="home" currentPage={currentPage}>
        {/* HERO — Split */}
        <section className="relative pt-32 pb-16 sm:pb-20 md:pb-24 px-4 sm:px-6 md:px-8 overflow-hidden">
          <div className="absolute top-[-5%] left-[-10%] w-[500px] h-[500px] bg-gradient-to-br from-violet-100/50 to-purple-50/20 rounded-full blur-3xl" />
          <div className="absolute bottom-[-10%] right-[-8%] w-[400px] h-[400px] bg-gradient-to-tl from-fuchsia-50/30 to-violet-50/10 rounded-full blur-3xl" />
          <div className="relative max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-violet-50 border border-violet-100 text-violet-600 rounded-full px-4 py-2 text-sm font-semibold mb-6">
                  <Sparkles size={14} />
                  {hasRating ? `${lead.enrichedRating}-Star Rated` : 'Top Rated'}{location ? ` · ${location}` : ''}
                </div>
                <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-8 tracking-tight leading-[1.08]">{wc?.heroHeadline || lead.companyName}</h1>
                {wc?.heroSubheadline && (
                  <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mb-8 leading-relaxed">{wc.heroSubheadline}</p>
                )}
                <div className="flex flex-col sm:flex-row gap-4">
                  {lead.phone && (<a href={`tel:${lead.phone}`} onClick={onCallClick} className={`inline-flex items-center justify-center gap-2.5 ${config.primaryHex ? '' : 'bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700'} text-white px-9 py-4 rounded-full font-semibold text-base transition-all shadow-lg hover:-translate-y-0.5`} style={brandGradientStyle(config, 'to right')}><Phone size={18} />Call Now</a>)}
                  <button onClick={onCTAClick} className="inline-flex items-center justify-center gap-2.5 bg-white border-2 border-gray-200 text-gray-700 px-9 py-4 rounded-full font-semibold text-base hover:border-violet-300 hover:text-violet-600 transition-all group">{config.ctaText}<ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></button>
                </div>
              </div>
              {/* Right — Stats + Quick CTA */}
              <div className="flex justify-center lg:justify-end">
                <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-8 w-full max-w-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-violet-50 to-transparent rounded-bl-full" />
                  <div className="relative">
                    {hasRating && (<div className="flex items-center gap-2 mb-6"><div className="flex gap-0.5">{Array.from({ length: 5 }, (_, i) => <Star key={i} size={18} className={i < Math.floor(lead.enrichedRating || 0) ? 'text-amber-400 fill-current' : 'text-gray-200'} />)}</div><span className="font-bold text-gray-900 text-lg">{lead.enrichedRating}</span>{lead.enrichedReviews && <span className="text-sm text-gray-400">({lead.enrichedReviews} reviews)</span>}</div>)}
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Get Your Free Quote</h3>
                    <p className="text-gray-400 text-sm mb-6">Same-day response</p>
                    <button onClick={onCTAClick} className={`w-full ${config.primaryHex ? '' : 'bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700'} text-white py-3.5 rounded-xl font-bold text-base transition-all shadow-md mb-3`} style={brandGradientStyle(config, 'to right')}>Request a Quote</button>
                    {lead.phone && (<a href={`tel:${lead.phone}`} onClick={onCallClick} className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-600 py-3 rounded-xl font-medium text-sm hover:border-violet-300 hover:text-violet-600 transition-all"><Phone size={15} />Or call {lead.phone}</a>)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PROOF STRIP */}
        <section className="py-4 px-4 sm:px-6 md:px-8 border-y border-gray-100 bg-gray-50/50">
          <ScrollReveal animation="fade-in">
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

        {/* HOMEPAGE: SERVICES PREVIEW */}
        {services.length > 0 && (
          <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 bg-white">
            <div className="max-w-6xl mx-auto">
              <ScrollReveal animation="fade-up">
              <div className="flex items-end justify-between mb-12 sm:mb-14">
                <div>
                  <div className="inline-flex items-center gap-2 bg-violet-50 text-violet-600 rounded-full px-4 py-1.5 text-xs font-semibold mb-4 border border-violet-100">Services</div>
                  <h2 className="font-display text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">What we do.</h2>
                </div>
                <button onClick={() => navigateTo('services')} className="hidden sm:inline-flex items-center gap-2 text-sm font-semibold text-violet-600 hover:text-violet-500 transition-colors group">
                  View All Services <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
              </ScrollReveal>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {services.slice(0, 6).map((service, i) => (
                  <ScrollReveal key={i} animation="fade-up" delay={i * 80}>
                  <button onClick={() => navigateTo('services')} className="group bg-white border border-gray-100 rounded-2xl p-6 text-left hover:border-violet-200 hover:shadow-md transition-all duration-300 w-full">
                    <div className="flex items-start gap-4">
                      <span className="text-xs text-violet-300 font-mono tabular-nums font-bold mt-1">{String(i + 1).padStart(2, '0')}</span>
                      <div>
                        <h3 className="text-base font-semibold text-gray-800 group-hover:text-violet-600 transition-colors mb-1">{service}</h3>
                        {wc?.serviceDescriptions?.[service] && (
                          <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">{wc.serviceDescriptions[service]}</p>
                        )}
                      </div>
                    </div>
                  </button>
                  </ScrollReveal>
                ))}
              </div>
              <button onClick={() => navigateTo('services')} className="sm:hidden mt-8 inline-flex items-center gap-2 text-sm font-semibold text-violet-600 hover:text-violet-500 transition-colors group">
                View All Services <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </section>
        )}

        {/* HOMEPAGE: ABOUT PREVIEW */}
        <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 bg-gray-50/50">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <ScrollReveal animation="fade-left">
              <div>
                <div className="inline-flex items-center gap-2 bg-violet-50 text-violet-600 rounded-full px-4 py-1.5 text-xs font-semibold mb-4 border border-violet-100">About {lead.companyName}</div>
                <h2 className="font-display text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-6">Your trusted {industryLabel} professionals.</h2>
                <p className="text-gray-500 text-base leading-relaxed mb-6">
                  {wc?.aboutParagraph1 || `${lead.companyName} delivers expert ${industryLabel}${location ? ` in ${location}` : ''}. Licensed, insured, and dedicated to getting it right.`}
                </p>
                <div className="flex flex-wrap gap-8 mb-8">
                  <div><p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-purple-600">{hasRating ? `${lead.enrichedRating}` : '5.0'}</p><p className="text-xs text-gray-500 mt-1">Rating</p></div>
                  {lead.enrichedReviews && (<div><p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-purple-600">{lead.enrichedReviews}+</p><p className="text-xs text-gray-500 mt-1">Reviews</p></div>)}
                  <div><p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-purple-600">100%</p><p className="text-xs text-gray-500 mt-1">Satisfaction</p></div>
                </div>
                <button onClick={() => navigateTo('about')} className="inline-flex items-center gap-2 text-sm font-semibold text-violet-600 hover:text-violet-500 transition-colors group">
                  Learn More About Us <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
              </ScrollReveal>
              <ScrollReveal animation="fade-right" delay={200}>
              <div className="bg-violet-50/40 border border-violet-100 rounded-2xl p-7">
                <div className="flex gap-0.5 mb-4">{Array.from({ length: 5 }, (_, i) => <Star key={i} size={14} className="text-amber-400 fill-current" />)}</div>
                <p className="text-gray-700 text-base italic leading-relaxed mb-4">"{wc?.testimonialQuote || `They handled everything from start to finish — on time, on budget, and the results were exactly what we wanted.`}"</p>
                <div className="w-8 h-0.5 bg-violet-200 rounded-full mb-2" />
                <span className="text-gray-400 text-xs font-medium">{wc?.testimonialAuthor || 'Local Homeowner'}{location ? ` · ${location}` : ''}</span>
              </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* HOMEPAGE: PORTFOLIO PREVIEW */}
        {photos.length > 0 && (
          <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 bg-white">
            <div className="max-w-6xl mx-auto">
              <ScrollReveal animation="fade-up">
              <div className="flex items-end justify-between mb-10 sm:mb-14">
                <div>
                  <div className="inline-flex items-center gap-2 bg-violet-50 text-violet-600 rounded-full px-4 py-1.5 text-xs font-semibold mb-4 border border-violet-100"><Camera size={12} />Portfolio</div>
                  <h2 className="font-display text-3xl sm:text-4xl font-bold text-gray-900">Our recent work.</h2>
                </div>
                <button onClick={() => navigateTo('portfolio')} className="hidden sm:inline-flex items-center gap-2 text-sm font-semibold text-violet-600 hover:text-violet-500 transition-colors group">
                  View Our Work <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
              </ScrollReveal>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                {photos.slice(0, 3).map((photo, i) => (
                  <ScrollReveal key={i} animation="zoom-in" delay={i * 100}>
                  <button onClick={() => navigateTo('portfolio')} className="relative overflow-hidden rounded-2xl group border border-gray-100 hover:border-violet-200 transition-all w-full">
                    <img src={photo} alt={`Project ${i + 1}`} className="w-full aspect-[4/3] object-cover transition-transform duration-700 group-hover:scale-105" {...(i > 0 ? { loading: 'lazy' as const } : {})} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                  </ScrollReveal>
                ))}
              </div>
              <button onClick={() => navigateTo('portfolio')} className="sm:hidden mt-8 inline-flex items-center gap-2 text-sm font-semibold text-violet-600 hover:text-violet-500 transition-colors group">
                View Our Work <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </section>
        )}

        {/* HOMEPAGE: TESTIMONIAL HIGHLIGHT */}
        <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 bg-gray-50/50">
          <div className="max-w-3xl mx-auto text-center">
            <ScrollReveal animation="fade-up">
              <div className="inline-flex items-center gap-2 bg-violet-50 text-violet-600 rounded-full px-4 py-1.5 text-xs font-semibold mb-4 border border-violet-100">Reviews</div>
              <div className="flex justify-center gap-0.5 mb-6">{Array.from({ length: 5 }, (_, j) => <Star key={j} size={18} className="text-amber-400 fill-current" />)}</div>
              <p className="text-xl sm:text-2xl text-gray-700 leading-relaxed italic mb-6">"{testimonials[0].quote}"</p>
              <div className="flex items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center"><span className="text-violet-600 font-bold text-sm">{testimonials[0].name[0]}</span></div>
                <div className="text-left"><span className="font-semibold text-gray-800 text-sm">{testimonials[0].name}</span><span className="text-gray-400 text-sm"> — {testimonials[0].loc}</span></div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* HOMEPAGE: CTA BAND */}
        <CTABand closingHeadline={wc?.closingHeadline} onCTAClick={onCTAClick} onNavigateContact={() => navigateTo('contact')} config={config} />
      </PageShell>

      {/* ═══════════════════════════════════════════
          PAGE: SERVICES
       ═══════════════════════════════════════════ */}
      <PageShell page="services" currentPage={currentPage}>
        <PageHeader
          title="Our Services"
          subtitle={`Expert ${industryLabel}${location ? ` serving ${location}` : ''} and surrounding areas.`}
          bgClass={config.primaryHex ? '' : 'bg-gradient-to-r from-violet-600 via-purple-600 to-violet-600'}
          bgStyle={brandGradientStyle(config, 'to right')}
          subtitleClass="text-violet-200/60"
          accentClass="text-violet-300"
          onBackClick={() => navigateTo('home')}
        />

        {services.length > 0 && (
          <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 bg-white">
            <div className="max-w-5xl mx-auto">
              <div className="divide-y divide-gray-100">
                {services.slice(0, 8).map((service, i) => (
                  <ScrollReveal key={i} animation="fade-up" delay={i * 80}>
                  <div className="group flex items-center justify-between py-5 cursor-pointer hover:pl-2 transition-all duration-300" onClick={onCTAClick}>
                    <div className="flex items-start gap-5">
                      <span className="text-xs text-violet-300 font-mono tabular-nums w-6 font-bold">{String(i + 1).padStart(2, '0')}</span>
                      <div className="flex flex-col min-w-0">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-800 group-hover:text-violet-600 transition-colors">{service}</h3>
                        {wc?.serviceDescriptions?.[service] && (
                          <p className="text-sm text-gray-500 mt-1 leading-relaxed">{wc.serviceDescriptions[service]}</p>
                        )}
                      </div>
                    </div>
                    <ArrowRight size={16} className="text-gray-300 group-hover:text-violet-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
                  </div>
                  </ScrollReveal>
                ))}
              </div>
              <ScrollReveal animation="fade-up" delay={100}>
              <div className="mt-12 flex justify-center">
                <button onClick={onCTAClick} className={`flex items-center gap-2 ${config.primaryHex ? '' : 'bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700'} text-white px-7 py-3.5 rounded-full font-semibold text-sm transition-all shadow-md`} style={brandGradientStyle(config, 'to right')}>Get a Free Quote<ArrowRight size={16} /></button>
              </div>
              </ScrollReveal>
            </div>
          </section>
        )}

        {/* Service area info */}
        {(wc?.serviceAreaText || location) && (
          <section className="py-12 px-4 sm:px-6 md:px-8 bg-gray-50/50 border-t border-gray-100">
            <div className="max-w-3xl mx-auto text-center">
              <ScrollReveal animation="fade-up">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <MapPin size={16} className="text-violet-600" />
                  <h3 className="text-lg font-bold text-gray-800">Service Area</h3>
                </div>
                <p className="text-gray-500 text-sm leading-relaxed">{wc?.serviceAreaText || `Proudly serving ${location} and all surrounding communities. Contact us to confirm availability in your area.`}</p>
              </ScrollReveal>
            </div>
          </section>
        )}

        <CTABand closingHeadline={wc?.closingHeadline} onCTAClick={onCTAClick} onNavigateContact={() => navigateTo('contact')} config={config} />
      </PageShell>

      {/* ═══════════════════════════════════════════
          PAGE: ABOUT
       ═══════════════════════════════════════════ */}
      <PageShell page="about" currentPage={currentPage}>
        <PageHeader
          title="About Us"
          subtitle={`Get to know ${lead.companyName} — your trusted ${industryLabel} professionals.`}
          bgClass={config.primaryHex ? '' : 'bg-gradient-to-r from-violet-600 via-purple-600 to-violet-600'}
          bgStyle={brandGradientStyle(config, 'to right')}
          subtitleClass="text-violet-200/60"
          accentClass="text-violet-300"
          onBackClick={() => navigateTo('home')}
        />

        {/* Full About section */}
        <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16 items-start">
              <ScrollReveal animation="fade-left" className="lg:col-span-3">
              <div>
                <div className="inline-flex items-center gap-2 bg-violet-50 text-violet-600 rounded-full px-4 py-1.5 text-xs font-semibold mb-4 border border-violet-100">About {lead.companyName}</div>
                <h2 className="font-display text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-6">Your trusted {industryLabel} professionals.</h2>
                <div className="space-y-4 text-gray-500 text-base leading-relaxed">
                  <p>{wc?.aboutParagraph1 || `${lead.companyName} delivers expert ${industryLabel}${location ? ` in ${location}` : ''}. Licensed, insured, and dedicated to getting it right.`}</p>
                  {wc?.aboutParagraph2 && <p>{wc.aboutParagraph2}</p>}
                  {wc?.closingBody && <p>{wc.closingBody}</p>}
                </div>
                <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { val: hasRating ? `${lead.enrichedRating}` : '5.0', label: 'Rating' },
                    { val: lead.enrichedReviews ? `${lead.enrichedReviews}+` : '100+', label: 'Reviews' },
                    { val: '100%', label: 'Satisfaction' },
                    { val: '24hr', label: 'Response' },
                  ].map((s, i) => (<div key={i} className="p-4 rounded-xl bg-violet-50/50 border border-violet-100 text-center"><p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-purple-600">{s.val}</p><p className="text-xs text-gray-500 mt-1">{s.label}</p></div>))}
                </div>
              </div>
              </ScrollReveal>
              <ScrollReveal animation="fade-right" delay={100} className="lg:col-span-2">
              <div className="flex flex-col gap-5">
                <div className="bg-violet-50/40 border border-violet-100 rounded-2xl p-7">
                  <div className="flex gap-0.5 mb-4">{Array.from({ length: 5 }, (_, i) => <Star key={i} size={14} className="text-amber-400 fill-current" />)}</div>
                  <p className="text-gray-700 text-base italic leading-relaxed mb-4">"{wc?.testimonialQuote || `They handled everything from start to finish — on time, on budget, and the results were exactly what we wanted.`}"</p>
                  <div className="w-8 h-0.5 bg-violet-200 rounded-full mb-2" />
                  <span className="text-gray-400 text-xs font-medium">{wc?.testimonialAuthor || 'Local Homeowner'}{location ? ` · ${location}` : ''}</span>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-7">
                  <h3 className="font-bold text-gray-800 text-base mb-1">Ready to get started?</h3>
                  <p className="text-gray-400 text-xs mb-5">Free quote · Same-day response</p>
                  <div className="space-y-3.5">
                    {lead.phone && (<a href={`tel:${lead.phone}`} onClick={onCallClick} className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0"><Phone size={14} className="text-white" /></div><div><p className="text-[11px] text-gray-400 uppercase tracking-wider font-bold">Phone</p><p className="text-sm font-bold text-gray-800">{lead.phone}</p></div></a>)}
                    {lead.email && (<a href={`mailto:${lead.email}`} className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0"><Mail size={14} className="text-white" /></div><div><p className="text-[11px] text-gray-400 uppercase tracking-wider font-bold">Email</p><p className="text-sm font-bold text-gray-800">{lead.email}</p></div></a>)}
                    {lead.enrichedAddress && (<div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0"><MapPin size={14} className="text-white" /></div><div><p className="text-[11px] text-gray-400 uppercase tracking-wider font-bold">Location</p><p className="text-sm font-bold text-gray-800">{lead.enrichedAddress}</p></div></div>)}
                  </div>
                </div>
              </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* Full Testimonials */}
        <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 bg-gray-50/50">
          <div className="max-w-6xl mx-auto">
            <ScrollReveal animation="fade-up">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-violet-50 text-violet-600 rounded-full px-4 py-1.5 text-xs font-semibold mb-4 border border-violet-100">Reviews</div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-gray-900">What clients say.</h2>
            </div>
            </ScrollReveal>
            <div className={testimonials.length === 1 ? 'max-w-2xl mx-auto' : 'grid grid-cols-1 md:grid-cols-2 gap-6'}>
              {testimonials.map((r, i) => (
              <ScrollReveal key={i} animation="fade-up" delay={i * 100}>
              <div className="bg-white border border-gray-100 rounded-2xl p-7 hover:border-violet-200 transition-all">
                <div className="flex gap-0.5 mb-4">{Array.from({ length: 5 }, (_, j) => <Star key={j} size={16} className="text-amber-400 fill-current" />)}</div>
                <p className="text-gray-600 text-base leading-relaxed mb-5 italic">"{r.quote}"</p>
                <div className="flex items-center gap-3 text-sm pt-3 border-t border-gray-100">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center"><span className="text-violet-600 font-bold text-xs">{r.name[0]}</span></div>
                  <div><span className="font-semibold text-gray-800">{r.name}</span><span className="text-gray-400"> — {r.loc}</span></div>
                </div>
              </div>
              </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        <CTABand closingHeadline={wc?.closingHeadline} onCTAClick={onCTAClick} onNavigateContact={() => navigateTo('contact')} config={config} />
      </PageShell>

      {/* ═══════════════════════════════════════════
          PAGE: PORTFOLIO
       ═══════════════════════════════════════════ */}
      <PageShell page="portfolio" currentPage={currentPage}>
        <PageHeader
          title="Our Work"
          subtitle="Browse our portfolio of completed projects."
          bgClass={config.primaryHex ? '' : 'bg-gradient-to-r from-violet-600 via-purple-600 to-violet-600'}
          bgStyle={brandGradientStyle(config, 'to right')}
          subtitleClass="text-violet-200/60"
          accentClass="text-violet-300"
          onBackClick={() => navigateTo('home')}
        />

        <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 bg-white">
          <div className="max-w-7xl mx-auto">
            {photos.length > 0 ? (
              <>
                {/* First photo hero-sized */}
                {photos[0] && (
                  <ScrollReveal animation="zoom-in" delay={100}>
                  <div className="relative overflow-hidden rounded-2xl group border border-gray-100 hover:border-violet-200 transition-all mb-3 sm:mb-4">
                    <img src={photos[0]} alt="Project 1" className="w-full object-cover aspect-[4/3] sm:aspect-[16/9] transition-transform duration-700 group-hover:scale-105" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  </ScrollReveal>
                )}
                {/* Remaining photos in grid */}
                {photos.length > 1 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                    {photos.slice(1, 7).map((photo, i) => (
                      <ScrollReveal key={i} animation="zoom-in" delay={i * 100}>
                      <div className="relative overflow-hidden rounded-2xl group border border-gray-100 hover:border-violet-200 transition-all">
                        <img src={photo} alt={`Project ${i + 2}`} className="w-full object-cover aspect-[4/3] transition-transform duration-700 group-hover:scale-105" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      </ScrollReveal>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-violet-50 flex items-center justify-center mx-auto mb-4 border border-violet-100">
                  <Camera size={24} className="text-violet-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">Portfolio Coming Soon</h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto">We&apos;re putting together our best project photos. Contact us to see examples of our work.</p>
                <button onClick={onCTAClick} className={`mt-6 inline-flex items-center gap-2 ${config.primaryHex ? '' : 'bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700'} text-white px-6 py-3 rounded-full font-semibold text-sm transition-all shadow-md`} style={brandGradientStyle(config, 'to right')}>
                  Request Examples <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>
        </section>

        <CTABand closingHeadline={wc?.closingHeadline} onCTAClick={onCTAClick} onNavigateContact={() => navigateTo('contact')} config={config} />
      </PageShell>

      {/* ═══════════════════════════════════════════
          PAGE: CONTACT
       ═══════════════════════════════════════════ */}
      <PageShell page="contact" currentPage={currentPage}>
        <PageHeader
          title="Get In Touch"
          subtitle="We'd love to hear from you. Reach out for a free quote."
          bgClass={config.primaryHex ? '' : 'bg-gradient-to-r from-violet-600 via-purple-600 to-violet-600'}
          bgStyle={brandGradientStyle(config, 'to right')}
          subtitleClass="text-violet-200/60"
          accentClass="text-violet-300"
          onBackClick={() => navigateTo('home')}
        />

        {/* Contact form + info */}
        <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
              <ScrollReveal animation="fade-left">
              <div>
                <h2 className="font-display text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-8">Get your free estimate.</h2>
                <div className="space-y-5">
                  {lead.phone && (<a href={`tel:${lead.phone}`} onClick={onCallClick} className="flex items-center gap-4"><div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-sm"><Phone size={20} className="text-white" /></div><div><p className="text-sm font-bold text-gray-800">{lead.phone}</p><p className="text-xs text-gray-400">Call or text anytime</p></div></a>)}
                  {lead.email && (<a href={`mailto:${lead.email}`} className="flex items-center gap-4"><div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-sm"><Mail size={20} className="text-white" /></div><div><p className="text-sm font-bold text-gray-800">{lead.email}</p><p className="text-xs text-gray-400">We reply fast</p></div></a>)}
                  {lead.enrichedAddress && (<div className="flex items-center gap-4"><div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-sm"><MapPin size={20} className="text-white" /></div><div><p className="text-sm font-bold text-gray-800">{lead.enrichedAddress}</p><p className="text-xs text-gray-400">{location}</p></div></div>)}
                </div>
                <div className="flex gap-3 mt-10">
                  <a href="#" className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 hover:text-violet-500 hover:border-violet-200 transition-all"><Facebook size={16} /></a>
                  <a href="#" className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 hover:text-violet-500 hover:border-violet-200 transition-all"><Instagram size={16} /></a>
                  <a href="#" className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 hover:text-violet-500 hover:border-violet-200 transition-all"><GoogleIcon size={16} /></a>
                </div>
              </div>
              </ScrollReveal>
              <ScrollReveal animation="fade-right" delay={100}>
              <div className="bg-gray-50 rounded-2xl border border-gray-100 p-7 sm:p-8">
                {formSubmitted ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle size={32} className="text-green-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Message Sent!</h3>
                    <p className="text-sm text-gray-500">We&apos;ll get back to you shortly.</p>
                  </div>
                ) : (
                <>
                <h3 className="text-lg font-bold text-gray-800 mb-1">Send us a message</h3>
                <p className="text-xs text-gray-400 mb-6">We respond same-day.</p>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Name</label><input type="text" placeholder="Your name" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-300 placeholder:text-gray-300 transition-all" /></div>
                    <div><label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Phone</label><input type="tel" placeholder="(555) 555-5555" value={formData.phone} onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))} className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-300 placeholder:text-gray-300 transition-all" /></div>
                  </div>
                  <div><label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Email</label><input type="email" placeholder="your@email.com" value={formData.email} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-300 placeholder:text-gray-300 transition-all" /></div>
                  <div><label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Project details</label><textarea rows={4} placeholder="Tell us about your project..." value={formData.message} onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))} className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-300 placeholder:text-gray-300 transition-all resize-none" /></div>
                  <button onClick={handleFormSubmit} disabled={formLoading} className={`w-full py-3.5 rounded-xl ${config.primaryHex ? '' : 'bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700'} text-white font-semibold text-sm transition-all shadow-md disabled:opacity-50`} style={brandGradientStyle(config, 'to right')}>{formLoading ? 'Sending...' : 'Send Message'}</button>
                </div>
                </>
                )}
              </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 bg-gray-50/50">
          <div className="max-w-3xl mx-auto">
            <ScrollReveal animation="fade-up">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-violet-50 text-violet-600 rounded-full px-4 py-1.5 text-xs font-semibold mb-4 border border-violet-100">FAQ</div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-gray-900">Common questions.</h2>
            </div>
            </ScrollReveal>
            <ScrollReveal animation="fade-up" delay={100}>
            <div className="bg-white rounded-2xl border border-gray-100 px-6 sm:px-8 shadow-sm">
              {faqs.map((f, i) => <FAQItem key={i} question={f.q} answer={f.a} isOpen={openFAQ === i} onToggle={() => setOpenFAQ(openFAQ === i ? null : i)} />)}
            </div>
            </ScrollReveal>
          </div>
        </section>
      </PageShell>

      {/* ═══════ FOOTER (always visible) ═══════ */}
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
            <div>
              <h4 className="text-white font-semibold mb-4 text-xs uppercase tracking-[0.15em]">Quick Links</h4>
              <ul className="space-y-2.5 text-sm text-gray-400">
                {navSections.map((s) => (
                  <li key={s.page}><button onClick={() => navigateTo(s.page)} data-nav-page={s.page} className="hover:text-white transition-colors">{s.label}</button></li>
                ))}
              </ul>
            </div>
            <div><h4 className="text-white font-semibold mb-4 text-xs uppercase tracking-[0.15em]">Contact</h4><div className="space-y-3 text-sm text-gray-400">{lead.phone && <a href={`tel:${lead.phone}`} onClick={onCallClick} className="flex items-center gap-2.5 hover:text-white transition-colors"><Phone size={13} className="text-violet-400" />{lead.phone}</a>}{lead.email && <a href={`mailto:${lead.email}`} className="flex items-center gap-2.5 hover:text-white transition-colors"><Mail size={13} className="text-violet-400" />{lead.email}</a>}{lead.enrichedAddress && <p className="flex items-center gap-2.5"><MapPin size={13} className="text-violet-400 flex-shrink-0" />{lead.enrichedAddress}</p>}</div></div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-xs">&copy; {new Date().getFullYear()} {lead.companyName}. All rights reserved.</p>
            {location && <p className="text-gray-600 text-xs">Professional {industryLabel} · {location}</p>}
          </div>
        </div>
      </footer>

      <ChatbotWidget companyName={lead.companyName} accentColor={brandAccent(config, '#8b5cf6')} />
      <div className="h-16 sm:h-0" />
    </div>
  )
}
