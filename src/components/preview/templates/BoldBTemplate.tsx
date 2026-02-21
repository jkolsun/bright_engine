'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Phone, MapPin, Star, Shield, CheckCircle, ArrowRight, Mail,
  Clock, Camera, Quote, Sparkles, Award, Wrench,
  MessageCircle, X, Send, ChevronDown, Menu, ChevronRight,
  Minus, Plus, Facebook, Instagram, ExternalLink
} from 'lucide-react'
import type { TemplateProps } from '../config/template-types'
import DisclaimerBanner from '../shared/DisclaimerBanner'

// Google "G" icon (not in lucide)
function GoogleIcon({ size = 15, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

// ─────────────────────────────────────────────
// CHATBOT WIDGET
// ─────────────────────────────────────────────
function ChatbotWidget({ companyName, accentColor = '#3b82f6' }: { companyName: string; accentColor?: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<{from: string; text: string}[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setIsTyping(true)
      const timer = setTimeout(() => {
        setMessages([{
          from: 'bot',
          text: `Hey! 👋 I'm the virtual assistant for ${companyName}. Need a quick quote or have a question? I'm here to help.`,
        }])
        setIsTyping(false)
      }, 800)
      return () => clearTimeout(timer)
    }
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100)
  }, [isOpen, companyName])

  const quickReplies = [
    'Get a free quote',
    'What services do you offer?',
    'Hours & availability',
  ]

  const handleSend = (text?: string) => {
    const msg = text || input.trim()
    if (!msg) return
    setMessages((prev) => [...prev, { from: 'user', text: msg }])
    setInput('')
    setIsTyping(true)

    setTimeout(() => {
      let reply = "Thanks for reaching out! A team member will get back to you shortly. For faster service, give us a call — we pick up."
      if (msg.toLowerCase().includes('quote')) {
        reply = "We'd love to give you a free quote! Tell me a bit about what you need, or call us directly — we can usually give ballpark pricing on the first call."
      } else if (msg.toLowerCase().includes('service')) {
        reply = "We handle everything from routine maintenance to full-scale projects. Scroll down to see our full service list, or just tell me what you need!"
      } else if (msg.toLowerCase().includes('hour')) {
        reply = "We're on the job Monday through Saturday. Call us anytime — if we can't pick up, we'll call you back within the hour."
      }
      setMessages((prev) => [...prev, { from: 'bot', text: reply }])
      setIsTyping(false)
    }, 1200)
  }

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-5 right-5 z-[100] group sm:bottom-5 bottom-[88px]"
        aria-label="Chat with us"
      >
        <div
          className="w-[58px] h-[58px] rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-105 relative"
          style={{ background: `linear-gradient(135deg, ${accentColor}, #06b6d4)` }}
        >
          {isOpen ? <X size={22} className="text-white" /> : <MessageCircle size={22} className="text-white" />}
        </div>
        {!isOpen && (
          <span
            className="absolute inset-0 rounded-full animate-ping opacity-20"
            style={{ background: accentColor }}
          />
        )}
        {!isOpen && (
          <div className="absolute bottom-full right-0 mb-3 whitespace-nowrap bg-white text-gray-800 text-sm font-semibold px-4 py-2 rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            Need help? Chat with us
            <div className="absolute top-full right-6 w-2 h-2 bg-white transform rotate-45 -translate-y-1" />
          </div>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed sm:bottom-24 bottom-[152px] right-5 z-[100] w-[370px] max-w-[calc(100vw-2.5rem)] bg-gray-950 rounded-2xl shadow-2xl border border-gray-800 overflow-hidden">
          {/* Header */}
          <div
            className="px-5 py-4"
            style={{ background: `linear-gradient(135deg, ${accentColor}, #06b6d4)` }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <MessageCircle size={18} className="text-white" />
              </div>
              <div>
                <p className="font-bold text-sm text-white">{companyName}</p>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-green-300 rounded-full animate-pulse" />
                  <span className="text-xs text-white/80">Online now</span>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-white/40 mt-2.5 leading-relaxed tracking-wide uppercase">
              AI Assistant powered by Bright Automations · Included with your website
            </p>
          </div>

          {/* Messages */}
          <div className="h-[280px] overflow-y-auto px-4 py-4 space-y-3 bg-gray-900/50">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] px-4 py-2.5 text-sm leading-relaxed ${
                    msg.from === 'user'
                      ? 'text-white rounded-2xl rounded-br-sm'
                      : 'bg-gray-800 text-gray-200 rounded-2xl rounded-bl-sm border border-gray-700/50'
                  }`}
                  style={msg.from === 'user' ? { background: accentColor } : undefined}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-800 px-4 py-3 rounded-2xl rounded-bl-sm border border-gray-700/50">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Replies */}
          {messages.length <= 1 && (
            <div className="px-4 pb-2 flex gap-2 flex-wrap bg-gray-900/50">
              {quickReplies.map((qr, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(qr)}
                  className="text-xs px-3 py-1.5 rounded-full border border-gray-700 text-gray-400 hover:bg-gray-800 hover:border-gray-600 hover:text-gray-200 transition-all"
                >
                  {qr}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-4 py-3 border-t border-gray-800 bg-gray-950">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type a message..."
                className="flex-1 text-sm px-4 py-2.5 rounded-full bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 placeholder:text-gray-500"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim()}
                className="w-10 h-10 rounded-full flex items-center justify-center text-white transition-all disabled:opacity-30"
                style={{ background: accentColor }}
              >
                <Send size={15} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─────────────────────────────────────────────
// MOBILE NAVIGATION DRAWER
// ─────────────────────────────────────────────
function MobileNav({ isOpen, onClose, companyName, sections, phone, onCallClick, onCTAClick }: { isOpen: boolean; onClose: () => void; companyName: string; sections: { id: string; label: string }[]; phone?: string; onCallClick: () => void; onCTAClick: () => void }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-[90] lg:hidden">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-[300px] bg-gray-950 border-l border-gray-800 shadow-2xl">
        <div className="p-6 h-full flex flex-col">
          <div className="flex justify-between items-center mb-10">
            <span className="text-lg font-black text-white uppercase tracking-tight">{companyName}</span>
            <button onClick={onClose} className="w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>

          <nav className="space-y-1 flex-1">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                onClick={onClose}
                className="flex items-center justify-between px-4 py-3.5 rounded-xl text-gray-300 hover:bg-gray-800/50 hover:text-white transition-all text-[15px] font-semibold"
              >
                {s.label}
                <ChevronRight size={16} className="text-gray-600" />
              </a>
            ))}
          </nav>

          {/* Social Icons */}
          <div className="flex gap-3 mb-5">
            <a href="#" className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center text-gray-500 hover:text-blue-400 transition-colors">
              <Facebook size={16} />
            </a>
            <a href="#" className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center text-gray-500 hover:text-pink-400 transition-colors">
              <Instagram size={16} />
            </a>
            <a href="#" className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center text-gray-500 hover:text-blue-400 transition-colors">
              <GoogleIcon size={16} />
            </a>
          </div>

          {/* Bottom Actions */}
          <div className="space-y-3">
            {phone && (
              <a
                href={`tel:${phone}`}
                onClick={() => { onCallClick(); onClose() }}
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-white text-gray-900 font-bold text-sm transition-all hover:bg-gray-100"
              >
                <Phone size={16} />
                Call {phone}
              </a>
            )}
            <button
              onClick={() => { onCTAClick(); onClose() }}
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold text-sm hover:from-blue-600 hover:to-cyan-600 transition-all"
            >
              Get Free Quote
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// FAQ ACCORDION
// ─────────────────────────────────────────────
function FAQItem({ question, answer, isOpen, onToggle }: { question: string; answer: string; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-gray-800/60 last:border-0">
      <button onClick={onToggle} className="w-full flex items-center justify-between py-6 text-left group">
        <span className="text-[15px] font-semibold text-gray-200 group-hover:text-white transition-colors pr-6">{question}</span>
        <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-800 group-hover:bg-gray-700 flex items-center justify-center transition-all">
          {isOpen ? <Minus size={14} className="text-blue-400" /> : <Plus size={14} className="text-gray-500" />}
        </span>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[200px] opacity-100 pb-6' : 'max-h-0 opacity-0'}`}>
        <p className="text-sm text-gray-500 leading-relaxed pr-14">{answer}</p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// MAIN TEMPLATE
// ─────────────────────────────────────────────
export default function BoldBTemplate({ lead, config, onCTAClick, onCallClick, websiteCopy }: TemplateProps) {
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
    { id: 'hero', label: 'Home' },
    { id: 'services', label: 'Services' },
    { id: 'work', label: 'Our Work' },
    { id: 'about', label: 'About' },
    { id: 'faq', label: 'FAQ' },
    { id: 'contact', label: 'Contact' },
  ]

  const faqs = [
    { q: 'How fast can you start?', a: 'Most jobs begin within 1–2 weeks of your approved quote.' },
    { q: 'Do you offer free estimates?', a: 'Always — no pressure, no obligation.' },
    { q: `What areas does ${lead.companyName} cover?`, a: `We serve ${location || 'the local area'} and surrounding communities.` },
    { q: 'Are you licensed and insured?', a: 'Fully licensed, bonded, and insured with comprehensive coverage.' },
    { q: 'What if I\'m not happy with the work?', a: 'Every job comes with our satisfaction guarantee — we make it right.' },
  ]

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  return (
    <div className="preview-template min-h-screen bg-gray-950 antialiased">
      <DisclaimerBanner variant="bold" companyName={lead.companyName} />

      {/* ═══════════════════════════════════════════
          NAVIGATION — Dark glass with socials
          ═══════════════════════════════════════════ */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-gray-950/95 backdrop-blur-xl border-b border-white/5 shadow-xl shadow-black/20'
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex items-center justify-between h-[72px]">
            {/* Logo */}
            <div className="flex items-center gap-3">
              {lead.logo && (
                <img src={lead.logo} alt="" className="h-8 w-8 rounded-lg object-cover ring-2 ring-blue-500/20" />
              )}
              <span className="font-display text-xl font-black text-white tracking-tight uppercase">
                {lead.companyName}
              </span>
            </div>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-1">
              {navSections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="px-3 py-2 rounded-lg text-[13px] font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                >
                  {s.label}
                </a>
              ))}
            </div>

            {/* Right: Socials + Phone + CTA */}
            <div className="flex items-center gap-3">
              {/* Social Icons — Desktop */}
              <div className="hidden md:flex items-center gap-0.5 text-gray-500">
                <a href="#" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 hover:text-blue-400 transition-all" aria-label="Facebook">
                  <Facebook size={14} />
                </a>
                <a href="#" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 hover:text-pink-400 transition-all" aria-label="Instagram">
                  <Instagram size={14} />
                </a>
                <a href="#" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 hover:text-blue-400 transition-all" aria-label="Google Reviews">
                  <GoogleIcon size={13} />
                </a>
              </div>

              <div className="hidden md:block w-px h-5 bg-white/10" />

              {/* Phone */}
              {lead.phone && (
                <a
                  href={`tel:${lead.phone}`}
                  onClick={onCallClick}
                  className="hidden lg:flex items-center gap-2 text-sm text-gray-400 hover:text-blue-400 transition-colors font-medium"
                >
                  <Phone size={14} />
                  {lead.phone}
                </a>
              )}

              {/* CTA */}
              <button
                onClick={onCTAClick}
                className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:from-blue-600 hover:to-cyan-600 transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40"
              >
                Free Quote
              </button>

              {/* Mobile Menu */}
              <button
                onClick={() => setMobileNavOpen(true)}
                className="lg:hidden w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-300 hover:text-white transition-colors"
              >
                <Menu size={20} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <MobileNav
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        companyName={lead.companyName}
        sections={navSections}
        phone={lead.phone}
        onCallClick={onCallClick}
        onCTAClick={onCTAClick}
      />

      {/* ═══════════════════════════════════════════
          HERO — Centered with Watermark
          ═══════════════════════════════════════════ */}
      <section id="hero" className="relative min-h-[100svh] flex items-center justify-center overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient}`} />
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/20 to-transparent" />

        {/* Watermark */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full pointer-events-none select-none">
          <p className="font-display text-[7rem] md:text-[11rem] lg:text-[14rem] font-black text-white/[0.025] text-center leading-none whitespace-nowrap truncate px-8">
            {lead.companyName}
          </p>
        </div>

        {/* Ambient glow */}
        <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-blue-500/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-3xl" />

        <div className="relative max-w-4xl mx-auto w-full px-4 sm:px-6 md:px-8 py-32 text-center">
          {/* Rating Badge */}
          {hasRating && (
            <div className="inline-flex items-center gap-2.5 bg-white/8 backdrop-blur-md border border-white/10 rounded-full px-5 py-2.5 mb-8">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} size={14} className={i < Math.floor(lead.enrichedRating || 0) ? 'text-blue-400 fill-current' : 'text-white/20'} />
                ))}
              </div>
              <span className="text-sm font-bold text-white">{lead.enrichedRating}-Star Rated</span>
              {lead.enrichedReviews && (
                <span className="text-sm text-white/40">• {lead.enrichedReviews}+ reviews</span>
              )}
            </div>
          )}

          {/* Headline */}
          <h1 className="font-display text-[2.75rem] sm:text-6xl md:text-7xl lg:text-[5.5rem] font-black text-white mb-6 tracking-tight leading-[0.95]">
            {wc?.heroHeadline || lead.companyName}
          </h1>
          {wc?.heroSubheadline && (
            <p className="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto mb-8 leading-relaxed">{wc.heroSubheadline}</p>
          )}

          <p className="text-base sm:text-lg text-white/40 mb-12 max-w-xl mx-auto">
            {config.tagline}
          </p>

          {/* CTA Row */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {lead.phone && (
              <a
                href={`tel:${lead.phone}`}
                onClick={onCallClick}
                className="inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-10 py-5 rounded-xl font-black text-lg hover:from-blue-600 hover:to-cyan-600 transition-all shadow-2xl shadow-blue-500/20"
              >
                <Phone size={22} />
                Call Now — Free Estimate
              </a>
            )}
            <button
              onClick={onCTAClick}
              className="inline-flex items-center justify-center gap-2.5 bg-white/8 backdrop-blur-sm border border-white/15 text-white px-10 py-5 rounded-xl font-bold text-lg hover:bg-white hover:text-gray-900 transition-all duration-300 group"
            >
              {config.ctaText}
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/20">
          <span className="text-[10px] uppercase tracking-[0.25em] font-bold">Explore</span>
          <ChevronDown size={18} className="animate-bounce" />
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          PROOF WALL — Inline strip
          ═══════════════════════════════════════════ */}
      <section className="py-4 sm:py-5 px-4 sm:px-6 md:px-8 border-y border-white/5 bg-gray-900/40">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm">
            {hasRating && (
              <span className="flex items-center gap-2 text-white font-bold">
                <Star size={14} className="text-blue-400 fill-current" />
                {lead.enrichedRating} Rating
              </span>
            )}
            {lead.enrichedReviews && (
              <>
                <span className="text-gray-700 hidden sm:inline">•</span>
                <span className="text-gray-300 font-medium">{lead.enrichedReviews}+ Customers</span>
              </>
            )}
            <span className="text-gray-700 hidden sm:inline">•</span>
            <span className="flex items-center gap-1.5 text-gray-300 font-medium">
              <Shield size={13} className="text-blue-400" />
              Licensed & Insured
            </span>
            {location && (
              <>
                <span className="text-gray-700 hidden sm:inline">•</span>
                <span className="flex items-center gap-1.5 text-gray-300 font-medium">
                  <MapPin size={13} className="text-blue-400" />
                  {location}
                </span>
              </>
            )}
            <span className="text-gray-700 hidden sm:inline">•</span>
            <span className="flex items-center gap-1.5 text-gray-300 font-medium">
              <Clock size={13} className="text-blue-400" />
              Same-Day Response
            </span>
            {wc?.yearsBadge && (
              <><span className="text-gray-700 hidden sm:inline">•</span><span className="flex items-center gap-1.5 text-gray-300 font-medium">{wc.yearsBadge}</span></>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          SERVICES — Numbered Vertical List (no cards)
          ═══════════════════════════════════════════ */}
      {services.length > 0 && (
        <section id="services" className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8">
          <div className="max-w-5xl mx-auto">
            {/* Section Header */}
            <div className="mb-12 sm:mb-16">
              <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-400 rounded-full px-4 py-1.5 text-xs font-bold mb-5 border border-blue-500/15 uppercase tracking-wider">
                <Wrench size={12} />
                Services
              </div>
              <h2 className="font-display text-4xl md:text-5xl font-black text-white">
                What We Do
              </h2>
            </div>

            {/* Service List */}
            <div className="divide-y divide-gray-800/60">
              {services.slice(0, 8).map((service, i) => (
                <div
                  key={i}
                  className="group flex items-center justify-between py-5 sm:py-6 cursor-pointer hover:pl-3 transition-all duration-300"
                  onClick={onCTAClick}
                >
                  <div className="flex items-center gap-6">
                    <span className="text-xs text-gray-600 font-mono tabular-nums w-6 font-bold">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-gray-200 group-hover:text-white transition-colors">
                      {service}
                    </h3>
                    {wc?.serviceDescriptions?.[service] && (
                      <p className="text-sm text-gray-400 mt-1">{wc.serviceDescriptions[service]}</p>
                    )}
                  </div>
                  <ArrowRight
                    size={16}
                    className="text-gray-700 group-hover:text-blue-400 group-hover:translate-x-1 transition-all flex-shrink-0"
                  />
                </div>
              ))}
            </div>

            <div className="mt-12 sm:mt-14 flex justify-center">
              <button
                onClick={onCTAClick}
                className="flex items-center gap-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-8 py-3.5 sm:py-4 rounded-xl font-bold text-base hover:from-blue-600 hover:to-cyan-600 transition-all shadow-lg shadow-blue-500/15 hover:shadow-blue-500/30"
              >
                Request a Quote
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════
          FULL-BLEED STATEMENT
          ═══════════════════════════════════════════ */}
      <section className="relative py-16 sm:py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500" />
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle at 30% 40%, white 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        <div className="relative max-w-4xl mx-auto px-5 sm:px-8 text-center">
          <p className="text-2xl sm:text-3xl md:text-4xl font-black text-white leading-snug tracking-tight">
            {wc?.closingHeadline || `"We don't do shortcuts. Every job gets our best — period."`}
          </p>
          {location && (
            <p className="mt-6 text-white/50 text-sm font-bold uppercase tracking-[0.2em]">
              Proudly serving {location}
            </p>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          GALLERY — Asymmetric Masonry
          ═══════════════════════════════════════════ */}
      {photos.length > 0 && (
        <section id="work" className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 bg-gray-900/30">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-10 sm:mb-16">
              <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-400 rounded-full px-4 py-1.5 text-xs font-bold mb-5 border border-blue-500/15 uppercase tracking-wider">
                <Camera size={12} />
                Our Work
              </div>
              <h2 className="font-display text-4xl md:text-5xl font-black text-white">
                See the Results
              </h2>
            </div>

            {/* Hero photo full width */}
            <div className="mb-3 sm:mb-4">
              <div className="group relative rounded-xl overflow-hidden border border-gray-800/40 hover:border-blue-500/30 transition-all duration-500">
                <div className="aspect-[16/9] sm:aspect-[2/1]">
                  <img
                    src={photos[0]}
                    alt={`${lead.companyName} project 1`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400" />
              </div>
            </div>

            {/* Remaining photos grid */}
            {photos.length > 1 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                {photos.slice(1, 5).map((photo, i) => (
                  <div
                    key={i}
                    className="group relative rounded-xl overflow-hidden border border-gray-800/40 hover:border-blue-500/30 transition-all duration-500"
                  >
                    <div className="aspect-[4/3]">
                      <img
                        src={photo}
                        alt={`${lead.companyName} project ${i + 2}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════
          ABOUT — Editorial with Pull-Quote
          ═══════════════════════════════════════════ */}
      <section id="about" className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16 items-start">
            {/* Content */}
            <div className="lg:col-span-3">
              <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-400 rounded-full px-4 py-1.5 text-xs font-bold mb-5 border border-blue-500/15 uppercase tracking-wider">
                About Us
              </div>
              <h2 className="font-display text-4xl md:text-5xl font-black text-white mb-8 leading-[0.95]">
                Built on Trust.<br />Proven by Work.
              </h2>
              <div className="text-gray-400 leading-relaxed text-base sm:text-lg">
                <p>
                  {wc?.aboutParagraph1 ||
                    `${lead.companyName} is ${location ? `${location}'s` : 'your'} trusted ${industryLabel} team — dedicated to quality on every job.`}
                </p>
                {wc?.aboutParagraph2 && (
                  <p className="text-gray-500 text-base leading-relaxed mt-4">{wc.aboutParagraph2}</p>
                )}
              </div>

              {/* Why Choose Us — inline */}
              <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[
                  { icon: Clock, title: wc?.valueProps?.[0]?.title || 'Same-Day Response', desc: wc?.valueProps?.[0]?.description || 'We pick up, show up, and get to work — fast.' },
                  { icon: Shield, title: wc?.valueProps?.[1]?.title || 'Quality Guaranteed', desc: wc?.valueProps?.[1]?.description || 'Premium materials. Expert craftsmanship. Every time.' },
                  { icon: CheckCircle, title: wc?.valueProps?.[2]?.title || 'Fair & Transparent', desc: wc?.valueProps?.[2]?.description || 'Honest pricing. No hidden fees. No surprises.' },
                ].map((item, i) => (
                  <div key={i} className="group">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/10 flex items-center justify-center mb-3 group-hover:from-blue-500/30 group-hover:to-cyan-500/20 transition-all">
                      <item.icon size={18} className="text-blue-400" />
                    </div>
                    <h4 className="text-sm font-bold text-white mb-1">{item.title}</h4>
                    <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Sidebar — Quote + Contact Card */}
            <div className="lg:col-span-2 flex flex-col gap-5">
              {/* Pull Quote */}
              <div className="relative bg-gray-900/50 border border-blue-500/15 rounded-2xl p-7">
                <Quote size={28} className="text-blue-500/20 mb-3" />
                <p className="text-white text-base italic leading-relaxed mb-4">
                  "Outstanding work — professional, on time, and top quality."
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} size={11} className="text-blue-400 fill-current" />
                    ))}
                  </div>
                  <span className="text-gray-600 text-xs">— Satisfied Customer{location ? `, ${location}` : ''}</span>
                </div>
              </div>

              {/* Quick Contact */}
              <div className="bg-gray-900/50 border border-gray-800/60 rounded-2xl p-7">
                <h3 className="font-bold text-white text-base mb-4">Ready to get started?</h3>
                <div className="space-y-3.5">
                  {lead.phone && (
                    <a href={`tel:${lead.phone}`} onClick={onCallClick} className="flex items-center gap-3 group">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center flex-shrink-0">
                        <Phone size={14} className="text-white" />
                      </div>
                      <div>
                        <p className="text-[11px] text-gray-600 uppercase tracking-wider font-bold">Phone</p>
                        <p className="text-sm font-bold text-white">{lead.phone}</p>
                      </div>
                    </a>
                  )}
                  {lead.email && (
                    <a href={`mailto:${lead.email}`} className="flex items-center gap-3 group">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                        <Mail size={14} className="text-white" />
                      </div>
                      <div>
                        <p className="text-[11px] text-gray-600 uppercase tracking-wider font-bold">Email</p>
                        <p className="text-sm font-bold text-white">{lead.email}</p>
                      </div>
                    </a>
                  )}
                  {lead.enrichedAddress && (
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                        <MapPin size={14} className="text-white" />
                      </div>
                      <div>
                        <p className="text-[11px] text-gray-600 uppercase tracking-wider font-bold">Location</p>
                        <p className="text-sm font-bold text-white">{lead.enrichedAddress}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          TESTIMONIALS — Editorial Pull-Quotes
          ═══════════════════════════════════════════ */}
      <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 bg-gray-900/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-400 rounded-full px-4 py-1.5 text-xs font-bold mb-5 border border-blue-500/15 uppercase tracking-wider">
              <Sparkles size={12} />
              Reviews
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-black text-white">
              Trusted by Homeowners
            </h2>
          </div>

          {/* Staggered layout instead of even grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(() => {
              const testimonials = [
                ...(wc?.testimonialQuote ? [{
                  quote: wc.testimonialQuote,
                  name: wc.testimonialAuthor || 'Verified Customer',
                  loc: lead.city || 'Local',
                }] : []),
                { quote: `Professional, thorough, and the results speak for themselves. Highly recommend ${lead.companyName}.`, name: 'Homeowner', loc: lead.city || 'Local' },
                { quote: `On time, communicative, and delivered exactly as promised. Will use ${lead.companyName} again.`, name: 'Property Manager', loc: lead.city || 'Local' },
                { quote: `Already recommended ${lead.companyName} to all our neighbors. Couldn't be happier.`, name: 'Repeat Client', loc: lead.city || 'Local' },
              ].slice(0, 3)
              return testimonials.map((review, i) => (
                <div
                  key={i}
                  className={`bg-gray-950/60 border border-gray-800/40 rounded-2xl p-7 sm:p-8 hover:border-blue-500/20 transition-all duration-300 ${
                    i === 2 ? 'md:col-span-2 md:max-w-lg md:mx-auto' : ''
                  }`}
                >
                  <div className="flex gap-0.5 mb-4">
                    {Array.from({ length: 5 }, (_, j) => (
                      <Star key={j} size={14} className="text-blue-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-300 text-base leading-relaxed mb-5 italic">
                    "{review.quote}"
                  </p>
                  <div className="flex items-center gap-3 text-xs">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-[11px] font-bold">{review.name[0]}</span>
                    </div>
                    <div>
                      <span className="font-bold text-gray-300">{review.name}</span>
                      <span className="text-gray-600"> — {review.loc}</span>
                    </div>
                  </div>
                </div>
              ))
            })()}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          FAQ — Accordion
          ═══════════════════════════════════════════ */}
      <section id="faq" className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-400 rounded-full px-4 py-1.5 text-xs font-bold mb-5 border border-blue-500/15 uppercase tracking-wider">
              FAQ
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-black text-white">
              Questions? Answered.
            </h2>
          </div>

          <div className="bg-gray-900/40 border border-gray-800/40 rounded-2xl px-6 sm:px-8">
            {faqs.map((faq, i) => (
              <FAQItem
                key={i}
                question={faq.q}
                answer={faq.a}
                isOpen={openFAQ === i}
                onToggle={() => setOpenFAQ(openFAQ === i ? null : i)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          CONTACT — Two Column with Form
          ═══════════════════════════════════════════ */}
      <section id="contact" className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 bg-gray-900/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
            {/* Info Side */}
            <div>
              <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-400 rounded-full px-4 py-1.5 text-xs font-bold mb-5 border border-blue-500/15 uppercase tracking-wider">
                Contact
              </div>
              <h2 className="font-display text-4xl md:text-5xl font-black text-white mb-6 leading-[0.95]">
                Let's Talk.
              </h2>
              <p className="text-gray-400 text-base leading-relaxed mb-10 max-w-md">
                {wc?.closingBody || `Free estimates, fast response. Reach out today.`}
              </p>

              <div className="space-y-5">
                {lead.phone && (
                  <a href={`tel:${lead.phone}`} onClick={onCallClick} className="flex items-center gap-4 group">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/15 group-hover:shadow-blue-500/30 transition-shadow">
                      <Phone size={20} className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{lead.phone}</p>
                      <p className="text-xs text-gray-500">Call or text anytime</p>
                    </div>
                  </a>
                )}
                {lead.email && (
                  <a href={`mailto:${lead.email}`} className="flex items-center gap-4 group">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/15 group-hover:shadow-indigo-500/30 transition-shadow">
                      <Mail size={20} className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{lead.email}</p>
                      <p className="text-xs text-gray-500">We reply within hours</p>
                    </div>
                  </a>
                )}
                {lead.enrichedAddress && (
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-cyan-500/15">
                      <MapPin size={20} className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{lead.enrichedAddress}</p>
                      <p className="text-xs text-gray-500">{location}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Social Links */}
              <div className="flex gap-3 mt-10">
                {[
                  { icon: Facebook, label: 'Facebook', hoverColor: 'hover:text-blue-400 hover:border-blue-500/30' },
                  { icon: Instagram, label: 'Instagram', hoverColor: 'hover:text-pink-400 hover:border-pink-500/30' },
                  { icon: GoogleIcon, label: 'Google', hoverColor: 'hover:text-blue-400 hover:border-blue-500/30' },
                ].map(({ icon: Icon, label, hoverColor }) => (
                  <a
                    key={label}
                    href="#"
                    className={`w-10 h-10 rounded-lg bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-500 transition-all ${hoverColor}`}
                    aria-label={label}
                  >
                    <Icon size={16} />
                  </a>
                ))}
              </div>
            </div>

            {/* Form Side */}
            <div className="bg-gray-900/60 border border-gray-800/40 rounded-2xl p-7 sm:p-8">
              <h3 className="text-lg font-bold text-white mb-1">Send us a message</h3>
              <p className="text-xs text-gray-500 mb-6">We'll get back to you within a few hours.</p>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Name</label>
                    <input
                      type="text"
                      placeholder="Your name"
                      className="w-full px-4 py-3 rounded-xl bg-gray-800/60 border border-gray-700/50 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 placeholder:text-gray-600 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Phone</label>
                    <input
                      type="tel"
                      placeholder="(555) 555-5555"
                      className="w-full px-4 py-3 rounded-xl bg-gray-800/60 border border-gray-700/50 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 placeholder:text-gray-600 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Email</label>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 rounded-xl bg-gray-800/60 border border-gray-700/50 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 placeholder:text-gray-600 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">How can we help?</label>
                  <textarea
                    rows={4}
                    placeholder="Tell us about your project..."
                    className="w-full px-4 py-3 rounded-xl bg-gray-800/60 border border-gray-700/50 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 placeholder:text-gray-600 transition-all resize-none"
                  />
                </div>
                <button
                  onClick={onCTAClick}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold text-sm hover:from-blue-600 hover:to-cyan-600 transition-all shadow-lg shadow-blue-500/15 hover:shadow-blue-500/30 hover:scale-[1.01] active:scale-[0.99]"
                >
                  Send Message
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          FOOTER
          ═══════════════════════════════════════════ */}
      <footer className="bg-black py-14 sm:py-16 px-4 sm:px-6 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
            {/* Brand */}
            <div>
              <h3 className="font-display text-white font-black text-xl uppercase tracking-wider mb-4">
                {lead.companyName}
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-4">
                Professional {industryLabel} services{location ? ` serving ${location}` : ''}.
                Licensed, insured, and committed to results.
              </p>
              {hasRating && (
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} size={11} className={i < Math.floor(lead.enrichedRating || 0) ? 'text-blue-400 fill-current' : 'text-gray-700'} />
                    ))}
                  </div>
                  <span className="text-gray-500 text-xs">{lead.enrichedRating} rating</span>
                </div>
              )}
              {/* Footer Socials */}
              <div className="flex gap-2.5 mt-5">
                <a href="#" className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center text-gray-600 hover:text-white hover:bg-gray-800 transition-all"><Facebook size={13} /></a>
                <a href="#" className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center text-gray-600 hover:text-white hover:bg-gray-800 transition-all"><Instagram size={13} /></a>
                <a href="#" className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center text-gray-600 hover:text-white hover:bg-gray-800 transition-all"><GoogleIcon size={12} /></a>
              </div>
            </div>

            {/* Services */}
            <div>
              <h4 className="text-white font-bold mb-4 text-xs uppercase tracking-[0.15em]">Services</h4>
              <ul className="space-y-2.5 text-sm text-gray-500">
                {services.slice(0, 5).map((s, i) => (
                  <li key={i} className="flex items-center gap-2 hover:text-gray-300 transition-colors cursor-pointer">
                    <CheckCircle size={11} className="text-blue-500 flex-shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-white font-bold mb-4 text-xs uppercase tracking-[0.15em]">Contact</h4>
              <div className="space-y-3 text-sm text-gray-500">
                {lead.phone && (
                  <a href={`tel:${lead.phone}`} onClick={onCallClick} className="flex items-center gap-2.5 hover:text-white transition-colors">
                    <Phone size={13} className="text-blue-500" /> {lead.phone}
                  </a>
                )}
                {lead.email && (
                  <a href={`mailto:${lead.email}`} className="flex items-center gap-2.5 hover:text-white transition-colors">
                    <Mail size={13} className="text-blue-500" /> {lead.email}
                  </a>
                )}
                {lead.enrichedAddress && (
                  <p className="flex items-center gap-2.5">
                    <MapPin size={13} className="text-blue-500 flex-shrink-0" /> {lead.enrichedAddress}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-900 pt-10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-gray-600 text-xs">
              &copy; {new Date().getFullYear()} {lead.companyName}. All rights reserved.
            </p>
            {location && (
              <p className="text-gray-700 text-xs">
                Professional {industryLabel} · {location}
              </p>
            )}
          </div>
        </div>
      </footer>

      {/* ═══════════════════════════════════════════
          STICKY MOBILE CTA BAR
          ═══════════════════════════════════════════ */}
      <div className="fixed bottom-0 left-0 right-0 z-40 sm:hidden bg-gray-950/95 backdrop-blur-xl border-t border-gray-800 px-4 py-3">
        <div className="flex gap-3">
          {lead.phone && (
            <a
              href={`tel:${lead.phone}`}
              onClick={onCallClick}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-800 text-white font-bold text-sm border border-gray-700"
            >
              <Phone size={16} />
              Call
            </a>
          )}
          <button
            onClick={onCTAClick}
            className="flex-[2] flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold text-sm"
          >
            Get Free Quote
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          CHATBOT
          ═══════════════════════════════════════════ */}
      <ChatbotWidget companyName={lead.companyName} accentColor="#3b82f6" />

      {/* Bottom padding for mobile sticky bar */}
      <div className="h-20 sm:h-0" />
    </div>
  )
}