'use client'
/*
 * BOLD TEMPLATE — "Dark & Orange"
 * Design Direction: Dark, aggressive, high-contrast
 * Brand Voice: Bold & Direct
 * Multi-page with hash-based client-side routing
 */

import { useState, useEffect, useRef } from 'react'
import {
  Phone, MapPin, Star, Shield, Zap, CheckCircle, ArrowRight, Mail,
  Flame, Wrench, Clock, Camera,
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
import { brandGradientStyle, brandGradientClass, brandAccent } from '../shared/colorUtils'
import { distributePhotos } from '../shared/photoUtils'
import { ServiceHero, ServiceGrid, ProcessTimeline, WhyChooseUs } from '../shared/ServiceSections'
import TrustBadges from '../shared/TrustBadges'
import BrandsStrip from '../shared/BrandsStrip'
import ReviewsSection from '../shared/ReviewsSection'
import ContactFormEnhanced from '../shared/ContactFormEnhanced'
import PhotoLightbox from '../shared/PhotoLightbox'
import AnimatedCounter from '../shared/AnimatedCounter'
import VideoPlaceholder from '../shared/VideoPlaceholder'

// Google "G" icon
function GoogleIcon({ size = 15, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
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

// ─── CHATBOT ───
function ChatbotWidget({ companyName, accentColor = '#f97316' }: { companyName: string; accentColor?: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<{from: string; text: string}[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setIsTyping(true)
      const t = setTimeout(() => {
        setMessages([{ from: 'bot', text: `Hey! 👋 Welcome to ${companyName}. Need a quick quote or have a question? Fire away — I'm here to help.` }])
        setIsTyping(false)
      }, 800)
      return () => clearTimeout(t)
    }
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100)
  }, [isOpen, companyName])

  const quickReplies = ['Get a free quote', 'What services do you offer?', 'Hours & availability']

  const handleSend = (text?: string) => {
    const msg = text || input.trim()
    if (!msg) return
    setMessages(p => [...p, { from: 'user', text: msg }])
    setInput('')
    setIsTyping(true)
    setTimeout(() => {
      let reply = "Got it! A team member will reach out soon. Want faster service? Call us — we pick up."
      if (msg.toLowerCase().includes('quote')) reply = "Let's get you a free quote! What kind of work do you need done? Or call us directly for a quick estimate over the phone."
      else if (msg.toLowerCase().includes('service')) reply = "We cover everything from routine work to major projects. Check out the Services section below, or tell me what you need!"
      else if (msg.toLowerCase().includes('hour')) reply = "We're available Monday through Saturday, and we respond same-day. Call us anytime!"
      setMessages(p => [...p, { from: 'bot', text: reply }])
      setIsTyping(false)
    }, 1200)
  }

  return (
    <>
      <button onClick={() => setIsOpen(!isOpen)} className="fixed bottom-6 right-5 z-[100] group sm:bottom-6 bottom-[100px]" aria-label="Chat with us">
        <div className="w-[58px] h-[58px] rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-105" style={{ background: `linear-gradient(135deg, ${accentColor}, #ef4444)` }}>
          {isOpen ? <X size={22} className="text-white" /> : <MessageCircle size={22} className="text-white" />}
        </div>
        {!isOpen && <span className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ background: accentColor }} />}
        {!isOpen && (
          <div className="absolute bottom-full right-0 mb-3 whitespace-nowrap bg-white text-gray-800 text-sm font-semibold px-4 py-2 rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            Need help? Chat with us
            <div className="absolute top-full right-6 w-2 h-2 bg-white transform rotate-45 -translate-y-1" />
          </div>
        )}
      </button>

      {isOpen && (
        <div className="fixed sm:bottom-[104px] bottom-[168px] right-5 z-[100] w-[370px] max-w-[calc(100vw-2.5rem)] bg-gray-950 rounded-2xl shadow-2xl border border-gray-800 overflow-hidden">
          <div className="px-5 py-4" style={{ background: `linear-gradient(135deg, ${accentColor}, #ef4444)` }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"><MessageCircle size={18} className="text-white" /></div>
              <div>
                <p className="font-bold text-sm text-white">{companyName}</p>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 bg-green-300 rounded-full animate-pulse" /><span className="text-xs text-white/80">Online now</span></div>
              </div>
            </div>
            <p className="text-[10px] text-white/40 mt-2.5 tracking-wide uppercase">AI Assistant by Bright Automations · Included with your website</p>
          </div>
          <div className="h-[280px] overflow-y-auto px-4 py-4 space-y-3 bg-gray-900/50">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-4 py-2.5 text-sm leading-relaxed ${
                  msg.from === 'user' ? 'text-white rounded-2xl rounded-br-sm' : 'bg-gray-800 text-gray-200 rounded-2xl rounded-bl-sm border border-gray-700/50'
                }`} style={msg.from === 'user' ? { background: accentColor } : undefined}>{msg.text}</div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start"><div className="bg-gray-800 px-4 py-3 rounded-2xl rounded-bl-sm border border-gray-700/50"><div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div></div></div>
            )}
            <div ref={endRef} />
          </div>
          {messages.length <= 1 && (
            <div className="px-4 pb-2 flex gap-2 flex-wrap bg-gray-900/50">
              {quickReplies.map((qr, i) => (
                <button key={i} onClick={() => handleSend(qr)} className="text-xs px-3 py-1.5 rounded-full border border-gray-700 text-gray-400 hover:bg-gray-800 hover:border-gray-600 hover:text-gray-200 transition-all">{qr}</button>
              ))}
            </div>
          )}
          <div className="px-4 py-3 border-t border-gray-800 bg-gray-950">
            <div className="flex gap-2">
              <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Type a message..." className="flex-1 text-sm px-4 py-2.5 rounded-full bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 placeholder:text-gray-500" />
              <button onClick={() => handleSend()} disabled={!input.trim()} className="w-10 h-10 rounded-full flex items-center justify-center text-white transition-all disabled:opacity-30" style={{ background: accentColor }}><Send size={15} /></button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── MOBILE NAV ───
function MobileNav({ isOpen, onClose, companyName, sections, phone, onCallClick, onCTAClick, onNavigate, config }: { isOpen: boolean; onClose: () => void; companyName: string; sections: { page: PageName; label: string }[]; phone?: string; onCallClick: () => void; onCTAClick: () => void; onNavigate: (page: PageName) => void; config: TemplateProps['config'] }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-[90] lg:hidden">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-[300px] bg-gray-950 border-l border-gray-800 shadow-2xl">
        <div className="p-6 h-full flex flex-col">
          <div className="flex justify-between items-center mb-10">
            <span className="text-lg font-black text-white uppercase tracking-tight">{companyName}</span>
            <button onClick={onClose} className="w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white transition-colors"><X size={18} /></button>
          </div>
          <nav className="space-y-1 flex-1">
            {sections.map((s) => (
              <button key={s.page} data-nav-page={s.page} onClick={() => { onNavigate(s.page); onClose() }} className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-gray-300 hover:bg-gray-800/50 hover:text-white transition-all text-[15px] font-semibold">
                {s.label}<ChevronRight size={16} className="text-gray-600" />
              </button>
            ))}
          </nav>
          <div className="flex gap-3 mb-5">
            <a href="#" onClick={(e) => e.preventDefault()} className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center text-gray-500 hover:text-orange-400 transition-colors"><Facebook size={16} /></a>
            <a href="#" onClick={(e) => e.preventDefault()} className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center text-gray-500 hover:text-orange-400 transition-colors"><Instagram size={16} /></a>
            <a href="#" onClick={(e) => e.preventDefault()} className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center text-gray-500 hover:text-orange-400 transition-colors"><GoogleIcon size={16} /></a>
          </div>
          <div className="space-y-3">
            {phone && (
              <a href={`tel:${phone}`} onClick={() => { onCallClick(); onClose() }} className={`flex items-center justify-center gap-2 w-full py-3.5 rounded-xl ${config.primaryHex ? '' : 'bg-gradient-to-r from-orange-500 to-red-500'} text-white font-bold text-sm`} style={brandGradientStyle(config, 'to right')}><Phone size={16} />Call {formatNavPhone(phone)}</a>
            )}
            <button onClick={() => { onCTAClick(); onNavigate('contact'); onClose() }} className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-white/10 border border-white/15 text-white font-bold text-sm hover:bg-white hover:text-gray-900 transition-all">Get Free Quote</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── FAQ ITEM ───
function FAQItem({ question, answer, isOpen, onToggle }: { question: string; answer: string; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-gray-800/60 last:border-0">
      <button onClick={onToggle} className="w-full flex items-center justify-between py-6 text-left group">
        <span className="text-[15px] font-semibold text-gray-200 group-hover:text-white transition-colors pr-6">{question}</span>
        <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-800 group-hover:bg-gray-700 flex items-center justify-center transition-all">
          {isOpen ? <Minus size={14} className="text-orange-400" /> : <Plus size={14} className="text-gray-500" />}
        </span>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[200px] opacity-100 pb-6' : 'max-h-0 opacity-0'}`}>
        <p className="text-sm text-gray-500 leading-relaxed pr-14">{answer}</p>
      </div>
    </div>
  )
}

/* ═══════ CTA BAND (reused on multiple pages) ═══════ */
function CTABand({ phone, onCallClick, onCTAClick, onNavigateContact, config }: { phone?: string; onCallClick: () => void; onCTAClick: () => Promise<void>; onNavigateContact: () => void; config: TemplateProps['config'] }) {
  return (
    <section className={`relative py-10 px-4 sm:px-6 md:px-8 ${config.primaryHex ? '' : 'bg-gradient-to-r from-orange-500 via-red-500 to-orange-500'} overflow-hidden`} style={brandGradientStyle(config, 'to right')}>
      <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
      <ScrollReveal animation="fade-in">
      <div className="relative max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
            <Zap size={26} className="text-white" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-white">Need Help Fast?</p>
        </div>
        {phone ? (
          <a href={`tel:${phone}`} onClick={onCallClick} className="inline-flex items-center gap-2.5 bg-white text-gray-900 px-8 py-4 rounded-xl font-black text-base sm:text-lg hover:bg-gray-100 transition-all shadow-xl flex-shrink-0">
            <Phone size={20} />{phone}
          </a>
        ) : (
          <button onClick={() => { onCTAClick(); onNavigateContact() }} className="inline-flex items-center gap-2.5 bg-white text-gray-900 px-8 py-4 rounded-xl font-black text-base sm:text-lg hover:bg-gray-100 transition-all shadow-xl flex-shrink-0">
            Get Free Quote <ArrowRight size={18} />
          </button>
        )}
      </div>
      </ScrollReveal>
    </section>
  )
}

// ═══════════════════════════════════════════
// MAIN TEMPLATE
// ═══════════════════════════════════════════
export default function BoldTemplate({ lead, config, onCTAClick, onCallClick, websiteCopy }: TemplateProps) {
  const { currentPage, navigateTo } = usePageRouter()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [openFAQ, setOpenFAQ] = useState<number | null>(null)

  const services = lead.enrichedServices || []
  const photos = lead.enrichedPhotos || []
  const photosDist = distributePhotos(photos)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  /** Combined handler: track CTA click + navigate to contact */
  const ctaNavigate = () => { onCTAClick(); navigateTo('contact') }
  const industryLabel = lead.industry.toLowerCase().replace(/_/g, ' ')
  const location = [lead.city, lead.state].filter(Boolean).join(', ')
  const hasRating = lead.enrichedRating && lead.enrichedRating > 0
  const wc = websiteCopy

  const navSections: { page: PageName; label: string }[] = [
    { page: 'home', label: 'Home' },
    { page: 'services', label: 'Services' },
    { page: 'about', label: 'About' },
    { page: 'portfolio', label: 'Our Work' },
    { page: 'contact', label: 'Contact' },
  ]

  const faqs = [
    { q: 'How fast can you get here?', a: 'Same-day response for most requests — call us anytime.' },
    { q: 'Do you charge for estimates?', a: 'Never. Every estimate is free with zero pressure.' },
    { q: `Where does ${lead.companyName} work?`, a: `We serve ${location || 'the local area'} and surrounding communities.` },
    { q: 'Are you licensed and insured?', a: 'Fully licensed, bonded, and insured on every job.' },
    { q: 'What if something goes wrong?', a: "Every job is backed by our satisfaction guarantee." },
  ]

  const testimonials = wc?.testimonialQuote
    ? [{ quote: wc.testimonialQuote, name: wc.testimonialAuthor || 'Verified Customer', loc: lead.city || 'Local' }]
    : [
        { quote: `Called on a Monday, had a crew here by Wednesday. They finished ahead of schedule and left the place spotless. Already told three neighbors about ${lead.companyName}.`, name: 'Sarah M.', loc: lead.city || 'Local' },
        { quote: `We've used other companies before — no comparison. ${lead.companyName} showed up on time, communicated every step, and the final result was exactly what we pictured.`, name: 'David R.', loc: lead.city || 'Local' },
        { quote: `Honest quote, no pressure, and the work speaks for itself. Our ${industryLabel} project came out better than we expected.`, name: 'Jennifer K.', loc: lead.city || 'Local' },
      ]

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  return (
    <div className="preview-template min-h-screen bg-gray-950 antialiased">
      <DisclaimerBanner variant="bold" companyName={lead.companyName} />

      {/* ═══════ NAVIGATION ═══════ */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? 'bg-gray-950/95 backdrop-blur-xl border-b border-white/5 shadow-xl shadow-black/20' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex items-center justify-between h-[72px]">
            <button onClick={() => navigateTo('home')} className="flex items-center gap-3 cursor-pointer">
              {lead.logo && <img src={lead.logo} alt="" className="h-8 w-8 rounded-lg object-cover ring-2 ring-orange-500/20" />}
              <span className="font-display text-xl font-black text-white tracking-tight uppercase">{lead.companyName}</span>
            </button>

            <div className="hidden lg:flex items-center gap-1.5">
              {navSections.map((s) => (
                <button key={s.page} data-nav-page={s.page} onClick={() => navigateTo(s.page)} className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${currentPage === s.page ? 'text-orange-400 bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>{s.label}</button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-0.5 text-gray-500">
                <a href="#" onClick={(e) => e.preventDefault()} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 hover:text-orange-400 transition-all"><Facebook size={14} /></a>
                <a href="#" onClick={(e) => e.preventDefault()} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 hover:text-orange-400 transition-all"><Instagram size={14} /></a>
                <a href="#" onClick={(e) => e.preventDefault()} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 hover:text-orange-400 transition-all"><GoogleIcon size={13} /></a>
              </div>
              <div className="hidden md:block w-px h-5 bg-white/10" />
              {lead.phone && (
                <a href={`tel:${lead.phone}`} onClick={onCallClick} className="hidden lg:flex items-center gap-2 text-sm text-gray-400 hover:text-orange-400 transition-colors font-medium">
                  <Phone size={14} />{formatNavPhone(lead.phone)}
                </a>
              )}
              <button onClick={() => { onCTAClick(); navigateTo('contact') }} className={`hidden sm:flex items-center gap-2 ${config.primaryHex ? '' : 'bg-gradient-to-r from-orange-500 to-red-500'} text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:from-orange-600 hover:to-red-600 transition-all shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40`} style={brandGradientStyle(config, 'to right')}>Free Quote</button>
              <button onClick={() => setMobileNavOpen(true)} className="lg:hidden w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-300 hover:text-white transition-colors"><Menu size={20} /></button>
            </div>
          </div>
        </div>
      </nav>

      <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} companyName={lead.companyName} sections={navSections} phone={lead.phone} onCallClick={onCallClick} onCTAClick={onCTAClick} onNavigate={navigateTo} config={config} />

      {/* ═══════════════════════════════════════════
          PAGE: HOME
       ═══════════════════════════════════════════ */}
      <PageShell page="home" currentPage={currentPage}>
        {/* ═══════ HERO — Left-Aligned Dramatic ═══════ */}
        <section className="relative min-h-[100svh] flex items-center overflow-hidden">
          <div className={`absolute inset-0 ${brandGradientClass(config)}`} style={brandGradientStyle(config)} />
          <div className="absolute inset-0 bg-black/60" />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/20 to-transparent" />

          {/* Ambient glow */}
          <div className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-orange-500/10 rounded-full translate-x-1/3 blur-3xl" />
          <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-red-600/8 rounded-full translate-y-1/2 blur-3xl" />

          <div className="relative max-w-7xl mx-auto w-full px-4 sm:px-6 md:px-8 py-32">
            {hasRating && (
              <div className="inline-flex items-center gap-2.5 bg-white/8 backdrop-blur-md border border-white/10 rounded-full px-5 py-2.5 mb-8">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} size={14} className={i < Math.floor(lead.enrichedRating || 0) ? 'text-amber-400 fill-current' : 'text-white/20'} />
                  ))}
                </div>
                <span className="text-sm font-bold text-white">{lead.enrichedRating}-Star Rated</span>
                {lead.enrichedReviews && <span className="text-sm text-white/40">• {lead.enrichedReviews}+ reviews</span>}
              </div>
            )}

            <h1 className="font-display text-[2.75rem] sm:text-6xl md:text-7xl lg:text-[6.5rem] font-black text-white mb-6 tracking-tight leading-[0.95] max-w-4xl">
              {wc?.heroHeadline || lead.companyName}
            </h1>
            {wc?.heroSubheadline && (
              <p className="text-lg sm:text-xl text-gray-200 max-w-2xl mb-8 leading-relaxed">{wc.heroSubheadline}</p>
            )}

            {location && (
              <div className="inline-flex items-center gap-2 bg-white/8 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 mb-10">
                <MapPin size={14} className="text-orange-400" />
                <span className="text-sm text-white/60 font-medium">{location}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4">
              {lead.phone && (
                <a href={`tel:${lead.phone}`} onClick={onCallClick} className={`inline-flex items-center justify-center gap-2.5 ${config.primaryHex ? '' : 'bg-gradient-to-r from-orange-500 to-red-500'} text-white px-10 py-5 rounded-xl font-black text-lg hover:from-orange-600 hover:to-red-600 transition-all shadow-2xl shadow-orange-500/20`} style={brandGradientStyle(config, 'to right')}>
                  <Phone size={22} />Call Now
                </a>
              )}
              <button onClick={ctaNavigate} className="inline-flex items-center justify-center gap-2.5 bg-white/8 backdrop-blur-sm border border-white/15 text-white px-10 py-5 rounded-xl font-bold text-lg hover:bg-white hover:text-gray-900 transition-all duration-300 group">
                {config.ctaText}<ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/20">
            <span className="text-[10px] uppercase tracking-[0.25em] font-bold">Scroll</span>
            <ChevronDown size={18} className="animate-bounce" />
          </div>
        </section>

        {/* ═══════ OVERLAPPING STATS COUNTER ═══════ */}
        <section className="relative z-10 px-4 sm:px-6 md:px-8 -mt-16">
          <div className="max-w-5xl mx-auto">
            <ScrollReveal animation="fade-in">
            <div className="bg-gray-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 md:p-10 shadow-2xl shadow-black/40">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                {hasRating && (
                  <div>
                    <p className="font-display text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400 mb-1"><AnimatedCounter value={lead.enrichedRating || 0} /></p>
                    <div className="flex justify-center mb-2 gap-0.5">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star key={i} size={12} className={i < Math.floor(lead.enrichedRating || 0) ? 'text-orange-400 fill-current' : 'text-gray-700'} />
                      ))}
                    </div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-bold">Star Rating</p>
                  </div>
                )}
                {lead.enrichedReviews && (
                  <div>
                    <p className="font-display text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400 mb-1"><AnimatedCounter value={lead.enrichedReviews} suffix="+" /></p>
                    <div className="h-[12px] mb-2" />
                    <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-bold">Happy Customers</p>
                  </div>
                )}
                <div>
                  <p className="font-display text-4xl md:text-5xl font-black text-white mb-1"><AnimatedCounter value={100} suffix="%" /></p>
                  <div className="flex justify-center mb-2"><Shield size={12} className="text-orange-400" /></div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-bold">Licensed & Insured</p>
                </div>
                <div>
                  <p className="font-display text-4xl md:text-5xl font-black text-white mb-1"><AnimatedCounter value={24} suffix="hr" /></p>
                  <div className="flex justify-center mb-2"><Clock size={12} className="text-orange-400" /></div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-bold">Response Time</p>
                </div>
                {wc?.yearsBadge && (
                  <div>
                    <p className="font-display text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400 mb-1">{wc.yearsBadge}</p>
                    <div className="h-[12px] mb-2" />
                    <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-bold">Experience</p>
                  </div>
                )}
              </div>
            </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ═══════ HOMEPAGE: SERVICES PREVIEW (6 cards) ═══════ */}
        {services.length > 0 && (
          <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8">
            <div className="max-w-6xl mx-auto">
              <ScrollReveal animation="fade-up">
              <div className="flex items-end justify-between mb-14">
                <div>
                  <div className="inline-flex items-center gap-2 bg-orange-500/10 text-orange-400 rounded-full px-4 py-1.5 text-xs font-bold mb-5 border border-orange-500/15 uppercase tracking-wider">
                    <Wrench size={12} />Services
                  </div>
                  <h2 className="font-display text-4xl md:text-5xl font-black text-white">What We Do</h2>
                </div>
                <button onClick={() => navigateTo('services')} className="hidden sm:inline-flex items-center gap-2 text-sm font-bold text-orange-400 hover:text-orange-300 transition-colors group">
                  View All Services <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
              </ScrollReveal>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {services.slice(0, 6).map((service, i) => (
                  <ScrollReveal key={i} animation="fade-up" delay={i * 80}>
                  <button onClick={() => navigateTo('services')} className="group w-full bg-gray-900/50 border border-gray-800/40 rounded-2xl p-6 text-left hover:border-orange-500/30 hover:bg-gray-900/80 transition-all duration-300">
                    <div className="flex items-start gap-4">
                      <span className="text-xs text-gray-600 font-mono tabular-nums w-6 font-bold mt-1">{String(i + 1).padStart(2, '0')}</span>
                      <div>
                        <h3 className="text-base font-bold text-gray-200 group-hover:text-white transition-colors mb-1">{service}</h3>
                        {wc?.serviceDescriptions?.[service] && (
                          <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">{wc.serviceDescriptions[service]}</p>
                        )}
                      </div>
                    </div>
                  </button>
                  </ScrollReveal>
                ))}
              </div>
              <button onClick={() => navigateTo('services')} className="sm:hidden mt-8 inline-flex items-center gap-2 text-sm font-bold text-orange-400 hover:text-orange-300 transition-colors group">
                View All Services <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </section>
        )}

        {/* ═══════ HOMEPAGE: ABOUT PREVIEW ═══════ */}
        <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 bg-gray-900/30">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <ScrollReveal animation="fade-left">
              <div>
                <div className="inline-flex items-center gap-2 bg-orange-500/10 text-orange-400 rounded-full px-4 py-1.5 text-xs font-bold mb-5 border border-orange-500/15 uppercase tracking-wider">About Us</div>
                <h2 className="font-display text-4xl md:text-5xl font-black text-white mb-8 leading-[0.95]">
                  Built on Hard Work<br />& Results.
                </h2>
                <p className="text-gray-400 leading-relaxed text-base sm:text-lg">
                  {wc?.aboutParagraph1 || `${lead.companyName} — dedicated ${industryLabel} professionals${location ? ` in ${location}` : ''}. We show up on time and get the job done right.`}
                </p>
                <div className="flex flex-wrap gap-8 my-8">
                  <div><p className="font-display text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400"><AnimatedCounter value={hasRating ? (lead.enrichedRating || 5.0) : 5.0} /></p><p className="text-[11px] uppercase tracking-[0.2em] text-gray-500 mt-1">Star Rating</p></div>
                  {lead.enrichedReviews && (<div><p className="font-display text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400"><AnimatedCounter value={lead.enrichedReviews} suffix="+" /></p><p className="text-[11px] uppercase tracking-[0.2em] text-gray-500 mt-1">Reviews</p></div>)}
                  <div><p className="font-display text-3xl font-black text-white"><AnimatedCounter value={100} suffix="%" /></p><p className="text-[11px] uppercase tracking-[0.2em] text-gray-500 mt-1">Satisfaction</p></div>
                </div>
                <button onClick={() => navigateTo('about')} className="inline-flex items-center gap-2 text-sm font-bold text-orange-400 hover:text-orange-300 transition-colors group">
                  Learn More About Us <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
              </ScrollReveal>
              <ScrollReveal animation="fade-right" delay={200}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { icon: Flame, title: wc?.valueProps?.[0]?.title || 'Fast Response', desc: wc?.valueProps?.[0]?.description || 'Same-day response. We show up when we say we will.' },
                  { icon: Shield, title: wc?.valueProps?.[1]?.title || 'Quality Guaranteed', desc: wc?.valueProps?.[1]?.description || 'Premium materials. Expert work. Satisfaction guaranteed.' },
                  { icon: CheckCircle, title: wc?.valueProps?.[2]?.title || 'Fair & Transparent', desc: wc?.valueProps?.[2]?.description || 'Honest pricing upfront. No hidden fees. No surprises.' },
                ].map((item, i) => (
                  <div key={i} className="group bg-gray-900/50 border border-gray-800/40 rounded-2xl p-5">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/10 flex items-center justify-center mb-3 group-hover:from-orange-500/30 group-hover:to-red-500/20 transition-all">
                      <item.icon size={18} className="text-orange-400" />
                    </div>
                    <h4 className="text-sm font-bold text-white mb-1">{item.title}</h4>
                    <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* ═══════ HOMEPAGE: PORTFOLIO PREVIEW (3 photos) ═══════ */}
        {photos.length > 0 && (
          <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8">
            <div className="max-w-7xl mx-auto">
              <ScrollReveal animation="fade-up">
              <div className="flex items-end justify-between mb-10">
                <div>
                  <div className="inline-flex items-center gap-2 bg-orange-500/10 text-orange-400 rounded-full px-4 py-1.5 text-xs font-bold mb-5 border border-orange-500/15 uppercase tracking-wider">
                    <Camera size={12} />Our Work
                  </div>
                  <h2 className="font-display text-4xl md:text-5xl font-black text-white">Results Speak Louder</h2>
                </div>
                <button onClick={() => navigateTo('portfolio')} className="hidden sm:inline-flex items-center gap-2 text-sm font-bold text-orange-400 hover:text-orange-300 transition-colors group">
                  View Our Work <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
              </ScrollReveal>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                {photos.slice(0, 3).map((photo, i) => (
                  <ScrollReveal key={i} animation="zoom-in" delay={i * 100}>
                  <button onClick={() => navigateTo('portfolio')} className="relative overflow-hidden rounded-xl group border border-gray-800/40 hover:border-orange-500/30 transition-all duration-500 w-full">
                    <div className="aspect-[4/3]"><img src={photo} alt={`Project ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" {...(i > 0 ? { loading: 'lazy' as const } : {})} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} /></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400" />
                  </button>
                  </ScrollReveal>
                ))}
              </div>
              <button onClick={() => navigateTo('portfolio')} className="sm:hidden mt-8 inline-flex items-center gap-2 text-sm font-bold text-orange-400 hover:text-orange-300 transition-colors group">
                View Our Work <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </section>
        )}

        {/* ═══════ HOMEPAGE: TESTIMONIAL HIGHLIGHT (1 testimonial) ═══════ */}
        <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 bg-gray-900/30">
          <div className="max-w-3xl mx-auto text-center">
            <ScrollReveal animation="fade-up">
              <div className="inline-flex items-center gap-2 bg-orange-500/10 text-orange-400 rounded-full px-4 py-1.5 text-xs font-bold mb-5 border border-orange-500/15 uppercase tracking-wider">Reviews</div>
              <div className="flex justify-center gap-0.5 mb-6">{Array.from({ length: 5 }, (_, j) => <Star key={j} size={18} className="text-amber-400 fill-current" />)}</div>
              <p className="text-xl sm:text-2xl text-gray-300 leading-relaxed italic font-light mb-6">"{testimonials[0].quote}"</p>
              <div className="flex items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center"><span className="text-white font-bold text-sm">{testimonials[0].name[0]}</span></div>
                <div className="text-left"><span className="font-bold text-gray-300 text-sm">{testimonials[0].name}</span><span className="text-gray-600 text-sm"> — {testimonials[0].loc}</span></div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        <TrustBadges theme="bold" config={config} rating={lead.enrichedRating} reviewCount={lead.enrichedReviews} />
        <BrandsStrip theme="bold" brandNames={wc?.brandNames} industry={lead.industry} />

        {/* HOMEPAGE: CTA BAND */}
        <CTABand phone={lead.phone} onCallClick={onCallClick} onCTAClick={onCTAClick} onNavigateContact={() => navigateTo('contact')} config={config} />
      </PageShell>

      {/* ═══════════════════════════════════════════
          PAGE: SERVICES
       ═══════════════════════════════════════════ */}
      <PageShell page="services" currentPage={currentPage}>
        <PageHeader
          title="Our Services"
          subtitle={`Expert ${industryLabel}${location ? ` serving ${location}` : ''} and surrounding areas.`}
          bgClass="bg-gray-900"
          titleClass="text-white font-black"
          subtitleClass="text-gray-400"
          accentClass="text-orange-400"
          onBackClick={() => navigateTo('home')}
        />

        {services.length > 0 && <ServiceHero theme="bold" config={config} service={services[0]} description={wc?.serviceDescriptions?.[services[0]]} photo={photosDist.serviceHero} onCTAClick={ctaNavigate} />}
        {services.length > 1 && <ServiceGrid theme="bold" services={services} descriptions={wc?.serviceDescriptions} photos={photosDist.serviceAccents} />}
        <ProcessTimeline theme="bold" config={config} steps={wc?.processSteps} />
        <WhyChooseUs theme="bold" config={config} companyName={lead.companyName} items={wc?.whyChooseUs || wc?.valueProps} photo={photosDist.aboutPhoto} />

        {/* Service area info */}
        {(wc?.serviceAreaText || location) && (
          <section className="py-12 px-4 sm:px-6 md:px-8 bg-gray-900/50 border-t border-gray-800/40">
            <div className="max-w-3xl mx-auto text-center">
              <ScrollReveal animation="fade-up">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <MapPin size={16} className="text-orange-400" />
                  <h3 className="text-lg font-bold text-white">Service Area</h3>
                </div>
                <p className="text-gray-500 text-sm leading-relaxed">{wc?.serviceAreaText || `Proudly serving ${location} and all surrounding communities. Contact us to confirm availability in your area.`}</p>
              </ScrollReveal>
            </div>
          </section>
        )}

        <CTABand phone={lead.phone} onCallClick={onCallClick} onCTAClick={onCTAClick} onNavigateContact={() => navigateTo('contact')} config={config} />
      </PageShell>

      {/* ═══════════════════════════════════════════
          PAGE: ABOUT
       ═══════════════════════════════════════════ */}
      <PageShell page="about" currentPage={currentPage}>
        <PageHeader
          title="About Us"
          subtitle={`Get to know ${lead.companyName} — your trusted partner in ${industryLabel}.`}
          bgClass="bg-gray-900"
          titleClass="text-white font-black"
          subtitleClass="text-gray-400"
          accentClass="text-orange-400"
          onBackClick={() => navigateTo('home')}
        />

        {/* Full About section */}
        <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16 items-start">
              <ScrollReveal animation="fade-left" className="lg:col-span-3">
                <div className="inline-flex items-center gap-2 bg-orange-500/10 text-orange-400 rounded-full px-4 py-1.5 text-xs font-bold mb-5 border border-orange-500/15 uppercase tracking-wider">About Us</div>
                <h2 className="font-display text-4xl md:text-5xl font-black text-white mb-8 leading-[0.95]">
                  Built on Hard Work<br />& Results.
                </h2>
                <div className="space-y-4 text-gray-400 text-base leading-relaxed">
                  <p>{wc?.aboutParagraph1 || `${lead.companyName} — dedicated ${industryLabel} professionals${location ? ` in ${location}` : ''}. We show up on time and get the job done right.`}</p>
                  {wc?.aboutParagraph2 && <p>{wc.aboutParagraph2}</p>}
                  {wc?.closingBody && <p>{wc.closingBody}</p>}
                </div>

                {/* Value props */}
                <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {[
                    { icon: Flame, title: wc?.valueProps?.[0]?.title || 'Fast Response', desc: wc?.valueProps?.[0]?.description || 'Same-day response. We show up when we say we will.' },
                    { icon: Shield, title: wc?.valueProps?.[1]?.title || 'Quality Guaranteed', desc: wc?.valueProps?.[1]?.description || 'Premium materials. Expert work. Satisfaction guaranteed.' },
                    { icon: CheckCircle, title: wc?.valueProps?.[2]?.title || 'Fair & Transparent', desc: wc?.valueProps?.[2]?.description || 'Honest pricing upfront. No hidden fees. No surprises.' },
                  ].map((item, i) => (
                    <div key={i} className="group">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/10 flex items-center justify-center mb-3 group-hover:from-orange-500/30 group-hover:to-red-500/20 transition-all">
                        <item.icon size={18} className="text-orange-400" />
                      </div>
                      <h4 className="text-sm font-bold text-white mb-1">{item.title}</h4>
                      <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-10 flex flex-wrap gap-12">
                  <div><p className="font-display text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400"><AnimatedCounter value={hasRating ? (lead.enrichedRating || 5.0) : 5.0} /></p><p className="text-[11px] uppercase tracking-[0.2em] text-gray-500 mt-2">Star Rating</p></div>
                  {lead.enrichedReviews && (<div><p className="font-display text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400"><AnimatedCounter value={lead.enrichedReviews} suffix="+" /></p><p className="text-[11px] uppercase tracking-[0.2em] text-gray-500 mt-2">Reviews</p></div>)}
                  <div><p className="font-display text-4xl font-black text-white"><AnimatedCounter value={100} suffix="%" /></p><p className="text-[11px] uppercase tracking-[0.2em] text-gray-500 mt-2">Satisfaction</p></div>
                </div>
              </ScrollReveal>

              {/* Sidebar — Testimonial + Quick Contact */}
              <ScrollReveal animation="fade-right" className="lg:col-span-2">
              <div className="flex flex-col gap-5">
                <div className="bg-gray-900/50 border border-orange-500/15 rounded-2xl p-7">
                  <div className="flex gap-0.5 mb-4">
                    {Array.from({ length: 5 }, (_, i) => <Star key={i} size={14} className="text-amber-400 fill-current" />)}
                  </div>
                  <p className="text-white text-base italic leading-relaxed mb-4">
                    "Fast, professional, and top-notch quality. Highly recommended."
                  </p>
                  <div className="w-8 h-0.5 bg-orange-500 rounded-full mb-2" />
                  <span className="text-gray-500 text-xs font-semibold">Satisfied Customer{location ? ` · ${location}` : ''}</span>
                </div>

                <div className="bg-gray-900/50 border border-gray-800/60 rounded-2xl p-7">
                  <h3 className="font-bold text-white text-base mb-1">Ready to get started?</h3>
                  <p className="text-gray-600 text-xs mb-5">Free estimate · Same-day response</p>
                  <div className="space-y-3.5">
                    {lead.phone && (
                      <a href={`tel:${lead.phone}`} onClick={onCallClick} className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center flex-shrink-0"><Phone size={14} className="text-white" /></div>
                        <div><p className="text-[11px] text-gray-600 uppercase tracking-wider font-bold">Phone</p><p className="text-sm font-bold text-white">{lead.phone}</p></div>
                      </a>
                    )}
                    {lead.email && (
                      <a href={`mailto:${lead.email}`} className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center flex-shrink-0"><Mail size={14} className="text-white" /></div>
                        <div><p className="text-[11px] text-gray-600 uppercase tracking-wider font-bold">Email</p><p className="text-sm font-bold text-white">{lead.email}</p></div>
                      </a>
                    )}
                    {lead.enrichedAddress && (
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0"><MapPin size={14} className="text-white" /></div>
                        <div><p className="text-[11px] text-gray-600 uppercase tracking-wider font-bold">Location</p><p className="text-sm font-bold text-white">{lead.enrichedAddress}</p></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* Full Testimonials */}
        <ReviewsSection theme="bold" config={config} location={location} testimonials={[
          ...(wc?.testimonialQuote ? [{ quote: wc.testimonialQuote, author: wc?.testimonialAuthor || 'Verified Customer' }] : []),
          ...(wc?.additionalTestimonials || []),
        ]} />

        <CTABand phone={lead.phone} onCallClick={onCallClick} onCTAClick={onCTAClick} onNavigateContact={() => navigateTo('contact')} config={config} />
      </PageShell>

      {/* ═══════════════════════════════════════════
          PAGE: PORTFOLIO
       ═══════════════════════════════════════════ */}
      <PageShell page="portfolio" currentPage={currentPage}>
        <PageHeader
          title="Our Work"
          subtitle="Browse our portfolio of completed projects."
          bgClass="bg-gray-900"
          titleClass="text-white font-black"
          subtitleClass="text-gray-400"
          accentClass="text-orange-400"
          onBackClick={() => navigateTo('home')}
        />

        <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8">
          <div className="max-w-7xl mx-auto">
            {photos.length > 0 ? (
              <>
                {/* First photo hero-sized */}
                {photos[0] && (
                  <ScrollReveal animation="zoom-in">
                  <div className="group relative rounded-xl overflow-hidden border border-gray-800/40 hover:border-orange-500/30 transition-all duration-500 mb-3 sm:mb-4 cursor-pointer" onClick={() => { setLightboxIndex(0); setLightboxOpen(true) }}>
                    <div className="aspect-[4/3] sm:aspect-[16/9]"><img src={photos[0]} alt="Project 1" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" /></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400" />
                  </div>
                  </ScrollReveal>
                )}
                {/* Remaining photos in grid */}
                {photos.length > 1 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                    {photos.slice(1, 7).map((photo, i) => (
                      <ScrollReveal key={i} animation="zoom-in" delay={i * 100}>
                      <div className="group relative rounded-xl overflow-hidden border border-gray-800/40 hover:border-orange-500/30 transition-all duration-500 cursor-pointer" onClick={() => { setLightboxIndex(i + 1); setLightboxOpen(true) }}>
                        <div className="aspect-[4/3]"><img src={photo} alt={`Project ${i + 2}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" {...{ loading: 'lazy' as const }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} /></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400" />
                      </div>
                      </ScrollReveal>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-gray-900/80 border border-gray-800 flex items-center justify-center mx-auto mb-4">
                  <Camera size={24} className="text-orange-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Portfolio Coming Soon</h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto">We&apos;re putting together our best project photos. Contact us to see examples of our work.</p>
                <button onClick={ctaNavigate} className={`mt-6 inline-flex items-center gap-2 ${config.primaryHex ? '' : 'bg-gradient-to-r from-orange-500 to-red-500'} text-white px-6 py-3 rounded-xl font-bold text-sm hover:from-orange-600 hover:to-red-600 transition-all shadow-lg shadow-orange-500/15`} style={brandGradientStyle(config, 'to right')}>
                  Request Examples <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>
        </section>

        <VideoPlaceholder theme="bold" photo={photos[1]} onCTAClick={ctaNavigate} config={config} />

        <CTABand phone={lead.phone} onCallClick={onCallClick} onCTAClick={onCTAClick} onNavigateContact={() => navigateTo('contact')} config={config} />

        <PhotoLightbox photos={photos} isOpen={lightboxOpen} initialIndex={lightboxIndex} onClose={() => setLightboxOpen(false)} />
      </PageShell>

      {/* ═══════════════════════════════════════════
          PAGE: CONTACT
       ═══════════════════════════════════════════ */}
      <PageShell page="contact" currentPage={currentPage}>
        <PageHeader
          title="Get In Touch"
          subtitle="We'd love to hear from you. Reach out for a free estimate."
          bgClass="bg-gray-900"
          titleClass="text-white font-black"
          subtitleClass="text-gray-400"
          accentClass="text-orange-400"
          onBackClick={() => navigateTo('home')}
        />

        {/* Contact form */}
        <ContactFormEnhanced theme="bold" config={config} previewId={lead.previewId} services={services} companyName={lead.companyName} />

        {/* FAQ */}
        <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 bg-gray-900/30">
          <div className="max-w-3xl mx-auto">
            <ScrollReveal animation="fade-up">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-orange-500/10 text-orange-400 rounded-full px-4 py-1.5 text-xs font-bold mb-5 border border-orange-500/15 uppercase tracking-wider">FAQ</div>
              <h2 className="font-display text-3xl md:text-4xl font-black text-white">Questions? Answered.</h2>
            </div>
            </ScrollReveal>
            <ScrollReveal animation="fade-up">
            <div className="bg-gray-900/40 border border-gray-800/40 rounded-2xl px-6 sm:px-8">
              {faqs.map((f, i) => <FAQItem key={i} question={f.q} answer={f.a} isOpen={openFAQ === i} onToggle={() => setOpenFAQ(openFAQ === i ? null : i)} />)}
            </div>
            </ScrollReveal>
          </div>
        </section>
      </PageShell>

      {/* ═══════ FOOTER (always visible) ═══════ */}
      <footer className="bg-black py-16 px-4 sm:px-6 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
            <div>
              <h3 className="font-display text-white font-black text-xl uppercase tracking-wider mb-4">{lead.companyName}</h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-4">Professional {industryLabel} services{location ? ` serving ${location}` : ''}. Licensed, insured, and committed to results.</p>
              {hasRating && (
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">{Array.from({ length: 5 }, (_, i) => <Star key={i} size={11} className={i < Math.floor(lead.enrichedRating || 0) ? 'text-amber-400 fill-current' : 'text-gray-700'} />)}</div>
                  <span className="text-gray-500 text-xs">{lead.enrichedRating} rating</span>
                </div>
              )}
              <div className="flex gap-2.5 mt-5">
                <a href="#" onClick={(e) => e.preventDefault()} className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center text-gray-600 hover:text-white hover:bg-gray-800 transition-all"><Facebook size={13} /></a>
                <a href="#" onClick={(e) => e.preventDefault()} className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center text-gray-600 hover:text-white hover:bg-gray-800 transition-all"><Instagram size={13} /></a>
                <a href="#" onClick={(e) => e.preventDefault()} className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center text-gray-600 hover:text-white hover:bg-gray-800 transition-all"><GoogleIcon size={12} /></a>
              </div>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4 text-xs uppercase tracking-[0.15em]">Quick Links</h4>
              <ul className="space-y-2.5 text-sm text-gray-500">
                {navSections.map((s) => (
                  <li key={s.page}><button onClick={() => navigateTo(s.page)} data-nav-page={s.page} className="hover:text-white transition-colors">{s.label}</button></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4 text-xs uppercase tracking-[0.15em]">Contact</h4>
              <div className="space-y-3 text-sm text-gray-500">
                {lead.phone && <a href={`tel:${lead.phone}`} onClick={onCallClick} className="flex items-center gap-2.5 hover:text-white transition-colors"><Phone size={13} className="text-orange-500" />{lead.phone}</a>}
                {lead.email && <a href={`mailto:${lead.email}`} className="flex items-center gap-2.5 hover:text-white transition-colors"><Mail size={13} className="text-orange-500" />{lead.email}</a>}
                {lead.enrichedAddress && <p className="flex items-center gap-2.5"><MapPin size={13} className="text-orange-500 flex-shrink-0" />{lead.enrichedAddress}</p>}
              </div>
            </div>
          </div>
          <div className="border-t border-gray-900 pt-10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-gray-600 text-xs">&copy; {new Date().getFullYear()} {lead.companyName}. All rights reserved.</p>
            {location && <p className="text-gray-700 text-xs">Professional {industryLabel} · {location}</p>}
            <span className="text-gray-700 text-[10px]">Powered by <a href="https://brightautomations.com" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-400 transition-colors">Bright Automations</a></span>
          </div>
        </div>
      </footer>

      {/* ═══════ STICKY MOBILE CTA ═══════ */}
      <div className="fixed bottom-0 left-0 right-0 z-40 sm:hidden bg-gray-950/95 backdrop-blur-xl border-t border-gray-800 px-4 py-3">
        <div className="flex gap-3">
          {lead.phone && <a href={`tel:${lead.phone}`} onClick={onCallClick} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl ${config.primaryHex ? '' : 'bg-gradient-to-r from-orange-500 to-red-500'} text-white font-bold text-sm`} style={brandGradientStyle(config, 'to right')}><Phone size={16} />Call Now</a>}
          <button onClick={onCTAClick} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/10 border border-white/15 text-white font-bold text-sm">Free Quote</button>
        </div>
      </div>

      {/* ═══════ CHATBOT ═══════ */}
      <ChatbotWidget companyName={lead.companyName} accentColor={brandAccent(config, '#f97316')} />

      <div className="h-20 sm:h-0" />
    </div>
  )
}
