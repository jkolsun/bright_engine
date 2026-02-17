'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function PartTimeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [feedbackCategory, setFeedbackCategory] = useState('general')
  const [feedbackSending, setFeedbackSending] = useState(false)
  const [feedbackSent, setFeedbackSent] = useState(false)

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

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Sidebar */}
      <aside className="w-72 gradient-dark text-white hidden md:flex flex-col shadow-large border-r border-slate-700/50">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-medium">
              <span className="text-white font-bold text-lg">B</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Bright Automations</h1>
              <p className="text-xs text-blue-300">Part-Time Rep Portal</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <NavLink href="/part-time" icon={<LayoutDashboard size={20} />}>
            Dashboard
          </NavLink>
          <NavLink href="/part-time/dialer" icon={<Phone size={20} />}>
            Dialer
          </NavLink>
          <NavLink href="/part-time/earnings" icon={<DollarSign size={20} />}>
            Earnings
          </NavLink>
          <NavLink href="/part-time/tasks" icon={<Target size={20} />}>
            Tasks
          </NavLink>
          <NavLink href="/part-time/leaderboard" icon={<Award size={20} />}>
            Leaderboard
          </NavLink>
        </nav>

        <div className="p-4 border-t border-slate-700 space-y-1">
          <button
            onClick={() => { setFeedbackOpen(true); setFeedbackSent(false) }}
            className="flex items-center gap-2 text-sm text-slate-300 hover:text-white w-full transition-colors px-3 py-2 rounded-lg hover:bg-slate-700/50"
          >
            <MessageCircle size={18} />
            Feedback
          </button>
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-2 text-sm text-slate-300 hover:text-white w-full transition-colors px-3 py-2 rounded-lg hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogOut size={18} />
            {isLoggingOut ? 'Signing out...' : 'Sign Out'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>

      {/* Feedback Dialog */}
      {feedbackOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setFeedbackOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Send Feedback</h3>
              <button onClick={() => setFeedbackOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {feedbackSent ? (
              <div className="text-center py-8">
                <CheckCircle size={48} className="text-green-500 mx-auto mb-3" />
                <p className="text-lg font-medium text-gray-900">Thanks for your feedback!</p>
                <p className="text-sm text-gray-500 mt-1">We&apos;ll review it shortly.</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-500 mb-4">
                  Have a question, suggestion, or issue? Let us know and we&apos;ll get back to you.
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Category</label>
                    <select
                      value={feedbackCategory}
                      onChange={(e) => setFeedbackCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="general">General</option>
                      <option value="bug">Bug Report</option>
                      <option value="feature">Feature Request</option>
                      <option value="help">Need Help</option>
                      <option value="leads">Lead Quality</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Message</label>
                    <textarea
                      value={feedbackMessage}
                      onChange={(e) => setFeedbackMessage(e.target.value)}
                      placeholder="Type your feedback here..."
                      className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <button
                    onClick={handleSubmitFeedback}
                    disabled={feedbackSending || !feedbackMessage.trim()}
                    className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Send size={16} />
                    {feedbackSending ? 'Sending...' : 'Send Feedback'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function NavLink({
  href,
  icon,
  children
}: {
  href: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-300 rounded-lg hover:bg-slate-700/50 hover:text-white transition-all duration-200"
    >
      {icon}
      {children}
    </Link>
  )
}
