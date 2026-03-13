'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import React from 'react'
import {
  CheckCircle, Send, ArrowLeft,
  AlertTriangle, Mail, Phone, Hammer
} from 'lucide-react'
import { EntryPointBadge, StageBadge, linkifyText } from '../_lib/constants'

interface ConversationViewProps {
  // Close engine conversation props
  selectedCloseConv: any | null
  conversationDetail: any | null
  pendingActions: any[]
  approvingAction: string | null
  buildStatus: any | null
  globalAutoPush: boolean
  pushingBuild: boolean
  // Legacy conversation props
  selectedConversation: any | null
  convMessages: any[]
  // Shared
  messageInput: string
  setMessageInput: (input: string) => void
  sending: boolean
  sendChannel: 'SMS' | 'EMAIL'
  setSendChannel: (channel: 'SMS' | 'EMAIL') => void
  expandedDecisionLog: string | null
  setExpandedDecisionLog: (id: string | null) => void
  messagesEndRef: React.RefObject<HTMLDivElement>
  // Callbacks
  onBack: () => void
  onSendMessage: () => void
  onAutonomyChange: (convId: string, level: string) => void
  onPendingAction: (actionId: string, action: 'approve' | 'reject') => void
  onManualPush: () => void
  onLegacyAutonomyChange: (conv: any, newLevel: string) => void
}

export default function ConversationView(props: ConversationViewProps) {
  const {
    selectedCloseConv, conversationDetail, pendingActions, approvingAction,
    buildStatus, globalAutoPush, pushingBuild,
    selectedConversation, convMessages,
    messageInput, setMessageInput, sending, sendChannel, setSendChannel,
    expandedDecisionLog, setExpandedDecisionLog, messagesEndRef,
    onBack, onSendMessage, onAutonomyChange, onPendingAction, onManualPush,
    onLegacyAutonomyChange,
  } = props

  // ─── Close Engine Conversation View ───
  if (selectedCloseConv) {
    const detail = conversationDetail
    const detailMessages = detail?.messages || []

    return (
      <div className="p-8 space-y-6">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
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
                onChange={(e) => onAutonomyChange(selectedCloseConv.id, e.target.value)}
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
                  onClick={() => onPendingAction(action.id, 'approve')}
                  disabled={approvingAction === action.id}
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  {approvingAction === action.id ? 'Sending...' : 'Approve & Send'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPendingAction(action.id, 'reject')}
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
                const isAi = msg.aiGenerated || msg.senderType === 'AI' || msg.senderType === 'AI'
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
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSendMessage() } }}
              />
              <Button onClick={onSendMessage} disabled={sending || !messageInput.trim()}>
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
                    onClick={onManualPush}
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
  if (selectedConversation) {
    return (
      <div className="p-8 space-y-6">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
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
              onChange={(e) => onLegacyAutonomyChange(selectedConversation, e.target.value)}
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
                const isAi = msg.aiGenerated || msg.senderType === 'AI' || msg.senderType === 'AI'
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
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSendMessage() } }}
              />
              <Button onClick={onSendMessage} disabled={sending || !messageInput.trim()}>
                <Send size={16} className="mr-1" />
                {sending ? 'Sending...' : `Send ${sendChannel === 'EMAIL' ? 'Email' : 'SMS'}`}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return null
}
