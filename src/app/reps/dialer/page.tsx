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
} from 'lucide-react'
import Link from 'next/link'
import { Suspense, useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'

// ============================================
// VM SCRIPTS — Multiple variants for variety
// ============================================
const VM_SCRIPTS_BAD_WEBSITE = [
  `Hey {{firstName}}, this is [REP] with Bright Automations. I was looking at {{companyName}}'s website and put together a quick preview of what a refresh could look like. Texting you the link now — take a look. Talk soon.`,
  `Hey {{firstName}}, [REP] here from Bright Automations. I pulled up your site for {{companyName}} and honestly, it's not showing up great on mobile. I went ahead and mocked up a modern version — texting it over now so you can see the difference. Give me a call back when you get a sec.`,
  `{{firstName}}, this is [REP] with Bright Automations. I took a look at {{companyName}}'s website and noticed it could use an upgrade. Good news — I already put together a preview of what a new one could look like. Sending you the link right now. Let me know what you think!`,
  `Hey {{firstName}}, it's [REP] from Bright Automations. I checked out your current website for {{companyName}} — I think we can do a lot better for you. I actually already built a preview. Shooting you a text with the link. Take a look and call me back if you like it.`,
]

const VM_SCRIPTS_NO_WEBSITE = [
  `Hey {{firstName}}, this is [REP] with Bright Automations. I searched for {{industry}} in {{city}} and found {{companyName}} but no website. I mocked up what one could look like — texting you the preview now. Talk soon.`,
  `{{firstName}}, [REP] here from Bright Automations. I was looking up {{industry}} businesses in {{city}} and couldn't find a site for {{companyName}}. So I went ahead and designed one. Texting you the preview right now — check it out and let me know what you think.`,
  `Hey {{firstName}}, it's [REP] with Bright Automations. I tried to find {{companyName}} online but you don't have a website yet. I put together a professional mock-up — sending it to your phone now. Would love to hear what you think. Call me back!`,
  `{{firstName}}, this is [REP] from Bright Automations. Customers are searching for {{industry}} in {{city}} every day and can't find {{companyName}} online. I built a quick preview of what your site could look like — texting it over. Take 30 seconds to look at it.`,
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
  // Script 1: Standard (original)
  `OPENER (10 sec):
"Hey {{firstName}}, this is [YOUR NAME] with Bright Automations. Not trying to sell you anything crazy — quick question, do you have 30 seconds?"

If no: "When's a better time?"

HOOK — Bad Website (20 sec):
"I pulled up {{companyName}}'s website before I called. Not gonna sugarcoat it — not showing up well on mobile and the design looks dated. Are you getting leads from it?"

HOOK — No Website (20 sec):
"I searched for {{industry}} in {{location}} and couldn't find a site for {{companyName}}. Are you getting most business from referrals?"

PITCH (30 sec):
"Here's why I'm calling. We build professional sites specifically for {{industry}} businesses. Clean, works on phones, shows up on Google. $149, live in 48 hours. And actually — I already mocked up what a site for {{companyName}} would look like. Want me to text you the link so you can see it?"

CLOSE:
"Awesome. I'm texting you the preview right now. Take a look, and if you like it, just text us back and we'll make it live. You don't pay until you're happy with it."

OBJECTIONS:
"Already have a site" → "Are you getting leads from it?"
"Too expensive" → "Check out the preview before you decide."
"Don't need one" → "97% of customers Google before calling."`,

  // Script 2: Curiosity-based
  `OPENER (10 sec):
"Hey {{firstName}}, this is [YOUR NAME] from Bright Automations. Real quick — have you ever Googled your own business?"

If yes: "What came up?" / If no: "You should — I did, and I have some thoughts."

DISCOVERY:
"When someone searches for {{industry}} in {{location}}, your competitors are showing up but {{companyName}} is hard to find. Is that something you've thought about?"

PITCH:
"So here's what we do — we build clean, professional websites for businesses like yours. $149, mobile-friendly, shows up on Google. And I actually already built a preview for {{companyName}} before I called. Want me to send it over so you can take a look?"

CLOSE:
"I'll text it to you right now. No pressure — just take a look. If you like it, text us back and we'll make it live. Zero risk."

OBJECTIONS:
"I get referrals" → "Imagine if those referrals could Google you and see a professional site."
"Send me info" → "Even better �� I'll text you the actual preview so you can see it, not just read about it."
"Not interested" → "Totally fair. Mind if I text you the link anyway? Takes 10 seconds to look at."`,

  // Script 3: Compliment-first
  `OPENER (10 sec):
"Hey {{firstName}}, this is [YOUR NAME] with Bright Automations. I was doing some research on {{industry}} in {{location}} and came across {{companyName}} — looks like you guys do great work."

BRIDGE:
"Quick question though — are you getting new customers from online, or is it mostly word of mouth?"

HOOK — No Website:
"That makes sense, because right now when people search for you online, there's nothing coming up. We actually specialize in building websites for {{industry}} businesses."

HOOK — Has Website:
"I took a look at your site and honestly, I think it could be working harder for you. It's not loading great on mobile and the design is a little outdated."

PITCH:
"Here's the cool part — I already mocked up what a new site would look like for {{companyName}}. Professional, fast, mobile-friendly. Want me to text it over so you can see?"

CLOSE:
"Sending it now. It's $149 to go live, and you don't pay until you're happy with it. Just text us back if you like what you see."

OBJECTIONS:
"I'm busy" → "Totally get it. I'll text the preview — look at it when you have 30 seconds."
"How much?" → "$149 one-time. No contracts, no monthly fees. And you see it before you pay."
"I'll think about it" → "For sure. The preview isn't going anywhere — take a look tonight and text us if you like it."`,

  // Script 4: Social proof
  `OPENER (10 sec):
"Hey {{firstName}}, [YOUR NAME] from Bright Automations. We've been building websites for {{industry}} businesses in {{location}} and I wanted to reach out to {{companyName}}. Got 30 seconds?"

HOOK:
"We just finished a site for another {{industry}} business nearby and they started getting calls from it within the first week. Are you getting leads from online right now?"

PITCH:
"We build professional websites specifically for businesses like yours — mobile-friendly, shows up on Google, $149 flat. I actually already built a mockup for {{companyName}} before I called. Want to see it?"

CLOSE:
"I'll text it right now. Takes 10 seconds to look. If you like it, text us back and we go live in 48 hours. You don't pay until you approve it."

OBJECTIONS:
"Sounds too good to be true" → "I get that. That's why we show you the site before you pay anything."
"I need to talk to my partner" → "Totally — I'll text you the preview so you can both look at it together."
"Call me next week" → "Sure. Mind if I text you the preview now so you have it ready?"`,
]

export default function DialerPageWrapper() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading dialer...</div>}>
      <DialerPage />
    </Suspense>
  )
}

function DialerPage() {
  const searchParams = useSearchParams()
  const initialMode = searchParams.get('mode') || 'power'

  // Queue & navigation
  const [queue, setQueue] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [_userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState('')

  // Dialer mode & session
  const [dialerMode, setDialerMode] = useState<'power' | 'single' | 'manual'>(initialMode as any)
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

  // UI state
  const [callNotes, setCallNotes] = useState('')
  const [copiedPreview, setCopiedPreview] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [sessionStats, setSessionStats] = useState({ dials: 0, conversations: 0, previewLinksSent: 0, closes: 0 })
  const [showCallbackDialog, setShowCallbackDialog] = useState(false)
  const [callbackDate, setCallbackDate] = useState('')
  const [callbackTime, setCallbackTime] = useState('')
  const [showNoteDialog, setShowNoteDialog] = useState(false)
  const [noteText, setNoteText] = useState('')

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

  const currentLead = queue[currentIndex] || null

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
      // Only handle shortcuts when call is active and no dialog/input is focused
      if (!callActive || processing) return
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

      switch (e.key) {
        case '1': e.preventDefault(); handleOutcome('interested'); break
        case '2': e.preventDefault(); handleOutcome('not_interested'); break
        case '3': e.preventDefault(); setShowCallbackDialog(true); break
        case '4': e.preventDefault(); handleOutcome('no_answer'); break
        case '5': e.preventDefault(); handleOutcome('voicemail_left'); break
        case '6': e.preventDefault(); handleOutcome('voicemail_skipped'); break
        case '7': e.preventDefault(); handleOutcome('wrong_number'); break
        case '8': e.preventDefault(); handleOutcome('dnc'); break
        case 't': case 'T': e.preventDefault(); handleAutoText(); break
        case 'n': case 'N': e.preventDefault(); setShowNoteDialog(true); break
        case 'h': case 'H': e.preventDefault(); handleHold(); break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [callActive, processing, currentLead])

  // ============================================
  // DIALING ACTIONS
  // ============================================
  const handleStartSession = async () => {
    try {
      const res = await fetch('/api/dialer/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', mode: dialerMode, linesPerDial }),
      })
      if (res.ok) {
        const data = await res.json()
        setSessionId(data.session.id)
        setSessionActive(true)
        handleDial()
      }
    } catch (e) {
      console.error('Failed to start session:', e)
      // Start anyway even if session tracking fails
      setSessionActive(true)
      handleDial()
    }
  }

  const handleDial = async () => {
    if (!currentLead || processing) return

    setCallActive(true)
    setCallPhase('dialing')
    setCallNotes('')

    const leadsToDialCount = dialerMode === 'power' ? Math.min(linesPerDial, queue.length - currentIndex) : 1
    const leadIds = queue.slice(currentIndex, currentIndex + leadsToDialCount).map((l: any) => l.id)

    // Initiate dial via API
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

        // Simulate connection for now (until Twilio is connected)
        // In production, Twilio webhooks would update call status
        if (!data.configured) {
          // Open native dialer as fallback
          window.open(`tel:${currentLead.phone}`)
        }
      }
    } catch (e) {
      console.error('Dial failed:', e)
      // Fallback to native dialer
      window.open(`tel:${currentLead.phone}`)
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
    // Mark connected line, drop others
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

  // ============================================
  // OUTCOME HANDLING
  // ============================================
  const handleOutcome = async (outcome: string) => {
    if (!currentLead || processing) return
    setProcessing(true)

    const notes = callNotes || undefined
    const duration = callTimer

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

    // Fallback: log as Activity directly
    try {
      const dispositionMap: Record<string, string> = {
        interested: 'INTERESTED',
        not_interested: 'NOT_INTERESTED',
        callback: 'CALLBACK',
        no_answer: 'NO_ANSWER',
        voicemail_left: 'VOICEMAIL',
        voicemail_skipped: 'VOICEMAIL',
        wrong_number: 'WRONG_NUMBER',
        dnc: 'NOT_INTERESTED',
      }

      await fetch('/api/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: currentLead.id,
          activityType: ['voicemail_left', 'voicemail_skipped'].includes(outcome) ? 'VOICEMAIL' : 'CALL',
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
      interested: 'QUALIFIED',
      not_interested: 'CLOSED_LOST',
      wrong_number: 'CLOSED_LOST',
      dnc: 'DO_NOT_CONTACT',
    }
    if (statusMap[outcome]) {
      try {
        await fetch(`/api/leads/${currentLead.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: statusMap[outcome] }),
        })
      } catch (e) { /* non-critical */ }
    }

    // Update session stats
    const isConversation = ['interested', 'not_interested', 'callback'].includes(outcome)
    setSessionStats(prev => ({
      ...prev,
      dials: prev.dials + 1,
      conversations: isConversation ? prev.conversations + 1 : prev.conversations,
      closes: outcome === 'interested' ? prev.closes + 1 : prev.closes,
    }))

    // Reset call state
    setCallActive(false)
    setCallPhase('idle')
    setCallNotes('')
    setActiveCallId(null)
    setParallelLines([])

    // Remove lead from queue for terminal outcomes
    const terminal = ['interested', 'not_interested', 'wrong_number', 'dnc']
    if (terminal.includes(outcome)) {
      const newQueue = queue.filter((_: any, i: number) => i !== currentIndex)
      setQueue(newQueue)
      if (currentIndex >= newQueue.length && newQueue.length > 0) {
        setCurrentIndex(newQueue.length - 1)
      }
    } else {
      // Non-terminal: advance to next
      if (currentIndex < queue.length - 1) {
        setCurrentIndex(currentIndex + 1)
      }
    }

    setProcessing(false)

    // Auto-advance in power dial mode
    if (dialerMode === 'power' && sessionActive && queue.length > 1) {
      setTimeout(() => {
        // Will auto-dial on next render cycle if session is still active
      }, 2000) // Pause between batches
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

    // Also open native SMS as fallback
    const message = encodeURIComponent(
      `Hey ${currentLead.firstName}, just left you a voicemail. Here's the preview for ${currentLead.companyName}: ${currentLead.previewUrl}`
    )
    window.open(`sms:${currentLead.phone}?body=${message}`)

    setSessionStats(prev => ({ ...prev, previewLinksSent: prev.previewLinksSent + 1 }))
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
      ? `Hey ${currentLead.firstName}, this is ${userName} with Bright Automations. I just mocked up a preview of what a new website could look like for ${currentLead.companyName} — take a look: ${currentLead.previewUrl}\n\nIf you like it, just text us back and we'll make it live. You don't pay until you're happy with it!`
      : `Hi ${currentLead.firstName},\n\nI put together a quick preview of what a professional website could look like for ${currentLead.companyName}.\n\n${currentLead.previewUrl}\n\nIt's mobile-friendly, loads fast, and designed specifically for ${currentLead.industry?.toLowerCase().replace(/_/g, ' ')}.\n\nIf you like what you see, reply and we'll get it live for you.\n\nBest,\n${userName}\nBright Automations`
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
    setPreviewDialogOpen(false)
  }

  const handleCopyPreview = async () => {
    if (!currentLead?.previewUrl) return
    await navigator.clipboard.writeText(currentLead.previewUrl)
    setCopiedPreview(true)
    setTimeout(() => setCopiedPreview(false), 2000)
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

  // Script personalization — uses lead ID as seed for consistent-per-lead random pick
  const pickByLead = (arr: string[]) => {
    if (!currentLead?.id || arr.length === 0) return arr[0] || ''
    // Simple hash from lead ID for consistent selection per lead
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
    // Pick VM script based on lead context
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
  // RENDER
  // ============================================
  if (loading) return <div className="p-8 text-center text-gray-500">Loading dialer queue...</div>

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1600px] mx-auto">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/reps">
            <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700">
              <ChevronLeft size={18} className="mr-1" /> Dashboard
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">Power Dialer</h1>
              {callPhase === 'connected' && (
                <Badge className="bg-red-500 text-white animate-pulse">LIVE {formatTime(callTimer)}</Badge>
              )}
              {callPhase === 'on_hold' && (
                <Badge className="bg-yellow-500 text-white">ON HOLD {formatTime(callTimer)}</Badge>
              )}
              {callPhase === 'dialing' && (
                <Badge className="bg-blue-500 text-white animate-pulse">DIALING...</Badge>
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
        <div className="flex items-center gap-2">
          {/* Mode selector */}
          <div className="flex border rounded-lg overflow-hidden">
            <button
              className={`px-3 py-1.5 text-xs font-medium ${dialerMode === 'power' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              onClick={() => setDialerMode('power')}
            >
              <Zap size={12} className="inline mr-1" /> Power ({linesPerDial})
            </button>
            <button
              className={`px-3 py-1.5 text-xs font-medium ${dialerMode === 'single' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              onClick={() => setDialerMode('single')}
            >
              <PhoneCall size={12} className="inline mr-1" /> Single
            </button>
          </div>
          {/* Lines selector (power mode only) */}
          {dialerMode === 'power' && (
            <select
              className="text-xs border rounded-lg px-2 py-1.5 bg-white"
              value={linesPerDial}
              onChange={(e) => setLinesPerDial(Number(e.target.value))}
            >
              <option value={1}>1 line</option>
              <option value={2}>2 lines</option>
              <option value={3}>3 lines</option>
            </select>
          )}
        </div>
      </div>

      {/* Session Stats Bar */}
      <div className="grid grid-cols-4 gap-3">
        <MiniStat icon={<Phone size={16} />} color="blue" label="Dials" value={sessionStats.dials} />
        <MiniStat icon={<PhoneForwarded size={16} />} color="green" label="Connects" value={sessionStats.conversations} />
        <MiniStat icon={<MessageSquare size={16} />} color="purple" label="Previews Sent" value={sessionStats.previewLinksSent} />
        <MiniStat icon={<Target size={16} />} color="amber" label="Interested" value={sessionStats.closes} />
      </div>

      {!currentLead ? (
        <Card className="p-12 text-center">
          <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900">Queue Complete!</h3>
          <p className="text-gray-600 mt-2">No more leads to call right now.</p>
          <div className="mt-6 p-4 bg-gray-50 rounded-lg inline-block">
            <p className="text-sm text-gray-500">Session Summary</p>
            <p className="text-lg font-semibold">
              {sessionStats.dials} dials / {sessionStats.conversations} connects / {sessionStats.closes} closes
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* LEFT: Lead Info + Actions (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Lead Card */}
            <Card className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{currentLead.companyName}</h2>
                  <p className="text-gray-600">{currentLead.firstName} {currentLead.lastName}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
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
              <div className="bg-gray-50 rounded-lg p-3 mb-3 space-y-1">
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
                    className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
                    <Globe size={13} /> {currentLead.website.replace(/^https?:\/\//, '')}
                  </a>
                )}
                {!currentLead.website && (
                  <p className="text-xs text-gray-400">No website — great pitch angle</p>
                )}
              </div>

              {/* Phone */}
              <div className="text-2xl font-bold text-blue-600 font-mono mb-3">{currentLead.phone}</div>

              {/* Action Buttons */}
              {callPhase === 'idle' ? (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} disabled={currentIndex <= 0}>
                    <ArrowLeft size={16} />
                  </Button>
                  <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={sessionActive ? handleDial : handleStartSession}>
                    {dialerMode === 'power' ? <Zap size={18} className="mr-2" /> : <Phone size={18} className="mr-2" />}
                    {sessionActive ? 'Dial' : `Start ${dialerMode === 'power' ? 'Power' : 'Single'} Dial`}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setCurrentIndex(Math.min(queue.length - 1, currentIndex + 1))} disabled={currentIndex >= queue.length - 1}>
                    <SkipForward size={16} />
                  </Button>
                </div>
              ) : callPhase === 'dialing' ? (
                <div className="space-y-2">
                  <p className="text-sm text-blue-600 font-medium animate-pulse">Ringing...</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button onClick={handleConnect} className="bg-green-600 hover:bg-green-700 text-white">
                      <PhoneForwarded size={16} className="mr-1" /> Connected
                    </Button>
                    <Button onClick={() => handleOutcome('no_answer')} variant="outline" disabled={processing}>
                      <PhoneMissed size={16} className="mr-1" /> No Answer
                    </Button>
                    <Button onClick={() => handleOutcome('voicemail_left')} variant="outline" disabled={processing}>
                      <Mic size={16} className="mr-1" /> VM - Left Pitch
                    </Button>
                    <Button onClick={() => handleOutcome('voicemail_skipped')} variant="outline" disabled={processing}>
                      <MicOff size={16} className="mr-1" /> VM - Skip
                    </Button>
                  </div>
                  <Button variant="ghost" size="sm" className="w-full text-gray-500" onClick={() => { setCallActive(false); setCallPhase('idle'); setParallelLines([]) }}>
                    <ArrowLeft size={14} className="mr-1" /> Cancel
                  </Button>
                </div>
              ) : (
                /* Connected / On Hold */
                <div className="space-y-2">
                  <p className={`text-sm font-medium ${callPhase === 'on_hold' ? 'text-yellow-600' : 'text-green-600'}`}>
                    {callPhase === 'on_hold' ? 'On Hold' : 'Connected'} — {formatTime(callTimer)}
                  </p>

                  {/* Keyboard shortcut bar */}
                  <div className="bg-gray-900 rounded-lg p-2.5 text-xs font-mono text-gray-300 grid grid-cols-4 gap-1">
                    <button onClick={() => handleOutcome('interested')} className="hover:bg-gray-700 rounded px-1.5 py-1 text-green-400">[1] Interest</button>
                    <button onClick={() => handleOutcome('not_interested')} className="hover:bg-gray-700 rounded px-1.5 py-1 text-red-400">[2] No</button>
                    <button onClick={() => setShowCallbackDialog(true)} className="hover:bg-gray-700 rounded px-1.5 py-1 text-blue-400">[3] Callback</button>
                    <button onClick={() => handleOutcome('no_answer')} className="hover:bg-gray-700 rounded px-1.5 py-1">[4] NoAns</button>
                    <button onClick={() => handleOutcome('voicemail_left')} className="hover:bg-gray-700 rounded px-1.5 py-1">[5] VM</button>
                    <button onClick={() => handleOutcome('voicemail_skipped')} className="hover:bg-gray-700 rounded px-1.5 py-1">[6] Skip</button>
                    <button onClick={() => handleOutcome('wrong_number')} className="hover:bg-gray-700 rounded px-1.5 py-1 text-orange-400">[7] Wrong#</button>
                    <button onClick={() => handleOutcome('dnc')} className="hover:bg-gray-700 rounded px-1.5 py-1 text-red-500">[8] DNC</button>
                    <button onClick={handleAutoText} className="hover:bg-gray-700 rounded px-1.5 py-1 text-purple-400">[T] Text</button>
                    <button onClick={() => setShowNoteDialog(true)} className="hover:bg-gray-700 rounded px-1.5 py-1 text-yellow-400">[N] Note</button>
                    <button onClick={handleHold} className="hover:bg-gray-700 rounded px-1.5 py-1 text-cyan-400">[H] Hold</button>
                    <button onClick={() => handleOutcome('interested')} className="hover:bg-gray-700 rounded px-1.5 py-1 text-green-500 font-bold">Close</button>
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
                    className="w-full h-16 px-3 py-2 text-sm border border-gray-200 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </Card>

            {/* Parallel Line Status */}
            {parallelLines.length > 1 && (
              <Card className="p-3">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Parallel Lines</p>
                {parallelLines.map((line, idx) => (
                  <div key={idx} className="flex items-center gap-2 py-1 text-sm">
                    <span className={`w-2 h-2 rounded-full ${
                      line.status === 'connected' ? 'bg-green-500' :
                      line.status === 'ringing' ? 'bg-blue-500 animate-pulse' :
                      'bg-gray-400'
                    }`} />
                    <span className="font-medium text-gray-700">Line {line.lineNumber}:</span>
                    <span className="text-gray-600 truncate">{line.lead?.firstName} - {line.lead?.companyName}</span>
                    <Badge variant="outline" className="text-xs ml-auto">
                      {line.status === 'connected' ? 'CONNECTED' :
                       line.status === 'ringing' ? 'Ringing...' :
                       line.status === 'dropped' ? 'Dropped' : line.status}
                    </Badge>
                  </div>
                ))}
              </Card>
            )}

            {/* Preview & Website Actions */}
            <Card className="p-4 space-y-3">
              {currentLead.website && (
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase">Their Website</span>
                  <div className="flex items-center gap-2 mt-1">
                    <a href={currentLead.website.startsWith('http') ? currentLead.website : `https://${currentLead.website}`}
                      target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline truncate flex-1">
                      {currentLead.website.replace(/^https?:\/\//, '')}
                    </a>
                    <Button size="sm" variant="outline" onClick={() => window.open(currentLead.website.startsWith('http') ? currentLead.website : `https://${currentLead.website}`, '_blank')}>
                      <ExternalLink size={14} className="mr-1" /> View
                    </Button>
                  </div>
                </div>
              )}
              {currentLead.previewUrl && (
                <div className={currentLead.website ? 'border-t pt-3' : ''}>
                  <span className="text-xs font-medium text-gray-500 uppercase">Our Preview</span>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => window.open(currentLead.previewUrl, '_blank')}>
                      <Eye size={14} className="mr-1" /> View
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleCopyPreview}>
                      {copiedPreview ? <><CheckCircle size={14} className="mr-1 text-green-600" /> Copied!</> : <><Copy size={14} className="mr-1" /> Copy</>}
                    </Button>
                    <Button size="sm" onClick={() => openPreviewDialog('sms')} className="bg-blue-600 hover:bg-blue-700 text-white">
                      <MessageSquare size={14} className="mr-1" /> Text
                    </Button>
                    <Button size="sm" onClick={() => openPreviewDialog('email')} className="bg-purple-600 hover:bg-purple-700 text-white">
                      <Mail size={14} className="mr-1" /> Email
                    </Button>
                  </div>
                </div>
              )}
            </Card>

            {/* History Panel */}
            <Card className="p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">History</h3>
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
            {/* AI Tip */}
            {currentLead.aiTip && (
              <Card className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
                <div className="flex items-start gap-2">
                  <Flame size={16} className="text-orange-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-xs font-semibold text-orange-700 uppercase">AI Tip</span>
                    <p className="text-sm text-orange-800 mt-0.5">{currentLead.aiTip}</p>
                  </div>
                </div>
              </Card>
            )}

            {/* Queue reason */}
            {currentLead.queueReason && (
              <div className="text-xs text-gray-500 px-1">
                Queue position: {currentLead.queueReason}
              </div>
            )}

            {/* Call Script */}
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <AlertCircle size={16} className="text-blue-600" />
                Call Script
              </h3>
              <div className="bg-blue-50 p-4 rounded-lg text-sm text-gray-700 whitespace-pre-wrap leading-relaxed max-h-[400px] overflow-y-auto">
                {getScript()}
              </div>
            </Card>

            {/* VM Script (shown during call) */}
            {callActive && (
              <Card className="p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Mic size={16} className="text-green-600" />
                  Voicemail Script (15 sec)
                </h3>
                <div className="bg-green-50 p-4 rounded-lg text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
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
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Schedule Callback</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Date</label>
              <Input type="date" value={callbackDate} onChange={(e) => setCallbackDate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Time</label>
              <Input type="time" value={callbackTime} onChange={(e) => setCallbackTime(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCallbackDialog(false)}>Cancel</Button>
            <Button onClick={handleCallback} disabled={!callbackDate || !callbackTime}>Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Note Dialog */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
          </DialogHeader>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Type your note..."
            className="w-full h-24 px-3 py-2 text-sm border border-gray-200 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNoteDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveNote} disabled={!noteText}>Save Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Send Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewMethod === 'sms' ? <><MessageSquare size={18} className="text-blue-600" /> Text Preview</> : <><Mail size={18} className="text-purple-600" /> Email Preview</>}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="font-medium">To:</span>
              <span>{previewMethod === 'sms' ? currentLead?.phone : currentLead?.email || 'No email'}</span>
            </div>
            <textarea
              value={previewMessage}
              onChange={(e) => setPreviewMessage(e.target.value)}
              className="w-full h-36 px-3 py-2 text-sm border border-gray-200 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSendPreview}
              className={previewMethod === 'sms' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white'}
              disabled={previewMethod === 'email' && !currentLead?.email}>
              <Send size={14} className="mr-1" /> Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Lead Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Edit Lead Info</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">First Name</label>
                <Input value={editForm.firstName || ''} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Last Name</label>
                <Input value={editForm.lastName || ''} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Company</label>
              <Input value={editForm.companyName || ''} onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Phone</label>
              <Input value={editForm.phone || ''} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <Input value={editForm.email || ''} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">City</label>
                <Input value={editForm.city || ''} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">State</label>
                <Input value={editForm.state || ''} maxLength={2} onChange={(e) => setEditForm({ ...editForm, state: e.target.value.toUpperCase() })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
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
  const bgMap: Record<string, string> = { blue: 'bg-blue-100', green: 'bg-green-100', purple: 'bg-purple-100', amber: 'bg-amber-100' }
  const textMap: Record<string, string> = { blue: 'text-blue-600', green: 'text-green-600', purple: 'text-purple-600', amber: 'text-amber-600' }

  return (
    <Card className="p-3 flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg ${bgMap[color]} flex items-center justify-center`}>
        <span className={textMap[color]}>{icon}</span>
      </div>
      <div>
        <div className="text-xl font-bold text-gray-900">{value}</div>
        <div className="text-xs text-gray-500">{label}</div>
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