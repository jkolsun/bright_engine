'use client'
import { useState, useEffect } from 'react'
import { useDialer } from './DialerProvider'
import { QueuePanel } from './QueuePanel'
import { LeadCard } from './LeadCard'
import { CallGuidePanel } from './CallGuidePanel'
import { CallControls } from './CallControls'
import { InboundCallBanner } from './InboundCallBanner'
import { SessionRecap } from './SessionRecap'
import { AutoDialBanner } from './AutoDialBanner'
import { PanelLeftOpen, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

function HotLeadToast() {
  const { hotLeadNotification, dismissHotLeadNotification, queue, dial } = useDialer()
  if (!hotLeadNotification) return null

  const handleCallNow = () => {
    queue.setSelectedLeadId(hotLeadNotification.leadId)
    dismissHotLeadNotification()
  }

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 max-w-sm">
      <div className="bg-orange-50 dark:bg-orange-950/80 border-2 border-orange-400 dark:border-orange-600 rounded-xl p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">🔥</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-orange-900 dark:text-orange-200">
              {hotLeadNotification.companyName} just clicked their preview!
            </p>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={handleCallNow}
                className="px-3 py-1.5 bg-orange-600 text-white text-xs font-semibold rounded-lg hover:bg-orange-700 transition-colors"
              >
                Call Now
              </button>
              <button
                onClick={dismissHotLeadNotification}
                className="px-3 py-1.5 text-orange-600 dark:text-orange-400 text-xs font-medium hover:text-orange-800 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DialerContent() {
  const { session, queue } = useDialer()
  const [queueCollapsed, setQueueCollapsed] = useState(false)

  // Persist collapse preference
  useEffect(() => {
    const saved = localStorage.getItem('dialer-queue-collapsed')
    if (saved === 'true') setQueueCollapsed(true)
  }, [])

  const toggleQueue = () => {
    const next = !queueCollapsed
    setQueueCollapsed(next)
    localStorage.setItem('dialer-queue-collapsed', String(next))
  }

  // Recap mode — session just ended, show summary
  if (session.sessionRecap) {
    return <SessionRecap />
  }

  // No session — show start screen
  if (!session.session) {
    return <SessionStart />
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <InboundCallBanner />
      <AutoDialBanner />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: Queue Panel — collapsible */}
        {queueCollapsed ? (
          <div className="w-11 flex-shrink-0 border-r border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 flex flex-col items-center pt-3">
            <button
              onClick={toggleQueue}
              className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/30 transition-colors"
              title="Open queue"
            >
              <PanelLeftOpen className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="w-[20%] min-w-[260px] flex-shrink-0 border-r border-gray-200 dark:border-slate-700 overflow-y-auto bg-gray-50 dark:bg-slate-800/50">
            <QueuePanel onCollapse={toggleQueue} />
          </div>
        )}
        {/* Center: Lead Card */}
        <div className="flex-1 overflow-y-auto">
          <LeadCard />
        </div>
        {/* Right: Call Guide (28%) */}
        <div className="w-[28%] min-w-[280px] flex-shrink-0 border-l border-gray-200 dark:border-slate-700 overflow-y-auto bg-gray-50 dark:bg-slate-800/50">
          <CallGuidePanel />
        </div>
      </div>
      {/* Bottom: Call Controls */}
      <CallControls />
    </div>
  )
}

function SessionStart() {
  const { session } = useDialer()
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-teal-50 dark:bg-teal-950/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Power Dialer</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8">Start a dialing session to begin making calls.</p>
        <button
          onClick={() => session.startSession(false)}
          disabled={session.loading}
          className="px-8 py-3 gradient-primary text-white rounded-xl font-semibold text-sm hover:opacity-90 shadow-teal disabled:opacity-50"
        >
          {session.loading ? 'Starting...' : 'Start Session'}
        </button>
      </div>
    </div>
  )
}

// Provider is now in the rep/part-time layout — this just renders content
export default function DialerLayout() {
  const pathname = usePathname()
  const backHref = pathname?.startsWith('/part-time') ? '/part-time' : '/reps'

  return (
    <div className="flex flex-col h-screen">
      {/* Back bar */}
      <div className="flex items-center px-4 py-2 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex-shrink-0">
        <Link href={backHref} className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </Link>
      </div>
      <DialerContent />
      <HotLeadToast />
    </div>
  )
}
