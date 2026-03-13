'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useMessagesSSE } from '@/hooks/useMessagesSSE'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// ─── Types ───

interface ConversationSummary {
  leadId: string
  companyName: string | null
  firstName: string | null
  lastName: string | null
  phone: string | null
  email: string | null
  smsFunnelStage: string | null
  dncAt: string | null
  smsOptedOutAt: string | null
  assignedToId: string | null
  isClient: boolean
  hasUnreadInbound: boolean
  lastMessage: {
    id: string
    content: string | null
    direction: string
    senderType: string | null
    senderName: string | null
    createdAt: string
  } | null
  closeEngine: {
    stage: string | null
    autonomyLevel: string | null
  } | null
  campaignLead: {
    id: string
    funnelStage: string | null
    dripCurrentStep: number | null
  } | null
  updatedAt: string
}

interface TimelineItem {
  type: 'message' | 'campaign_message' | 'event'
  timestamp: string
  data: any
}

interface LeadDetail {
  id: string
  companyName: string | null
  firstName: string | null
  lastName: string | null
  phone: string | null
  email: string | null
  city: string | null
  state: string | null
  industry: string | null
  smsFunnelStage: string | null
  dncAt: string | null
  smsOptedOutAt: string | null
  assignedToId: string | null
  previewUrl: string | null
  client: { id: string; companyName: string | null } | null
}

interface Rep {
  id: string
  name: string
}

interface Settings {
  autoPushBuilds: boolean
  showAiConversations: boolean
  showArchivedLeads: boolean
  showDncLeads: boolean
  compactMode: boolean
  sidebarDefaultOpen: boolean
  soundNotifications: boolean
  sortBy: string
  defaultAiMode: string
}

const DEFAULT_SETTINGS: Settings = {
  autoPushBuilds: true,
  showAiConversations: true,
  showArchivedLeads: false,
  showDncLeads: false,
  compactMode: false,
  sidebarDefaultOpen: true,
  soundNotifications: false,
  sortBy: 'newest',
  defaultAiMode: 'FULL_AUTO',
}

// ─── Helpers ───

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const diff = now - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return `${Math.floor(days / 7)}w`
}

function getInitials(first: string | null, last: string | null, company: string | null): string {
  if (first && last) return `${first[0]}${last[0]}`.toUpperCase()
  if (first) return first[0].toUpperCase()
  if (company) return company[0].toUpperCase()
  return '?'
}

function getBorderColor(conv: ConversationSummary): string {
  if (conv.hasUnreadInbound) return 'border-l-red-500'
  if (conv.smsFunnelStage === 'CLICKED') return 'border-l-orange-500'
  if (conv.smsFunnelStage === 'HOT') return 'border-l-green-500'
  return 'border-l-transparent'
}

function getEventColor(eventType: string): string {
  if (eventType.startsWith('PREVIEW_')) return 'text-blue-500'
  if (eventType.startsWith('CALL_')) return 'text-purple-500'
  if (eventType.startsWith('SMS_OPT')) return 'text-red-500'
  if (eventType.startsWith('SMS_')) return 'text-teal-500'
  if (eventType.startsWith('CLOSE_ENGINE')) return 'text-amber-500'
  return 'text-gray-500'
}

function getEventDescription(eventType: string): string {
  const labels: Record<string, string> = {
    PREVIEW_CTA_CLICKED: 'Clicked preview CTA',
    PREVIEW_VIEWED: 'Viewed preview page',
    PREVIEW_CALL_CLICKED: 'Clicked call from preview',
    PREVIEW_RETURN_VISIT: 'Return visit to preview',
    CALL_ATTEMPTED: 'Call attempted',
    CALL_CONNECTED: 'Call connected',
    CALL_ENDED: 'Call ended',
    SMS_COLD_SENT: 'Cold SMS sent',
    SMS_DELIVERED: 'SMS delivered',
    SMS_FAILED: 'SMS delivery failed',
    SMS_OPT_IN: 'Opted in to SMS',
    SMS_OPT_OUT: 'Opted out of SMS',
    SMS_DRIP_SENT: 'Drip SMS sent',
    SMS_DRIP_REPLY: 'Replied to drip SMS',
    CLOSE_ENGINE_TRIGGERED: 'Close engine triggered',
    CLOSE_ENGINE_STAGE_CHANGE: 'Close engine stage changed',
  }
  return labels[eventType] || eventType
}

// ─── Main Page ───

export default function MessagesV2Page() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading Messages V2...</div>}>
      <MessagesV2PageInner />
    </Suspense>
  )
}

function MessagesV2PageInner() {
  // ─── State ───
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [conversationCounts, setConversationCounts] = useState({ preClient: 0, postClient: 0 })
  const [activeThread, setActiveThread] = useState<TimelineItem[]>([])
  const [activeLead, setActiveLead] = useState<LeadDetail | null>(null)
  const [activeCloseEngine, setActiveCloseEngine] = useState<any>(null)
  const [activeCampaignLeads, setActiveCampaignLeads] = useState<any[]>([])
  const [activePreviewEngagement, setActivePreviewEngagement] = useState({ ctaClicks: 0, pageViews: 0, callClicks: 0, returnVisits: 0 })
  const [activeEvents, setActiveEvents] = useState<any[]>([])

  // Filters
  const [tab, setTab] = useState<'pre_client' | 'post_client'>('pre_client')
  const [search, setSearch] = useState('')
  const [filterPills, setFilterPills] = useState<string[]>([])
  const [sort, setSort] = useState('newest')

  // Settings & reps
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [reps, setReps] = useState<Rep[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Loading states
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [loadingThread, setLoadingThread] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)

  // Compose
  const [composeChannel, setComposeChannel] = useState<'SMS' | 'EMAIL'>('SMS')
  const [composeText, setComposeText] = useState('')
  const [sending, setSending] = useState(false)

  // Refs
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const threadEndRef = useRef<HTMLDivElement>(null!)
  const conversationListRef = useRef<HTMLDivElement>(null!)

  // SSE
  const { connected, on } = useMessagesSSE()

  // ─── Data Fetchers ───

  const fetchConversations = useCallback(async (append = false) => {
    if (!append) setLoadingConversations(true)
    else setLoadingMore(true)

    try {
      const params = new URLSearchParams()
      params.set('tab', tab)
      if (filterPills.length > 0) params.set('filter', filterPills.join(','))
      if (search) params.set('search', search)
      params.set('sort', sort)
      if (append && nextCursor) params.set('cursor', nextCursor)
      params.set('limit', '50')

      const res = await fetch(`/api/messages-v2/conversations?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        if (append) {
          setConversations(prev => [...prev, ...data.conversations])
        } else {
          setConversations(data.conversations)
        }
        setConversationCounts(data.counts)
        setNextCursor(data.nextCursor)
        setHasMore(data.hasMore)
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error)
    } finally {
      setLoadingConversations(false)
      setLoadingMore(false)
    }
  }, [tab, filterPills, search, sort, nextCursor])

  const fetchThread = useCallback(async (leadId: string) => {
    setLoadingThread(true)
    try {
      const res = await fetch(`/api/messages-v2/conversations/${leadId}`)
      if (res.ok) {
        const data = await res.json()
        setActiveThread(data.timeline)
        setActiveLead(data.lead)
        setActiveCloseEngine(data.closeEngine)
        setActiveCampaignLeads(data.campaignLeads || [])
        setActivePreviewEngagement(data.previewEngagement)
        setActiveEvents(data.events || [])
      }
    } catch (error) {
      console.error('Failed to fetch thread:', error)
    } finally {
      setLoadingThread(false)
    }
  }, [])

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/messages-v2/settings')
      if (res.ok) {
        const data = await res.json()
        const s = { ...DEFAULT_SETTINGS, ...(data.value || {}) }
        setSettings(s)
        setSidebarOpen(s.sidebarDefaultOpen)
      }
    } catch { /* use defaults */ }
  }, [])

  const fetchReps = useCallback(async () => {
    try {
      const res = await fetch('/api/messages-v2/reps')
      if (res.ok) {
        const data = await res.json()
        setReps(data.reps || [])
      }
    } catch { /* ignore */ }
  }, [])

  const updateSettings = useCallback(async (updates: Partial<Settings>) => {
    const merged = { ...settings, ...updates }
    setSettings(merged)
    try {
      await fetch('/api/messages-v2/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
    } catch {
      setSettings(settings) // revert
    }
  }, [settings])

  // ─── On Mount ───

  useEffect(() => {
    fetchSettings()
    fetchReps()
  }, [fetchSettings, fetchReps])

  useEffect(() => {
    fetchConversations()
  }, [tab, filterPills, sort]) // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => {
      fetchConversations()
    }, 300)
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Conversation Click ───

  const handleSelectConversation = useCallback((leadId: string) => {
    setSelectedLeadId(leadId)
    fetchThread(leadId)
  }, [fetchThread])

  // Auto-scroll thread to bottom
  useEffect(() => {
    if (activeThread.length > 0) {
      threadEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [activeThread])

  // ─── SSE Handlers ───

  useEffect(() => {
    const unsubs: (() => void)[] = []

    unsubs.push(on('NEW_MESSAGE', (data: any) => {
      // Refresh conversation list
      fetchConversations()
      // If this message is for the selected thread, add it
      if (data.leadId === selectedLeadId) {
        fetchThread(data.leadId)
      }
    }))

    unsubs.push(on('LEAD_UPDATE', (data: any) => {
      // Refresh conversations to update badges
      fetchConversations()
      if (data.leadId === selectedLeadId) {
        fetchThread(data.leadId)
      }
    }))

    unsubs.push(on('PREVIEW_CLICK', (data: any) => {
      if (data.leadId === selectedLeadId) {
        setActivePreviewEngagement(prev => ({
          ...prev,
          ctaClicks: prev.ctaClicks + 1,
        }))
      }
    }))

    unsubs.push(on('HOT_LEAD', () => {
      // Show a simple notification — could be enhanced with a toast library
      fetchConversations()
    }))

    return () => unsubs.forEach(u => u())
  }, [on, selectedLeadId, fetchConversations, fetchThread])

  // ─── Send Message ───

  const handleSend = async () => {
    if (!composeText.trim() || !selectedLeadId) return
    setSending(true)
    try {
      const res = await fetch('/api/messages-v2/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: selectedLeadId, body: composeText, channel: composeChannel }),
      })
      if (res.ok) {
        setComposeText('')
        fetchThread(selectedLeadId)
        fetchConversations()
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to send')
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setSending(false)
    }
  }

  // ─── Actions ───

  const performAction = async (action: string, payload: Record<string, unknown> = {}) => {
    if (!selectedLeadId) return
    try {
      const res = await fetch(`/api/messages-v2/conversations/${selectedLeadId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      })
      if (res.ok) {
        fetchThread(selectedLeadId)
        fetchConversations()
      } else {
        const err = await res.json()
        alert(err.error || 'Action failed')
      }
    } catch (error) {
      console.error('Action failed:', error)
    }
  }

  // Toggle filter pill
  const toggleFilter = (filter: string) => {
    setFilterPills(prev =>
      prev.includes(filter)
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    )
  }

  // Infinite scroll
  const handleConversationScroll = () => {
    const el = conversationListRef.current
    if (!el || loadingMore || !hasMore) return
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
      fetchConversations(true)
    }
  }

  // ─── Render ───

  return (
    <div
      className="h-[calc(100vh-64px)] overflow-hidden"
      style={{
        display: 'grid',
        gridTemplateColumns: sidebarOpen ? '280px 1fr 260px' : '280px 1fr',
      }}
    >
      {/* ════════════════════════════════════════════
          LEFT PANEL — Conversation List
          ════════════════════════════════════════════ */}
      <div className="flex flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 overflow-hidden">
        {/* Tab Bar */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setTab('pre_client')}
            className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${
              tab === 'pre_client'
                ? 'text-teal-600 dark:text-teal-400 border-b-2 border-teal-600 dark:border-teal-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Pre-Client
            <span className="ml-1 text-xs bg-gray-100 dark:bg-gray-800 rounded-full px-1.5 py-0.5">
              {conversationCounts.preClient}
            </span>
          </button>
          <button
            onClick={() => setTab('post_client')}
            className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${
              tab === 'post_client'
                ? 'text-teal-600 dark:text-teal-400 border-b-2 border-teal-600 dark:border-teal-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Post-Client
            <span className="ml-1 text-xs bg-gray-100 dark:bg-gray-800 rounded-full px-1.5 py-0.5">
              {conversationCounts.postClient}
            </span>
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-1.5 px-3 py-2 flex-wrap">
          <button
            onClick={() => toggleFilter('needs_reply')}
            className={`text-xs px-2 py-1 rounded-full border transition-colors ${
              filterPills.includes('needs_reply')
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700'
                : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-slate-700'
            }`}
          >
            Needs reply
          </button>
          <button
            onClick={() => toggleFilter('hot')}
            className={`text-xs px-2 py-1 rounded-full border transition-colors ${
              filterPills.includes('hot')
                ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-700'
                : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-slate-700'
            }`}
          >
            Hot leads
          </button>
          <button
            onClick={() => toggleFilter('drip_active')}
            className={`text-xs px-2 py-1 rounded-full border transition-colors ${
              filterPills.includes('drip_active')
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700'
                : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-slate-700'
            }`}
          >
            Drip active
          </button>
        </div>

        {/* Search */}
        <div className="px-3 pb-2">
          <Input
            placeholder="Search leads..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-8 text-sm"
          />
        </div>

        {/* Conversation Cards */}
        <div
          ref={conversationListRef}
          className="flex-1 overflow-y-auto"
          onScroll={handleConversationScroll}
        >
          {loadingConversations ? (
            <div className="space-y-2 p-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 dark:bg-slate-800 rounded animate-pulse" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
              No conversations found
            </div>
          ) : (
            conversations.map(conv => (
              <button
                key={conv.leadId}
                onClick={() => handleSelectConversation(conv.leadId)}
                className={`w-full text-left px-3 py-2.5 border-l-4 border-b border-gray-100 dark:border-gray-800 transition-colors ${getBorderColor(conv)} ${
                  selectedLeadId === conv.leadId
                    ? 'bg-teal-50 dark:bg-teal-900/20'
                    : 'hover:bg-gray-50 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {conv.hasUnreadInbound && (
                        <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />
                      )}
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {conv.companyName || `${conv.firstName || ''} ${conv.lastName || ''}`.trim() || 'Unknown'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {conv.firstName} {conv.lastName}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                    {conv.lastMessage ? timeAgo(conv.lastMessage.createdAt) : ''}
                  </span>
                </div>

                {/* Badge row */}
                <div className="flex gap-1 mt-1 flex-wrap">
                  {conv.smsFunnelStage && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                      {conv.smsFunnelStage}
                    </span>
                  )}
                  {conv.closeEngine?.autonomyLevel && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
                      {conv.closeEngine.autonomyLevel}
                    </span>
                  )}
                  {conv.dncAt && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded">
                      DNC
                    </span>
                  )}
                </div>

                {/* Message preview */}
                {conv.lastMessage && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                    {conv.lastMessage.direction === 'OUTBOUND' ? 'You: ' : ''}
                    {conv.lastMessage.content || '(no content)'}
                  </p>
                )}
              </button>
            ))
          )}
          {loadingMore && (
            <div className="p-3 text-center text-xs text-gray-400">Loading more...</div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════
          CENTER PANEL — Message Thread
          ════════════════════════════════════════════ */}
      <div className="flex flex-col bg-gray-50 dark:bg-slate-950 overflow-hidden">
        {!selectedLeadId ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500">
            <div className="text-center">
              <div className="text-4xl mb-3">&#128172;</div>
              <div className="text-lg font-medium">Select a conversation</div>
              <div className="text-sm mt-1">Choose a lead from the left panel to view their messages</div>
              {connected && (
                <div className="text-xs mt-3 text-green-500">Live updates active</div>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center text-teal-700 dark:text-teal-300 text-sm font-medium flex-shrink-0">
                  {getInitials(activeLead?.firstName || null, activeLead?.lastName || null, activeLead?.companyName || null)}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {activeLead?.companyName || `${activeLead?.firstName || ''} ${activeLead?.lastName || ''}`.trim() || 'Loading...'}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    {activeLead?.phone && <span>{activeLead.phone}</span>}
                    {activeLead?.email && <span>{activeLead.email}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {activeCloseEngine && (
                  <select
                    value={activeCloseEngine.autonomyLevel || 'FULL_AUTO'}
                    onChange={e => performAction('update_autonomy', { autonomyLevel: e.target.value })}
                    className="text-xs border border-gray-200 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="FULL_AUTO">Full Auto</option>
                    <option value="SEMI_AUTO">Semi Auto</option>
                    <option value="MANUAL">Manual</option>
                  </select>
                )}
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                  title="Toggle sidebar"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Thread */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {loadingThread ? (
                <div className="space-y-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                      <div className="h-12 w-48 bg-gray-200 dark:bg-slate-800 rounded-lg animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : activeThread.length === 0 ? (
                <div className="text-center text-sm text-gray-400 dark:text-gray-500 py-8">
                  No messages yet
                </div>
              ) : (
                activeThread.map((item, idx) => {
                  if (item.type === 'event') {
                    // Event marker — centered
                    return (
                      <div key={`evt-${idx}`} className="flex justify-center py-1">
                        <div className={`text-[11px] px-3 py-1 rounded-full bg-gray-100 dark:bg-slate-800 ${getEventColor(item.data.eventType)}`}>
                          {getEventDescription(item.data.eventType)}
                          <span className="ml-2 text-gray-400 dark:text-gray-500">
                            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    )
                  }

                  // Message bubble
                  const msg = item.data
                  const isOutbound = msg.direction === 'OUTBOUND'

                  return (
                    <div key={`msg-${idx}`} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] ${isOutbound ? 'order-last' : ''}`}>
                        <div
                          className={`px-3 py-2 rounded-2xl text-sm ${
                            isOutbound
                              ? 'bg-teal-500 dark:bg-teal-600 text-white rounded-br-md'
                              : 'bg-gray-200 dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-bl-md'
                          }`}
                        >
                          {msg.content || '(no content)'}
                        </div>
                        <div className={`flex items-center gap-1.5 mt-0.5 text-[10px] text-gray-400 dark:text-gray-500 ${isOutbound ? 'justify-end' : ''}`}>
                          {!isOutbound && msg.senderName && (
                            <span>{msg.senderName}</span>
                          )}
                          <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {isOutbound && msg.twilioStatus && (
                            <span className="capitalize">{msg.twilioStatus.toLowerCase()}</span>
                          )}
                          {isOutbound && msg.senderType && (
                            <span className="px-1 py-0.5 bg-gray-100 dark:bg-slate-800 rounded text-[9px]">
                              {msg.senderType === 'AI' ? 'AI' : msg.senderType === 'ADMIN' ? 'Admin' : msg.senderType}
                            </span>
                          )}
                          {msg.trigger && (
                            <span className="px-1 py-0.5 bg-gray-100 dark:bg-slate-800 rounded text-[9px]">{msg.trigger}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={threadEndRef} />
            </div>

            {/* Compose Bar */}
            <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 p-3">
              {/* Channel toggle */}
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => setComposeChannel('SMS')}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    composeChannel === 'SMS'
                      ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border-teal-300 dark:border-teal-700'
                      : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600'
                  }`}
                >
                  SMS
                </button>
                <button
                  onClick={() => setComposeChannel('EMAIL')}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    composeChannel === 'EMAIL'
                      ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border-teal-300 dark:border-teal-700'
                      : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600'
                  }`}
                >
                  Email
                </button>
                {composeChannel === 'SMS' && (
                  <span className="text-[10px] text-gray-400 ml-auto">
                    {composeText.length}/160
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <textarea
                  value={composeText}
                  onChange={e => setComposeText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  placeholder={`Type ${composeChannel === 'SMS' ? 'SMS' : 'email'} message...`}
                  rows={1}
                  className="flex-1 resize-none border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400"
                  style={{ minHeight: '38px', maxHeight: '120px' }}
                  onInput={e => {
                    const target = e.target as HTMLTextAreaElement
                    target.style.height = 'auto'
                    target.style.height = `${Math.min(target.scrollHeight, 120)}px`
                  }}
                />
                <Button
                  onClick={handleSend}
                  disabled={sending || !composeText.trim()}
                  className="bg-teal-600 hover:bg-teal-700 text-white px-4 self-end"
                >
                  {sending ? '...' : 'Send'}
                </Button>
              </div>
              {activeLead?.previewUrl && (
                <button
                  onClick={() => {
                    setComposeText(prev => prev + (prev ? ' ' : '') + activeLead.previewUrl)
                  }}
                  className="text-xs text-teal-600 dark:text-teal-400 hover:underline mt-1.5"
                >
                  + Send preview link
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* ════════════════════════════════════════════
          RIGHT PANEL — Lead Sidebar (collapsible)
          ════════════════════════════════════════════ */}
      {sidebarOpen && selectedLeadId && (
        <div className="flex flex-col border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 overflow-y-auto">
          {activeLead ? (
            <div className="p-4 space-y-5">
              {/* Contact Info */}
              <div className="text-center">
                <div className="w-14 h-14 mx-auto rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center text-teal-700 dark:text-teal-300 text-xl font-semibold">
                  {getInitials(activeLead.firstName, activeLead.lastName, activeLead.companyName)}
                </div>
                <div className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {activeLead.firstName} {activeLead.lastName}
                </div>
                {activeLead.companyName && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">{activeLead.companyName}</div>
                )}
                {activeLead.phone && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{activeLead.phone}</div>
                )}
                {activeLead.email && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{activeLead.email}</div>
                )}
                {(activeLead.city || activeLead.state) && (
                  <div className="text-xs text-gray-400 dark:text-gray-500">
                    {[activeLead.city, activeLead.state].filter(Boolean).join(', ')}
                  </div>
                )}
                {activeLead.industry && (
                  <div className="text-xs text-gray-400 dark:text-gray-500">{activeLead.industry}</div>
                )}
              </div>

              {/* Funnel Status */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Funnel Status</h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Lead Status</span>
                    <span className="text-gray-900 dark:text-gray-100">{activeLead.client ? 'Client' : 'Pre-Client'}</span>
                  </div>
                  {activeLead.smsFunnelStage && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">SMS Funnel</span>
                      <Badge variant="outline" className="text-[10px]">{activeLead.smsFunnelStage}</Badge>
                    </div>
                  )}
                  {activeCloseEngine && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">CE Stage</span>
                        <span className="text-gray-900 dark:text-gray-100">{activeCloseEngine.stage || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Autonomy</span>
                        <Badge variant="outline" className="text-[10px]">{activeCloseEngine.autonomyLevel}</Badge>
                      </div>
                    </>
                  )}
                  {activeCampaignLeads.length > 0 && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Campaign</span>
                        <span className="text-gray-900 dark:text-gray-100">{activeCampaignLeads[0].funnelStage || '—'}</span>
                      </div>
                      {activeCampaignLeads[0].dripCurrentStep != null && (
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Drip Step</span>
                          <span className="text-gray-900 dark:text-gray-100">{activeCampaignLeads[0].dripCurrentStep}</span>
                        </div>
                      )}
                    </>
                  )}
                  {activeLead.dncAt && (
                    <Badge className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-[10px]">DNC</Badge>
                  )}
                  {activeLead.smsOptedOutAt && !activeLead.dncAt && (
                    <Badge className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-[10px]">Opted Out</Badge>
                  )}
                </div>
              </div>

              {/* Preview Engagement */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Preview Engagement</h4>
                {activeLead.previewUrl && (
                  <a
                    href={activeLead.previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-teal-600 dark:text-teal-400 hover:underline block mb-2 truncate"
                  >
                    {activeLead.previewUrl}
                  </a>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-center p-2 bg-gray-50 dark:bg-slate-800 rounded">
                    <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{activePreviewEngagement.ctaClicks}</div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">CTA Clicks</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 dark:bg-slate-800 rounded">
                    <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{activePreviewEngagement.pageViews}</div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">Page Views</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 dark:bg-slate-800 rounded">
                    <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{activePreviewEngagement.callClicks}</div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">Call Clicks</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 dark:bg-slate-800 rounded">
                    <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{activePreviewEngagement.returnVisits}</div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">Return Visits</div>
                  </div>
                </div>
              </div>

              {/* Activity Timeline */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Recent Activity</h4>
                <div className="space-y-2">
                  {activeEvents.slice(-10).reverse().map((evt: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${getEventColor(evt.eventType).replace('text-', 'bg-')}`} />
                      <div className="min-w-0">
                        <div className={`text-[11px] ${getEventColor(evt.eventType)}`}>
                          {getEventDescription(evt.eventType)}
                        </div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500">
                          {new Date(evt.createdAt).toLocaleDateString()} {new Date(evt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}
                  {activeEvents.length === 0 && (
                    <div className="text-xs text-gray-400 dark:text-gray-500">No recent activity</div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Quick Actions</h4>
                <div className="space-y-2">
                  {/* Mark DNC */}
                  {!activeLead.dncAt && (
                    <button
                      onClick={() => {
                        if (window.confirm('Mark this lead as DNC? This will archive all campaign leads and prevent future messages.')) {
                          performAction('mark_dnc')
                        }
                      }}
                      className="w-full text-left text-xs px-3 py-2 rounded border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      Mark DNC
                    </button>
                  )}

                  {/* Mark Opted In (conditional) */}
                  {(activeLead.smsOptedOutAt || activeCampaignLeads.length > 0) && !activeLead.dncAt && (
                    <button
                      onClick={() => performAction('mark_opted_in')}
                      className="w-full text-left text-xs px-3 py-2 rounded border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                    >
                      Mark Opted In
                    </button>
                  )}

                  {/* Assign Rep */}
                  <div>
                    <label className="text-[10px] text-gray-500 dark:text-gray-400">Assign Rep</label>
                    <select
                      value={activeLead.assignedToId || ''}
                      onChange={e => {
                        if (e.target.value) performAction('assign_rep', { repId: e.target.value })
                      }}
                      className="w-full mt-0.5 text-xs border border-gray-200 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300"
                    >
                      <option value="">Unassigned</option>
                      {reps.map(rep => (
                        <option key={rep.id} value={rep.id}>
                          {rep.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Send Preview Link */}
                  {activeLead.previewUrl && (
                    <button
                      onClick={() => {
                        setComposeText(activeLead.previewUrl || '')
                        setComposeChannel('SMS')
                      }}
                      className="w-full text-left text-xs px-3 py-2 rounded border border-teal-200 dark:border-teal-800 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"
                    >
                      Send Preview Link
                    </button>
                  )}

                  {/* View Lead Detail */}
                  <a
                    href={`/admin/leads/${selectedLeadId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-left text-xs px-3 py-2 rounded border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    View Lead Detail
                  </a>
                </div>
              </div>

              {/* Settings Gear */}
              <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => setSettingsOpen(!settingsOpen)}
                  className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Settings
                </button>

                {/* Settings Slide-over */}
                {settingsOpen && (
                  <div className="mt-3 space-y-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                    <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300">Preferences</h4>
                    {([
                      { key: 'autoPushBuilds', label: 'Auto-push builds' },
                      { key: 'showAiConversations', label: 'Show AI conversations' },
                      { key: 'showArchivedLeads', label: 'Show archived leads' },
                      { key: 'showDncLeads', label: 'Show DNC leads' },
                      { key: 'compactMode', label: 'Compact mode' },
                      { key: 'sidebarDefaultOpen', label: 'Sidebar default open' },
                      { key: 'soundNotifications', label: 'Sound notifications' },
                    ] as { key: keyof Settings; label: string }[]).map(({ key, label }) => (
                      <label key={key} className="flex items-center justify-between cursor-pointer">
                        <span className="text-[11px] text-gray-600 dark:text-gray-400">{label}</span>
                        <input
                          type="checkbox"
                          checked={!!settings[key]}
                          onChange={() => updateSettings({ [key]: !settings[key] })}
                          className="h-3.5 w-3.5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                        />
                      </label>
                    ))}
                    <div>
                      <label className="text-[11px] text-gray-600 dark:text-gray-400">Sort by</label>
                      <select
                        value={settings.sortBy}
                        onChange={e => {
                          updateSettings({ sortBy: e.target.value })
                          setSort(e.target.value)
                        }}
                        className="w-full mt-0.5 text-xs border border-gray-200 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300"
                      >
                        <option value="newest">Newest</option>
                        <option value="oldest_unread">Oldest Unread</option>
                        <option value="hottest">Hottest</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-600 dark:text-gray-400">Default AI mode</label>
                      <select
                        value={settings.defaultAiMode}
                        onChange={e => updateSettings({ defaultAiMode: e.target.value })}
                        className="w-full mt-0.5 text-xs border border-gray-200 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300"
                      >
                        <option value="FULL_AUTO">Full Auto</option>
                        <option value="SEMI_AUTO">Semi Auto</option>
                        <option value="MANUAL">Manual</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="h-8 w-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
