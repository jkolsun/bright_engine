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
import { PanelLeftOpen } from 'lucide-react'

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
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <InboundCallBanner />
      <AutoDialBanner />
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Queue Panel — collapsible */}
        {queueCollapsed ? (
          <div className="w-11 flex-shrink-0 border-r border-gray-200 bg-gray-50 flex flex-col items-center pt-3">
            <button
              onClick={toggleQueue}
              className="p-2 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
              title="Open queue"
            >
              <PanelLeftOpen className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="w-[20%] min-w-[260px] flex-shrink-0 border-r border-gray-200 overflow-y-auto bg-gray-50">
            <QueuePanel onCollapse={toggleQueue} />
          </div>
        )}
        {/* Center: Lead Card */}
        <div className="flex-1 overflow-y-auto">
          <LeadCard />
        </div>
        {/* Right: Call Guide (28%) */}
        <div className="w-[28%] min-w-[280px] flex-shrink-0 border-l border-gray-200 overflow-y-auto bg-gray-50">
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
        <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Power Dialer</h2>
        <p className="text-gray-500 mb-8">Start a dialing session to begin making calls.</p>
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
  return <DialerContent />
}
