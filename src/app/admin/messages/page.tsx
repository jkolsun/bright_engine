'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import ToggleSwitch from '@/components/ui/toggle-switch'
import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  MessageSquare, AlertCircle, CheckCircle, Send, ArrowLeft,
  AlertTriangle, RefreshCw, Search, Mail, Phone, Plus, Hammer
} from 'lucide-react'

type ViewMode = 'inbox' | 'conversation' | 'settings'
type InboxTab = 'pre_client' | 'post_client' | 'all'

// ─── Badge helpers ───

const ENTRY_POINT_BADGES: Record<string, { label: string; color: string }> = {
  SMS_REPLY: { label: 'SMS', color: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' },
  REP_CLOSE: { label: 'Rep', color: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400' },
  PREVIEW_CTA: { label: 'CTA', color: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400' },
}

const STAGE_BADGES: Record<string, { label: string; color: string; pulse?: boolean }> = {
  INITIATED: { label: 'Initiated', color: 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300' },
  QUALIFYING: { label: 'Qualifying', color: 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400' },
  COLLECTING_INFO: { label: 'Collecting Info', color: 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400' },
  BUILDING: { label: 'Building', color: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400' },
  PREVIEW_SENT: { label: 'Preview Sent', color: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400' },
  EDIT_LOOP: { label: 'Edit Loop', color: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400' },
  PAYMENT_SENT: { label: 'Payment Sent', color: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' },
  STALLED: { label: 'Stalled', color: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400' },
  PENDING_APPROVAL: { label: 'Needs Approval', color: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400', pulse: true },
  COMPLETED: { label: 'Completed', color: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' },
  CLOSED_LOST: { label: 'Closed', color: 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400' },
}

function EntryPointBadge({ entryPoint }: { entryPoint: string }) {
  const badge = ENTRY_POINT_BADGES[entryPoint]
  if (!badge) return null
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>{badge.label}</span>
}

function StageBadge({ stage }: { stage: string }) {
  const badge = STAGE_BADGES[stage] || { label: stage, color: 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.color} ${badge.pulse ? 'animate-pulse' : ''}`}>
      {badge.label}
    </span>
  )
}

function timeSince(date: string): string {
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60))
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function linkifyText(text: string): React.ReactNode {
  if (!text) return text
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const parts = text.split(urlRegex)
  if (parts.length === 1) return text
  return parts.map((part, i) => {
    if (urlRegex.test(part)) {
      // Reset lastIndex since we reuse the regex
      urlRegex.lastIndex = 0
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline break-all">
          {part}
        </a>
      )
    }
    return part
  })
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading messages...</div>}>
      <MessagesPageInner />
    </Suspense>
  )
}

function MessagesPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [viewMode, setViewMode] = useState<ViewMode>('inbox')
  const [inboxTab, setInboxTab] = useState<InboxTab>('pre_client')
  const [messages, setMessages] = useState<any[]>([])
  const [closeConversations, setCloseConversations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [twilioStatus, setTwilioStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking')

  // Conversation view state
  const [selectedConversation, setSelectedConversation] = useState<any>(null)
  const [selectedCloseConv, setSelectedCloseConv] = useState<any>(null)
  const [conversationDetail, setConversationDetail] = useState<any>(null)
  const [messageInput, setMessageInput] = useState('')
  const [sending, setSending] = useState(false)

  // Pending actions
  const [pendingActions, setPendingActions] = useState<any[]>([])
  const [approvingAction, setApprovingAction] = useState<string | null>(null)

  // Multi-channel
  const [sendChannel, setSendChannel] = useState<'SMS' | 'EMAIL'>('SMS')
  const [refreshing, setRefreshing] = useState(false)
  const [expandedDecisionLog, setExpandedDecisionLog] = useState<string | null>(null)

  // Build Status
  const [buildStatus, setBuildStatus] = useState<any>(null)
  const [pushingBuild, setPushingBuild] = useState(false)

  // Global Auto-Push
  const [globalAutoPush, setGlobalAutoPush] = useState(true)
  const [globalAutoPushLoaded, setGlobalAutoPushLoaded] = useState(false)

  // Search
  const [searchTerm, setSearchTerm] = useState('')
  const [sourceFilter, setSourceFilter] = useState<'all' | 'rep' | 'ai' | 'admin'>('all')

  // New Chat
  const [newChatOpen, setNewChatOpen] = useState(false)
  const [chatSearch, setChatSearch] = useState('')
  const [chatSearchResults, setChatSearchResults] = useState<any[]>([])

  // BUG M.3: Pagination + incremental polling state
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const latestMessageRef = useRef<string | null>(null) // timestamp of newest message for incremental poll

  // Auto-scroll refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const prevMessageCountRef = useRef(0)

  // Auto-refresh
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const deepLinkHandled = useRef(false)

  useEffect(() => {
    checkTwilioStatus()
    loadMessages()
    loadCloseConversations()
    loadGlobalAutoPush()
  }, [])

  // Load global auto-push setting
  const loadGlobalAutoPush = async () => {
    try {
      const res = await fetch('/api/settings?key=globalAutoPush')
      if (res.ok) {
        const data = await res.json()
        // Default to true if not set
        setGlobalAutoPush(data.value?.enabled !== false)
      }
    } catch { /* default stays true */ }
    finally { setGlobalAutoPushLoaded(true) }
  }

  const handleToggleGlobalAutoPush = async () => {
    const newValue = !globalAutoPush
    setGlobalAutoPush(newValue)
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'globalAutoPush', value: { enabled: newValue } }),
      })
    } catch {
      // Revert on failure
      setGlobalAutoPush(!newValue)
    }
  }

  // Load build status when viewing a close-engine conversation
  const loadBuildStatus = useCallback(async (leadId: string) => {
    try {
      const res = await fetch(`/api/build-status/${leadId}`)
      if (res.ok) {
        const data = await res.json()
        setBuildStatus(data)
      } else {
        setBuildStatus(null)
      }
    } catch { setBuildStatus(null) }
  }, [])

  // BUG M.3: Adaptive polling with incremental message fetching
  useEffect(() => {
    const interval = viewMode === 'conversation' ? 3000 : 10000
    refreshRef.current = setInterval(() => {
      pollNewMessages() // Only fetch new messages since last poll
      loadCloseConversations()
      if (conversationDetail) loadConversationDetail(conversationDetail.id)
      // Auto-refresh build status when viewing a close-engine conversation
      if (selectedCloseConv?.leadId) loadBuildStatus(selectedCloseConv.leadId)
    }, interval)
    return () => {
      if (refreshRef.current) clearInterval(refreshRef.current)
    }
  }, [viewMode, conversationDetail?.id, selectedCloseConv?.leadId, loadBuildStatus])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (viewMode !== 'conversation') return
    const currentCount = messages.length + (conversationDetail?.messages?.length || 0)
    if (currentCount > prevMessageCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    prevMessageCountRef.current = currentCount
  }, [messages, conversationDetail?.messages, viewMode])

  const checkTwilioStatus = async () => {
    try {
      const res = await fetch('/api/twilio/status')
      if (res.ok) {
        const data = await res.json()
        setTwilioStatus(data.connected ? 'connected' : 'disconnected')
      } else { setTwilioStatus('disconnected') }
    } catch { setTwilioStatus('disconnected') }
  }

  // BUG M.3: Load initial page of messages (50), track newest timestamp for incremental polling
  const loadMessages = async () => {
    try {
      const res = await fetch('/api/messages?limit=50')
      if (res.ok) {
        const data = await res.json()
        const msgs = data.messages || []
        setMessages(msgs)
        setHasMore(msgs.length >= 50)
        if (msgs.length > 0) {
          latestMessageRef.current = msgs[0].createdAt // msgs are desc-ordered, first is newest
        }
      }
    } catch (error) {
      console.error('Failed to load messages:', error)
    } finally {
      setLoading(false)
    }
  }

  // BUG M.3: Incremental poll — only fetch messages newer than the latest we have
  const pollNewMessages = async () => {
    if (!latestMessageRef.current) return loadMessages()
    try {
      const res = await fetch(`/api/messages?limit=50&after=${encodeURIComponent(latestMessageRef.current)}`)
      if (res.ok) {
        const data = await res.json()
        const newMsgs = data.messages || []
        if (newMsgs.length > 0) {
          setMessages(prev => {
            const existingIds = new Set(prev.map((m: any) => m.id))
            const unique = newMsgs.filter((m: any) => !existingIds.has(m.id))
            const merged = [...unique, ...prev]
            return merged
          })
          latestMessageRef.current = newMsgs[0].createdAt
        }
      }
    } catch (error) {
      console.error('Failed to poll messages:', error)
    }
  }

  // BUG M.3: Load older messages for pagination
  const loadMoreMessages = async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const res = await fetch(`/api/messages?limit=50&offset=${messages.length}`)
      if (res.ok) {
        const data = await res.json()
        const older = data.messages || []
        setHasMore(older.length >= 50)
        setMessages(prev => {
          const existingIds = new Set(prev.map((m: any) => m.id))
          const unique = older.filter((m: any) => !existingIds.has(m.id))
          return [...prev, ...unique]
        })
      }
    } catch (error) {
      console.error('Failed to load more messages:', error)
    } finally {
      setLoadingMore(false)
    }
  }

  const loadCloseConversations = async () => {
    try {
      const res = await fetch('/api/close-engine/conversations')
      if (res.ok) {
        const data = await res.json()
        setCloseConversations(data)
      }
    } catch (error) {
      console.error('Failed to load close conversations:', error)
    }
  }

  const loadConversationDetail = async (convId: string) => {
    try {
      const res = await fetch(`/api/close-engine/conversations/${convId}`)
      if (res.ok) {
        const data = await res.json()
        setConversationDetail(data)
        setPendingActions(data.pendingActions || [])
      }
    } catch (error) {
      console.error('Failed to load conversation detail:', error)
    }
  }

  const handleAutonomyChange = async (convId: string, autonomyLevel: string) => {
    try {
      await fetch(`/api/close-engine/conversations/${convId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autonomyLevel }),
      })
      // Update local state
      setCloseConversations(prev =>
        prev.map(c => c.id === convId ? { ...c, autonomyLevel } : c)
      )
      if (conversationDetail?.id === convId) {
        setConversationDetail((prev: any) => ({ ...prev, autonomyLevel }))
      }
    } catch (error) {
      console.error('Failed to update autonomy:', error)
    }
  }

  const handlePendingAction = async (actionId: string, action: 'approve' | 'reject') => {
    setApprovingAction(actionId)
    try {
      await fetch(`/api/pending-actions/${actionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      setPendingActions(prev => prev.filter(a => a.id !== actionId))
      // Refresh the conversation detail
      if (conversationDetail) {
        loadConversationDetail(conversationDetail.id)
      }
      loadCloseConversations()
    } catch (error) {
      console.error('Failed to process pending action:', error)
    } finally {
      setApprovingAction(null)
    }
  }

  useEffect(() => {
    if (viewMode === 'conversation' && selectedCloseConv?.leadId) {
      loadBuildStatus(selectedCloseConv.leadId)
    } else {
      setBuildStatus(null)
    }
  }, [viewMode, selectedCloseConv?.leadId, loadBuildStatus])

  const handleManualPush = async () => {
    if (!selectedCloseConv?.leadId) return
    setPushingBuild(true)
    try {
      const res = await fetch(`/api/build-status/${selectedCloseConv.leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'push' }),
      })
      if (res.ok) {
        const data = await res.json()
        setBuildStatus(data)
      }
    } catch (err) {
      console.error('Push to build failed:', err)
    } finally {
      setPushingBuild(false)
    }
  }

  // New Chat search with debounce
  useEffect(() => {
    if (!chatSearch || chatSearch.length < 2) {
      setChatSearchResults([])
      return
    }
    const timer = setTimeout(async () => {
      try {
        const [leadsRes, clientsRes] = await Promise.all([
          fetch(`/api/leads?search=${encodeURIComponent(chatSearch)}&limit=5`),
          fetch(`/api/clients?search=${encodeURIComponent(chatSearch)}&limit=5`),
        ])
        const leads = leadsRes.ok ? (await leadsRes.json()).leads || [] : []
        const clients = clientsRes.ok ? (await clientsRes.json()).clients || [] : []
        setChatSearchResults([
          ...leads.map((l: any) => ({ id: l.id, type: 'lead', name: `${l.firstName} ${l.lastName || ''}`.trim(), company: l.companyName, phone: l.phone })),
          ...clients.map((c: any) => ({ id: c.id, type: 'client', name: c.contactName || c.companyName, company: c.companyName, phone: c.phone })),
        ])
      } catch { setChatSearchResults([]) }
    }, 300)
    return () => clearTimeout(timer)
  }, [chatSearch])

  const handleSendMessage = async () => {
    if (!messageInput.trim()) return
    setSending(true)
    try {
      const recipientPhone = selectedConversation?.phone || conversationDetail?.lead?.phone
      const recipientEmail = selectedConversation?.email || conversationDetail?.lead?.email || selectedCloseConv?.lead?.email
      const to = sendChannel === 'EMAIL' ? recipientEmail : recipientPhone

      const body: any = {
        to,
        content: messageInput,
        channel: sendChannel,
        senderType: 'ADMIN',
        senderName: 'admin',
      }

      if (selectedConversation?.clientId) body.clientId = selectedConversation.clientId
      if (selectedConversation?.leadId) body.leadId = selectedConversation.leadId
      if (selectedCloseConv) body.leadId = selectedCloseConv.leadId

      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setMessageInput('')
        loadMessages()
        if (conversationDetail) loadConversationDetail(conversationDetail.id)
      }
    } catch (e) { console.error('Failed to send:', e) }
    finally { setSending(false) }
  }

  // ─── Group messages into conversations (for Post-Client and All tabs) ───
  // BUG M.2 fix: Use clientId or leadId as grouping key (not phone) to prevent collisions
  const groupedConversations = (() => {
    const convMap = new Map<string, any>()

    messages.forEach(msg => {
      // BUG M.2: Group by clientId or leadId to avoid phone-based collisions
      const key = msg.clientId
        ? `client-${msg.clientId}`
        : msg.leadId
        ? `lead-${msg.leadId}`
        : `msg-${msg.id}`
      if (!convMap.has(key)) {
        const isClient = !!msg.clientId
        const name = msg.client?.companyName || (msg.lead ? `${msg.lead.firstName} ${msg.lead.lastName || ''}`.trim() : msg.recipient || 'Unknown')
        convMap.set(key, {
          key,
          clientId: msg.clientId,
          leadId: msg.leadId,
          name,
          phone: msg.lead?.phone || msg.recipient || '',
          email: msg.lead?.email || msg.client?.email || '',
          isClient,
          conversationType: isClient ? 'post_client' : 'pre_client',
          messages: [],
          lastMessage: msg,
          escalated: false,
          aiHandling: false,
          healthScore: msg.client?.healthScore,
          hostingStatus: msg.client?.hostingStatus,
          autonomyLevel: msg.client?.autonomyLevel || msg.lead?.autonomyLevel || 'FULL_AUTO',
          channels: new Set<string>(),
        })
      }
      const conv = convMap.get(key)!
      conv.messages.push(msg)
      conv.channels.add(msg.channel || 'SMS')
      if (msg.escalated) conv.escalated = true
      if (msg.aiGenerated || msg.senderType === 'AI' || msg.senderType === 'CLAWDBOT') conv.aiHandling = true
      if (new Date(msg.createdAt) > new Date(conv.lastMessage.createdAt)) {
        conv.lastMessage = msg
      }
    })

    return Array.from(convMap.values()).sort(
      (a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime()
    )
  })()

  const postClientConvs = groupedConversations.filter(c => c.conversationType === 'post_client')

  // BUG M.1 fix: Unified conversation count for All tab combines close-engine + post-client
  // Close-engine conversations already counted via closeConversations.length
  // Post-client conversations counted via postClientConvs.length
  // All tab = close-engine count + post-client count (deduplicated)
  const closeLeadIds = new Set(closeConversations.map((c: any) => c.leadId))
  const uniquePostClientConvs = postClientConvs.filter(c => !closeLeadIds.has(c.leadId))
  const allConversationCount = closeConversations.length + uniquePostClientConvs.length

  // Deep-link: auto-open conversation from ?leadId= or ?clientId= URL params
  useEffect(() => {
    if (deepLinkHandled.current || loading) return
    const leadId = searchParams.get('leadId')
    const clientId = searchParams.get('clientId')
    if (!leadId && !clientId) return

    if (leadId && closeConversations.length > 0) {
      const match = closeConversations.find((c: any) => c.leadId === leadId)
      if (match) {
        deepLinkHandled.current = true
        setInboxTab('pre_client')
        setSelectedCloseConv(match)
        setViewMode('conversation')
        loadConversationDetail(match.id)
        // Clean URL without triggering navigation
        router.replace('/admin/messages', { scroll: false })
      } else {
        // No close-engine conversation yet — check grouped messages
        const msgMatch = groupedConversations.find((c: any) => c.leadId === leadId)
        if (msgMatch) {
          deepLinkHandled.current = true
          setInboxTab('all')
          setSelectedConversation(msgMatch)
          setViewMode('conversation')
          router.replace('/admin/messages', { scroll: false })
        }
      }
    }

    if (clientId && groupedConversations.length > 0) {
      const match = groupedConversations.find((c: any) => c.clientId === clientId)
      if (match) {
        deepLinkHandled.current = true
        setInboxTab('post_client')
        setSelectedConversation(match)
        setViewMode('conversation')
        router.replace('/admin/messages', { scroll: false })
      }
    }
  }, [loading, closeConversations, groupedConversations, searchParams, router])

  // Check for NEW CLIENT badge (paid within 24 hours)
  const isNewClient = (conv: any) => {
    const lastMsg = conv.lastMessage
    if (!lastMsg) return false
    const hoursSince = (Date.now() - new Date(lastMsg.createdAt).getTime()) / (1000 * 60 * 60)
    return conv.isClient && hoursSince < 24
  }

  // Source filter helper — checks if any message in a conversation matches the source
  const matchesSource = (conv: any): boolean => {
    if (sourceFilter === 'all') return true
    const msgs = conv.messages || conv.recentMessages || []
    if (sourceFilter === 'rep') return msgs.some((m: any) => m.senderType === 'REP')
    if (sourceFilter === 'ai') return msgs.some((m: any) => m.aiGenerated || m.senderType === 'AI' || m.senderType === 'CLAWDBOT')
    if (sourceFilter === 'admin') return msgs.some((m: any) => m.senderType === 'ADMIN')
    return true
  }

  // Filtered conversations
  const getFilteredConvs = () => {
    if (inboxTab === 'pre_client') {
      return closeConversations.filter(c =>
        (!searchTerm ||
        c.lead?.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.lead?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.lead?.phone?.includes(searchTerm)) &&
        matchesSource(c)
      )
    }
    if (inboxTab === 'post_client') {
      return postClientConvs.filter(c =>
        (!searchTerm || c.name.toLowerCase().includes(searchTerm.toLowerCase()) || (c.phone && c.phone.includes(searchTerm))) &&
        matchesSource(c)
      )
    }
    // All tab
    return groupedConversations.filter(c =>
      (!searchTerm || c.name.toLowerCase().includes(searchTerm.toLowerCase()) || (c.phone && c.phone.includes(searchTerm))) &&
      matchesSource(c)
    )
  }

  const filteredConvs = getFilteredConvs()
  const pendingApprovalCount = closeConversations.filter(c => c.pendingActionCount > 0).length

  // ─── Close Engine Conversation View ───
  if (viewMode === 'conversation' && selectedCloseConv) {
    const detail = conversationDetail
    const detailMessages = detail?.messages || []

    return (
      <div className="p-8 space-y-6">
        <button onClick={() => { setViewMode('inbox'); setSelectedCloseConv(null); setConversationDetail(null); setPendingActions([]) }} className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
          <ArrowLeft size={16} /> Back to Messages
        </button>

        {/* Conversation Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{selectedCloseConv.lead?.companyName || 'Unknown'}</h2>
            <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mt-1">
              <span>{selectedCloseConv.lead?.firstName} {selectedCloseConv.lead?.lastName || ''}</span>
              {selectedCloseConv.lead?.phone && <span className="flex items-center gap-1"><Phone size={12} /> {selectedCloseConv.lead.phone}</span>}
              {selectedCloseConv.lead?.email && <span className="flex items-center gap-1"><Mail size={12} /> {selectedCloseConv.lead.email}</span>}
              <EntryPointBadge entryPoint={selectedCloseConv.entryPoint} />
              <StageBadge stage={detail?.stage || selectedCloseConv.stage} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500 dark:text-gray-400">Autonomy:</span>
              <select
                className="px-2 py-1 border dark:border-slate-600 rounded text-sm dark:bg-slate-800 dark:text-gray-100"
                value={detail?.autonomyLevel || selectedCloseConv.autonomyLevel}
                onChange={(e) => handleAutonomyChange(selectedCloseConv.id, e.target.value)}
              >
                <option value="FULL_AUTO">Full Auto</option>
                <option value="SEMI_AUTO">Semi-Auto</option>
                <option value="MANUAL">Manual</option>
              </select>
            </div>
          </div>
        </div>

        {/* Pending Action Banner */}
        {pendingActions.length > 0 && pendingActions.map(action => (
          <Card key={action.id} className="p-4 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  Draft {action.type === 'SEND_PAYMENT_LINK' ? 'payment link' : 'message'} ready
                </div>
                <div className="text-sm text-amber-700 dark:text-amber-400 mt-1 truncate">{action.draftMessage}</div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  onClick={() => handlePendingAction(action.id, 'approve')}
                  disabled={approvingAction === action.id}
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  {approvingAction === action.id ? 'Sending...' : 'Approve & Send'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePendingAction(action.id, 'reject')}
                  disabled={approvingAction === action.id}
                >
                  Reject
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {/* Messages + Build Status Sidebar */}
        <div className="flex gap-4">
        <Card className="p-6 flex-1 min-w-0">
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {detailMessages.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">No messages in this conversation yet.</div>
            ) : (
              detailMessages.map((msg: any) => {
                const isOutbound = msg.direction === 'OUTBOUND'
                const isAi = msg.aiGenerated || msg.senderType === 'AI' || msg.senderType === 'CLAWDBOT'
                const isSystem = msg.senderType === 'SYSTEM'
                const isReaction = !!msg.reactionType

                if (isSystem) {
                  return (
                    <div key={msg.id} className="text-center">
                      <span className="inline-block px-3 py-1 bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 rounded-full text-xs">
                        {msg.content}
                      </span>
                    </div>
                  )
                }

                {/* Reaction messages render as compact inline badges */}
                if (isReaction) {
                  return (
                    <div key={msg.id} className="flex justify-start">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-full text-xs text-gray-600 dark:text-gray-400">
                        <span className="text-base">{msg.reactionEmoji || msg.reactionType}</span>
                        <span>{selectedCloseConv.lead?.firstName || 'Lead'} reacted</span>
                        <span className="text-gray-400 dark:text-gray-500">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  )
                }

                return (
                  <div key={msg.id} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] ${isOutbound ? 'bg-gray-50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700' : 'bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700'} border rounded-lg p-3 relative`}>
                      {/* Reaction badge overlay — shows if another message reacted to this one */}
                      {detailMessages.some((r: any) => r.reactionToId === msg.id && r.reactionEmoji) && (
                        <div className="absolute -bottom-2 -right-1 flex gap-0.5">
                          {detailMessages.filter((r: any) => r.reactionToId === msg.id).map((r: any) => (
                            <span key={r.id} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-full px-1 text-sm shadow-sm">{r.reactionEmoji}</span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mb-1">
                        {/* Channel badge */}
                        {msg.channel === 'EMAIL' ? (
                          <span className="text-[10px] font-medium text-blue-600 bg-blue-50 dark:bg-blue-950/30 px-1.5 py-0.5 rounded">📧</span>
                        ) : (
                          <span className="text-[10px] font-medium text-green-600 bg-green-50 dark:bg-green-950/30 px-1.5 py-0.5 rounded">💬</span>
                        )}
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          {isOutbound ? (
                          isAi ? '🤖 AI' :
                          msg.senderType === 'REP' ? `Rep ${msg.senderName || ''}` :
                          msg.senderType === 'ADMIN' ? 'Admin' :
                          msg.trigger === 'auto_sms' ? 'Auto-SMS' :
                          'Team'
                        ) : selectedCloseConv.lead?.firstName || 'Lead'}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isAi && msg.aiDelaySeconds && (
                          <span className="text-xs text-blue-500">[auto — {msg.aiDelaySeconds}s delay]</span>
                        )}
                      </div>
                      {/* Email subject */}
                      {msg.channel === 'EMAIL' && msg.emailSubject && (
                        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Re: {msg.emailSubject}</div>
                      )}
                      {/* Message body — strip HTML for emails, linkify URLs in SMS */}
                      <div className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                        {msg.channel === 'EMAIL' ? msg.content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ') : linkifyText(msg.content)}
                      </div>
                      {/* MMS Images */}
                      {msg.mediaUrls && Array.isArray(msg.mediaUrls) && msg.mediaUrls.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {msg.mediaUrls.map((url: string, idx: number) => (
                            <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                              <img src={url} alt={`MMS ${idx + 1}`} className="max-w-[200px] max-h-[200px] rounded-lg border border-gray-200 dark:border-slate-700 object-cover" />
                            </a>
                          ))}
                          {msg.mediaType && (
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 self-end">{msg.mediaType}</span>
                          )}
                        </div>
                      )}
                      {/* Delivery status */}
                      {isOutbound && (
                        <div className={`text-[10px] mt-1 ${
                          (msg.twilioStatus === 'delivered' || msg.resendStatus === 'delivered') ? 'text-green-500' :
                          (msg.twilioStatus === 'sent' || msg.resendStatus === 'sent') ? 'text-blue-400' :
                          (msg.twilioStatus === 'failed' || msg.resendStatus === 'failed' || msg.twilioStatus === 'undelivered') ? 'text-red-500' :
                          (msg.resendStatus === 'bounced') ? 'text-red-500' :
                          'text-gray-400 dark:text-gray-500'
                        }`}>
                          {(msg.twilioStatus === 'delivered' || msg.resendStatus === 'delivered') && `✓ Delivered via ${msg.channel === 'EMAIL' ? 'email' : 'SMS'}`}
                          {msg.twilioStatus === 'sent' && msg.channel !== 'EMAIL' && '⏳ Sent via SMS'}
                          {msg.resendStatus === 'sent' && msg.channel === 'EMAIL' && '⏳ Sent via email'}
                          {(msg.twilioStatus === 'failed' || msg.resendStatus === 'failed') && '✗ Failed to send'}
                          {msg.twilioStatus === 'undelivered' && '✗ Undelivered (carrier rejected)'}
                          {msg.resendStatus === 'bounced' && '✗ Email bounced'}
                        </div>
                      )}
                      {msg.escalated && (
                        <div className="mt-2 text-xs text-orange-600 flex items-center gap-1">
                          <AlertTriangle size={10} /> Escalated: {msg.escalationReason || 'Manual review needed'}
                        </div>
                      )}
                      {/* AI Decision Log */}
                      {isAi && msg.aiDecisionLog && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setExpandedDecisionLog(expandedDecisionLog === msg.id ? null : msg.id) }}
                          className="text-xs text-blue-500 hover:underline mt-1"
                        >
                          {expandedDecisionLog === msg.id ? 'Hide AI reasoning' : 'View AI reasoning'}
                        </button>
                      )}
                      {expandedDecisionLog === msg.id && msg.aiDecisionLog && (
                        <div className="mt-2 p-2 bg-gray-50 dark:bg-slate-800/50 rounded text-xs font-mono text-gray-600 dark:text-gray-400 whitespace-pre-wrap max-h-48 overflow-y-auto">
                          {JSON.stringify(msg.aiDecisionLog, null, 2)}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input with Channel Selector */}
          <div className="mt-4 pt-4 border-t dark:border-slate-700">
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => setSendChannel('SMS')}
                className={`px-3 py-1 rounded text-xs font-medium ${sendChannel === 'SMS' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-700' : 'bg-gray-50 dark:bg-slate-800/50 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-slate-700'}`}
              >
                💬 SMS
              </button>
              <button
                onClick={() => setSendChannel('EMAIL')}
                className={`px-3 py-1 rounded text-xs font-medium ${sendChannel === 'EMAIL' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-700' : 'bg-gray-50 dark:bg-slate-800/50 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-slate-700'}`}
                disabled={!selectedCloseConv?.lead?.email}
                title={!selectedCloseConv?.lead?.email ? 'No email address available' : ''}
              >
                📧 Email {!selectedCloseConv?.lead?.email && '(no email)'}
              </button>
            </div>
            <div className="flex gap-3">
              <Input
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder={sendChannel === 'SMS' ? 'Type SMS (manual override)...' : 'Type email message...'}
                className="flex-1"
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage() } }}
              />
              <Button onClick={handleSendMessage} disabled={sending || !messageInput.trim()}>
                <Send size={16} className="mr-1" />
                {sending ? 'Sending...' : `Send ${sendChannel === 'EMAIL' ? 'Email' : 'SMS'}`}
              </Button>
            </div>
          </div>
        </Card>

        {/* Build Status Sidebar */}
        <Card className="p-4 w-72 flex-shrink-0 self-start">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-3 flex items-center gap-2">
            <Hammer size={16} className="text-blue-600" />
            Build Status
          </h3>

          {buildStatus ? (
            <div className="space-y-3">
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <Badge variant={
                  buildStatus.status === 'live' ? 'default' :
                  buildStatus.status === 'building' ? 'secondary' :
                  'outline'
                }>
                  {buildStatus.status.replace('_', ' ').toUpperCase()}
                </Badge>
                {buildStatus.lastPushedAt && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    Pushed {new Date(buildStatus.lastPushedAt).toLocaleDateString()}
                  </span>
                )}
              </div>

              {/* Checklist */}
              <div className="space-y-2">
                {[
                  { label: 'Services', done: buildStatus.servicesCollected, data: buildStatus.servicesData },
                  { label: 'Hours', done: buildStatus.hoursCollected, data: buildStatus.hoursData },
                  { label: 'Logo', done: buildStatus.logoCollected, data: buildStatus.logoUrl ? 'Uploaded' : null },
                  { label: 'Photos', done: buildStatus.photosCollected, data: buildStatus.photosData },
                  { label: 'Company Name', done: buildStatus.companyNameConfirmed, data: buildStatus.companyNameOverride },
                  { label: 'Colors', done: buildStatus.colorPrefsCollected, data: null },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2">
                    {item.done ? (
                      <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 dark:border-slate-600 flex-shrink-0" />
                    )}
                    <span className={`text-xs ${item.done ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}`}>
                      {item.label}
                    </span>
                    {item.data && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto truncate max-w-[100px]" title={String(item.data)}>
                        {typeof item.data === 'string' ? item.data.slice(0, 20) : Array.isArray(item.data) ? `${item.data.length} items` : 'Set'}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t dark:border-slate-700 space-y-2">
                {globalAutoPush ? (
                  <div className="flex items-center justify-center gap-2 py-1.5 px-3 rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs font-medium text-green-700 dark:text-green-400">
                      {buildStatus.status === 'building' ? 'Auto-Pushed to Build' : 'Auto-Push Enabled'}
                    </span>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={handleManualPush}
                    disabled={pushingBuild || !buildStatus.servicesCollected}
                  >
                    {pushingBuild ? 'Pushing...' : 'Push to Build'}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500 italic">No build data collected yet</p>
          )}
        </Card>
        </div>
      </div>
    )
  }

  // ─── Legacy Conversation View (Post-Client / All) ───
  if (viewMode === 'conversation' && selectedConversation) {
    const convMessages = messages
      .filter(m => {
        if (selectedConversation.clientId) return m.clientId === selectedConversation.clientId
        if (selectedConversation.leadId) return m.leadId === selectedConversation.leadId
        return m.recipient === selectedConversation.phone || m.id === selectedConversation.key
      })
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

    return (
      <div className="p-8 space-y-6">
        <button onClick={() => { setViewMode('inbox'); setSelectedConversation(null) }} className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
          <ArrowLeft size={16} /> Back to Messages
        </button>

        {/* Conversation Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{selectedConversation.name}</h2>
            <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mt-1">
              {selectedConversation.isClient ? (
                <Badge variant="default">Client (Active)</Badge>
              ) : (
                <Badge variant="secondary">Lead (Pre-Client)</Badge>
              )}
              {selectedConversation.channels?.has('SMS') && <span className="flex items-center gap-1">💬 SMS</span>}
              {selectedConversation.channels?.has('EMAIL') && <span className="flex items-center gap-1">📧 Email</span>}
              {selectedConversation.phone && <span className="flex items-center gap-1"><Phone size={12} /> {selectedConversation.phone}</span>}
              {selectedConversation.email && <span className="flex items-center gap-1"><Mail size={12} /> {selectedConversation.email}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500 dark:text-gray-400">AI:</span>
            <select
              className="px-2 py-1 border dark:border-slate-600 rounded text-sm dark:bg-slate-800 dark:text-gray-100"
              value={selectedConversation.autonomyLevel || 'FULL_AUTO'}
              onChange={async (e) => {
                const newLevel = e.target.value
                const id = selectedConversation.clientId || selectedConversation.leadId
                const endpoint = selectedConversation.clientId
                  ? `/api/clients/${id}`
                  : `/api/leads/${id}`
                try {
                  await fetch(endpoint, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ autonomyLevel: newLevel }),
                  })
                  setSelectedConversation((prev: any) => ({ ...prev, autonomyLevel: newLevel }))
                } catch (err) { console.error('Failed to update AI setting:', err) }
              }}
            >
              <option value="FULL_AUTO">Full Auto</option>
              <option value="SEMI_AUTO">Semi-Auto</option>
              <option value="MANUAL">Manual (Off)</option>
            </select>
          </div>
        </div>

        {/* Messages */}
        <Card className="p-6">
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {convMessages.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">No messages in this conversation yet.</div>
            ) : (
              convMessages.map((msg) => {
                const isOutbound = msg.direction === 'OUTBOUND'
                const isAi = msg.aiGenerated || msg.senderType === 'AI' || msg.senderType === 'CLAWDBOT'
                const isSystem = msg.senderType === 'SYSTEM'
                const isReaction = !!msg.reactionType

                if (isSystem) {
                  return (
                    <div key={msg.id} className="text-center">
                      <span className="inline-block px-3 py-1 bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 rounded-full text-xs">
                        {msg.content}
                      </span>
                    </div>
                  )
                }

                {/* Reaction messages render as compact inline badges */}
                if (isReaction) {
                  return (
                    <div key={msg.id} className="flex justify-start">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-full text-xs text-gray-600 dark:text-gray-400">
                        <span className="text-base">{msg.reactionEmoji || msg.reactionType}</span>
                        <span>{selectedConversation.name.split(' ')[0]} reacted</span>
                        <span className="text-gray-400 dark:text-gray-500">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  )
                }

                return (
                  <div key={msg.id} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] ${isOutbound ? 'bg-gray-50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700' : 'bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700'} border rounded-lg p-3 relative`}>
                      {/* Reaction badge overlay */}
                      {convMessages.some((r: any) => r.reactionToId === msg.id && r.reactionEmoji) && (
                        <div className="absolute -bottom-2 -right-1 flex gap-0.5">
                          {convMessages.filter((r: any) => r.reactionToId === msg.id).map((r: any) => (
                            <span key={r.id} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-full px-1 text-sm shadow-sm">{r.reactionEmoji}</span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mb-1">
                        {/* Channel badge */}
                        {msg.channel === 'EMAIL' ? (
                          <span className="text-[10px] font-medium text-blue-600 bg-blue-50 dark:bg-blue-950/30 px-1.5 py-0.5 rounded">📧</span>
                        ) : (
                          <span className="text-[10px] font-medium text-green-600 bg-green-50 dark:bg-green-950/30 px-1.5 py-0.5 rounded">💬</span>
                        )}
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          {isOutbound ? (
                          isAi ? '🤖 AI' :
                          msg.senderType === 'REP' ? `Rep ${msg.senderName || ''}` :
                          msg.senderType === 'ADMIN' ? 'Admin' :
                          msg.trigger === 'auto_sms' ? 'Auto-SMS' :
                          'Team'
                        ) : selectedConversation.name.split(' ')[0]}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isAi && msg.aiDelaySeconds && (
                          <span className="text-xs text-blue-500">[auto — {msg.aiDelaySeconds}s delay]</span>
                        )}
                      </div>
                      {/* Email subject */}
                      {msg.channel === 'EMAIL' && msg.emailSubject && (
                        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Re: {msg.emailSubject}</div>
                      )}
                      {/* Message body — strip HTML for emails, linkify URLs in SMS */}
                      <div className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                        {msg.channel === 'EMAIL' ? msg.content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ') : linkifyText(msg.content)}
                      </div>
                      {/* MMS Images */}
                      {msg.mediaUrls && Array.isArray(msg.mediaUrls) && msg.mediaUrls.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {msg.mediaUrls.map((url: string, idx: number) => (
                            <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                              <img src={url} alt={`MMS ${idx + 1}`} className="max-w-[200px] max-h-[200px] rounded-lg border border-gray-200 dark:border-slate-700 object-cover" />
                            </a>
                          ))}
                          {msg.mediaType && (
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 self-end">{msg.mediaType}</span>
                          )}
                        </div>
                      )}
                      {/* Delivery status */}
                      {isOutbound && (
                        <div className={`text-[10px] mt-1 ${
                          (msg.twilioStatus === 'delivered' || msg.resendStatus === 'delivered') ? 'text-green-500' :
                          (msg.twilioStatus === 'sent' || msg.resendStatus === 'sent') ? 'text-blue-400' :
                          (msg.twilioStatus === 'failed' || msg.resendStatus === 'failed' || msg.twilioStatus === 'undelivered') ? 'text-red-500' :
                          (msg.resendStatus === 'bounced') ? 'text-red-500' :
                          'text-gray-400 dark:text-gray-500'
                        }`}>
                          {(msg.twilioStatus === 'delivered' || msg.resendStatus === 'delivered') && `✓ Delivered via ${msg.channel === 'EMAIL' ? 'email' : 'SMS'}`}
                          {msg.twilioStatus === 'sent' && msg.channel !== 'EMAIL' && '⏳ Sent via SMS'}
                          {msg.resendStatus === 'sent' && msg.channel === 'EMAIL' && '⏳ Sent via email'}
                          {(msg.twilioStatus === 'failed' || msg.resendStatus === 'failed') && '✗ Failed to send'}
                          {msg.twilioStatus === 'undelivered' && '✗ Undelivered (carrier rejected)'}
                          {msg.resendStatus === 'bounced' && '✗ Email bounced'}
                        </div>
                      )}
                      {msg.escalated && (
                        <div className="mt-2 text-xs text-orange-600 flex items-center gap-1">
                          <AlertTriangle size={10} /> Escalated: {msg.escalationReason || 'Manual review needed'}
                        </div>
                      )}
                      {/* AI Decision Log */}
                      {isAi && msg.aiDecisionLog && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setExpandedDecisionLog(expandedDecisionLog === msg.id ? null : msg.id) }}
                          className="text-xs text-blue-500 hover:underline mt-1"
                        >
                          {expandedDecisionLog === msg.id ? 'Hide AI reasoning' : 'View AI reasoning'}
                        </button>
                      )}
                      {expandedDecisionLog === msg.id && msg.aiDecisionLog && (
                        <div className="mt-2 p-2 bg-gray-50 dark:bg-slate-800/50 rounded text-xs font-mono text-gray-600 dark:text-gray-400 whitespace-pre-wrap max-h-48 overflow-y-auto">
                          {JSON.stringify(msg.aiDecisionLog, null, 2)}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input with Channel Selector */}
          <div className="mt-4 pt-4 border-t dark:border-slate-700">
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => setSendChannel('SMS')}
                className={`px-3 py-1 rounded text-xs font-medium ${sendChannel === 'SMS' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-700' : 'bg-gray-50 dark:bg-slate-800/50 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-slate-700'}`}
              >
                💬 SMS
              </button>
              <button
                onClick={() => setSendChannel('EMAIL')}
                className={`px-3 py-1 rounded text-xs font-medium ${sendChannel === 'EMAIL' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-700' : 'bg-gray-50 dark:bg-slate-800/50 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-slate-700'}`}
                disabled={!selectedConversation?.email}
                title={!selectedConversation?.email ? 'No email address available' : ''}
              >
                📧 Email {!selectedConversation?.email && '(no email)'}
              </button>
            </div>
            <div className="flex gap-3">
              <Input
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder={sendChannel === 'SMS' ? 'Type SMS...' : 'Type email message...'}
                className="flex-1"
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage() } }}
              />
              <Button onClick={handleSendMessage} disabled={sending || !messageInput.trim()}>
                <Send size={16} className="mr-1" />
                {sending ? 'Sending...' : `Send ${sendChannel === 'EMAIL' ? 'Email' : 'SMS'}`}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  // ─── Inbox View ───
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Messages</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Unified inbox — AI handler + manual override</p>
        </div>
        <div className="flex gap-3">
          <Button size="sm" onClick={() => setNewChatOpen(true)}>
            <Plus size={16} className="mr-1" /> New Chat
          </Button>
          <Button variant="outline" size="sm" disabled={refreshing} onClick={async () => { setRefreshing(true); await Promise.all([loadMessages(), loadCloseConversations()]); setRefreshing(false) }}>
            <RefreshCw size={14} className={`mr-1 ${refreshing ? 'animate-spin' : ''}`} /> {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Inbox Tabs — Teal active indicator */}
      <div className="flex border-b border-gray-200 dark:border-slate-700">
        {[
          { key: 'pre_client' as const, label: 'Pre-Client', count: closeConversations.length },
          { key: 'post_client' as const, label: 'Post-Client', count: postClientConvs.length },
          { key: 'all' as const, label: 'All', count: allConversationCount },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setInboxTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              inboxTab === tab.key
                ? 'border-teal-500 text-teal-700 dark:text-teal-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab.label}
            <span className={`ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs ${
              inboxTab === tab.key ? 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400'
            }`}>
              {tab.count}
            </span>
            {tab.key === 'pre_client' && pendingApprovalCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs bg-orange-500 text-white animate-pulse">
                {pendingApprovalCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search + Source Filter + Global Auto-Push */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
          <Input className="pl-10" placeholder="Search conversations..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value as any)}
          className="text-sm border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-100 flex-shrink-0"
        >
          <option value="all">All Sources</option>
          <option value="rep">Rep</option>
          <option value="ai">AI</option>
          <option value="admin">Admin</option>
        </select>
        {inboxTab === 'pre_client' && globalAutoPushLoaded && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg flex-shrink-0">
            <Hammer size={13} className="text-teal-600" />
            <ToggleSwitch
              label="Auto-push builds"
              size="sm"
              checked={globalAutoPush}
              onChange={handleToggleGlobalAutoPush}
            />
          </div>
        )}
      </div>

      {/* ─── PRE-CLIENT TAB ─── */}
      {inboxTab === 'pre_client' && (
        <>
          {loading ? (
            <Card className="p-12 text-center text-gray-500 dark:text-gray-400">Loading conversations...</Card>
          ) : filteredConvs.length === 0 ? (
            <Card className="p-12 text-center">
              <MessageSquare size={48} className="text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No active conversations</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Close Engine conversations will appear when leads engage.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {(filteredConvs as any[]).map((conv: any) => (
                <Card
                  key={conv.id}
                  className={`p-4 cursor-pointer hover:shadow-md transition-all ${
                    conv.pendingActionCount > 0 ? 'border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/30' :
                    conv.stage === 'STALLED' ? 'border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-950/20' :
                    'border-gray-200 dark:border-slate-700'
                  }`}
                  onClick={() => {
                    setSelectedCloseConv(conv)
                    setViewMode('conversation')
                    loadConversationDetail(conv.id)
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-gray-100 truncate">{conv.lead?.companyName || 'Unknown'}</span>
                        <EntryPointBadge entryPoint={conv.entryPoint} />
                        <StageBadge stage={conv.stage} />
                        {conv.pendingActionCount > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-500 text-white animate-pulse">
                            Action needed
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        {conv.lead?.firstName} {conv.lead?.lastName || ''}
                        {conv.lead?.phone && <span className="ml-2">{conv.lead.phone}</span>}
                      </div>
                      {conv.lastMessage && (
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
                          {conv.lastMessage.direction === 'OUTBOUND' && (
                            <span className="text-gray-400 dark:text-gray-500">
                              {(conv.lastMessage.aiGenerated || conv.lastMessage.senderType === 'AI') ? '🤖 ' : 'You: '}
                            </span>
                          )}
                          {conv.lastMessage.content?.substring(0, 100)}{(conv.lastMessage.content?.length || 0) > 100 && '...'}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 ml-3">
                      {conv.lastMessage?.createdAt && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">{timeSince(conv.lastMessage.createdAt)}</span>
                      )}
                      <span className="text-xs text-gray-400 dark:text-gray-500">{conv.autonomyLevel.replace('_', ' ')}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* ─── POST-CLIENT TAB ─── */}
      {inboxTab === 'post_client' && (
        <>
          {loading ? (
            <Card className="p-12 text-center text-gray-500 dark:text-gray-400">Loading messages...</Card>
          ) : filteredConvs.length === 0 ? (
            <Card className="p-12 text-center">
              <MessageSquare size={48} className="text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No client conversations</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Support conversations will appear when clients text or email.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {(filteredConvs as any[]).map((conv: any) => (
                <Card
                  key={conv.key}
                  className={`p-4 cursor-pointer hover:shadow-md transition-all ${
                    conv.escalated ? 'border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/30' :
                    conv.aiHandling ? 'border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/20' :
                    'border-gray-200 dark:border-slate-700'
                  }`}
                  onClick={() => { setSelectedConversation(conv); setViewMode('conversation') }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-gray-100 truncate">{conv.name}</span>
                        <Badge variant="default" className="text-xs">Client</Badge>
                        {isNewClient(conv) && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-500 text-white">
                            NEW CLIENT
                          </span>
                        )}
                        {conv.escalated && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400">
                            Escalated
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        {conv.channels?.has('SMS') && <span className="text-[10px]">💬</span>}
                        {conv.channels?.has('EMAIL') && <span className="text-[10px]">📧</span>}
                        <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {conv.lastMessage?.direction === 'OUTBOUND' && (
                            <span className="text-gray-400 dark:text-gray-500">{(conv.lastMessage.aiGenerated || conv.lastMessage.senderType === 'AI') ? '🤖 ' : 'You: '}</span>
                          )}
                          {conv.lastMessage?.content?.replace(/<[^>]*>/g, '').substring(0, 80)}{(conv.lastMessage?.content?.length || 0) > 80 && '...'}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 ml-3">
                      {conv.lastMessage?.createdAt && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">{timeSince(conv.lastMessage.createdAt)}</span>
                      )}
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" className="text-xs h-7 px-2">OPEN</Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* ─── ALL TAB ─── */}
      {inboxTab === 'all' && (
        <>
          {loading ? (
            <Card className="p-12 text-center text-gray-500 dark:text-gray-400">Loading messages...</Card>
          ) : filteredConvs.length === 0 ? (
            <Card className="p-12 text-center">
              <MessageSquare size={48} className="text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No conversations</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Messages will appear here as they come in.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {/* Escalated */}
              {(filteredConvs as any[]).filter((c: any) => c.escalated).length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-orange-700 dark:text-orange-400 flex items-center gap-2">ESCALATED</h3>
                  {(filteredConvs as any[]).filter((c: any) => c.escalated).map((conv: any) => (
                    <ConversationCard key={conv.key} conversation={conv} onClick={() => { setSelectedConversation(conv); setViewMode('conversation') }} variant="escalated" />
                  ))}
                </div>
              )}

              {/* AI Handling */}
              {(filteredConvs as any[]).filter((c: any) => c.aiHandling && !c.escalated).length > 0 && (
                <div className="space-y-2 mt-4">
                  <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-2">🤖 AI HANDLING</h3>
                  {(filteredConvs as any[]).filter((c: any) => c.aiHandling && !c.escalated).map((conv: any) => (
                    <ConversationCard key={conv.key} conversation={conv} onClick={() => { setSelectedConversation(conv); setViewMode('conversation') }} variant="ai" />
                  ))}
                </div>
              )}

              {/* Other */}
              {(filteredConvs as any[]).filter((c: any) => !c.aiHandling && !c.escalated).length > 0 && (
                <div className="space-y-2 mt-4">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">CONVERSATIONS</h3>
                  {(filteredConvs as any[]).filter((c: any) => !c.aiHandling && !c.escalated).map((conv: any) => (
                    <ConversationCard key={conv.key} conversation={conv} onClick={() => { setSelectedConversation(conv); setViewMode('conversation') }} variant="default" />
                  ))}
                </div>
              )}

              {/* BUG M.3: Load More button */}
              {hasMore && (
                <div className="text-center pt-4">
                  <Button variant="outline" size="sm" disabled={loadingMore} onClick={loadMoreMessages}>
                    {loadingMore ? 'Loading...' : 'Load More Conversations'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* New Chat Dialog */}
      <Dialog open={newChatOpen} onOpenChange={(v) => { setNewChatOpen(v); if (!v) { setChatSearch(''); setChatSearchResults([]) } }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>New Conversation</DialogTitle></DialogHeader>
          <Input placeholder="Search by name, company, or phone..." value={chatSearch} onChange={(e) => setChatSearch(e.target.value)} autoFocus />
          <div className="max-h-60 overflow-y-auto mt-2 space-y-1">
            {chatSearchResults.length === 0 && chatSearch.length >= 2 && (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No results</p>
            )}
            {chatSearchResults.map((r: any) => (
              <button
                key={`${r.type}-${r.id}`}
                className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-md flex items-center justify-between"
                onClick={() => {
                  const existing = groupedConversations.find((c: any) =>
                    (r.type === 'lead' && c.leadId === r.id) || (r.type === 'client' && c.clientId === r.id)
                  )
                  if (existing) {
                    setSelectedConversation(existing)
                  } else {
                    setSelectedConversation({
                      key: `new-${r.id}`, clientId: r.type === 'client' ? r.id : null,
                      leadId: r.type === 'lead' ? r.id : null, name: r.name || r.company,
                      phone: r.phone || '', isClient: r.type === 'client',
                      conversationType: r.type === 'client' ? 'post_client' : 'pre_client',
                      messages: [], lastMessage: null, escalated: false, aiHandling: false,
                    })
                  }
                  setViewMode('conversation')
                  setNewChatOpen(false)
                  setChatSearch('')
                  setChatSearchResults([])
                }}
              >
                <div>
                  <div className="font-medium text-sm">{String(r.name || '')}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{String(r.company || '')}{r.phone ? ` • ${String(r.phone)}` : ''}</div>
                </div>
                <Badge variant={r.type === 'client' ? 'default' : 'secondary'} className="text-xs">{r.type}</Badge>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ConversationCard({ conversation, onClick, variant }: { conversation: any; onClick: () => void; variant: 'escalated' | 'ai' | 'default' }) {
  const borderColor = variant === 'escalated' ? 'border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/30' : variant === 'ai' ? 'border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/20' : 'border-gray-200 dark:border-slate-700'
  const lastMsg = conversation.lastMessage
  const ts = lastMsg?.createdAt ? timeSince(lastMsg.createdAt) : ''

  return (
    <Card className={`p-4 cursor-pointer hover:shadow-md transition-all ${borderColor}`} onClick={onClick}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 dark:text-gray-100 truncate">{conversation.name}</span>
            {conversation.isClient ? <Badge variant="default" className="text-xs">Client</Badge> : <Badge variant="secondary" className="text-xs">Lead</Badge>}
            {conversation.channels?.has('SMS') && <span className="text-[10px]">💬</span>}
            {conversation.channels?.has('EMAIL') && <span className="text-[10px]">📧</span>}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
            {lastMsg?.direction === 'OUTBOUND' && (
              <span className="text-gray-400 dark:text-gray-500">{(lastMsg.aiGenerated || lastMsg.senderType === 'AI') ? '🤖 ' : 'You: '}</span>
            )}
            {lastMsg?.content?.replace(/<[^>]*>/g, '').substring(0, 100)}{(lastMsg?.content?.length || 0) > 100 && '...'}
          </div>
          {conversation.escalated && lastMsg?.escalationReason && (
            <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">AI paused — {lastMsg.escalationReason}</div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 ml-3">
          <span className="text-xs text-gray-400 dark:text-gray-500">{ts}</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="text-xs h-7 px-2">OPEN</Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
