'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Phone,
  SkipForward,
  CheckCircle,
  MessageSquare,
  Copy,
  Edit3,
  Save,
  PhoneForwarded,
  PhoneMissed,
  Target,
  AlertCircle,
  ArrowLeft,
  Globe,
  Star,
  MapPin,
  Building,
  Mail,
  ExternalLink,
  ChevronLeft,
  Eye,
  Zap,
  Send,
  Mic,
  MicOff,
  PhoneCall,
  Flame,
  CreditCard,
  Thermometer,
  Clock,
  MousePointerClick,
  RotateCcw,
  PhoneOff,
} from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'

// ============================================
// TYPES
// ============================================
interface DialerCoreProps {
  portalType: 'FULL' | 'PART_TIME'
  basePath: string // '/reps' or '/part-time'
}

// ============================================
// VM SCRIPTS — Multiple variants for variety
// ============================================
const VM_SCRIPTS_BAD_WEBSITE = [
  `Hey {{firstName}}, this is [REP] with Bright Automations. I looked at {{companyName}}'s current website and I actually went ahead and built you a brand new one. Texting you the link right now — check it out. If you like it we can have it live today. Talk soon.`,
  `Hey {{firstName}}, [REP] here from Bright Automations. I pulled up your site for {{companyName}} and honestly, it's not cutting it on mobile. So I already built a modern version for you — texting it over now so you can see the difference. Give me a call back when you get a sec.`,
  `{{firstName}}, this is [REP] with Bright Automations. I took a look at {{companyName}}'s website and built you a brand new one. Sending you the link right now — take a look and text me back if you want it live.`,
  `Hey {{firstName}}, it's [REP] from Bright Automations. I checked out your current website for {{companyName}} and already built a new one for you. Shooting you a text with the link. Take a look and call me back if you like it.`,
]

const VM_SCRIPTS_NO_WEBSITE = [
  `Hey {{firstName}}, this is [REP] with Bright Automations. I searched for {{industry}} in {{city}} and couldn't find a website for {{companyName}}. So I built one for you — texting you the link right now. If you like it we can have it live today. Talk soon.`,
  `{{firstName}}, [REP] here from Bright Automations. I was looking up {{industry}} businesses in {{city}} and couldn't find a site for {{companyName}}. So I already built one. Texting you the link right now — check it out and let me know what you think.`,
  `Hey {{firstName}}, it's [REP] with Bright Automations. I tried to find {{companyName}} online but you don't have a website yet. So I built one for you — sending it to your phone now. Would love to hear what you think. Call me back!`,
  `{{firstName}}, this is [REP] from Bright Automations. Customers are searching for {{industry}} in {{city}} every day and can't find {{companyName}} online. I already built you a website ��� texting it over now. Take 30 seconds to look at it.`,
]

const VM_SCRIPTS_CALLBACK = [
  `Hey {{firstName}}, it's [REP] with Bright Automations calling back like I said I would. Give me a ring when you get this — I still have that preview ready for {{companyName}}. Talk soon.`,
  `{{firstName}}, [REP] from Bright Automations following up. We chatted the other day about a website for {{companyName}} — just wanted to check in. Call me back when you get a chance.`,
]

const VM_SCRIPTS_RE_ENGAGE = [
  `Hey {{firstName}}, this is [REP] with Bright Automations. We spoke a while back about a site for {{companyName}}. We've got some new designs I think you'd like — texting you a fresh preview now. Let me know!`,
  `{{firstName}}, [REP] here from Bright Automations. It's been a bit since we connected. I put together an updated preview for {{companyName}} — sending it over now. Would love to hear your thoughts.`,
]

// ============================================
// CALL SCRIPTS — Multiple variants
// ============================================
const CALL_SCRIPTS = [
  `OPENER:
"Hey {{firstName}}, this is [YOUR NAME] with Bright Automations. Real quick — I actually already put together a new website for {{companyName}}. Want me to text you the link so you can see it while we talk?"

[SEND PREVIEW NOW — press P or tap button]

WAIT FOR THEM TO OPEN IT (10-15 sec)

ON-CALL WALKTHROUGH:
"You see it? That's a full site — your services, your reviews, everything's already on there. How's it look?"

LET THEM REACT

IF POSITIVE:
"Want it live? I can have it up today. It's $149 to go live and $39/month after the first month to keep it running."

[SEND PAYMENT LINK — press $ or tap button]

IF QUESTIONS:
"What would you want different?" (note the edit, we can change it before go-live)

IF NOT INTERESTED:
"No worries — the preview stays up if you change your mind. Have a good one."

OBJECTIONS:
"Already have a site" → "Pull yours up next to this one. Which one would you call?"
"Too expensive" → "It's less than one service call. And you're not paying monthly for the first 30 days."
"Need to think about it" → "The preview link stays active. Take a look later and text us when you're ready."
"Can you change [X]?" → "Absolutely. We'll update that before it goes live. Want to lock it in?"`,

  `OPENER:
"Hey {{firstName}}, [YOUR NAME] from Bright Automations. Real quick — have you ever Googled {{companyName}}? I did, and I actually already built you a new website. Let me text it to you right now."

[SEND PREVIEW NOW — press P]

WAIT FOR OPEN (10-15 sec)
"Did the text come through? Pull it up — I'll wait."

WALKTHROUGH:
"See that? Mobile-friendly, your services listed, shows up on Google. What do you think?"

CLOSE:
"If you like what you see, it's $149 to go live. I can send the payment link right now."

OBJECTIONS:
"I get referrals" → "Imagine if those referrals Googled you and saw THIS."
"Send me info" → "Even better — I just sent you the actual site. Check your texts."
"Not interested" → "Totally fair. The link stays active if you change your mind."`,

  `OPENER:
"Hey {{firstName}}, this is [YOUR NAME] with Bright Automations. I was doing some research on {{industry}} in {{location}} and came across {{companyName}} — looks like you guys do great work. I actually already built a new website for you. Want me to text you the link?"

[SEND PREVIEW NOW — press P]

WAIT & PROMPT:
"Pull it up on your phone — takes 10 seconds."

WALKTHROUGH:
"See the homepage? That's {{companyName}} — professional, fast, mobile-friendly. Scroll down and you'll see your reviews featured."

CLOSE:
"If you want it live, it's $149. No contracts. I can send the payment link right now."

OBJECTIONS:
"I'm busy" → "Takes 10 seconds to look. I'll wait."
"How much?" → "$149 one-time, $39/month after the first month. Look at the preview first."
"I'll think about it" → "The preview isn't going anywhere — take a look tonight and text us."`,

  `OPENER:
"Hey {{firstName}}, [YOUR NAME] from Bright Automations. We've been building websites for {{industry}} businesses in {{location}} and I already built one for {{companyName}}. Got 30 seconds to check it out? Let me text you the link."

[SEND PREVIEW NOW — press P]

WAIT & PROMPT:
"Check your messages — I just sent it. Pull it up while we talk."

WALKTHROUGH:
"That's your site — custom for {{companyName}}. Clean, works on phones, shows up on Google. What do you think?"

CLOSE:
"Want it live? $149, up in 48 hours. I can send the payment link right now."

OBJECTIONS:
"Sounds too good to be true" → "That's why I sent the preview first — you see exactly what you're getting."
"Need to talk to my partner" → "I'll text you the preview so you can both look at it together."
"Call me next week" → "The preview stays up. Take a look and text us when you're ready."`,
]

// ============================================
// LEAD TEMPERATURE — Compute client-side from events data
// ============================================
function computeLeadTemperature(lead: any): { level: 'HOT' | 'WARM' | 'COLD', signals: string[] } {
  if (!lead) return { level: 'COLD', signals: [] }
  const signals: string[] = []
  let score = 0

  // Check events for engagement
  const events = lead.events || []
  const previewViews = events.filter((e: any) => e.eventType === 'PREVIEW_VIEWED').length
  const ctaClicks = events.filter((e: any) => e.eventType === 'PREVIEW_CTA_CLICKED').length
  const callClicks = events.filter((e: any) => e.eventType === 'PREVIEW_CALL_CLICKED').length
  const returnVisits = events.filter((e: any) => e.eventType === 'PREVIEW_RETURN_VISIT').length
  const emailOpens = events.filter((e: any) => e.eventType === 'EMAIL_OPENED').length
  const emailReplies = events.filter((e: any) => e.eventType === 'EMAIL_REPLIED').length

  if (callClicks > 0) { score += 40; signals.push(`Clicked "Call" on preview`) }
  if (ctaClicks > 0) { score += 30; signals.push(`Clicked CTA ${ctaClicks}x`) }
  if (returnVisits > 0) { score += 25; signals.push(`${returnVisits} return visit${returnVisits > 1 ? 's' : ''}`) }
  if (previewViews > 0) { score += 15; signals.push(`Viewed preview ${previewViews}x`) }
  if (emailReplies > 0) { score += 30; signals.push(`Replied to email`) }
  if (emailOpens > 0) { score += 10; signals.push(`Opened ${emailOpens} email${emailOpens > 1 ? 's' : ''}`) }

  // Check preview duration from metadata
  const previewEvents = events.filter((e: any) => e.eventType === 'PREVIEW_VIEWED' && e.metadata)
  for (const pe of previewEvents) {
    try {
      const meta = typeof pe.metadata === 'string' ? JSON.parse(pe.metadata) : pe.metadata
      if (meta?.duration && meta.duration > 60) {
        score += 15
        const mins = Math.floor(meta.duration / 60)
        const secs = meta.duration % 60
        signals.push(`Spent ${mins}:${secs.toString().padStart(2, '0')} on preview`)
        break
      }
    } catch { /* ignore parse errors */ }
  }

  // Check recency
  if (events.length > 0) {
    const lastEvent = events[0] // sorted desc
    const hoursSince = (Date.now() - new Date(lastEvent.createdAt).getTime()) / (1000 * 60 * 60)
    if (hoursSince < 2) { score += 20; signals.push(`Active ${Math.round(hoursSince * 60)}min ago`) }
    else if (hoursSince < 24) { score += 10; signals.push(`Active ${Math.round(hoursSince)}h ago`) }
  }

  // Instantly status
  if (lead.replySentiment === 'positive') { score += 25; signals.push('Positive email reply') }

  const level = score >= 50 ? 'HOT' : score >= 20 ? 'WARM' : 'COLD'
  return { level, signals }
}

function getTemperatureBadge(level: 'HOT' | 'WARM' | 'COLD') {
  switch (level) {
    case 'HOT': return { emoji: '🔴', text: 'HOT', className: 'bg-red-100 text-red-700 border-red-200' }
    case 'WARM': return { emoji: '🟠', text: 'WARM', className: 'bg-orange-100 text-orange-700 border-orange-200' }
    case 'COLD': return { emoji: '⚪', text: 'COLD', className: 'bg-gray-100 text-gray-600 border-gray-200' }
  }
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function DialerCore({ portalType, basePath }: DialerCoreProps) {
  const isPartTime = portalType === 'PART_TIME'

  // Queue & navigation
  const [queue, setQueue] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState('')

  // Dialer mode & session
  const [dialerMode, setDialerMode] = useState<'power' | 'single' | 'manual'>(isPartTime ? 'single' : 'power')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionActive, setSessionActive] = useState(false)
  const [linesPerDial, setLinesPerDial] = useState(3)

  // Call state
  const [callActive, setCallActive] = useState(false)
  const [callPhase, setCallPhase] = useState<'idle' | 'dialing' | 'connected' | 'on_hold'>('idle')
  const [activeCallId, setActiveCallId] = useState<string | null>(null)
  const [parallelLines, setParallelLines] = useState<any[]>([])
  const [callTimer, setCallTimer] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Call duration estimation (for part-time — track time between start and outcome)
  const [callStartTime, setCallStartTime] = useState<number | null>(null)

  // UI state
  const [callNotes, setCallNotes] = useState('')
  const [copiedPreview, setCopiedPreview] = useState(false)
  const [copiedPayLink, setCopiedPayLink] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [sessionStats, setSessionStats] = useState({ dials: 0, conversations: 0, previewLinksSent: 0, closes: 0 })
  const [showCallbackDialog, setShowCallbackDialog] = useState(false)
  const [callbackDate, setCallbackDate] = useState('')
  const [callbackTime, setCallbackTime] = useState('')
  const [showNoteDialog, setShowNoteDialog] = useState(false)
  const [noteText, setNoteText] = useState('')

  // AI Handoff
  const [aiHandoffSent, setAiHandoffSent] = useState(false)

  // Lead history
  const [leadHistory, setLeadHistory] = useState<any[]>([])

  // Edit lead
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editForm, setEditForm] = useState<any>({})
  const [saving, setSaving] = useState(false)

  // Preview dialog
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
  const [previewMethod, setPreviewMethod] = useState<'sms' | 'email'>('sms')
  const [previewMessage, setPreviewMessage] = useState('')

  // Preview status polling (during active call)
  const [previewStatus, setPreviewStatus] = useState<{
    sent: boolean; opened: boolean; viewDurationSeconds: number; ctaClicked: boolean; lastEventAt: Date | null
  }>({ sent: false, opened: false, viewDurationSeconds: 0, ctaClicked: false, lastEventAt: null })
  const [previewSentThisCall, setPreviewSentThisCall] = useState(false)
  const previewPollRef = useRef<NodeJS.Timeout | null>(null)

  const currentLead = queue[currentIndex] || null

  // Compute lead temperature from events already in queue data
  const temperature = computeLeadTemperature(currentLead)
  const tempBadge = getTemperatureBadge(temperature.level)

  // ============================================
  // LOAD QUEUE (Smart priority ordering)
  // ============================================
  useEffect(() => { loadQueue() }, [])

  const loadQueue = async () => {
    try {
      const meRes = await fetch('/api/auth/me')
      const meData = await meRes.json()
      setUserId(meData.user.id)
      setUserName(meData.user.name || 'Rep')

      // Use smart priority queue
      const queueRes = await fetch('/api/dialer/queue')
      if (queueRes.ok) {
        const data = await queueRes.json()
        setQueue(data.leads || [])
      }

      // Load today's stats
      const statsRes = await fetch('/api/activity')
      if (statsRes.ok) {
        const data = await statsRes.json()
        setSessionStats(data.stats)
      }
    } catch (e) {
      console.error('Failed to load queue:', e)
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // LOAD LEAD HISTORY (when current lead changes)
  // ============================================
  useEffect(() => {
    if (currentLead?.id) {
      loadLeadHistory(currentLead.id)
      setAiHandoffSent(false)
    }
  }, [currentLead?.id])

  const loadLeadHistory = async (leadId: string) => {
    try {
      const res = await fetch(`/api/dialer/queue?history=${leadId}`)
      if (res.ok) {
        const data = await res.json()
        setLeadHistory(data.history || [])
      }
    } catch (e) {
      console.error('Failed to load history:', e)
    }
  }

  // ============================================
  // CALL TIMER
  // ============================================
  useEffect(() => {
    if (callPhase === 'connected' || callPhase === 'on_hold') {
      timerRef.current = setInterval(() => {
        setCallTimer(prev => prev + 1)
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
      setCallTimer(0)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [callPhase])

  // ============================================
  // PREVIEW STATUS POLLING — every 5 sec during active call
  // ============================================
  useEffect(() => {
    if ((callPhase === 'connected' || callPhase === 'on_hold') && currentLead?.id) {
      const poll = async () => {
        try {
          const res = await fetch(`/api/dialer/preview-status?leadId=${currentLead.id}`)
          if (res.ok) {
            const data = await res.json()
            setPreviewStatus(data)
          }
        } catch { /* ignore polling errors */ }
      }
      poll()
      previewPollRef.current = setInterval(poll, 5000)
    } else {
      if (previewPollRef.current) clearInterval(previewPollRef.current)
      setPreviewStatus({ sent: false, opened: false, viewDurationSeconds: 0, ctaClicked: false, lastEventAt: null })
      setPreviewSentThisCall(false)
    }
    return () => { if (previewPollRef.current) clearInterval(previewPollRef.current) }
  }, [callPhase, currentLead?.id])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  // ============================================
  // KEYBOARD SHORTCUTS
  // ============================================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!callActive || processing) return
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

      switch (e.key) {
        case '1': e.preventDefault(); handleOutcome(previewStatus.opened ? 'interested_saw_preview' : 'interested_no_preview'); break
        case '2': e.preventDefault(); handleOutcome('not_interested'); break
        case '3': e.preventDefault(); setShowCallbackDialog(true); break
        case '4': e.preventDefault(); handleOutcome('callback_reviewing'); break
        case '5': e.preventDefault(); handleOutcome('payment_link_sent'); break
        case '6': e.preventDefault(); handleOutcome('closed_paid'); break
        case '7': e.preventDefault(); handleOutcome('wants_changes'); break
        case '8': e.preventDefault(); handleOutcome('wrong_number'); break
        case '9': e.preventDefault(); handleOutcome('dnc'); break
        case 'p': case 'P': e.preventDefault(); if (currentLead?.previewUrl) { openPreviewDialog('sms'); setPreviewSentThisCall(true) }; break
        case 't': case 'T': e.preventDefault(); handleAutoText(); break
        case 'n': case 'N': e.preventDefault(); setShowNoteDialog(true); break
        case 'a': case 'A': e.preventDefault(); handleAIHandoff(); break
        case 'h': case 'H': e.preventDefault(); handleHold(); break
        case 'x': case 'X': e.preventDefault(); handleHangup(); break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [callActive, processing, currentLead, previewStatus.opened, aiHandoffSent])

  // ============================================
  // DIALING ACTIONS
  // ============================================
  const handleStartSession = async () => {
    try {
      const res = await fetch('/api/dialer/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', mode: isPartTime ? 'single' : dialerMode, linesPerDial: isPartTime ? 1 : linesPerDial }),
      })
      if (res.ok) {
        const data = await res.json()
        setSessionId(data.session.id)
        setSessionActive(true)
        handleDial()
      }
    } catch (e) {
      console.error('Failed to start session:', e)
      setSessionActive(true)
      handleDial()
    }
  }

  const handleDial = async () => {
    if (!currentLead || processing) return

    setCallActive(true)
    setCallPhase('dialing')
    setCallNotes('')
    setCallStartTime(Date.now()) // Track when call started for duration estimation

    const leadsToDialCount = (!isPartTime && dialerMode === 'power') ? Math.min(linesPerDial, queue.length - currentIndex) : 1
    const leadIds = queue.slice(currentIndex, currentIndex + leadsToDialCount).map((l: any) => l.id)

    // For part-time: open native phone dialer via tel: link
    if (isPartTime) {
      window.open(`tel:${currentLead.phone}`)
    } else {
      // Initiate dial via API (Twilio)
      try {
        const res = await fetch('/api/dialer/dial', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leadIds, sessionId }),
        })

        if (res.ok) {
          const data = await res.json()
          setParallelLines(data.calls || [])
          setActiveCallId(data.calls?.[0]?.callId || null)

          if (!data.configured) {
            window.open(`tel:${currentLead.phone}`)
          }
        }
      } catch (e) {
        console.error('Dial failed:', e)
        window.open(`tel:${currentLead.phone}`)
      }
    }

    // Update parallel line display
    const lines = leadIds.map((id: string, idx: number) => ({
      leadId: id,
      lineNumber: idx + 1,
      lead: queue.find((l: any) => l.id === id),
      status: 'ringing',
    }))
    setParallelLines(lines)
  }

  const handleConnect = () => {
    setCallPhase('connected')
    setParallelLines(prev => prev.map((line, idx) =>
      idx === 0
        ? { ...line, status: 'connected' }
        : { ...line, status: 'dropped' }
    ))
  }

  const handleHold = async () => {
    if (callPhase === 'on_hold') {
      setCallPhase('connected')
      if (activeCallId) {
        fetch('/api/dialer/hold', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callId: activeCallId, action: 'resume' }),
        }).catch(() => {})
      }
    } else if (callPhase === 'connected') {
      setCallPhase('on_hold')
      if (activeCallId) {
        fetch('/api/dialer/hold', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callId: activeCallId, action: 'hold' }),
        }).catch(() => {})
      }
    }
  }

  const handleHangup = async (callId?: string) => {
    const idToHangup = callId || activeCallId
    if (idToHangup) {
      fetch('/api/dialer/hangup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId: idToHangup }),
      }).catch(() => {})
    }
    // If hanging up a specific parallel line, mark it as dropped
    if (callId && callId !== activeCallId) {
      setParallelLines(prev => prev.map(line =>
        line.callId === callId ? { ...line, status: 'dropped' } : line
      ))
    } else {
      // Hanging up the active call — reset to idle so rep can log outcome
      setCallPhase('idle')
      setCallActive(false)
      setParallelLines([])
      setCallStartTime(null)
    }
  }

  // ============================================
  // OUTCOME HANDLING
  // ============================================
  const handleOutcome = async (outcome: string) => {
    if (!currentLead || processing) return
    setProcessing(true)

    const notes = callNotes || undefined
    // Use call timer if available, otherwise estimate from callStartTime
    const duration = callTimer > 0 ? callTimer :
      (callStartTime ? Math.round((Date.now() - callStartTime) / 1000) : 0)

    // Log via API
    if (activeCallId) {
      try {
        await fetch('/api/dialer/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callId: activeCallId,
            outcome,
            notes,
            durationSeconds: duration,
          }),
        })
      } catch (e) {
        console.error('Failed to log outcome:', e)
      }
    }

    // Log as Activity
    try {
      const dispositionMap: Record<string, string> = {
        interested: 'INTERESTED', interested_saw_preview: 'INTERESTED', interested_no_preview: 'INTERESTED',
        not_interested: 'NOT_INTERESTED',
        callback: 'CALLBACK', callback_reviewing: 'CALLBACK',
        no_answer: 'NO_ANSWER',
        voicemail_left: 'VOICEMAIL', voicemail_skipped: 'VOICEMAIL', voicemail_preview_sent: 'VOICEMAIL',
        wrong_number: 'WRONG_NUMBER', dnc: 'NOT_INTERESTED',
        payment_link_sent: 'INTERESTED', closed_paid: 'INTERESTED', wants_changes: 'INTERESTED',
      }
      const vmOutcomes = ['voicemail_left', 'voicemail_skipped', 'voicemail_preview_sent']

      await fetch('/api/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: currentLead.id,
          activityType: vmOutcomes.includes(outcome) ? 'VOICEMAIL' : 'CALL',
          callDisposition: dispositionMap[outcome] || 'NO_ANSWER',
          notes,
          durationSeconds: duration,
        }),
      })
    } catch (e) {
      console.error('Activity log fallback failed:', e)
    }

    // Update lead status
    const statusMap: Record<string, string> = {
      interested: 'QUALIFIED', interested_saw_preview: 'QUALIFIED', interested_no_preview: 'QUALIFIED',
      not_interested: 'CLOSED_LOST', wrong_number: 'CLOSED_LOST', dnc: 'DO_NOT_CONTACT',
      closed_paid: 'PAID', wants_changes: 'CLIENT_REVIEW', payment_link_sent: 'QUALIFIED',
    }
    if (statusMap[outcome]) {
      try {
        await fetch(`/api/leads/${currentLead.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: statusMap[outcome] }),
        })
      } catch { /* non-critical */ }
    }

    // Update session stats
    const conversationOutcomes = [
      'interested', 'interested_saw_preview', 'interested_no_preview',
      'not_interested', 'callback', 'callback_reviewing',
      'payment_link_sent', 'closed_paid', 'wants_changes',
    ]
    const closeOutcomes = ['interested', 'interested_saw_preview', 'closed_paid']
    setSessionStats(prev => ({
      ...prev,
      dials: prev.dials + 1,
      conversations: conversationOutcomes.includes(outcome) ? prev.conversations + 1 : prev.conversations,
      closes: closeOutcomes.includes(outcome) ? prev.closes + 1 : prev.closes,
    }))

    // Reset call state
    setCallActive(false)
    setCallPhase('idle')
    setCallNotes('')
    setActiveCallId(null)
    setParallelLines([])
    setCallStartTime(null)

    // Remove lead from queue for terminal outcomes
    const terminal = ['interested', 'interested_saw_preview', 'interested_no_preview', 'not_interested', 'wrong_number', 'dnc', 'closed_paid']
    if (terminal.includes(outcome)) {
      const newQueue = queue.filter((_: any, i: number) => i !== currentIndex)
      setQueue(newQueue)
      if (currentIndex >= newQueue.length && newQueue.length > 0) {
        setCurrentIndex(newQueue.length - 1)
      }
    } else {
      if (currentIndex < queue.length - 1) {
        setCurrentIndex(currentIndex + 1)
      }
    }

    setProcessing(false)

    // Auto-advance in power dial mode (full-time only)
    if (!isPartTime && dialerMode === 'power' && sessionActive && queue.length > 1) {
      setTimeout(() => {}, 2000)
    }
  }

  const handleCallback = async () => {
    if (!callbackDate || !callbackTime) return
    const dateStr = `${callbackDate}T${callbackTime}:00`

    if (activeCallId) {
      try {
        await fetch('/api/dialer/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callId: activeCallId,
            callbackDate: dateStr,
            notes: callNotes || `Callback scheduled for ${callbackDate} at ${callbackTime}`,
          }),
        })
      } catch (e) { console.error(e) }
    }

    setShowCallbackDialog(false)
    setCallbackDate('')
    setCallbackTime('')
    await handleOutcome('callback')
  }

  const handleAutoText = async () => {
    if (!currentLead?.previewUrl) return

    if (activeCallId) {
      try {
        await fetch('/api/dialer/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callId: activeCallId, outcome: 'voicemail_left', autoText: true }),
        })
      } catch (e) { console.error(e) }
    }

    const message = encodeURIComponent(
      `Hey ${currentLead.firstName}, just left you a voicemail. Here's the preview for ${currentLead.companyName}: ${currentLead.previewUrl}`
    )
    window.open(`sms:${currentLead.phone}?body=${message}`)

    setSessionStats(prev => ({ ...prev, previewLinksSent: prev.previewLinksSent + 1 }))
  }

  const handleAIHandoff = async () => {
    if (!currentLead || aiHandoffSent) return
    setAiHandoffSent(true)

    try {
      const res = await fetch('/api/close-engine/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: currentLead.id,
          entryPoint: 'REP_CLOSE',
          repId: userId,
        }),
      })

      if (!res.ok) {
        setAiHandoffSent(false)
      }
    } catch (e) {
      console.error('AI Handoff failed:', e)
      setAiHandoffSent(false)
    }
  }

  const handleSaveNote = async () => {
    if (!noteText || !currentLead) return
    setCallNotes(prev => prev ? `${prev}\n${noteText}` : noteText)
    setShowNoteDialog(false)
    setNoteText('')
  }

  // ============================================
  // PREVIEW ACTIONS
  // ============================================
  const openPreviewDialog = (method: 'sms' | 'email') => {
    if (!currentLead) return
    setPreviewMethod(method)
    const msg = method === 'sms'
      ? `Hey ${currentLead.firstName}, this is ${userName} with Bright Automations. I already built a new website for ${currentLead.companyName} — check it out: ${currentLead.previewUrl}\n\nIf you like it we can have it live today. Just text me back!`
      : `Hi ${currentLead.firstName},\n\nI already built a new website for ${currentLead.companyName}.\n\n${currentLead.previewUrl}\n\nIt's mobile-friendly, loads fast, and designed specifically for ${currentLead.industry?.toLowerCase().replace(/_/g, ' ')}.\n\nIf you like what you see, reply and we'll get it live for you.\n\nBest,\n${userName}\nBright Automations`
    setPreviewMessage(msg)
    setPreviewDialogOpen(true)
  }

  const handleSendPreview = async () => {
    if (!currentLead?.previewUrl) return
    if (previewMethod === 'sms') {
      window.open(`sms:${currentLead.phone}?body=${encodeURIComponent(previewMessage)}`)
    } else {
      const subject = encodeURIComponent(`Website preview for ${currentLead.companyName}`)
      window.open(`mailto:${currentLead.email || ''}?subject=${subject}&body=${encodeURIComponent(previewMessage)}`)
    }
    await fetch('/api/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId: currentLead.id, activityType: 'PREVIEW_SENT', notes: `Preview sent via ${previewMethod}` }),
    }).catch(() => {})
    setSessionStats(prev => ({ ...prev, previewLinksSent: prev.previewLinksSent + 1 }))
    setPreviewSentThisCall(true)
    setPreviewDialogOpen(false)
  }

  const handleCopyPreview = async () => {
    if (!currentLead?.previewUrl) return
    await navigator.clipboard.writeText(currentLead.previewUrl)
    setCopiedPreview(true)
    setTimeout(() => setCopiedPreview(false), 2000)
  }

  // ============================================
  // SEND PAY LINK
  // ============================================
  const handleCopyPayLink = async () => {
    if (!currentLead) return
    try {
      const res = await fetch(`/api/dialer/pay-link?leadId=${currentLead.id}&product=SITE_BUILD`)
      const data = await res.json()
      if (data.url) {
        const message = `Hey ${currentLead.firstName}, here's the link to get started with your new site for ${currentLead.companyName}: ${data.url}`
        await navigator.clipboard.writeText(message)
        setCopiedPayLink(true)
        setTimeout(() => setCopiedPayLink(false), 2000)
      }
    } catch (e) {
      console.error('Failed to get pay link:', e)
    }
  }

  // Edit lead
  const openEditDialog = () => {
    if (!currentLead) return
    setEditForm({
      firstName: currentLead.firstName || '',
      lastName: currentLead.lastName || '',
      companyName: currentLead.companyName || '',
      phone: currentLead.phone || '',
      email: currentLead.email || '',
      city: currentLead.city || '',
      state: currentLead.state || '',
    })
    setEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!currentLead) return
    setSaving(true)
    try {
      const res = await fetch(`/api/leads/${currentLead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      if (res.ok) {
        const updated = [...queue]
        updated[currentIndex] = { ...currentLead, ...editForm }
        setQueue(updated)
        setEditDialogOpen(false)
      }
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  // Script personalization
  const pickByLead = (arr: string[]) => {
    if (!currentLead?.id || arr.length === 0) return arr[0] || ''
    let hash = 0
    for (let i = 0; i < currentLead.id.length; i++) {
      hash = ((hash << 5) - hash) + currentLead.id.charCodeAt(i)
      hash |= 0
    }
    return arr[Math.abs(hash) % arr.length]
  }

  const personalizeScript = (script: string) => {
    return script
      .replace(/\{\{firstName\}\}/g, currentLead?.firstName || '[Name]')
      .replace(/\{\{companyName\}\}/g, currentLead?.companyName || '[Company]')
      .replace(/\{\{industry\}\}/g, currentLead?.industry?.toLowerCase().replace(/_/g, ' ') || '[industry]')
      .replace(/\{\{location\}\}/g, [currentLead?.city, currentLead?.state].filter(Boolean).join(', ') || '[location]')
      .replace(/\{\{city\}\}/g, currentLead?.city || '[city]')
      .replace(/\[REP\]/g, userName)
      .replace(/\[YOUR NAME\]/g, userName)
  }

  const getScript = () => {
    if (currentLead?.callScript) {
      try {
        const parsed = JSON.parse(currentLead.callScript)
        return `OPENER:\n${parsed.opening}\n\nHOOK:\n${parsed.hook}\n\nDISCOVERY:\n${parsed.discovery}\n\nCLOSE:\n${parsed.closeAttempt}\n\nOBJECTIONS:\n${Object.entries(parsed.objectionHandlers || {}).map(([k, v]) => `"${k}" → "${v}"`).join('\n')}`
      } catch {
        return currentLead.callScript
      }
    }
    return personalizeScript(pickByLead(CALL_SCRIPTS))
  }

  const getVMScript = () => {
    let scripts: string[]
    if (currentLead?.queueCategory === 'overdue_callback' || currentLead?.queueCategory === 'scheduled_callback') {
      scripts = VM_SCRIPTS_CALLBACK
    } else if (currentLead?.queueCategory === 're_engage') {
      scripts = VM_SCRIPTS_RE_ENGAGE
    } else if (currentLead?.website) {
      scripts = VM_SCRIPTS_BAD_WEBSITE
    } else {
      scripts = VM_SCRIPTS_NO_WEBSITE
    }
    return personalizeScript(pickByLead(scripts))
  }

  // ============================================
  // DYNAMIC PREVIEW-AWARE TIP (overrides server-side AI tip during active calls)
  // ============================================
  const getDynamicTip = (): string | null => {
    if (!callActive || callPhase === 'idle' || callPhase === 'dialing') return null
    if (previewStatus.ctaClicked) return 'They clicked the CTA — they want it. Send the payment link NOW.'
    if (previewStatus.opened && previewStatus.viewDurationSeconds >= 30) return `They've been viewing for ${formatTime(previewStatus.viewDurationSeconds)}. They're interested. Ask what they think and close.`
    if (previewStatus.opened && previewStatus.viewDurationSeconds < 30) return 'They just opened it. Walk them through it: "See the homepage? That\'s YOUR business featured."'
    if (previewSentThisCall && !previewStatus.opened) return 'Preview sent but not opened yet. Ask: "Did you get that text? Pull it up on your phone — I\'ll wait."'
    if (!previewSentThisCall && callTimer > 10) return 'Send the preview link NOW. Press [P] or tap TEXT PREVIEW.'
    return null
  }

  // ============================================
  // PREVIEW-AWARE LEAD SUMMARY
  // ============================================
  const getLeadSummary = (): { text: string, color: string } | null => {
    if (!currentLead) return null
    const events = currentLead.events || []
    const previewViews = events.filter((e: any) => e.eventType === 'PREVIEW_VIEWED')
    const ctaClicks = events.filter((e: any) => e.eventType === 'PREVIEW_CTA_CLICKED')
    const returnVisits = events.filter((e: any) => e.eventType === 'PREVIEW_RETURN_VISIT')

    // Get max duration from metadata
    let maxDuration = 0
    for (const pe of previewViews) {
      try {
        const meta = typeof pe.metadata === 'string' ? JSON.parse(pe.metadata) : pe.metadata
        if (meta?.duration && meta.duration > maxDuration) maxDuration = meta.duration
      } catch { /* ignore */ }
    }

    if (previewViews.length > 0 && returnVisits.length > 0) {
      const lastVisit = events[0]
      const hoursAgo = Math.round((Date.now() - new Date(lastVisit.createdAt).getTime()) / (1000 * 60 * 60))
      return { text: `HOT — Viewed preview ${previewViews.length + returnVisits.length}x, last visit ${hoursAgo}h ago. They're thinking about it. Send preview and close.`, color: 'text-red-700 bg-red-100' }
    }
    if (previewViews.length > 0) {
      const mins = Math.floor(maxDuration / 60)
      const secs = maxDuration % 60
      const timeStr = maxDuration > 0 ? `Spent ${mins}:${secs.toString().padStart(2, '0')} on site${ctaClicks.length > 0 ? ', clicked CTA' : ''}.` : ''
      return { text: `PREVIEW VIEWED — ${timeStr} Send preview link and walk them through it on the call.`, color: 'text-purple-700 bg-purple-100' }
    }
    if (previewSentThisCall || currentLead.queueCategory === 'preview_engaged_no_payment') {
      return { text: 'PREVIEW SENT, NOT OPENED — Resend and say "did you get a chance to check out that site I sent over?"', color: 'text-yellow-700 bg-yellow-100' }
    }
    return { text: 'FRESH — No preview sent yet. Lead with the preview immediately.', color: 'text-gray-600 bg-gray-100' }
  }

  // ============================================
  // RENDER
  // ============================================
  if (loading) return (
    <div className="p-8 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary shadow-teal mb-4 animate-pulse">
        <Phone size={28} className="text-white" />
      </div>
      <p className="text-gray-500 font-medium">Loading dialer queue...</p>
    </div>
  )

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1600px] mx-auto">
      {/* Header Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Link href={basePath}>
            <Button variant="ghost" size="sm" className="text-gray-500 hover:text-teal-600 rounded-xl">
              <ChevronLeft size={18} className="mr-1" /> Dashboard
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900 font-[family-name:var(--font-space-grotesk),_'Space_Grotesk',_sans-serif]">
                {isPartTime ? 'Dialer' : 'Power Dialer'}
              </h1>
              {callPhase === 'connected' && (
                <Badge className="bg-red-500 text-white animate-pulse">LIVE {formatTime(callTimer)}</Badge>
              )}
              {callPhase === 'on_hold' && (
                <Badge className="bg-yellow-500 text-white">ON HOLD {formatTime(callTimer)}</Badge>
              )}
              {callPhase === 'dialing' && (
                <Badge className="gradient-primary text-white animate-pulse">DIALING...</Badge>
              )}
            </div>
            <p className="text-sm text-gray-500">
              {sessionActive
                ? `Session: ${sessionStats.dials} dials | ${sessionStats.conversations} conversations | ${sessionStats.closes} closes | ${formatCurrency(sessionStats.closes * 75)} earned`
                : `${queue.length} leads in queue`
              }
            </p>
          </div>
        </div>
        {/* Mode selector — hide for part-time */}
        {!isPartTime && (
          <div className="flex items-center gap-2">
            <div className="flex border rounded-xl overflow-hidden">
              <button
                className={`px-3 py-1.5 text-xs font-medium ${dialerMode === 'power' ? 'gradient-primary text-white' : 'bg-white text-gray-600 hover:bg-teal-50/30'}`}
                onClick={() => setDialerMode('power')}
              >
                <Zap size={12} className="inline mr-1" /> Power ({linesPerDial})
              </button>
              <button
                className={`px-3 py-1.5 text-xs font-medium ${dialerMode === 'single' ? 'bg-[#2E7D8A] text-white' : 'bg-white text-gray-600 hover:bg-teal-50/30'}`}
                onClick={() => setDialerMode('single')}
              >
                <PhoneCall size={12} className="inline mr-1" /> Single
              </button>
            </div>
            {dialerMode === 'power' && (
              <select
                className="text-xs border rounded-xl px-2 py-1.5 bg-white focus:ring-teal-500 focus:ring-2 focus:outline-none"
                value={linesPerDial}
                onChange={(e) => setLinesPerDial(Number(e.target.value))}
              >
                <option value={1}>1 line</option>
                <option value={2}>2 lines</option>
                <option value={3}>3 lines</option>
              </select>
            )}
          </div>
        )}
      </div>

      {/* Session Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniStat icon={<Phone size={16} />} color="teal" label="Dials" value={sessionStats.dials} />
        <MiniStat icon={<PhoneForwarded size={16} />} color="green" label="Connects" value={sessionStats.conversations} />
        <MiniStat icon={<MessageSquare size={16} />} color="purple" label="Previews Sent" value={sessionStats.previewLinksSent} />
        <MiniStat icon={<Target size={16} />} color="amber" label="Interested" value={sessionStats.closes} />
      </div>

      {!currentLead ? (
        <Card className="p-12 text-center rounded-2xl border-0 shadow-medium bg-white/80 backdrop-blur-sm">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl gradient-primary shadow-teal mb-4">
            <CheckCircle size={40} className="text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 font-[family-name:var(--font-space-grotesk),_'Space_Grotesk',_sans-serif]">Queue Complete!</h3>
          <p className="text-gray-600 mt-2">No more leads to call right now.</p>
          <div className="mt-6 p-4 bg-teal-50/50 rounded-2xl inline-block">
            <p className="text-[10px] font-bold uppercase tracking-widest text-teal-600 mb-1">Session Summary</p>
            <p className="text-lg font-semibold text-gray-900">
              {sessionStats.dials} dials / {sessionStats.conversations} connects / {sessionStats.closes} closes
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* LEFT: Lead Info + Actions (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Lead Card */}
            <Card className="p-5 rounded-2xl border-0 shadow-medium bg-white/80 backdrop-blur-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{currentLead.companyName}</h2>
                  <p className="text-gray-600">{currentLead.firstName} {currentLead.lastName}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {/* Lead Temperature Badge */}
                    <Badge variant="outline" className={tempBadge.className}>
                      {tempBadge.emoji} {tempBadge.text}
                    </Badge>
                    {currentLead.queueCategory && (
                      <Badge variant="outline" className={getCategoryBadgeClass(currentLead.queueCategory)}>
                        {getCategoryLabel(currentLead.queueCategory)}
                      </Badge>
                    )}
                    <Badge variant={currentLead.status === 'HOT_LEAD' ? 'destructive' : 'default'}>
                      {currentLead.status}
                    </Badge>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={openEditDialog}>
                  <Edit3 size={14} className="mr-1" /> Edit
                </Button>
              </div>

              {/* Company Summary */}
              <div className="bg-gray-50/70 rounded-xl p-3 mb-3 space-y-1">
                <div className="flex items-center gap-3 text-sm text-gray-700 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Building size={13} className="text-gray-400" />
                    {currentLead.industry?.replace(/_/g, ' ') || 'Unknown'}
                  </span>
                  {(currentLead.city || currentLead.state) && (
                    <span className="flex items-center gap-1">
                      <MapPin size={13} className="text-gray-400" />
                      {[currentLead.city, currentLead.state].filter(Boolean).join(', ')}
                    </span>
                  )}
                  {currentLead.enrichedRating && (
                    <span className="flex items-center gap-1">
                      <Star size={13} className="text-amber-400 fill-amber-400" />
                      {currentLead.enrichedRating}{currentLead.enrichedReviews ? ` (${currentLead.enrichedReviews})` : ''}
                    </span>
                  )}
                </div>
                {currentLead.website && (
                  <a href={currentLead.website.startsWith('http') ? currentLead.website : `https://${currentLead.website}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-teal-600 hover:underline">
                    <Globe size={13} /> {currentLead.website.replace(/^https?:\/\//, '')}
                  </a>
                )}
                {!currentLead.website && (
                  <p className="text-xs text-gray-400">No website — great pitch angle</p>
                )}
              </div>

              {/* Phone — tel: link for part-time */}
              {isPartTime ? (
                <a href={`tel:${currentLead.phone}`} className="block text-2xl font-bold text-teal-600 font-mono mb-3 hover:underline">
                  {currentLead.phone}
                </a>
              ) : (
                <div className="text-2xl font-bold text-teal-600 font-mono mb-3">{currentLead.phone}</div>
              )}

              {/* Action Buttons */}
              {callPhase === 'idle' ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} disabled={currentIndex <= 0}>
                      <ArrowLeft size={16} />
                    </Button>
                    <Button className="flex-1 gradient-primary text-white shadow-teal hover:opacity-90 rounded-xl" onClick={sessionActive ? handleDial : handleStartSession}>
                      {!isPartTime && dialerMode === 'power' ? <Zap size={18} className="mr-2" /> : <Phone size={18} className="mr-2" />}
                      {sessionActive ? 'Dial' : isPartTime ? 'Start Calling' : `Start ${dialerMode === 'power' ? 'Power' : 'Single'} Dial`}
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setCurrentIndex(Math.min(queue.length - 1, currentIndex + 1))} disabled={currentIndex >= queue.length - 1}>
                      <SkipForward size={16} />
                    </Button>
                  </div>
                  <Button
                    onClick={handleAIHandoff}
                    disabled={aiHandoffSent}
                    variant="outline"
                    className="w-full rounded-xl border-[#0D7377] text-[#0D7377] hover:bg-[#0D7377] hover:text-white disabled:opacity-60"
                  >
                    <Zap size={16} className="mr-2" />
                    {aiHandoffSent ? 'Handed to AI Close Engine' : 'Close \u2192 AI Handoff'}
                  </Button>
                </div>
              ) : callPhase === 'dialing' ? (
                <div className="space-y-2">
                  <p className="text-sm text-teal-600 font-medium animate-pulse">
                    {isPartTime ? 'Call in progress...' : 'Ringing...'}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button onClick={handleConnect} className="gradient-primary text-white shadow-teal rounded-xl">
                      <PhoneForwarded size={16} className="mr-1" /> Connected
                    </Button>
                    <Button onClick={() => handleOutcome('no_answer')} variant="outline" className="rounded-xl" disabled={processing}>
                      <PhoneMissed size={16} className="mr-1" /> No Answer
                    </Button>
                    <Button onClick={() => handleOutcome('voicemail_left')} variant="outline" className="rounded-xl" disabled={processing}>
                      <Mic size={16} className="mr-1" /> VM - Left Pitch
                    </Button>
                    <Button onClick={() => handleOutcome('voicemail_skipped')} variant="outline" className="rounded-xl" disabled={processing}>
                      <MicOff size={16} className="mr-1" /> VM - Skip
                    </Button>
                  </div>
                  <Button className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl" onClick={() => handleHangup()}>
                    <PhoneOff size={16} className="mr-1" /> Hang Up
                  </Button>
                </div>
              ) : (
                /* Connected / On Hold — Preview-First Layout */
                <div className="space-y-2">
                  <p className={`text-sm font-medium ${callPhase === 'on_hold' ? 'text-yellow-600' : 'text-green-600'}`}>
                    {callPhase === 'on_hold' ? 'On Hold' : 'Connected'} — {formatTime(callTimer)}
                  </p>

                  {/* Preview Status Indicator */}
                  <div className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-xl ${
                    previewStatus.ctaClicked ? 'bg-green-100 text-green-700' :
                    previewStatus.opened ? 'bg-purple-100 text-purple-700 animate-pulse' :
                    previewSentThisCall ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${
                      previewStatus.ctaClicked ? 'bg-green-500' :
                      previewStatus.opened ? 'bg-purple-500' :
                      previewSentThisCall ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`} />
                    {previewStatus.ctaClicked ? `CTA CLICKED (${formatTime(previewStatus.viewDurationSeconds)})` :
                     previewStatus.opened ? `VIEWING — ${formatTime(previewStatus.viewDurationSeconds)} on page` :
                     previewSentThisCall ? 'SENT — Waiting for open' :
                     'NOT SENT YET'}
                  </div>

                  {/* PRIMARY: Text Preview */}
                  {!previewSentThisCall && currentLead?.previewUrl && (
                    <Button className="w-full bg-[#2E7D8A] hover:bg-[#236571] text-white rounded-xl text-sm font-bold" onClick={() => { openPreviewDialog('sms'); setPreviewSentThisCall(true) }}>
                      <Send size={16} className="mr-2" /> [P] TEXT PREVIEW
                    </Button>
                  )}

                  {/* SECONDARY: Send Pay Link */}
                  {(previewStatus.opened || previewStatus.ctaClicked) && (
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold" onClick={handleCopyPayLink}>
                      <CreditCard size={16} className="mr-2" /> {copiedPayLink ? 'PAY LINK COPIED!' : 'SEND PAY LINK ($149)'}
                    </Button>
                  )}

                  {/* TERTIARY: Copy Link / Add Note */}
                  <div className="flex gap-2">
                    {currentLead?.previewUrl && (
                      <Button size="sm" variant="outline" className="rounded-xl flex-1" onClick={handleCopyPreview}>
                        {copiedPreview ? 'Copied!' : 'Copy Link'}
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="rounded-xl flex-1" onClick={() => setShowNoteDialog(true)}>
                      [N] Note
                    </Button>
                  </div>

                  {/* AI Handoff Button */}
                  <Button
                    onClick={handleAIHandoff}
                    disabled={aiHandoffSent}
                    className="w-full bg-[#0D7377] hover:bg-[#0a5c5f] text-white rounded-xl text-sm font-bold disabled:opacity-60"
                  >
                    <Zap size={16} className="mr-2" />
                    {aiHandoffSent ? 'Handed to AI Close Engine' : '[A] Close \u2192 AI Handoff'}
                  </Button>

                  {/* Outcome logging — keyboard shortcut bar */}
                  <div className="bg-gray-900 rounded-xl p-2.5 text-xs font-mono text-gray-300 grid grid-cols-4 gap-1">
                    <button onClick={() => handleOutcome(previewStatus.opened ? 'interested_saw_preview' : 'interested_no_preview')} className="hover:bg-gray-700 rounded-lg px-1.5 py-1 text-green-400">[1] Interest</button>
                    <button onClick={() => handleOutcome('not_interested')} className="hover:bg-gray-700 rounded-lg px-1.5 py-1 text-red-400">[2] No</button>
                    <button onClick={() => setShowCallbackDialog(true)} className="hover:bg-gray-700 rounded-lg px-1.5 py-1 text-teal-400">[3] Callback</button>
                    <button onClick={() => handleOutcome('callback_reviewing')} className="hover:bg-gray-700 rounded-lg px-1.5 py-1 text-cyan-400">[4] Reviewing</button>
                    <button onClick={() => handleOutcome('payment_link_sent')} className="hover:bg-gray-700 rounded-lg px-1.5 py-1 text-emerald-400">[5] PaySent</button>
                    <button onClick={() => handleOutcome('closed_paid')} className="hover:bg-gray-700 rounded-lg px-1.5 py-1 text-yellow-400 font-bold">[6] PAID</button>
                    <button onClick={() => handleOutcome('wants_changes')} className="hover:bg-gray-700 rounded-lg px-1.5 py-1 text-purple-400">[7] Changes</button>
                    <button onClick={() => handleOutcome('wrong_number')} className="hover:bg-gray-700 rounded-lg px-1.5 py-1 text-orange-400">[8] Wrong#</button>
                    <button onClick={() => handleOutcome('dnc')} className="hover:bg-gray-700 rounded-lg px-1.5 py-1 text-red-500">[9] DNC</button>
                    <button onClick={handleHold} className="hover:bg-gray-700 rounded-lg px-1.5 py-1 text-cyan-400">[H] Hold</button>
                    <button onClick={() => handleHangup()} className="hover:bg-gray-700 rounded-lg px-1.5 py-1 text-red-500 font-bold">[X] Hangup</button>
                  </div>
                </div>
              )}

              {/* Notes during call */}
              {callActive && (
                <div className="mt-3">
                  <textarea
                    value={callNotes}
                    onChange={(e) => setCallNotes(e.target.value)}
                    placeholder="Call notes..."
                    className="w-full h-16 px-3 py-2 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              )}
            </Card>

            {/* Parallel Line Status — hide for part-time */}
            {!isPartTime && parallelLines.length > 1 && (
              <Card className="p-3 rounded-2xl border-0 shadow-medium bg-white/80 backdrop-blur-sm">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Parallel Lines</p>
                {parallelLines.map((line, idx) => (
                  <div key={idx} className="flex items-center gap-2 py-1 text-sm">
                    <span className={`w-2 h-2 rounded-full ${
                      line.status === 'connected' ? 'bg-green-500' :
                      line.status === 'ringing' ? 'bg-teal-500 animate-pulse' :
                      'bg-gray-400'
                    }`} />
                    <span className="font-medium text-gray-700">Line {line.lineNumber}:</span>
                    <span className="text-gray-600 truncate">{line.lead?.firstName} - {line.lead?.companyName}</span>
                    <Badge variant="outline" className="text-xs ml-auto">
                      {line.status === 'connected' ? 'CONNECTED' :
                       line.status === 'ringing' ? 'Ringing...' :
                       line.status === 'dropped' ? 'Dropped' : line.status}
                    </Badge>
                    {line.status !== 'dropped' && (
                      <button
                        onClick={() => handleHangup(line.callId)}
                        className="text-red-500 hover:text-red-700 p-0.5"
                        title="Hang up this line"
                      >
                        <PhoneOff size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </Card>
            )}

            {/* Lead Engagement Summary */}
            {temperature.signals.length > 0 && (
              <Card className="p-4 rounded-2xl border-0 shadow-medium bg-white/80 backdrop-blur-sm">
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Thermometer size={14} className="text-teal-500" /> Lead Engagement
                </h3>
                <div className="space-y-1.5">
                  {temperature.signals.map((signal, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-gray-600">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        temperature.level === 'HOT' ? 'bg-red-400' :
                        temperature.level === 'WARM' ? 'bg-orange-400' : 'bg-gray-400'
                      }`} />
                      {signal}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Preview & Website Actions */}
            <Card className="p-4 space-y-3 rounded-2xl border-0 shadow-medium bg-white/80 backdrop-blur-sm">
              {currentLead.website && (
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Their Website</span>
                  <div className="flex items-center gap-2 mt-1">
                    <a href={currentLead.website.startsWith('http') ? currentLead.website : `https://${currentLead.website}`}
                      target="_blank" rel="noopener noreferrer" className="text-sm text-teal-600 hover:underline truncate flex-1">
                      {currentLead.website.replace(/^https?:\/\//, '')}
                    </a>
                    <Button size="sm" variant="outline" className="rounded-xl" onClick={() => window.open(currentLead.website.startsWith('http') ? currentLead.website : `https://${currentLead.website}`, '_blank')}>
                      <ExternalLink size={14} className="mr-1" /> View
                    </Button>
                  </div>
                </div>
              )}
              {currentLead.previewUrl && (
                <div className={currentLead.website ? 'border-t pt-3' : ''}>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Our Preview</span>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <Button size="sm" variant="outline" className="rounded-xl" onClick={() => window.open(currentLead.previewUrl, '_blank')}>
                      <Eye size={14} className="mr-1" /> View
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-xl" onClick={handleCopyPreview}>
                      {copiedPreview ? <><CheckCircle size={14} className="mr-1 text-green-600" /> Copied!</> : <><Copy size={14} className="mr-1" /> Copy</>}
                    </Button>
                    <Button size="sm" onClick={() => openPreviewDialog('sms')} className="bg-[#2E7D8A] hover:bg-[#236571] text-white rounded-xl">
                      <MessageSquare size={14} className="mr-1" /> Text
                    </Button>
                    <Button size="sm" onClick={() => openPreviewDialog('email')} className="bg-[#4AABB8] hover:bg-[#3a9aa7] text-white rounded-xl">
                      <Mail size={14} className="mr-1" /> Email
                    </Button>
                  </div>
                </div>
              )}
              {/* Send Pay Link */}
              <div className={currentLead.previewUrl || currentLead.website ? 'border-t pt-3' : ''}>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Payment</span>
                <div className="flex items-center gap-2 mt-1.5">
                  <Button size="sm" variant="outline" onClick={handleCopyPayLink}
                    className={`rounded-xl ${copiedPayLink ? 'border-green-300 text-green-600' : ''}`}>
                    {copiedPayLink
                      ? <><CheckCircle size={14} className="mr-1" /> Pay Link Copied!</>
                      : <><CreditCard size={14} className="mr-1" /> Copy Pay Link ($149)</>}
                  </Button>
                </div>
              </div>
            </Card>

            {/* History Panel */}
            <Card className="p-4 rounded-2xl border-0 shadow-medium bg-white/80 backdrop-blur-sm">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">History</h3>
              {leadHistory.length > 0 ? (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {leadHistory.slice(0, 10).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <span>{getHistoryIcon(item.type)}</span>
                      <span className="text-gray-600 flex-1">{item.description}</span>
                      <span className="text-gray-400">{formatRelative(item.timestamp)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">No previous contact history</p>
              )}
            </Card>
          </div>

          {/* RIGHT: Script + AI Tip (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Preview-Aware Lead Summary */}
            {(() => {
              const summary = getLeadSummary()
              if (!summary) return null
              return (
                <div className={`px-3 py-2 rounded-xl text-xs font-semibold ${summary.color}`}>
                  {summary.text}
                </div>
              )
            })()}

            {/* AI Tip — dynamic override during call, fallback to server-side tip */}
            {(() => {
              const dynamicTip = getDynamicTip()
              const tipToShow = dynamicTip || currentLead.aiTip
              if (!tipToShow) return null
              return (
                <Card className={`p-4 rounded-2xl ${dynamicTip ? 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200' : 'bg-gradient-to-r from-teal-50 to-emerald-50 border-teal-200'}`}>
                  <div className="flex items-start gap-2">
                    <Flame size={16} className={`${dynamicTip ? 'text-purple-600' : 'text-teal-600'} mt-0.5 flex-shrink-0`} />
                    <div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${dynamicTip ? 'text-purple-700' : 'text-teal-700'}`}>
                        {dynamicTip ? 'LIVE TIP' : 'AI Tip'}
                      </span>
                      <p className={`text-sm mt-0.5 ${dynamicTip ? 'text-purple-800' : 'text-teal-800'}`}>{tipToShow}</p>
                    </div>
                  </div>
                </Card>
              )
            })()}

            {/* Queue reason */}
            {currentLead.queueReason && (
              <div className="text-xs text-gray-500 px-1">
                Queue position: {currentLead.queueReason}
              </div>
            )}

            {/* Call Script */}
            <Card className="p-5 rounded-2xl border-0 shadow-medium bg-white/80 backdrop-blur-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <AlertCircle size={16} className="text-teal-600" />
                Call Script
              </h3>
              <div className="bg-teal-50/60 p-4 rounded-xl text-sm text-gray-700 whitespace-pre-wrap leading-relaxed max-h-[400px] overflow-y-auto">
                {getScript()}
              </div>
            </Card>

            {/* VM Script (shown during call) */}
            {callActive && (
              <Card className="p-5 rounded-2xl border-0 shadow-medium bg-white/80 backdrop-blur-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Mic size={16} className="text-emerald-600" />
                  Voicemail Script (15 sec)
                </h3>
                <div className="bg-emerald-50 p-4 rounded-xl text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {getVMScript()}
                </div>
                <p className="text-xs text-gray-400 mt-2">After leaving VM, press [T] to auto-text the preview link</p>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* DIALOGS                                      */}
      {/* ============================================ */}

      {/* Callback Dialog */}
      <Dialog open={showCallbackDialog} onOpenChange={setShowCallbackDialog}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Schedule Callback</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1.5">Date</label>
              <Input className="rounded-xl" type="date" value={callbackDate} onChange={(e) => setCallbackDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1.5">Time</label>
              <Input className="rounded-xl" type="time" value={callbackTime} onChange={(e) => setCallbackTime(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setShowCallbackDialog(false)}>Cancel</Button>
            <Button className="rounded-xl gradient-primary text-white border-0" onClick={handleCallback} disabled={!callbackDate || !callbackTime}>Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Note Dialog */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
          </DialogHeader>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Type your note..."
            className="w-full h-24 px-3 py-2 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setShowNoteDialog(false)}>Cancel</Button>
            <Button className="rounded-xl gradient-primary text-white border-0" onClick={handleSaveNote} disabled={!noteText}>Save Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Send Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewMethod === 'sms' ? <><MessageSquare size={18} className="text-teal-600" /> Text Preview</> : <><Mail size={18} className="text-purple-600" /> Email Preview</>}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="font-semibold">To:</span>
              <span>{previewMethod === 'sms' ? currentLead?.phone : currentLead?.email || 'No email'}</span>
            </div>
            <textarea
              value={previewMessage}
              onChange={(e) => setPreviewMessage(e.target.value)}
              className="w-full h-36 px-3 py-2 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setPreviewDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSendPreview}
              className={previewMethod === 'sms' ? 'bg-[#2E7D8A] hover:bg-[#236571] text-white rounded-xl' : 'bg-purple-600 hover:bg-purple-700 text-white rounded-xl'}
              disabled={previewMethod === 'email' && !currentLead?.email}>
              <Send size={14} className="mr-1" /> Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Lead Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit Lead Info</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">First Name</label>
                <Input className="rounded-xl" value={editForm.firstName || ''} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Last Name</label>
                <Input className="rounded-xl" value={editForm.lastName || ''} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Company</label>
              <Input className="rounded-xl" value={editForm.companyName || ''} onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Phone</label>
              <Input className="rounded-xl" value={editForm.phone || ''} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</label>
              <Input className="rounded-xl" value={editForm.email || ''} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">City</label>
                <Input className="rounded-xl" value={editForm.city || ''} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">State</label>
                <Input className="rounded-xl" value={editForm.state || ''} maxLength={2} onChange={(e) => setEditForm({ ...editForm, state: e.target.value.toUpperCase() })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button className="rounded-xl gradient-primary text-white border-0" onClick={handleSaveEdit} disabled={saving}>
              <Save size={16} className="mr-1" /> {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================
// HELPER COMPONENTS & FUNCTIONS
// ============================================

function MiniStat({ icon, color, label, value }: { icon: React.ReactNode, color: string, label: string, value: number }) {
  const bgMap: Record<string, string> = { teal: 'bg-teal-50', green: 'bg-emerald-50', purple: 'bg-purple-50', amber: 'bg-amber-50' }
  const textMap: Record<string, string> = { teal: 'text-teal-600', green: 'text-emerald-600', purple: 'text-purple-600', amber: 'text-amber-600' }

  return (
    <Card className="p-3 flex items-center gap-3 rounded-2xl border-0 shadow-medium bg-white/80 backdrop-blur-sm">
      <div className={`w-8 h-8 rounded-xl ${bgMap[color]} flex items-center justify-center`}>
        <span className={textMap[color]}>{icon}</span>
      </div>
      <div>
        <div className="text-xl font-bold text-gray-900">{value}</div>
        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{label}</div>
      </div>
    </Card>
  )
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    overdue_callback: 'OVERDUE CALLBACK',
    preview_engaged_no_payment: 'PREVIEW ENGAGED',
    hot: 'HOT',
    warm: 'WARM',
    scheduled_callback: 'CALLBACK TODAY',
    fresh: 'FRESH',
    retry: 'RETRY',
    re_engage: 'RE-ENGAGE',
  }
  return labels[category] || category.toUpperCase()
}

function getCategoryBadgeClass(category: string): string {
  const classes: Record<string, string> = {
    overdue_callback: 'bg-red-100 text-red-700 border-red-200',
    preview_engaged_no_payment: 'bg-purple-100 text-purple-700 border-purple-200',
    hot: 'bg-orange-100 text-orange-700 border-orange-200',
    warm: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    scheduled_callback: 'bg-green-100 text-green-700 border-green-200',
    fresh: 'bg-gray-100 text-gray-700 border-gray-200',
    retry: 'bg-blue-100 text-blue-700 border-blue-200',
    re_engage: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  }
  return classes[category] || ''
}

function getHistoryIcon(type: string): string {
  const icons: Record<string, string> = {
    call: '📞',
    email: '📧',
    preview: '🔗',
    text: '💬',
    event: '📋',
    activity: '📝',
  }
  return icons[type] || '•'
}

function formatRelative(timestamp: string | Date): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}
