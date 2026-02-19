'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  MessageSquare, AlertCircle, CheckCircle, Send, ArrowLeft,
  Settings, AlertTriangle, RefreshCw, Search, Mail, Phone
} from 'lucide-react'

type ViewMode = 'inbox' | 'conversation' | 'settings'
type InboxTab = 'pre_client' | 'post_client' | 'all'

// ─── Badge helpers ───

const ENTRY_POINT_BADGES: Record<string, { label: string; color: string }> = {
  INSTANTLY_REPLY: { label: 'Email', color: 'bg-blue-100 text-blue-700' },
  SMS_REPLY: { label: 'SMS', color: 'bg-green-100 text-green-700' },
  REP_CLOSE: { label: 'Rep', color: 'bg-purple-100 text-purple-700' },
  PREVIEW_CTA: { label: 'CTA', color: 'bg-orange-100 text-orange-700' },
}

const STAGE_BADGES: Record<string, { label: string; color: string; pulse?: boolean }> = {
  INITIATED: { label: 'Initiated', color: 'bg-gray-100 text-gray-700' },
  QUALIFYING: { label: 'Qualifying', color: 'bg-teal-100 text-teal-700' },
  COLLECTING_INFO: { label: 'Collecting Info', color: 'bg-teal-100 text-teal-700' },
  BUILDING: { label: 'Building', color: 'bg-blue-100 text-blue-700' },
  PREVIEW_SENT: { label: 'Preview Sent', color: 'bg-amber-100 text-amber-700' },
  EDIT_LOOP: { label: 'Edit Loop', color: 'bg-amber-100 text-amber-700' },
  PAYMENT_SENT: { label: 'Payment Sent', color: 'bg-green-100 text-green-700' },
  STALLED: { label: 'Stalled', color: 'bg-red-100 text-red-700' },
  PENDING_APPROVAL: { label: 'Needs Approval', color: 'bg-orange-100 text-orange-700', pulse: true },
  COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-700' },
  CLOSED_LOST: { label: 'Closed', color: 'bg-gray-100 text-gray-500' },
}

function EntryPointBadge({ entryPoint }: { entryPoint: string }) {
  const badge = ENTRY_POINT_BADGES[entryPoint]
  if (!badge) return null
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>{badge.label}</span>
}

function StageBadge({ stage }: { stage: string }) {
  const badge = STAGE_BADGES[stage] || { label: stage, color: 'bg-gray-100 text-gray-700' }
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

export default function MessagesPage() {
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

  // AI Settings
  const [aiSettings, setAiSettings] = useState<any>(null)
  const [aiSettingsLoading, setAiSettingsLoading] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)

  // Search
  const [searchTerm, setSearchTerm] = useState('')

  // Auto-refresh
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    checkTwilioStatus()
    loadMessages()
    loadCloseConversations()

    // Auto-refresh every 10 seconds
    refreshRef.current = setInterval(() => {
      loadMessages()
      loadCloseConversations()
    }, 10000)

    return () => {
      if (refreshRef.current) clearInterval(refreshRef.current)
    }
  }, [])

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
      const res = await fetch('/api/messages?limit=200')
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
      }
    } catch (error) {
      console.error('Failed to load messages:', error)
    } finally {
      setLoading(false)
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

  const loadAiSettings = useCallback(async () => {
    setAiSettingsLoading(true)
    try {
      const res = await fetch('/api/ai-settings')
      if (res.ok) {
        const data = await res.json()
        setAiSettings(data.settings)
      }
    } catch (error) {
      console.error('Failed to load AI settings:', error)
    } finally {
      setAiSettingsLoading(false)
    }
  }, [])

  const saveAiSettings = async () => {
    setSavingSettings(true)
    try {
      await fetch('/api/ai-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiSettings),
      })
    } catch (error) {
      console.error('Failed to save AI settings:', error)
    } finally {
      setSavingSettings(false)
    }
  }

  useEffect(() => {
    if (viewMode === 'settings') loadAiSettings()
  }, [viewMode, loadAiSettings])

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
  const groupedConversations = (() => {
    const convMap = new Map<string, any>()

    messages.forEach(msg => {
      const key = msg.clientId || msg.leadId || msg.recipient || msg.id
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

  // Check for NEW CLIENT badge (paid within 24 hours)
  const isNewClient = (conv: any) => {
    const lastMsg = conv.lastMessage
    if (!lastMsg) return false
    const hoursSince = (Date.now() - new Date(lastMsg.createdAt).getTime()) / (1000 * 60 * 60)
    return conv.isClient && hoursSince < 24
  }

  // Filtered conversations
  const getFilteredConvs = () => {
    if (inboxTab === 'pre_client') {
      return closeConversations.filter(c =>
        !searchTerm ||
        c.lead?.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.lead?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.lead?.phone?.includes(searchTerm)
      )
    }
    if (inboxTab === 'post_client') {
      return postClientConvs.filter(c =>
        !searchTerm || c.name.toLowerCase().includes(searchTerm.toLowerCase()) || (c.phone && c.phone.includes(searchTerm))
      )
    }
    // All tab
    return groupedConversations.filter(c =>
      !searchTerm || c.name.toLowerCase().includes(searchTerm.toLowerCase()) || (c.phone && c.phone.includes(searchTerm))
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
        <button onClick={() => { setViewMode('inbox'); setSelectedCloseConv(null); setConversationDetail(null); setPendingActions([]) }} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800">
          <ArrowLeft size={16} /> Back to Messages
        </button>

        {/* Conversation Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{selectedCloseConv.lead?.companyName || 'Unknown'}</h2>
            <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
              <span>{selectedCloseConv.lead?.firstName} {selectedCloseConv.lead?.lastName || ''}</span>
              {selectedCloseConv.lead?.phone && <span className="flex items-center gap-1"><Phone size={12} /> {selectedCloseConv.lead.phone}</span>}
              {selectedCloseConv.lead?.email && <span className="flex items-center gap-1"><Mail size={12} /> {selectedCloseConv.lead.email}</span>}
              <EntryPointBadge entryPoint={selectedCloseConv.entryPoint} />
              <StageBadge stage={detail?.stage || selectedCloseConv.stage} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Autonomy:</span>
              <select
                className="px-2 py-1 border rounded text-sm"
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
          <Card key={action.id} className="p-4 border-amber-300 bg-amber-50">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-amber-800">
                  Draft {action.type === 'SEND_PAYMENT_LINK' ? 'payment link' : 'message'} ready
                </div>
                <div className="text-sm text-amber-700 mt-1 truncate">{action.draftMessage}</div>
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

        {/* Messages */}
        <Card className="p-6">
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {detailMessages.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No messages in this conversation yet.</div>
            ) : (
              detailMessages.map((msg: any) => {
                const isOutbound = msg.direction === 'OUTBOUND'
                const isAi = msg.aiGenerated || msg.senderType === 'AI' || msg.senderType === 'CLAWDBOT'
                const isSystem = msg.senderType === 'SYSTEM'

                if (isSystem) {
                  return (
                    <div key={msg.id} className="text-center">
                      <span className="inline-block px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-xs">
                        {msg.content}
                      </span>
                    </div>
                  )
                }

                return (
                  <div key={msg.id} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] ${isOutbound ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'} border rounded-lg p-3`}>
                      <div className="flex items-center gap-2 mb-1">
                        {/* Channel badge */}
                        {msg.channel === 'EMAIL' ? (
                          <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">📧</span>
                        ) : (
                          <span className="text-[10px] font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded">💬</span>
                        )}
                        <span className="text-xs font-medium text-gray-700">
                          {isOutbound ? (isAi ? '🤖 AI' : 'You') : selectedCloseConv.lead?.firstName || 'Lead'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isAi && msg.aiDelaySeconds && (
                          <span className="text-xs text-blue-500">[auto — {msg.aiDelaySeconds}s delay]</span>
                        )}
                      </div>
                      {/* Email subject */}
                      {msg.channel === 'EMAIL' && msg.emailSubject && (
                        <div className="text-xs font-semibold text-gray-500 mb-1">Re: {msg.emailSubject}</div>
                      )}
                      {/* Message body — strip HTML for emails */}
                      <div className="text-sm text-gray-800 whitespace-pre-wrap">
                        {msg.channel === 'EMAIL' ? msg.content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ') : msg.content}
                      </div>
                      {/* Delivery status */}
                      {isOutbound && (
                        <div className={`text-[10px] mt-1 ${
                          (msg.twilioStatus === 'delivered' || msg.resendStatus === 'delivered') ? 'text-green-500' :
                          (msg.twilioStatus === 'sent' || msg.resendStatus === 'sent') ? 'text-blue-400' :
                          (msg.twilioStatus === 'failed' || msg.resendStatus === 'failed' || msg.twilioStatus === 'undelivered') ? 'text-red-500' :
                          (msg.resendStatus === 'bounced') ? 'text-red-500' :
                          'text-gray-400'
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
                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs font-mono text-gray-600 whitespace-pre-wrap max-h-48 overflow-y-auto">
                          {JSON.stringify(msg.aiDecisionLog, null, 2)}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Message Input with Channel Selector */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => setSendChannel('SMS')}
                className={`px-3 py-1 rounded text-xs font-medium ${sendChannel === 'SMS' ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-gray-50 text-gray-500 border border-gray-200'}`}
              >
                💬 SMS
              </button>
              <button
                onClick={() => setSendChannel('EMAIL')}
                className={`px-3 py-1 rounded text-xs font-medium ${sendChannel === 'EMAIL' ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-gray-50 text-gray-500 border border-gray-200'}`}
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
        <button onClick={() => { setViewMode('inbox'); setSelectedConversation(null) }} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800">
          <ArrowLeft size={16} /> Back to Messages
        </button>

        {/* Conversation Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{selectedConversation.name}</h2>
            <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
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
            <span className="text-gray-500">AI:</span>
            <select className="px-2 py-1 border rounded text-sm" defaultValue="on">
              <option value="on">ON</option>
              <option value="off">OFF</option>
            </select>
          </div>
        </div>

        {/* Messages */}
        <Card className="p-6">
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {convMessages.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No messages in this conversation yet.</div>
            ) : (
              convMessages.map((msg) => {
                const isOutbound = msg.direction === 'OUTBOUND'
                const isAi = msg.aiGenerated || msg.senderType === 'AI' || msg.senderType === 'CLAWDBOT'
                const isSystem = msg.senderType === 'SYSTEM'

                if (isSystem) {
                  return (
                    <div key={msg.id} className="text-center">
                      <span className="inline-block px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-xs">
                        {msg.content}
                      </span>
                    </div>
                  )
                }

                return (
                  <div key={msg.id} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] ${isOutbound ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'} border rounded-lg p-3`}>
                      <div className="flex items-center gap-2 mb-1">
                        {/* Channel badge */}
                        {msg.channel === 'EMAIL' ? (
                          <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">📧</span>
                        ) : (
                          <span className="text-[10px] font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded">💬</span>
                        )}
                        <span className="text-xs font-medium text-gray-700">
                          {isOutbound ? (isAi ? '🤖 AI' : 'You') : selectedConversation.name.split(' ')[0]}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isAi && msg.aiDelaySeconds && (
                          <span className="text-xs text-blue-500">[auto — {msg.aiDelaySeconds}s delay]</span>
                        )}
                      </div>
                      {/* Email subject */}
                      {msg.channel === 'EMAIL' && msg.emailSubject && (
                        <div className="text-xs font-semibold text-gray-500 mb-1">Re: {msg.emailSubject}</div>
                      )}
                      {/* Message body — strip HTML for emails */}
                      <div className="text-sm text-gray-800 whitespace-pre-wrap">
                        {msg.channel === 'EMAIL' ? msg.content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ') : msg.content}
                      </div>
                      {/* Delivery status */}
                      {isOutbound && (
                        <div className={`text-[10px] mt-1 ${
                          (msg.twilioStatus === 'delivered' || msg.resendStatus === 'delivered') ? 'text-green-500' :
                          (msg.twilioStatus === 'sent' || msg.resendStatus === 'sent') ? 'text-blue-400' :
                          (msg.twilioStatus === 'failed' || msg.resendStatus === 'failed' || msg.twilioStatus === 'undelivered') ? 'text-red-500' :
                          (msg.resendStatus === 'bounced') ? 'text-red-500' :
                          'text-gray-400'
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
                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs font-mono text-gray-600 whitespace-pre-wrap max-h-48 overflow-y-auto">
                          {JSON.stringify(msg.aiDecisionLog, null, 2)}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Message Input with Channel Selector */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => setSendChannel('SMS')}
                className={`px-3 py-1 rounded text-xs font-medium ${sendChannel === 'SMS' ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-gray-50 text-gray-500 border border-gray-200'}`}
              >
                💬 SMS
              </button>
              <button
                onClick={() => setSendChannel('EMAIL')}
                className={`px-3 py-1 rounded text-xs font-medium ${sendChannel === 'EMAIL' ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-gray-50 text-gray-500 border border-gray-200'}`}
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

  // ─── Settings View ───
  if (viewMode === 'settings') {
    return (
      <div className="p-8 space-y-6">
        <button onClick={() => setViewMode('inbox')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800">
          <ArrowLeft size={16} /> Back to Messages
        </button>

        <h1 className="text-3xl font-bold text-gray-900">AI Handler Settings</h1>

        {aiSettingsLoading ? (
          <Card className="p-12 text-center text-gray-500">Loading AI settings...</Card>
        ) : aiSettings ? (
          <div className="space-y-6">
            {/* Toggles */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Toggles</h3>
              <div className="space-y-4">
                {[
                  { key: 'globalAiAutoRespond', label: 'Global AI auto-respond' },
                  { key: 'preClientAi', label: 'Pre-client AI (Sales)' },
                  { key: 'postClientAi', label: 'Post-client AI (Support)' },
                ].map(toggle => (
                  <div key={toggle.key} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{toggle.label}</span>
                    <select
                      value={aiSettings[toggle.key] ? 'on' : 'off'}
                      onChange={(e) => setAiSettings({ ...aiSettings, [toggle.key]: e.target.value === 'on' })}
                      className="px-3 py-1.5 border rounded text-sm"
                    >
                      <option value="on">ON</option>
                      <option value="off">OFF</option>
                    </select>
                  </div>
                ))}
              </div>
            </Card>

            {/* Humanizing */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Humanizing</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Response delay</div>
                    <div className="text-xs text-gray-500">Random delay before AI responds</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={aiSettings.responseDelay?.min || 30}
                      onChange={(e) => setAiSettings({ ...aiSettings, responseDelay: { ...aiSettings.responseDelay, min: parseInt(e.target.value) || 30 } })}
                      className="w-16 text-sm"
                    />
                    <span className="text-sm text-gray-500">to</span>
                    <Input
                      type="number"
                      value={aiSettings.responseDelay?.max || 90}
                      onChange={(e) => setAiSettings({ ...aiSettings, responseDelay: { ...aiSettings.responseDelay, max: parseInt(e.target.value) || 90 } })}
                      className="w-16 text-sm"
                    />
                    <span className="text-sm text-gray-500">sec</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Tone</span>
                  <select value={aiSettings.tone || 'casual'} onChange={(e) => setAiSettings({ ...aiSettings, tone: e.target.value })} className="px-3 py-1.5 border rounded text-sm">
                    <option value="casual">Casual, friendly, short sentences</option>
                    <option value="professional">Professional but warm</option>
                    <option value="formal">Formal</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Max response length</span>
                  <select value={aiSettings.maxResponseLength || 2} onChange={(e) => setAiSettings({ ...aiSettings, maxResponseLength: parseInt(e.target.value) })} className="px-3 py-1.5 border rounded text-sm">
                    <option value={1}>1 sentence</option>
                    <option value={2}>2 sentences (unless detail needed)</option>
                    <option value={3}>3 sentences</option>
                    <option value={5}>5 sentences max</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Use emojis</span>
                  <select value={aiSettings.useEmojis || 'sparingly'} onChange={(e) => setAiSettings({ ...aiSettings, useEmojis: e.target.value })} className="px-3 py-1.5 border rounded text-sm">
                    <option value="never">Never</option>
                    <option value="sparingly">Sparingly (thumbs up, check only)</option>
                    <option value="moderate">Moderate</option>
                  </select>
                </div>
              </div>
            </Card>

            {/* System Prompt */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Humanizing File (System Prompt)</h3>
              <textarea
                value={aiSettings.humanizingPrompt || ''}
                onChange={(e) => setAiSettings({ ...aiSettings, humanizingPrompt: e.target.value })}
                className="w-full px-3 py-2 border rounded-md text-sm min-h-[120px] font-mono"
                placeholder="You are a team member at Bright Automations..."
              />
            </Card>

            {/* Escalation Triggers */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Escalation Triggers</h3>
              <div className="space-y-3">
                {(aiSettings.escalationTriggers || []).map((trigger: any, i: number) => (
                  <div key={trigger.id || i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={trigger.enabled}
                        onChange={(e) => {
                          const updated = [...aiSettings.escalationTriggers]
                          updated[i] = { ...updated[i], enabled: e.target.checked }
                          setAiSettings({ ...aiSettings, escalationTriggers: updated })
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{trigger.label}</span>
                    </div>
                    {trigger.threshold !== undefined && (
                      <Input
                        type="number"
                        value={trigger.threshold}
                        onChange={(e) => {
                          const updated = [...aiSettings.escalationTriggers]
                          updated[i] = { ...updated[i], threshold: parseInt(e.target.value) || 0 }
                          setAiSettings({ ...aiSettings, escalationTriggers: updated })
                        }}
                        className="w-16 text-sm"
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">On escalation, AI sends:</h4>
                <Input
                  value={aiSettings.escalationMessage || ''}
                  onChange={(e) => setAiSettings({ ...aiSettings, escalationMessage: e.target.value })}
                  className="text-sm"
                />
              </div>
            </Card>

            {/* Save */}
            <div className="flex gap-3">
              <Button onClick={saveAiSettings} disabled={savingSettings}>
                {savingSettings ? 'Saving...' : 'Save All Settings'}
              </Button>
              <Button variant="outline" onClick={loadAiSettings}>Reset</Button>
            </div>
          </div>
        ) : (
          <Card className="p-6 text-center text-gray-500">Failed to load AI settings.</Card>
        )}
      </div>
    )
  }

  // ─── Inbox View ───
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
          <p className="text-gray-500 mt-1">Unified inbox — AI handler + manual override</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" disabled={refreshing} onClick={async () => { setRefreshing(true); await Promise.all([loadMessages(), loadCloseConversations()]); setRefreshing(false) }}>
            <RefreshCw size={14} className={`mr-1 ${refreshing ? 'animate-spin' : ''}`} /> {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setViewMode('settings')}>
            <Settings size={14} className="mr-1" /> AI Settings
          </Button>
        </div>
      </div>

      {/* Inbox Tabs — Teal active indicator */}
      <div className="flex border-b border-gray-200">
        {[
          { key: 'pre_client' as const, label: 'Pre-Client', count: closeConversations.length },
          { key: 'post_client' as const, label: 'Post-Client', count: postClientConvs.length },
          { key: 'all' as const, label: 'All', count: groupedConversations.length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setInboxTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              inboxTab === tab.key
                ? 'border-teal-500 text-teal-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            <span className={`ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs ${
              inboxTab === tab.key ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-600'
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <Input className="pl-10" placeholder="Search conversations..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      {/* ─── PRE-CLIENT TAB ─── */}
      {inboxTab === 'pre_client' && (
        <>
          {loading ? (
            <Card className="p-12 text-center text-gray-500">Loading conversations...</Card>
          ) : filteredConvs.length === 0 ? (
            <Card className="p-12 text-center">
              <MessageSquare size={48} className="text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No active conversations</h3>
              <p className="text-gray-600 text-sm">Close Engine conversations will appear when leads engage.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {(filteredConvs as any[]).map((conv: any) => (
                <Card
                  key={conv.id}
                  className={`p-4 cursor-pointer hover:shadow-md transition-all ${
                    conv.pendingActionCount > 0 ? 'border-orange-200 bg-orange-50/50' :
                    conv.stage === 'STALLED' ? 'border-red-200 bg-red-50/30' :
                    'border-gray-200'
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
                        <span className="font-medium text-gray-900 truncate">{conv.lead?.companyName || 'Unknown'}</span>
                        <EntryPointBadge entryPoint={conv.entryPoint} />
                        <StageBadge stage={conv.stage} />
                        {conv.pendingActionCount > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-500 text-white animate-pulse">
                            Action needed
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 mt-0.5">
                        {conv.lead?.firstName} {conv.lead?.lastName || ''}
                        {conv.lead?.phone && <span className="ml-2">{conv.lead.phone}</span>}
                      </div>
                      {conv.lastMessage && (
                        <div className="text-sm text-gray-600 mt-1 truncate">
                          {conv.lastMessage.direction === 'OUTBOUND' && (
                            <span className="text-gray-400">
                              {(conv.lastMessage.aiGenerated || conv.lastMessage.senderType === 'AI') ? '🤖 ' : 'You: '}
                            </span>
                          )}
                          {conv.lastMessage.content?.substring(0, 100)}{(conv.lastMessage.content?.length || 0) > 100 && '...'}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 ml-3">
                      {conv.lastMessage?.createdAt && (
                        <span className="text-xs text-gray-400">{timeSince(conv.lastMessage.createdAt)}</span>
                      )}
                      <span className="text-xs text-gray-400">{conv.autonomyLevel.replace('_', ' ')}</span>
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
            <Card className="p-12 text-center text-gray-500">Loading messages...</Card>
          ) : filteredConvs.length === 0 ? (
            <Card className="p-12 text-center">
              <MessageSquare size={48} className="text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No client conversations</h3>
              <p className="text-gray-600 text-sm">Support conversations will appear when clients text or email.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {(filteredConvs as any[]).map((conv: any) => (
                <Card
                  key={conv.key}
                  className={`p-4 cursor-pointer hover:shadow-md transition-all ${
                    conv.escalated ? 'border-orange-200 bg-orange-50/50' :
                    conv.aiHandling ? 'border-blue-200 bg-blue-50/30' :
                    'border-gray-200'
                  }`}
                  onClick={() => { setSelectedConversation(conv); setViewMode('conversation') }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 truncate">{conv.name}</span>
                        <Badge variant="default" className="text-xs">Client</Badge>
                        {isNewClient(conv) && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-500 text-white">
                            NEW CLIENT
                          </span>
                        )}
                        {conv.escalated && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                            Escalated
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        {conv.channels?.has('SMS') && <span className="text-[10px]">💬</span>}
                        {conv.channels?.has('EMAIL') && <span className="text-[10px]">📧</span>}
                        <span className="text-sm text-gray-600 truncate">
                          {conv.lastMessage?.direction === 'OUTBOUND' && (
                            <span className="text-gray-400">{(conv.lastMessage.aiGenerated || conv.lastMessage.senderType === 'AI') ? '🤖 ' : 'You: '}</span>
                          )}
                          {conv.lastMessage?.content?.replace(/<[^>]*>/g, '').substring(0, 80)}{(conv.lastMessage?.content?.length || 0) > 80 && '...'}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 ml-3">
                      {conv.lastMessage?.createdAt && (
                        <span className="text-xs text-gray-400">{timeSince(conv.lastMessage.createdAt)}</span>
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
            <Card className="p-12 text-center text-gray-500">Loading messages...</Card>
          ) : filteredConvs.length === 0 ? (
            <Card className="p-12 text-center">
              <MessageSquare size={48} className="text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No conversations</h3>
              <p className="text-gray-600 text-sm">Messages will appear here as they come in.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {/* Escalated */}
              {(filteredConvs as any[]).filter((c: any) => c.escalated).length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-orange-700 flex items-center gap-2">ESCALATED</h3>
                  {(filteredConvs as any[]).filter((c: any) => c.escalated).map((conv: any) => (
                    <ConversationCard key={conv.key} conversation={conv} onClick={() => { setSelectedConversation(conv); setViewMode('conversation') }} variant="escalated" />
                  ))}
                </div>
              )}

              {/* AI Handling */}
              {(filteredConvs as any[]).filter((c: any) => c.aiHandling && !c.escalated).length > 0 && (
                <div className="space-y-2 mt-4">
                  <h3 className="text-sm font-semibold text-blue-700 flex items-center gap-2">🤖 AI HANDLING</h3>
                  {(filteredConvs as any[]).filter((c: any) => c.aiHandling && !c.escalated).map((conv: any) => (
                    <ConversationCard key={conv.key} conversation={conv} onClick={() => { setSelectedConversation(conv); setViewMode('conversation') }} variant="ai" />
                  ))}
                </div>
              )}

              {/* Other */}
              {(filteredConvs as any[]).filter((c: any) => !c.aiHandling && !c.escalated).length > 0 && (
                <div className="space-y-2 mt-4">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">CONVERSATIONS</h3>
                  {(filteredConvs as any[]).filter((c: any) => !c.aiHandling && !c.escalated).map((conv: any) => (
                    <ConversationCard key={conv.key} conversation={conv} onClick={() => { setSelectedConversation(conv); setViewMode('conversation') }} variant="default" />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ConversationCard({ conversation, onClick, variant }: { conversation: any; onClick: () => void; variant: 'escalated' | 'ai' | 'default' }) {
  const borderColor = variant === 'escalated' ? 'border-orange-200 bg-orange-50/50' : variant === 'ai' ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200'
  const lastMsg = conversation.lastMessage
  const ts = lastMsg?.createdAt ? timeSince(lastMsg.createdAt) : ''

  return (
    <Card className={`p-4 cursor-pointer hover:shadow-md transition-all ${borderColor}`} onClick={onClick}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 truncate">{conversation.name}</span>
            {conversation.isClient ? <Badge variant="default" className="text-xs">Client</Badge> : <Badge variant="secondary" className="text-xs">Lead</Badge>}
            {conversation.channels?.has('SMS') && <span className="text-[10px]">💬</span>}
            {conversation.channels?.has('EMAIL') && <span className="text-[10px]">📧</span>}
          </div>
          <div className="text-sm text-gray-600 mt-1 truncate">
            {lastMsg?.direction === 'OUTBOUND' && (
              <span className="text-gray-400">{(lastMsg.aiGenerated || lastMsg.senderType === 'AI') ? '🤖 ' : 'You: '}</span>
            )}
            {lastMsg?.content?.replace(/<[^>]*>/g, '').substring(0, 100)}{(lastMsg?.content?.length || 0) > 100 && '...'}
          </div>
          {conversation.escalated && lastMsg?.escalationReason && (
            <div className="text-xs text-orange-600 mt-1">AI paused — {lastMsg.escalationReason}</div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 ml-3">
          <span className="text-xs text-gray-400">{ts}</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="text-xs h-7 px-2">OPEN</Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
