'use client'

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import InboxView from './_components/InboxView'
import ConversationView from './_components/ConversationView'
import MessageSettings from './_components/MessageSettings'
import type { ViewMode, InboxTab } from './_lib/constants'

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
  const latestMessageRef = useRef<string | null>(null)

  // Auto-scroll refs
  const messagesEndRef = useRef<HTMLDivElement>(null!)
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

  const loadGlobalAutoPush = async () => {
    try {
      const res = await fetch('/api/settings?key=globalAutoPush')
      if (res.ok) {
        const data = await res.json()
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
      setGlobalAutoPush(!newValue)
    }
  }

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
      pollNewMessages()
      loadCloseConversations()
      if (conversationDetail) loadConversationDetail(conversationDetail.id)
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

  const loadMessages = async () => {
    try {
      const res = await fetch('/api/messages?limit=50')
      if (res.ok) {
        const data = await res.json()
        const msgs = data.messages || []
        setMessages(msgs)
        setHasMore(msgs.length >= 50)
        if (msgs.length > 0) {
          latestMessageRef.current = msgs[0].createdAt
        }
      }
    } catch (error) {
      console.error('Failed to load messages:', error)
    } finally {
      setLoading(false)
    }
  }

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

  // ─── Group messages into conversations ───
  const groupedConversations = (() => {
    const convMap = new Map<string, any>()

    messages.forEach(msg => {
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
      if (msg.aiGenerated || msg.senderType === 'AI' || msg.senderType === 'AI') conv.aiHandling = true
      if (new Date(msg.createdAt) > new Date(conv.lastMessage.createdAt)) {
        conv.lastMessage = msg
      }
    })

    return Array.from(convMap.values()).sort(
      (a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime()
    )
  })()

  const postClientConvs = groupedConversations.filter(c => c.conversationType === 'post_client')

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
        router.replace('/admin/messages', { scroll: false })
      } else {
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

  const isNewClient = (conv: any) => {
    const lastMsg = conv.lastMessage
    if (!lastMsg) return false
    const hoursSince = (Date.now() - new Date(lastMsg.createdAt).getTime()) / (1000 * 60 * 60)
    return conv.isClient && hoursSince < 24
  }

  const matchesSource = (conv: any): boolean => {
    if (sourceFilter === 'all') return true
    const msgs = conv.messages || conv.recentMessages || []
    if (sourceFilter === 'rep') return msgs.some((m: any) => m.senderType === 'REP')
    if (sourceFilter === 'ai') return msgs.some((m: any) => m.aiGenerated || m.senderType === 'AI' || m.senderType === 'AI')
    if (sourceFilter === 'admin') return msgs.some((m: any) => m.senderType === 'ADMIN')
    return true
  }

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
    return groupedConversations.filter(c =>
      (!searchTerm || c.name.toLowerCase().includes(searchTerm.toLowerCase()) || (c.phone && c.phone.includes(searchTerm))) &&
      matchesSource(c)
    )
  }

  const filteredConvs = getFilteredConvs()
  const pendingApprovalCount = closeConversations.filter(c => c.pendingActionCount > 0).length

  // Compute convMessages for legacy conversation view
  const convMessages = selectedConversation ? messages
    .filter(m => {
      if (selectedConversation.clientId) return m.clientId === selectedConversation.clientId
      if (selectedConversation.leadId) return m.leadId === selectedConversation.leadId
      return m.recipient === selectedConversation.phone || m.id === selectedConversation.key
    })
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) : []

  const handleLegacyAutonomyChange = async (conv: any, newLevel: string) => {
    const id = conv.clientId || conv.leadId
    const endpoint = conv.clientId ? `/api/clients/${id}` : `/api/leads/${id}`
    try {
      await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autonomyLevel: newLevel }),
      })
      setSelectedConversation((prev: any) => ({ ...prev, autonomyLevel: newLevel }))
    } catch (err) { console.error('Failed to update AI setting:', err) }
  }

  const handleStartNewChat = (r: any) => {
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
  }

  // ─── Render based on view mode ───

  if (viewMode === 'conversation' && (selectedCloseConv || selectedConversation)) {
    return (
      <ConversationView
        selectedCloseConv={selectedCloseConv}
        conversationDetail={conversationDetail}
        pendingActions={pendingActions}
        approvingAction={approvingAction}
        buildStatus={buildStatus}
        globalAutoPush={globalAutoPush}
        pushingBuild={pushingBuild}
        selectedConversation={selectedConversation}
        convMessages={convMessages}
        messageInput={messageInput}
        setMessageInput={setMessageInput}
        sending={sending}
        sendChannel={sendChannel}
        setSendChannel={setSendChannel}
        expandedDecisionLog={expandedDecisionLog}
        setExpandedDecisionLog={setExpandedDecisionLog}
        messagesEndRef={messagesEndRef}
        onBack={() => { setViewMode('inbox'); setSelectedCloseConv(null); setSelectedConversation(null); setConversationDetail(null); setPendingActions([]) }}
        onSendMessage={handleSendMessage}
        onAutonomyChange={handleAutonomyChange}
        onPendingAction={handlePendingAction}
        onManualPush={handleManualPush}
        onLegacyAutonomyChange={handleLegacyAutonomyChange}
      />
    )
  }

  if (viewMode === 'settings') {
    return <MessageSettings onBack={() => setViewMode('inbox')} />
  }

  return (
    <InboxView
      inboxTab={inboxTab}
      setInboxTab={setInboxTab}
      loading={loading}
      refreshing={refreshing}
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      sourceFilter={sourceFilter}
      setSourceFilter={setSourceFilter}
      globalAutoPush={globalAutoPush}
      globalAutoPushLoaded={globalAutoPushLoaded}
      handleToggleGlobalAutoPush={handleToggleGlobalAutoPush}
      closeConversations={closeConversations}
      postClientConvs={postClientConvs}
      allConversationCount={allConversationCount}
      pendingApprovalCount={pendingApprovalCount}
      filteredConvs={filteredConvs}
      groupedConversations={groupedConversations}
      hasMore={hasMore}
      loadingMore={loadingMore}
      loadMoreMessages={loadMoreMessages}
      isNewClient={isNewClient}
      onRefresh={async () => { setRefreshing(true); await Promise.all([loadMessages(), loadCloseConversations()]); setRefreshing(false) }}
      onNewChat={() => setNewChatOpen(true)}
      onSelectCloseConv={(conv) => { setSelectedCloseConv(conv); setViewMode('conversation'); loadConversationDetail(conv.id) }}
      onSelectConversation={(conv) => { setSelectedConversation(conv); setViewMode('conversation') }}
      newChatOpen={newChatOpen}
      setNewChatOpen={setNewChatOpen}
      chatSearch={chatSearch}
      setChatSearch={setChatSearch}
      chatSearchResults={chatSearchResults}
      setChatSearchResults={setChatSearchResults}
      onStartNewChat={handleStartNewChat}
    />
  )
}
