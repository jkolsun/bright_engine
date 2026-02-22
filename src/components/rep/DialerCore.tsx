'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Phone, SkipForward, CheckCircle, PhoneMissed, PhoneOff,
  ArrowLeft, Globe, MapPin, Building, ExternalLink, Eye,
  Send, Clock, Copy, ChevronDown, ChevronUp, X, Calendar,
  Flame, Thermometer, Ban, PauseCircle, PlayCircle, Volume2,
  MessageSquare, AlertCircle, PhoneCall,
} from 'lucide-react'

// ============================================
// TYPES & CONSTANTS
// ============================================

interface DialerCoreProps {
  portalType: 'FULL' | 'PART_TIME'
  basePath: string
}

interface Lead {
  id: string
  firstName: string
  lastName: string | null
  email: string | null
  phone: string
  companyName: string
  industry: string
  city: string | null
  state: string | null
  website: string | null
  status: string
  priority: string
  previewUrl: string | null
  previewId: string | null
  notes: string | null
  engagementScore: number
  callAttempts: number
  lastCallAt: string | null
  callbackDate: string | null
  queueCategory: string
  queueReason: string
  aiTip?: string
}

interface PreviewStatus {
  sent: boolean
  opened: boolean
  viewDuration: number
  ctaClicked: boolean
}

interface HistoryItem {
  id: string
  eventType: string
  description?: string
  createdAt: string
  metadata?: Record<string, unknown>
}

type CallPhase = 'idle' | 'dialing' | 'connected' | 'on_hold' | 'disposing'
type Disposition = 'interested' | 'callback' | 'not_interested' | 'voicemail' | 'no_answer' | 'bad_number'

const TERMINAL_OUTCOMES = ['interested', 'not_interested', 'bad_number']
const OUTCOME_ICONS: Record<string, { icon: string; color: string }> = {
  interested: { icon: '✓', color: 'text-green-500' },
  callback: { icon: '⏰', color: 'text-blue-500' },
  not_interested: { icon: '✗', color: 'text-gray-400' },
  voicemail_left: { icon: '📞', color: 'text-orange-400' },
  voicemail_no_vm: { icon: '—', color: 'text-orange-300' },
  no_answer: { icon: '—', color: 'text-gray-300' },
  bad_number: { icon: '✗', color: 'text-red-500' },
}

const DEFAULT_SCRIPT: Record<string, string> = {
  opener: `"Hey {{firstName}}, this is [YOUR NAME] with Bright Automations. Real quick — I actually already put together a new website for {{companyName}}. Want me to text you the link so you can see it while we talk?"\n\n[SEND PREVIEW — press P]`,
  hook_bad_website: `"I pulled up your current site and honestly it's not cutting it on mobile. What I built loads fast, looks professional, and has your reviews right on the homepage."`,
  hook_no_website: `"I searched for {{industry}} in {{city}} and couldn't find {{companyName}} online. That means customers can't find you either. I already built you a site — let me text it over."`,
  pitch: `WAIT FOR THEM TO OPEN IT (10-15 sec)\n\n"You see it? That's a full site — your services, your reviews, everything's already on there. How's it look?"\n\nIF POSITIVE:\n"Want it live? I can have it up today. It's $149 to go live and $39/month after the first month."\n\nIF QUESTIONS:\n"What would you want different?" (note the edit)`,
  close: `"Already have a site" → "Pull yours up next to this one. Which one would you call?"\n"Too expensive" → "It's less than one service call. And the first month is included."\n"Need to think" → "Preview link stays active. Take a look later and text us when ready."\n"Can you change [X]?" → "Absolutely. We'll update that before it goes live. Want to lock it in?"`,
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatPhone(phone: string): string {
  if (!phone) return '—'
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  if (digits.length === 11 && digits[0] === '1') return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  return phone
}

function truncatePhone(phone: string): string {
  if (!phone) return '—'
  const digits = phone.replace(/\D/g, '')
  if (digits.length >= 10) return `•••-${digits.slice(-4)}`
  return phone
}

function formatRelative(dateStr: string): string {
  if (!dateStr) return '—'
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function personalizeScript(text: string, lead: Lead | null, repName: string): string {
  if (!lead) return text
  return text
    .replace(/\{\{firstName\}\}/g, lead.firstName || 'there')
    .replace(/\{\{companyName\}\}/g, lead.companyName || 'your company')
    .replace(/\{\{industry\}\}/g, lead.industry || 'your industry')
    .replace(/\{\{city\}\}/g, lead.city || 'your area')
    .replace(/\{\{location\}\}/g, [lead.city, lead.state].filter(Boolean).join(', ') || 'your area')
    .replace(/\[YOUR NAME\]/g, repName || '[YOUR NAME]')
    .replace(/\[REP\]/g, repName || '[REP]')
}

function getTemperature(score: number): { label: string; color: string; bg: string } {
  if (score >= 50) return { label: 'HOT', color: 'text-red-600', bg: 'bg-red-50 border-red-200' }
  if (score >= 20) return { label: 'WARM', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' }
  return { label: 'COLD', color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200' }
}

// ============================================
// SUB-COMPONENTS
// ============================================

function TopBar({
  basePath, isPartTime, dialerMode, setDialerMode,
  callPhase, callTimer, sessionStats, sessionActive,
  onStartSession, onEndSession, onClose,
}: {
  basePath: string
  isPartTime: boolean
  dialerMode: 'power' | 'single'
  setDialerMode: (m: 'power' | 'single') => void
  callPhase: CallPhase
  callTimer: number
  sessionStats: { dials: number; connects: number; previewsSent: number }
  sessionActive: boolean
  onStartSession: () => void
  onEndSession: () => void
  onClose: () => void
}) {
  const statusBadge = () => {
    switch (callPhase) {
      case 'dialing': return <span className="px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold animate-pulse">DIALING...</span>
      case 'connected': return <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">LIVE {formatTime(callTimer)}</span>
      case 'on_hold': return <span className="px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold">ON HOLD {formatTime(callTimer)}</span>
      case 'disposing': return <span className="px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-bold">ENDED {formatTime(callTimer)}</span>
      default: return <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-medium">IDLE</span>
    }
  }

  return (
    <div className="h-14 gradient-primary flex items-center px-4 gap-4 flex-shrink-0 shadow-teal">
      {/* Left */}
      <button onClick={onClose} className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors">
        <ArrowLeft size={16} />
        <span className="hidden sm:inline">Back</span>
      </button>
      <div className="h-5 w-px bg-white/20" />
      <span className="text-sm font-semibold text-white">
        {dialerMode === 'power' ? 'Power Dialer' : 'Single Dial'}
      </span>
      {statusBadge()}

      {/* Center - Session stats */}
      {sessionActive && (
        <div className="flex-1 flex items-center justify-center gap-6">
          <Stat label="Dials" value={sessionStats.dials} />
          <Stat label="Connects" value={sessionStats.connects} />
          <Stat label="Previews" value={sessionStats.previewsSent} />
        </div>
      )}
      {!sessionActive && <div className="flex-1" />}

      {/* Right */}
      <div className="flex items-center gap-3">
        {/* Mode toggle - full-time only */}
        {!isPartTime && (
          <div className="flex bg-white/15 rounded-lg p-0.5">
            <button
              onClick={() => setDialerMode('power')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                dialerMode === 'power' ? 'bg-white text-teal-700 shadow-sm' : 'text-white/70 hover:text-white'
              }`}
            >
              Power
            </button>
            <button
              onClick={() => setDialerMode('single')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                dialerMode === 'single' ? 'bg-white text-teal-700 shadow-sm' : 'text-white/70 hover:text-white'
              }`}
            >
              Single
            </button>
          </div>
        )}

        {/* Session button */}
        {!sessionActive ? (
          <button
            onClick={onStartSession}
            className="px-4 py-1.5 bg-white text-teal-700 text-xs font-bold rounded-lg hover:bg-white/90 transition-colors shadow-sm"
          >
            Start Session
          </button>
        ) : (
          <button
            onClick={onEndSession}
            className="px-4 py-1.5 bg-white/15 text-white text-xs font-semibold rounded-lg hover:bg-white/25 transition-colors"
          >
            End Session
          </button>
        )}

        {/* Close dialer */}
        <button onClick={onClose} className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Close Dialer">
          <X size={18} />
        </button>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="text-lg font-bold text-white">{value}</div>
      <div className="text-[10px] text-white/60 uppercase tracking-wide">{label}</div>
    </div>
  )
}

function QueuePanel({
  queue, currentIndex, queueResults, onSelectLead, dialerMode,
}: {
  queue: Lead[]
  currentIndex: number
  queueResults: Record<string, string>
  onSelectLead: (index: number) => void
  dialerMode: 'power' | 'single'
}) {
  const activeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [currentIndex])

  return (
    <div className="w-1/4 bg-white border-r border-gray-200 flex flex-col overflow-hidden flex-shrink-0">
      <div className="px-4 py-3 border-b border-teal-100 bg-teal-50">
        <span className="text-xs font-semibold text-teal-700 uppercase tracking-wide">
          {queue.length > 0 ? `${currentIndex + 1} of ${queue.length}` : '0'} leads
        </span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {queue.map((lead, i) => {
          const isActive = i === currentIndex
          const result = queueResults[lead.id]
          const outcomeInfo = result ? OUTCOME_ICONS[result] : null

          return (
            <div
              key={lead.id}
              ref={isActive ? activeRef : undefined}
              onClick={() => dialerMode === 'single' && onSelectLead(i)}
              className={`px-4 py-2.5 border-b border-gray-50 transition-colors ${
                isActive
                  ? 'bg-teal-50 border-l-2 border-l-teal-500'
                  : dialerMode === 'single'
                  ? 'hover:bg-gray-50 cursor-pointer'
                  : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {lead.firstName} {lead.lastName || ''}
                  </div>
                  <div className="text-xs text-gray-500 truncate">{lead.companyName}</div>
                  <div className="text-xs text-gray-400">{truncatePhone(lead.phone)}</div>
                </div>
                {outcomeInfo && (
                  <span className={`text-sm font-bold ${outcomeInfo.color}`}>
                    {outcomeInfo.icon}
                  </span>
                )}
              </div>
            </div>
          )
        })}
        {queue.length === 0 && (
          <div className="p-6 text-center text-sm text-gray-400">
            No leads in queue
          </div>
        )}
      </div>
    </div>
  )
}

function LeadProfile({
  lead, leadHistory, previewStatus, previewSentThisCall, previewSending,
  onTextPreview, onCopyPreview, userName,
}: {
  lead: Lead
  leadHistory: HistoryItem[]
  previewStatus: PreviewStatus
  previewSentThisCall: boolean
  previewSending: boolean
  onTextPreview: () => void
  onCopyPreview: () => void
  userName: string
}) {
  const temp = getTemperature(lead.engagementScore || 0)
  const location = [lead.city, lead.state].filter(Boolean).join(', ')
  const prevContacts = leadHistory.filter(h =>
    ['CALL_ATTEMPTED', 'CALL_CONNECTED', 'TEXT_SENT'].includes(h.eventType)
  ).length

  // Preview status display
  const previewStatusText = () => {
    if (previewStatus.ctaClicked) return { text: 'CTA Clicked', color: 'text-green-600 bg-green-50' }
    if (previewStatus.opened) return { text: 'Viewed', color: 'text-teal-600 bg-teal-50' }
    if (previewStatus.sent || previewSentThisCall) return { text: 'Sent', color: 'text-amber-600 bg-amber-50' }
    return { text: 'Not Sent', color: 'text-gray-400 bg-gray-50' }
  }

  return (
    <div className="space-y-4">
      {/* Lead Header */}
      <div>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {lead.firstName} {lead.lastName || ''}
            </h2>
            <p className="text-sm text-gray-600 flex items-center gap-1.5">
              <Building size={14} className="text-gray-400" />
              {lead.companyName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {lead.engagementScore > 0 && (
              <span className={`px-2 py-0.5 text-xs font-bold rounded-full border ${temp.bg} ${temp.color}`}>
                {temp.label === 'HOT' && <Flame size={10} className="inline mr-0.5" />}
                {temp.label === 'WARM' && <Thermometer size={10} className="inline mr-0.5" />}
                {temp.label}
              </span>
            )}
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-teal-50 text-teal-700 border border-teal-200">
              {(lead.status || 'NEW').replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-2 text-sm">
          <a href={`tel:${lead.phone}`} className="text-teal-600 hover:underline flex items-center gap-1">
            <Phone size={13} /> {formatPhone(lead.phone)}
          </a>
          {location && (
            <span className="text-gray-500 flex items-center gap-1">
              <MapPin size={13} /> {location}
            </span>
          )}
          {lead.industry && (
            <span className="text-gray-500">{lead.industry}</span>
          )}
        </div>
      </div>

      {/* Key Info Cards */}
      <div className="grid grid-cols-4 gap-2">
        <InfoCard
          label="Website"
          value={lead.website ? 'Yes' : 'No'}
          extra={lead.website ? (
            <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline text-[10px] truncate block">
              {lead.website.replace(/^https?:\/\//, '')}
            </a>
          ) : undefined}
          icon={<Globe size={14} />}
        />
        <InfoCard label="Calls" value={`${lead.callAttempts || 0}`} icon={<Phone size={14} />} />
        <InfoCard label="Contacts" value={`${prevContacts}`} icon={<MessageSquare size={14} />} />
        <InfoCard
          label="Preview"
          value={previewStatusText().text}
          valueClass={previewStatusText().color}
          icon={<Eye size={14} />}
        />
      </div>

      {/* Preview Section */}
      {lead.previewUrl && (
        <div className="bg-teal-50/50 border border-teal-100 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-teal-800 uppercase tracking-wide">Preview Link</span>
            {previewStatus.opened && (
              <span className="text-[10px] text-green-600 font-medium">
                {previewStatus.viewDuration > 0 && `Viewed ${previewStatus.viewDuration}s`}
                {previewStatus.ctaClicked && ' • CTA Clicked'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={lead.previewUrl}
              className="flex-1 text-xs bg-white border border-teal-200 rounded px-2 py-1.5 text-gray-700 truncate"
            />
            <button
              onClick={onCopyPreview}
              className="p-1.5 text-teal-600 hover:bg-teal-100 rounded transition-colors"
              title="Copy link"
            >
              <Copy size={14} />
            </button>
            <a
              href={lead.previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-teal-600 hover:bg-teal-100 rounded transition-colors"
              title="Open in new tab"
            >
              <ExternalLink size={14} />
            </a>
          </div>
          <button
            onClick={onTextPreview}
            disabled={previewSending || previewSentThisCall}
            className={`mt-2 w-full py-2 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              previewSentThisCall
                ? 'bg-green-100 text-green-700 cursor-default'
                : previewSending
                ? 'bg-teal-100 text-teal-500 cursor-wait'
                : 'gradient-primary text-white hover:opacity-90 shadow-teal'
            }`}
          >
            <Send size={14} />
            {previewSentThisCall ? 'Sent ✓' : previewSending ? 'Sending...' : 'Text Preview'}
            <kbd className="ml-1 text-[10px] opacity-60 bg-white/20 px-1 rounded">P</kbd>
          </button>
        </div>
      )}

      {/* AI Tip */}
      {lead.aiTip && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-800">
          <span className="font-semibold">Tip:</span> {lead.aiTip}
        </div>
      )}
    </div>
  )
}

function InfoCard({ label, value, extra, icon, valueClass }: {
  label: string; value: string; extra?: React.ReactNode; icon: React.ReactNode; valueClass?: string
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-2.5">
      <div className="flex items-center gap-1.5 text-gray-400 mb-1">
        {icon}
        <span className="text-[10px] uppercase tracking-wide font-medium">{label}</span>
      </div>
      <div className={`text-sm font-semibold ${valueClass || 'text-gray-900'}`}>{value}</div>
      {extra}
    </div>
  )
}

function CallScriptPanel({
  script, expanded, setExpanded, lead, userName,
}: {
  script: Record<string, string>
  expanded: boolean
  setExpanded: (v: boolean) => void
  lead: Lead | null
  userName: string
}) {
  const sections = [
    { key: 'opener', label: 'Opener' },
    { key: 'hook_bad_website', label: 'Hook — Bad Website' },
    { key: 'hook_no_website', label: 'Hook — No Website' },
    { key: 'pitch', label: 'Pitch' },
    { key: 'close', label: 'Close / Objections' },
  ]

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-teal-50 hover:bg-teal-100 transition-colors"
      >
        <span className="text-xs font-semibold text-teal-700 uppercase tracking-wide">Call Script</span>
        {expanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
      </button>
      {expanded && (
        <div className="divide-y divide-gray-100">
          {sections.map(({ key, label }) => {
            const content = script[key]
            if (!content) return null
            return (
              <details key={key} className="group">
                <summary className="px-4 py-2 text-xs font-medium text-gray-600 cursor-pointer hover:bg-gray-50 list-none flex items-center justify-between">
                  {label}
                  <ChevronDown size={12} className="text-gray-400 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="px-4 py-2 text-sm text-gray-700 whitespace-pre-wrap bg-white leading-relaxed">
                  {personalizeScript(content, lead, userName)}
                </div>
              </details>
            )
          })}
        </div>
      )}
    </div>
  )
}

function DispositionPanel({
  callPhase, currentLead, processing, callTimer, queueLength, currentIndex,
  onDial, onConnect, onHangup, onHold, onSkip, onDisposition,
  isPartTime, dialerMode, sessionActive, onStartSession,
  // Inline state
  callbackDate, setCallbackDate, callbackTime, setCallbackTime,
  notInterestedReason, setNotInterestedReason, dncChecked, setDncChecked,
  vmSubChoice, setVmSubChoice, previewSentThisCall, onTextPreview,
}: {
  callPhase: CallPhase
  currentLead: Lead | null
  processing: boolean
  callTimer: number
  queueLength: number
  currentIndex: number
  onDial: () => void
  onConnect: () => void
  onHangup: () => void
  onHold: () => void
  onSkip: () => void
  onDisposition: (type: Disposition, extra?: Record<string, unknown>) => void
  isPartTime: boolean
  dialerMode: 'power' | 'single'
  sessionActive: boolean
  onStartSession: () => void
  callbackDate: string
  setCallbackDate: (v: string) => void
  callbackTime: string
  setCallbackTime: (v: string) => void
  notInterestedReason: string
  setNotInterestedReason: (v: string) => void
  dncChecked: boolean
  setDncChecked: (v: boolean) => void
  vmSubChoice: 'left' | 'no_vm' | null
  setVmSubChoice: (v: 'left' | 'no_vm' | null) => void
  previewSentThisCall: boolean
  onTextPreview: () => void
}) {
  const [activeDisposition, setActiveDisposition] = useState<Disposition | null>(null)
  const [showPreviewPrompt, setShowPreviewPrompt] = useState(false)

  // Reset active disposition when call phase changes (but NOT when entering disposing)
  useEffect(() => {
    if (callPhase === 'idle' || callPhase === 'dialing') {
      setActiveDisposition(null)
      setShowPreviewPrompt(false)
    }
  }, [callPhase])

  const handleDispoClick = (type: Disposition) => {
    // For Interested: check if preview was sent
    if (type === 'interested' && !previewSentThisCall && currentLead?.previewUrl) {
      setShowPreviewPrompt(true)
      setActiveDisposition('interested')
      return
    }
    // For types needing inline expansion
    if (['callback', 'not_interested', 'voicemail'].includes(type)) {
      setActiveDisposition(activeDisposition === type ? null : type)
      return
    }
    // One-click dispositions
    onDisposition(type)
  }

  const confirmInterested = (sendPreview: boolean) => {
    if (sendPreview) onTextPreview()
    setShowPreviewPrompt(false)
    onDisposition('interested')
  }

  return (
    <div className="w-1/4 bg-white border-l border-gray-200 flex flex-col overflow-hidden flex-shrink-0">
      <div className="px-4 py-3 border-b border-teal-100 bg-teal-50">
        <span className="text-xs font-semibold text-teal-700 uppercase tracking-wide">Call Controls</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* PRE-CALL / IDLE */}
        {callPhase === 'idle' && (
          <div className="space-y-4 text-center">
            {currentLead && (
              <>
                <div className="py-6">
                  <Phone size={40} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-sm font-medium text-gray-900">{currentLead.firstName} {currentLead.lastName || ''}</p>
                  <p className="text-xs text-gray-500">{formatPhone(currentLead.phone)}</p>
                </div>

                <p className="text-xs text-gray-400">
                  {currentIndex + 1} of {queueLength}
                </p>

                {!sessionActive ? (
                  <button
                    onClick={onStartSession}
                    className="w-full py-3 gradient-primary text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity shadow-teal"
                  >
                    Start Session
                  </button>
                ) : (
                  <button
                    onClick={onDial}
                    disabled={processing}
                    className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold text-sm hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    <Phone size={16} className="inline mr-2" />
                    Dial
                  </button>
                )}

                <button
                  onClick={onSkip}
                  disabled={processing}
                  className="w-full py-2 text-gray-500 text-xs hover:text-gray-700 transition-colors disabled:opacity-50"
                >
                  <SkipForward size={12} className="inline mr-1" /> Skip
                </button>
              </>
            )}
          </div>
        )}

        {/* DIALING */}
        {callPhase === 'dialing' && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="relative mx-auto w-16 h-16 mb-3">
                <PhoneCall size={32} className="absolute inset-0 m-auto text-teal-500 animate-pulse" />
                <div className="absolute inset-0 rounded-full border-2 border-teal-300 animate-ping" />
              </div>
              <p className="text-sm font-bold text-gray-900 animate-pulse">Ringing...</p>
              {currentLead && (
                <>
                  <p className="text-sm text-gray-700 mt-1">{currentLead.firstName} {currentLead.lastName || ''}</p>
                  <p className="text-xs text-gray-500">{formatPhone(currentLead.phone)}</p>
                </>
              )}
              <p className="text-xs text-gray-400 mt-1">{currentIndex + 1} of {queueLength}</p>
            </div>

            {/* Connect button — reps click when someone picks up */}
            <button
              onClick={onConnect}
              className="w-full py-2.5 bg-green-600 text-white rounded-lg font-semibold text-sm hover:bg-green-700 transition-colors"
            >
              <CheckCircle size={14} className="inline mr-1" /> They Answered
            </button>

            {/* Quick dispositions available while ringing */}
            <div className="border-t border-gray-100 pt-3">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-2">No connection?</p>
              <div className="space-y-1.5">
                <button
                  onClick={() => onDisposition('no_answer')}
                  disabled={processing}
                  className="w-full py-2 bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <PhoneMissed size={13} /> No Answer <kbd className="text-[9px] opacity-40 bg-gray-300 px-1 rounded ml-auto">5</kbd>
                </button>
                <button
                  onClick={() => { setActiveDisposition(activeDisposition === 'voicemail' ? null : 'voicemail') }}
                  disabled={processing}
                  className="w-full py-2 bg-orange-100 text-orange-700 rounded-lg text-xs font-semibold hover:bg-orange-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Volume2 size={13} /> Voicemail <kbd className="text-[9px] opacity-40 bg-orange-200 px-1 rounded ml-auto">4</kbd>
                </button>
                {activeDisposition === 'voicemail' && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => { onDisposition('voicemail', { sub: 'left' }); setActiveDisposition(null) }}
                        className="flex-1 py-1.5 bg-orange-500 text-white text-xs font-medium rounded-md hover:bg-orange-600"
                      >
                        Left VM
                      </button>
                      <button
                        onClick={() => { onDisposition('voicemail', { sub: 'no_vm' }); setActiveDisposition(null) }}
                        className="flex-1 py-1.5 bg-orange-300 text-white text-xs font-medium rounded-md hover:bg-orange-400"
                      >
                        No VM
                      </button>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => onDisposition('bad_number')}
                  disabled={processing}
                  className="w-full py-2 bg-red-100 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Ban size={13} /> Bad Number <kbd className="text-[9px] opacity-40 bg-red-200 px-1 rounded ml-auto">6</kbd>
                </button>
              </div>
            </div>

            <button
              onClick={onSkip}
              className="w-full py-2 text-gray-400 text-xs hover:text-gray-600 transition-colors"
            >
              <SkipForward size={12} className="inline mr-1" /> Skip
            </button>
          </div>
        )}

        {/* CONNECTED / ON HOLD / DISPOSING */}
        {(callPhase === 'connected' || callPhase === 'on_hold' || callPhase === 'disposing') && (
          <div className="space-y-4">
            {/* Timer + Status */}
            <div className="text-center py-3">
              <div className={`text-3xl font-mono font-bold ${
                callPhase === 'disposing' ? 'text-orange-600' :
                callPhase === 'on_hold' ? 'text-purple-600' : 'text-green-600'
              }`}>
                {formatTime(callTimer)}
              </div>
              <p className={`text-xs mt-1 font-medium ${
                callPhase === 'disposing' ? 'text-orange-500' : 'text-gray-500'
              }`}>
                {callPhase === 'disposing' ? 'CALL ENDED — LOG OUTCOME' :
                 callPhase === 'on_hold' ? 'ON HOLD' : 'CONNECTED'}
              </p>
            </div>

            {/* Call controls — only show during live call */}
            {callPhase !== 'disposing' && (
              <div className="flex gap-2">
                <button
                  onClick={onHold}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                    callPhase === 'on_hold'
                      ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {callPhase === 'on_hold' ? <PlayCircle size={13} /> : <PauseCircle size={13} />}
                  {callPhase === 'on_hold' ? 'Resume' : 'Hold'}
                  <kbd className="text-[9px] opacity-50 ml-0.5">⎵</kbd>
                </button>
                <button
                  onClick={onHangup}
                  className="flex-1 py-2 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200 transition-colors flex items-center justify-center gap-1"
                >
                  <PhoneOff size={13} /> Hang Up
                  <kbd className="text-[9px] opacity-50 ml-0.5">X</kbd>
                </button>
              </div>
            )}

            {/* Preview prompt */}
            {showPreviewPrompt && (
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 space-y-2">
                <p className="text-xs font-medium text-teal-800">Send preview before logging?</p>
                <div className="flex gap-2">
                  <button onClick={() => confirmInterested(true)} className="flex-1 py-1.5 gradient-primary text-white text-xs rounded-md font-medium">
                    Send & Log
                  </button>
                  <button onClick={() => confirmInterested(false)} className="flex-1 py-1.5 bg-gray-200 text-gray-700 text-xs rounded-md font-medium">
                    Just Log
                  </button>
                </div>
              </div>
            )}

            {/* Disposition Buttons */}
            <div className={callPhase === 'disposing' ? '' : 'border-t border-gray-100 pt-3'}>
              <p className={`text-[10px] uppercase tracking-wide font-semibold mb-2 ${
                callPhase === 'disposing' ? 'text-orange-500' : 'text-gray-400'
              }`}>
                {callPhase === 'disposing' ? 'Select Outcome' : 'Disposition'}
              </p>

              <div className="space-y-1.5">
                {/* 1. Interested */}
                <button
                  onClick={() => handleDispoClick('interested')}
                  disabled={processing}
                  className="w-full py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <CheckCircle size={14} /> Interested
                  <kbd className="text-[10px] opacity-60 bg-white/20 px-1 rounded ml-auto">1</kbd>
                </button>

                {/* 2. Callback */}
                <button
                  onClick={() => handleDispoClick('callback')}
                  disabled={processing}
                  className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                    activeDisposition === 'callback'
                      ? 'bg-blue-700 text-white'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  <Clock size={14} /> Callback
                  <kbd className="text-[10px] opacity-60 bg-white/20 px-1 rounded ml-auto">2</kbd>
                </button>
                {activeDisposition === 'callback' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={callbackDate}
                        onChange={(e) => setCallbackDate(e.target.value)}
                        className="flex-1 text-xs border border-blue-200 rounded px-2 py-1.5 bg-white"
                      />
                      <input
                        type="time"
                        value={callbackTime}
                        onChange={(e) => setCallbackTime(e.target.value)}
                        className="flex-1 text-xs border border-blue-200 rounded px-2 py-1.5 bg-white"
                      />
                    </div>
                    <button
                      onClick={() => {
                        onDisposition('callback', { callbackDate, callbackTime })
                        setActiveDisposition(null)
                      }}
                      disabled={!callbackDate}
                      className="w-full py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Calendar size={12} className="inline mr-1" /> Schedule Callback
                    </button>
                  </div>
                )}

                {/* 3. Not Interested */}
                <button
                  onClick={() => handleDispoClick('not_interested')}
                  disabled={processing}
                  className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                    activeDisposition === 'not_interested'
                      ? 'bg-gray-700 text-white'
                      : 'bg-gray-500 text-white hover:bg-gray-600'
                  }`}
                >
                  <X size={14} /> Not Interested
                  <kbd className="text-[10px] opacity-60 bg-white/20 px-1 rounded ml-auto">3</kbd>
                </button>
                {activeDisposition === 'not_interested' && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
                    <input
                      type="text"
                      placeholder="Reason (optional)"
                      value={notInterestedReason}
                      onChange={(e) => setNotInterestedReason(e.target.value)}
                      className="w-full text-xs border border-gray-300 rounded px-2 py-1.5"
                    />
                    <label className="flex items-center gap-2 text-xs text-gray-600">
                      <input
                        type="checkbox"
                        checked={dncChecked}
                        onChange={(e) => setDncChecked(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      Add to Do Not Contact list
                    </label>
                    <button
                      onClick={() => {
                        onDisposition('not_interested', {
                          reason: notInterestedReason,
                          dnc: dncChecked,
                        })
                        setActiveDisposition(null)
                      }}
                      className="w-full py-1.5 bg-gray-600 text-white text-xs font-medium rounded-md hover:bg-gray-700"
                    >
                      Confirm Not Interested
                    </button>
                  </div>
                )}

                {/* 4. Voicemail */}
                <button
                  onClick={() => handleDispoClick('voicemail')}
                  disabled={processing}
                  className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                    activeDisposition === 'voicemail'
                      ? 'bg-orange-600 text-white'
                      : 'bg-orange-500 text-white hover:bg-orange-600'
                  }`}
                >
                  <Volume2 size={14} /> Voicemail
                  <kbd className="text-[10px] opacity-60 bg-white/20 px-1 rounded ml-auto">4</kbd>
                </button>
                {activeDisposition === 'voicemail' && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          onDisposition('voicemail', { sub: 'left' })
                          setActiveDisposition(null)
                        }}
                        className="flex-1 py-1.5 bg-orange-500 text-white text-xs font-medium rounded-md hover:bg-orange-600"
                      >
                        Left VM
                      </button>
                      <button
                        onClick={() => {
                          onDisposition('voicemail', { sub: 'no_vm' })
                          setActiveDisposition(null)
                        }}
                        className="flex-1 py-1.5 bg-orange-300 text-white text-xs font-medium rounded-md hover:bg-orange-400"
                      >
                        No VM
                      </button>
                    </div>
                    {currentLead?.previewUrl && !previewSentThisCall && (
                      <button
                        onClick={() => {
                          onTextPreview()
                          onDisposition('voicemail', { sub: 'left', autoText: true })
                          setActiveDisposition(null)
                        }}
                        className="w-full py-1.5 gradient-primary text-white text-xs font-medium rounded-md hover:opacity-90"
                      >
                        <Send size={12} className="inline mr-1" /> Left VM + Auto-Text Preview
                      </button>
                    )}
                  </div>
                )}

                {/* 5. No Answer */}
                <button
                  onClick={() => handleDispoClick('no_answer')}
                  disabled={processing}
                  className="w-full py-2.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <PhoneMissed size={14} /> No Answer
                  <kbd className="text-[10px] opacity-40 bg-gray-300 px-1 rounded ml-auto">5</kbd>
                </button>

                {/* 6. Bad Number */}
                <button
                  onClick={() => handleDispoClick('bad_number')}
                  disabled={processing}
                  className="w-full py-2.5 bg-red-100 text-red-700 rounded-lg text-sm font-semibold hover:bg-red-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Ban size={14} /> Bad Number
                  <kbd className="text-[10px] opacity-40 bg-red-200 px-1 rounded ml-auto">6</kbd>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function EndOfSessionScreen({
  sessionStats, basePath, onClose,
}: {
  sessionStats: { dials: number; connects: number; previewsSent: number }
  basePath: string
  onClose: () => void
}) {
  const connectRate = sessionStats.dials > 0
    ? Math.round((sessionStats.connects / sessionStats.dials) * 100)
    : 0

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-md p-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Session Complete</h2>
        <p className="text-gray-500 text-sm mb-6">Great work! Here&apos;s your session summary.</p>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-gray-900">{sessionStats.dials}</div>
            <div className="text-xs text-gray-500">Total Dials</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-gray-900">{sessionStats.connects}</div>
            <div className="text-xs text-gray-500">Connects</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-gray-900">{sessionStats.previewsSent}</div>
            <div className="text-xs text-gray-500">Previews Sent</div>
          </div>
        </div>

        <div className="bg-teal-50 rounded-lg p-3 mb-6">
          <div className="text-xl font-bold text-teal-700">{connectRate}%</div>
          <div className="text-xs text-teal-600">Connect Rate</div>
        </div>

        <div className="flex items-center gap-3 justify-center">
          <button
            onClick={onClose}
            className="px-6 py-3 gradient-primary text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity shadow-teal"
          >
            Back to Dashboard
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-50 transition-colors"
          >
            Load More Leads
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function DialerCore({ portalType, basePath }: DialerCoreProps) {
  const isPartTime = portalType === 'PART_TIME'

  // ----- Full-Screen Toggle -----
  const [dialerActive, setDialerActive] = useState(false)

  // ----- Queue & Identity -----
  const [queue, setQueue] = useState<Lead[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState('')

  // ----- Session & Mode -----
  const [dialerMode, setDialerMode] = useState<'power' | 'single'>(isPartTime ? 'single' : 'power')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionActive, setSessionActive] = useState(false)

  // ----- Call State -----
  const [callPhase, setCallPhase] = useState<CallPhase>('idle')
  const [activeCallId, setActiveCallId] = useState<string | null>(null)
  const [callTimer, setCallTimer] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ----- Stats -----
  const [sessionStats, setSessionStats] = useState({ dials: 0, connects: 0, previewsSent: 0 })

  // ----- UI State -----
  const [callNotes, setCallNotes] = useState('')
  const [processing, setProcessing] = useState(false)
  const [previewSentThisCall, setPreviewSentThisCall] = useState(false)
  const [previewSending, setPreviewSending] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // ----- Disposition Inline State -----
  const [callbackDate, setCallbackDate] = useState('')
  const [callbackTime, setCallbackTime] = useState('')
  const [notInterestedReason, setNotInterestedReason] = useState('')
  const [dncChecked, setDncChecked] = useState(false)
  const [vmSubChoice, setVmSubChoice] = useState<'left' | 'no_vm' | null>(null)

  // ----- Lead History & Script -----
  const [leadHistory, setLeadHistory] = useState<HistoryItem[]>([])
  const [callScript, setCallScript] = useState<Record<string, string>>(DEFAULT_SCRIPT)
  const [scriptExpanded, setScriptExpanded] = useState(false)

  // ----- Preview Status -----
  const [previewStatus, setPreviewStatus] = useState<PreviewStatus>({ sent: false, opened: false, viewDuration: 0, ctaClicked: false })
  const previewPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ----- Queue Result Tracking -----
  const [queueResults, setQueueResults] = useState<Record<string, string>>({})

  // ----- Refs -----
  const notesRef = useRef<HTMLTextAreaElement>(null)
  const handleDialRef = useRef<() => void>(() => {})

  const currentLead = queue[currentIndex] || null

  // ============================================
  // INITIALIZATION
  // ============================================

  const loadQueue = useCallback(async () => {
    try {
      const [authRes, queueRes, activityRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/dialer/queue'),
        fetch('/api/activity'),
      ])

      if (authRes.ok) {
        const authData = await authRes.json()
        setUserId(authData.user?.id || null)
        setUserName(authData.user?.name || '')
      }

      if (queueRes.ok) {
        const queueData = await queueRes.json()
        setQueue(queueData.leads || [])
      }

      if (activityRes.ok) {
        const activityData = await activityRes.json()
        const stats = activityData.stats
        if (stats) {
          setSessionStats({
            dials: stats.dials || 0,
            connects: stats.conversations || 0,
            previewsSent: stats.previewLinksSent || 0,
          })
        }
      }
    } catch (err) {
      console.error('[DialerCore] Failed to load queue:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadLeadHistory = useCallback(async (leadId: string) => {
    try {
      const res = await fetch(`/api/dialer/queue?history=${leadId}`)
      if (res.ok) {
        const data = await res.json()
        setLeadHistory(data.history || [])
      }
    } catch {
      setLeadHistory([])
    }
  }, [])

  const loadCallScript = useCallback(async () => {
    try {
      const res = await fetch('/api/rep-config')
      if (res.ok) {
        const data = await res.json()
        if (data.defaultCallScript && typeof data.defaultCallScript === 'string') {
          // Parse sections from the script string
          const script = parseScriptSections(data.defaultCallScript)
          if (Object.keys(script).length > 0) {
            setCallScript(script)
            return
          }
        }
      }
    } catch {}
    console.warn('[DialerCore] No call script found in settings, using hardcoded default')
    setCallScript(DEFAULT_SCRIPT)
  }, [])

  // Parse a flat script string into sections by keywords
  function parseScriptSections(raw: string): Record<string, string> {
    const sections: Record<string, string> = {}
    const lines = raw.split('\n')
    let currentKey = 'opener'
    let currentLines: string[] = []

    for (const line of lines) {
      const lower = line.toLowerCase().trim()
      let newKey: string | null = null
      if (lower.startsWith('opener')) newKey = 'opener'
      else if (lower.includes('hook') && lower.includes('bad')) newKey = 'hook_bad_website'
      else if (lower.includes('hook') && lower.includes('no website')) newKey = 'hook_no_website'
      else if (lower.startsWith('pitch') || lower.startsWith('walkthrough')) newKey = 'pitch'
      else if (lower.startsWith('close') || lower.startsWith('objection')) newKey = 'close'

      if (newKey && newKey !== currentKey) {
        if (currentLines.length > 0) sections[currentKey] = currentLines.join('\n').trim()
        currentKey = newKey
        currentLines = []
      } else {
        currentLines.push(line)
      }
    }
    if (currentLines.length > 0) sections[currentKey] = currentLines.join('\n').trim()
    return sections
  }

  // Initial load
  useEffect(() => {
    loadQueue()
    loadCallScript()
  }, [loadQueue, loadCallScript])

  // Lead change: load history, reset per-call state
  useEffect(() => {
    if (currentLead?.id) {
      loadLeadHistory(currentLead.id)
      setCallNotes('')
      setPreviewSentThisCall(false)
      setPreviewStatus({ sent: false, opened: false, viewDuration: 0, ctaClicked: false })
      setCallbackDate('')
      setCallbackTime('')
      setNotInterestedReason('')
      setDncChecked(false)
      setVmSubChoice(null)
    }
  }, [currentLead?.id, loadLeadHistory])

  // ============================================
  // CALL TIMER
  // ============================================

  useEffect(() => {
    if (callPhase === 'connected' || callPhase === 'on_hold') {
      timerRef.current = setInterval(() => setCallTimer(t => t + 1), 1000)
    } else if (callPhase === 'disposing') {
      // Keep the timer value frozen (shows call duration) but stop counting
      if (timerRef.current) clearInterval(timerRef.current)
    } else {
      // idle or dialing — reset timer
      setCallTimer(0)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [callPhase])

  // ============================================
  // PREVIEW STATUS POLLING
  // ============================================

  useEffect(() => {
    // Poll preview status whenever we have an active lead on a call (any phase except idle)
    if (callPhase !== 'idle' && currentLead?.id) {
      const poll = async () => {
        try {
          const res = await fetch(`/api/dialer/preview-status?leadId=${currentLead.id}`)
          if (res.ok) {
            const data = await res.json()
            setPreviewStatus(prev => {
              // Show live toast when status changes
              if (data.ctaClicked && !prev.ctaClicked) {
                showToast(`${currentLead.firstName} clicked Get Started!`)
              } else if (data.opened && !prev.opened) {
                showToast(`${currentLead.firstName} is viewing the preview!`)
              }
              return {
                sent: data.sent || prev.sent,
                opened: data.opened || prev.opened,
                viewDuration: data.viewDurationSeconds || prev.viewDuration,
                ctaClicked: data.ctaClicked || prev.ctaClicked,
              }
            })
          }
        } catch { /* silent */ }
      }
      poll()
      previewPollRef.current = setInterval(poll, 5000)
    }
    return () => {
      if (previewPollRef.current) clearInterval(previewPollRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callPhase, currentLead?.id])

  // ============================================
  // TOAST AUTO-DISMISS
  // ============================================

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(t)
    }
  }, [toast])

  // ============================================
  // HANDLERS
  // ============================================

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
  }

  const reloadQueue = async () => {
    try {
      const res = await fetch('/api/dialer/queue')
      if (res.ok) {
        const data = await res.json()
        const newQueue = data.leads || []
        setQueue(newQueue)
        setCurrentIndex(prev => Math.min(prev, Math.max(0, newQueue.length - 1)))
      }
    } catch {
      console.error('[DialerCore] Failed to reload queue')
    }
  }

  const handleStartSession = async () => {
    // VM approval pre-flight check
    try {
      const meRes = await fetch('/api/auth/me')
      if (meRes.ok) {
        const { user } = await meRes.json()
        if (user.outboundVmUrl && !user.outboundVmApproved) {
          showToast('Your outbound voicemail is pending approval. You\'ll be able to dial once Andrew reviews it.', 'error')
          return
        }
      }
    } catch { /* proceed if check fails */ }

    try {
      const res = await fetch('/api/dialer/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', mode: dialerMode }),
      })
      if (res.ok) {
        const data = await res.json()
        setSessionId(data.session?.id || `session-${Date.now()}`)
      } else {
        // API failed but we still want the session to work locally
        setSessionId(`session-${Date.now()}`)
      }
      setSessionActive(true)
      showToast('Session started')
      // Auto-dial first lead in power mode
      if (dialerMode === 'power' && queue.length > 0) {
        setTimeout(() => handleDialRef.current(), 300)
      }
    } catch (err) {
      // Even if the API is down, let the rep start dialing
      setSessionId(`session-${Date.now()}`)
      setSessionActive(true)
      showToast('Session started (offline mode)', 'success')
      if (dialerMode === 'power' && queue.length > 0) {
        setTimeout(() => handleDialRef.current(), 300)
      }
    }
  }

  const handleEndSession = async () => {
    try {
      if (sessionId) {
        await fetch('/api/dialer/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'end', sessionId }),
        })
      }
    } catch { /* silent */ }
    setSessionActive(false)
    setSessionId(null)
    showToast('Session ended')
  }

  const handleDial = useCallback(async () => {
    if (processing || callPhase !== 'idle') return

    // Bug Fix 1: Validate queue sync
    const leadToDial = queue[currentIndex]
    if (!leadToDial || !leadToDial.phone) {
      await reloadQueue()
      return
    }

    setProcessing(true)
    setCallPhase('dialing')
    setActiveCallId(`call-${Date.now()}`)
    setSessionStats(prev => ({ ...prev, dials: prev.dials + 1 }))

    try {
      // Log dial activity
      await fetch('/api/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: leadToDial.id,
          activityType: 'CALL',
          callDisposition: 'ATTEMPTED',
        }),
      })

      if (isPartTime) {
        // Part-time: open native dialer via tel: link
        window.open(`tel:${leadToDial.phone}`, '_self')
      } else {
        // Full-time: initiate via Twilio API
        try {
          const dialRes = await fetch('/api/dialer/dial', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              leadIds: [leadToDial.id],
              sessionId,
            }),
          })
          if (dialRes.ok) {
            const dialData = await dialRes.json()
            if (dialData.callId) setActiveCallId(dialData.callId)
          }
        } catch {
          // Fall back to tel: link if API fails
          window.open(`tel:${leadToDial.phone}`, '_self')
        }
      }
    } catch (err) {
      console.error('[DialerCore] Dial error:', err)
      setCallPhase('idle')
    } finally {
      setProcessing(false)
    }

    // Safety timeout: if still dialing after 45 seconds, reset to idle
    // (prevents rep being stuck on "Ringing..." forever)
    setTimeout(() => {
      setCallPhase(prev => prev === 'dialing' ? 'idle' : prev)
    }, 45000)
  }, [processing, callPhase, queue, currentIndex, isPartTime, sessionId])

  // Keep ref in sync for setTimeout callbacks
  useEffect(() => {
    handleDialRef.current = handleDial
  }, [handleDial])

  const handleConnect = () => {
    setCallPhase('connected')
    setSessionStats(prev => ({ ...prev, connects: prev.connects + 1 }))

    // Log connection activity
    if (currentLead) {
      fetch('/api/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: currentLead.id,
          activityType: 'CALL',
          callDisposition: 'CONNECTED',
        }),
      }).catch(() => {})
    }
  }

  const handleHold = async () => {
    if (callPhase === 'connected') {
      setCallPhase('on_hold')
      try {
        await fetch('/api/dialer/hold', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callId: activeCallId, action: 'hold' }),
        })
      } catch { /* silent */ }
    } else if (callPhase === 'on_hold') {
      setCallPhase('connected')
      try {
        await fetch('/api/dialer/hold', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callId: activeCallId, action: 'resume' }),
        })
      } catch { /* silent */ }
    }
  }

  const handleHangup = async () => {
    if (callPhase === 'idle' || callPhase === 'disposing') return

    try {
      if (activeCallId) {
        await fetch('/api/dialer/hangup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callId: activeCallId }),
        })
      }
    } catch { /* silent */ }

    // If we were dialing (no connection), just go back to idle
    if (callPhase === 'dialing') {
      setCallPhase('idle')
      setActiveCallId(null)
      return
    }

    // If connected/on_hold → transition to disposing phase
    // Timer freezes, disposition buttons appear, call controls hide
    if (callPhase === 'connected' || callPhase === 'on_hold') {
      setCallPhase('disposing')
    }
  }

  const handleSkip = async () => {
    if (processing) return
    setProcessing(true)

    try {
      if (currentLead) {
        await fetch('/api/dialer/skip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leadId: currentLead.id }),
        })
      }

      // Reset call state
      setCallPhase('idle')
      setActiveCallId(null)

      // Advance to next lead
      if (currentIndex < queue.length - 1) {
        setCurrentIndex(prev => prev + 1)
        // Auto-dial next in power mode
        if (dialerMode === 'power' && sessionActive) {
          setTimeout(() => handleDialRef.current(), 500)
        }
      } else {
        showToast('End of queue')
      }
    } catch {
      showToast('Skip failed', 'error')
    } finally {
      setProcessing(false)
    }
  }

  const handleDisposition = async (type: Disposition, extra?: Record<string, unknown>) => {
    if (processing || !currentLead) return
    setProcessing(true)

    const lead = currentLead
    const durationSeconds = callTimer

    // Map to API outcome
    let outcome = type as string
    if (type === 'voicemail') {
      outcome = extra?.sub === 'no_vm' ? 'voicemail_no_vm' : 'voicemail_left'
    }
    if (type === 'not_interested' && extra?.dnc) {
      outcome = 'dnc'
    }

    try {
      // 1. Log outcome via /api/dialer/log (includes notes)
      await fetch('/api/dialer/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callId: activeCallId || `call-${Date.now()}`,
          outcome,
          leadId: lead.id,
          notes: callNotes.trim() || undefined,
          durationSeconds,
          callbackDate: type === 'callback' && extra?.callbackDate
            ? `${extra.callbackDate}T${extra.callbackTime || '09:00'}:00`
            : undefined,
          autoText: extra?.autoText || false,
        }),
      })

      // 2. Persist notes to lead record (Bug Fix 2)
      if (callNotes.trim()) {
        const timestamp = new Date().toLocaleString()
        const noteEntry = `[${timestamp}] ${userName}: ${callNotes.trim()}`
        await fetch(`/api/leads/${lead.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: noteEntry }),
        })

        await fetch('/api/dialer/note', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leadId: lead.id, text: callNotes.trim() }),
        })
      }

      // 3. Update lead status for terminal outcomes
      if (type === 'interested') {
        await fetch(`/api/leads/${lead.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'QUALIFIED' }),
        })
      } else if (type === 'bad_number') {
        await fetch(`/api/leads/${lead.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'CLOSED_LOST' }),
        })
      } else if (type === 'not_interested') {
        await fetch(`/api/leads/${lead.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: extra?.dnc ? 'DO_NOT_CONTACT' : 'CLOSED_LOST' }),
        })
      }

      // 4. Log activity for stats
      const isConversation = ['interested', 'not_interested', 'callback'].includes(type)
      await fetch('/api/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          activityType: 'CALL',
          callDisposition: type === 'interested' ? 'INTERESTED' : type === 'callback' ? 'CALLBACK' : type === 'not_interested' ? 'NOT_INTERESTED' : 'NO_ANSWER',
          durationSeconds,
          notes: callNotes.trim() || undefined,
        }),
      })

      // 5. Schedule callback if needed
      if (type === 'callback' && extra?.callbackDate) {
        await fetch('/api/dialer/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callId: activeCallId || `call-${Date.now()}`,
            callbackDate: `${extra.callbackDate}T${extra.callbackTime || '09:00'}:00`,
            notes: callNotes.trim() || undefined,
          }),
        })
      }

      // 6. Update local state
      setQueueResults(prev => ({ ...prev, [lead.id]: outcome }))

      // connects already incremented by handleConnect() — no double-count needed

      // 7. Queue management
      const isTerminal = TERMINAL_OUTCOMES.includes(type)
      let newQueue: Lead[]
      let newIndex: number

      if (isTerminal) {
        // Remove lead from queue
        newQueue = queue.filter((_, i) => i !== currentIndex)
        // Bug Fix 1: Recalculate index properly
        newIndex = Math.min(currentIndex, Math.max(0, newQueue.length - 1))
      } else {
        // Keep lead in queue, advance to next
        newQueue = [...queue]
        newIndex = currentIndex < queue.length - 1 ? currentIndex + 1 : currentIndex
      }

      setQueue(newQueue)
      setCurrentIndex(newIndex)

      // 8. Reset call state
      setCallPhase('idle')
      setActiveCallId(null)
      setCallNotes('')

      // 9. Auto-advance (Bug Fix 3)
      if (dialerMode === 'power' && sessionActive && newQueue.length > 0 && newIndex < newQueue.length) {
        setTimeout(() => {
          handleDialRef.current()
        }, 500)
      }

    } catch (err) {
      console.error('[DialerCore] Disposition error:', err)
      showToast('Failed to log disposition', 'error')
    } finally {
      setProcessing(false)
    }
  }

  const handleTextPreview = async () => {
    if (!currentLead?.previewUrl || !currentLead?.phone || previewSending) return
    setPreviewSending(true)

    const message = `Hey ${currentLead.firstName || 'there'}, this is ${userName || 'us'} with Bright Automations. I built a new website for ${currentLead.companyName || 'your company'} — check it out: ${currentLead.previewUrl}`

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: currentLead.phone,
          content: message,
          leadId: currentLead.id,
          channel: 'SMS',
          senderType: 'REP',
          senderName: userName,
        }),
      })
      if (res.ok) {
        setPreviewSentThisCall(true)
        setPreviewStatus(prev => ({ ...prev, sent: true }))
        setSessionStats(prev => ({ ...prev, previewsSent: prev.previewsSent + 1 }))

        // Log preview sent activity
        await fetch('/api/activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leadId: currentLead.id,
            activityType: 'PREVIEW_SENT',
          }),
        })

        showToast('Preview sent via SMS')
      } else {
        showToast('Failed to send preview', 'error')
      }
    } catch {
      showToast('Failed to send preview', 'error')
    } finally {
      setPreviewSending(false)
    }
  }

  const handleCopyPreview = () => {
    if (currentLead?.previewUrl) {
      navigator.clipboard.writeText(currentLead.previewUrl)
      showToast('Preview link copied')
    }
  }

  // ============================================
  // KEYBOARD SHORTCUTS
  // ============================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return
      if (processing) return

      const canDispose = callPhase === 'connected' || callPhase === 'on_hold' || callPhase === 'disposing'

      switch (e.key) {
        case '1':
          if (canDispose) { e.preventDefault(); handleDisposition('interested') }
          break
        case '2':
          if (canDispose) { e.preventDefault(); handleDisposition('callback', { callbackDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], callbackTime: '10:00' }) }
          break
        case '3':
          if (canDispose) { e.preventDefault(); handleDisposition('not_interested') }
          break
        case '4':
          if (canDispose) { e.preventDefault(); handleDisposition('voicemail', { sub: 'left' }) }
          break
        case '5':
          if (canDispose) { e.preventDefault(); handleDisposition('no_answer') }
          break
        case '6':
          if (canDispose) { e.preventDefault(); handleDisposition('bad_number') }
          break
        case 'p': case 'P':
          e.preventDefault(); handleTextPreview()
          break
        case 'n': case 'N':
          e.preventDefault(); notesRef.current?.focus()
          break
        case 'x': case 'X':
          e.preventDefault(); handleHangup()
          break
        case ' ':
          if (callPhase === 'connected' || callPhase === 'on_hold') { e.preventDefault(); handleHold() }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callPhase, processing, currentLead])

  // ============================================
  // RENDER
  // ============================================

  // Launch screen — shown inside the normal layout (sidebar visible)
  if (!dialerActive) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-teal">
            <Phone size={36} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Power Dialer
          </h1>
          <p className="text-gray-500 text-sm mb-8">
            Auto-call through your lead queue, log dispositions, and send previews — all in one full-screen workspace.
          </p>
          <button
            onClick={() => setDialerActive(true)}
            className="px-8 py-3.5 gradient-primary text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity shadow-teal inline-flex items-center gap-2"
          >
            <PhoneCall size={18} />
            Launch Dialer
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f0fdfa 40%, #ecfdf5 70%, #f0f9ff 100%)' }}>
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading dialer...</p>
        </div>
      </div>
    )
  }

  // Previous notes from history
  const previousNotes = leadHistory
    .filter(h => h.eventType === 'REP_NOTE' || h.eventType === 'CALL_NOTE' || (h.description && h.eventType?.includes('NOTE')))
    .slice(0, 10)

  const queueEmpty = queue.length === 0

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f0fdfa 40%, #ecfdf5 70%, #f0f9ff 100%)' }}>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-sm font-medium ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Top Bar */}
      <TopBar
        basePath={basePath}
        isPartTime={isPartTime}
        dialerMode={dialerMode}
        setDialerMode={setDialerMode}
        callPhase={callPhase}
        callTimer={callTimer}
        sessionStats={sessionStats}
        sessionActive={sessionActive}
        onStartSession={handleStartSession}
        onEndSession={handleEndSession}
        onClose={() => setDialerActive(false)}
      />

      {/* Main 3-Panel Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Queue */}
        <QueuePanel
          queue={queue}
          currentIndex={currentIndex}
          queueResults={queueResults}
          onSelectLead={(i) => {
            if (callPhase === 'idle') setCurrentIndex(i)
          }}
          dialerMode={dialerMode}
        />

        {/* Center: Active Lead */}
        <div className="w-1/2 overflow-y-auto p-4 space-y-4">
          {queueEmpty ? (
            <EndOfSessionScreen sessionStats={sessionStats} basePath={basePath} onClose={() => setDialerActive(false)} />
          ) : currentLead ? (
            <>
              <LeadProfile
                lead={currentLead}
                leadHistory={leadHistory}
                previewStatus={previewStatus}
                previewSentThisCall={previewSentThisCall}
                previewSending={previewSending}
                onTextPreview={handleTextPreview}
                onCopyPreview={handleCopyPreview}
                userName={userName}
              />

              {/* Call Script */}
              <CallScriptPanel
                script={callScript}
                expanded={scriptExpanded}
                setExpanded={setScriptExpanded}
                lead={currentLead}
                userName={userName}
              />

              {/* Notes Section (always visible) */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-4 py-2.5 bg-teal-50 border-b border-teal-100">
                  <span className="text-xs font-semibold text-teal-700 uppercase tracking-wide">Notes</span>
                  <kbd className="ml-2 text-[10px] text-gray-400 bg-gray-200 px-1 rounded">N</kbd>
                </div>

                {/* Previous notes */}
                {previousNotes.length > 0 && (
                  <div className="px-4 py-2 bg-gray-50/50 border-b border-gray-100 max-h-32 overflow-y-auto">
                    {previousNotes.map((note, i) => (
                      <div key={note.id || i} className="text-xs text-gray-500 py-1 border-b border-gray-50 last:border-0">
                        <span className="text-gray-400">{formatRelative(note.createdAt)}</span>
                        {' — '}
                        {note.description || (note.metadata as any)?.text || 'Note'}
                      </div>
                    ))}
                  </div>
                )}

                {/* Current call notes */}
                <textarea
                  ref={notesRef}
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  placeholder="Type notes during the call..."
                  rows={3}
                  className="w-full px-4 py-3 text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-0 border-0"
                />
              </div>

              {/* Lead history summary */}
              {leadHistory.length > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Recent Activity</span>
                  </div>
                  <div className="divide-y divide-gray-50 max-h-40 overflow-y-auto">
                    {leadHistory.slice(0, 8).map((item, i) => (
                      <div key={item.id || i} className="px-4 py-2 text-xs">
                        <span className="text-gray-400">{formatRelative(item.createdAt)}</span>
                        <span className="mx-1.5 text-gray-300">·</span>
                        <span className="text-gray-600">
                          {(item.eventType || 'ACTIVITY').replace(/_/g, ' ')}
                          {item.description && ` — ${item.description}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              No lead selected
            </div>
          )}
        </div>

        {/* Right: Disposition */}
        <DispositionPanel
          callPhase={callPhase}
          currentLead={currentLead}
          processing={processing}
          callTimer={callTimer}
          queueLength={queue.length}
          currentIndex={currentIndex}
          onDial={handleDial}
          onConnect={handleConnect}
          onHangup={handleHangup}
          onHold={handleHold}
          onSkip={handleSkip}
          onDisposition={handleDisposition}
          isPartTime={isPartTime}
          dialerMode={dialerMode}
          sessionActive={sessionActive}
          onStartSession={handleStartSession}
          callbackDate={callbackDate}
          setCallbackDate={setCallbackDate}
          callbackTime={callbackTime}
          setCallbackTime={setCallbackTime}
          notInterestedReason={notInterestedReason}
          setNotInterestedReason={setNotInterestedReason}
          dncChecked={dncChecked}
          setDncChecked={setDncChecked}
          vmSubChoice={vmSubChoice}
          setVmSubChoice={setVmSubChoice}
          previewSentThisCall={previewSentThisCall}
          onTextPreview={handleTextPreview}
        />
      </div>
    </div>
  )
}
