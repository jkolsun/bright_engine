'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import RepOnboardingWizard from '@/components/rep/RepOnboardingWizard'
import {
  LayoutDashboard,
  Phone,
  DollarSign,
  Target,
  LogOut,
  Award,
  MessageCircle,
  Send,
  CheckCircle,
  X,
  Loader2,
} from 'lucide-react'
import { DialerProvider } from '@/components/dialer/DialerProvider'

export const dynamic = 'force-dynamic'

export default function PartTimeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [feedbackCategory, setFeedbackCategory] = useState('general')
  const [feedbackSending, setFeedbackSending] = useState(false)
  const [feedbackSent, setFeedbackSent] = useState(false)
  const [showWelcomeToast, setShowWelcomeToast] = useState(false)

  // Onboarding gate
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingLoaded, setOnboardingLoaded] = useState(false)
  const [onboardingUserId, setOnboardingUserId] = useState<string | null>(null)

  useEffect(() => {
    if (pathname === '/part-time/stripe-return') {
      setOnboardingLoaded(true)
      return
    }
    async function checkOnboarding() {
      try {
        const meRes = await fetch('/api/auth/me')
        if (!meRes.ok) return
        const { user, repOnboardingEnabled } = await meRes.json()
        if (user.role === 'ADMIN') { setOnboardingLoaded(true); return }
        setOnboardingUserId(user.id)
        if (repOnboardingEnabled !== false && !user.onboardingComplete) {
          setShowOnboarding(true)
        }
      } catch { /* ignore */ }
      finally { setOnboardingLoaded(true) }
    }
    checkOnboarding()
  }, [pathname])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (response.ok) {
        const data = await response.json()
        router.push(data.redirectUrl)
      }
    } catch (error) {
      console.error('Logout failed:', error)
      setIsLoggingOut(false)
    }
  }

  const handleSubmitFeedback = async () => {
    if (!feedbackMessage.trim()) return
    setFeedbackSending(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: feedbackMessage, category: feedbackCategory }),
      })
      if (res.ok) {
        setFeedbackSent(true)
        setFeedbackMessage('')
        setTimeout(() => { setFeedbackSent(false); setFeedbackOpen(false) }, 2000)
      }
    } catch { /* ignore */ }
    finally { setFeedbackSending(false) }
  }

  const isDialerPage = pathname === '/part-time/dialer'

  const navItems = [
    { href: '/part-time', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    { href: '/part-time/dialer', icon: Phone, label: 'Dialer' },
    { href: '/part-time/earnings', icon: DollarSign, label: 'Earnings' },
    { href: '/part-time/tasks', icon: Target, label: 'Tasks' },
  ]

  if (!onboardingLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-3" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (showOnboarding && onboardingUserId) {
    return (
      <RepOnboardingWizard
        userId={onboardingUserId}
        onComplete={() => { setShowOnboarding(false); setShowWelcomeToast(true); router.refresh(); setTimeout(() => setShowWelcomeToast(false), 5000) }}
      />
    )
  }

  return (
    <div className="flex h-screen" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f0fdfa 40%, #ecfdf5 70%, #f0f9ff 100%)' }}>
      {/* Sidebar — hidden on dialer page for full-screen experience */}
      {!isDialerPage && <aside className="w-[280px] gradient-dark-teal text-white hidden md:flex flex-col shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-mesh-dark pointer-events-none" />

        <div className="relative z-10 px-6 py-7 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 gradient-primary rounded-2xl flex items-center justify-center shadow-teal">
              <span className="text-white font-bold text-lg tracking-tight">B</span>
            </div>
            <div>
              <h1 className="text-[17px] font-bold text-white tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Bright Automations
              </h1>
              <p className="text-[11px] text-teal-300/80 font-medium tracking-wide uppercase mt-0.5">Part-Time Rep Portal</p>
            </div>
          </div>
        </div>

        <nav className="relative z-10 flex-1 px-4 py-5 space-y-1">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 text-[13px] font-semibold rounded-xl transition-all duration-200 group
                  ${isActive
                    ? 'bg-white/[0.12] text-white shadow-lg shadow-white/[0.04] border border-white/[0.08]'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                  }`}
              >
                <item.icon size={19} className={`transition-colors ${isActive ? 'text-teal-300' : 'text-slate-500 group-hover:text-teal-400'}`} />
                {item.label}
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-teal-400" />
                )}
              </Link>
            )
          })}
        </nav>

        <div className="relative z-10 px-4 pb-5 space-y-1">
          <div className="border-t border-white/[0.06] mb-3" />
          <button
            onClick={() => { setFeedbackOpen(true); setFeedbackSent(false) }}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-[13px] font-medium text-slate-400 rounded-xl hover:text-white hover:bg-white/[0.06] transition-all duration-200"
          >
            <MessageCircle size={17} />
            Feedback
          </button>
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-[13px] font-medium text-slate-400 rounded-xl hover:text-red-300 hover:bg-red-500/[0.08] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoggingOut ? <Loader2 size={17} className="animate-spin" /> : <LogOut size={17} />}
            {isLoggingOut ? 'Signing out...' : 'Sign Out'}
          </button>
        </div>
      </aside>}

      {/* Main Content */}
      <main className={`flex-1 overflow-auto ${isDialerPage ? '' : 'pb-20 md:pb-0'}`}>
        <DialerProvider>
          {children}
        </DialerProvider>
      </main>

      {/* Mobile Bottom Nav — hidden on dialer page */}
      {!isDialerPage && <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white border-t border-gray-200 shadow-lg">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                  isActive ? 'text-teal-600' : 'text-gray-400'
                }`}
              >
                <item.icon size={20} />
                <span className="text-[10px] font-semibold">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>}

      {/* Feedback Dialog */}
      {feedbackOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setFeedbackOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="gradient-primary px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Send Feedback</h3>
              <button onClick={() => setFeedbackOpen(false)} className="text-white/70 hover:text-white transition-colors rounded-lg p-1 hover:bg-white/10">
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              {feedbackSent ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={32} className="text-emerald-600" />
                  </div>
                  <p className="text-lg font-bold text-gray-900">Thanks for your feedback!</p>
                  <p className="text-sm text-gray-500 mt-1">We&apos;ll review it shortly.</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-500 mb-5">
                    Have a question, suggestion, or issue? Let us know and we&apos;ll get back to you.
                  </p>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1.5">Category</label>
                      <select
                        value={feedbackCategory}
                        onChange={(e) => setFeedbackCategory(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                      >
                        <option value="general">General</option>
                        <option value="bug">Bug Report</option>
                        <option value="feature">Feature Request</option>
                        <option value="help">Need Help</option>
                        <option value="leads">Lead Quality</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1.5">Message</label>
                      <textarea
                        value={feedbackMessage}
                        onChange={(e) => setFeedbackMessage(e.target.value)}
                        placeholder="Type your feedback here..."
                        className="w-full h-32 px-4 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50/50 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <button
                      onClick={handleSubmitFeedback}
                      disabled={feedbackSending || !feedbackMessage.trim()}
                      className="w-full py-3 gradient-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-teal transition-all duration-200"
                    >
                      <Send size={16} />
                      {feedbackSending ? 'Sending...' : 'Send Feedback'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Welcome Toast */}
      {showWelcomeToast && (
        <div className="fixed top-6 right-6 z-50 animate-fade-in">
          <div className="bg-white border border-green-200 rounded-xl shadow-lg p-4 flex items-center gap-3 max-w-sm">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle size={20} className="text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">You&apos;re all set!</p>
              <p className="text-gray-500 text-xs">Your leads are ready. Start dialing!</p>
            </div>
            <button onClick={() => setShowWelcomeToast(false)} className="text-gray-400 hover:text-gray-600 ml-2">
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
