'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState, useEffect, useCallback } from 'react'
import {
  MessageSquare, AlertCircle, CheckCircle, Send, ArrowLeft,
  Settings, AlertTriangle, RefreshCw, Search
} from 'lucide-react'

type ViewMode = 'inbox' | 'conversation' | 'settings'
type InboxTab = 'pre_client' | 'post_client'

export default function MessagesPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('inbox')
  const [inboxTab, setInboxTab] = useState<InboxTab>('post_client')
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [twilioStatus, setTwilioStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking')

  // Conversation view state
  const [selectedConversation, setSelectedConversation] = useState<any>(null)
  const [messageInput, setMessageInput] = useState('')
  const [sending, setSending] = useState(false)

  // AI Settings
  const [aiSettings, setAiSettings] = useState<any>(null)
  const [aiSettingsLoading, setAiSettingsLoading] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)

  // Search
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    checkTwilioStatus()
    loadMessages()
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
    if (!messageInput.trim() || !selectedConversation) return
    setSending(true)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedConversation.clientId || undefined,
          leadId: selectedConversation.leadId || undefined,
          to: selectedConversation.phone,
          content: messageInput,
          channel: 'SMS',
          senderType: 'ADMIN',
          senderName: 'admin',
        }),
      })
      if (res.ok) {
        setMessageInput('')
        loadMessages()
      }
    } catch (e) { console.error('Failed to send:', e) }
    finally { setSending(false) }
  }

  // ─── Group messages into conversations ───
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
          isClient,
          conversationType: isClient ? 'post_client' : 'pre_client',
          messages: [],
          lastMessage: msg,
          escalated: false,
          aiHandling: false,
        })
      }
      const conv = convMap.get(key)!
      conv.messages.push(msg)
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

  const preClientConvs = groupedConversations.filter(c => c.conversationType === 'pre_client')
  const postClientConvs = groupedConversations.filter(c => c.conversationType === 'post_client')
  const activeConvs = inboxTab === 'pre_client' ? preClientConvs : postClientConvs

  const filteredConvs = activeConvs.filter(c =>
    !searchTerm || c.name.toLowerCase().includes(searchTerm.toLowerCase()) || (c.phone && c.phone.includes(searchTerm))
  )

  const escalatedCount = activeConvs.filter(c => c.escalated).length
  const aiHandlingCount = activeConvs.filter(c => c.aiHandling && !c.escalated).length

  // ─── Conversation View ───
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
              <span>Channel: SMS</span>
              {selectedConversation.phone && <span>{selectedConversation.phone}</span>}
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
                      <div className="text-sm text-gray-800">{msg.content}</div>
                      {msg.escalated && (
                        <div className="mt-2 text-xs text-orange-600 flex items-center gap-1">
                          <AlertTriangle size={10} /> Escalated: {msg.escalationReason || 'Manual review needed'}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Message Input */}
          <div className="mt-4 pt-4 border-t flex gap-3">
            <Input
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Type message..."
              className="flex-1"
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage() } }}
            />
            <Button onClick={handleSendMessage} disabled={sending || !messageInput.trim()}>
              <Send size={16} className="mr-1" />
              {sending ? 'Sending...' : 'Send'}
            </Button>
          </div>

          {/* Quick Actions */}
          <div className="mt-3 flex gap-4 text-xs">
            <button className="text-blue-600 hover:underline">Toggle AI OFF for this conversation</button>
            {selectedConversation.clientId && (
              <button className="text-blue-600 hover:underline">View client profile</button>
            )}
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
          <Button variant="outline" size="sm" onClick={loadMessages}>
            <RefreshCw size={14} className="mr-1" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => setViewMode('settings')}>
            <Settings size={14} className="mr-1" /> AI Settings
          </Button>
        </div>
      </div>

      {/* Twilio Status */}
      <Card className={`p-4 ${twilioStatus === 'connected' ? 'border-green-300 bg-green-50' : twilioStatus === 'disconnected' ? 'border-amber-300 bg-amber-50' : 'border-gray-300'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {twilioStatus === 'connected' ? <CheckCircle size={20} className="text-green-600" /> : <AlertCircle size={20} className="text-amber-600" />}
            <div>
              <span className="font-semibold text-sm text-gray-900">
                Twilio SMS {twilioStatus === 'connected' ? 'Connected' : 'Not Connected'}
              </span>
              {twilioStatus !== 'connected' && (
                <p className="text-xs text-gray-500">Add Twilio credentials to Railway to enable SMS</p>
              )}
            </div>
          </div>
          {twilioStatus === 'connected' && <Badge variant="default">Active</Badge>}
        </div>
      </Card>

      {/* Global AI Controls */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">AI Auto-respond:</span>
            <select className="px-3 py-1.5 border rounded text-sm">
              <option value="all">ON for all</option>
              <option value="pre">Pre-client only</option>
              <option value="post">Post-client only</option>
              <option value="off">OFF for all</option>
            </select>
          </div>
          <Button variant="outline" size="sm" onClick={() => setViewMode('settings')}>
            <Settings size={14} className="mr-1" /> Configure AI
          </Button>
        </div>
      </Card>

      {/* Inbox Tabs */}
      <div className="flex gap-2">
        <Button variant={inboxTab === 'pre_client' ? 'default' : 'outline'} onClick={() => setInboxTab('pre_client')}>
          Pre-Client (Sales)
          <Badge variant="secondary" className="ml-2">{preClientConvs.length}</Badge>
        </Button>
        <Button variant={inboxTab === 'post_client' ? 'default' : 'outline'} onClick={() => setInboxTab('post_client')}>
          Post-Client (Support)
          <Badge variant="secondary" className="ml-2">{postClientConvs.length}</Badge>
        </Button>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-6 text-sm text-gray-600">
        <span>Conversations: <strong>{activeConvs.length}</strong></span>
        <span>AI handling: <strong>{aiHandlingCount}</strong></span>
        <span className={escalatedCount > 0 ? 'text-orange-600 font-medium' : ''}>
          Escalated: <strong>{escalatedCount}</strong>
        </span>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <Input className="pl-10" placeholder="Search conversations..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      {/* Conversation List */}
      {loading ? (
        <Card className="p-12 text-center text-gray-500">Loading messages...</Card>
      ) : filteredConvs.length === 0 ? (
        <Card className="p-12 text-center">
          <MessageSquare size={48} className="text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No conversations</h3>
          <p className="text-gray-600 text-sm">
            {inboxTab === 'pre_client' ? 'Sales conversations will appear when leads reply to outreach.' : 'Support conversations will appear when clients text or email.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {/* Escalated */}
          {filteredConvs.filter(c => c.escalated).length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-orange-700 flex items-center gap-2">🟠 ESCALATED</h3>
              {filteredConvs.filter(c => c.escalated).map(conv => (
                <ConversationCard key={conv.key} conversation={conv} onClick={() => { setSelectedConversation(conv); setViewMode('conversation') }} variant="escalated" />
              ))}
            </div>
          )}

          {/* AI Handling */}
          {filteredConvs.filter(c => c.aiHandling && !c.escalated).length > 0 && (
            <div className="space-y-2 mt-4">
              <h3 className="text-sm font-semibold text-blue-700 flex items-center gap-2">🤖 AI HANDLING</h3>
              {filteredConvs.filter(c => c.aiHandling && !c.escalated).map(conv => (
                <ConversationCard key={conv.key} conversation={conv} onClick={() => { setSelectedConversation(conv); setViewMode('conversation') }} variant="ai" />
              ))}
            </div>
          )}

          {/* Other */}
          {filteredConvs.filter(c => !c.aiHandling && !c.escalated).length > 0 && (
            <div className="space-y-2 mt-4">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">CONVERSATIONS</h3>
              {filteredConvs.filter(c => !c.aiHandling && !c.escalated).map(conv => (
                <ConversationCard key={conv.key} conversation={conv} onClick={() => { setSelectedConversation(conv); setViewMode('conversation') }} variant="default" />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ConversationCard({ conversation, onClick, variant }: { conversation: any; onClick: () => void; variant: 'escalated' | 'ai' | 'default' }) {
  const borderColor = variant === 'escalated' ? 'border-orange-200 bg-orange-50/50' : variant === 'ai' ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200'
  const lastMsg = conversation.lastMessage
  const timeSince = lastMsg?.createdAt
    ? (() => {
        const mins = Math.floor((Date.now() - new Date(lastMsg.createdAt).getTime()) / (1000 * 60))
        if (mins < 60) return `${mins}m ago`
        const hrs = Math.floor(mins / 60)
        if (hrs < 24) return `${hrs}h ago`
        return `${Math.floor(hrs / 24)}d ago`
      })()
    : ''

  return (
    <Card className={`p-4 cursor-pointer hover:shadow-md transition-all ${borderColor}`} onClick={onClick}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 truncate">{conversation.name}</span>
            {conversation.isClient ? <Badge variant="default" className="text-xs">Client</Badge> : <Badge variant="secondary" className="text-xs">Lead</Badge>}
          </div>
          <div className="text-sm text-gray-600 mt-1 truncate">
            {lastMsg?.direction === 'OUTBOUND' && (
              <span className="text-gray-400">{(lastMsg.aiGenerated || lastMsg.senderType === 'AI') ? '🤖 ' : 'You: '}</span>
            )}
            {lastMsg?.content?.substring(0, 100)}{(lastMsg?.content?.length || 0) > 100 && '...'}
          </div>
          {conversation.escalated && lastMsg?.escalationReason && (
            <div className="text-xs text-orange-600 mt-1">AI paused — {lastMsg.escalationReason}</div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 ml-3">
          <span className="text-xs text-gray-400">{timeSince}</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="text-xs h-7 px-2">OPEN</Button>
            <Button variant="outline" size="sm" className="text-xs h-7 px-2">TAKE OVER</Button>
          </div>
        </div>
      </div>
    </Card>
  )
}